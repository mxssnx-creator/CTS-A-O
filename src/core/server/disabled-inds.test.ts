import assert from "node:assert/strict";
import { test } from "node:test";
import { baseFocus, dropDisabledInds } from "./runtime.server.ts";
import { DEFAULT_SETTINGS } from "../config.ts";

test("disabledInds drops exactly the listed bot|indication entries, whatever their lane suffix", () => {
  const entries = ["follow|rsi-mom-10-25", "follow|cfl-trend-50@m15", "follow|cfl-trend-50@m30", "revert|cfl-trend-50@m15"];
  assert.deepEqual(dropDisabledInds(entries, ["follow|cfl-trend-50"]), ["follow|rsi-mom-10-25", "revert|cfl-trend-50@m15"]);
  assert.deepEqual(dropDisabledInds(entries, undefined), entries);
  assert.deepEqual(dropDisabledInds(entries, []), entries);
});

test("baseFocus without disabledInds is unchanged and with them leaves the listed indication out", () => {
  const focus = ["follow|rsi-mom-10-25", "follow|cfl-trend-50@m15"];
  const s = { ...structuredClone(DEFAULT_SETTINGS), focus };
  const plain = baseFocus(s);
  assert.ok(plain.includes("follow|cfl-trend-50@m15"));
  const cut = baseFocus({ ...s, disabledInds: ["follow|cfl-trend-50"] });
  assert.ok(!cut.some((x) => x.startsWith("follow|cfl-trend-50")));
  assert.ok(cut.includes("follow|rsi-mom-10-25"));
  assert.equal(cut.length, plain.length - 1);
});
