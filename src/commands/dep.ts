import chalk from "chalk";
import { Command } from "commander";

import { checkOpendataLoaderStatus } from "../extractor/markdown.js";
import { log } from "../logger.js";

const KNOWN_DEPS = new Set(["opendataloader"]);

export function createDepCommand(): Command {
  const dep = new Command("dep").description("Manage external dependencies");

  dep
    .command("check [dep]")
    .description("Check if an external dependency is available")
    .action(async (depName?: string) => {
      if (depName != null) {
        if (!KNOWN_DEPS.has(depName)) {
          log.error(`Unknown dependency: ${depName}`);
          log.step(`Available: ${[...KNOWN_DEPS].join(", ")}`);
          process.exit(1);
        }
        if (depName === "opendataloader") {
          await checkOpendataLoader();
        }
      } else {
        // Check all known dependencies
        await checkOpendataLoader();
      }
    });

  return dep;
}

async function checkOpendataLoader(): Promise<void> {
  log.info("Checking opendataloader-pdf...");

  const status = await checkOpendataLoaderStatus();

  const pkgIcon = status.packageInstalled ? chalk.green("✔") : chalk.red("✖");
  const javaIcon = status.javaAvailable ? chalk.green("✔") : chalk.red("✖");
  const hybridIcon = status.hybridBackendAvailable ? chalk.green("✔") : chalk.dim("○");

  log.plain(`  ${pkgIcon} @opendataloader/pdf package`);

  if (status.javaAvailable) {
    log.plain(`  ${javaIcon} Java runtime (${status.javaVersion})`);
  } else {
    log.plain(`  ${javaIcon} Java runtime (not found)`);
  }

  if (status.hybridBackendAvailable) {
    log.plain(`  ${hybridIcon} Hybrid backend (localhost:5002)`);
  } else {
    log.plain(`  ${hybridIcon} Hybrid backend (not running, optional)`);
  }

  log.newline();

  if (status.packageInstalled && status.javaAvailable) {
    log.success("opendataloader-pdf is ready.");
    if (status.hybridBackendAvailable) {
      log.step("Hybrid mode enabled — using docling backend for improved extraction.");
    }
  } else {
    log.error("opendataloader-pdf is not available.");
    if (!status.packageInstalled) {
      log.step("Install: pnpm add @opendataloader/pdf");
    }
    if (!status.javaAvailable) {
      log.step("Install Java 11+: https://adoptium.net/");
    }
  }
}
