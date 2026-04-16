import { mkdtemp, readFile, rm } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { downloadPdf, lookupDoi, normalizeDoi, UnpaywallError } from "./index.js";

// ─── normalizeDoi ──────────────────────────────────────────

describe("normalizeDoi", () => {
  it("returns bare DOI unchanged", () => {
    expect(normalizeDoi("10.1038/nature12373")).toBe("10.1038/nature12373");
  });

  it("strips https://doi.org/ prefix", () => {
    expect(normalizeDoi("https://doi.org/10.1038/nature12373")).toBe("10.1038/nature12373");
  });

  it("strips http://doi.org/ prefix", () => {
    expect(normalizeDoi("http://doi.org/10.1038/nature12373")).toBe("10.1038/nature12373");
  });

  it("strips https://dx.doi.org/ prefix", () => {
    expect(normalizeDoi("https://dx.doi.org/10.1038/nature12373")).toBe("10.1038/nature12373");
  });

  it("strips doi: prefix (case-insensitive)", () => {
    expect(normalizeDoi("doi:10.1038/nature12373")).toBe("10.1038/nature12373");
    expect(normalizeDoi("DOI:10.1038/nature12373")).toBe("10.1038/nature12373");
  });
});

// ─── lookupDoi ─────────────────────────────────────────────

describe("lookupDoi", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns parsed response for a valid DOI", async () => {
    const mockResponse = {
      is_oa: true,
      oa_status: "gold",
      title: "Test Paper",
      z_authors: [{ raw_author_name: "Alice" }],
      published_date: "2024-01-01",
      journal_name: "Nature",
      year: 2024,
      publisher: "Springer Nature",
      best_oa_location: {
        url_for_pdf: "https://example.com/paper.pdf",
        url_for_landing_page: "https://example.com/paper",
        license: "cc-by",
        version: "publishedVersion",
        host_type: "publisher",
      },
      doi: "10.1038/test",
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await lookupDoi("10.1038/test", "test@example.com");

    expect(result.is_oa).toBe(true);
    expect(result.title).toBe("Test Paper");
    expect(result.best_oa_location?.url_for_pdf).toBe("https://example.com/paper.pdf");
    expect(result.z_authors).toHaveLength(1);
  });

  it("throws not_found for 404 response", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    });

    await expect(lookupDoi("10.9999/nonexistent", "test@example.com")).rejects.toThrow(
      UnpaywallError,
    );

    try {
      await lookupDoi("10.9999/nonexistent", "test@example.com");
    } catch (err) {
      expect(err).toBeInstanceOf(UnpaywallError);
      expect((err as UnpaywallError).code).toBe("not_found");
    }
  });

  it("throws api_error for non-OK non-404 response", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });

    try {
      await lookupDoi("10.1038/test", "test@example.com");
    } catch (err) {
      expect(err).toBeInstanceOf(UnpaywallError);
      expect((err as UnpaywallError).code).toBe("api_error");
    }
  });

  it("throws parse_error for invalid response shape", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ unexpected: "data" }),
    });

    try {
      await lookupDoi("10.1038/test", "test@example.com");
    } catch (err) {
      expect(err).toBeInstanceOf(UnpaywallError);
      expect((err as UnpaywallError).code).toBe("parse_error");
    }
  });

  it("encodes DOI and email in the request URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          is_oa: false,
          oa_status: "closed",
          best_oa_location: null,
          doi: "10.1000/special chars",
        }),
    });
    globalThis.fetch = fetchMock;

    await lookupDoi("10.1000/special chars", "user@example.com");

    const calledUrl = fetchMock.mock.calls[0]?.[0];
    expect(calledUrl).toContain("10.1000%2Fspecial%20chars");
    expect(calledUrl).toContain("user%40example.com");
  });
});

// ─── downloadPdf ───────────────────────────────────────────

describe("downloadPdf", () => {
  const originalFetch = globalThis.fetch;
  let tempDir: string;

  beforeAll(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "unpaywall-test-"));
  });

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("writes PDF content to destPath", async () => {
    const pdfContent = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // %PDF

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/pdf" }),
      arrayBuffer: () => Promise.resolve(pdfContent.buffer),
    });

    const dest = path.join(tempDir, "test.pdf");
    await downloadPdf("https://example.com/paper.pdf", dest);

    const written = await readFile(dest);
    expect(written[0]).toBe(0x25); // %
    expect(written[1]).toBe(0x50); // P
  });

  it("accepts application/octet-stream content type", async () => {
    const pdfContent = new Uint8Array([0x25, 0x50, 0x44, 0x46]);

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/octet-stream" }),
      arrayBuffer: () => Promise.resolve(pdfContent.buffer),
    });

    const dest = path.join(tempDir, "test2.pdf");
    await downloadPdf("https://example.com/paper.pdf", dest);

    const written = await readFile(dest);
    expect(written.length).toBe(4);
  });

  it("throws download_error for non-OK response", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      headers: new Headers(),
    });

    try {
      await downloadPdf("https://example.com/paper.pdf", path.join(tempDir, "fail.pdf"));
    } catch (err) {
      expect(err).toBeInstanceOf(UnpaywallError);
      expect((err as UnpaywallError).code).toBe("download_error");
      expect((err as UnpaywallError).message).toContain("403");
    }
  });

  it("throws download_error for non-PDF content type", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "text/html" }),
    });

    try {
      await downloadPdf("https://example.com/paper.pdf", path.join(tempDir, "fail2.pdf"));
    } catch (err) {
      expect(err).toBeInstanceOf(UnpaywallError);
      expect((err as UnpaywallError).code).toBe("download_error");
      expect((err as UnpaywallError).message).toContain("text/html");
    }
  });
});
