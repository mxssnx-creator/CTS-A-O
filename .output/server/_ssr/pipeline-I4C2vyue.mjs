import { a as signalId, o as signalSettings, r as SIGNAL_SOURCES } from "./signal-config-B9M82AI0.mjs";
import { f as PROTECT_GRID, l as LAST_N_GRID, o as EVAL_TIME_WINDOWS_H, r as DEFAULT_PROTECT, s as EVAL_TRADE_WINDOWS } from "./config-D_G1clvp.mjs";
import { A as rsi, C as keltner, D as periodLevels, E as obv, F as trix, I as vwapRolling, L as willr, M as stoch, N as stochRsi, O as psar, P as supertrend, R as zscore, S as kama, T as mfi, _ as donchianPrior, b as hma, c as laneOf, d as aroon, f as atr, g as dmi, h as cmf, i as higherFactors, j as sma, k as roc, m as cci, o as isSignalInd, p as bollinger, r as TF_LADDER, s as laneInd, t as INDICATIONS, v as ema, w as macd, x as ichimoku, y as heikinAshi } from "./registry-DAOXOhzn.mjs";
import { n as entrySignal, r as tacticCooldown, t as BOTS } from "./bots-BwclXPEV.mjs";
import { EMPTY_STATS, hourlyNet, profitFactor, scoreStats, statsOf } from "./stats-CgkRoLVg.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/pipeline-I4C2vyue.js
var H$2 = 36e5;
function minTradesFor(hours, g) {
	return Math.max(3, Math.round(g.minTrades * hours / 72));
}
/** `tape` must be in exit order. */
function evaluateConfig(cfg, tape, o) {
	const g = o.gates;
	const windows = [];
	const push = (key, kind, span, sel, minN) => {
		const s = statsOf(sel, o.nowT);
		const active = s.n >= minN;
		windows.push({
			key,
			kind,
			span,
			n: s.n,
			pf: s.pf,
			net: s.net,
			ddt: s.ddt,
			wr: s.wr,
			pass: active && s.net > 0 && s.pf >= g.minPf && s.ddt <= g.maxDdtH
		});
		return active;
	};
	const active = [];
	for (const h of o.timeWindowsH ?? EVAL_TIME_WINDOWS_H) {
		const from = o.nowT - h * H$2;
		let a = tape.length;
		while (a > 0 && tape[a - 1].exitT > from) a--;
		active.push(push(`${h}h`, "time", h, tape.slice(a), minTradesFor(h, g)));
	}
	const tw = new Set(o.tradeWindows ?? EVAL_TRADE_WINDOWS);
	if (o.bestN && o.bestN > 0) tw.add(o.bestN);
	for (const nN of [...tw].sort((a, b) => a - b)) active.push(push(`N${nN}`, "trades", nN, tape.slice(Math.max(0, tape.length - nN)), Math.min(nN, Math.max(3, Math.round(nN * .8)))));
	let counted = 0;
	let passed = 0;
	windows.forEach((w, i) => {
		if (!active[i]) return;
		counted++;
		if (w.pass) passed++;
	});
	const passRatio = counted ? passed / counted : 0;
	const success = counted >= 2 && passRatio >= g.quorum;
	const recentFrom = o.nowT - 72 * H$2;
	const recent = tape.filter((t) => t.exitT > recentFrom);
	const score = passRatio * Math.max(0, scoreStats(statsOf(recent, o.nowT), 3));
	return {
		cfg,
		at: o.nowT,
		windows,
		passRatio,
		success,
		score
	};
}
var SeriesCache = class SeriesCache {
	b;
	m = /* @__PURE__ */ new Map();
	constructor(b) {
		this.b = b;
	}
	/** Drop every cached series except those whose key starts with one of `keep` (memory bound between groups). */
	clear(keep = []) {
		if (!keep.length) {
			this.m.clear();
			return;
		}
		for (const k of this.m.keys()) if (!keep.some((p) => k.startsWith(p))) this.m.delete(k);
	}
	/** Drop cached series whose key ends with `suffix` (one-shot combo signals: keeps memory bounded). */
	forgetSuffix(suffix) {
		for (const k of this.m.keys()) if (k.endsWith(suffix)) this.m.delete(k);
	}
	memo(key, fn) {
		const hit = this.m.get(key);
		if (hit !== void 0) return hit;
		const v = fn();
		this.m.set(key, v);
		return v;
	}
	ema(p) {
		return this.memo(`ema${p}`, () => ema(this.b.c, p));
	}
	sma(p) {
		return this.memo(`sma${p}`, () => sma(this.b.c, p));
	}
	rsi(p) {
		return this.memo(`rsi${p}`, () => rsi(this.b.c, p));
	}
	atr(p) {
		return this.memo(`atr${p}`, () => atr(this.b.h, this.b.l, this.b.c, p));
	}
	macd(f = 12, s = 26, g = 9) {
		return this.memo(`macd${f}.${s}.${g}`, () => macd(this.b.c, f, s, g));
	}
	bb(p = 20, k = 2) {
		return this.memo(`bb${p}.${k}`, () => bollinger(this.b.c, p, k));
	}
	psar(step = .02, max = .2) {
		return this.memo(`sar${step}.${max}`, () => psar(this.b.h, this.b.l, step, max));
	}
	dmi(p = 14) {
		return this.memo(`dmi${p}`, () => dmi(this.b.h, this.b.l, this.b.c, p));
	}
	st(p = 10, m = 3) {
		return this.memo(`st${p}.${m}`, () => supertrend(this.b.h, this.b.l, this.b.c, p, m));
	}
	don(p) {
		return this.memo(`don${p}`, () => donchianPrior(this.b.h, this.b.l, p));
	}
	vwap(p) {
		return this.memo(`vwap${p}`, () => vwapRolling(this.b.h, this.b.l, this.b.c, this.b.v, p));
	}
	volSma(p) {
		return this.memo(`vsma${p}`, () => sma(this.b.v, p));
	}
	roc(p) {
		return this.memo(`roc${p}`, () => roc(this.b.c, p));
	}
	stoch(p = 14, d = 3) {
		return this.memo(`stoch${p}.${d}`, () => stoch(this.b.h, this.b.l, this.b.c, p, d));
	}
	cci(p) {
		return this.memo(`cci${p}`, () => cci(this.b.h, this.b.l, this.b.c, p));
	}
	willr(p) {
		return this.memo(`willr${p}`, () => willr(this.b.h, this.b.l, this.b.c, p));
	}
	mfi(p) {
		return this.memo(`mfi${p}`, () => mfi(this.b.h, this.b.l, this.b.c, this.b.v, p));
	}
	obv() {
		return this.memo("obv", () => obv(this.b.c, this.b.v));
	}
	cmf(p) {
		return this.memo(`cmf${p}`, () => cmf(this.b.h, this.b.l, this.b.c, this.b.v, p));
	}
	stochRsi(p, s = p) {
		return this.memo(`srsi${p}.${s}`, () => stochRsi(this.b.c, p, s, 3));
	}
	aroon(p) {
		return this.memo(`aroon${p}`, () => aroon(this.b.h, this.b.l, p));
	}
	kelt(p, m) {
		return this.memo(`kelt${p}.${m}`, () => keltner(this.b.h, this.b.l, this.b.c, p, m));
	}
	ichi(t, k, b) {
		return this.memo(`ichi${t}.${k}.${b}`, () => ichimoku(this.b.h, this.b.l, t, k, b, k));
	}
	hma(p) {
		return this.memo(`hma${p}`, () => hma(this.b.c, p));
	}
	trix(p) {
		return this.memo(`trix${p}`, () => trix(this.b.c, p));
	}
	kama(p) {
		return this.memo(`kama${p}`, () => kama(this.b.c, p));
	}
	ha() {
		return this.memo("ha", () => heikinAshi(this.b.o, this.b.h, this.b.l, this.b.c));
	}
	z(p) {
		return this.memo(`z${p}`, () => zscore(this.b.c, p));
	}
	/**
	* Higher-timeframe view: `factor` × this timeframe, built from COMPLETED higher bars only.
	* `map[i]` = index of the last higher bar that had closed when bar i closed (−1 = none yet).
	*/
	htf(factor) {
		return this.memo(`htf${factor}`, () => {
			const b = this.b;
			const tfMs = b.tfMin * 6e4;
			const span = tfMs * factor;
			const T = [], O = [], Hh = [], L = [], C = [], V = [];
			const map = new Int32Array(b.n).fill(-1);
			let cur = -1;
			let bo = 0, bh = 0, bl = 0, bc = 0, bv = 0, bt = 0;
			for (let i = 0; i < b.n; i++) {
				const bucket = Math.floor(b.t[i] / span);
				if (bucket !== cur) {
					cur = bucket;
					bt = bucket * span;
					bo = b.o[i];
					bh = b.h[i];
					bl = b.l[i];
					bc = b.c[i];
					bv = b.v[i];
				} else {
					if (b.h[i] > bh) bh = b.h[i];
					if (b.l[i] < bl) bl = b.l[i];
					bc = b.c[i];
					bv += b.v[i];
				}
				if (b.t[i] + tfMs >= bt + span) {
					T.push(bt);
					O.push(bo);
					Hh.push(bh);
					L.push(bl);
					C.push(bc);
					V.push(bv);
				}
				map[i] = T.length - 1;
			}
			const hb = {
				sym: b.sym,
				tfMin: b.tfMin * factor,
				n: T.length,
				t: Float64Array.from(T),
				o: Float64Array.from(O),
				h: Float64Array.from(Hh),
				l: Float64Array.from(L),
				c: Float64Array.from(C),
				v: Float64Array.from(V)
			};
			return {
				k: new SeriesCache(hb),
				map
			};
		});
	}
	period(ms) {
		const b = this.b;
		return this.memo(`per${ms}`, () => periodLevels(b.t, b.h, b.l, b.c, b.o, b.v, ms));
	}
	rangeSma(p) {
		return this.memo(`rsma${p}`, () => {
			const r = new Float64Array(this.b.n);
			for (let i = 0; i < this.b.n; i++) r[i] = this.b.h[i] - this.b.l[i];
			return sma(r, p);
		});
	}
};
/** Every signal combo to score in Base (bot "follow": the source's own onsets). */
function signalCombos(sig, engineTfs) {
	if (!sig.enabled) return [];
	const lanes = sig.lanes.filter((tf) => engineTfs.includes(tf));
	const out = [];
	for (const src of SIGNAL_SOURCES) {
		if (sig.sources[src.name] === false) continue;
		for (const range of ["short", "medium"]) {
			if (!sig.ranges[range]) continue;
			for (const tf of lanes) out.push({
				bot: "follow",
				ind: laneInd(signalId(src.name, range), tf)
			});
		}
	}
	return out;
}
/** The 15 Normal + 15 Trailing configs of every signal (15m reference; lanes scale them). */
function signalProtects(sig) {
	const hold = Math.max(2, Math.round(sig.holdH * 60 / 15));
	const out = [];
	for (const tp of sig.normal.tp) for (const k of sig.normal.slOfTp) out.push({
		tp,
		sl: +(tp * k).toFixed(4),
		trail: 0,
		hold
	});
	for (const tp of sig.trailing.tp) for (const t of sig.trailing.trailOfTp) out.push({
		tp,
		sl: +(tp * sig.trailing.slOfTp).toFixed(4),
		trail: +(tp * t).toFixed(4),
		hold
	});
	return out;
}
/** Signal pairs ("bot|ind") with at least `minTrades` Base trades on some symbol: the candidates to rank. */
function signalCandidates(runs, minTrades) {
	const out = /* @__PURE__ */ new Set();
	for (const r of runs) {
		if (!r.ind.includes("sig-")) continue;
		const by = typeof r.bySym === "string" ? JSON.parse(r.bySym) : r.bySym;
		if (Object.values(by ?? {}).some((x) => x.n >= minTrades)) out.add(`${r.bot}|${r.ind}`);
	}
	return out;
}
/**
* The active signals (pair × symbol, at least `minTrades` Base trades on that symbol), the best `count`:
* drawdown ranking (default) = profitable and positive in ≥ minBlockShare of its 4-hour blocks, by net ÷ max
* drawdown; net ranking = by net then PF. Keys "bot|ind|sym".
*/
function activeSignals(runs, sig) {
	const recentOk = (st) => sig.validate === false || st.recentN === void 0 || st.recentN > 0 && (st.recentNet ?? 0) > 0;
	const rank = sig.rank ?? "drawdown";
	const byDd = rank === "drawdown" || rank === "lowdd";
	const rows = [];
	for (const r of runs) {
		if (!r.ind.includes("sig-")) continue;
		const by = typeof r.bySym === "string" ? JSON.parse(r.bySym) : r.bySym;
		for (const [sym, st] of Object.entries(by ?? {})) {
			if (st.n < sig.minTrades || !recentOk(st)) continue;
			if (byDd) {
				if (!(st.net > 0) || (st.okShare ?? 0) < (sig.minBlockShare ?? 0)) continue;
				const dd = Math.max(st.dd ?? 0, .5);
				if (rank === "lowdd" && st.net < dd) continue;
				rows.push({
					key: `${r.bot}|${r.ind}|${sym}`,
					score: rank === "lowdd" ? st.net / (dd * dd) : st.net / dd,
					pf: st.pf
				});
			} else rows.push({
				key: `${r.bot}|${r.ind}|${sym}`,
				score: st.net,
				pf: st.pf
			});
		}
	}
	rows.sort((a, b) => b.score - a.score || b.pf - a.pf || (a.key < b.key ? -1 : 1));
	return new Set(rows.slice(0, sig.count).map((x) => x.key));
}
/**
* Guard key: one config (source × range × lane × protect, which fixes the type) on one symbol and direction —
* each of a signal's 15 Normal and 15 Trailing configs is judged independently per symbol and direction.
*/
var guardKey = (cfg, sym, side, kind) => `${cfg}|${sym}|${side > 0 ? 1 : -1}|${kind === "trailing" ? "trailing" : "normal"}`;
/** Closed results per guard key, causal (filled as candidates close); the average of the last N decides. */
var SignalGuard = class {
	lists = /* @__PURE__ */ new Map();
	/** every closed signal candidate in exit order (loss-cluster guard) */
	closed = [];
	add(key, r, exitT) {
		if (exitT !== void 0) {
			this.closed.push({
				t: exitT,
				r
			});
			if (this.closed.length > 2e4) this.closed.splice(0, 1e4);
		}
		const l = this.lists.get(key);
		if (l) {
			l.push(r);
			if (l.length > 128) l.splice(0, l.length - 64);
		} else this.lists.set(key, [r]);
	}
	/** true when the last n results average below zero (a set with fewer than n results is not judged) */
	disabled(key, n) {
		const l = this.lists.get(key);
		if (!l || l.length < n) return false;
		let s = 0;
		for (let i = l.length - n; i < l.length; i++) s += l[i];
		return s / n < 0;
	}
	/**
	* Loss cluster: signal executions pause while the signal candidates closed in the last `windowMin` minutes before
	* `t` lost together — at least `minLosses` losing closes, a loss share ≥ `lossShare` and a negative sum. The
	* pause ends by itself when those losses age out of the window. Stateless in time (only closes before `t`
	* count), so the simulation, the paper book, the live step and the audit replay decide alike. Candidates keep
	* being computed and fed while paused (the internal calculations never stop).
	*/
	clustered(t, c) {
		if (!c.enabled) return false;
		const from = t - c.windowMin * 6e4;
		let n = 0;
		let losses = 0;
		let sum = 0;
		for (let i = this.closed.length - 1; i >= 0; i--) {
			const x = this.closed[i];
			if (x.t > t) continue;
			if (x.t <= from) break;
			n++;
			sum += x.r;
			if (x.r < 0) losses++;
		}
		return losses >= c.minLosses && sum < 0 && losses / Math.max(1, n) >= c.lossShare;
	}
	/** keys disabled right now (for status) */
	disabledKeys(n) {
		return [...this.lists.keys()].filter((k) => this.disabled(k, n));
	}
};
var H$1 = 36e5;
/** Longest time under the running peak for exits[from..to), counting an unrecovered dip up to nowT. Hours. */
function windowDdt(exits, from, to, nowT) {
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
	return ddt / H$1;
}
function buildTape(trades) {
	const byExit = [...trades].sort((a, b) => a.exitT - b.exitT || a.entryT - b.entryT);
	const byEntry = [...trades].sort((a, b) => a.entryT - b.entryT || a.exitT - b.exitT);
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
	return {
		byExit,
		byEntry,
		closedBefore,
		gpPre,
		glPre,
		netPre
	};
}
/** Gate decision using the N trades closed in exits[0..p). */
function gatePasses(tape, p, nN, g, nowT) {
	if (p < nN) return false;
	const a = p - nN;
	const gp = tape.gpPre[p] - tape.gpPre[a];
	const gl = tape.glPre[p] - tape.glPre[a];
	if (tape.netPre[p] - tape.netPre[a] <= 0) return false;
	if (profitFactor(gp, gl) < g.minPf) return false;
	return windowDdt(tape.byExit, a, p, nowT) <= g.maxDdtH;
}
function takenStats(tape, taken, from, to) {
	const sel = [];
	for (let k = 0; k < tape.byEntry.length; k++) {
		const tr = tape.byEntry[k];
		const inWin = from === -Infinity ? tr.exitT <= to : to === Infinity ? tr.entryT >= from : tr.entryT >= from && tr.exitT <= to;
		if (taken[k] && inWin) sel.push(tr);
	}
	sel.sort((a, b) => a.exitT - b.exitT);
	return statsOf(sel);
}
function optimizeLastN(cfg, trades, opt) {
	const g = opt.gates;
	const grid = opt.grid ?? LAST_N_GRID;
	const tape = buildTape(trades);
	const m = tape.byEntry.length;
	const empty = {
		cfg,
		total: m,
		baseline: {
			is: { ...EMPTY_STATS },
			oos: { ...EMPTY_STATS }
		},
		rows: [],
		oosRows: [],
		bestN: 0,
		is: { ...EMPTY_STATS },
		oos: { ...EMPTY_STATS },
		success: false,
		gateOpen: false
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
	const rows = [];
	const oosRows = [];
	const takenBy = /* @__PURE__ */ new Map();
	for (const nN of grid) {
		if (nN > m) continue;
		const taken = new Uint8Array(m);
		for (let k = 0; k < m; k++) taken[k] = gatePasses(tape, tape.closedBefore[k], nN, g, tape.byEntry[k].entryT) ? 1 : 0;
		takenBy.set(nN, taken);
		const si = takenStats(tape, taken, -Infinity, split);
		const so = takenStats(tape, taken, split, Infinity);
		rows.push({
			n: nN,
			taken: si.n,
			pf: si.pf,
			net: si.net,
			ddt: si.ddt,
			score: scoreStats(si, minIs)
		});
		oosRows.push({
			n: nN,
			taken: so.n,
			pf: so.pf,
			net: so.net,
			ddt: so.ddt,
			score: scoreStats(so, 3)
		});
	}
	let bestN = 0;
	let bestScore = scoreStats(baseIs, minIs);
	for (const r of rows) if (r.score > bestScore + 1e-9) {
		bestScore = r.score;
		bestN = r.n;
	}
	const isS = bestN ? takenStats(tape, takenBy.get(bestN), -Infinity, split) : baseIs;
	const oosS = bestN ? takenStats(tape, takenBy.get(bestN), split, Infinity) : baseOos;
	const minOos = Math.max(3, Math.round(g.minTrades / 3));
	const success = oosS.n >= minOos && oosS.net > 0 && oosS.pf >= g.minPf && oosS.ddt <= g.maxDdtH && isS.net > 0 && isS.pf >= 1;
	const gateOpen = bestN ? gatePasses(tape, m, bestN, g, nowT) : baseIs.pf >= g.minPf || baseOos.pf >= g.minPf;
	return {
		cfg,
		total: m,
		baseline: {
			is: baseIs,
			oos: baseOos
		},
		rows,
		oosRows,
		bestN,
		is: isS,
		oos: oosS,
		success,
		gateOpen
	};
}
/** Which trades of a tape the chosen gate takes (for paper replay). N=0 takes all. */
function gatedTrades(trades, nN, g) {
	if (nN <= 0) return [...trades].sort((a, b) => a.exitT - b.exitT);
	const tape = buildTape(trades);
	const out = [];
	for (let k = 0; k < tape.byEntry.length; k++) if (gatePasses(tape, tape.closedBefore[k], nN, g, tape.byEntry[k].entryT)) out.push(tape.byEntry[k]);
	return out.sort((a, b) => a.exitT - b.exitT);
}
function simulate(cfg, bars, sig, p, opt) {
	const { n, t, o, h, l, c, sym } = bars;
	const cost = opt.cost;
	const cooldown = opt.cooldown ?? 0;
	const trades = [];
	let inPos = false;
	let side = 1;
	let entryI = 0;
	let entry = 0;
	let stop = 0;
	let target = 0;
	let peak = 0;
	let trailOn = false;
	let mfe = 0;
	let mae = 0;
	let nextAllowed = 0;
	const dist = p.trail * (p.trailStep ?? 1);
	const close = (i, exit, reason, exitT) => {
		const r = side * (exit - entry) / entry - cost;
		trades.push({
			cfg,
			sym,
			side,
			entryT: t[entryI],
			exitT,
			entry,
			exit,
			r,
			reason,
			bars: i - entryI + 1,
			mfe,
			mae
		});
		inPos = false;
		nextAllowed = i + cooldown;
	};
	for (let i = 0; i < n; i++) {
		if (inPos && i >= entryI) {
			const gap = i > entryI;
			const barEnd = t[i] + bars.tfMin * 6e4;
			if (side === 1) {
				const up = (h[i] - entry) / entry;
				const dn = (entry - l[i]) / entry;
				if (up > mfe) mfe = up;
				if (dn > mae) mae = dn;
				if (l[i] <= stop) close(i, gap ? Math.min(o[i], stop) : stop, trailOn ? "trail" : "sl", barEnd);
				else if (h[i] >= target && !(trailOn && p.trailFree)) close(i, gap ? Math.max(o[i], target) : target, "tp", barEnd);
			} else {
				const up = (entry - l[i]) / entry;
				const dn = (h[i] - entry) / entry;
				if (up > mfe) mfe = up;
				if (dn > mae) mae = dn;
				if (h[i] >= stop) close(i, gap ? Math.max(o[i], stop) : stop, trailOn ? "trail" : "sl", barEnd);
				else if (l[i] <= target && !(trailOn && p.trailFree)) close(i, gap ? Math.min(o[i], target) : target, "tp", barEnd);
			}
			if (inPos) {
				if (i - entryI + 1 >= p.hold) close(i, c[i], "time", barEnd);
				else if (p.trail > 0) {
					if (side === 1) {
						if (h[i] > peak) peak = h[i];
						if ((peak - entry) / entry >= p.trail) {
							trailOn = true;
							const lvl = peak * (1 - dist);
							if (lvl > stop) stop = lvl;
						}
					} else {
						if (l[i] < peak) peak = l[i];
						if ((entry - peak) / entry >= p.trail) {
							trailOn = true;
							const lvl = peak * (1 + dist);
							if (lvl < stop) stop = lvl;
						}
					}
				}
			}
		}
		if (!inPos && i >= nextAllowed && i + 1 < n) {
			const s = sig[i];
			if (s !== 0) {
				inPos = true;
				side = s > 0 ? 1 : -1;
				entryI = i + 1;
				entry = o[i + 1];
				stop = side === 1 ? entry * (1 - p.sl) : entry * (1 + p.sl);
				target = side === 1 ? entry * (1 + p.tp) : entry * (1 - p.tp);
				peak = entry;
				trailOn = false;
				mfe = 0;
				mae = 0;
			}
		}
	}
	let open = null;
	if (inPos) {
		const last = c[n - 1];
		open = {
			cfg,
			sym,
			side,
			entryT: t[entryI],
			entryI,
			entry,
			stop,
			target,
			peak,
			trailOn,
			mtm: side * (last - entry) / entry - cost
		};
	}
	const lastSig = n > 0 ? sig[n - 1] : 0;
	const pending = !inPos && n > 0 && n - 1 >= nextAllowed && lastSig !== 0 ? lastSig > 0 ? 1 : -1 : 0;
	return {
		trades,
		open,
		pending
	};
}
var H = 36e5;
/** Apply the hour guard; `tape` in any order, result in exit order. stopPct 0 = off. */
function applyHourGuard(tape, stopPct) {
	const byExit = [...tape].sort((a, b) => a.exitT - b.exitT);
	if (stopPct <= 0) return byExit;
	const byEntry = [...tape].sort((a, b) => a.entryT - b.entryT || a.exitT - b.exitT);
	const taken = [];
	const open = [];
	const hourNet = /* @__PURE__ */ new Map();
	for (const tr of byEntry) {
		while (open.length && open[0].exitT <= tr.entryT) {
			const x = open.shift();
			const k = Math.floor(x.exitT / H);
			hourNet.set(k, (hourNet.get(k) ?? 0) + x.r * 100);
		}
		if ((hourNet.get(Math.floor(tr.entryT / H)) ?? 0) <= -stopPct) continue;
		taken.push(tr);
		let j = open.length;
		open.push(tr);
		while (j > 0 && open[j - 1].exitT > tr.exitT) {
			open[j] = open[j - 1];
			j--;
		}
		open[j] = tr;
	}
	return taken.sort((a, b) => a.exitT - b.exitT);
}
/** Merge two exit-ordered tapes (statsOf needs exit order for DDT / MDD). */
function mergeByExit(a, b) {
	const out = [];
	let i = 0;
	let j = 0;
	while (i < a.length || j < b.length) if (j >= b.length || i < a.length && a[i].exitT <= b[j].exitT) out.push(a[i++]);
	else out.push(b[j++]);
	return out;
}
var GUARD_OPTIONS = [
	0,
	.3,
	.6,
	1
];
function split(tape, splitT) {
	const is = [];
	const oos = [];
	for (const t of tape) if (t.exitT <= splitT) is.push(t);
	else if (t.entryT >= splitT) oos.push(t);
	return {
		is,
		oos
	};
}
function buildPortfolio(cands, o) {
	const gated = cands.map((c) => ({
		id: c.id,
		tape: gatedTrades(c.trades, c.bestN, o.gates)
	}));
	const isScore = (tape) => {
		const s = statsOf(split(tape, o.splitT).is, o.splitT);
		return {
			s,
			j: scoreStats(s, 8)
		};
	};
	const members = [];
	let combo = [];
	let cur = {
		s: statsOf([]),
		j: -Infinity
	};
	const used = /* @__PURE__ */ new Set();
	while (members.length < o.maxSize) {
		let best = -1;
		let bestRes = {
			s: cur.s,
			j: -Infinity
		};
		let bestTape = combo;
		for (let i = 0; i < gated.length; i++) {
			if (used.has(i) || gated[i].tape.length === 0) continue;
			const tape = mergeByExit(combo, gated[i].tape);
			const r = isScore(tape);
			if ((members.length === 0 ? r.j > 0 : r.j >= cur.j * (o.tolerance ?? .97) && r.s.gh >= cur.s.gh - (o.ghSlack ?? .02)) && (best < 0 || r.j > bestRes.j)) {
				best = i;
				bestRes = r;
				bestTape = tape;
			}
		}
		if (best < 0 || bestRes.j <= 0) break;
		used.add(best);
		members.push(best);
		combo = bestTape;
		cur = bestRes;
	}
	let guardPct = 0;
	let guardJ = cur.j;
	for (const g of GUARD_OPTIONS) {
		if (g === 0) continue;
		const r = isScore(applyHourGuard(combo, g));
		if (r.j > guardJ * 1.02) {
			guardJ = r.j;
			guardPct = g;
		}
	}
	const tape = applyHourGuard(combo, guardPct);
	const parts = split(tape, o.splitT);
	const hourly = [...hourlyNet(tape).entries()].sort((a, b) => a[0] - b[0]).map(([t, e]) => ({
		t,
		net: e.net,
		n: e.n
	}));
	return {
		members: members.map((i) => gated[i].id),
		guardPct,
		is: statsOf(parts.is, o.splitT),
		oos: statsOf(parts.oos, o.nowT),
		full: statsOf(tape, o.nowT),
		hourly,
		tape
	};
}
function makeUniverse(bars) {
	const ok = bars.filter((b) => b.n >= 120);
	let startT = Infinity;
	let endT = 0;
	let nowT = 0;
	let baseTf = Infinity;
	for (const b of ok) {
		startT = Math.min(startT, b.t[0]);
		endT = Math.max(endT, b.t[b.n - 1]);
		nowT = Math.max(nowT, b.t[b.n - 1] + b.tfMin * 6e4);
		baseTf = Math.min(baseTf, b.tfMin);
	}
	if (!ok.length) startT = endT = nowT = 0;
	return {
		bars: ok,
		caches: ok.map((b) => new SeriesCache(b)),
		startT,
		endT,
		splitT: startT + (endT - startT) / 2,
		nowT,
		baseTf: Number.isFinite(baseTf) ? baseTf : 5
	};
}
/**
* Series of the universe a combo runs on: a lane indication ("…@m15") only on its timeframe's series, a plain
* indication on every series.
*/
function seriesOf(u, ind) {
	const tf = laneOf(ind).tf;
	const out = [];
	for (let s = 0; s < u.bars.length; s++) if (tf === null || u.bars[s].tfMin === tf) out.push(s);
	return out;
}
/** The protect a lane actually trades: TP / SL / trail × √(tf / 15m), hold in the same time. Plain: unchanged. */
function laneProtect(p, ind) {
	const tf = laneOf(ind).tf;
	if (tf === null || tf === 15) return p;
	const k = Math.sqrt(tf / 15);
	const r4 = (x) => +(x * k).toFixed(4);
	const floor = (x, lo) => tf < 15 ? +Math.hypot(x, lo).toFixed(4) : x;
	return {
		...p,
		tp: floor(r4(p.tp), LANE_MIN.tp),
		sl: floor(r4(p.sl), LANE_MIN.sl),
		trail: p.trail > 0 ? floor(r4(p.trail), LANE_MIN.trail) : 0,
		hold: Math.max(2, Math.round(p.hold * 15 / tf))
	};
}
/** Floors of a short lane's scaled protect (fractions of price): target 3 × 0.2 % cost, stop, trail. */
var LANE_MIN = {
	tp: .006,
	sl: .005,
	trail: .0025
};
/**
* Main candidates with a share per timeframe lane: every lane gets floor(mainTop / lanes) of its best Base
* passers, so fast lanes (1m / 5m, lower scores) reach the continuous stages too; seats a lane cannot fill go to
* the best remaining passers of any lane. Returns "bot|ind" pairs.
*/
function mainByLane(passed, mainTop) {
	const byLane = /* @__PURE__ */ new Map();
	for (const r of passed) {
		const l = laneOf(r.ind);
		const k = l.tf === null ? "plain" : `${l.tf}${l.combined ? "c" : ""}`;
		let xs = byLane.get(k);
		if (!xs) byLane.set(k, xs = []);
		xs.push(r);
	}
	const out = /* @__PURE__ */ new Set();
	if (!byLane.size) return out;
	if (mainTop <= 0) {
		for (const r of passed) out.add(`${r.bot}|${r.ind}`);
		return out;
	}
	const quota = Math.floor(mainTop / byLane.size);
	for (const xs of byLane.values()) {
		xs.sort((a, b) => b.score - a.score);
		for (const r of xs.slice(0, quota)) out.add(`${r.bot}|${r.ind}`);
	}
	for (const r of [...passed].sort((a, b) => b.score - a.score)) {
		if (out.size >= mainTop) break;
		out.add(`${r.bot}|${r.ind}`);
	}
	return out;
}
/** True when the base bar opening at `baseOpenT` is the last base bar of a lane bar (the lane bar closes with it). */
var laneClosesWith = (baseOpenT, baseTf, laneTf) => (baseOpenT + baseTf * 6e4) % (laneTf * 6e4) === 0;
/** Timeframe lanes of every indication: independent per timeframe, combined where higher timeframes exist. */
function laneInds(base, tfs) {
	const out = [];
	for (const tf of tfs) {
		out.push(laneInd(base, tf));
		if (base !== "none" && higherFactors(tf, tfs.length ? tfs : TF_LADDER).length) out.push(laneInd(base, tf, true));
	}
	return out;
}
/**
* Base scores every combo once: its entry signal (and tactic-filtered copy) is dropped afterwards so the cache
* holds only the shared indicator series, not one signal per combo × series (memory stays bounded).
*/
function forgetCombo(u, bot, ind) {
	for (const s of seriesOf(u, ind)) {
		const k = u.caches[s];
		k.forgetSuffix(`combo:${bot}:${ind}`);
		k.forgetSuffix(`:${bot}:${ind}`);
	}
}
/** Base gate: a config set is evaluated and promoted to Main only with PF ≥ min PF, positive net and enough trades. */
function passesBase(st, g) {
	return st.n >= g.minTrades && st.net > 0 && st.pf >= g.minPf;
}
/** Every bot × indication combo; `focus` ("bot|indication" pairs) narrows it when non-empty. */
/**
* Every bot × indication combo. With `tfs`, every combo in each timeframe lane (independent and combined);
* without, plain indications (research tools on a single series). A focus pair "bot|ind" selects the combo in
* every lane; a lane pair "bot|ind@m15" selects that lane only.
*/
function allCombos(focus, disabledKinds, tfs) {
	const off = new Set(disabledKinds ?? []);
	const plain = [];
	for (const b of BOTS) {
		if (b.type !== "follow" && b.type !== "revert") plain.push({
			bot: b.type,
			ind: "none"
		});
		for (const ind of INDICATIONS) if (!off.has(ind.kind) && !ind.id.startsWith("sig-")) plain.push({
			bot: b.type,
			ind: ind.id
		});
	}
	const out = tfs?.length ? plain.flatMap((c) => laneInds(c.ind, tfs).map((ind) => ({
		bot: c.bot,
		ind
	}))) : plain;
	if (!focus?.length) return out;
	const f = new Set(focus);
	const narrowed = out.filter((c) => f.has(`${c.bot}|${c.ind}`) || f.has(`${c.bot}|${laneOf(c.ind).base}`));
	return narrowed.length ? narrowed : out;
}
var pct = (x) => Math.round(x * 1e4) / 100;
function configId(bot, ind, p, kind) {
	const base = `${bot}|${ind}|tp${pct(p.tp)}|sl${pct(p.sl)}|tr${pct(p.trail)}|h${p.hold}`;
	return kind === "dca" ? `${base}|dca` : kind === "dca-active" ? `${base}|dcaA` : kind === "axis" ? `${base}|axis` : base;
}
function kindOfId(id) {
	if (id.endsWith("|axis")) return "axis";
	if (id.endsWith("|dcaA")) return "dca-active";
	if (id.endsWith("|dca")) return "dca";
	return /\|tr0\|/.test(id) ? "normal" : "trailing";
}
var fromPct = (s) => +(Number(s) / 100).toFixed(6);
function parseConfigId(id) {
	const m = /^([a-z]+)\|([a-z0-9.@-]+)\|tp([\d.]+)\|sl([\d.]+)\|tr([\d.]+)\|h(\d+)(\|dcaA?|\|axis)?$/.exec(id);
	if (!m) return null;
	return {
		bot: m[1],
		ind: m[2],
		protect: {
			tp: fromPct(m[3]),
			sl: fromPct(m[4]),
			trail: fromPct(m[5]),
			hold: +m[6]
		}
	};
}
/** Per-symbol stats of a trade list (exit order): n, net, PF, max drawdown, positive 4-hour block share. */
function symStat(trades, nowT) {
	const st = statsOf(trades);
	let cum = 0;
	let peak = 0;
	let dd = 0;
	const blocks = /* @__PURE__ */ new Map();
	for (const x of trades) {
		cum += x.r * 100;
		if (cum > peak) peak = cum;
		if (peak - cum > dd) dd = peak - cum;
		const b = Math.floor(x.exitT / 144e5);
		blocks.set(b, (blocks.get(b) ?? 0) + x.r);
	}
	let ok = 0;
	for (const v of blocks.values()) if (v > 0) ok++;
	let recentN = 0;
	let recentNet = 0;
	if (nowT !== void 0) {
		for (const x of trades) if (x.exitT > nowT - 864e5) {
			recentN++;
			recentNet += x.r * 100;
		}
	}
	return {
		n: st.n,
		net: st.net,
		pf: st.pf,
		dd,
		okShare: blocks.size ? ok / blocks.size : 0,
		recentN,
		recentNet
	};
}
function runCombo(u, bot, ind, protect, cost, stage, tactics, laneScaled = false) {
	const gen = runComboSteps(u, bot, ind, protect, cost, stage, tactics, laneScaled);
	for (;;) {
		const r = gen.next();
		if (r.done) return r.value;
	}
}
/**
* One combo over its series, yielding after each series: a 1m lane over 50 symbols is too much work for one
* uninterrupted slice of the server's event loop.
*/
function* runComboSteps(u, bot, ind, protect, cost, stage, tactics, laneScaled = false) {
	const cooldown = tacticCooldown(tactics);
	if (!laneScaled) protect = laneProtect(protect, ind);
	const id = configId(bot, ind, protect);
	const trades = [];
	const open = [];
	const pending = [];
	const bySym = {};
	const series = seriesOf(u, ind);
	if (!series.length) return null;
	for (const s of series) {
		const sig = entrySignal(bot, ind, u.caches[s], tactics);
		if (!sig) return null;
		const res = simulate(id, u.bars[s], sig, protect, {
			cost,
			cooldown
		});
		for (const tr of res.trades) trades.push(tr);
		if (res.open) open.push(res.open);
		if (res.pending) pending.push({
			sym: u.bars[s].sym,
			side: res.pending
		});
		if (res.trades.length) bySym[u.bars[s].sym] = symStat(res.trades, u.nowT);
		yield;
	}
	trades.sort((a, b) => a.exitT - b.exitT || a.entryT - b.entryT);
	const isTrades = trades.filter((t) => t.exitT <= u.splitT);
	const is = statsOf(isTrades, u.splitT);
	return {
		id,
		bot,
		ind,
		protect,
		stage,
		trades,
		full: statsOf(trades, u.nowT),
		is,
		score: scoreStats(is, 8),
		bySym,
		open,
		pending
	};
}
function refineGrid() {
	const out = [];
	for (const tp of PROTECT_GRID.tp) for (const k of PROTECT_GRID.slOfTp) for (const trail of PROTECT_GRID.trail) for (const hold of PROTECT_GRID.hold) out.push({
		tp,
		sl: Math.round(tp * k * 1e4) / 1e4,
		trail: Math.round(tp * trail * 1e4) / 1e4,
		hold
	});
	return out;
}
var REFINE_GRID = refineGrid();
/** Strip bulky fields for storage in the S1 list. */
function slim(r) {
	return {
		...r,
		trades: [],
		open: [],
		pending: []
	};
}
function* runPipeline(u, s, pre) {
	const timings = {};
	const cost = s.cost;
	const g = s.gates;
	let t0 = performance.now();
	const combos = pre ? [] : [...allCombos(s.focus, s.disabledKinds, s.tfs), ...signalCombos(signalSettings(s.signals), s.tfs ?? [])];
	const s1 = pre ? [...pre.s1] : [];
	for (let i = 0; i < combos.length; i++) {
		const c = combos[i];
		const steps = runComboSteps(u, c.bot, c.ind, DEFAULT_PROTECT, cost, 1, s.tactics);
		let r = null;
		for (;;) {
			const x = steps.next();
			if (x.done) {
				r = x.value;
				break;
			}
			yield {
				stage: "S1",
				done: i,
				total: combos.length,
				label: `${c.bot} × ${c.ind}`
			};
		}
		if (r) s1.push(slim(r));
		forgetCombo(u, c.bot, c.ind);
		yield {
			stage: "S1",
			done: i + 1,
			total: combos.length,
			label: `${c.bot} × ${c.ind}`
		};
	}
	s1.sort((a, b) => b.score - a.score);
	timings.S1 = performance.now() - t0;
	t0 = performance.now();
	const leaders = s1.filter((r) => r.is.n >= 4 && !isSignalInd(r.ind)).slice(0, s.refineTop);
	const runs = /* @__PURE__ */ new Map();
	const s2 = [];
	const grid = REFINE_GRID;
	const total2 = leaders.length * grid.length;
	let done2 = 0;
	for (const L of leaders) for (const p of grid) {
		const steps = runComboSteps(u, L.bot, L.ind, p, cost, 2, s.tactics);
		let r = null;
		for (;;) {
			const x = steps.next();
			if (x.done) {
				r = x.value;
				break;
			}
			yield {
				stage: "S2",
				done: done2,
				total: total2,
				label: `${L.bot} × ${L.ind}`
			};
		}
		done2++;
		if (!r) continue;
		s2.push(r);
		yield {
			stage: "S2",
			done: done2,
			total: total2,
			label: r.id
		};
	}
	s2.sort((a, b) => b.score - a.score);
	timings.S2 = performance.now() - t0;
	t0 = performance.now();
	const perPair = /* @__PURE__ */ new Map();
	const chosen = [];
	for (const r of s2) {
		const k = `${r.bot}|${r.ind}`;
		const c = perPair.get(k) ?? 0;
		if (c >= 2) continue;
		perPair.set(k, c + 1);
		chosen.push(r);
		if (chosen.length >= s.evalTop) break;
	}
	const ranked = [];
	const tapes = /* @__PURE__ */ new Map();
	for (let i = 0; i < chosen.length; i++) {
		const r = chosen[i];
		const ln = optimizeLastN(r.id, r.trades, {
			gates: g,
			splitT: u.splitT,
			nowT: u.nowT
		});
		const ev = evaluateConfig(r.id, r.trades, {
			gates: g,
			nowT: u.nowT,
			bestN: ln.bestN
		});
		tapes.set(r.id, r.trades);
		runs.set(r.id, r);
		ranked.push({
			id: r.id,
			bot: r.bot,
			ind: r.ind,
			protect: r.protect,
			stage: 2,
			full: r.full,
			is: r.is,
			score: r.score,
			lastN: ln,
			evalRes: ev,
			rank: 0,
			armed: false
		});
		yield {
			stage: "S3",
			done: i + 1,
			total: chosen.length,
			label: r.id
		};
	}
	timings.S3 = performance.now() - t0;
	const finalScore = (x) => {
		const is = x.lastN ? scoreStats(x.lastN.is, 3) : 0;
		return (x.lastN && x.lastN.is.net > 0 && x.lastN.is.pf >= g.minPf ? 1 : 0) * 1e3 + is;
	};
	ranked.sort((a, b) => finalScore(b) - finalScore(a));
	ranked.forEach((x, i) => x.rank = i + 1);
	const portfolio = buildPortfolio(ranked.filter((x) => x.lastN && x.lastN.is.net > 0 && x.lastN.is.pf >= g.minPf).map((x) => ({
		id: x.id,
		trades: tapes.get(x.id) ?? [],
		bestN: x.lastN.bestN
	})), {
		gates: g,
		splitT: u.splitT,
		nowT: u.nowT,
		maxSize: s.armTop
	});
	const armed = portfolio.members;
	for (const x of ranked) x.armed = armed.includes(x.id);
	yield {
		stage: "S5",
		done: 1,
		total: 1,
		label: `${armed.length} armed`
	};
	return {
		at: Date.now(),
		universe: {
			symbols: u.bars.map((b) => b.sym),
			startT: u.startT,
			endT: u.endT,
			splitT: u.splitT,
			nowT: u.nowT,
			bars: u.bars.reduce((a, b) => a + b.n, 0)
		},
		s1,
		s2: s2.map(slim),
		ranked,
		tapes,
		runs,
		armed,
		portfolio,
		timings
	};
}
//#endregion
export { signalCandidates as a, allCombos, configId, forgetCombo, guardKey as i, kindOfId, laneClosesWith, laneProtect, mainByLane, makeUniverse, SignalGuard as n, signalCombos as o, parseConfigId, passesBase, activeSignals as r, runCombo, runPipeline, signalProtects as s, seriesOf, simulate as t };
