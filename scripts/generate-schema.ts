import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import * as z from "zod";

import { ConfigSchema } from "../src/types/index.js";

const jsonSchema = z.toJSONSchema(ConfigSchema, { target: "draft-07" });

const thisDir = path.dirname(fileURLToPath(import.meta.url));
const outputPath = path.resolve(thisDir, "../config.schema.json");
fs.writeFileSync(outputPath, JSON.stringify(jsonSchema, null, 2) + "\n");

console.log(`Generated: ${outputPath}`);
