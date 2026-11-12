#!/usr/bin/env node
// Frozen offline screen of new short-horizon candidates (12 Nov 2026), standalone: it does NOT run the Base -> Main -> Real
// pipeline and is not execution evidence. Formulas, exits, costs and the split are fixed here before scoring.
//
//   node --no-warnings scripts/screen-new-candidates-20261112.mjs CORE.sqlite [--tf 5] [--out result.json]
//
// Data: 1m candles from a desk snapshot, resampled to completed `tf`-minute bars. Chronological split: the first 2/3 of each
// symbol's bars are training, the last 1/3 forward; a position that crosses the split is dropped from both. Each candidate
// trades one position per symbol, signals on a completed bar, enters at the NEXT bar's open, exits at TP/SL (stop first when
// both are inside one bar) or the time limit at close. The modeled round-trip cost (0.11 %: measured account taker 0.05 % +
// 10 % slippage allowance, both sides) is deducted ONCE per trade. PF is gross gain / gross loss of net returns; no-loss
// samples are reported as "no loss", never as a number. A candidate "passes" only with >= 30 training closes and PF >= 1.2
// in training; its forward result is then reported whatever it is.
import { DatabaseSync } from "node:sqlite";
import { writeFileSync } from "node:fs";

const argv = process.argv.slice(2);
const file = argv.find((a, i) => !a.startsWith("--") && !(i > 0 && argv[i - 1].startsWith("--")));
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
if (!file) throw new Error("usage: screen-new-candidates-20261112.mjs CORE.sqlite [--tf 5] [--out file]");
const TF = Number(arg("tf", 5)), COST = 2 * 0.0005 * 1.1;
const TP = 0.005, SL = 0.004, HOLD = 12;
const db = new DatabaseSync(file, { readOnly: true });
const syms = db.prepare("select distinct sym from candles").all().map((r) => r.sym);

function bars(sym) {
  const rows = db.prepare("select t,o,h,l,c,v from candles where sym=? order by t").all(sym);
  const ms = TF * 60_000, out = [];
  let cur = null, cnt = 0, ok = true, last = NaN;
  for (const r of rows) {
    const b = Math.floor(r.t / ms) * ms;
    if (!cur || cur.t !== b) {
      if (cur && ok && cnt === TF) out.push(cur);
      cur = { t: b, o: r.o, h: r.h, l: r.l, c: r.c, v: r.v }; cnt = 1; ok = r.t === b;
    } else { cur.h = Math.max(cur.h, r.h); cur.l = Math.min(cur.l, r.l); cur.c = r.c; cur.v += r.v; cnt++; ok = ok && r.t === last + 60_000; }
    last = r.t;
  }
  if (cur && ok && cnt === TF) out.push(cur);
  return out;
}
const contiguous = (b, i) => i > 0 && b[i].t - b[i - 1].t === TF * 60_000;

/** Rolling stats over the previous `w` closed bars (excluding bar i). */
function roll(b, i, w) {
  let sv = 0, spv = 0, sum = 0;
  for (let j = i - w; j < i; j++) { const tp = (b[j].h + b[j].l + b[j].c) / 3; sv += b[j].v; spv += tp * b[j].v; sum += b[j].c; }
  const mean = sum / w; let q = 0;
  for (let j = i - w; j < i; j++) q += (b[j].c - mean) ** 2;
  return { vwap: sv > 0 ? spv / sv : mean, mean, sd: Math.sqrt(q / w), vol: sv };
}
const W = 24;
const quarter = (t) => t % (15 * 60_000) === 0;
const trendUp = (b, i) => b[i - 1].c > b[i - 1 - W].c;

