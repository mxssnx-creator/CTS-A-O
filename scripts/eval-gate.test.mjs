// scripts/eval-gate.mjs: its windows, their run lengths, the span's split and the warm-up check (--plan runs nothing).
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { evalWindows, feedStartT, resolveSpan, warmupNeedH, warmupOf } from "./lib/eval-windows.mjs";

const H = 3_600_000;
const here = dirname(fileURLToPath(import.meta.url));
const iso = (t) => new Date(t).toISOString();

test("a span that is not a multiple of 48 h: the last window's session runs over that window only", () => {
  const span = resolveSpan({ from: "2026-09-24T13:00:00Z", to: "2026-09-29T11:00:00Z" });
  const ws = evalWindows(span, 48);
  assert.deepEqual(ws.map((w) => w.runH), [48, 48, 22]);
  for (const w of ws) assert.equal(w.to - w.from, w.runH * H);
  // consecutive, no overlap, covering the span
  assert.equal(ws[0].from, span.from);
  assert.equal(ws.at(-1).to, span.to);
  for (let k = 1; k < ws.length; k++) assert.equal(ws[k].from, ws[k - 1].to);
});

test("the split defaults to D1's only on D1; another span is cut inside it, both halves non-empty", () => {
  assert.equal(iso(resolveSpan({}).split), "2026-10-04T11:00:00.000Z");
  const s = resolveSpan({ from: "2026-09-24T13:00:00Z", to: "2026-09-29T11:00:00Z" });
  assert.ok(s.split > s.from && s.split < s.to, iso(s.split));
  assert.equal(s.split % H, 0);
  // only --to moved: not D1 any more, the split follows the span
  const t = resolveSpan({ to: "2026-10-03T11:00:00Z" });
  assert.ok(t.split > t.from && t.split < t.to, iso(t.split));
  // an explicit split outside the span is refused, not reported as a D1b PF of 0
  assert.throws(() => resolveSpan({ from: "2026-09-24T13:00:00Z", to: "2026-09-29T11:00:00Z", split: "2026-10-04T11:00:00Z" }), /outside the span/);
  assert.throws(() => resolveSpan({ from: "2026-09-24T13:30:00Z", to: "2026-09-29T11:00:00Z" }), /on the hour/);
});

test("the warm-up: the volatility rank on the slowest lane, plus a signal hold with historic signal configs", () => {
  assert.equal(warmupNeedH({ tfs: [1, 5, 15, 30], warmupBars: 356, signals: false, hist: true, holdH: 48 }), 178);
  assert.equal(warmupNeedH({ tfs: [1, 5, 15, 30], warmupBars: 356, signals: true, hist: true, holdH: 48 }), 226);
  assert.equal(warmupNeedH({ tfs: [1, 5, 15], warmupBars: 356, signals: true, hist: false, holdH: 48 }), 89);
  const feedStart = Date.parse("2026-09-23T13:00:00Z");
  const ws = evalWindows(resolveSpan({ from: "2026-09-24T13:00:00Z", to: "2026-10-04T13:00:00Z" }), 48);
  const w = warmupOf(ws, feedStart, 178);
  assert.deepEqual(w.map((x) => x.haveH), [24, 72, 120, 168, 216]);
  assert.deepEqual(w.map((x) => x.short), [true, true, true, true, false]);
});

test("the feed's start is read from the series' first bars", () => {
  const t0 = Date.parse("2026-09-23T13:00:00Z");
  const feed = JSON.stringify({
    tickers: [{ sym: "AAA-USDT" }],
    candles: {
      "AAA-USDT|1": [{ t: t0 - 5 * 60_000, o: 1 }, { t: t0, o: 1 }],
      "BBB-USDT|1": [{ t: t0, o: 1 }],
      "CCC-USDT|15": [{ t: t0, o: 1 }],
      "NEW-USDT|1": [{ t: t0 + 50 * H, o: 1 }],
    },
  });
  assert.equal(feedStartT(feed), t0);
  assert.equal(feedStartT("{}"), null);
});

test("eval-gate --plan: per-window run lengths, a split inside the span, and the windows short of warm-up", () => {
  const dir = mkdtempSync(join(tmpdir(), "eval-gate-"));
  const feed = join(dir, "feed.json");
  writeFileSync(feed, JSON.stringify({ tickers: [], candles: { "AAA-USDT|30": [{ t: Date.parse("2026-09-23T13:00:00Z"), o: 1 }] } }));
  const run = (...extra) =>
    spawnSync(process.execPath, ["--experimental-strip-types", "--no-warnings", join(here, "eval-gate.mjs"), "--label", "t", "--feed", feed, ...extra], {
      encoding: "utf8",
      cwd: dir,
    });
  const r = run("--from", "2026-09-24T13:00:00Z", "--to", "2026-09-29T11:00:00Z", "--plan");
  assert.equal(r.status, 0, r.stderr);
  const p = JSON.parse(r.stdout);
  assert.deepEqual(p.windows.map((w) => w.runH), [48, 48, 22]);
  assert.ok(p.span.split > p.span.from && p.span.split < p.span.to);
  assert.equal(p.feedStart, "2026-09-23T13:00:00.000Z");
  assert.ok(p.windows.every((w) => w.short), JSON.stringify(p.windows));
  // without --plan the run is refused before any session starts (nothing short of warm-up is measured silently)
  const refused = run("--from", "2026-09-24T13:00:00Z", "--to", "2026-09-29T11:00:00Z");
  assert.equal(refused.status, 2);
  assert.match(refused.stderr, /inside the warm-up/);
});
