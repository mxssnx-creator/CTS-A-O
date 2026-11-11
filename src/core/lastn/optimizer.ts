import { positionCounts, positionStats } from "../position-windows.ts";
import { rangeOfId } from "../minimal-coord.ts";
// Walk-forward last-N gate optimizer.
//
// For each candidate N, trade k is TAKEN only if the last N trades that had CLOSED before trade k's entry
// pass the gate (PF >= minPf, net > 0, DDT <= maxDdtH, DDT measured up to the decision time).
// N is chosen on the in-sample half; the out-of-sample half reports what that choice would have earned.
import { LAST_N_GRID } from "../config.ts";
import type { Gates, LastNResult, LastNRow, Trade } from "../domain/types.ts";
import { ddrFails, EMPTY_STATS, profitFactor, scoreStats, statsOf } from "../metrics/stats.ts";

const H = 3_600_000;

/** Longest time under the running peak for exits[from..to), counting an unrecovered dip up to nowT. Hours. */
export function windowDdt(exits: readonly Trade[], from: number, to: number, nowT: number): number {
  if (to <= from) return 0;
  let cum = 0;
  let peak = 0;
  let peakT = exits[from].entryT;
  let dipped = false;
  let ddt = 0;
  for (let i = from; i < to; i++) {
    cum += exits[i].r;
    if (cum < peak) dipped = true;
    else {
      if (dipped && exits[i].exitT - peakT > ddt) ddt = exits[i].exitT - peakT;
      dipped = false;
      peak = cum;
      peakT = exits[i].exitT;
    }
  }
  if (dipped && nowT - peakT > ddt) ddt = nowT - peakT;
  return ddt / H;
}

interface Tape {
  byExit: Trade[];
  byEntry: Trade[];
  /** for byEntry[k]: number of trades closed at or before its entry */
  closedBefore: Int32Array;
  gpPre: Float64Array;
  glPre: Float64Array;
  netPre: Float64Array;
}

function cmpText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Stable order for simultaneous closes; input/worker iteration order must not affect drawdown gates. */
function compareExit(a: Trade, b: Trade): number {
  return (
    a.exitT - b.exitT ||
    a.entryT - b.entryT ||
    cmpText(a.cfg, b.cfg) ||
    cmpText(a.sym, b.sym) ||
    a.side - b.side ||
    a.r - b.r
  );
}

function buildTape(trades: readonly Trade[]): Tape {
  const byExit = [...trades].sort(compareExit);
  const byEntry = [...trades].sort((a, b) => a.entryT - b.entryT || compareExit(a, b));
  const m = byExit.length;
  const gpPre = new Float64Array(m + 1);
  const glPre = new Float64Array(m + 1);
  const netPre = new Float64Array(m + 1);
  for (let i = 0; i < m; i++) {
    const r = byExit[i].r;
    gpPre[i + 1] = gpPre[i] + (r > 0 ? r : 0);
    glPre[i + 1] = glPre[i] + (r < 0 ? -r : 0);
    netPre[i + 1] = netPre[i] + r;
  }
  const closedBefore = new Int32Array(m);
  let p = 0;
  for (let k = 0; k < m; k++) {
    const t0 = byEntry[k].entryT;
    while (p < m && byExit[p].exitT <= t0) p++;
    closedBefore[k] = p;
  }
  return { byExit, byEntry, closedBefore, gpPre, glPre, netPre };
}