// signal(b, i) -> +1 / -1 / 0 using bars up to and including i (completed); entry is bar i+1's open.
const CANDIDATES = {
  // a close that came back inside 2 sd of the rolling VWAP after being outside it
  "vwap-reclaim": (b, i) => {
    if (i < W + 2) return 0; const p = roll(b, i - 1, W), q = roll(b, i, W);
    if (!(q.sd > 0 && p.sd > 0)) return 0;
    const zp = (b[i - 1].c - p.vwap) / p.sd, z = (b[i].c - q.vwap) / q.sd;
    return zp <= -2 && z > -2 && b[i].c > b[i - 1].c ? 1 : zp >= 2 && z < 2 && b[i].c < b[i - 1].c ? -1 : 0;
  },
  "vwap-reclaim+trend": (b, i) => { const s = CANDIDATES["vwap-reclaim"](b, i); return s && i > 2 * W && (s === 1) === trendUp(b, i) ? s : 0; },
  // the fixed-clock burst: a bar OPENING on a quarter hour continues (follow) or fades (revert) the previous 3-bar move
  "quarter-follow": (b, i) => { if (i < 4 || !quarter(b[i].t)) return 0; const m = b[i].c - b[i - 3].c; return m > 0 ? 1 : m < 0 ? -1 : 0; },
  "quarter-revert": (b, i) => -CANDIDATES["quarter-follow"](b, i),
  // volume spike with a closing reversal bar (hammer / shooting star)
  "spike-reversal": (b, i) => {
    if (i < W + 1) return 0; const r = roll(b, i, W), x = b[i], range = x.h - x.l;
    if (!(range > 0) || !(x.v > 2.5 * r.vol / W)) return 0;
    const pos = (x.c - x.l) / range;
    return pos >= 0.7 && x.c > x.o && x.l < b[i - 1].l ? 1 : pos <= 0.3 && x.c < x.o && x.h > b[i - 1].h ? -1 : 0;
  },
  // reference: close back inside a 2 sd band around the plain mean (the engine's band-reclaim shape)
  "band-reclaim(ref)": (b, i) => {
    if (i < W + 2) return 0; const p = roll(b, i - 1, W), q = roll(b, i, W);
    return b[i - 1].c <= p.mean - 2 * p.sd && b[i].c > q.mean - 2 * q.sd && b[i].c > b[i - 1].c ? 1
      : b[i - 1].c >= p.mean + 2 * p.sd && b[i].c < q.mean + 2 * q.sd && b[i].c < b[i - 1].c ? -1 : 0;
  },
};

function run(b, signal) {
  const trades = []; let busyUntil = -1;
  for (let i = 1; i < b.length - 1; i++) {
    if (i <= busyUntil || !contiguous(b, i) || !contiguous(b, i + 1)) continue;
    const side = signal(b, i); if (!side) continue;
    const entry = b[i + 1].o, tp = entry * (1 + side * TP), sl = entry * (1 - side * SL);
    let exit = null, j = i + 1;
    for (; j <= i + HOLD && j < b.length; j++) {
      if (j > i + 1 && !contiguous(b, j)) { exit = null; break; }
      const hitSl = side === 1 ? b[j].l <= sl : b[j].h >= sl, hitTp = side === 1 ? b[j].h >= tp : b[j].l <= tp;
      if (hitSl) { exit = sl; break; } if (hitTp) { exit = tp; break; }
      if (j === i + HOLD) { exit = b[j].c; break; }
    }
    if (exit === null) continue;
    trades.push({ entryT: b[i + 1].t, exitT: b[j].t, r: side * (exit - entry) / entry - COST });
    busyUntil = j;
  }
  return trades;
}
const pf = (xs) => { let g = 0, l = 0; for (const r of xs) r > 0 ? (g += r) : (l -= r); return l > 0 ? g / l : g > 0 ? "no loss" : "empty"; };
const fmt = (x) => (typeof x === "number" ? x.toFixed(3) : x);

const result = { tf: TF, cost: COST, tp: TP, sl: SL, holdBars: HOLD, symbols: syms.length, candidates: {} };
const series = syms.map((s) => ({ s, b: bars(s) })).filter((x) => x.b.length > 400);
for (const [name, sig] of Object.entries(CANDIDATES)) {
  const train = [], fwd = [];
  for (const { b } of series) {
    const split = b[Math.floor(b.length * 2 / 3)].t;
    for (const t of run(b, sig)) { if (t.exitT < split) train.push(t.r); else if (t.entryT >= split) fwd.push(t.r); }
  }
  const pass = train.length >= 30 && typeof pf(train) === "number" && pf(train) >= 1.2;
  result.candidates[name] = { train: { n: train.length, pf: pf(train), net: +train.reduce((a, b) => a + b, 0).toFixed(4) },
    forward: { n: fwd.length, pf: pf(fwd), net: +fwd.reduce((a, b) => a + b, 0).toFixed(4) }, passesTrainingGate: pass };
  console.log(name.padEnd(20), "train n", String(train.length).padStart(5), "PF", fmt(pf(train)).padStart(7), "| forward n", String(fwd.length).padStart(5), "PF", fmt(pf(fwd)).padStart(7), pass ? "  <- passes training gate" : "");
}
console.log(`symbols ${series.length}, tf ${TF}m, cost ${(COST * 100).toFixed(3)} %, TP ${TP * 100} % / SL ${SL * 100} % / ${HOLD} bars`);
if (arg("out")) writeFileSync(arg("out"), JSON.stringify(result, null, 1));
