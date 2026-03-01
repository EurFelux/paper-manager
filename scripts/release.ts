import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function run(cmd: string): string {
  return execSync(cmd, { cwd: rootDir, stdio: "pipe", encoding: "utf-8" }).trim();
}

function exec(cmd: string): void {
  execSync(cmd, { cwd: rootDir, stdio: "inherit" });
}

// 1. Read version from package.json
const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, "package.json"), "utf-8")) as {
  version: string;
};
const version = pkg.version;
const tag = `v${version}`;

// 2. Ensure working tree is clean
const status = run("git status --porcelain");
if (status) {
  console.error("Working tree is not clean. Commit or stash changes first.");
  process.exit(1);
}

// 3. Ensure tag doesn't already exist
const existingTags = run("git tag --list").split("\n");
if (existingTags.includes(tag)) {
  console.error(`Tag ${tag} already exists.`);
  process.exit(1);
}

// 4. Quality checks
console.log("Running checks...");
exec("pnpm typecheck");
exec("pnpm lint");
exec("pnpm fmt:check");

// 5. Build & generate schema
console.log("Building...");
exec("pnpm build");
exec("pnpm generate:schema");

// 6. Git tag & push
console.log(`Tagging ${tag}...`);
exec(`git tag -a ${tag} -m "Release ${tag}"`);
exec(`git push origin main --tags`);

// 7. GitHub Release
console.log("Creating GitHub release...");
exec(`gh release create ${tag} --generate-notes`);

// 8. npm publish
console.log("Publishing to npm...");
exec("pnpm publish --no-git-checks --access public");

console.log(`\nReleased ${tag} successfully!`);
