#!/usr/bin/env node
// Scalar reference: no production tape prefix sums, gate evaluators, cursors or PF helper.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  iterateSessionValidation,
  iterateSessionTapeTrades,
} from "../../scripts/lib/session-dump.mjs";
import { parseConfigId, kindOfId } from "../../src/core/pipeline/pipeline.ts";
const H = 3600000;
// For a positive sum S, the sample-standard-deviation LCB S - sd*sqrt(n)
// is strictly positive exactly when S*S > sum(r*r). Resolve only numerical
// boundaries with integer arithmetic over the input doubles' exact binary values.
export function exactPositiveLcb(rows) {
  if (rows.length < 2) return false;
  const view = new DataView(new ArrayBuffer(8)), parts = [];
  let exponent = Infinity;
  for (const row of rows) {
    const value = row[4];
    assert.ok(Number.isFinite(value));
    if (value === 0) continue;
    view.setFloat64(0, value);
    const bits = view.getBigUint64(0), e = Number((bits >> 52n) & 2047n);
    const fraction = bits & ((1n << 52n) - 1n);
    const mantissa = (bits >> 63n ? -1n : 1n) * (e ? fraction | (1n << 52n) : fraction);
    const power = e ? e - 1075 : -1074;
    exponent = Math.min(exponent, power);
    parts.push([mantissa, power]);
  }
  let sum = 0n, squares = 0n;
  for (const [mantissa, power] of parts) {
    const value = mantissa << BigInt(power - exponent);
    sum += value; squares += value * value;
  }
  return sum > 0n && sum * sum > squares;
}
export function scalarStats(rows, nowT) {
  let gp = 0,
    gl = 0,
    sum = 0,
    mean = 0,
    m2 = 0,
    peak = 0,
    maxDd = 0,
    peakT = rows[0]?.[2] ?? nowT,
    dipped = false,
    ddt = 0;
  const hours = new Map();
  for (let i = 0; i < rows.length; i++) {
    const x = rows[i],
      r = x[4];
    assert.ok(Number.isFinite(r));
    gp += Math.max(0, r);
    gl += Math.max(0, -r);
    sum += r;
    const delta = r - mean;
    mean += delta / (i + 1);
    m2 += delta * (r - mean);
    const hour = Math.floor((x[3] - 1) / H);
    hours.set(hour, (hours.get(hour) ?? 0) + r);
    if (sum < peak) {
      dipped = true;
      maxDd = Math.max(maxDd, peak - sum);
    } else {
      if (dipped) ddt = Math.max(ddt, x[3] - peakT);
      dipped = false;
      peak = sum;
      peakT = x[3];
    }
  }
  if (dipped) ddt = Math.max(ddt, nowT - peakT);
  const uncertainty = rows.length > 1
    ? Math.sqrt(Math.max(0, m2 / (rows.length - 1))) * Math.sqrt(rows.length) : 0;
  const lcb = rows.length > 1 ? (sum - uncertainty) * 100 : 0;
  const boundary = rows.length > 1 && Math.abs(sum - uncertainty) <=
    128 * Number.EPSILON * rows.length * (Math.abs(sum) + uncertainty);
  return {
    n: rows.length,
    gp,
    gl,
    net: sum * 100,
    pf: gl > 0 ? gp / gl : gp > 0 ? 4 : 0,
    lcb,
    lcbPositive: boundary ? exactPositiveLcb(rows) : lcb > 0,
    lcbExactBoundary: boundary,
    ddt: ddt / H,
    mdd: maxDd,
    gh: hours.size ? [...hours.values()].filter((x) => x > 0).length / hours.size : 0,
  };
}
function scalarLast(rows, t, n, minPf, maxDdt, maxDdr, floor, warmup, prior) {
  if (n <= 0) return true;
  const available = rows.filter((x) => x[3] <= t),
    short = available.length < n;
  if (short && (!(floor > 0) || available.length < floor)) return false;
  const own = available.slice(-Math.min(n, available.length)),
    w = scalarStats(own, t);
  const pf = w.gl + prior > 0 ? w.gp / (w.gl + prior) : w.gp > 0 ? 4 : 0;
  if (!(Number.isFinite(pf) && pf >= minPf)) return false;
  if (!(short && warmup)) {
    if (maxDdt > 0 && w.ddt > maxDdt) return false;
    if (maxDdr !== undefined && maxDdr !== 0 && (!(w.net > 0) || w.mdd / (w.net / 100) > maxDdr))
      return false;
  }
  return true;
}
export function scalarDirectionEval(rows, t, o, protect, kind = "normal", ind = "") {
  const winH = Math.max(o.longH, o.preH),
    g = o.gates,
    tag = protect.tag;
  const key = { mc: "micro", mn: "minimal", mp: "minimal", sh: "short", gn: "general", lg: "long" }[
    tag
  ];
  const ro = o.rangeOpts?.[tag ?? "wide"],
    configured = g.rangeMinPf?.[key],
    rangeMin = typeof configured === "number" && Number.isFinite(configured)
      ? Math.min(3, Math.max(1.05, configured)) : g.minPf;
  const familyFloor = /^(micro-|inverse-|tactic-|relate-|break-rel-|break-mc-rel-)/.test(ind) ? 1.1 : 0;
  const minPf = Math.max(familyFloor, rangeMin, kind === "exit" ? (o.exitMinPf ?? 0) : 0);
  const maxDdr =
    kind === "exit" && o.exitMaxDdr > 0
      ? g.maxDdr > 0
        ? Math.min(g.maxDdr, o.exitMaxDdr)
        : o.exitMaxDdr
      : g.maxDdr;
  const window = rows.filter((x) => x[3] >= t - winH * H && x[3] < t),
    w = scalarStats(window, t),
    no = (fail) => ({ ...w, ok: false, fail });
  if (
    w.n < Math.max(3, kind === "exit" ? (o.exitMinTrades ?? g.minTrades ?? 0) : (g.minTrades ?? 0))
  )
    return no("closes");
  if (!(w.net > 0)) return no("net");
  const prior = g.lossPrior ? Math.max(0, protect.sl) : 0;
  if (!(w.pf >= minPf && (prior <= 0 || w.gp / (w.gl + prior) >= minPf))) return no("pf");
  const pre = scalarStats(
    rows.filter((x) => x[3] >= t - o.preH * H && x[3] < t),
    t,
  );
  if (o.preGate && pre.n >= 3 && (!(pre.pf >= minPf) || pre.net < 0)) return no("pre");
  if (!w.lcbPositive) return no("lcb");
  if (
    !scalarLast(
      rows,
      t,
      kind === "exit"
        ? (o.exitMinTrades ?? ro?.validLastN ?? o.validLastN ?? 0)
        : (ro?.validLastN ?? o.validLastN ?? 0),
      minPf,
      g.maxDdtH,
      maxDdr,
      g.lastNFloor ?? 0,
      g.warmup !== false,
      prior,
    )
  )
    return no("lastN");
  const r = o.rangeGate;
  if (
    r &&
    (r.ranges ?? ["mc", "mn", "sh", "mp"]).includes(tag) &&
    !scalarLast(
      rows,
      t,
      r.lastN,
      r.minPf,
      0,
      0,
      r.floor ?? g.lastNFloor ?? 0,
      g.warmup !== false,
      prior,
    )
  )
    return no("rangeGate");
  if (w.ddt > Math.max(g.minDdtH ?? 0, (g.maxDdtH * winH) / 72)) return no("ddt");
  if (maxDdr > 0 && (!(w.net > 0) || w.mdd / (w.net / 100) > maxDdr)) return no("ddr");
  if (w.gh < Math.max(g.minGreen ?? 0.5, kind === "exit" ? (o.exitMinGreenHourShare ?? 0) : 0))
    return no("green");
  if ((ro?.stableBlocks ?? g.stableBlocks) >= 2) {
    let active = 0;
    const blocks = ro?.stableBlocks ?? g.stableBlocks;
    for (let k = 0; k < blocks; k++) {
      const from = t - winH * H + (k * winH * H) / blocks;
      const x = scalarStats(
        rows.filter((row) => row[3] >= from && row[3] < from + (winH * H) / blocks),
        t,
      );
      if (x.n < 2) continue;
      active++;
      if (!(x.net > 0) || x.pf < minPf) return no("stable");
    }
    if (active < 2 && g.warmup === false) return no("stable");
  }
  return { ...w, ok: true };
}

