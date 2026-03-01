#!/usr/bin/env node

import { Command } from "commander";

import { createConfigCommand } from "./commands/config.js";
import { createKnowledgeBaseCommand } from "./commands/knowledge-base.js";
import { createLiteratureCommand } from "./commands/literature.js";

const program = new Command();

program.name("paper").description("A paper management CLI tool").version("0.0.1");

program.addCommand(createConfigCommand());
program.addCommand(createKnowledgeBaseCommand());
program.addCommand(createLiteratureCommand());

program.parse();
