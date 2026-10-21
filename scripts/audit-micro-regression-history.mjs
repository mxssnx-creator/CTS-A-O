#!/usr/bin/env node
// Execute the historical order-key functions, not a recollection of their behavior.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import {
  MICRO_CONFIG_IDS,
  INVERSE_MICRO_CONFIG_IDS,
  microAnchorTf,
  isMicroCalculationInd,
} from "../src/core/indications/micro-family.ts";
import { INVERSE_CONFIG_IDS, isInverseInd } from "../src/core/indications/inverse-config.ts";
import { isMicroInd } from "../src/core/indications/micro.ts";
import { isSignalInd } from "../src/core/indications/registry.ts";

const sources = [
  ...MICRO_CONFIG_IDS,
  ...INVERSE_MICRO_CONFIG_IDS,
  ...INVERSE_CONFIG_IDS,
  "mc-irsi2-10",
  "mc-turn-irsi2-10",
];
const ids = sources.map((id) => `follow|${id}@m${microAnchorTf(id) ?? 1}|tp2|sl1|tr0|h60|mc`);
const rows = [];
for (const ref of [
  "ab38a7a",
  "36eb672",
  "47d70d8",
  "e9f7968",
  "c8e97b8",
  "32594ed",
  "working-tree",
]) {
  const source =
    ref === "working-tree"
      ? readFileSync("src/core/sim/walkforward.ts", "utf8")
      : execFileSync("git", ["show", `${ref}:src/core/sim/walkforward.ts`], { encoding: "utf8" });
  const sf = ts.createSourceFile("walkforward.ts", source, ts.ScriptTarget.Latest, true);
  const fn = sf.statements.find(
    (x) => ts.isFunctionDeclaration(x) && x.name?.text === "orderCfgKey",
  );
  assert.ok(fn);
  const text = fn.getText(sf);
  const js = ts.transpile(text.replace(/^export /, ""), {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.None,
  });
  const key = runInNewContext(`${js}\norderCfgKey`, {
    AXIS_VARIANT_TAG: /^axd?-[a-z0-9]+$/,
    isSignalInd,
    isMicroFamilyInd: isMicroCalculationInd,
    isMicroInd,
    isInverseInd,
  });
  rows.push({
    ref,
    keyFunctionSha256: createHash("sha256").update(text).digest("hex"),
    probedSources: ids.length,
    uniqueOrderIdentities: new Set(ids.map(key)).size,
    preservedFullIds: ids.filter((id) => key(id) === id).length,
  });
}
assert.equal(
  rows[0].keyFunctionSha256,
  rows[4].keyFunctionSha256,
  "The key policy unexpectedly changed before the fix",
);
for (const row of rows.slice(0, 5)) assert.equal(row.uniqueOrderIdentities, 1);
for (const row of rows.slice(5)) assert.equal(row.uniqueOrderIdentities, ids.length);
const result = {
  schema: "cts-micro-order-key-history-v1",
  scope:
    "Current source IDs probed against each actual historical key function. This is a key-policy compatibility trace, not an old registry inventory or market PF replay.",
  firstMicroIntegration:
    "ab38a7a: new Micro registry added without extending the existing order key policy",
  inverseIntegration:
    "36eb672: mirrored/inverse registry added while that order key function remained unchanged",
  fixedAt: "32594ed (published equivalent bc7ae24890d9d343aec595f0eee753d35b8f6aa1)",
  rows,
};
writeFileSync(
  process.argv[2] ?? "docs/micro-2026-10-20/order-identity-history.json",
  JSON.stringify(result, null, 2) + "\n",
);
console.log(JSON.stringify(result));
