import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { DEFAULT_SETTINGS } from "./config.ts";
import { checkSettings } from "./settings-check.ts";
import { DESK_PRESETS } from "./presets.desk.ts";
import { LIVE_COORD_PRESETS } from "./presets.live.ts";
import { CoreDb } from "./server/db.server.ts";
import { CoreRuntime } from "./server/runtime.server.ts";

// Operator, 12 Nov 2026: maximum leverage is always used and is the default. The live step sets each symbol and side to the
// exchange maximum before its first open (control.test.ts); this pins the default and keeps presets and profiles from
// carrying a lower number by accident.
test('the default leverage is "max" in the code defaults and in a fresh runtime', () => {
  assert.equal(DEFAULT_SETTINGS.live.leverage, "max");
  const rt = new CoreRuntime(new CoreDb(":memory:"), undefined, { market: "synthetic", priceStream: null });
  try { assert.equal(rt.settings.live.leverage, "max"); } finally { rt.dispose(); }
  assert.doesNotThrow(() => checkSettings({ live: { leverage: "max" } } as never));
});

test("no desk or live preset and no committed desk profile carries a fixed lower leverage", () => {
  for (const p of [...DESK_PRESETS, ...LIVE_COORD_PRESETS]) {
    const lev = (p.settings as { live?: { leverage?: unknown } }).live?.leverage;
    assert.ok(lev === undefined || lev === "max", `${p.id}: leverage ${String(lev)}`);
  }
  for (const f of ["x01.settings.json", "x02.settings.json", "twin.settings.json"]) {
    const s = JSON.parse(readFileSync(new URL(`../../docs/live-coordination/${f}`, import.meta.url), "utf8"));
    assert.ok(s.live?.leverage === undefined || s.live.leverage === "max", `${f}: ${String(s.live?.leverage)}`);
  }
});
