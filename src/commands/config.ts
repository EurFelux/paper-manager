import { Command } from "commander";

import { listConfig, loadMergedConfig, removeConfig, setConfig } from "../config/index.js";
import { initScope } from "../config/init.js";

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
        console.log(`Config "${key}" is not set.`);
      } else {
        console.log(JSON.stringify(value, null, 2));
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
      console.log(`Config "${key}" has been set.`);
    });

  config
    .command("remove <key>")
    .description("Remove a config key")
    .option("--user", "Remove from user config")
    .action((key: string, options: { user?: boolean }) => {
      removeConfig(key, { user: options.user });
      console.log(`Config "${key}" has been removed.`);
    });

  config
    .command("list")
    .description("List all config")
    .option("--user", "List user config only")
    .action((options: { user?: boolean }) => {
      const result = options.user ? listConfig({ user: true }) : loadMergedConfig();

      if (Object.keys(result).length === 0) {
        console.log("No config set.");
      } else {
        console.log(JSON.stringify(result, null, 2));
      }
    });

  config
    .command("init")
    .description("Initialize data directory for current scope")
    .option("--user", "Initialize user scope (~/.paper-manager)")
    .action((options: { user?: boolean }) => {
      const scopeLabel = options.user ? "user" : "project";
      const result = initScope({ user: options.user });
      console.log(`Initializing ${scopeLabel} scope: ${result.baseDir}\n`);
      for (const item of result.items) {
        const icon = item.status === "created" ? "+" : "=";
        console.log(`  [${icon}] ${item.name} (${item.status})`);
      }
      console.log(`\nDone.`);
    });

  return config;
}
