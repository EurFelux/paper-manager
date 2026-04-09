import { execFile } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs";
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

/**
 * Convert a PDF file to Markdown using opendataloader-pdf.
 * Returns the markdown content on success, or null on failure.
 */
export async function convertPdfToMarkdown(pdfPath: string): Promise<string | null> {
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

    return readFileSync(path.join(outDir, mdFile), "utf-8");
  } catch {
    return null;
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
}

// ─── Internal ────────────────────────────────────────────

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
