// Independent settled-cohort reference: no production PF, prefix sums or hour-bucket helper.
import assert from "node:assert/strict";
const H = 3_600_000;
export function auditSettledHours(orders, startT, endT, reported) {
  assert.ok(Number.isFinite(startT) && Number.isFinite(endT) && startT % H === 0 && endT % H === 0 && endT > startT);
  const bins = new Map(Array.from({ length: (endT - startT) / H }, (_, i) => [startT + i * H, []]));
  const ids = new Set();
  for (const x of orders) {
    assert.ok(!x.markedOpen, "endpoint marks cannot enter settled hourly PF");
    assert.ok(Number.isFinite(x.entryT) && x.entryT >= startT && x.entryT < endT);
    assert.ok(Number.isFinite(x.exitT) && x.exitT >= x.entryT && x.exitT > startT && x.exitT <= endT,
      "future settlements cannot enter this execution window");
    const id = JSON.stringify([x.cfg, x.sym, x.side, x.entryT, x.exitT]);
    assert.ok(!ids.has(id), "duplicate settled execution"); ids.add(id);
    const r = x.unitR !== undefined ? x.unitR :
      typeof x.mult === "number" && Number.isFinite(x.mult) && x.mult > 0 ? x.r / x.mult : NaN;
    assert.ok(typeof r === "number" && Number.isFinite(r), "unknown executed unit-return evidence");
    bins.get(Math.floor((x.exitT - 1) / H) * H).push(r);
  }
  const stats = (rows) => {
    const gp = rows.reduce((n, r) => n + Math.max(0, r), 0);
    const gl = rows.reduce((n, r) => n + Math.max(0, -r), 0);
    assert.ok(Number.isFinite(gp) && Number.isFinite(gl) && Number.isFinite((gp - gl) * 100));
    const pf = rows.length ? gl > 0 ? gp / gl : gp > 0 ? 4 : 0 : null;
    assert.ok(pf === null || Number.isFinite(pf));
    return { n: rows.length, gp: gp * 100, gl: gl * 100, net: (gp - gl) * 100, pf,
      pfConvention: gl === 0 && gp > 0 ? "no-loss-score" : rows.length ? "ratio" : "unavailable" };
  };
  const cumulative = [], all = [], hourly = [];
  for (const [t, rows] of bins) {
    hourly.push({ t, ...stats(rows) }); all.push(...rows);
    cumulative.push({ throughT: t + H, ...stats(all) });
  }
  if (reported) {
    const observed = new Map();
    for (const row of reported) {
      assert.ok(bins.has(row.t) && !observed.has(row.t), "shifted, duplicate or out-of-window reporting hour");
      observed.set(row.t, row);
    }
    for (const expected of hourly) {
      const row = observed.get(expected.t);
      assert.equal(row?.n ?? 0, expected.n, "hourly settled cohort count");
      if (!expected.n && !row) continue;
      for (const k of ["pf", "net"])
        assert.ok(Math.abs(row[k] - (expected[k] ?? 0)) <= 1e-8 * Math.max(1, Math.abs(expected[k] ?? 0)), `hourly ${k} differs on the same cohort`);
    }
  }
  const active = hourly.filter((x) => x.n), ends = cumulative.filter((x) => x.n);
  return { basis: "modeled-settled-unit-net-returns", closedWindow: "(startT,endT]", summary: stats(all), hourly, cumulative,
    positiveHours: active.filter((x) => x.net > 0).length, flatHours: active.filter((x) => x.net === 0).length,
    negativeHours: active.filter((x) => x.net < 0).length, emptyHours: hourly.length - active.length,
    allActiveHoursPfAbove1: active.length ? active.every((x) => x.pf > 1) : null,
    pfAbove1AtEveryActiveHourEnd: ends.length ? ends.every((x) => x.pf > 1) : null };
}
