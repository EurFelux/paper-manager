import * as fs from "node:fs";
import * as path from "node:path";

import { getFilesDir } from "./config/index.js";

/**
 * Migrate legacy pdfs/ directory to files/ for a given scope base directory.
 * No-op if the scope directory itself doesn't exist (not yet initialized).
 */
export function migratePdfsToFiles(baseDir: string): void {
  if (!fs.existsSync(baseDir)) return;

  const filesDir = getFilesDir(baseDir);
  const legacyPdfsDir = path.join(baseDir, "pdfs");
  const legacyExists = fs.existsSync(legacyPdfsDir);
  const filesExists = fs.existsSync(filesDir);

  if (legacyExists && !filesExists) {
    fs.renameSync(legacyPdfsDir, filesDir);
  } else if (legacyExists && filesExists) {
    for (const entry of fs.readdirSync(legacyPdfsDir, { withFileTypes: true })) {
      const dest = path.join(filesDir, entry.name);
      if (!fs.existsSync(dest)) {
        fs.renameSync(path.join(legacyPdfsDir, entry.name), dest);
      }
    }
    fs.rmSync(legacyPdfsDir, { recursive: true, force: true });
  }
}
