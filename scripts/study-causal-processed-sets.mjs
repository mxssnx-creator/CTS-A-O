#!/usr/bin/env node
// Offline research: independent Short Low-Range Normal/Trailing modeled lanes only.
// No account sizing, Block/Relate, portfolio coordination, actual paper book, venue fills, or next-day heuristic.
import { createHash } from "node:crypto";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { DEFAULT_SETTINGS } from "../src/core/config.ts";
import { barsFromCandles, resample } from "../src/core/market/bars.ts";
import { SeriesCache } from "../src/core/indications/cache.ts";
import { lowRangeState, lowRangeProtects, DEFAULT_LOW_RANGE_POLICY } from "../src/core/indications/low-range-research.ts";
import { configId, laneProtect } from "../src/core/pipeline/pipeline.ts";
import { sideSignal, simulate } from "../src/core/sim/backtest.ts";
import { ProcessedSetBook } from "../src/core/sim/processed-set.ts";
import { positionOrderCounts } from "../src/core/positions.ts";

const output = process.argv[2];
if (!output) throw new Error("usage: study-causal-processed-sets.mjs OUTPUT_DIRECTORY");
mkdirSync(output, { recursive: true });
const M = 60_000, H = 60 * M, start = Date.parse("2026-10-10T00:00:00Z"), end = start + 12 * H;
const feedPath = "docs/micro-optimization-2026-10-20/reproduction-feed.json.gz";
const feedBytes = readFileSync(feedPath), feed = JSON.parse(gunzipSync(feedBytes));
const sha = (b) => createHash("sha256").update(b).digest("hex");
const symbols = feed.tickers.map((x) => x.sym).sort();
if (symbols.length !== 20 || new Set(symbols).size !== 20) throw new Error("need exactly 20 symbols");
const samples = [10, 12, 15, 20, 25, 30, 35], minPf = 1.1, baseN = 40;
const tfs = [1, 5, 15], windows = [1, 6], methods = ["edge-turn", "failed-break", "breakout", "mid-reclaim", "compression-break"];
const relations = ["standalone", "trend"], histories = [12, 84];
const protection = { ...DEFAULT_LOW_RANGE_POLICY, steps: [3], slRatios: [1], trailRatios: [0, .5], tags: ["sh"] };
const revision = `modeled-cost-${DEFAULT_SETTINGS.cost}-feed-${sha(feedBytes)}`;
const sourceFiles = ["scripts/study-causal-processed-sets.mjs", "src/core/sim/processed-set.ts", "src/core/sim/backtest.ts",
  "src/core/indications/low-range-research.ts", "src/core/config.ts"];
const protocol = { scope: "Isolated causal modeled lanes; no portfolio/account allocation, Block/Relate, paper, exchange or all-strategy coverage.",
  feedSha256: sha(feedBytes), sourceSha256: Object.fromEntries(sourceFiles.map((p) => [p, sha(readFileSync(p))])),
  symbols, start, end, histories, tfs, windows, methods, relations, protection, cost: DEFAULT_SETTINGS.cost,
  baseN, samples, minPf, marketWarmFrom: start - 84 * H,
  baseRule: "Each entry must pass its own most recent 40 strictly earlier source closes. No elapsed-time performance gate.",
  processedRule: "Each later gate uses only its own preceding stage's completed modeled closes; no warm-up promotion.",
  sourceSlotRule: "Raw source closes supply Base evidence. Each Base-processed lane is simulated independently, applying the Base verdict before occupying its own slot; rejected source positions cannot suppress its later signals.",
  clockRule: "At equal timestamps evaluate entries before exits; results only observe previously completed bars.",
  unsupported: "Last-5 is below the project's current minimum of nine." };
writeFileSync(`${output}/protocol.json`, JSON.stringify(protocol, null, 2) + "\n", { flag: "wx" });

