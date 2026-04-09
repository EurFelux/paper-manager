import { execFile } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";

/**
 * Check whether opendataloader-pdf is available (package installed + Java runtime).
 * Result is cached after the first call.
 */
export async function isOpendataLoaderAvailable(): Promise<boolean> {
  if (cachedAvailability !== undefined) return cachedAvailability;
  cachedAvailability = await detectAvailability();
  return cachedAvailability;
}

export interface ConvertResult {
  markdown: string;
  /** Image files extracted from the PDF (relative path → content). */
  images: Map<string, Buffer>;
}

/**
 * Convert a PDF file to Markdown using opendataloader-pdf.
 * Returns the markdown content and extracted images on success, or null on failure.
 */
export async function convertPdfToMarkdown(pdfPath: string): Promise<ConvertResult | null> {
  const outDir = path.join(tmpdir(), `odl-${Date.now()}`);
  mkdirSync(outDir, { recursive: true });

  try {
    const { convert } = await import("@opendataloader/pdf");
    await convert([pdfPath], {
      outputDir: outDir,
      format: "markdown",
      quiet: true,
    });

    const mdFile = readdirSync(outDir).find((f) => f.endsWith(".md"));
    if (!mdFile) return null;

    const markdown = readFileSync(path.join(outDir, mdFile), "utf-8");

    const imageExtensions = new Set([".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".bmp"]);
    const images = new Map<string, Buffer>();
    collectImages(outDir, outDir, imageExtensions, images);

    return { markdown, images };
  } catch {
    return null;
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
}

/**
 * Save a ConvertResult to disk: writes the markdown file and any extracted images.
 * Images are stored in `filesDir/<id>/` and image references in the markdown are
 * rewritten to use the `<id>/` prefix.
 */
export function saveConvertResult(filesDir: string, id: string, result: ConvertResult): void {
  let { markdown } = result;

  if (result.images.size > 0) {
    const imageSubDir = path.join(filesDir, id);
    mkdirSync(imageSubDir, { recursive: true });

    for (const [relPath, data] of result.images) {
      const basename = path.basename(relPath);
      writeFileSync(path.join(imageSubDir, basename), data);
      // Rewrite image/link references: ](old/path.png) → ](<id>/basename.png)
      markdown = markdown.replaceAll(`](${relPath})`, `](${id}/${basename})`);
    }
  }

  writeFileSync(path.join(filesDir, `${id}.md`), markdown, "utf-8");
}

/**
 * Remove the extracted images directory for a literature, if it exists.
 */
export function removeImageDir(filesDir: string, id: string): void {
  const imageDir = path.join(filesDir, id);
  if (existsSync(imageDir)) {
    rmSync(imageDir, { recursive: true, force: true });
  }
}

// ─── Internal ────────────────────────────────────────────

/** Recursively collect image files under `dir`, keyed by path relative to `root`. */
function collectImages(
  dir: string,
  root: string,
  extensions: Set<string>,
  out: Map<string, Buffer>,
): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectImages(full, root, extensions, out);
    } else if (extensions.has(path.extname(entry.name).toLowerCase())) {
      out.set(path.relative(root, full), readFileSync(full));
    }
  }
}

let cachedAvailability: boolean | undefined;

async function detectAvailability(): Promise<boolean> {
  const [hasPackage, hasJava] = await Promise.all([checkPackage(), checkJava()]);
  return hasPackage && hasJava;
}

async function checkPackage(): Promise<boolean> {
  try {
    await import("@opendataloader/pdf");
    return true;
  } catch {
    return false;
  }
}

// execFile is safe — arguments are passed as an array, no shell interpolation.
async function checkJava(): Promise<boolean> {
  return new Promise((resolve) => {
    execFile("java", ["-version"], (error) => {
      resolve(!error);
    });
  });
}

/**
 * Detailed availability check for the `dep check` command.
 */
export async function checkOpendataLoaderStatus(): Promise<{
  packageInstalled: boolean;
  javaAvailable: boolean;
  javaVersion: string | null;
}> {
  const [packageInstalled, javaResult] = await Promise.all([checkPackage(), getJavaVersion()]);
  return {
    packageInstalled,
    javaAvailable: javaResult !== null,
    javaVersion: javaResult,
  };
}

// execFile is safe — arguments are passed as an array, no shell interpolation.
function getJavaVersion(): Promise<string | null> {
  return new Promise((resolve) => {
    execFile("java", ["-version"], (error, _stdout, stderr) => {
      if (error) {
        resolve(null);
        return;
      }
      // Java prints version to stderr
      const match = /version\s+"([^"]+)"/.exec(stderr);
      resolve(match?.[1] ?? null);
    });
  });
}