/** Selection records only independently qualified directions. A rejected container records a zero summary;
 * its actual losing/insufficient evidence remains in directions, never erased from arithmetic diagnostics. */
export function scalarEval(rows, t, o, protect, kind = "normal", ind = "") {
  const directions = [1, -1].map((side) => ({
    side,
    ...scalarDirectionEval(
      rows.filter((x) => x[1] === side),
      t,
      o,
      protect,
      kind,
      ind,
    ),
  }));
  const passing = directions.filter((x) => x.ok);
  const gp = passing.reduce((n, x) => n + x.gp, 0),
    gl = passing.reduce((n, x) => n + x.gl, 0);
  return {
    ok: passing.length > 0,
    ...(passing.length
      ? {}
      : { fail: directions[0].n >= directions[1].n ? directions[0].fail : directions[1].fail }),
    n: passing.reduce((n, x) => n + x.n, 0),
    gp,
    gl,
    pf: gl > 0 ? gp / gl : gp > 0 ? 4 : 0,
    net: passing.reduce((n, x) => n + x.net, 0),
    qualifiedSides: passing.map((x) => x.side),
    directions,
  };
}

/** Raw window conservation has a fixed sample scope. Qualified-side membership can change each hour. */
export function scalarWindow(rows, t, hours) {
  return scalarStats(
    rows.filter((x) => x[3] >= t - hours * H && x[3] < t),
    t,
  );
}
export async function hourlyAudit(dir, out, requireAll = false) {
  const p = JSON.parse(readFileSync(`${dir}/protocol.json`)),
    wf = p.actualWf;
  assert.equal(wf.longH, 12);
  assert.equal(wf.preH, 12);
  assert.ok((wf.gates.minDdtH ?? 0) >= 12);
  const steps = [];
  for await (const s of iterateSessionValidation(`${dir}/raw.json`))
    steps.push({
      t: s.t,
      checks: new Map(s.checks.map((x) => [x[0], x])),
      real: new Set(s.real),
      verified: 0,
      passed: 0,
      firstFailures: {},
      dropped: 0,
      gained: 0,
      unchangedPass: 0,
      directionChanges: 0,
      droppedDirectionFailures: {},
      transitionCauses: {},
      unexplainedTransitions: 0,
      entered: { n: 0, gp: 0, gl: 0 },
      expired: { n: 0, gp: 0, gl: 0 },
      passedGp: 0,
      passedGl: 0,
      examples: [],
    });
  assert.equal(steps.length, 12);
  const violations = [],
    seen = new Set();
  let tapes = 0,
    decisions = 0;
  const mismatch = (x) => {
    if (violations.length < 60) violations.push(x);
  };
  for await (const row of iterateSessionTapeTrades(`${dir}/raw.json`)) {
    const cfg = parseConfigId(row.id);
    assert.ok(cfg);
    assert.ok(
      /^(?:inverse-)?micro-/.test(cfg.ind),
      "This frozen scalar reference is restricted to Micro/mirror sources",
    );
    const rows = row.trades,
      kind = kindOfId(row.id);
    let previous;
    for (let i = 0; i < steps.length; i++) {
      const s = steps[i],
        expected = s.checks.get(row.id);
      if (!expected) continue;
      const e = scalarEval(rows, s.t, wf, cfg.protect, kind, cfg.ind),
        rawWindow = scalarWindow(rows, s.t, Math.max(wf.longH, wf.preH));
      s.verified++;
      decisions++;
      if (e.ok) s.passed++;
      else s.firstFailures[e.fail] = (s.firstFailures[e.fail] ?? 0) + 1;
      const near = (a, b) => Math.abs(a - b) <= 1e-8 * Math.max(1, Math.abs(a), Math.abs(b));
      if (
        e.ok !== !!expected[1] ||
        e.n !== expected[2] ||
        !near(e.pf, expected[3]) ||
        !near(e.gp, expected[4]) ||
        !near(e.gl, expected[5])
      )
        mismatch({ id: row.id, t: s.t, expected, scalar: e });
      if (e.ok) {
        s.passedGp += e.gp;
        s.passedGl += e.gl;
      }
      if (previous) {
        const prevT = steps[i - 1].t,
          from = s.t - 12 * H,
          prevFrom = prevT - 12 * H;
        const entered = scalarStats(
            rows.filter((x) => x[3] >= prevT && x[3] < s.t),
            s.t,
          ),
          expired = scalarStats(
            rows.filter((x) => x[3] >= prevFrom && x[3] < from),
            s.t,
          );
        for (const [a, b] of [
          [s.entered, entered],
          [s.expired, expired],
        ])
          for (const k of ["n", "gp", "gl"]) a[k] += b[k];
        if (!near(rawWindow.net - previous.rawWindow.net, entered.net - expired.net))
          mismatch({
            id: row.id,
            t: s.t,
            error: "Hourly net does not equal incoming minus expired closes",
          });
        for (const side of [1, -1]) {
          const own = rows.filter((x) => x[1] === side);
          const before = scalarWindow(own, prevT, 12),
            after = scalarWindow(own, s.t, 12);
          const incoming = scalarStats(
            own.filter((x) => x[3] >= prevT && x[3] < s.t),
            s.t,
          );
          const outgoing = scalarStats(
            own.filter((x) => x[3] >= prevFrom && x[3] < from),
            s.t,
          );
          if (!near(after.net - before.net, incoming.net - outgoing.net))
            mismatch({ id: row.id, t: s.t, side, error: "Own-side hourly conservation failed" });
        }
        if (e.qualifiedSides.join() !== previous.e.qualifiedSides.join()) s.directionChanges++;
        if (previous.e.ok && !e.ok) {
          s.dropped++;
          const failures = e.directions
            .filter((x) => previous.e.qualifiedSides.includes(x.side))
            .map((x) => x.fail);
          for (const fail of failures)
            s.droppedDirectionFailures[fail] = (s.droppedDirectionFailures[fail] ?? 0) + 1;
          const boundary = rows.some((x) => x[3] === s.t);
          const cause =
            entered.n || expired.n
              ? "window-closes"
              : boundary
                ? "last-N-boundary-closes"
                : failures.every((x) => x === "ddt" || x === "stable")
                  ? "clock-dependent-gate"
                  : "unexplained";
          s.transitionCauses[cause] = (s.transitionCauses[cause] ?? 0) + 1;
          if (s.examples.length < 8)
            s.examples.push({ id: row.id, before: previous.e, after: e, entered, expired });
          if (cause === "unexplained") {
            s.unexplainedTransitions++;
            mismatch({
              id: row.id,
              t: s.t,
              error: "Unexplained qualification loss",
              before: previous.e,
              after: e,
            });
          }
        } else if (!previous.e.ok && e.ok) s.gained++;
        else if (e.ok) s.unchangedPass++;
      }
      previous = { e, rawWindow };
    }
    seen.add(row.id);
    tapes++;
    if (tapes % 10000 === 0)
      console.log(JSON.stringify({ tapes, decisions, violations: violations.length }));
  }
  for (const s of steps) {
    if (requireAll && s.verified !== s.checks.size)
      mismatch({
        t: s.t,
        expected: s.checks.size,
        verified: s.verified,
        error: "Complete history required, including never-passing configs",
      });
    for (const [id, check] of s.checks)
      if (check[1] && !seen.has(id)) mismatch({ id, t: s.t, error: "Missing passing config tape" });
    s.unverifiedNeverPassed = [...s.checks.keys()].filter((id) => !seen.has(id)).length;
    const recordedPassed = [...s.checks.values()].filter((x) => x[1]).length;
    if (s.passed !== recordedPassed)
      mismatch({
        t: s.t,
        actual: s.passed,
        expected: recordedPassed,
        error: "Scalar coverage must include EVERY passing config, including newly eligible ones",
      });
  }
  const result = {
    schema: "cts-scalar-hourly-progress-v2",
    requireAll,
    sourceSha256: p.source.sha256,
    window: p.window,
    tapes,
    decisions,
    violations,
    complete: violations.length === 0 && steps.every((s) => s.verified === s.checks.size),
    basis:
      "Independent scalar arithmetic directly from saved own net-return rows; does not call makeTape, configEval, production prefix sums, forward cursors or profitFactor. Long and short qualify separately; recorded selection summaries contain only passing directions, or zero if neither passes. Raw pooled and own-side windows independently conserve incoming minus expired closes regardless of changing qualifications. Missing histories remain explicitly unverified; EVERY passing config is required. Historical overlapping validation samples are not future execution profits.",
    steps: steps.map(({ checks, real, ...s }) => ({
      ...s,
      expectedChecks: checks.size,
      recordedPassed: [...checks.values()].filter((x) => x[1]).length,
      seated: real.size,
      passedPf: s.passedGl ? s.passedGp / s.passedGl : null,
    })),
  };
  mkdirSync(resolve(out, ".."), { recursive: true });
  writeFileSync(out, JSON.stringify(result, null, 2) + "\n");
  console.log(
    JSON.stringify({
      tapes,
      decisions,
      violations: violations.length,
      steps: result.steps.map((s) => ({
        t: s.t,
        passed: s.passed,
        dropped: s.dropped,
        gained: s.gained,
        firstFailures: s.firstFailures,
        unexplained: s.unexplainedTransitions,
      })),
    }),
  );
  assert.equal(violations.length, 0, "Independent hourly arithmetic / verdict mismatch");
  return result;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  await hourlyAudit(
    resolve(process.argv[2]),
    resolve(process.argv[3]),
    process.argv.includes("--require-all"),
  );
