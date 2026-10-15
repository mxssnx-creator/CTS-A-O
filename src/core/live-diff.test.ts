// Live vs system: exchange orders matched one to one with the paper book's, gaps and one-sided orders counted.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { liveDiff, liveDiffMd } from "./live-diff.ts";

const H = 3_600_000;
const T = 1000 * H;
const cfg = "b|ema|tp2|sl2|tr0|h64|sh";
const sig = "b|sig-swing-x@m15|tr0";

describe("live vs system diff", () => {
  const paper = [
    { cfg, sym: "A", side: 1, entryT: T, exitT: T + 10 * 60_000, r: 0.02 },
    { cfg, sym: "B", side: 1, entryT: T, exitT: T + 20 * 60_000, r: -0.01 },
    { cfg: sig, sym: "A", side: 1, entryT: T, exitT: T + H + 60_000, r: 0.01 },
    // never held on the exchange
    { cfg, sym: "C", side: 1, entryT: T, exitT: T + 30 * 60_000, r: 0.015 },
  ];
  const live = [
    { id: `${cfg}|A|1|${T}`, cfg, sym: "A", exitT: T + 10 * 60_000, r: 0.018, reason: "exit" },
    // the exchange stop took it before the paper book's exit: worse
    { id: `${cfg}|B|1|${T}`, cfg, sym: "B", exitT: T + 15 * 60_000, r: -0.012, reason: "stop" },
    { id: `${sig}|A|1|${T}`, cfg: sig, sym: "A", exitT: T + H + 60_000, r: 0.0095, reason: "exit" },
    // closed on the exchange, still open in the paper book
    { id: `${cfg}|D|1|${T}`, cfg, sym: "D", exitT: T + 40 * 60_000, r: -0.005, reason: "stop" },
  ];
  const d = liveDiff(paper, live);

  it("matches orders by identity and measures the gap", () => {
    assert.equal(d.basis, "normalized-return");
    assert.equal(d.cashPfAvailable, false);
    assert.equal(d.total.matched, 3);
    assert.equal(d.total.systemOnly, 1);
    assert.equal(d.total.exchangeOnly, 1);
    assert.equal(d.total.system.n, 4);
    assert.equal(d.total.exchange.n, 4);
    // gaps: −0.2, −0.2, −0.05 trade %
    assert.ok(Math.abs(d.total.meanGap - -0.15) < 1e-9);
    assert.equal(d.worst[0].id, `${cfg}|A|1|${T}`);
  });

  it("splits by range (signals apart) and by exit hour", () => {
    assert.deepEqual(d.byRange.map((r) => r.key), ["Short", "Signals"]);
    assert.equal(d.byHour.length, 2);
    assert.equal(d.byHour[1].system.n, 1);
    assert.ok(liveDiffMd(d).includes("### Live vs system"));
    assert.match(liveDiffMd(d), /not account cash PF or execution-profitability proof/);
    assert.match(liveDiffMd(d), /attributed return PF/);
  });

  it("a window start drops the older closes on both sides", () => {
    const later = liveDiff(paper, live, T + H);
    assert.equal(later.total.system.n, 1);
    assert.equal(later.total.exchange.n, 1);
    assert.equal(later.total.matched, 1);
  });

  it("retains every attributed close of a paper identity instead of hiding an earlier loss", () => {
    const id = `${cfg}|A|1|${T}`;
    const repeated = liveDiff([paper[0]], [
      { id, cfg, sym: "A", exitT: T + 60_000, r: -0.02, reason: "exit" },
      { id, cfg, sym: "A", exitT: T + 120_000, r: 0.01, reason: "exit" },
    ]);
    assert.equal(repeated.total.exchange.n, 2);
    assert.equal(repeated.total.exchange.pf, 0.5);
    assert.equal(repeated.total.exchange.net, -1);
    assert.equal(repeated.total.matched, 1);
    assert.equal(repeated.total.meanGap, -3);
  });

  it("distinguishes the no-loss score from a measured return PF of four in JSON and Markdown", () => {
    const measured = liveDiff([
      { ...paper[0], r: 0.04 },
      { ...paper[1], r: -0.01 },
    ], [live[0]]);
    assert.equal(measured.total.system.pf, 4);
    assert.equal(measured.total.system.returnGp, 4);
    assert.equal(measured.total.system.returnGl, 1);
    assert.equal(measured.total.system.noLoss, false);
    assert.equal(measured.total.system.pfConvention, "gross-return-ratio");
    assert.equal(measured.total.exchange.pf, 4);
    assert.ok(Math.abs(measured.total.exchange.returnGp - 1.8) < 1e-12);
    assert.equal(measured.total.exchange.returnGl, 0);
    assert.equal(measured.total.exchange.noLoss, true);
    assert.equal(measured.total.exchange.pfConvention, "no-loss-sentinel");
    const total = liveDiffMd(measured).split("\n").find((line) => line.startsWith("| total |"));
    assert.match(total!, /\| 2 \| 4\.00 \| 3\.0 \| 1 \| No losses \|/);
    assert.match(liveDiffMd(measured), /not a measured finite PF ratio/);
  });

  it("renders missing samples as unavailable while preserving a measured all-loss PF of zero", () => {
    const empty = liveDiff([], []);
    assert.equal(empty.total.system.n, 0);
    assert.equal(empty.total.system.noLoss, false);
    assert.equal(empty.total.system.returnGp, 0);
    assert.equal(empty.total.system.returnGl, 0);
    assert.match(liveDiffMd(empty), /\| total \| 0 \| – \| 0\.0 \| 0 \| – \|/);
    const lost = liveDiff([{ ...paper[0], r: -0.01 }], []);
    assert.equal(lost.total.system.pf, 0);
    assert.equal(lost.total.system.noLoss, false);
    assert.match(liveDiffMd(lost), /\| total \| 1 \| 0\.00 \| -1\.0 \|/);
  });
});
