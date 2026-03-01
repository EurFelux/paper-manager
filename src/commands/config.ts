import chalk from "chalk";
import { Command } from "commander";

import { listConfig, loadMergedConfig, removeConfig, setConfig } from "../config/index.js";
import { initScope } from "../config/init.js";
import { log } from "../logger.js";

export function createConfigCommand(): Command {
  const config = new Command("config").description("Manage configuration");

  config
    .command("get <key>")
    .description("Get a config value")
    .option("--user", "Read from user config")
    .action((key: string, options: { user?: boolean }) => {
      const source = options.user ? listConfig({ user: true }) : loadMergedConfig();
      const value: unknown = source[key];
      if (value === undefined) {
        log.info(`Config "${key}" is not set.`);
      } else {
        log.plain(JSON.stringify(value, null, 2));
      }
    });

  config
    .command("set <key> <value>")
    .description("Set a config value")
    .option("--user", "Write to user config")
    .action((key: string, rawValue: string, options: { user?: boolean }) => {
      let value: unknown;
      try {
        value = JSON.parse(rawValue);
      } catch {
        value = rawValue;
      }
      setConfig(key, value, { user: options.user });
      log.success(`Config "${key}" has been set.`);
    });

  config
    .command("remove <key>")
    .description("Remove a config key")
    .option("--user", "Remove from user config")
    .action((key: string, options: { user?: boolean }) => {
      removeConfig(key, { user: options.user });
      log.success(`Config "${key}" has been removed.`);
    });

  config
    .command("list")
    .description("List all config")
    .option("--user", "List user config only")
    .action((options: { user?: boolean }) => {
      const result = options.user ? listConfig({ user: true }) : loadMergedConfig();

      if (Object.keys(result).length === 0) {
        log.info("No config set.");
      } else {
        log.plain(JSON.stringify(result, null, 2));
      }
    });

  config
    .command("init")
    .description("Initialize data directory for current scope")
    .option("--user", "Initialize user scope (~/.paper-manager)")
    .action((options: { user?: boolean }) => {
      const scopeLabel = options.user ? "user" : "project";
      const result = initScope({ user: options.user });
      log.info(`Initializing ${scopeLabel} scope: ${result.baseDir}`);
      log.newline();
      for (const item of result.items) {
        if (item.status === "created") {
          console.log(`  ${chalk.green("+")} ${item.name} ${chalk.dim("(created)")}`);
        } else {
          console.log(
            `  ${chalk.dim("=")} ${chalk.dim(item.name)} ${chalk.dim(`(${item.status})`)}`,
          );
        }
      }
      log.newline();
      log.success("Done.");
    });

  return config;
}
