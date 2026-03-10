import { getProjectDataDir, getUserDataDir } from "./config/index.js";
import { migratePdfsToFiles } from "./migrations.js";

export function startup(): void {
  migratePdfsToFiles(getUserDataDir());
  migratePdfsToFiles(getProjectDataDir());
}
