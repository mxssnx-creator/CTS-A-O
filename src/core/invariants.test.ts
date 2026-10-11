// Seeded property tests (deterministic: every case comes from rng(seed) of test-support): the exchange quantity and
// stop snapping, the live control's targets, the trade statistics against a direct sum, and the long / short split
// of the bar simulator.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { rng } from "./test-support.ts";
import {
  exchangeMinNotional,
  minStopDist,
  pxTick,
  snapQtyExchange,
  stopPxExchange,
  type ContractSpec,
} from "./exchange/bingx.server.ts";
import {
  controlTargets,
  MIN_RAISE_X,
  positionCapFor,
  type ControlContribution,
  type ControlSettings,
} from "./server/live.ts";
import { sigCfg } from "./sim/walkforward.ts";
import { profitFactor, statsOf } from "./metrics/stats.ts";
import { buildStatistics, groupBy, positionResults, rowOf, type StatTrade } from "./statistics.ts";
import { PF_NO_LOSS } from "./config.ts";
import { bothSides, mergeSideTrades, sideSignal, simulate, splitSides } from "./sim/backtest.ts";
import { barsFromCandles } from "./market/bars.ts";
import type { Candle, Protect, Trade } from "./domain/types.ts";

const CASES = 500;
const H = 3_600_000;
type R = () => number;
const pick = <T>(r: R, xs: readonly T[]): T => xs[Math.floor(r() * xs.length)];
const int = (r: R, lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));
const logU = (r: R, lo: number, hi: number) => lo * (hi / lo) ** r();
/** x is a whole multiple of step (to the float precision of the quotient) */
const onGrid = (x: number, step: number) => {
  const q = x / step;
  return Math.abs(q - Math.round(q)) <= 1e-6 * Math.max(1, Math.abs(q));
};
const close = (a: number, b: number, eps = 1e-9) =>
  Math.abs(a - b) <= eps * Math.max(1, Math.abs(a), Math.abs(b));

/** a contract as loadContracts builds it: the lot step on the quantity precision, the minimum at least one step */
function specOf(r: R, symbol = "X-USDT"): ContractSpec {
  const qtyPrec = int(r, 0, 6);
  const step = +(pick(r, [1, 1, 1, 2, 5, 10, 25]) * 10 ** -qtyPrec).toFixed(qtyPrec);
  // mostly a whole number of steps; sometimes a venue minimum between two steps
  const k = int(r, 1, 50);
  const minQty =
    r() < 0.8 ? +(k * step).toFixed(qtyPrec) : +((k + 0.5) * step).toFixed(qtyPrec + 1);
  return {
    symbol,
    qtyPrec,
    step,
    minQty,
    pxPrec: int(r, 0, 8),
    minUsdt: pick(r, [1, 2, 2, 5, 10]),
  };
}

