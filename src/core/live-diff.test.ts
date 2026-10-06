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
    { cfg, sym: "A", entryT: T, exitT: T + 10 * 60_000, r: 0.02 },
    { cfg, sym: "B", entryT: T, exitT: T + 20 * 60_000, r: -0.01 },
    { cfg: sig, sym: "A", entryT: T, exitT: T + H + 60_000, r: 0.01 },
    // never held on the exchange
    { cfg, sym: "C", entryT: T, exitT: T + 30 * 60_000, r: 0.015 },
  ];
  const live = [
    { id: `${cfg}|A|${T}`, cfg, sym: "A", exitT: T + 10 * 60_000, r: 0.018, reason: "exit" },
    // the exchange stop took it before the paper book's exit: worse
    { id: `${cfg}|B|${T}`, cfg, sym: "B", exitT: T + 15 * 60_000, r: -0.012, reason: "stop" },
    { id: `${sig}|A|${T}`, cfg: sig, sym: "A", exitT: T + H + 60_000, r: 0.0095, reason: "exit" },
    // closed on the exchange, still open in the paper book
    { id: `${cfg}|D|${T}`, cfg, sym: "D", exitT: T + 40 * 60_000, r: -0.005, reason: "stop" },
  ];
  const d = liveDiff(paper, live);

  it("matches orders by identity and measures the gap", () => {
    assert.equal(d.total.matched, 3);
    assert.equal(d.total.systemOnly, 1);
    assert.equal(d.total.exchangeOnly, 1);
    assert.equal(d.total.system.n, 4);
    assert.equal(d.total.exchange.n, 4);
    // gaps: −0.2, −0.2, −0.05 trade %
    assert.ok(Math.abs(d.total.meanGap - -0.15) < 1e-9);
    assert.equal(d.worst[0].id, `${cfg}|A|${T}`);
  });

  it("splits by range (signals apart) and by exit hour", () => {
    assert.deepEqual(d.byRange.map((r) => r.key), ["Short", "Signals"]);
    assert.equal(d.byHour.length, 2);
    assert.equal(d.byHour[1].system.n, 1);
    assert.ok(liveDiffMd(d).includes("### Live vs system"));
  });

  it("a window start drops the older closes on both sides", () => {
    const later = liveDiff(paper, live, T + H);
    assert.equal(later.total.system.n, 1);
    assert.equal(later.total.exchange.n, 1);
    assert.equal(later.total.matched, 1);
  });
});
