// The runtime's candles are CandleSeries (src/core/market/candle-series.ts): a series has no length, no index access
// and no array methods. In a script that would not throw everywhere (cs[i]?.t is silently undefined: a null price on
// the desk), so the scripts read the runtime's candles through scripts/lib/candles.mjs. This scan fails on array
// access to a value read from rt.candles.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, ".");
function files(dir) {
  const out = [];
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (f === "node_modules") continue;
    if (statSync(p).isDirectory()) out.push(...files(p));
    else if (/\.(mjs|ts)$/.test(f) && !/\.test\.(mjs|ts)$/.test(f) && !p.endsWith(join("lib", "candles.mjs"))) out.push(p);
  }
  return out;
}

test("no script reads the runtime's candles as arrays", () => {
  const bad = [];
  for (const p of files(root)) {
    const src = readFileSync(p, "utf8");
    // a copy of the map read further on (the live report's candlesNow) goes through the helpers
    if (/new Map\((?:rt|r|R)\.candles\)/.test(src) && !/from "\.\/lib\/candles\.mjs"/.test(src)) bad.push(`${p}: copies rt.candles without scripts/lib/candles.mjs`);
    src.split("\n").forEach((line, i) => {
      // a direct array read on rt.candles.get(...)
      if (/\b(?:rt|r|R)\.candles\.get\([^)]*\)\??\.(?:at|length|slice|filter|map|find|some|every|reduce)\b/.test(line)) bad.push(`${p}:${i + 1}: ${line.trim()}`);
      if (/\b(?:rt|r|R)\.candles\.get\([^)]*\)\??\[/.test(line)) bad.push(`${p}:${i + 1}: ${line.trim()}`);
      // a loop over rt.candles with array methods on the value
      const m = /for \(const \[\w+, (\w+)\] of (?:rt|r|R)\.candles\)/.exec(line);
      if (m) {
        const v = m[1];
        const body = src.split("\n").slice(i, i + 3).join("\n");
        if (new RegExp(`\\b${v}\\.(?:at|length|slice|filter|map|find|some|every|reduce)\\b|\\b${v}\\[`).test(body)) bad.push(`${p}:${i + 1}: ${line.trim()}`);
      }
    });
  }
  assert.deepEqual(bad, [], "use scripts/lib/candles.mjs (lastCloseOf, closeAtExact, closesIn)");
});