describe("exchange snapping (bingx.server.ts)", () => {
  it(`snapQtyExchange: a non-zero quantity is on the lot grid and at least every minimum (${CASES} cases)`, () => {
    const r = rng(101);
    const seen = { raised: 0, floored: 0, named: 0 };
    for (let c = 0; c < CASES; c++) {
      const spec = specOf(r);
      const px = logU(r, 1e-5, 1e5);
      const minN = exchangeMinNotional(spec, px);
      const qty = (minN / px) * logU(r, 1e-3, 1e3);
      const named = r() < 0.3 ? spec.minQty * logU(r, 0.5, 4) : 0;
      const got = snapQtyExchange(qty, px, spec, named);
      const at = `case ${c}: qty ${qty} px ${px} named ${named} spec ${JSON.stringify(spec)} → ${JSON.stringify(got)}`;
      assert.ok(got.qty > 0, at);
      assert.ok(onGrid(got.qty, spec.step), `off the lot grid: ${at}`);
      assert.ok(
        got.qty >= Math.max(spec.minQty, named) * (1 - 1e-9),
        `below the minimum quantity: ${at}`,
      );
      assert.ok(got.qty * px >= minN * (1 - 1e-9) - 1e-9, `below the minimum notional: ${at}`);
      seen[got.raised ? "raised" : "floored"]++;
      if (named > 0 && got.qty < named * (1 + 1e-6) + spec.step) seen.named++;
      if (!got.raised) {
        // floored: never above what was asked, and less than one step below it
        assert.ok(got.qty <= qty * (1 + 1e-9), `not raised but above the ask: ${at}`);
        assert.ok(got.qty > qty - spec.step * (1 + 1e-6), `floored more than a step: ${at}`);
      } else {
        // raised: the smallest grid quantity that clears the minimums
        const need = Math.max(spec.minQty, named, minN / px);
        assert.ok(
          got.qty - spec.step < need * (1 + 1e-9),
          `raised past the smallest valid quantity: ${at}`,
        );
      }
    }
    assert.ok(seen.raised > 50 && seen.floored > 50 && seen.named > 10, JSON.stringify(seen));
  });

  it("snapQtyExchange: nothing to size is zero, no contract leaves the quantity as asked", () => {
    const r = rng(102);
    for (let c = 0; c < CASES; c++) {
      const spec = specOf(r);
      const px = logU(r, 1e-3, 1e4);
      assert.deepEqual(snapQtyExchange(pick(r, [0, -1, Number.NaN]), px, spec), {
        qty: 0,
        raised: false,
      });
      assert.deepEqual(snapQtyExchange(1, pick(r, [0, -1, Number.NaN]), spec), {
        qty: 0,
        raised: false,
      });
      const q = logU(r, 1e-3, 1e3);
      assert.deepEqual(snapQtyExchange(q, px, null), { qty: q, raised: false });
    }
  });

  it(`stopPxExchange: on the protective side, at least the minimum distance, on the price tick (${CASES} cases)`, () => {
    const r = rng(103);
    let zero = 0;
    for (let c = 0; c < CASES; c++) {
      const spec = r() < 0.15 ? null : specOf(r);
      const px = logU(r, 1e-4, 1e5);
      const side = pick(r, [1, -1] as const);
      const dist = r() < 0.1 ? 0 : r() * 0.3;
      const learned = r() < 0.3 ? r() * 0.05 : 0;
      const s = stopPxExchange(px, side, dist, spec, learned);
      const d = Math.max(dist, minStopDist(px, spec, learned));
      const tick = pxTick(spec);
      const at = `case ${c}: px ${px} side ${side} dist ${dist} learned ${learned} pxPrec ${spec?.pxPrec} → ${s}`;
      if (s === 0) {
        // no stop only where none can exist: a long whose stop would sit under one tick
        zero++;
        assert.equal(side, 1, at);
        assert.ok(px * (1 - d) < tick * (1 + 1e-9), at);
        continue;
      }
      assert.ok(onGrid(s, tick), `off the price tick: ${at}`);
      if (side === 1)
        assert.ok(s < px && (px - s) / px >= d * (1 - 1e-9), `long stop not below by ${d}: ${at}`);
      else
        assert.ok(s > px && (s - px) / px >= d * (1 - 1e-9), `short stop not above by ${d}: ${at}`);
      // rounded away from the mark, but by less than one tick
      const raw = side === 1 ? px * (1 - d) : px * (1 + d);
      assert.ok(Math.abs(s - raw) < tick * (1 + 1e-6), `more than a tick from the distance: ${at}`);
      // at least the tick clearance the venue needs
      assert.ok(Math.abs(s - px) >= tick * 4 * (1 - 1e-6), `inside the tick clearance: ${at}`);
    }
    assert.ok(zero < CASES / 10, `${zero} cases without a stop`);
  });

  it("stopPxExchange: no price is no stop", () => {
    for (const px of [0, -1, Number.NaN]) assert.equal(stopPxExchange(px, 1, 0.01), 0);
  });
});

// ── live control targets ─────────────────────────────────────────────────────────────────────────────────────────
const ENGINE_CFG = [
  "follow|rsi-mom-14-20@m15|tp1|sl1|tr0|h32",
  "revert|cci-14-200@x4|tp2|sl1|tr0|h32|mn",
  "follow|bb-walk@x4|tp1|sl2|tr0|h32|sh",
];
const SIGNAL_CFG = [
  "follow|sig-ema-cross-s@m15|tp3|sl1|tr0|h48",
  "follow|sig-r-orb-m@m15|tp4|sl1|tr0|h48|trailing",
];

