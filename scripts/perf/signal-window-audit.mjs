#!/usr/bin/env node
// Streaming arithmetic audit of every saved Signal config/context. This does not certify gate verdicts or profitability.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { iterateSessionTapeTrades } from "../lib/session-dump.mjs";
import { readSessionStudy } from "../lib/session-study.mjs";
import { makeTape, signalConfigEval } from "../../src/core/sim/walkforward.ts";
import { parseConfigId, kindOfId } from "../../src/core/pipeline/pipeline.ts";

const dir = resolve(process.argv[2] ?? "");
assert.ok(process.argv[2], "signal-window-audit.mjs FROZEN_REPLAY_DIRECTORY [OUTPUT_JSON]");
const { protocol, protocolSha256 } = readSessionStudy(resolve(dir, "protocol.json"));
const raw = JSON.parse(readFileSync(resolve(dir, "raw.json"), "utf8"));
assert.equal(raw.study.protocolSha256, protocolSha256);
assert.equal(raw.tapeTradesScope, "all-built-configs", "Never-selected histories must also be retained");
const H = 3_600_000, historyH = protocol.actualWf.signalLongH;
assert.ok(historyH > 0);
const times = Array.from({ length: protocol.window.runH + 1 }, (_, i) => protocol.window.tradeStartT + i * H);
const totals = times.map(t => ({ t, contexts: 0, n: 0, gp: 0, gl: 0, incoming: 0, expired: 0 }));
const scalar = (rows, from, until) => {
  let n = 0, gp = 0, gl = 0;
  for (const x of rows) if (x[3] >= from && x[3] < until) {
    assert.ok(Number.isFinite(x[4]));
    n++; if (x[4] > 0) gp += x[4]; else gl -= x[4];
  }
  return { n, gp, gl, pf: gl > 0 ? gp / gl : gp > 0 ? 4 : 0, net: 100 * (gp - gl) };
};
const near = (a, b, message) => assert.ok(Number.isFinite(a) && Number.isFinite(b) &&
  Math.abs(a - b) <= 1e-8 * Math.max(1, Math.abs(a), Math.abs(b)), message);
const started = performance.now();
let tapes = 0, contexts = 0, comparisons = 0, conservationChecks = 0, closes = 0, peakRssMb = 0;
for await (const row of iterateSessionTapeTrades(resolve(dir, "raw.json"))) {
  const cfg = parseConfigId(row.id);
  assert.ok(cfg && cfg.ind.includes("sig-"), "This audit requires a Signals-only catalog");
  const own = new Map();
  for (const x of row.trades) {
    const key = JSON.stringify([x[0], x[1]]);
    if (!own.has(key)) own.set(key, []);
    own.get(key).push(x);
  }
  const tp = makeTape(row.id, cfg.bot, cfg.ind, cfg.protect, kindOfId(row.id), protocol.symbols,
    row.trades.map(([sym, side, entryT, exitT, r]) => ({ cfg:row.id, sym, side, entryT, exitT, r,
      unitR:r, mult:1, entry:1, exit:1, bars:1, reason:"time", mfe:0, mae:0 })), [], []);
  for (const [key, rows] of own) {
    const [sym, side] = JSON.parse(key);
    let previous;
    for (let i = 0; i < times.length; i++) {
      const t = times[i], expected = scalar(rows, t - historyH * H, t);
      const actual = signalConfigEval(tp, t, protocol.actualWf, sym, side);
      const label = `${row.id} ${key} ${t}`;
      assert.equal(actual.n, expected.n, `window count ${label}`);
      near(actual.gp, expected.gp * 100, `gross gain ${label}`);
      near(actual.gl, expected.gl * 100, `gross loss ${label}`);
      near(actual.pf, expected.pf, `PF ${label}`);
      near(actual.net, expected.net, `net ${label}`);
      const total = totals[i];
      total.contexts++; total.n += expected.n; total.gp += expected.gp; total.gl += expected.gl;
      if (previous) {
        const incoming = scalar(rows, times[i - 1], t);
        const expired = scalar(rows, times[i - 1] - historyH * H, t - historyH * H);
        assert.equal(actual.n - previous.n, incoming.n - expired.n, `rolling count ${label}`);
        near(actual.gp - previous.gp, 100 * (incoming.gp - expired.gp), `rolling gain ${label}`);
        near(actual.gl - previous.gl, 100 * (incoming.gl - expired.gl), `rolling loss ${label}`);
        total.incoming += incoming.n; total.expired += expired.n; conservationChecks++;
      }
      previous = actual; comparisons++;
    }
    contexts++;
  }
  tapes++; closes += row.trades.length;
  if (tapes % 5000 === 0) {
    peakRssMb = Math.max(peakRssMb, process.memoryUsage().rss / 1e6);
    console.log(JSON.stringify({ tapes, comparisons, elapsedMs:Math.round(performance.now() - started), peakRssMb }));
  }
}
assert.equal(tapes, raw.engine.tapes, "Every built config must be audited");
const result = { ok:true, scope:"Every built Signal config and observed symbol/direction; raw window count, gross returns, net and PF at 13 hourly boundaries. Gate verdicts and funded execution are separate audits.",
  protocolSha256, sourceSha256:protocol.source.sha256, historyH, tapes, closes, contexts, comparisons,
  conservationChecks, hourly:totals, elapsedMs:performance.now() - started, peakRssMb };
writeFileSync(process.argv[3] ?? resolve(dir, "window-audit.json"), JSON.stringify(result,null,2) + "\n");
console.log(JSON.stringify(result));
