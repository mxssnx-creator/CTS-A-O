import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { gzipSync, gunzipSync } from "node:zlib";
import { pathToFileURL } from "node:url";
import { DEFAULT_AXIS, DEFAULT_DCA } from "../../src/core/config.ts";
import type { Candle, Protect } from "../../src/core/domain/types.ts";
import { barsFromCandles, resample } from "../../src/core/market/bars.ts";
import { makeUniverse, runCombo } from "../../src/core/pipeline/pipeline.ts";
import { buildTapes, tradeAt } from "../../src/core/sim/walkforward.ts";

/** Raw execution-kernel audit, deliberately not a claim of Base/Main/Real or venue admission. */
type AuditOrder = { state: string; cfg: string; symbol: string; kind: string; tf: number; side: number;
  entryT?: number; exitT?: number; r?: number; reason: string; volume?: number };
export function runCappedExecutionAudit(hours = 72, symbolCount = 20, onOrder?: (order: AuditOrder) => void) {
  if (!Number.isFinite(hours) || hours < 60 || hours > 72 || !Number.isInteger(symbolCount) || symbolCount < 1 || symbolCount > 20)
    throw new RangeError("audit requires60–72TOTAL hours and1–20symbols");
  const began = performance.now(), end = Date.UTC(2026, 9, 9, 12), start = end - hours * 3_600_000;
  const file = readFileSync("docs/micro-optimization-2026-10-20/reproduction-feed.json.gz");
  const feed = JSON.parse(gunzipSync(file).toString()) as { tickers: Array<{ sym: string }>; candles: Record<string, Candle[]> };
  const symbols = feed.tickers.map((x) => x.sym).sort().slice(0, symbolCount);
  assert.equal(new Set(symbols).size, symbolCount);
  const cost = .0015, holdMin = 15;
  const p: Protect = { tp: .005, sl: .01, trail: 0, hold: 1, tag: "mc", maxHoldMin: holdMin };
  const grid: Protect[] = [p, { ...p, trail: .003 }, { ...p, tp: 0, trail: .003, trailOnly: true }];
  const dca = { ...DEFAULT_DCA, levels: 1, step: .001 };
  const hash = createHash("sha256"), groups = new Map<string, { kind: string; tf: number; contexts: number;
    closed: number; held: number; pending: number; gp: number; gl: number; exits: Record<string, number> }>();
  let maxHeap = 0, maxRss = 0, tapes = 0, baseParityChecks = 0;
  const contexts: Array<{ symbol: string; kind: string; tf: number; side: number; closed: number; held: number;
    pending: number; gp: number; gl: number; pf: number | null; noLoss: boolean; exits: Record<string, number> }> = [];
  const batches = [];
  for (const sym of symbols) {
    const batchStart = performance.now(), minutes = feed.candles[`${sym}|1`].filter((x) => x.t >= start && x.t < end);
    assert.equal(minutes.length, hours * 60, `${sym}: exact own minute coverage`);
    assert.ok(minutes.every((x, i) => x.t === start + i * 60_000), `${sym}: no gap or borrowed quote`);
    const u = makeUniverse([1, 5, 15, 30].map((tf) => barsFromCandles(sym, tf, resample(minutes, 1, tf))));
    assert.equal(u.bars.length, 4);
    for (const tf of [1, 5, 15, 30]) {
      const ind = `ema-9-21@m${tf}`, pair = new Set([`revert|${ind}`]);
      const collect = (kind: string, rows: ReturnType<typeof buildTapes>) => {
        for (const tp of rows) {
          const name = kind === "plain" || kind === "plain-dca" ? tp.kind : kind, key = `${name}|${tf}`;
          let row = groups.get(key);
          if (!row) groups.set(key, row = { kind: name, tf, contexts: 0, closed: 0, held: 0, pending: 0, gp: 0, gl: 0, exits: {} });
          row.contexts += 2; tapes++; row.held += tp.open.length; row.pending += tp.pending.length;
          const bySide = new Map([1, -1].map((side) => [side, { symbol: sym, kind: name, tf, side,
            closed: 0, held: 0, pending: 0, gp: 0, gl: 0, exits: {} as Record<string, number> }]));
          for (const held of tp.open) {
            assert.equal(held.executionTfMin, 1);
            assert.equal(held.holdEndT, held.entryT + holdMin * 60_000);
          }
          for (const held of tp.open) {
            bySide.get(held.side)!.held++;
            onOrder?.({ state: "held", cfg: tp.id, symbol: sym, kind: name, tf, side: held.side,
              entryT: held.entryT, r: held.mtm, reason: "open-mark", volume: held.w ?? 1 });
          }
          for (const pending of tp.pending) {
            bySide.get(pending.side)!.pending++;
            onOrder?.({ state: "intent", cfg: tp.id, symbol: sym, kind: name, tf, side: pending.side, reason: "pending" });
          }
          let n = 0, net = 0;
          for (let i = 0; i < tp.n; i++) {
            const t = tradeAt(tp, i);
            if (t.reason === "open") continue;
            assert.ok(t.exitT - t.entryT <= holdMin * 60_000, `${tp.id}: explicit hard cap exceeded`);
            assert.ok(t.exitT > t.entryT && Number.isFinite(t.r));
            row.closed++; n++; net += t.r;
            const side = bySide.get(t.side)!; side.closed++;
            side.gp += Math.max(0, t.r); side.gl += Math.max(0, -t.r);
            side.exits[t.reason] = (side.exits[t.reason] ?? 0) + 1;
            row.gp += Math.max(0, t.r); row.gl += Math.max(0, -t.r);
            row.exits[t.reason] = (row.exits[t.reason] ?? 0) + 1;
            hash.update(JSON.stringify([tp.id, sym, t.side, t.entryT, t.exitT, t.r, t.reason]));
            onOrder?.({ state: "closed", cfg: tp.id, symbol: sym, kind: name, tf, side: t.side,
              entryT: t.entryT, exitT: t.exitT, r: t.r, reason: t.reason, volume: t.vol ?? 1 });
          }
          if (kind === "plain") {
            const base = runCombo(u, "revert", ind, tp.protect, cost, 1)!;
            assert.ok(base); assert.equal(base.full.n, n);
            assert.ok(Math.abs(base.full.net - net * 100) < 1e-8, `${tp.id}: Base/execution cohort mismatch`);
            baseParityChecks++;
          }
          for (const side of bySide.values()) contexts.push({ ...side, pf: side.gl > 0 ? side.gp / side.gl : null,
            noLoss: side.gp > 0 && side.gl === 0 });
        }
      };
      const floors = { minSl: 0, minTrail: 0, microOwnInds: false };
      collect("plain", buildTapes(u, grid, cost, undefined, pair, null, null, floors));
      collect("plain-dca", buildTapes(u, [], cost, { protects: [p], dca }, pair, null, null, floors)
        .filter((x) => x.kind === "dca" || x.kind === "dca-active"));
      for (const mode of ["fixed", "managed", "desk"] as const) {
        const axis = { ...DEFAULT_AXIS, modes: [mode === "desk" ? "desk" as const : "revert" as const],
          exits: mode === "fixed" ? "fixed" as const : "managed" as const, levels: 1, levelsSet: [1],
          ranges: ["atr" as const], hybrids: [false], minDisp: 0, maxDisp: 100, centerMin: 90 };
        collect(`axis-${mode}`, buildTapes(u, [], cost, { protects: [p], dca, axis, noDca: true }, pair, null, null, floors));
      }
      for (const cache of u.caches) cache.clear();
    }
    const usage = process.memoryUsage(); maxHeap = Math.max(maxHeap, usage.heapUsed);
    maxRss = Math.max(maxRss, process.resourceUsage().maxRSS * 1024);
    batches.push({ symbol: sym, milliseconds: performance.now() - batchStart, heapBytes: usage.heapUsed });
  }
  assert.equal(tapes, symbolCount * 4 * 8);
  const rows = [...groups.values()].map((g) => ({ ...g,
    pf: g.gl > 0 ? g.gp / g.gl : null, noLoss: g.gp > 0 && g.gl === 0 }));
  assert.equal(rows.length, 32, "each of eight kinds has four independent timeframe results");
  assert.ok(rows.every((g) => g.closed > 0), "every type/timeframe includes actual modeled closes");
  return { scope: "raw capped execution audit; no qualification/promotion or venue fills", start, end, totalHours: hours,
    cost, holdMin, symbols, tapes, baseParityChecks, feedSha256: createHash("sha256").update(file).digest("hex"),
    milliseconds: performance.now() - began,
    peakSampledHeapBytes: maxHeap, maxRssBytes: maxRss, checksum: hash.digest("hex"), rows, contexts, batches };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [hours = "72", symbols = "20", output] = process.argv.slice(2);
  const columns: Array<keyof AuditOrder> = ["state", "cfg", "symbol", "kind", "tf", "side", "entryT", "exitT", "r", "reason", "volume"];
  const lines = [columns.join(",")], csv = (v: unknown) => String(v ?? "").replaceAll('"', '""');
  const report = runCappedExecutionAudit(Number(hours), Number(symbols), output ? (row) =>
    lines.push(columns.map((k) => `"${csv(row[k])}"`).join(",")) : undefined);
  if (output) {
    mkdirSync(output, { recursive: true });
    writeFileSync(`${output}/orders.csv.gz`, gzipSync(lines.join("\n") + "\n"));
    report.maxRssBytes = Math.max(report.maxRssBytes, process.resourceUsage().maxRSS * 1024);
    report.peakSampledHeapBytes = Math.max(report.peakSampledHeapBytes, process.memoryUsage().heapUsed);
    writeFileSync(`${output}/execution-audit.json`, JSON.stringify(report, null, 2));
  }
  process.stdout.write(JSON.stringify({ ...report, rows: report.rows.length, contexts: report.contexts.length, batches: undefined }) + "\n");
}