type Case = {
  lanes: ControlContribution[];
  prices: Map<string, number>;
  cs: ControlSettings;
  specs: Map<string, ContractSpec> | null;
  fixed: number;
  equity: number | null;
  maxPositionX: number | undefined;
};
function controlCase(r: R, integer = false): Case {
  const syms = Array.from({ length: int(r, 1, 6) }, (_, i) => `S${i}-USDT`);
  const lanes: ControlContribution[] = Array.from({ length: int(r, 0, 24) }, (_, i) => {
    const signal = r() < 0.35;
    const sl = pick(r, [0.005, 0.01, 0.02, 0.05, 0.12, 0.3]);
    return {
      id: `l${i}`,
      cfg: pick(r, signal ? SIGNAL_CFG : ENGINE_CFG),
      sym: pick(r, syms),
      side: pick(r, [1, -1] as const),
      vol: integer ? int(r, 0, 8) : r() < 0.05 ? 0 : logU(r, 0.2, 8),
      sl,
      ...(r() < 0.3 ? { risk: sl * r() } : {}),
    };
  });
  // some symbols have no fresh price
  const prices = new Map(
    syms.filter(() => r() < 0.9).map((s) => [s, logU(r, 0.001, 50_000)] as const),
  );
  const fixed = pick(r, [5, 25, 100, 1000]);
  const equity = r() < 0.7 ? logU(r, 5, 100_000) : null;
  const maxPositionX = r() < 0.6 ? pick(r, [0.5, 1, 3]) : undefined;
  const held = new Set(
    [...new Set(lanes.map((l) => `${l.sym}|${l.side}`))].filter(() => r() < 0.3),
  );
  const blockedKeys = new Set(
    [...new Set(lanes.map((l) => `${l.sym}|${l.side}`))].filter(() => r() < 0.1),
  );
  const cs: ControlSettings = {
    notionalUsd: pick(r, [1, 6, 10, 50]),
    ratio: integer ? pick(r, [1, 2, 10]) : pick(r, [0.5, 1, 2, 10, 60]),
    signalWeight: integer ? pick(r, [1, 2]) : pick(r, [0, 1, 2.5]),
    maxNotionalUsd: positionCapFor(fixed, equity, maxPositionX),
    maxPositions: pick(r, [0, 1, 2, 3, 5, 8]),
    signalMaxPositions: pick(r, [0, 0, 1, 2]),
    rebalancePct: 0.25,
    positionMode: r() < 0.25 ? "oneway" : "hedge",
    minStopPct: pick(r, [0.005, 0.01, 0.02, 0.25]),
    heldKeys: held,
    // a named reason, or `true` (the default reason)
    blocked: (k) => (blockedKeys.has(k) ? (k.endsWith("|1") ? "risk budget" : true) : null),
    ...(r() < 0.3
      ? { minStopOf: (_s: string, px: number) => minStopDist(px, { pxPrec: 4 } as ContractSpec) }
      : {}),
  };
  const specs = r() < 0.6 ? new Map(syms.map((s) => [s, specOf(r, s)])) : null;
  return { lanes, prices, cs, specs, fixed, equity, maxPositionX };
}
const run = (k: Case, lanes = k.lanes) =>
  controlTargets(
    lanes,
    k.prices,
    k.cs,
    k.specs ? (sym, q, px) => snapQtyExchange(q, px, k.specs!.get(sym)) : undefined,
  );

/** the keys the control aggregates (hedge: symbol × side; oneway: the net side of each symbol) and their class */
function keysOf(k: Case): Map<string, { signalOnly: boolean }> {
  const by = new Map<string, { vol: number; engine: boolean }>();
  for (const l of k.lanes) {
    const key = `${l.sym}|${l.side}`;
    const a = by.get(key) ?? { vol: 0, engine: false };
    a.vol += Math.max(0, l.vol) * (sigCfg(l.cfg) ? Math.max(0, k.cs.signalWeight ?? 1) : 1);
    a.engine ||= !sigCfg(l.cfg);
    by.set(key, a);
  }
  const out = new Map<string, { signalOnly: boolean }>();
  if (k.cs.positionMode !== "oneway") {
    for (const [key, a] of by) out.set(key, { signalOnly: !a.engine });
    return out;
  }
  for (const sym of new Set(k.lanes.map((l) => l.sym))) {
    const L = by.get(`${sym}|1`);
    const S = by.get(`${sym}|-1`);
    const v = (L?.vol ?? 0) - (S?.vol ?? 0);
    if (Math.abs(v) < 1e-9) continue;
    out.set(`${sym}|${v > 0 ? 1 : -1}`, { signalOnly: !(L?.engine || S?.engine) });
  }
  return out;
}