const initialVerdict = () => ({ insufficient: 0, unknown: 0, failed: 0, qualified: 0 });
const blankCounts = () => ({ contexts: 0, basePassed: 0, validation: initialVerdict(), real: initialVerdict(),
  historicalGp: 0, historicalGl: 0, realGp: 0, realGl: 0 });
const baseVerdict = (rows) => {
  const last = rows.slice(-baseN), gp = last.reduce((a, x) => a + Math.max(0, x), 0),
    gl = last.reduce((a, x) => a + Math.max(0, -x), 0);
  return { n: last.length, gp, gl, ok: last.length === baseN && gp > gl && gp >= minPf * gl };
};
const win = (book, stage, n) => {
  const rows = book.snapshot().sets[0]?.[stage].slice(-n) ?? [];
  if (rows.length !== n || rows.some((r) => r.unitReturn === null)) throw new Error("qualified window missing evidence");
  return { gp: rows.reduce((a, x) => a + Math.max(0, x.unitReturn), 0),
    gl: rows.reduce((a, x) => a + Math.max(0, -x.unitReturn), 0) };
};
const summary = (orders) => {
  const closed = orders.filter((o) => o.closed), held = orders.filter((o) => !o.closed);
  let gp = 0, gl = 0, duration = 0;
  const byReason = {};
  for (const o of closed) {
    const r = o.trade.r;
    if (!Number.isFinite(r)) throw new Error("unknown return");
    gp += Math.max(0, r); gl += Math.max(0, -r); duration += (o.trade.exitT - o.trade.entryT) / M;
    byReason[o.trade.reason] = (byReason[o.trade.reason] ?? 0) + 1;
  }
  return { positionsAndOrders: positionOrderCounts(closed.map((o) => o.trade), held.map((o) => o.trade)),
    grossProfit: gp, grossLoss: gl, returnPf: closed.length && gl > 0 ? gp / gl : null,
    noLoss: closed.length > 0 && gp > 0 && gl === 0, meanDurationMinutes: closed.length ? duration / closed.length : null, byReason };
};

