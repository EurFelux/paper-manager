import type { JsonValue } from "@eurfelux/jq-js";
import { jq } from "@eurfelux/jq-js";

import { log } from "../logger.js";

/**
 * Output data as JSON, optionally filtered by a jq expression.
 * When `jqExpr` is provided, applies the jq filter and prints each result value.
 * Otherwise prints pretty-printed JSON.
 */
export function outputJson(data: unknown, jqExpr?: string): void {
  const jsonStr = JSON.stringify(data, null, 2);
  if (jqExpr) {
    const normalized: JsonValue = JSON.parse(jsonStr);
    const results = jq(jqExpr, normalized);
    for (const result of results) {
      if (typeof result === "string") {
        log.plain(result);
      } else {
        log.plain(JSON.stringify(result, null, 2));
      }
    }
  } else {
    log.plain(jsonStr);
  }
}