describe("live control targets (server/live.ts controlTargets)", () => {
  it(`never above the position caps or the per-position cap; every key a target or a skip with a reason (${CASES} cases)`, () => {
    const r = rng(201);
    let targets = 0;
    let raisedAtMin = 0;
    const why = new Map<string, number>();
    let oneway = 0;
    for (let c = 0; c < CASES; c++) {
      const k = controlCase(r);
      const res = run(k);
      const at = `case ${c}`;
      const keys = keysOf(k);
      const cap = k.cs.maxNotionalUsd;
      if (k.cs.positionMode === "oneway") oneway++;
      for (const s of res.skipped) {
        const w = s.why.startsWith("exchange minimum") ? "exchange minimum" : s.why;
        why.set(w, (why.get(w) ?? 0) + 1);
      }
      // the position caps: engine and signal positions together, the signal-only ones within their own cap per
      // direction (long and short apart)
      if (k.cs.maxPositions > 0) assert.ok(res.targets.length <= k.cs.maxPositions, at);
      const sigTargets = res.targets.filter((t) => keys.get(t.key)?.signalOnly);
      const sigOnSide = (side: 1 | -1) => sigTargets.filter((t) => t.side === side).length;
      if (k.cs.signalMaxPositions)
        for (const side of [1, -1] as const) assert.ok(sigOnSide(side) <= k.cs.signalMaxPositions, at);
      const targetKeys = new Set(res.targets.map((t) => t.key));
      // a cap skip only once the cap is full
      for (const s of res.skipped) {
        assert.ok(typeof s.why === "string" && s.why.length > 0, `${at}: a skip without a reason`);
        assert.ok(
          k.prices.has(s.sym) || s.why === "no fresh price",
          `${at}: ${s.sym} skipped for ${s.why}`,
        );
        if (s.why === "max control positions (symbol × side)")
          assert.equal(res.targets.length, k.cs.maxPositions, at);
        if (s.why === "max signal control positions (symbol × side)") {
          // the skipped key is a signal-only key of this symbol, not a target, on a side whose signal cap is full
          const capped = [...keys].some(
            ([key, v]) =>
              key.split("|")[0] === s.sym &&
              v.signalOnly &&
              !targetKeys.has(key) &&
              sigOnSide(Number(key.split("|")[1]) as 1 | -1) === k.cs.signalMaxPositions,
          );
          assert.ok(capped, `${at}: ${s.sym} skipped for the signal cap with no side at the cap`);
        }
      }
      // every key accounted for exactly once
      assert.equal(
        res.targets.length + res.skipped.length,
        keys.size,
        `${at}: targets + skips = keys`,
      );
      assert.equal(
        new Set(res.targets.map((t) => t.key)).size,
        res.targets.length,
        `${at}: a key twice`,
      );
      // held positions take their slots first
      const held = res.targets.map((t) => k.cs.heldKeys!.has(t.key));
      assert.ok(
        held.every((h, i) => !h || held.slice(0, i).every(Boolean)),
        `${at}: a held target after a new one`,
      );
      for (const t of res.targets) {
        targets++;
        assert.ok(keys.has(t.key) && t.key === `${t.sym}|${t.side}`, `${at}: ${t.key}`);
        assert.ok(
          t.qty > 0 && close(t.notional, t.qty * k.prices.get(t.sym)!),
          `${at}: ${JSON.stringify(t)}`,
        );
        // the per-position cap (the fixed cap and maxPositionX × equity, whichever is smaller); only the exchange
        // minimum may take a position past it, and then at most MIN_RAISE_X times
        const bound = t.atMin ? cap * MIN_RAISE_X : cap * 1.0001;
        assert.ok(
          t.notional <= bound + 1e-9,
          `${at}: ${t.key} notional ${t.notional} over ${bound}`,
        );
        if (t.atMin) {
          raisedAtMin++;
          assert.equal(t.raised, true, at);
        }
        if (!t.atMin) {
          assert.ok(t.notional <= k.fixed * 1.0001 + 1e-9, `${at}: over the fixed cap`);
          if (k.maxPositionX && k.equity)
            assert.ok(
              t.notional <= k.maxPositionX * k.equity * 1.0001 + 1e-9,
              `${at}: over x × equity`,
            );
        }
        const minStop = Math.max(
          k.cs.minStopPct ?? 0.01,
          k.cs.minStopOf?.(t.sym, k.prices.get(t.sym)!) ?? 0,
        );
        assert.ok(
          t.stopDist <= 0.2 && t.stopDist >= Math.min(0.2, minStop),
          `${at}: stop ${t.stopDist}`,
        );
        assert.ok((t.riskDist ?? 0) <= t.stopDist + 1e-12, `${at}: risk past the stop`);
      }
    }
    assert.ok(targets > CASES, `${targets} targets: the cases exercise the sizing`);
    assert.ok(raisedAtMin > 0, "some cases raise a position to the exchange minimum past the cap");
    assert.ok(oneway > 50, `${oneway} one-way cases`);
    // every skip reason is exercised
    for (const w of [
      "no fresh price",
      "max control positions (symbol × side)",
      "max signal control positions (symbol × side)",
      "size rounds to zero",
      "exchange minimum",
      "risk budget",
      "open waiting after a failure",
    ])
      assert.ok((why.get(w) ?? 0) > 0, `no case skips for "${w}": ${JSON.stringify([...why])}`);
  });

  it(`deterministic: the same input gives the same plan, in any lane order (${CASES} cases)`, () => {
    const r = rng(202);
    for (let c = 0; c < CASES; c++) {
      // whole volumes: their sums are exact in any order, so a tie on volume cannot flip on the last bit
      const k = controlCase(r, true);
      const a = run(k);
      assert.deepEqual(run(k), a, `case ${c}: two runs differ`);
      const shuffled = [...k.lanes].sort(() => r() - 0.5);
      const b = run(k, shuffled);
      const strip = (x: typeof a) => ({
        targets: x.targets.map(({ riskDist, ...t }) => ({
          ...t,
          riskDist: riskDist === undefined ? undefined : +riskDist.toFixed(12),
        })),
        skipped: x.skipped,
      });
      assert.deepEqual(strip(b), strip(a), `case ${c}: lane order changed the plan`);
    }
  });
});

