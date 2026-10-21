import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { selectionAt, main, RANK_CASES } from "./micro-rank-comparison.mjs";

const M = 60_000,
  H = 60 * M,
  CUT = Date.UTC(2026, 9, 19, 12);
function fixture() {
  const candles = {};
  for (const sym of ["A-USDT", "B-USDT"])
    candles[`${sym}|1`] = Array.from({ length: 48 * 60 }, (_, i) => {
      const c = sym === "A-USDT" ? 100 : 100 * Math.pow(1.001, i % 60);
      return {
        t: CUT - 36 * H + i * M,
        o: c,
        h: sym === "A-USDT" ? 120 : c * 1.0001,
        l: sym === "A-USDT" ? 80 : c * 0.9999,
        c,
        v: 1000,
      };
    });
  return {
    tickers: [
      { sym: "A-USDT", last: 1e9, quoteVol: 1 },
      { sym: "B-USDT", last: 1, quoteVol: 1e30 },
    ],
    candles,
  };
}
test("the actual production selectors distinguish intrahour ranges and 5m price distances", async () => {
  const source = fixture();
  const a = await selectionAt(source, CUT, "volatility1h", 1),
    b = await selectionAt(source, CUT, "change1h5m", 1);
  assert.deepEqual(a.selected, ["A-USDT"]);
  assert.deepEqual(b.selected, ["B-USDT"]);
  assert.ok(Math.abs(a.metrics.find((x) => x.sym === "A-USDT").volatility1h - 0.4) < 1e-12);
  assert.equal(b.metrics.find((x) => x.sym === "A-USDT").change1h5m, 0);
  assert.ok(a.calls.every((c) => c.tf === 60 && c.n === 4 && c.latestCloseT === CUT));
  assert.ok(b.calls.every((c) => c.tf === 5 && c.n === 13 && c.latestCloseT === CUT));
  assert.equal(
    a.tickers[0].quoteVol,
    144_000_000,
    "1440 native minutes * 100 price * 1000 base volume; no future ticker",
  );
});
test("future candles and endpoint ticker changes cannot alter either historical selection", async () => {
  const before = fixture(),
    after = structuredClone(before);
  after.tickers.reverse();
  for (const t of after.tickers) {
    t.last = 1e20;
    t.quoteVol = 1e30;
    t.changePct = 9999;
  }
  for (const rows of Object.values(after.candles))
    for (const c of rows)
      if (c.t >= CUT) {
        c.c *= 1000;
        c.h *= 1e6;
        c.v *= 1e20;
      }
  for (const rank of RANK_CASES) {
    const a = await selectionAt(before, CUT, rank, 1),
      b = await selectionAt(after, CUT, rank, 1);
    assert.deepEqual(b.selected, a.selected);
    assert.deepEqual(b.metrics, a.metrics);
    assert.deepEqual(b.tickers, a.tickers);
  }
});
test("gapped or duplicate native history cannot silently substitute a 24h change", async () => {
  for (const mutate of [
    (rows) => rows.splice(1440, 1),
    (rows) => rows.splice(1440, 0, { ...rows[1440] }),
  ]) {
    const source = fixture();
    mutate(source.candles["A-USDT|1"]);
    await assert.rejects(selectionAt(source, CUT, "volatility1h", 1), /causal 24h/);
    await assert.rejects(selectionAt(source, CUT, "change1h5m", 1), /causal 24h/);
  }
});
test(
  "real paired prepare seals twelve symbols and identical economics before scoring, and rejects rewrites/tampering",
  { timeout: 120000 },
  async () => {
    const out = fs.mkdtempSync(path.join(os.tmpdir(), "cts-micro-rank-"));
    try {
      await main(["prepare", "--out", out]);
      const plan = JSON.parse(fs.readFileSync(`${out}/plan.json`));
      assert.equal(plan.selectedCount, 12);
      assert.equal(plan.candidateCount, 24);
      assert.equal(plan.identicalEconomicSettings, true);
      assert.equal(plan.selectionBeforeScoring, true);
      for (const rank of RANK_CASES) {
        const p = JSON.parse(fs.readFileSync(`${out}/${rank}/protocol.json`));
        assert.equal(p.symbols.length, 12);
        assert.equal(p.actualSettings.symbols, 12);
        assert.equal(p.actualSettings.symbolRank, rank);
        assert.equal(p.actualSettings.cost, 0.0015);
        assert.equal(p.window.preH, 12);
        assert.equal(p.window.runH, 12);
        assert.equal(p.symbolSelection.cutT, p.window.tradeStartT);
        assert.equal(p.scope.focus.length, 980);
        assert.deepEqual(p.actualSettings.forceSymbols, p.symbols);
        assert.equal(
          fs.existsSync(`${out}/${rank}/raw.json`),
          false,
          "preparation never scores a trade",
        );
      }
      await assert.rejects(main(["prepare", "--out", out]), /overwrite/);
      const file = `${out}/volatility1h/protocol.json`,
        p = JSON.parse(fs.readFileSync(file));
      p.actualSettings.cost = 0.002;
      fs.writeFileSync(file, JSON.stringify(p));
      await assert.rejects(main(["run", "--rank", "change1h5m", "--out", out]), /Expected values/);
      assert.equal(
        fs.existsSync(`${out}/change1h5m/raw.json`),
        false,
        "tampering fails before either case can score",
      );
    } finally {
      fs.rmSync(out, { recursive: true, force: true });
    }
  },
);
