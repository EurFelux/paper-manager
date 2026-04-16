import { writeFile } from "node:fs/promises";

import * as z from "zod";

// ─── Unpaywall Response Schema ─────────────────────────────

const UnpaywallOaLocationSchema = z.object({
  url_for_pdf: z.string().nullable(),
  url_for_landing_page: z.string().nullable(),
  license: z.string().nullable(),
  version: z.string().nullable(),
  host_type: z.string().nullable(),
});

const UnpaywallAuthorSchema = z.object({
  raw_author_name: z.string(),
});

const UnpaywallResponseSchema = z.object({
  is_oa: z.boolean(),
  oa_status: z.string(),
  title: z.string().nullable().optional(),
  z_authors: z.array(UnpaywallAuthorSchema).nullable().optional(),
  published_date: z.string().nullable().optional(),
  journal_name: z.string().nullable().optional(),
  year: z.number().nullable().optional(),
  publisher: z.string().nullable().optional(),
  best_oa_location: UnpaywallOaLocationSchema.nullable(),
  doi: z.string(),
});

export type UnpaywallResponse = z.infer<typeof UnpaywallResponseSchema>;

// ─── Error Class ───────────────────────────────────────────

export type UnpaywallErrorCode = "not_found" | "api_error" | "parse_error" | "download_error";

export class UnpaywallError extends Error {
  readonly code: UnpaywallErrorCode;

  constructor(message: string, code: UnpaywallErrorCode) {
    super(message);
    this.name = "UnpaywallError";
    this.code = code;
  }
}

// ─── DOI Normalization ─────────────────────────────────────

export function normalizeDoi(input: string): string {
  return input.replace(/^https?:\/\/(dx\.)?doi\.org\//, "").replace(/^doi:/i, "");
}

// ─── API Client ────────────────────────────────────────────

export async function lookupDoi(doi: string, email: string): Promise<UnpaywallResponse> {
  const url = `https://api.unpaywall.org/v2/${encodeURIComponent(doi)}?email=${encodeURIComponent(email)}`;

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    redirect: "follow",
  });

  if (response.status === 404) {
    throw new UnpaywallError(`DOI not found in Unpaywall: ${doi}`, "not_found");
  }

  if (!response.ok) {
    throw new UnpaywallError(`Unpaywall API error: HTTP ${String(response.status)}`, "api_error");
  }

  const json: unknown = await response.json();
  const result = UnpaywallResponseSchema.safeParse(json);
  if (!result.success) {
    throw new UnpaywallError(
      `Invalid Unpaywall API response: ${result.error.message}`,
      "parse_error",
    );
  }

  return result.data;
}

// ─── PDF Download ──────────────────────────────────────────

export async function downloadPdf(url: string, destPath: string): Promise<void> {
  const response = await fetch(url, { redirect: "follow" });

  if (!response.ok) {
    throw new UnpaywallError(
      `Failed to download PDF: HTTP ${String(response.status)}`,
      "download_error",
    );
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (
    !contentType.includes("application/pdf") &&
    !contentType.includes("application/octet-stream")
  ) {
    throw new UnpaywallError(`Expected PDF but received: ${contentType}`, "download_error");
  }

  const buffer = new Uint8Array(await response.arrayBuffer());
  await writeFile(destPath, buffer);
}