// ── statistics against a direct sum ──────────────────────────────────────────────────────────────────────────────
const SYMS = ["A-USDT", "B-USDT", "C-USDT"];
const CFGS = [...ENGINE_CFG, ...SIGNAL_CFG];
function tradesOf(r: R, n: number, t0 = Date.UTC(2026, 8, 20)): StatTrade[] {
  return Array.from({ length: n }, () => {
    const entryT = t0 + Math.floor(r() * 72 * 60) * 60_000;
    const rr = r() < 0.08 ? 0 : (r() - 0.45) * 0.06;
    return {
      cfg: pick(r, CFGS),
      sym: pick(r, SYMS),
      side: pick(r, [1, -1]),
      entryT,
      exitT: entryT + int(r, 1, 600) * 60_000,
      entry: 100,
      r: rr,
      reason: pick(r, ["tp", "sl", "trail", "time"]),
      ...(r() < 0.5 ? { mult: pick(r, [1, 2, 3]), level: int(r, 0, 4) } : {}),
    };
  });
}
/** the direct sums the statistics must agree with (percent of one unit, as statsOf reports) */
function direct(xs: readonly StatTrade[]) {
  let gp = 0;
  let gl = 0;
  let wins = 0;
  for (const x of xs) {
    if (x.r > 0) {
      gp += x.r;
      wins++;
    } else gl -= x.r;
  }
  const pf = gl > 0 ? gp / gl : gp > 0 ? PF_NO_LOSS : 0;
  return {
    n: xs.length,
    wins,
    losses: xs.length - wins,
    gp: gp * 100,
    gl: gl * 100,
    net: (gp - gl) * 100,
    pf,
  };
}
const sumOf = <T>(xs: readonly T[], f: (x: T) => number) => xs.reduce((a, x) => a + f(x), 0);