/** Number of closes with exitT <= t in exit-time order. */
function closedBy(tape: Tape, t: number): number {
  let lo = 0;
  let hi = tape.byExit.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (tape.byExit[mid].exitT <= t) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** Gate decision using the N trades closed in exits[0..p). */
export function gatePasses(tape: Tape, p: number, nN: number, g: Gates, nowT: number): boolean {
  if (p < nN) return false;
  const a = p - nN;
  const gp = tape.gpPre[p] - tape.gpPre[a];
  const gl = tape.glPre[p] - tape.glPre[a];
  const net = tape.netPre[p] - tape.netPre[a];
  if (net <= 0) return false;
  if (profitFactor(gp, gl) < g.minPf) return false;
  if (g.maxDdr !== undefined && g.maxDdr !== 0) {
    let cum = 0;
    let peak = 0;
    let mdd = 0;
    for (let i = a; i < p; i++) {
      cum += tape.byExit[i].r;
      if (cum > peak) peak = cum;
      else if (peak - cum > mdd) mdd = peak - cum;
    }
    if (ddrFails(mdd, net, g.maxDdr)) return false;
  }
  return windowDdt(tape.byExit, a, p, nowT) <= g.maxDdtH;
}

function takenStats(tape: Tape, taken: Uint8Array, from: number, to: number) {
  // taken is indexed by byEntry position; stats need exit order.
  // in-sample part (from = -∞): closed by `to`; out-of-sample part (to = +∞): entered at/after `from`.
  const sel: Trade[] = [];
  for (let k = 0; k < tape.byEntry.length; k++) {
    const tr = tape.byEntry[k];
    const inWin =
      from === -Infinity
        ? tr.exitT <= to
        : to === Infinity
          ? tr.entryT >= from
          : tr.entryT >= from && tr.exitT <= to;
    if (taken[k] && inWin) sel.push(tr);
  }
  sel.sort(compareExit);
  return statsOf(sel);
}

export interface LastNOptions {
  gates: Gates;
  grid?: readonly number[];
  /** split time between in-sample and out-of-sample; defaults to the entry-time midpoint */
  splitT?: number;
  /** decision time for the "gate open now" answer */
  nowT?: number;
}

function countGate(rows:readonly Trade[],n:number,g:Gates):boolean {
  const sample=positionStats(rows.map(r=>r.r),n);
  const prior=g.lossPrior?Number(/\|sl([\d.]+)/.exec(rows[0]?.cfg??"")?.[1])/100:0;
  return sample.complete&&sample.known&&sample.net>0&&sample.gp>=Math.max(1.05,g.minPf)*(sample.gl+prior)&&
    sample.maxDrawdownPositions<=g.positionWindows!.maxDrawdownPositions&&
    !(g.maxDdr&&sample.mdd/sample.net>g.maxDdr)&&sample.positiveShare>=(g.minGreen??.5)&&sample.lcb>0;
}
function countGated(trades:readonly Trade[],n:number,g:Gates):Trade[] {
  const groups=new Map<string,Trade[]>();
  for(const tr of trades) {const key=JSON.stringify([tr.cfg,tr.sym,tr.side]);if(!groups.has(key))groups.set(key,[]);groups.get(key)!.push(tr);}
  const taken:Trade[]=[];
  for(const own of groups.values()) {
    own.sort(compareExit);
    for(const tr of own) {let end=0;while(end<own.length&&own[end].exitT<tr.entryT)end++;
      if(countGate(own.slice(Math.max(0,end-n),end),n,g))taken.push(tr);}
  }
  return taken.sort(compareExit);
}
function configuredCountResult(cfg:string,trades:readonly Trade[],opt:LastNOptions):LastNResult {
  const g=opt.gates,n=positionCounts(g.positionWindows!,rangeOfId(cfg)||"wide",cfg).entry;
  const source=trades.filter(tr=>tr.cfg===cfg&&(opt.nowT===undefined||tr.exitT<opt.nowT)).sort(compareExit);
  const split=Math.floor(source.length/2),isRows=source.slice(0,split),oosRows=source.slice(split),taken=countGated(source,n,g),keys=new Set(taken);
  const si=statsOf(isRows.filter(t=>keys.has(t))),so=statsOf(oosRows.filter(t=>keys.has(t)));
  const baseIs=statsOf(isRows),baseOos=statsOf(oosRows),contexts=new Map<string,Trade[]>();
  for(const tr of source){const key=JSON.stringify([tr.sym,tr.side]);if(!contexts.has(key))contexts.set(key,[]);contexts.get(key)!.push(tr);}
  const gateOpen=[...contexts.values()].some(rows=>countGate(rows,n,g));
  const row=(s:typeof si):LastNRow=>({n,taken:s.n,pf:s.pf,net:s.net,ddt:0,score:s.net>0?s.net*s.wr:0});
  return {cfg,total:source.length,baseline:{is:baseIs,oos:baseOos},rows:[row(si)],oosRows:[row(so)],bestN:n,is:si,oos:so,
    success:si.net>0&&so.net>0&&si.pf>=g.minPf&&so.pf>=g.minPf&&gateOpen,gateOpen};
}

export function optimizeLastN(
  cfg: string,
  trades: readonly Trade[],
  opt: LastNOptions,
): LastNResult {
  const g = opt.gates;
  if(g.positionWindows) return configuredCountResult(cfg,trades,opt);
  const grid = opt.grid ?? LAST_N_GRID;
  const tape = buildTape(trades);
  const m = tape.byEntry.length;
  const empty = {
    cfg,
    total: m,
    baseline: { is: { ...EMPTY_STATS }, oos: { ...EMPTY_STATS } },
    rows: [] as LastNRow[],
    oosRows: [] as LastNRow[],
    bestN: 0,
    is: { ...EMPTY_STATS },
    oos: { ...EMPTY_STATS },
    success: false,
    gateOpen: false,
  };
  if (m === 0) return empty;
  const t0 = tape.byEntry[0].entryT;
  const t1 = tape.byEntry[m - 1].entryT;
  const split = opt.splitT ?? t0 + (t1 - t0) / 2;
  const nowT = opt.nowT ?? tape.byExit[m - 1].exitT;
  const all = new Uint8Array(m).fill(1);
  const baseIs = takenStats(tape, all, -Infinity, split);
  const baseOos = takenStats(tape, all, split, Infinity);
  const minIs = Math.max(4, Math.round(g.minTrades / 2));

  const rows: LastNRow[] = [];
  const oosRows: LastNRow[] = [];
  const takenBy = new Map<number, Uint8Array>();
  for (const nN of grid) {
    if (nN > m) continue;
    const taken = new Uint8Array(m);
    for (let k = 0; k < m; k++) {
      taken[k] = gatePasses(tape, tape.closedBefore[k], nN, g, tape.byEntry[k].entryT) ? 1 : 0;
    }
    takenBy.set(nN, taken);
    const si = takenStats(tape, taken, -Infinity, split);
    const so = takenStats(tape, taken, split, Infinity);
    rows.push({
      n: nN,
      taken: si.n,
      pf: si.pf,
      net: si.net,
      ddt: si.ddt,
      score: scoreStats(si, minIs),
    });
    oosRows.push({
      n: nN,
      taken: so.n,
      pf: so.pf,
      net: so.net,
      ddt: so.ddt,
      score: scoreStats(so, 3),
    });
  }

  let bestN = 0;
  let bestScore = scoreStats(baseIs, minIs);
  for (const r of rows) {
    if (r.score > bestScore + 1e-9) {
      bestScore = r.score;
      bestN = r.n;
    }
  }
  const isS = bestN ? takenStats(tape, takenBy.get(bestN)!, -Infinity, split) : baseIs;
  const oosS = bestN ? takenStats(tape, takenBy.get(bestN)!, split, Infinity) : baseOos;
  const minOos = Math.max(3, Math.round(g.minTrades / 3));
  const success =
    oosS.n >= minOos &&
    oosS.net > 0 &&
    oosS.pf >= g.minPf &&
    oosS.ddt <= g.maxDdtH &&
    isS.net > 0 &&
    isS.pf >= 1;
  // The published "gate open now" verdict is an as-of query. The complete tape may contain
  // closes after nowT (e.g. replay fixtures or a report evaluated at a historical cut), so
  // using m here would let future outcomes qualify the current gate.
  const closedAtNow = closedBy(tape, nowT);
  // N=0 means the optimizer selected the ungated baseline; there is no Last-N condition to close it.
  const gateOpen = bestN ? gatePasses(tape, closedAtNow, bestN, g, nowT) : true;
  return {
    cfg,
    total: m,
    baseline: { is: baseIs, oos: baseOos },
    rows,
    oosRows,
    bestN,
    is: isS,
    oos: oosS,
    success,
    gateOpen,
  };
}

/** Which trades of a tape the chosen gate takes (for paper replay). N=0 takes all. */
export function gatedTrades(trades: readonly Trade[], nN: number, g: Gates): Trade[] {
  if(g.positionWindows) return countGated(trades,nN>0?nN:g.positionWindows.entry,g);
  if (nN <= 0) return [...trades].sort((a, b) => a.exitT - b.exitT);
  const tape = buildTape(trades);
  const out: Trade[] = [];
  for (let k = 0; k < tape.byEntry.length; k++) {
    if (gatePasses(tape, tape.closedBefore[k], nN, g, tape.byEntry[k].entryT))
      out.push(tape.byEntry[k]);
  }
  return out.sort(compareExit);
}
