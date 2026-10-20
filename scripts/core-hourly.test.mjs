import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { hourlyNet, statsOf } from "../src/core/metrics/stats.ts";
import { walkForwardHourlyReport } from "./lib/walkforward-hourly-report.mjs";

const H = 3_600_000;
const trade = (r, entryT, exitT, extra = {}) => ({ r, entryT, exitT, mult: 1, ...extra });
const run = (trades, openAtEnd = [], extra = {}) => ({
  startT: 0,
  endT: 2 * H,
  trades,
  openAtEnd,
  stats: { n: 999, pf: 999, net: 999 },
  byKind: { fabricated: { n: 999 } },
  ...extra,
});
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-12, `${a} ≠ ${b}`);

describe("walk-forward hourly reporting", () => {
  it("assigns before/exact/after-boundary exits and the final end to the shared settled hours", () => {
    const closed = [H - 1, H, H + 1, 2 * H].map((exitT, i) => trade([0.02, -0.01, -0.01, 0.03][i], 1, exitT));
    const result = walkForwardHourlyReport(run(closed));
    assert.deepEqual(result.hourly.map(({ t, n }) => [t, n]), [[0, 2], [H, 2]]);
    assert.deepEqual(result.hourly.map(({ trades }) => trades.map((x) => x.exitT)), [[H - 1, H], [H + 1, 2 * H]]);
    assert.equal(result.hourly.reduce((n, h) => n + h.n, 0), result.stats.n);
    assert.equal(result.stats.n, 4);
  });

  it("the CLI renders the helper's actual clipped window and exposes matching machine-readable hourly counts", () => {
    const dir = mkdtempSync(join(tmpdir(), "cts-hourly-report-"));
    try {
      const actualEndT = Date.UTC(2026, 8, 1, 10, 30),
        M15 = 15 * 60_000;
      const cs = Array.from({ length: 128 }, (_, i) => ({
        t: actualEndT - (128 - i) * M15,
        o: 100,
        h: 100,
        l: 100,
        c: 100,
        v: 1,
      }));
      const cache = join(dir, "candles.json"),
        out = join(dir, "hourly");
      writeFileSync(cache, JSON.stringify({ "TEST-USDT": cs }));
      execFileSync(
        process.execPath,
        [
          "--experimental-strip-types",
          "--no-warnings",
          new URL("./core-hourly.mjs", import.meta.url).pathname,
          "--cache",
          cache,
          "--tf",
          "15",
          "--srctf",
          "15",
          "--hours",
          "2",
          "--end",
          "2026-09-01T12",
          "--presets",
          "normal",
          "--patch",
          JSON.stringify({ protects: [], dcaProtects: [] }),
          "--out",
          out,
        ],
        { cwd: new URL("..", import.meta.url), timeout: 10_000, stdio: "pipe" },
      );
      const json = JSON.parse(readFileSync(`${out}.json`, "utf8")),
        md = readFileSync(`${out}.md`, "utf8");
      const s = json.summary[0];
      assert.equal(s.endT, actualEndT);
      assert.equal(s.hourly.length, 1, "only the actual partial hour is rendered");
      assert.equal(
        s.hourly.reduce((n, h) => n + h.n, 0),
        s.n,
      );
      assert.equal(s.basis, "settled-net-unit-simulated-returns");
      assert.match(
        md,
        /Actual simulated window: 2026-09-01T10:00:00.000Z → 2026-09-01T10:30:00.000Z/,
      );
      assert.ok(md.indexOf("## Summary") < md.indexOf("## normal"));
      assert.match(md, /\| hour \(UTC\) \| closes \|/);
      assert.match(md, /Endpoint marks:/);
      assert.match(md, /no-loss PF uses the shared engine sentinel 4/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  it("honors verified unit overrides and makes the entire primary unavailable for an unknown or invalid row", () => {
    const override = walkForwardHourlyReport(
      run([trade(0.9, 1, H, { unitR: 0.02, mult: 3 }), trade(-0.01, H + 1, 2 * H, { mult: 1 })]),
    );
    near(override.stats.pf, 2);
    for (const extra of [{ unitR: null }, { mult: undefined }, { mult: 0 }, { mult: NaN }]) {
      const result = walkForwardHourlyReport(
        run([trade(0.02, 1, H), trade(-0.01, H + 1, 2 * H, extra)]),
      );
      assert.equal(result.stats.n, 2);
      assert.equal(result.stats.pfBasis, "unavailable");
      assert.equal(result.stats.unknownReturns, 1);
      assert.equal(result.stats.pf, null);
      assert.equal(result.stats.net, null);
      assert.equal(result.hourly[1].net, null);
      near(result.sizedSimulation.pf, 2, "raw-sized diagnostic remains separate");
    }
  });
  it("uses one settled sample for totals, kinds and exit-bar-end hours, including the final boundary", () => {
    const closed = [trade(0.02, 1, H), trade(-0.01, H + 1, 2 * H, { kind: "trailing" })];
    const result = walkForwardHourlyReport(run(closed));
    assert.equal(result.stats.n, 2);
    near(result.stats.pf, 2);
    near(result.stats.net, 1);
    assert.deepEqual(
      result.hourly.map(({ t, n }) => [t, n]),
      [
        [0, 1],
        [H, 1],
      ],
    );
    assert.deepEqual(
      new Map(result.hourly.map(({ t, n, net }) => [t, { n, net }])),
      hourlyNet(closed),
    );
    assert.equal(
      result.hourly.reduce((n, h) => n + h.stats.n, 0),
      result.stats.n,
    );
    near(
      result.hourly.reduce((n, h) => n + h.net, 0),
      result.stats.net,
    );
    assert.equal(result.byKind.normal.n, 1);
    assert.equal(result.byKind.trailing.n, 1);
    assert.equal(
      Object.values(result.byKind).reduce((n, s) => n + s.n, 0),
      result.stats.n,
    );
    near(
      Object.values(result.byKind).reduce((n, s) => n + s.net, 0),
      result.stats.net,
    );
    assert.equal(
      result.byKind.fabricated,
      undefined,
      "never reuse aggregates from a different sample",
    );
  });

  it("keeps losing endpoint marks visible and separate from primary settled PF", () => {
    const closed = [trade(0.02, 1, H), trade(-0.01, H + 1, 2 * H)];
    const mark = trade(-0.04, H + 2, 2 * H, { markedOpen: true });
    const result = walkForwardHourlyReport(run(closed, [mark]));
    assert.equal(result.stats.n, 2);
    near(result.stats.pf, 2);
    assert.equal(result.endpointMarks.n, 1);
    near(result.endpointMarks.net, -4);
    assert.equal(result.withEndpointMarks.n, 3);
    near(result.withEndpointMarks.pf, 0.4);
    near(result.withEndpointMarks.net, -3);
    near(result.withEndpointMarks.pf, statsOf([...closed, mark]).pf);
  });

  it("reverses the direct walkForward execution multiplier once: return PF 1.36 versus sized PF 0.20", () => {
    // walkforward.ts creates x.r = tape.r * dec.vol * cv, x.mult = dec.vol * cv.
    const tapeReturns = [0.0136, -0.01],
      multiples = [1, 6.8];
    const executed = tapeReturns.map((r, i) =>
      trade(r * multiples[i], 1 + i * H, (i + 1) * H, { mult: multiples[i], vol: multiples[i] }),
    );
    const result = walkForwardHourlyReport(run(executed));
    near(result.stats.pf, 1.36);
    near(result.stats.net, 0.36);
    near(result.stats.gp, 1.36);
    near(result.stats.gl, 1);
    near(result.sizedSimulation.pf, 0.2);
    near(result.sizedSimulation.net, -5.44);
    near(
      result.hourly.reduce((n, h) => n + h.net, 0),
      0.36,
    );
    assert.equal(result.basis, "settled-net-unit-simulated-returns");
    assert.equal(result.sizedSimulation.basis, "settled-size-weighted-simulated-returns");
    assert.equal(result.hourly[1].trades[0].r, -0.068, "raw volume/details remain unchanged");
  });

  it("preserves already-unit modeled returns when mult is missing or one and does not mutate inputs", () => {
    const source = run([trade(0.02, 1, H), trade(-0.01, H + 1, 2 * H, { mult: 1 })]);
    const copy = structuredClone(source);
    const result = walkForwardHourlyReport(source);
    near(result.stats.pf, result.sizedSimulation.pf);
    near(result.stats.net, result.sizedSimulation.net);
    assert.deepEqual(source, copy);
  });

  it("uses actual run bounds, retains partial hours, and excludes old entries and unsettled/future exits", () => {
    const startT = H / 2,
      endT = 2 * H + H / 2;
    const source = run(
      [
        trade(0.5, startT - 1, H),
        trade(0.01, startT, H),
        trade(-0.02, H + 1, endT),
        trade(0.9, 2 * H, endT + 1),
        trade(0.8, endT, endT + H),
        trade(0.7, H, endT, { markedOpen: true }),
      ],
      [],
      { startT, endT },
    );
    const result = walkForwardHourlyReport(source);
    assert.equal(result.startT, startT);
    assert.equal(result.endT, endT);
    assert.deepEqual(
      result.hourly.map(({ t, n }) => [t, n]),
      [
        [0, 1],
        [H, 0],
        [2 * H, 1],
      ],
    );
    assert.equal(result.stats.n, 2);
    near(result.stats.net, -1);
    near(result.stats.pf, 0.5);
  });

  it("discloses no-loss sentinel and supports empty windows without inventing trades", () => {
    const winner = walkForwardHourlyReport(run([trade(0.01, 1, H, { kind: "axis" })]));
    assert.equal(winner.stats.pf, 4);
    assert.equal(winner.stats.noLoss, true);
    assert.equal(winner.stats.exactRatio, null);
    assert.match(winner.stats.pfConvention, /sentinel 4/);
    assert.equal(winner.byKind.axis.n, 1);
    const empty = walkForwardHourlyReport(run([]));
    assert.equal(empty.stats.n, 0);
    assert.equal(empty.stats.pf, 0);
    assert.equal(empty.stats.noLoss, false);
    assert.equal(empty.hourly.length, 2);
    assert.equal(
      empty.hourly.reduce((n, h) => n + h.n, 0),
      0,
    );
    assert.deepEqual(empty.byKind, {});
    assert.throws(() => walkForwardHourlyReport(run([], [], { endT: NaN })), /bounds/);
    assert.throws(() => walkForwardHourlyReport(run([], [], { startT: 3 * H })), /bounds/);
  });
});