describe("statistics agree with a direct sum (metrics/stats.ts, statistics.ts)", () => {
  it(`statsOf: n, wins, gross profit / loss, net and PF of any trade list, in any order (${CASES} cases)`, () => {
    const r = rng(301);
    for (let c = 0; c < CASES; c++) {
      const xs = tradesOf(r, int(r, 0, 60));
      const d = direct(xs);
      const byExit = [...xs].sort((a, b) => a.exitT - b.exitT);
      const s = statsOf(byExit);
      const at = `case ${c} (${xs.length} trades)`;
      assert.equal(s.n, d.n, at);
      assert.equal(s.wins, d.wins, at);
      assert.equal(s.losses, d.losses, at);
      assert.ok(close(s.gp, d.gp) && close(s.gl, d.gl) && close(s.net, d.net), at);
      assert.ok(close(s.pf, d.pf), `${at}: PF ${s.pf} vs ${d.pf}`);
      assert.ok(close(s.pf, profitFactor(s.gp, s.gl)), `${at}: PF from the published gp / gl`);
      if (xs.length) assert.ok(close(s.wr, d.wins / d.n), at);
      // the order of the list changes the curve, never these totals
      const sh = statsOf([...xs].sort(() => r() - 0.5));
      assert.ok(
        sh.n === s.n && sh.wins === s.wins && close(sh.net, s.net) && close(sh.pf, s.pf),
        at,
      );
    }
  });

  it("profitFactor: no loss is PF_NO_LOSS with a profit, 0 without; scale-free", () => {
    assert.equal(profitFactor(0, 0), 0);
    assert.equal(profitFactor(1, 0), PF_NO_LOSS);
    assert.equal(profitFactor(0, 1), 0);
    const r = rng(302);
    for (let c = 0; c < CASES; c++) {
      const gp = r() * 10;
      const gl = r() * 10 + 1e-6;
      assert.ok(close(profitFactor(gp, gl), profitFactor(gp * 100, gl * 100)));
    }
  });

  it(`rowOf / groupBy / positionResults: every partition adds up to the whole (${CASES} cases)`, () => {
    const r = rng(303);
    for (let c = 0; c < CASES; c++) {
      const xs = tradesOf(r, int(r, 0, 60));
      const unit = (x: StatTrade) => 10 * (x.side > 0 ? 1 : 1.5);
      const d = direct(xs);
      const row = rowOf("All", xs, unit);
      const at = `case ${c}`;
      assert.equal(row.n, d.n, at);
      assert.equal(row.wins, d.wins, at);
      assert.ok(close(row.net, d.net) && close(row.pf, d.pf), at);
      const usd = sumOf(xs, (x) => x.r * unit(x));
      assert.ok(close(row.usd, usd), at);
      for (const key of [
        (x: StatTrade) => x.sym,
        (x: StatTrade) => (x.side > 0 ? "L" : "S"),
        (x: StatTrade) => x.cfg,
      ]) {
        const rows = groupBy(xs, key, unit);
        assert.equal(
          sumOf(rows, (x) => x.n),
          d.n,
          at,
        );
        assert.equal(
          sumOf(rows, (x) => x.wins),
          d.wins,
          at,
        );
        assert.ok(
          close(
            sumOf(rows, (x) => x.net),
            d.net,
            1e-8,
          ),
          at,
        );
        assert.ok(
          close(
            sumOf(rows, (x) => x.usd),
            usd,
            1e-8,
          ),
          at,
        );
        for (const g of rows)
          assert.ok(close(g.pf, direct(xs.filter((x) => key(x) === g.key)).pf), `${at}: ${g.key}`);
      }
      // positions (overlapping orders of one symbol × side) hold every order's result
      assert.ok(
        close(
          sumOf(positionResults(xs, unit), (p) => p.pnl),
          usd,
          1e-8,
        ),
        at,
      );
    }
  });

  it(`buildStatistics: the total and every breakdown agree with the window's trades (${CASES / 5} cases)`, () => {
    const r = rng(304);
    for (let c = 0; c < CASES / 5; c++) {
      const xs = tradesOf(r, int(r, 0, 80));
      const startT = Date.UTC(2026, 8, 20) + int(r, 0, 24) * H;
      const endT = startT + int(r, 6, 72) * H;
      const unit = () => 10;
      const rep = buildStatistics({
        source: "test",
        trades: xs,
        startT,
        endT,
        balance: 1000,
        unit,
        price: () => 100,
        cost: 0.002,
        leverage: 10,
        minActiveLevel: 2,
      });
      const inWin = xs.filter((x) => x.exitT > startT && x.exitT <= endT);
      const d = direct(inWin);
      const at = `case ${c}`;
      assert.equal(rep.total.n, d.n, at);
      assert.equal(rep.total.wins, d.wins, at);
      assert.ok(close(rep.total.net, d.net, 1e-8) && close(rep.total.pf, d.pf), at);
      const usd = sumOf(inWin, (x) => x.r * 10);
      assert.ok(close(rep.total.usd, usd, 1e-8), at);
      for (const [name, rows] of Object.entries({
        sides: rep.sides,
        symbols: rep.symbols,
        bots: rep.bots,
        reasons: rep.reasons,
        hourOfDay: rep.hourOfDay,
        daily: rep.daily,
        types: rep.types,
        ranges: rep.ranges,
        lanes: rep.lanes,
      })) {
        assert.equal(
          sumOf(rows, (x) => x.n),
          d.n,
          `${at}: ${name} n`,
        );
        assert.ok(
          close(
            sumOf(rows, (x) => x.net),
            d.net,
            1e-8,
          ),
          `${at}: ${name} net`,
        );
        assert.ok(
          close(
            sumOf(rows, (x) => x.usd),
            usd,
            1e-8,
          ),
          `${at}: ${name} usd`,
        );
      }
      assert.equal(
        sumOf(rep.heat, (x) => x.n),
        d.n,
        `${at}: heat`,
      );
      assert.equal(rep.configCount, new Set(inWin.map((x) => x.cfg)).size, at);
    }
  });
});