for (const history of histories) {
  const from = start - history * H, entries = [], contexts = [], starts = new Map();
  for (const val of samples) for (const real of samples) starts.set(`${val}|${real}`, blankCounts());
  let completedContexts = 0;
  for (const sym of symbols) {
    const minutes = (feed.candles[`${sym}|1`] ?? []).filter((c) => c.t >= start - 84 * H && c.t < end);
    if (minutes.length !== 96 * 60 || minutes.some((c, i) => c.t !== start - 84 * H + i * M))
      throw new Error(`missing minute for ${sym}`);
    for (const tf of tfs) {
      const bars = barsFromCandles(sym, tf, tf === 1 ? minutes : resample(minutes, 1, tf));
      const cache = new SeriesCache(bars);
      for (const window of windows) for (const method of methods) for (const relation of relations) {
        const ind = `low-range-${window}-${method}-${relation}@m${tf}`;
        const state = lowRangeState(cache, window, method, relation), onset = new Int8Array(bars.n);
        for (let i = 1; i < bars.n; i++) if (bars.t[i] + tf * M >= from && state[i] && state[i] !== state[i - 1]) onset[i] = state[i];
        for (const ref of lowRangeProtects(protection)) {
          const protect = laneProtect({ ...ref, hold: Math.max(1, Math.floor(60 / tf)), maxHoldMin: 60 }, ind);
          const kind = protect.trail ? "trailing" : "normal", cfg = configId("follow", ind, protect);
          for (const side of [1, -1]) {
            const sig = sideSignal(onset, side);
            const raw = simulate(cfg, bars, sig, protect, { cost: DEFAULT_SETTINGS.cost });
            const rawCloses = [...raw.trades].sort((a, b) => a.exitT - b.exitT);
            if (rawCloses.some((x) => !Number.isFinite(x.r) || !Number.isFinite(x.exitT)))
              throw new Error("unknown Base source close");
            const baseAt = (t) => {
              let lo = 0, hi = rawCloses.length;
              while (lo < hi) { const mid = (lo + hi) >>> 1; if (rawCloses[mid].exitT < t) lo = mid + 1; else hi = mid; }
              return baseVerdict(rawCloses.slice(Math.max(0, lo - baseN), lo).map((x) => x.r));
            };
            // Re-simulate the processed lane, so an entry rejected by Base never occupies its slot.
            const sim = simulate(cfg, bars, sig, protect, { cost: DEFAULT_SETTINGS.cost,
              admitEntry: ({ entryT }) => baseAt(entryT).ok });
            const identity = { baseConfigId: cfg, symbol: sym, side, kind, lane: relation, economicRevision: revision };
            const books = new Map(samples.map((n) => [n, new ProcessedSetBook("model", 35)]));
            const open = new Map();
            const events = [{ t: start, rank: 0, type: "checkpoint" }];
            for (const tr of sim.trades) {
              if (!Number.isFinite(tr.r) || !(tr.exitT >= tr.entryT)) throw new Error("invalid source trade");
              tr.kind = kind; tr.mult = 1;
              events.push({ t: tr.entryT, rank: 1, type: "entry", tr }, { t: tr.exitT, rank: 2, type: "exit", tr });
            }
            if (sim.open) {
              const tr = { ...sim.open, kind, mult: 1, markedOpen: true };
              events.push({ t: tr.entryT, rank: 1, type: "entry", tr });
            }
            events.sort((a, b) => a.t - b.t || a.rank - b.rank);
            for (const event of events) {
              if (event.type === "checkpoint") {
                const base = baseAt(start), check = { cfg, sym, side, kind, tf, relation, base,
                  validations: {} };
                for (const val of samples) {
                  const book = books.get(val), v = book.verdict(identity, "postBase", val, minPf);
                  const real = {}, realGross = {};
                  for (const n of samples) {
                    real[n] = v.state === "qualified" ? book.verdict(identity, "validated", n, minPf) : null;
                    if (real[n]?.state === "qualified") realGross[n] = win(book, "validated", n);
                  }
                  const sourceGross = v.state === "qualified" ? win(book, "postBase", val) : null;
                  check.validations[val] = { verdict: v, real, sourceGross, realGross };
                  for (const n of samples) {
                    const a = starts.get(`${val}|${n}`); a.contexts++;
                    if (!base.ok) continue;
                    a.basePassed++; a.validation[v.state]++;
                    if (v.state === "qualified") {
                      const w = sourceGross; a.historicalGp += w.gp; a.historicalGl += w.gl;
                      const r = real[n]; a.real[r.state]++;
                      if (r.state === "qualified") { const rw = realGross[n]; a.realGp += rw.gp; a.realGl += rw.gl; }
                    }
                  }
                }
                contexts.push(check);
              } else if (event.type === "entry") {
                if (!baseAt(event.t).ok) throw new Error("post-Base lane admitted an unqualified entry");
                const id = String(event.tr.entryT), validation = {};
                let evidence;
                for (const val of samples) {
                  const book = books.get(val), verdict = book.verdict(identity, "postBase", val, minPf), real = {};
                  for (const n of samples) real[n] = verdict.state === "qualified" ? book.verdict(identity, "validated", n, minPf) : null;
                  if (val === 12 && event.t >= start && event.t < end) {
                    const prior = book.snapshot().sets[0];
                    evidence = { validationSource: prior?.postBase.slice(-12) ?? [], realSource: prior?.validated.slice(-12) ?? [] };
                  }
                  const admission = book.acceptPostBase(identity, id, event.t, { validationN: val, realN: 12, minPf });
                  if (admission.validation.state !== verdict.state) throw new Error("stage decision mismatch");
                  validation[val] = { verdict, real };
                }
                const record = { cfg, sym, side, kind, tf, relation, trade: event.tr, validation, evidence, closed: false };
                open.set(id, record);
                if (event.t >= start && event.t < end) entries.push(record);
              } else {
                const id = String(event.tr.entryT), record = open.get(id);
                if (!record) throw new Error("processed close without its entry");
                for (const book of books.values()) book.close(identity, id, event.tr.entryT, "complete", event.t, event.tr.r, true);
                record.closed = true; open.delete(id);
              }
            }
            completedContexts++;
          }
        }
      }
    }
    process.stderr.write(`history ${history}h: ${sym} complete, ${completedContexts} contexts, ${entries.length} post-Base entries in test window\n`);
    const current = Number(readFileSync("/sys/fs/cgroup/memory.current", "utf8"));
    const max = Number(readFileSync("/sys/fs/cgroup/memory.max", "utf8"));
    const stat = readFileSync("/sys/fs/cgroup/memory.stat", "utf8"), inactive = Number(/^inactive_file (\d+)$/m.exec(stat)?.[1] ?? 0);
    if (Number.isFinite(max) && max - current + inactive < 768 * 1024 * 1024)
      throw new Error(`memory guard stopped incomplete study after ${sym}: available ${max - current + inactive}`);
  }
  if (completedContexts !== 4800) throw new Error(`unexpected contexts ${completedContexts}`);
  const cases = [];
  for (const val of samples) for (const real of samples) {
    const a = starts.get(`${val}|${real}`), validation = initialVerdict(), realEval = initialVerdict();
    const accepted = [], active = [];
    for (const order of entries) {
      const v = order.validation[val]; validation[v.verdict.state]++;
      if (v.verdict.state === "qualified") {
        accepted.push(order); const r = v.real[real]; realEval[r.state]++;
        if (r.state === "qualified") active.push(order);
      }
    }
    const count = (x) => Object.values(x).reduce((a, n) => a + n, 0);
    const pct = (v) => count(v) ? 100 * v.qualified / count(v) : null;
    const stageStats = { postBase: summary(entries), validated: summary(accepted), active: summary(active) };
    const groups = {};
    for (const kind of ["normal", "trailing"]) for (const tf of tfs) {
      const key = `${kind}|${tf}`, filt = (xs) => xs.filter((o) => o.kind === kind && o.tf === tf);
      groups[key] = { postBase: summary(filt(entries)), validated: summary(filt(accepted)), active: summary(filt(active)) };
    }
    cases.push({ validationN: val, realN: real, atStart: { ...a,
      validationPctOfBase: a.basePassed ? 100 * a.validation.qualified / a.basePassed : null,
      historicalValidationPf: a.historicalGl > 0 ? a.historicalGp / a.historicalGl : null,
      realPctOfValidated: count(a.real) ? pct(a.real) : null, historicalRealPf: a.realGl > 0 ? a.realGp / a.realGl : null },
      duringWindow: { evaluations: { validation, real: realEval }, validationPctOfPostBaseOrders: pct(validation),
        realPctOfValidatedOrders: pct(realEval), stages: stageStats, groups } });
  }
  const paths = { contexts: `history-${history}-contexts.jsonl`, entries: `history-${history}-postbase-entries.jsonl`, results: `history-${history}-results.json` };
  writeFileSync(`${output}/${paths.contexts}`, contexts.map((x) => JSON.stringify(x)).join("\n") + "\n", { flag: "wx" });
  writeFileSync(`${output}/${paths.entries}`, entries.map((x) => JSON.stringify(x)).join("\n") + (entries.length ? "\n" : ""), { flag: "wx" });
  writeFileSync(`${output}/${paths.results}`, JSON.stringify({ history, completedContexts, cases, paths }, null, 2) + "\n", { flag: "wx" });
  process.stderr.write(`history ${history}h complete: ${entries.length} post-Base entries, 49 Validation/Real cases\n`);
}
console.log(JSON.stringify({ status: "complete", output, histories, casesPerHistory: 49 }));
