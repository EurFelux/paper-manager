import chalk from "chalk";

/**
 * Semantic logger with colored output for CLI commands.
 *
 * Usage patterns:
 *   log.success("Knowledge base created: abc123")   → ✔ Knowledge base created: abc123  (green)
 *   log.error("KB not found: abc123")                → ✖ KB not found: abc123            (red)
 *   log.info("Extracting PDF content...")             → Extracting PDF content...         (cyan)
 *   log.step("Extracted 12 pages.")                   →   Extracted 12 pages.             (dim, indented)
 *   log.label("Title:", "My Paper")                   →   Title: My Paper                 (dim label, normal value)
 *   log.header("[project] abc123")                    → [project] abc123                  (bold)
 *   log.plain("raw text")                             → raw text                          (no color)
 */
export const log = {
  success(msg: string): void {
    console.log(chalk.green(`✔ ${msg}`));
  },

  error(msg: string): void {
    console.error(chalk.red(`✖ ${msg}`));
  },

  info(msg: string): void {
    console.log(chalk.cyan(msg));
  },

  step(msg: string): void {
    console.log(chalk.dim(`  ${msg}`));
  },

  label(label: string, value: string): void {
    console.log(`  ${chalk.dim(label)} ${value}`);
  },

  header(msg: string): void {
    console.log(chalk.bold(msg));
  },

  plain(msg: string): void {
    console.log(msg);
  },

  newline(): void {
    console.log();
  },
};