// ── long and short run independently (sim/backtest.ts) ───────────────────────────────────────────────────────────
function barsOf(r: R, n: number) {
  let px = 100;
  const cs: Candle[] = [];
  for (let i = 0; i < n; i++) {
    const o = px;
    px = Math.max(1, px * (1 + (r() - 0.5) * 0.02));
    const hi = Math.max(o, px) * (1 + r() * 0.006);
    const lo = Math.min(o, px) * (1 - r() * 0.006);
    cs.push({ t: Date.UTC(2026, 8, 1) + i * 900_000, o, h: hi, l: lo, c: px, v: 1 });
  }
  return barsFromCandles("X-USDT", 15, cs);
}
function signalOf(r: R, n: number, sides: readonly number[]): Int8Array {
  const s = new Int8Array(n);
  const p = r() * 0.3;
  for (let i = 0; i < n; i++) if (r() < p) s[i] = pick(r, sides);
  return s;
}
const protectOf = (r: R): Protect => ({
  tp: pick(r, [0.005, 0.01, 0.02]),
  sl: pick(r, [0.005, 0.01, 0.02]),
  trail: pick(r, [0, 0, 0.005]),
  hold: int(r, 2, 20),
});
const exitOrder = (a: Trade, b: Trade) =>
  a.exitT - b.exitT || a.entryT - b.entryT || b.side - a.side;
const tradeKey = (x: Trade) => JSON.stringify(x);

