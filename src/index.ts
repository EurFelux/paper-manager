#!/usr/bin/env node

import { createRequire } from "node:module";

import { Command } from "commander";

import { createConfigCommand } from "./commands/config.js";
import { createKnowledgeBaseCommand } from "./commands/knowledge-base.js";
import { createLiteratureCommand } from "./commands/literature.js";
import { startup } from "./lifecycle.js";

const require = createRequire(import.meta.url);
const { version } = require("../package.json") as { version: string };

const program = new Command();

program.name("paper").description("A paper management CLI tool").version(version);

program.hook("preAction", () => {
  startup();
});

program.addCommand(createConfigCommand());
program.addCommand(createKnowledgeBaseCommand());
program.addCommand(createLiteratureCommand());

program.parse();