describe("long and short run independently (bothSides / splitSides / mergeSideTrades)", () => {
  it(`a one-sided signal runs once, on the signal itself: the plain single-side result (${CASES} cases)`, () => {
    const r = rng(401);
    for (let c = 0; c < CASES; c++) {
      const n = int(r, 5, 120);
      const bars = barsOf(r, n);
      const sig = signalOf(r, n, pick(r, [[1], [-1], [2, 1], [-1, -3]]));
      const p = protectOf(r);
      const opt = { cost: 0.002, cooldown: int(r, 0, 3) };
      const parts = splitSides(sig);
      assert.equal(parts.length, 1, `case ${c}`);
      assert.equal(parts[0], sig, `case ${c}: the signal itself, not a copy`);
      const plain = simulate("cfg", bars, sig, p, opt);
      const rs = bothSides(sig, (s) => simulate("cfg", bars, s, p, opt));
      assert.deepEqual(rs, [plain], `case ${c}`);
      const merged = mergeSideTrades(rs.map((x) => x.trades));
      assert.deepEqual(merged, plain.trades, `case ${c}`);
      assert.notEqual(merged, plain.trades, "a copy: the caller may sort or extend it");
    }
  });

  it(`a mixed signal splits into a long-only and a short-only copy that lose no entry (${CASES} cases)`, () => {
    const r = rng(402);
    for (let c = 0; c < CASES; c++) {
      const n = int(r, 2, 200);
      const sig = signalOf(r, n, [1, -1, 2, -2]);
      sig[int(r, 0, n - 1)] = 1;
      let j = int(r, 0, n - 1);
      while (sig[j] > 0) j = (j + 1) % n;
      sig[j] = -1;
      const parts = splitSides(sig);
      assert.equal(parts.length, 2, `case ${c}`);
      const [L, S] = parts;
      assert.deepEqual(L, sideSignal(sig, 1));
      assert.deepEqual(S, sideSignal(sig, -1));
      for (let i = 0; i < n; i++) {
        assert.ok(L[i] >= 0 && S[i] <= 0, `case ${c} bar ${i}`);
        assert.equal(L[i] + S[i], sig[i], `case ${c} bar ${i}: an entry lost or changed`);
      }
    }
  });

  it(`merging: time-ordered, every trade of every side kept, each side its own run (${CASES} cases)`, () => {
    const r = rng(403);
    let both = 0;
    for (let c = 0; c < CASES; c++) {
      const n = int(r, 10, 150);
      const bars = barsOf(r, n);
      const sig = signalOf(r, n, [1, -1]);
      const p = protectOf(r);
      const opt = { cost: 0.002, cooldown: int(r, 0, 3) };
      const rs = bothSides(sig, (s) => simulate("cfg", bars, s, p, opt));
      const merged = mergeSideTrades(rs.map((x) => x.trades));
      const at = `case ${c}`;
      if (rs.length === 2) {
        both++;
        assert.deepEqual(rs[0], simulate("cfg", bars, sideSignal(sig, 1), p, opt), at);
        assert.deepEqual(rs[1], simulate("cfg", bars, sideSignal(sig, -1), p, opt), at);
        assert.ok(
          rs[0].trades.every((x) => x.side === 1) && rs[1].trades.every((x) => x.side === -1),
          at,
        );
      }
      // nothing lost, nothing added
      assert.equal(
        merged.length,
        sumOf(rs, (x) => x.trades.length),
        at,
      );
      assert.deepEqual(
        merged.map(tradeKey).sort(),
        rs
          .flatMap((x) => x.trades)
          .map(tradeKey)
          .sort(),
        at,
      );
      // in exit order (then entry, long first)
      for (let i = 1; i < merged.length; i++)
        assert.ok(exitOrder(merged[i - 1], merged[i]) <= 0, `${at}: out of order at ${i}`);
      // each side keeps one slot of its own: its trades never overlap each other
      for (const side of [1, -1]) {
        const xs = merged.filter((x) => x.side === side).sort((a, b) => a.entryT - b.entryT);
        for (let i = 1; i < xs.length; i++)
          assert.ok(xs[i].entryT >= xs[i - 1].exitT, `${at}: side ${side} overlaps`);
      }
    }
    assert.ok(both > CASES / 2, `${both} cases with both sides`);
  });

  it(`mergeSideTrades of arbitrary lists: a time-ordered permutation (${CASES} cases)`, () => {
    const r = rng(404);
    for (let c = 0; c < CASES; c++) {
      const lists = Array.from({ length: int(r, 1, 3) }, (_, li) =>
        Array.from({ length: int(r, 0, 12) }, (): Trade => {
          const entryT = int(r, 0, 50) * 60_000;
          return {
            cfg: `c${li}`,
            sym: "X",
            side: li % 2 ? -1 : 1,
            entryT,
            exitT: entryT + int(r, 0, 20) * 60_000,
            entry: 1,
            exit: 1,
            r: r() - 0.5,
            reason: "time",
            bars: 1,
            mfe: 0,
            mae: 0,
          };
        }),
      );
      const m = mergeSideTrades(lists);
      assert.equal(
        m.length,
        sumOf(lists, (l) => l.length),
      );
      assert.deepEqual(m.map(tradeKey).sort(), lists.flat().map(tradeKey).sort());
      if (lists.length > 1)
        for (let i = 1; i < m.length; i++) assert.ok(exitOrder(m[i - 1], m[i]) <= 0, `case ${c}`);
      else assert.deepEqual(m, lists[0]);
    }
  });
});
