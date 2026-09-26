import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { availableParallelism } from "node:os";
import { Worker } from "node:worker_threads";
import { monitorEventLoopDelay } from "node:perf_hooks";
import { DatabaseSync } from "node:sqlite";
//#region src/core/config.ts
/** Round-trip position cost: 0.1% per side, doubled = 0.2% of notional per closed trade. */
var RT_COST = .002;
/** Base-stage protect (15m bars): 2.6% target, 1.5× stop, 8h max hold. Wide targets clear the 0.2% cost. */
var DEFAULT_PROTECT = {
	tp: .026,
	sl: .039,
	trail: 0,
	hold: 32
};
/** Main-stage refinement grid (fractions). SL is expressed relative to TP; trail relative to TP (0 = off). */
var PROTECT_GRID = {
	tp: [
		.018,
		.026,
		.035,
		.05
	],
	slOfTp: [1, 1.5],
	trail: [0, .4],
	hold: [12, 32]
};
/** Last-N candidates for the walk-forward gate. */
var LAST_N_GRID = [
	5,
	8,
	10,
	12,
	15,
	20,
	25,
	30,
	40,
	50,
	75,
	100
];
var DEFAULT_GATES = {
	minPf: 1.1,
	maxDdtH: 20,
	minTrades: 12,
	quorum: .6
};
/** Execution toggles. Intern (Base) calculations always cover every sub-strategy. */
var DEFAULT_TOGGLES = {
	normal: true,
	trailing: true,
	block: true,
	blockActive: true,
	dca: true,
	dcaActive: true,
	axis: true
};
/** Tactics are off by default; see docs/tactics.md for the measured effect of each one. */
var DEFAULT_TACTICS = {
	session: false,
	volRegime: false,
	trendStrength: false,
	cooldown: false,
	cooldownBars: 4
};
var DEFAULT_BLOCK = {
	ratio: .2,
	maxLevel: 6,
	minActiveLevel: 1,
	maxMult: 2.5
};
var DEFAULT_DCA = {
	levels: 2,
	step: .008
};
/** Axis: 3 legs 0.7 ATR apart toward the EMA-50 axis, entered at 0.35–2.6 ATR displacement (desk defaults). */
var DEFAULT_AXIS = {
	levels: 3,
	spacing: .7,
	ratio: 1,
	minDisp: .35,
	maxDisp: 2.6,
	center: 50
};
/** Continuous independent eval windows. */
var EVAL_TIME_WINDOWS_H = [
	1,
	4,
	12,
	24,
	72
];
var EVAL_TRADE_WINDOWS = [20, 50];
var DEFAULT_ADJUST = {
	enabled: true,
	window: 15,
	triggerPf: 1,
	recoverPf: 1.2,
	slStep: .002,
	slMax: .03,
	trailStep: .001,
	trailMax: .02,
	pauseH: 12,
	autoCost: true
};
/** Timeframe lanes the engine can process (minutes). */
var TF_CHOICES = [
	1,
	5,
	15,
	30
];
var DEFAULT_SETTINGS = {
	tfMin: 1,
	tfs: [
		1,
		5,
		15,
		30
	],
	tfDays: {
		"1": 3,
		"5": 8,
		"15": 18,
		"30": 18
	},
	historyDays: 18,
	symbols: 40,
	symbolRank: "volatility1h",
	cycleMs: 2e4,
	cost: RT_COST,
	fees: {
		taker: 5e-4,
		maker: 2e-4,
		slippage: 5e-4
	},
	adjust: DEFAULT_ADJUST,
	gates: DEFAULT_GATES,
	refineTop: 24,
	mainTop: 140,
	evalTop: 60,
	armTop: 10,
	paperNotional: 100,
	toggles: DEFAULT_TOGGLES,
	tactics: DEFAULT_TACTICS,
	focus: [],
	disabledKinds: [],
	block: DEFAULT_BLOCK,
	dca: DEFAULT_DCA,
	axis: DEFAULT_AXIS,
	grid: {
		tp: [
			.026,
			.035,
			.05,
			.07
		],
		slOfTp: [
			1,
			1.5,
			2,
			2.5
		],
		trailOfTp: [0, .5],
		minTrail: .006,
		minSl: .01,
		holdH: [8, 24],
		trailStep: 1,
		trailFree: false
	},
	live: {
		enabled: false,
		connId: "bingx-vst-02",
		notionalUsd: 6,
		maxPositions: 3,
		mode: "overall",
		ratio: 1,
		maxNotionalUsd: 30,
		rebalancePct: .25,
		marginMode: "cross",
		positionMode: "hedge"
	}
};
Array.from({ length: 10 }, (_, i) => Math.round((1.05 + i * .05) * 100) / 100);
Array.from({ length: 10 }, (_, i) => 2 + i * 2);
/** Named execution presets (toggles only; Base always computes everything). */
var STRATEGY_PRESETS = {
	"all-on": {
		label: "All on (no Active)",
		toggles: {
			normal: true,
			trailing: true,
			block: true,
			blockActive: false,
			dca: true,
			dcaActive: false,
			axis: false
		}
	},
	normal: {
		label: "Normal only",
		toggles: {
			normal: true,
			trailing: false,
			block: false,
			blockActive: false,
			dca: false,
			dcaActive: false,
			axis: false
		}
	},
	"normal-trailing": {
		label: "Normal + Trailing",
		toggles: {
			normal: true,
			trailing: true,
			block: false,
			blockActive: false,
			dca: false,
			dcaActive: false,
			axis: false
		}
	},
	trailing: {
		label: "Trailing only",
		toggles: {
			normal: false,
			trailing: true,
			block: false,
			blockActive: false,
			dca: false,
			dcaActive: false,
			axis: false
		}
	},
	block: {
		label: "Normal + Trailing + Block",
		toggles: {
			normal: true,
			trailing: true,
			block: true,
			blockActive: false,
			dca: false,
			dcaActive: false,
			axis: false
		}
	},
	"block-active": {
		label: "Block Active",
		toggles: {
			normal: true,
			trailing: true,
			block: true,
			blockActive: true,
			dca: false,
			dcaActive: false,
			axis: false
		}
	},
	"normal-off+block": {
		label: "Normal off, Block + DCA",
		toggles: {
			normal: false,
			trailing: true,
			block: true,
			blockActive: false,
			dca: true,
			dcaActive: false,
			axis: false
		}
	},
	dca: {
		label: "DCA only",
		toggles: {
			normal: false,
			trailing: false,
			block: false,
			blockActive: false,
			dca: true,
			dcaActive: false,
			axis: false
		}
	},
	"dca-active": {
		label: "DCA Active only",
		toggles: {
			normal: false,
			trailing: false,
			block: false,
			blockActive: false,
			dca: true,
			dcaActive: true,
			axis: false
		}
	},
	"trailing+block-active": {
		label: "Normal off · Trailing + Block Active",
		toggles: {
			normal: false,
			trailing: true,
			block: true,
			blockActive: true,
			dca: false,
			dcaActive: false,
			axis: false
		}
	},
	"normal+dca-active": {
		label: "Normal + DCA Active",
		toggles: {
			normal: true,
			trailing: false,
			block: false,
			blockActive: false,
			dca: true,
			dcaActive: true,
			axis: false
		}
	},
	"trailing+dca": {
		label: "Normal off · Trailing + DCA",
		toggles: {
			normal: false,
			trailing: true,
			block: false,
			blockActive: false,
			dca: true,
			dcaActive: false,
			axis: false
		}
	},
	"normal-trailing+block-active": {
		label: "Normal + Trailing + Block Active",
		toggles: {
			normal: true,
			trailing: true,
			block: true,
			blockActive: true,
			dca: false,
			dcaActive: false,
			axis: false
		}
	},
	axis: {
		label: "Axis only",
		toggles: {
			normal: false,
			trailing: false,
			block: false,
			blockActive: false,
			dca: false,
			dcaActive: false,
			axis: true
		}
	},
	"normal+axis": {
		label: "Normal + Axis",
		toggles: {
			normal: true,
			trailing: false,
			block: false,
			blockActive: false,
			dca: false,
			dcaActive: false,
			axis: true
		}
	},
	"trailing+axis": {
		label: "Normal off · Trailing + Axis",
		toggles: {
			normal: false,
			trailing: true,
			block: false,
			blockActive: false,
			dca: false,
			dcaActive: false,
			axis: true
		}
	},
	"all-on+axis": {
		label: "All on + Axis (no Active)",
		toggles: {
			normal: true,
			trailing: true,
			block: true,
			blockActive: false,
			dca: true,
			dcaActive: false,
			axis: true
		}
	},
	"block-active+dca-active": {
		label: "Block Active + DCA Active",
		toggles: {
			normal: true,
			trailing: true,
			block: true,
			blockActive: true,
			dca: true,
			dcaActive: true,
			axis: false
		}
	}
};
//#endregion
//#region src/core/indications/filters.ts
function keep(sig, pass) {
	const out = new Int8Array(sig.length);
	for (let i = 0; i < sig.length; i++) if (sig[i] !== 0 && pass(i, sig[i])) out[i] = sig[i];
	return out;
}
/** Rolling percentile rank (0..1) of x[i] within the previous `p` values (causal). */
function pctRank(k, key, x, p) {
	return k.memo(`rank:${key}:${p}`, () => {
		const out = new Float64Array(x.length).fill(NaN);
		for (let i = p; i < x.length; i++) {
			const v = x[i];
			if (!Number.isFinite(v)) continue;
			let below = 0;
			let cnt = 0;
			for (let j = i - p; j < i; j++) {
				const w = x[j];
				if (!Number.isFinite(w)) continue;
				cnt++;
				if (w < v) below++;
			}
			if (cnt > p / 2) out[i] = below / cnt;
		}
		return out;
	});
}
function natr(k) {
	return k.memo("natr14", () => {
		const a = k.atr(14);
		const out = new Float64Array(a.length);
		for (let i = 0; i < a.length; i++) out[i] = a[i] / k.b.c[i];
		return out;
	});
}
/** Reference (e.g. BTC) trend state aligned to this symbol's bars by time: +1 above EMA(p), -1 below. */
function refTrend(k, ref, p) {
	return k.memo(`reftrend:${ref.b.sym}:${p}`, () => {
		const e = ref.ema(p);
		const out = new Int8Array(k.b.n);
		let j = 0;
		for (let i = 0; i < k.b.n; i++) {
			const t = k.b.t[i];
			while (j + 1 < ref.b.n && ref.b.t[j + 1] <= t) j++;
			if (ref.b.t[j] > t || !Number.isFinite(e[j])) continue;
			out[i] = ref.b.c[j] > e[j] ? 1 : ref.b.c[j] < e[j] ? -1 : 0;
		}
		return out;
	});
}
var HOUR$1 = 36e5;
var FILTERS = {
	none: (s) => s,
	adx20: (s, k) => keep(s, (i) => k.dmi(14).adx[i] >= 20),
	adx25: (s, k) => keep(s, (i) => k.dmi(14).adx[i] >= 25),
	adxLo20: (s, k) => keep(s, (i) => k.dmi(14).adx[i] < 20),
	htf: (s, k) => keep(s, (i, d) => (k.b.c[i] - k.ema(200)[i]) * d > 0),
	htfAgainst: (s, k) => keep(s, (i, d) => (k.b.c[i] - k.ema(200)[i]) * d < 0),
	slope50: (s, k) => keep(s, (i, d) => i >= 10 && (k.ema(50)[i] - k.ema(50)[i - 10]) * d > 0),
	volHi: (s, k) => keep(s, (i) => pctRank(k, "natr", natr(k), 336)[i] >= .5),
	volLo: (s, k) => keep(s, (i) => pctRank(k, "natr", natr(k), 336)[i] < .5),
	volume: (s, k) => keep(s, (i) => k.b.v[i] > 1.5 * k.volSma(20)[i]),
	quiet: (s, k) => keep(s, (i) => k.b.v[i] < k.volSma(20)[i]),
	euUs: (s, k) => keep(s, (i) => {
		const h = Math.floor(k.b.t[i] % 864e5 / HOUR$1);
		return h >= 7 && h < 21;
	}),
	asia: (s, k) => keep(s, (i) => {
		const h = Math.floor(k.b.t[i] % 864e5 / HOUR$1);
		return h < 7 || h >= 21;
	}),
	stretch2: (s, k) => keep(s, (i) => Math.abs(k.b.c[i] - k.ema(50)[i]) < 2 * k.atr(14)[i]),
	rsiRoom: (s, k) => keep(s, (i, d) => d > 0 ? k.rsi(14)[i] < 65 : k.rsi(14)[i] > 35),
	btc: (s, k, ref) => ref ? keep(s, (i, d) => refTrend(k, ref, 50)[i] === d) : s,
	btcAgainst: (s, k, ref) => ref ? keep(s, (i, d) => refTrend(k, ref, 50)[i] === -d) : s
};
Object.keys(FILTERS);
function applyFilter(id, sig, k, ref) {
	const f = FILTERS[id];
	if (!f) throw new Error(`unknown filter ${id}`);
	return f(sig, k, ref);
}
/** Stable key of the active signal tactics ("" = none) — part of every memo key. */
function tacticKey(t) {
	if (!t) return "";
	return [
		t.session && "euUs",
		t.volRegime && "volHi",
		t.trendStrength && "adx20"
	].filter(Boolean).join("+");
}
/** Extra history (bars) the active tactics need before their first valid signal. */
function tacticWarmupBars(t) {
	return t?.volRegime ? 356 : t?.trendStrength ? 40 : 0;
}
/** Cooldown bars after an exit (0 = off). */
function tacticCooldown(t) {
	return t?.cooldown ? Math.max(0, Math.round(t.cooldownBars)) : 0;
}
/** A combo signal after the active tactics. Memoized per symbol cache. */
function withTactics(sig, k, key, memoKey) {
	if (!key) return sig;
	return k.memo(`tac:${key}:${memoKey}`, () => key.split("+").reduce((x, id) => applyFilter(id, x, k), sig));
}
//#endregion
//#region src/core/metrics/stats.ts
var H$5 = 36e5;
function profitFactor(gp, gl) {
	if (gl <= 0) return gp > 0 ? 4 : 0;
	return gp / gl;
}
var EMPTY_STATS = Object.freeze({
	n: 0,
	wins: 0,
	losses: 0,
	wr: 0,
	pf: 0,
	net: 0,
	avg: 0,
	gp: 0,
	gl: 0,
	mdd: 0,
	ddt: 0,
	ddtNow: 0,
	expectancy: 0,
	sqn: 0,
	recovery: 0,
	avgHoldMin: 0,
	firstT: 0,
	lastT: 0,
	hours: 0,
	greenHours: 0,
	gh: 0,
	tph: 0,
	worstHour: 0
});
/** Net per clock hour (by exit time), percent. exitT is the exit bar's END, so an exit at 10:00 belongs to 09:xx. */
function hourlyNet(trades) {
	const m = /* @__PURE__ */ new Map();
	for (const t of trades) {
		const k = Math.floor((t.exitT - 1) / H$5) * H$5;
		const e = m.get(k);
		if (e) {
			e.net += t.r * 100;
			e.n++;
		} else m.set(k, {
			net: t.r * 100,
			n: 1
		});
	}
	return m;
}
/**
* Stats over trades in exit order. The equity curve is the cumulative sum of `r` (one notional per trade).
* DDT = longest time (hours) from a curve peak until the curve regains it; an unrecovered drawdown counts
* up to `nowT` (defaults to the last exit).
*/
function statsOf(trades, nowT) {
	const n = trades.length;
	if (n === 0) return { ...EMPTY_STATS };
	let gp = 0;
	let gl = 0;
	let wins = 0;
	let sum = 0;
	let sum2 = 0;
	let hold = 0;
	let cum = 0;
	let peak = 0;
	let peakT = trades[0].entryT;
	let dipped = false;
	let mdd = 0;
	let ddt = 0;
	let firstT = Infinity;
	for (let i = 0; i < n; i++) {
		const tr = trades[i];
		const r = tr.r;
		if (r > 0) {
			gp += r;
			wins++;
		} else gl -= r;
		sum += r;
		sum2 += r * r;
		hold += tr.exitT - tr.entryT;
		if (tr.entryT < firstT) firstT = tr.entryT;
		cum += r;
		if (cum < peak) {
			dipped = true;
			if (peak - cum > mdd) mdd = peak - cum;
		} else {
			if (dipped && tr.exitT - peakT > ddt) ddt = tr.exitT - peakT;
			dipped = false;
			peak = cum;
			peakT = tr.exitT;
		}
	}
	const lastT = trades[n - 1].exitT;
	const ddtNow = dipped ? Math.max(nowT ?? lastT, lastT) - peakT : 0;
	if (ddtNow > ddt) ddt = ddtNow;
	const avg = sum / n;
	const variance = n > 1 ? Math.max(0, (sum2 - n * avg * avg) / (n - 1)) : 0;
	const sd = Math.sqrt(variance);
	const net = sum * 100;
	const hn = hourlyNet(trades);
	let greenHours = 0;
	let worstHour = 0;
	for (const e of hn.values()) {
		if (e.net > 0) greenHours++;
		if (e.net < worstHour) worstHour = e.net;
	}
	return {
		n,
		wins,
		losses: n - wins,
		wr: wins / n,
		pf: profitFactor(gp, gl),
		net,
		avg: avg * 100,
		gp: gp * 100,
		gl: gl * 100,
		mdd: mdd * 100,
		ddt: ddt / H$5,
		ddtNow: ddtNow / H$5,
		expectancy: avg * 100,
		sqn: sd > 0 ? avg / sd * Math.sqrt(Math.min(n, 100)) : 0,
		recovery: mdd > 0 ? sum / mdd : sum > 0 ? 4 : 0,
		avgHoldMin: hold / n / 6e4,
		firstT,
		lastT,
		hours: hn.size,
		greenHours,
		gh: hn.size ? greenHours / hn.size : 0,
		tph: hn.size ? n / hn.size : 0,
		worstHour
	};
}
/**
* Composite rank score. Rewards net, PF, green-hour ratio and order count; penalises MDD and DDT.
* Needs a minimum sample.
*/
function scoreStats(s, minTrades = 8) {
	if (s.n < minTrades || s.net <= 0) return Math.min(0, s.net) - (s.n < minTrades ? 1 : 0);
	const pf = Math.min(s.pf, 3);
	const sample = Math.sqrt(Math.min(s.n, 1e3) / 20);
	const hourly = (.35 + s.gh) ** 2;
	return s.net * (pf - .8) * sample * hourly / (1 + s.mdd / 4) / (1 + s.ddt / 48);
}
//#endregion
//#region src/core/adjust.ts
var kindOf = (cfg) => cfg.endsWith("|axis") ? "axis" : cfg.endsWith("|dcaA") ? "dca-active" : cfg.endsWith("|dca") ? "dca" : /\|tr0\|/.test(cfg) ? "normal" : "trailing";
/** "bot|ind|kind" of a config id. */
function setKeyOf(cfg) {
	const [bot, ind] = cfg.split("|");
	return `${bot}|${ind}|${kindOf(cfg)}`;
}
function evaluateAdjust(prev, trades, a, base, costExcess, now = Date.now()) {
	const state = { ...prev };
	const changed = [];
	const bySet = /* @__PURE__ */ new Map();
	for (const t of trades) {
		const k = setKeyOf(t.cfg);
		(bySet.get(k) ?? bySet.set(k, []).get(k)).push({
			r: t.r,
			exitT: t.exitT
		});
	}
	const levels = Math.max(1, Math.ceil(Math.max((a.slMax - base.minSl) / Math.max(a.slStep, 1e-9), (a.trailMax - base.minTrail) / Math.max(a.trailStep, 1e-9))));
	for (const [set, xs] of bySet) {
		xs.sort((x, y) => x.exitT - y.exitT);
		const w = xs.slice(-a.window);
		if (w.length < a.window) continue;
		const last = w[w.length - 1].exitT;
		const cur = state[set] ?? {
			set,
			level: 0,
			minSl: base.minSl,
			minTrail: base.minTrail,
			pausedUntil: 0,
			pf: 0,
			n: 0,
			lastExitT: 0,
			at: 0,
			note: ""
		};
		if (last <= cur.lastExitT) continue;
		let gp = 0;
		let gl = 0;
		for (const x of w) {
			const r = x.r - costExcess;
			if (r > 0) gp += r;
			else gl -= r;
		}
		const pf = profitFactor(gp, gl);
		const next = {
			...cur,
			pf,
			n: w.length,
			lastExitT: last,
			at: now
		};
		if (pf < a.triggerPf) {
			if (cur.level < levels) {
				next.level = cur.level + 1;
				next.note = `PF ${pf.toFixed(2)} < ${a.triggerPf} → wider SL / trail (level ${next.level})`;
			} else {
				next.pausedUntil = now + a.pauseH * 36e5;
				next.note = `PF ${pf.toFixed(2)} at the caps → paused ${a.pauseH} h`;
			}
		} else if (pf >= a.recoverPf && cur.level > 0) {
			next.level = cur.level - 1;
			next.note = `PF ${pf.toFixed(2)} ≥ ${a.recoverPf} → step back (level ${next.level})`;
		} else next.note = `PF ${pf.toFixed(2)} — unchanged`;
		next.minSl = Math.min(a.slMax, base.minSl + next.level * a.slStep);
		next.minTrail = Math.min(a.trailMax, base.minTrail + next.level * a.trailStep);
		if (next.level !== cur.level || next.pausedUntil !== cur.pausedUntil) changed.push(set);
		state[set] = next;
	}
	return {
		state,
		changed
	};
}
/** A protect with the set's adjusted minimum stop / trailing distance. */
function adjustProtect(p, adj) {
	if (!adj) return p;
	return {
		...p,
		sl: +Math.max(p.sl, adj.minSl).toFixed(4),
		trail: p.trail > 0 ? +Math.max(p.trail, adj.minTrail).toFixed(4) : 0
	};
}
/** Sets paused right now. */
function pausedSets(state, now = Date.now()) {
	const out = /* @__PURE__ */ new Set();
	for (const s of Object.values(state ?? {})) if (s.pausedUntil > now) out.add(s.set);
	return out;
}
//#endregion
//#region src/core/prehist.ts
function prehistStats(trades, startT, endT) {
	const sorted = [...trades].sort((a, b) => a.exitT - b.exitT);
	const st = statsOf(sorted);
	const span = Math.max(1, endT - startT);
	let openTime = 0;
	const ev = [];
	for (const t of sorted) {
		const a = Math.max(startT, t.entryT);
		const b = Math.min(endT, t.exitT);
		if (b > a) openTime += b - a;
		ev.push([t.entryT, 1], [t.exitT, -1]);
	}
	ev.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
	let cur = 0;
	let maxOpen = 0;
	for (const [, d] of ev) {
		cur += d;
		if (cur > maxOpen) maxOpen = cur;
	}
	const bySym = /* @__PURE__ */ new Map();
	for (const t of sorted) {
		const e = bySym.get(t.sym) ?? {
			n: 0,
			gp: 0,
			gl: 0,
			net: 0
		};
		e.n++;
		e.net += t.r * 100;
		if (t.r > 0) e.gp += t.r;
		else e.gl -= t.r;
		bySym.set(t.sym, e);
	}
	return {
		pf: st.pf,
		ddtH: st.ddt,
		n: st.n,
		wr: st.wr,
		greenHours: st.gh,
		net: st.net,
		avgOpen: openTime / span,
		maxOpen,
		perSymbol: [...bySym.entries()].map(([sym, e]) => ({
			sym,
			n: e.n,
			pf: profitFactor(e.gp, e.gl),
			net: e.net
		})).sort((a, b) => b.n - a.n)
	};
}
//#endregion
//#region src/core/server/pool.server.ts
var WORKER_URL = process.env.CTS_CORE_WORKER ? pathToFileURL(process.env.CTS_CORE_WORKER) : new URL("./tapes.worker.ts", import.meta.url);
function workersAvailable() {
	try {
		return WORKER_URL.protocol === "file:" && existsSync(fileURLToPath(WORKER_URL)) && process.env.CTS_CORE_WORKERS !== "0";
	} catch {
		return false;
	}
}
function poolSize() {
	const env = Number(process.env.CTS_CORE_WORKERS);
	if (Number.isInteger(env) && env > 0) return env;
	return Math.max(1, Math.min(8, availableParallelism() - 1));
}
/** Run each message on its own worker (at most `size` at once); resolves the replies in message order. */
async function runOnWorkers(messages, size = poolSize(), timeoutMs = 9e5) {
	const out = new Array(messages.length);
	let next = 0;
	const one = () => new Promise((resolve, reject) => {
		const w = new Worker(WORKER_URL, {
			execArgv: ["--experimental-strip-types", "--no-warnings"],
			resourceLimits: { maxOldGenerationSizeMb: 4096 }
		});
		const timer = setTimeout(() => {
			w.terminate();
			reject(/* @__PURE__ */ new Error("worker timed out"));
		}, timeoutMs);
		const run = () => {
			if (next >= messages.length) {
				clearTimeout(timer);
				w.terminate();
				resolve();
				return;
			}
			const i = next++;
			w.once("message", (m) => {
				if (!m.ok) {
					clearTimeout(timer);
					w.terminate();
					reject(new Error(m.error ?? "worker failed"));
					return;
				}
				out[i] = m;
				run();
			});
			w.postMessage({
				...messages[i],
				id: i
			});
		};
		w.once("error", (e) => {
			clearTimeout(timer);
			reject(e);
		});
		run();
	});
	await Promise.all(Array.from({ length: Math.min(size, messages.length) }, one));
	return out;
}
/** Split a list into `k` contiguous slices (order preserved). */
function slices(xs, k) {
	const n = Math.max(1, Math.min(k, xs.length));
	const out = [];
	for (let i = 0; i < n; i++) out.push(xs.slice(Math.floor(i * xs.length / n), Math.floor((i + 1) * xs.length / n)));
	return out.filter((s) => s.length);
}
//#endregion
//#region src/core/presets.research.ts
var RESEARCH_PRESETS = [
	{
		id: "mx-robust-none-std-ln12-trailing",
		label: "robust 1h+4h set · Trailing only · last-N 12",
		info: "Worst period PF 1.10 over three separate periods of real 1h data (the 2024 period was never used for any selection). robust 1h+4h set: 12 bot × indication pairs, fixed selection, execution “Trailing only”.",
		kind: "research",
		at: 1790444372242,
		settings: {
			tfMin: 60,
			historyDays: 35,
			focus: [
				"follow|rsi-mom-14-15",
				"follow|rsi-mom-21-20",
				"follow|rsi-mom-21-25",
				"follow|bb-walk@x4",
				"follow|break-vol-2@x4",
				"follow|break-vol@x4",
				"follow|break-atr-2@x4",
				"follow|act-burst-2.5@x4",
				"revert|act-chop@x4",
				"revert|cci-14-200@x4",
				"revert|cci-40-200@x4",
				"revert|z-50-2.5@x4"
			],
			grid: {
				tp: [
					.03,
					.05,
					.08
				],
				slOfTp: [1, 2],
				trailOfTp: [0, .5],
				minTrail: .006,
				minSl: .01,
				holdH: [16, 24]
			},
			tactics: {
				session: false,
				volRegime: false,
				trendStrength: false,
				cooldown: false,
				cooldownBars: 4
			},
			block: {
				ratio: .2,
				maxLevel: 6,
				minActiveLevel: 1,
				maxMult: 2.5
			},
			dca: {
				levels: 2,
				step: .02
			},
			toggles: {
				normal: true,
				trailing: true,
				block: false,
				blockActive: false,
				dca: false,
				dcaActive: false,
				axis: false
			}
		},
		wf: {
			preH: 20,
			simH: 48,
			longH: 336,
			stepH: 1,
			mode: "fixed",
			maxPerSymbol: 2,
			portfolio: 16,
			lastN: 12
		},
		metrics: {
			pf: 1.168,
			n: 2927,
			perDay: 8.363,
			wr: .569,
			net: 652.243,
			greenHours: .558,
			greenDays: .457,
			positiveRuns: 71,
			runs: 175,
			ddtH: 3144,
			checks: [
				{
					period: "2025-10-11 → 2026-09-26",
					label: "research year",
					pf: 1.168,
					n: 2927,
					perDay: 8.363,
					greenHours: .558,
					wr: .569,
					positiveRuns: 71,
					runs: 175
				},
				{
					period: "2024-10-11 → 2025-09-26",
					label: "prior year",
					pf: 1.097,
					n: 3144,
					perDay: 8.983,
					greenHours: .547,
					wr: .583,
					positiveRuns: 72,
					runs: 175
				},
				{
					period: "2024-05-12 → 2024-09-25",
					label: "2024 (never selected on)",
					pf: 1.114,
					n: 1284,
					perDay: 9.441,
					greenHours: .519,
					wr: .569,
					positiveRuns: 24,
					runs: 68
				}
			],
			oot: {
				period: "2024-05-12 → 2024-09-25",
				pf: 1.114,
				n: 1284,
				perDay: 9.441,
				greenHours: .519,
				wr: .569
			},
			period: "2025-10-11 → 2026-09-26",
			source: "complete causal 48h walk-forward runs over each period, 40 symbols, 1h bars, 0.2% round-trip cost (docs/matrix.md, docs/matrix/robust-none-std-ln12.*)"
		}
	},
	{
		id: "mx-mom-none-std-ln12-block-active+dca-active",
		label: "RSI momentum · Block Active + DCA Active · last-N 12",
		info: "Worst period PF 1.03 over three separate periods of real 1h data (the 2024 period was never used for any selection). RSI momentum: 7 bot × indication pairs, fixed selection, execution “Block Active + DCA Active”.",
		kind: "research",
		at: 1790444372244,
		settings: {
			tfMin: 60,
			historyDays: 35,
			focus: [
				"follow|rsi-mom-10-25",
				"follow|rsi-mom-14-15",
				"follow|rsi-mom-14-20",
				"follow|rsi-mom-14-25",
				"follow|rsi-mom-21-15",
				"follow|rsi-mom-21-20",
				"follow|rsi-mom-21-25"
			],
			grid: {
				tp: [
					.03,
					.05,
					.08
				],
				slOfTp: [1, 2],
				trailOfTp: [0, .5],
				minTrail: .006,
				minSl: .01,
				holdH: [16, 24]
			},
			tactics: {
				session: false,
				volRegime: false,
				trendStrength: false,
				cooldown: false,
				cooldownBars: 4
			},
			block: {
				ratio: .2,
				maxLevel: 6,
				minActiveLevel: 1,
				maxMult: 2.5
			},
			dca: {
				levels: 2,
				step: .02
			},
			toggles: {
				normal: true,
				trailing: true,
				block: true,
				blockActive: true,
				dca: true,
				dcaActive: true,
				axis: false
			}
		},
		wf: {
			preH: 20,
			simH: 48,
			longH: 336,
			stepH: 1,
			mode: "fixed",
			maxPerSymbol: 2,
			portfolio: 16,
			lastN: 12
		},
		metrics: {
			pf: 1.034,
			n: 2455,
			perDay: 7.014,
			wr: .488,
			net: 264.47,
			greenHours: .499,
			greenDays: .393,
			positiveRuns: 55,
			runs: 175,
			ddtH: 5580,
			checks: [
				{
					period: "2025-10-11 → 2026-09-26",
					label: "research year",
					pf: 1.034,
					n: 2455,
					perDay: 7.014,
					greenHours: .499,
					wr: .488,
					positiveRuns: 55,
					runs: 175
				},
				{
					period: "2024-10-11 → 2025-09-26",
					label: "prior year",
					pf: 1.037,
					n: 3026,
					perDay: 8.646,
					greenHours: .505,
					wr: .532,
					positiveRuns: 64,
					runs: 175
				},
				{
					period: "2024-05-12 → 2024-09-25",
					label: "2024 (never selected on)",
					pf: 1.047,
					n: 1116,
					perDay: 8.206,
					greenHours: .507,
					wr: .569,
					positiveRuns: 23,
					runs: 68
				}
			],
			oot: {
				period: "2024-05-12 → 2024-09-25",
				pf: 1.047,
				n: 1116,
				perDay: 8.206,
				greenHours: .507,
				wr: .569
			},
			period: "2025-10-11 → 2026-09-26",
			source: "complete causal 48h walk-forward runs over each period, 40 symbols, 1h bars, 0.2% round-trip cost (docs/matrix.md, docs/matrix/mom-none-std-ln12.*)"
		}
	},
	{
		id: "mx-mom-none-strong-ln12-block-active",
		label: "RSI momentum · Block Active · last-N 12 · strong Block/DCA",
		info: "Worst period PF 1.03 over three separate periods of real 1h data (the 2024 period was never used for any selection). RSI momentum: 7 bot × indication pairs, fixed selection, execution “Block Active”.",
		kind: "research",
		at: 1790444372244,
		settings: {
			tfMin: 60,
			historyDays: 35,
			focus: [
				"follow|rsi-mom-10-25",
				"follow|rsi-mom-14-15",
				"follow|rsi-mom-14-20",
				"follow|rsi-mom-14-25",
				"follow|rsi-mom-21-15",
				"follow|rsi-mom-21-20",
				"follow|rsi-mom-21-25"
			],
			grid: {
				tp: [
					.03,
					.05,
					.08
				],
				slOfTp: [1, 2],
				trailOfTp: [0, .5],
				minTrail: .006,
				minSl: .01,
				holdH: [16, 24]
			},
			tactics: {
				session: false,
				volRegime: false,
				trendStrength: false,
				cooldown: false,
				cooldownBars: 4
			},
			block: {
				ratio: .5,
				maxLevel: 6,
				minActiveLevel: 2,
				maxMult: 3
			},
			dca: {
				levels: 3,
				step: .035
			},
			toggles: {
				normal: true,
				trailing: true,
				block: true,
				blockActive: true,
				dca: false,
				dcaActive: false,
				axis: false
			}
		},
		wf: {
			preH: 20,
			simH: 48,
			longH: 336,
			stepH: 1,
			mode: "fixed",
			maxPerSymbol: 2,
			portfolio: 16,
			lastN: 12
		},
		metrics: {
			pf: 1.044,
			n: 2917,
			perDay: 8.334,
			wr: .523,
			net: 580.355,
			greenHours: .516,
			greenDays: .392,
			positiveRuns: 55,
			runs: 175,
			ddtH: 6258,
			checks: [
				{
					period: "2025-10-11 → 2026-09-26",
					label: "research year",
					pf: 1.044,
					n: 2917,
					perDay: 8.334,
					greenHours: .516,
					wr: .523,
					positiveRuns: 55,
					runs: 175
				},
				{
					period: "2024-10-11 → 2025-09-26",
					label: "prior year",
					pf: 1.032,
					n: 3094,
					perDay: 8.84,
					greenHours: .514,
					wr: .546,
					positiveRuns: 57,
					runs: 175
				},
				{
					period: "2024-05-12 → 2024-09-25",
					label: "2024 (never selected on)",
					pf: 1.063,
					n: 1216,
					perDay: 8.941,
					greenHours: .486,
					wr: .568,
					positiveRuns: 19,
					runs: 68
				}
			],
			oot: {
				period: "2024-05-12 → 2024-09-25",
				pf: 1.063,
				n: 1216,
				perDay: 8.941,
				greenHours: .486,
				wr: .568
			},
			period: "2025-10-11 → 2026-09-26",
			source: "complete causal 48h walk-forward runs over each period, 40 symbols, 1h bars, 0.2% round-trip cost (docs/matrix.md, docs/matrix/mom-none-strong-ln12.*)"
		}
	},
	{
		id: "mx-mom-none-std-ln12-block",
		label: "RSI momentum · Normal + Trailing + Block · last-N 12",
		info: "Worst period PF 1.03 over three separate periods of real 1h data (the 2024 period was never used for any selection). RSI momentum: 7 bot × indication pairs, fixed selection, execution “Normal + Trailing + Block”.",
		kind: "research",
		at: 1790444372244,
		settings: {
			tfMin: 60,
			historyDays: 35,
			focus: [
				"follow|rsi-mom-10-25",
				"follow|rsi-mom-14-15",
				"follow|rsi-mom-14-20",
				"follow|rsi-mom-14-25",
				"follow|rsi-mom-21-15",
				"follow|rsi-mom-21-20",
				"follow|rsi-mom-21-25"
			],
			grid: {
				tp: [
					.03,
					.05,
					.08
				],
				slOfTp: [1, 2],
				trailOfTp: [0, .5],
				minTrail: .006,
				minSl: .01,
				holdH: [16, 24]
			},
			tactics: {
				session: false,
				volRegime: false,
				trendStrength: false,
				cooldown: false,
				cooldownBars: 4
			},
			block: {
				ratio: .2,
				maxLevel: 6,
				minActiveLevel: 1,
				maxMult: 2.5
			},
			dca: {
				levels: 2,
				step: .02
			},
			toggles: {
				normal: true,
				trailing: true,
				block: true,
				blockActive: false,
				dca: false,
				dcaActive: false,
				axis: false
			}
		},
		wf: {
			preH: 20,
			simH: 48,
			longH: 336,
			stepH: 1,
			mode: "fixed",
			maxPerSymbol: 2,
			portfolio: 16,
			lastN: 12
		},
		metrics: {
			pf: 1.03,
			n: 3180,
			perDay: 9.086,
			wr: .513,
			net: 292.274,
			greenHours: .511,
			greenDays: .396,
			positiveRuns: 60,
			runs: 175,
			ddtH: 6259,
			checks: [
				{
					period: "2025-10-11 → 2026-09-26",
					label: "research year",
					pf: 1.03,
					n: 3180,
					perDay: 9.086,
					greenHours: .511,
					wr: .513,
					positiveRuns: 60,
					runs: 175
				},
				{
					period: "2024-10-11 → 2025-09-26",
					label: "prior year",
					pf: 1.031,
					n: 3362,
					perDay: 9.606,
					greenHours: .517,
					wr: .547,
					positiveRuns: 64,
					runs: 175
				},
				{
					period: "2024-05-12 → 2024-09-25",
					label: "2024 (never selected on)",
					pf: 1.058,
					n: 1323,
					perDay: 9.728,
					greenHours: .477,
					wr: .556,
					positiveRuns: 21,
					runs: 68
				}
			],
			oot: {
				period: "2024-05-12 → 2024-09-25",
				pf: 1.058,
				n: 1323,
				perDay: 9.728,
				greenHours: .477,
				wr: .556
			},
			period: "2025-10-11 → 2026-09-26",
			source: "complete causal 48h walk-forward runs over each period, 40 symbols, 1h bars, 0.2% round-trip cost (docs/matrix.md, docs/matrix/mom-none-std-ln12.*)"
		}
	},
	{
		id: "mx-mom-none-std-ln12-all-on",
		label: "RSI momentum · All on (no Active) · last-N 12",
		info: "Worst period PF 1.03 over three separate periods of real 1h data (the 2024 period was never used for any selection). RSI momentum: 7 bot × indication pairs, fixed selection, execution “All on (no Active)”.",
		kind: "research",
		at: 1790444372244,
		settings: {
			tfMin: 60,
			historyDays: 35,
			focus: [
				"follow|rsi-mom-10-25",
				"follow|rsi-mom-14-15",
				"follow|rsi-mom-14-20",
				"follow|rsi-mom-14-25",
				"follow|rsi-mom-21-15",
				"follow|rsi-mom-21-20",
				"follow|rsi-mom-21-25"
			],
			grid: {
				tp: [
					.03,
					.05,
					.08
				],
				slOfTp: [1, 2],
				trailOfTp: [0, .5],
				minTrail: .006,
				minSl: .01,
				holdH: [16, 24]
			},
			tactics: {
				session: false,
				volRegime: false,
				trendStrength: false,
				cooldown: false,
				cooldownBars: 4
			},
			block: {
				ratio: .2,
				maxLevel: 6,
				minActiveLevel: 1,
				maxMult: 2.5
			},
			dca: {
				levels: 2,
				step: .02
			},
			toggles: {
				normal: true,
				trailing: true,
				block: true,
				blockActive: false,
				dca: true,
				dcaActive: false,
				axis: false
			}
		},
		wf: {
			preH: 20,
			simH: 48,
			longH: 336,
			stepH: 1,
			mode: "fixed",
			maxPerSymbol: 2,
			portfolio: 16,
			lastN: 12
		},
		metrics: {
			pf: 1.058,
			n: 3350,
			perDay: 9.571,
			wr: .516,
			net: 588.669,
			greenHours: .515,
			greenDays: .402,
			positiveRuns: 63,
			runs: 175,
			ddtH: 6271,
			checks: [
				{
					period: "2025-10-11 → 2026-09-26",
					label: "research year",
					pf: 1.058,
					n: 3350,
					perDay: 9.571,
					greenHours: .515,
					wr: .516,
					positiveRuns: 63,
					runs: 175
				},
				{
					period: "2024-10-11 → 2025-09-26",
					label: "prior year",
					pf: 1.03,
					n: 3555,
					perDay: 10.157,
					greenHours: .532,
					wr: .559,
					positiveRuns: 66,
					runs: 175
				},
				{
					period: "2024-05-12 → 2024-09-25",
					label: "2024 (never selected on)",
					pf: 1.056,
					n: 1308,
					perDay: 9.618,
					greenHours: .492,
					wr: .56,
					positiveRuns: 20,
					runs: 68
				}
			],
			oot: {
				period: "2024-05-12 → 2024-09-25",
				pf: 1.056,
				n: 1308,
				perDay: 9.618,
				greenHours: .492,
				wr: .56
			},
			period: "2025-10-11 → 2026-09-26",
			source: "complete causal 48h walk-forward runs over each period, 40 symbols, 1h bars, 0.2% round-trip cost (docs/matrix.md, docs/matrix/mom-none-std-ln12.*)"
		}
	},
	{
		id: "mx-mom-none-std-ln12-normal-off+block",
		label: "RSI momentum · Normal off, Block + DCA · last-N 12",
		info: "Worst period PF 1.03 over three separate periods of real 1h data (the 2024 period was never used for any selection). RSI momentum: 7 bot × indication pairs, fixed selection, execution “Normal off, Block + DCA”.",
		kind: "research",
		at: 1790444372244,
		settings: {
			tfMin: 60,
			historyDays: 35,
			focus: [
				"follow|rsi-mom-10-25",
				"follow|rsi-mom-14-15",
				"follow|rsi-mom-14-20",
				"follow|rsi-mom-14-25",
				"follow|rsi-mom-21-15",
				"follow|rsi-mom-21-20",
				"follow|rsi-mom-21-25"
			],
			grid: {
				tp: [
					.03,
					.05,
					.08
				],
				slOfTp: [1, 2],
				trailOfTp: [0, .5],
				minTrail: .006,
				minSl: .01,
				holdH: [16, 24]
			},
			tactics: {
				session: false,
				volRegime: false,
				trendStrength: false,
				cooldown: false,
				cooldownBars: 4
			},
			block: {
				ratio: .2,
				maxLevel: 6,
				minActiveLevel: 1,
				maxMult: 2.5
			},
			dca: {
				levels: 2,
				step: .02
			},
			toggles: {
				normal: false,
				trailing: true,
				block: true,
				blockActive: false,
				dca: true,
				dcaActive: false,
				axis: false
			}
		},
		wf: {
			preH: 20,
			simH: 48,
			longH: 336,
			stepH: 1,
			mode: "fixed",
			maxPerSymbol: 2,
			portfolio: 16,
			lastN: 12
		},
		metrics: {
			pf: 1.076,
			n: 3233,
			perDay: 9.237,
			wr: .525,
			net: 755.036,
			greenHours: .524,
			greenDays: .404,
			positiveRuns: 63,
			runs: 175,
			ddtH: 6247,
			checks: [
				{
					period: "2025-10-11 → 2026-09-26",
					label: "research year",
					pf: 1.076,
					n: 3233,
					perDay: 9.237,
					greenHours: .524,
					wr: .525,
					positiveRuns: 63,
					runs: 175
				},
				{
					period: "2024-10-11 → 2025-09-26",
					label: "prior year",
					pf: 1.029,
					n: 3485,
					perDay: 9.957,
					greenHours: .536,
					wr: .561,
					positiveRuns: 64,
					runs: 175
				},
				{
					period: "2024-05-12 → 2024-09-25",
					label: "2024 (never selected on)",
					pf: 1.058,
					n: 1271,
					perDay: 9.346,
					greenHours: .502,
					wr: .566,
					positiveRuns: 20,
					runs: 68
				}
			],
			oot: {
				period: "2024-05-12 → 2024-09-25",
				pf: 1.058,
				n: 1271,
				perDay: 9.346,
				greenHours: .502,
				wr: .566
			},
			period: "2025-10-11 → 2026-09-26",
			source: "complete causal 48h walk-forward runs over each period, 40 symbols, 1h bars, 0.2% round-trip cost (docs/matrix.md, docs/matrix/mom-none-std-ln12.*)"
		}
	},
	{
		id: "mx-mom-none-std-ln12-trailing+block-active",
		label: "RSI momentum · Normal off · Trailing + Block Active · last-N 12",
		info: "Worst period PF 1.02 over three separate periods of real 1h data (the 2024 period was never used for any selection). RSI momentum: 7 bot × indication pairs, fixed selection, execution “Normal off · Trailing + Block Active”.",
		kind: "research",
		at: 1790444372244,
		settings: {
			tfMin: 60,
			historyDays: 35,
			focus: [
				"follow|rsi-mom-10-25",
				"follow|rsi-mom-14-15",
				"follow|rsi-mom-14-20",
				"follow|rsi-mom-14-25",
				"follow|rsi-mom-21-15",
				"follow|rsi-mom-21-20",
				"follow|rsi-mom-21-25"
			],
			grid: {
				tp: [
					.03,
					.05,
					.08
				],
				slOfTp: [1, 2],
				trailOfTp: [0, .5],
				minTrail: .006,
				minSl: .01,
				holdH: [16, 24]
			},
			tactics: {
				session: false,
				volRegime: false,
				trendStrength: false,
				cooldown: false,
				cooldownBars: 4
			},
			block: {
				ratio: .2,
				maxLevel: 6,
				minActiveLevel: 1,
				maxMult: 2.5
			},
			dca: {
				levels: 2,
				step: .02
			},
			toggles: {
				normal: false,
				trailing: true,
				block: true,
				blockActive: true,
				dca: false,
				dcaActive: false,
				axis: false
			}
		},
		wf: {
			preH: 20,
			simH: 48,
			longH: 336,
			stepH: 1,
			mode: "fixed",
			maxPerSymbol: 2,
			portfolio: 16,
			lastN: 12
		},
		metrics: {
			pf: 1.043,
			n: 3008,
			perDay: 8.594,
			wr: .522,
			net: 409.682,
			greenHours: .517,
			greenDays: .394,
			positiveRuns: 58,
			runs: 175,
			ddtH: 4731,
			checks: [
				{
					period: "2025-10-11 → 2026-09-26",
					label: "research year",
					pf: 1.043,
					n: 3008,
					perDay: 8.594,
					greenHours: .517,
					wr: .522,
					positiveRuns: 58,
					runs: 175
				},
				{
					period: "2024-10-11 → 2025-09-26",
					label: "prior year",
					pf: 1.022,
					n: 3231,
					perDay: 9.231,
					greenHours: .519,
					wr: .547,
					positiveRuns: 60,
					runs: 175
				},
				{
					period: "2024-05-12 → 2024-09-25",
					label: "2024 (never selected on)",
					pf: 1.069,
					n: 1261,
					perDay: 9.272,
					greenHours: .486,
					wr: .565,
					positiveRuns: 21,
					runs: 68
				}
			],
			oot: {
				period: "2024-05-12 → 2024-09-25",
				pf: 1.069,
				n: 1261,
				perDay: 9.272,
				greenHours: .486,
				wr: .565
			},
			period: "2025-10-11 → 2026-09-26",
			source: "complete causal 48h walk-forward runs over each period, 40 symbols, 1h bars, 0.2% round-trip cost (docs/matrix.md, docs/matrix/mom-none-std-ln12.*)"
		}
	},
	{
		id: "mx-mom-none-std-ln12-trailing+dca",
		label: "RSI momentum · Normal off · Trailing + DCA · last-N 12",
		info: "Worst period PF 1.02 over three separate periods of real 1h data (the 2024 period was never used for any selection). RSI momentum: 7 bot × indication pairs, fixed selection, execution “Normal off · Trailing + DCA”.",
		kind: "research",
		at: 1790444372244,
		settings: {
			tfMin: 60,
			historyDays: 35,
			focus: [
				"follow|rsi-mom-10-25",
				"follow|rsi-mom-14-15",
				"follow|rsi-mom-14-20",
				"follow|rsi-mom-14-25",
				"follow|rsi-mom-21-15",
				"follow|rsi-mom-21-20",
				"follow|rsi-mom-21-25"
			],
			grid: {
				tp: [
					.03,
					.05,
					.08
				],
				slOfTp: [1, 2],
				trailOfTp: [0, .5],
				minTrail: .006,
				minSl: .01,
				holdH: [16, 24]
			},
			tactics: {
				session: false,
				volRegime: false,
				trendStrength: false,
				cooldown: false,
				cooldownBars: 4
			},
			block: {
				ratio: .2,
				maxLevel: 6,
				minActiveLevel: 1,
				maxMult: 2.5
			},
			dca: {
				levels: 2,
				step: .02
			},
			toggles: {
				normal: false,
				trailing: true,
				block: false,
				blockActive: false,
				dca: true,
				dcaActive: false,
				axis: false
			}
		},
		wf: {
			preH: 20,
			simH: 48,
			longH: 336,
			stepH: 1,
			mode: "fixed",
			maxPerSymbol: 2,
			portfolio: 16,
			lastN: 12
		},
		metrics: {
			pf: 1.071,
			n: 3473,
			perDay: 9.923,
			wr: .549,
			net: 344.01,
			greenHours: .542,
			greenDays: .42,
			positiveRuns: 64,
			runs: 175,
			ddtH: 2471,
			checks: [
				{
					period: "2025-10-11 → 2026-09-26",
					label: "research year",
					pf: 1.071,
					n: 3473,
					perDay: 9.923,
					greenHours: .542,
					wr: .549,
					positiveRuns: 64,
					runs: 175
				},
				{
					period: "2024-10-11 → 2025-09-26",
					label: "prior year",
					pf: 1.017,
					n: 3571,
					perDay: 10.203,
					greenHours: .544,
					wr: .575,
					positiveRuns: 58,
					runs: 175
				},
				{
					period: "2024-05-12 → 2024-09-25",
					label: "2024 (never selected on)",
					pf: 1.024,
					n: 1341,
					perDay: 9.86,
					greenHours: .513,
					wr: .565,
					positiveRuns: 24,
					runs: 68
				}
			],
			oot: {
				period: "2024-05-12 → 2024-09-25",
				pf: 1.024,
				n: 1341,
				perDay: 9.86,
				greenHours: .513,
				wr: .565
			},
			period: "2025-10-11 → 2026-09-26",
			source: "complete causal 48h walk-forward runs over each period, 40 symbols, 1h bars, 0.2% round-trip cost (docs/matrix.md, docs/matrix/mom-none-std-ln12.*)"
		}
	}
];
//#endregion
//#region src/core/presets.ts
/** Strip what a preset must never carry or change (Live stage, universe size is kept). */
function presetSettings(s) {
	const { live: _live, ...rest } = s;
	return structuredClone(rest);
}
/** Stable identity of a settings + wf pair (for de-duplicating auto presets). */
function presetKey(settings, wf) {
	const norm = (o) => Array.isArray(o) ? o.map(norm) : o && typeof o === "object" ? Object.fromEntries(Object.keys(o).sort().map((k) => [k, norm(o[k])])) : o;
	const json = JSON.stringify(norm({
		settings: presetSettings(settings),
		wf
	}));
	let h = 2166136261;
	for (let i = 0; i < json.length; i++) h = Math.imul(h ^ json.charCodeAt(i), 16777619);
	return (h >>> 0).toString(36);
}
function metricsFromStats(st, spanH, period, source, extra = {}) {
	return {
		pf: st.pf,
		n: st.n,
		perDay: spanH > 0 ? st.n * 24 / spanH : 0,
		wr: st.wr,
		net: st.net,
		greenHours: st.gh,
		ddtH: st.ddt,
		period,
		source,
		...extra
	};
}
/** Insert or replace; an auto preset for the same settings is replaced only by a better (PF) run. Keeps `max`. */
function upsertPreset(list, p, max = 40) {
	const out = [...list];
	const i = out.findIndex((x) => x.id === p.id);
	if (i >= 0) {
		if (p.kind === "auto" && out[i].kind === "auto" && out[i].metrics.pf >= p.metrics.pf) return out;
		out[i] = p;
	} else out.push(p);
	while (out.length > max) {
		const pick = (kind) => out.map((x, k) => [x, k]).filter(([x]) => x.kind === kind).sort((a, b) => a[0].at - b[0].at)[0]?.[1];
		const j = pick("auto") ?? pick("saved");
		if (j === void 0) break;
		out.splice(j, 1);
	}
	return out;
}
/** Whether a simulated run qualifies for an automatic preset. */
function qualifies(st, stable, minPf, minTrades) {
	return stable && st.n >= minTrades && st.pf >= minPf && st.net > 0;
}
//#endregion
//#region src/core/market/bars.ts
function barsFromCandles(sym, tfMin, candles) {
	const n = candles.length;
	const b = {
		sym,
		tfMin,
		n,
		t: new Float64Array(n),
		o: new Float64Array(n),
		h: new Float64Array(n),
		l: new Float64Array(n),
		c: new Float64Array(n),
		v: new Float64Array(n)
	};
	for (let i = 0; i < n; i++) {
		const k = candles[i];
		b.t[i] = k.t;
		b.o[i] = k.o;
		b.h[i] = k.h;
		b.l[i] = k.l;
		b.c[i] = k.c;
		b.v[i] = k.v;
	}
	return b;
}
/** Keep only the last `max` bars. */
function tailBars(b, max) {
	if (b.n <= max) return b;
	const s = b.n - max;
	return {
		sym: b.sym,
		tfMin: b.tfMin,
		n: max,
		t: b.t.slice(s),
		o: b.o.slice(s),
		h: b.h.slice(s),
		l: b.l.slice(s),
		c: b.c.slice(s),
		v: b.v.slice(s)
	};
}
function mulberry32(seed) {
	let a = seed >>> 0;
	return () => {
		a = a + 1831565813 >>> 0;
		let x = a;
		x = Math.imul(x ^ x >>> 15, x | 1);
		x ^= x + Math.imul(x ^ x >>> 7, x | 61);
		return ((x ^ x >>> 14) >>> 0) / 4294967296;
	};
}
function hashStr(s) {
	let h = 2166136261;
	for (let i = 0; i < s.length; i++) {
		h ^= s.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return h >>> 0;
}
/**
* Deterministic regime-switching random walk with intraday mean reversion.
* Same (sym, seed, endT) → same candles.
*/
function syntheticCandles(sym, tfMin, count, endT, seed = 7) {
	const rnd = mulberry32(hashStr(sym) ^ seed);
	const gauss = () => {
		let u = 0;
		let v = 0;
		while (u === 0) u = rnd();
		while (v === 0) v = rnd();
		return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
	};
	const tfMs = tfMin * 6e4;
	const start = Math.floor(endT / tfMs) * tfMs - (count - 1) * tfMs;
	let px = 20 + hashStr(sym) % 5e3 / 10;
	const baseVol = .0018 * Math.sqrt(tfMin / 5) * (.7 + rnd() * .8);
	let drift = 0;
	let regimeLeft = 0;
	let anchor = px;
	const out = [];
	for (let i = 0; i < count; i++) {
		if (regimeLeft <= 0) {
			regimeLeft = 20 + Math.floor(rnd() * 120);
			drift = (rnd() - .5) * baseVol * .6;
			anchor = px;
		}
		regimeLeft--;
		const vol = baseVol * (.6 + rnd() * .9);
		const pull = (anchor - px) / px * .04;
		const ret = drift + pull + gauss() * vol;
		const o = px;
		const c = Math.max(1e-6, o * (1 + ret));
		const wick = Math.abs(gauss()) * vol * .6;
		const h = Math.max(o, c) * (1 + wick * rnd());
		const l = Math.min(o, c) * (1 - wick * rnd());
		const v = 1e3 * (.5 + rnd()) * (1 + Math.abs(ret) / baseVol);
		out.push({
			t: start + i * tfMs,
			o,
			h,
			l,
			c,
			v
		});
		px = c;
	}
	return out;
}
/** Resample candles to a larger timeframe (tfMin must be a multiple of the source). Incomplete buckets are dropped. */
function resample(candles, srcMin, tfMin) {
	if (tfMin === srcMin) return [...candles];
	const k = tfMin / srcMin;
	const tfMs = tfMin * 6e4;
	const out = [];
	let cur = null;
	let cnt = 0;
	for (const c of candles) {
		const b = Math.floor(c.t / tfMs) * tfMs;
		if (!cur || cur.t !== b) {
			if (cur && cnt === k) out.push(cur);
			cur = {
				t: b,
				o: c.o,
				h: c.h,
				l: c.l,
				c: c.c,
				v: c.v
			};
			cnt = 1;
		} else {
			cur.h = Math.max(cur.h, c.h);
			cur.l = Math.min(cur.l, c.l);
			cur.c = c.c;
			cur.v += c.v;
			cnt++;
		}
	}
	if (cur && cnt === k) out.push(cur);
	return out;
}
//#endregion
//#region src/core/market/bingx.ts
var BINGX_HOSTS = {
	mainnet: "https://open-api.bingx.com",
	testnet: "https://open-api-vst.bingx.com"
};
var TF = {
	1: "1m",
	3: "3m",
	5: "5m",
	15: "15m",
	30: "30m",
	60: "1h"
};
async function getJson(url, timeoutMs = 12e3) {
	const ctl = new AbortController();
	const timer = setTimeout(() => ctl.abort(), timeoutMs);
	try {
		const res = await fetch(url, {
			signal: ctl.signal,
			headers: { accept: "application/json" }
		});
		const text = await res.text();
		const body = JSON.parse(text);
		if (body.code !== 0) throw new Error(`BingX ${body.code}: ${body.msg || res.status}`);
		return body.data;
	} finally {
		clearTimeout(timer);
	}
}
async function fetchTickers(host = BINGX_HOSTS.mainnet) {
	return (await getJson(`${host}/openApi/swap/v2/quote/ticker`)).filter((r) => /-USDT$/.test(r.symbol)).map((r) => ({
		sym: r.symbol,
		last: Number(r.lastPrice),
		quoteVol: Number(r.quoteVolume),
		changePct: Number(r.priceChangePercent)
	})).filter((t) => Number.isFinite(t.last) && t.last > 0 && Number.isFinite(t.quoteVol));
}
/** Market leaders, in order, for the "market" ranking. */
var MAJORS = [
	"BTC-USDT",
	"ETH-USDT",
	"SOL-USDT",
	"XRP-USDT",
	"BNB-USDT",
	"DOGE-USDT",
	"ADA-USDT",
	"TRX-USDT",
	"LINK-USDT",
	"AVAX-USDT",
	"SUI-USDT",
	"TON-USDT",
	"LTC-USDT",
	"BCH-USDT",
	"DOT-USDT",
	"NEAR-USDT",
	"APT-USDT",
	"UNI-USDT",
	"AAVE-USDT",
	"ETC-USDT"
];
/**
* Symbols for the universe by the chosen ranking. Only liquid pairs (≥ $2M 24h volume, among the 150 most
* traded) are candidates, so a ranking never picks an untradeable coin. "volatility1h" = mean high-low range of the
* last 3 closed hours (falls back to |24h change| for a symbol whose klines are unavailable).
*/
async function rankUniverse(tickers, n, rank, klines = fetchKlines) {
	const skip = /^(USDC|FDUSD|TUSD|DAI|BUSD|USDE|NCCO|NCSK|NCFX|NCSI)/;
	const pool = [...tickers].filter((t) => !skip.test(t.sym)).sort((a, b) => b.quoteVol - a.quoteVol).filter((t, i) => i < 150 && (t.quoteVol >= 2e6 || i < n)).slice(0, Math.max(150, n));
	const take = (xs) => xs.slice(0, n).map((t) => t.sym);
	switch (rank) {
		case "volume": return take(pool);
		case "market": {
			const by = new Map(pool.map((t) => [t.sym, t]));
			return take([...MAJORS.map((s) => by.get(s)).filter((t) => !!t), ...pool.filter((t) => !MAJORS.includes(t.sym))]);
		}
		case "gainers": return take([...pool].sort((a, b) => b.changePct - a.changePct));
		case "losers": return take([...pool].sort((a, b) => a.changePct - b.changePct));
		case "volatility1h": {
			const vol = /* @__PURE__ */ new Map();
			let i = 0;
			const now = Date.now();
			await Promise.all(Array.from({ length: Math.min(8, pool.length) }, async () => {
				while (i < pool.length) {
					const t = pool[i++];
					try {
						const cs = (await klines(t.sym, 60, {
							limit: 4,
							nowT: now
						})).slice(-3);
						if (cs.length) vol.set(t.sym, cs.reduce((a, c) => a + (c.h - c.l) / c.c, 0) / cs.length);
					} catch {}
				}
			}));
			const score = (t) => vol.get(t.sym) ?? Math.abs(t.changePct) / 100 / 24;
			return take([...pool].sort((a, b) => score(b) - score(a)));
		}
	}
}
/** One kline page (max 1440), ascending by time. Only CLOSED bars are returned. */
async function fetchKlines(sym, tfMin, opt = {}) {
	const iv = TF[tfMin];
	if (!iv) throw new Error(`unsupported timeframe ${tfMin}m`);
	const q = new URLSearchParams({
		symbol: sym,
		interval: iv,
		limit: String(Math.min(opt.limit ?? 1440, 1440))
	});
	if (opt.startT) q.set("startTime", String(opt.startT));
	if (opt.endT) q.set("endTime", String(opt.endT));
	const data = await getJson(`${opt.host ?? BINGX_HOSTS.mainnet}/openApi/swap/v3/quote/klines?${q}`);
	const now = opt.nowT ?? Date.now();
	const tfMs = tfMin * 6e4;
	const out = [];
	for (const r of data) {
		const t = Number(r.time);
		if (!(t + tfMs <= now)) continue;
		const c = {
			t,
			o: Number(r.open),
			h: Number(r.high),
			l: Number(r.low),
			c: Number(r.close),
			v: Number(r.volume)
		};
		if ([
			c.o,
			c.h,
			c.l,
			c.c
		].every((x) => Number.isFinite(x) && x > 0)) out.push(c);
	}
	out.sort((a, b) => a.t - b.t);
	return dedupe(out);
}
function dedupe(xs) {
	const out = [];
	for (const x of xs) if (!out.length || out[out.length - 1].t !== x.t) out.push(x);
	return out;
}
/** Backfill `bars` closed bars ending now, paging backwards. */
async function fetchHistory(sym, tfMin, bars, opt = {}) {
	const tfMs = tfMin * 6e4;
	const now = opt.nowT ?? Date.now();
	let endT = Math.floor(now / tfMs) * tfMs - 1;
	const pages = [];
	let got = 0;
	for (let guard = 0; guard < 20 && got < bars; guard++) {
		const need = Math.min(1440, bars - got);
		const page = await fetchKlines(sym, tfMin, {
			startT: endT - need * tfMs + 1,
			endT,
			limit: need,
			host: opt.host,
			nowT: now
		});
		if (!page.length) break;
		pages.unshift(page);
		got += page.length;
		endT = page[0].t - 1;
		if (opt.pauseMs) await new Promise((r) => setTimeout(r, opt.pauseMs));
	}
	const all = dedupe(pages.flat().sort((a, b) => a.t - b.t));
	return all.slice(Math.max(0, all.length - bars));
}
//#endregion
//#region src/core/math/indicators.ts
function sma(x, p) {
	const out = new Float64Array(x.length).fill(NaN);
	let s = 0;
	for (let i = 0; i < x.length; i++) {
		s += x[i];
		if (i >= p) s -= x[i - p];
		if (i >= p - 1) out[i] = s / p;
	}
	return out;
}
function ema(x, p) {
	const out = new Float64Array(x.length).fill(NaN);
	const k = 2 / (p + 1);
	let prev = NaN;
	let s = 0;
	for (let i = 0; i < x.length; i++) {
		if (i < p - 1) {
			s += x[i];
			continue;
		}
		if (i === p - 1) prev = (s + x[i]) / p;
		else prev = x[i] * k + prev * (1 - k);
		out[i] = prev;
	}
	return out;
}
/** Wilder smoothing (RMA). */
function rma(x, p, start = 0) {
	const out = new Float64Array(x.length).fill(NaN);
	let s = 0;
	let cnt = 0;
	let prev = NaN;
	for (let i = start; i < x.length; i++) {
		if (cnt < p) {
			s += x[i];
			cnt++;
			if (cnt === p) {
				prev = s / p;
				out[i] = prev;
			}
			continue;
		}
		prev = (prev * (p - 1) + x[i]) / p;
		out[i] = prev;
	}
	return out;
}
function rsi(c, p) {
	const n = c.length;
	const up = new Float64Array(n);
	const dn = new Float64Array(n);
	for (let i = 1; i < n; i++) {
		const d = c[i] - c[i - 1];
		up[i] = d > 0 ? d : 0;
		dn[i] = d < 0 ? -d : 0;
	}
	const au = rma(up, p, 1);
	const ad = rma(dn, p, 1);
	const out = new Float64Array(n).fill(NaN);
	for (let i = 0; i < n; i++) {
		if (Number.isNaN(au[i])) continue;
		out[i] = ad[i] === 0 ? 100 : 100 - 100 / (1 + au[i] / ad[i]);
	}
	return out;
}
function trueRange(h, l, c) {
	const n = c.length;
	const tr = new Float64Array(n);
	for (let i = 0; i < n; i++) {
		const hl = h[i] - l[i];
		if (i === 0) {
			tr[i] = hl;
			continue;
		}
		tr[i] = Math.max(hl, Math.abs(h[i] - c[i - 1]), Math.abs(l[i] - c[i - 1]));
	}
	return tr;
}
function atr(h, l, c, p) {
	return rma(trueRange(h, l, c), p);
}
function macd(c, fast = 12, slow = 26, sig = 9) {
	const ef = ema(c, fast);
	const es = ema(c, slow);
	const n = c.length;
	const line = new Float64Array(n).fill(NaN);
	for (let i = 0; i < n; i++) line[i] = ef[i] - es[i];
	const first = line.findIndex((v) => !Number.isNaN(v));
	const signal = new Float64Array(n).fill(NaN);
	if (first >= 0) {
		const sub = ema(line.subarray(first), sig);
		signal.set(sub, first);
	}
	const hist = new Float64Array(n).fill(NaN);
	for (let i = 0; i < n; i++) hist[i] = line[i] - signal[i];
	return {
		line,
		signal,
		hist
	};
}
function stdev(x, p) {
	const out = new Float64Array(x.length).fill(NaN);
	let s = 0;
	let s2 = 0;
	for (let i = 0; i < x.length; i++) {
		s += x[i];
		s2 += x[i] * x[i];
		if (i >= p) {
			s -= x[i - p];
			s2 -= x[i - p] * x[i - p];
		}
		if (i >= p - 1) {
			const m = s / p;
			out[i] = Math.sqrt(Math.max(0, s2 / p - m * m));
		}
	}
	return out;
}
function bollinger(c, p = 20, k = 2) {
	const mid = sma(c, p);
	const sd = stdev(c, p);
	const n = c.length;
	const up = new Float64Array(n);
	const lo = new Float64Array(n);
	const width = new Float64Array(n);
	for (let i = 0; i < n; i++) {
		up[i] = mid[i] + k * sd[i];
		lo[i] = mid[i] - k * sd[i];
		width[i] = (up[i] - lo[i]) / mid[i];
	}
	return {
		mid,
		up,
		lo,
		width
	};
}
/** Parabolic SAR. Returns sar level and direction (+1 long / -1 short). */
function psar(h, l, step = .02, max = .2) {
	const n = h.length;
	const sar = new Float64Array(n).fill(NaN);
	const dir = new Int8Array(n);
	if (n < 2) return {
		sar,
		dir
	};
	let up = h[1] >= h[0];
	let ep = up ? h[1] : l[1];
	let s = up ? l[0] : h[0];
	let af = step;
	for (let i = 1; i < n; i++) {
		s = s + af * (ep - s);
		if (up) {
			s = Math.min(s, l[i - 1], i > 1 ? l[i - 2] : l[i - 1]);
			if (l[i] < s) {
				up = false;
				s = ep;
				ep = l[i];
				af = step;
			} else if (h[i] > ep) {
				ep = h[i];
				af = Math.min(max, af + step);
			}
		} else {
			s = Math.max(s, h[i - 1], i > 1 ? h[i - 2] : h[i - 1]);
			if (h[i] > s) {
				up = true;
				s = ep;
				ep = h[i];
				af = step;
			} else if (l[i] < ep) {
				ep = l[i];
				af = Math.min(max, af + step);
			}
		}
		sar[i] = s;
		dir[i] = up ? 1 : -1;
	}
	return {
		sar,
		dir
	};
}
function dmi(h, l, c, p = 14) {
	const n = c.length;
	const pdm = new Float64Array(n);
	const mdm = new Float64Array(n);
	for (let i = 1; i < n; i++) {
		const u = h[i] - h[i - 1];
		const d = l[i - 1] - l[i];
		pdm[i] = u > d && u > 0 ? u : 0;
		mdm[i] = d > u && d > 0 ? d : 0;
	}
	const str = rma(trueRange(h, l, c), p, 1);
	const sp = rma(pdm, p, 1);
	const sm = rma(mdm, p, 1);
	const pdi = new Float64Array(n).fill(NaN);
	const mdi = new Float64Array(n).fill(NaN);
	const dx = new Float64Array(n).fill(NaN);
	let firstDx = -1;
	for (let i = 0; i < n; i++) {
		if (Number.isNaN(str[i]) || str[i] === 0) continue;
		pdi[i] = 100 * sp[i] / str[i];
		mdi[i] = 100 * sm[i] / str[i];
		const s = pdi[i] + mdi[i];
		dx[i] = s === 0 ? 0 : 100 * Math.abs(pdi[i] - mdi[i]) / s;
		if (firstDx < 0) firstDx = i;
	}
	return {
		adx: firstDx < 0 ? new Float64Array(n).fill(NaN) : rma(dx, p, firstDx),
		pdi,
		mdi
	};
}
/** Rolling VWAP over the last p bars (typical price). */
function vwapRolling(h, l, c, v, p) {
	const n = c.length;
	const out = new Float64Array(n).fill(NaN);
	let pv = 0;
	let vv = 0;
	for (let i = 0; i < n; i++) {
		const tp = (h[i] + l[i] + c[i]) / 3;
		const vol = v[i] > 0 ? v[i] : 1e-9;
		pv += tp * vol;
		vv += vol;
		if (i >= p) {
			const tq = (h[i - p] + l[i - p] + c[i - p]) / 3;
			const vq = v[i - p] > 0 ? v[i - p] : 1e-9;
			pv -= tq * vq;
			vv -= vq;
		}
		if (i >= p - 1) out[i] = pv / vv;
	}
	return out;
}
function supertrend(h, l, c, p = 10, mult = 3) {
	const n = c.length;
	const a = atr(h, l, c, p);
	const line = new Float64Array(n).fill(NaN);
	const dir = new Int8Array(n);
	let fu = NaN;
	let fl = NaN;
	let d = 1;
	for (let i = 0; i < n; i++) {
		if (Number.isNaN(a[i])) continue;
		const mid = (h[i] + l[i]) / 2;
		const bu = mid + mult * a[i];
		const bl = mid - mult * a[i];
		const pc = i > 0 ? c[i - 1] : c[i];
		fu = Number.isNaN(fu) || bu < fu || pc > fu ? bu : fu;
		fl = Number.isNaN(fl) || bl > fl || pc < fl ? bl : fl;
		if (d === 1 && c[i] < fl) d = -1;
		else if (d === -1 && c[i] > fu) d = 1;
		line[i] = d === 1 ? fl : fu;
		dir[i] = d;
	}
	return {
		line,
		dir
	};
}
/** Donchian channel of the p bars BEFORE bar i (excludes the current bar). */
function donchianPrior(h, l, p) {
	const n = h.length;
	const hi = new Float64Array(n).fill(NaN);
	const lo = new Float64Array(n).fill(NaN);
	const dh = [];
	const dl = [];
	for (let i = 0; i < n; i++) {
		if (i >= p) {
			hi[i] = h[dh[0]];
			lo[i] = l[dl[0]];
		}
		while (dh.length && h[dh[dh.length - 1]] <= h[i]) dh.pop();
		dh.push(i);
		if (dh[0] <= i - p) dh.shift();
		while (dl.length && l[dl[dl.length - 1]] >= l[i]) dl.pop();
		dl.push(i);
		if (dl[0] <= i - p) dl.shift();
	}
	return {
		hi,
		lo
	};
}
function roc(c, p) {
	const out = new Float64Array(c.length).fill(NaN);
	for (let i = p; i < c.length; i++) out[i] = c[i] / c[i - p] - 1;
	return out;
}
function stoch(h, l, c, p = 14, d = 3) {
	const n = c.length;
	const k = new Float64Array(n).fill(NaN);
	for (let i = p - 1; i < n; i++) {
		let hh = -Infinity;
		let ll = Infinity;
		for (let j = i - p + 1; j <= i; j++) {
			if (h[j] > hh) hh = h[j];
			if (l[j] < ll) ll = l[j];
		}
		k[i] = hh === ll ? 50 : (c[i] - ll) / (hh - ll) * 100;
	}
	const first = p - 1;
	const dd = new Float64Array(n).fill(NaN);
	if (n > first) dd.set(sma(k.subarray(first), d), first);
	return {
		k,
		d: dd
	};
}
/** Per-bar anchored-period levels: open/VWAP/high/low/close of the current and the previous period (e.g. hour). */
function periodLevels(t, h, l, c, o, v, periodMs) {
	const n = c.length;
	const mk = () => new Float64Array(n).fill(NaN);
	const curOpen = mk();
	const curVwap = mk();
	const curRange = mk();
	const prevVwap = mk();
	const prevHigh = mk();
	const prevLow = mk();
	const prevPivot = mk();
	const prevRange = mk();
	let pid = -1;
	let po = NaN;
	let pv = 0;
	let vv = 0;
	let ph = -Infinity;
	let pl = Infinity;
	let pc = NaN;
	let lastV = NaN;
	let lastH = NaN;
	let lastL = NaN;
	let lastC = NaN;
	for (let i = 0; i < n; i++) {
		const id = Math.floor(t[i] / periodMs);
		if (id !== pid) {
			if (pid >= 0) {
				lastV = vv > 0 ? pv / vv : NaN;
				lastH = ph;
				lastL = pl;
				lastC = pc;
			}
			pid = id;
			po = o[i];
			pv = 0;
			vv = 0;
			ph = -Infinity;
			pl = Infinity;
		}
		const tp = (h[i] + l[i] + c[i]) / 3;
		const vol = v[i] > 0 ? v[i] : 1e-9;
		pv += tp * vol;
		vv += vol;
		if (h[i] > ph) ph = h[i];
		if (l[i] < pl) pl = l[i];
		pc = c[i];
		curOpen[i] = po;
		curVwap[i] = pv / vv;
		curRange[i] = ph - pl;
		prevVwap[i] = lastV;
		prevHigh[i] = lastH;
		prevLow[i] = lastL;
		prevPivot[i] = (lastH + lastL + lastC) / 3;
		prevRange[i] = lastH - lastL;
	}
	return {
		curOpen,
		curVwap,
		curRange,
		prevVwap,
		prevHigh,
		prevLow,
		prevPivot,
		prevRange
	};
}
function wma(x, p) {
	const out = new Float64Array(x.length).fill(NaN);
	const den = p * (p + 1) / 2;
	let run = 0;
	for (let i = 0; i < x.length; i++) {
		if (!Number.isFinite(x[i])) {
			run = 0;
			continue;
		}
		run++;
		if (run < p) continue;
		let s = 0;
		for (let j = 0; j < p; j++) s += x[i - j] * (p - j);
		out[i] = s / den;
	}
	return out;
}
/** Hull moving average. */
function hma(x, p) {
	const a = wma(x, Math.max(1, Math.round(p / 2)));
	const b = wma(x, p);
	const d = new Float64Array(x.length);
	for (let i = 0; i < x.length; i++) d[i] = 2 * a[i] - b[i];
	return wma(d, Math.max(1, Math.round(Math.sqrt(p))));
}
/** Commodity Channel Index. */
function cci(h, l, c, p = 20) {
	const n = c.length;
	const tp = new Float64Array(n);
	for (let i = 0; i < n; i++) tp[i] = (h[i] + l[i] + c[i]) / 3;
	const m = sma(tp, p);
	const out = new Float64Array(n).fill(NaN);
	for (let i = p - 1; i < n; i++) {
		let md = 0;
		for (let j = i - p + 1; j <= i; j++) md += Math.abs(tp[j] - m[i]);
		md /= p;
		out[i] = md > 0 ? (tp[i] - m[i]) / (.015 * md) : 0;
	}
	return out;
}
/** Williams %R (−100 … 0). */
function willr(h, l, c, p = 14) {
	const s = stoch(h, l, c, p, 1).k;
	const out = new Float64Array(c.length);
	for (let i = 0; i < c.length; i++) out[i] = s[i] - 100;
	return out;
}
/** Money Flow Index. */
function mfi(h, l, c, v, p = 14) {
	const n = c.length;
	const out = new Float64Array(n).fill(NaN);
	const tp = new Float64Array(n);
	for (let i = 0; i < n; i++) tp[i] = (h[i] + l[i] + c[i]) / 3;
	for (let i = p; i < n; i++) {
		let pos = 0;
		let neg = 0;
		for (let j = i - p + 1; j <= i; j++) {
			const f = tp[j] * v[j];
			if (tp[j] > tp[j - 1]) pos += f;
			else if (tp[j] < tp[j - 1]) neg += f;
		}
		out[i] = neg === 0 ? 100 : 100 - 100 / (1 + pos / neg);
	}
	return out;
}
function obv(c, v) {
	const out = new Float64Array(c.length);
	for (let i = 1; i < c.length; i++) out[i] = out[i - 1] + (c[i] > c[i - 1] ? v[i] : c[i] < c[i - 1] ? -v[i] : 0);
	return out;
}
/** Chaikin Money Flow. */
function cmf(h, l, c, v, p = 20) {
	const n = c.length;
	const mfv = new Float64Array(n);
	for (let i = 0; i < n; i++) mfv[i] = h[i] > l[i] ? (c[i] - l[i] - (h[i] - c[i])) / (h[i] - l[i]) * v[i] : 0;
	const a = sma(mfv, p);
	const b = sma(v, p);
	const out = new Float64Array(n).fill(NaN);
	for (let i = 0; i < n; i++) if (b[i] > 0) out[i] = a[i] / b[i];
	return out;
}
/** Stochastic RSI %K (0…100). */
function stochRsi(c, rp = 14, sp = 14, smooth = 3) {
	const r = rsi(c, rp);
	const n = c.length;
	const raw = new Float64Array(n).fill(NaN);
	for (let i = 0; i < n; i++) {
		if (i < sp - 1) continue;
		let hh = -Infinity;
		let ll = Infinity;
		let okAll = true;
		for (let j = i - sp + 1; j <= i; j++) {
			if (!Number.isFinite(r[j])) {
				okAll = false;
				break;
			}
			if (r[j] > hh) hh = r[j];
			if (r[j] < ll) ll = r[j];
		}
		if (okAll) raw[i] = hh === ll ? 50 : (r[i] - ll) / (hh - ll) * 100;
	}
	const first = raw.findIndex((x) => Number.isFinite(x));
	const out = new Float64Array(n).fill(NaN);
	if (first >= 0) out.set(sma(raw.subarray(first), smooth), first);
	return out;
}
/** Aroon up / down (0…100). */
function aroon(h, l, p = 25) {
	const n = h.length;
	const up = new Float64Array(n).fill(NaN);
	const dn = new Float64Array(n).fill(NaN);
	for (let i = p; i < n; i++) {
		let hi = i, lo = i;
		for (let j = i - p; j <= i; j++) {
			if (h[j] >= h[hi]) hi = j;
			if (l[j] <= l[lo]) lo = j;
		}
		up[i] = (p - (i - hi)) / p * 100;
		dn[i] = (p - (i - lo)) / p * 100;
	}
	return {
		up,
		dn
	};
}
/** Keltner channel: EMA(p) ± m × ATR(p). */
function keltner(h, l, c, p = 20, m = 2) {
	const mid = ema(c, p);
	const a = atr(h, l, c, p);
	const up = new Float64Array(c.length);
	const lo = new Float64Array(c.length);
	for (let i = 0; i < c.length; i++) {
		up[i] = mid[i] + m * a[i];
		lo[i] = mid[i] - m * a[i];
	}
	return {
		mid,
		up,
		lo
	};
}
function midRange(h, l, p) {
	const n = h.length;
	const out = new Float64Array(n).fill(NaN);
	for (let i = p - 1; i < n; i++) {
		let hh = -Infinity;
		let ll = Infinity;
		for (let j = i - p + 1; j <= i; j++) {
			if (h[j] > hh) hh = h[j];
			if (l[j] < ll) ll = l[j];
		}
		out[i] = (hh + ll) / 2;
	}
	return out;
}
/** Ichimoku; span A/B are the values plotted at bar i (computed `shift` bars earlier), so they are causal. */
function ichimoku(h, l, t = 9, k = 26, b = 52, shift = 26) {
	const n = h.length;
	const tenkan = midRange(h, l, t);
	const kijun = midRange(h, l, k);
	const sb = midRange(h, l, b);
	const spanA = new Float64Array(n).fill(NaN);
	const spanB = new Float64Array(n).fill(NaN);
	for (let i = shift; i < n; i++) {
		spanA[i] = (tenkan[i - shift] + kijun[i - shift]) / 2;
		spanB[i] = sb[i - shift];
	}
	return {
		tenkan,
		kijun,
		spanA,
		spanB
	};
}
/** TRIX: 1-bar rate of change of a triple EMA, in %. */
function trix(c, p = 15) {
	const e1 = ema(c, p);
	const f = e1.findIndex((x) => Number.isFinite(x));
	const e2 = new Float64Array(c.length).fill(NaN);
	if (f >= 0) e2.set(ema(e1.subarray(f), p), f);
	const f2 = e2.findIndex((x) => Number.isFinite(x));
	const e3 = new Float64Array(c.length).fill(NaN);
	if (f2 >= 0) e3.set(ema(e2.subarray(f2), p), f2);
	const out = new Float64Array(c.length).fill(NaN);
	for (let i = 1; i < c.length; i++) if (Number.isFinite(e3[i - 1])) out[i] = (e3[i] / e3[i - 1] - 1) * 100;
	return out;
}
/** Kaufman adaptive moving average. */
function kama(c, p = 10, fast = 2, slow = 30) {
	const n = c.length;
	const out = new Float64Array(n).fill(NaN);
	const fs = 2 / (fast + 1);
	const ss = 2 / (slow + 1);
	let prev = NaN;
	for (let i = p; i < n; i++) {
		const change = Math.abs(c[i] - c[i - p]);
		let vol = 0;
		for (let j = i - p + 1; j <= i; j++) vol += Math.abs(c[j] - c[j - 1]);
		const sc = ((vol > 0 ? change / vol : 0) * (fs - ss) + ss) ** 2;
		prev = Number.isFinite(prev) ? prev + sc * (c[i] - prev) : c[i];
		out[i] = prev;
	}
	return out;
}
/** Heikin-Ashi open / close. */
function heikinAshi(o, h, l, c) {
	const n = c.length;
	const ho = new Float64Array(n);
	const hc = new Float64Array(n);
	for (let i = 0; i < n; i++) {
		hc[i] = (o[i] + h[i] + l[i] + c[i]) / 4;
		ho[i] = i === 0 ? (o[0] + c[0]) / 2 : (ho[i - 1] + hc[i - 1]) / 2;
	}
	return {
		o: ho,
		c: hc
	};
}
/** Rolling z-score of x. */
function zscore(x, p = 20) {
	const m = sma(x, p);
	const s = stdev(x, p);
	const out = new Float64Array(x.length).fill(NaN);
	for (let i = 0; i < x.length; i++) if (s[i] > 0) out[i] = (x[i] - m[i]) / s[i];
	return out;
}
//#endregion
//#region src/core/indications/registry.ts
var sgn = (x) => x > 0 ? 1 : x < 0 ? -1 : 0;
var ok = (...xs) => xs.every((x) => Number.isFinite(x));
function state(n, f) {
	const out = new Int8Array(n);
	for (let i = 0; i < n; i++) {
		const v = f(i);
		out[i] = Number.isFinite(v) ? sgn(v) : 0;
	}
	return out;
}
/** Extend event bars into a state that persists `keep` bars (latest event wins). */
function hold(ev, keep) {
	const out = new Int8Array(ev.length);
	let cur = 0;
	let left = 0;
	for (let i = 0; i < ev.length; i++) {
		if (ev[i] !== 0) {
			cur = ev[i];
			left = keep;
		}
		if (left > 0) {
			out[i] = cur;
			left--;
		}
	}
	return out;
}
function spec(kind, id, label, params, fn) {
	return {
		id,
		kind,
		label,
		params,
		fn
	};
}
var BASE_INDICATIONS = [
	spec("trend", "trend-ema", "EMA 9/21 trend", {
		fast: 9,
		slow: 21
	}, (k) => {
		const f = k.ema(9), s = k.ema(21), c = k.b.c;
		return state(k.b.n, (i) => ok(f[i], s[i]) ? f[i] > s[i] && c[i] > s[i] ? 1 : f[i] < s[i] && c[i] < s[i] ? -1 : 0 : NaN);
	}),
	spec("trend", "trend-adx", "ADX 25 + DI", {
		p: 14,
		min: 25
	}, (k) => {
		const { adx, pdi, mdi } = k.dmi(14);
		return state(k.b.n, (i) => ok(adx[i]) && adx[i] >= 25 ? pdi[i] - mdi[i] : 0);
	}),
	spec("trend", "trend-st", "Supertrend 10×3", {
		p: 10,
		m: 3
	}, (k) => k.st(10, 3).dir),
	spec("trend", "trend-ribbon", "Ribbon 9/21/55", {
		a: 9,
		b: 21,
		c: 55
	}, (k) => {
		const a = k.ema(9), b = k.ema(21), c = k.ema(55);
		return state(k.b.n, (i) => ok(a[i], b[i], c[i]) ? a[i] > b[i] && b[i] > c[i] ? 1 : a[i] < b[i] && b[i] < c[i] ? -1 : 0 : NaN);
	}),
	spec("break", "break-don20", "Donchian 20 break", {
		p: 20,
		keep: 6
	}, (k) => {
		const { hi, lo } = k.don(20), c = k.b.c;
		return hold(state(k.b.n, (i) => c[i] > hi[i] ? 1 : c[i] < lo[i] ? -1 : 0), 6);
	}),
	spec("break", "break-vol", "Break + volume 1.6×", {
		p: 20,
		vol: 1.6,
		keep: 6
	}, (k) => {
		const { hi, lo } = k.don(20), c = k.b.c, v = k.b.v, vs = k.volSma(20);
		return hold(state(k.b.n, (i) => v[i] > 1.6 * vs[i] ? c[i] > hi[i] ? 1 : c[i] < lo[i] ? -1 : 0 : 0), 6);
	}),
	spec("break", "break-atr", "ATR 1.15× expansion", {
		p: 14,
		mul: 1.15,
		keep: 4
	}, (k) => {
		const a = k.atr(14), c = k.b.c;
		return hold(state(k.b.n, (i) => i > 0 && ok(a[i - 1]) && Math.abs(c[i] - c[i - 1]) > 1.15 * a[i - 1] ? c[i] - c[i - 1] : 0), 4);
	}),
	spec("break", "break-squeeze", "BB squeeze break", {
		p: 20,
		look: 60,
		keep: 8
	}, (k) => {
		const { up, lo, width } = k.bb(20, 2), c = k.b.c, n = k.b.n;
		const ev = new Int8Array(n);
		for (let i = 60; i < n; i++) {
			let minW = Infinity;
			for (let j = i - 60; j < i; j++) if (width[j] < minW) minW = width[j];
			if (width[i - 1] <= minW * 1.15) ev[i] = c[i] > up[i] ? 1 : c[i] < lo[i] ? -1 : 0;
		}
		return hold(ev, 8);
	}),
	spec("break", "break-retest", "Break retest hold", {
		p: 20,
		keep: 5
	}, (k) => {
		const { hi, lo } = k.don(20), { c, l, h } = k.b, n = k.b.n;
		const ev = new Int8Array(n);
		let lastUp = -99, lastDn = -99, lvlU = 0, lvlD = 0;
		for (let i = 1; i < n; i++) {
			if (c[i] > hi[i]) {
				lastUp = i;
				lvlU = hi[i];
			}
			if (c[i] < lo[i]) {
				lastDn = i;
				lvlD = lo[i];
			}
			if (i - lastUp > 1 && i - lastUp <= 8 && l[i] <= lvlU * 1.001 && c[i] > lvlU) ev[i] = 1;
			if (i - lastDn > 1 && i - lastDn <= 8 && h[i] >= lvlD * .999 && c[i] < lvlD) ev[i] = -1;
		}
		return hold(ev, 5);
	}),
	spec("break", "break-fail", "Failed break fade", {
		p: 20,
		keep: 5
	}, (k) => {
		const { hi, lo } = k.don(20), { c, h, l } = k.b;
		return hold(state(k.b.n, (i) => h[i] > hi[i] && c[i] < hi[i] ? -1 : l[i] < lo[i] && c[i] > lo[i] ? 1 : 0), 5);
	}),
	spec("active", "act-burst", "Range burst 1.8×", {
		p: 20,
		mul: 1.8,
		keep: 4
	}, (k) => {
		const rs = k.rangeSma(20), { o, c, h, l } = k.b;
		return hold(state(k.b.n, (i) => i > 0 && h[i] - l[i] > 1.8 * rs[i - 1] ? c[i] - o[i] : 0), 4);
	}),
	spec("active", "act-shift", "Range shift 20/60", {
		a: 20,
		b: 60
	}, (k) => {
		const a = k.rangeSma(20), b = k.rangeSma(60), r = k.roc(10);
		return state(k.b.n, (i) => ok(a[i], b[i], r[i]) && a[i] > 1.2 * b[i] ? r[i] : 0);
	}),
	spec("active", "act-hf", "HF momentum 3", { n: 3 }, (k) => {
		const a = k.atr(14), c = k.b.c;
		return state(k.b.n, (i) => {
			if (i < 3 || !ok(a[i])) return NaN;
			const d = c[i] - c[i - 3];
			return Math.abs(d) > .9 * a[i] ? d : 0;
		});
	}),
	spec("active", "act-chop", "Chop fade", { p: 14 }, (k) => {
		const { adx } = k.dmi(14), r = k.rsi(7);
		return state(k.b.n, (i) => ok(adx[i], r[i]) && adx[i] < 18 ? r[i] < 30 ? 1 : r[i] > 70 ? -1 : 0 : 0);
	}),
	spec("direction", "dir-emax", "EMA 9/21 cross", {
		f: 9,
		s: 21
	}, (k) => {
		const f = k.ema(9), s = k.ema(21);
		return state(k.b.n, (i) => f[i] - s[i]);
	}),
	spec("direction", "dir-st", "Supertrend 7×2 flip", {
		p: 7,
		m: 2
	}, (k) => k.st(7, 2).dir),
	spec("direction", "dir-vwap", "VWAP 60 axis", { p: 60 }, (k) => {
		const w = k.vwap(60), c = k.b.c;
		return state(k.b.n, (i) => c[i] - w[i]);
	}),
	spec("direction", "dir-macd", "MACD hist sign", {}, (k) => {
		const { hist } = k.macd();
		return state(k.b.n, (i) => hist[i]);
	}),
	spec("direction", "dir-thrust", "3-bar thrust", {
		n: 3,
		keep: 3
	}, (k) => {
		const { c, o } = k.b;
		return hold(state(k.b.n, (i) => {
			if (i < 2) return 0;
			const u = c[i] > o[i] && c[i - 1] > o[i - 1] && c[i - 2] > o[i - 2] && c[i] > c[i - 1] && c[i - 1] > c[i - 2];
			const d = c[i] < o[i] && c[i - 1] < o[i - 1] && c[i - 2] < o[i - 2] && c[i] < c[i - 1] && c[i - 1] < c[i - 2];
			return u ? 1 : d ? -1 : 0;
		}), 3);
	}),
	spec("direction", "dir-reclaim", "EMA21 reclaim", {
		p: 21,
		keep: 4
	}, (k) => {
		const e = k.ema(21), c = k.b.c;
		return hold(state(k.b.n, (i) => i > 0 && ok(e[i - 1]) ? c[i - 1] < e[i - 1] && c[i] > e[i] ? 1 : c[i - 1] > e[i - 1] && c[i] < e[i] ? -1 : 0 : 0), 4);
	}),
	spec("move", "move-impulse", "Impulse 6 bars 1.5 ATR", {
		n: 6,
		mul: 1.5,
		keep: 4
	}, (k) => {
		const a = k.atr(14), c = k.b.c;
		return hold(state(k.b.n, (i) => i >= 6 && ok(a[i]) && Math.abs(c[i] - c[i - 6]) > 1.5 * a[i] ? c[i] - c[i - 6] : 0), 4);
	}),
	spec("move", "move-swing", "Swing 8 mid", { n: 8 }, (k) => {
		const { hi, lo } = k.don(8), c = k.b.c;
		return state(k.b.n, (i) => ok(hi[i], lo[i]) ? c[i] > hi[i] - (hi[i] - lo[i]) * .25 ? 1 : c[i] < lo[i] + (hi[i] - lo[i]) * .25 ? -1 : 0 : NaN);
	}),
	spec("move", "move-cont", "Continuation ROC12", { n: 12 }, (k) => {
		const r12 = k.roc(12), r3 = k.roc(3);
		return state(k.b.n, (i) => ok(r12[i], r3[i]) ? r12[i] > .004 && r3[i] < 0 ? 1 : r12[i] < -.004 && r3[i] > 0 ? -1 : 0 : NaN);
	}),
	spec("rsi", "rsi-extreme", "RSI14 30/70 revert", {
		p: 14,
		lo: 30,
		hi: 70
	}, (k) => {
		const r = k.rsi(14);
		return state(k.b.n, (i) => r[i] < 30 ? 1 : r[i] > 70 ? -1 : 0);
	}),
	spec("rsi", "rsi-mid", "RSI14 55/45 momentum", { p: 14 }, (k) => {
		const r = k.rsi(14);
		return state(k.b.n, (i) => r[i] > 55 ? 1 : r[i] < 45 ? -1 : 0);
	}),
	spec("rsi", "rsi-fast", "RSI7 20/80 revert", { p: 7 }, (k) => {
		const r = k.rsi(7);
		return state(k.b.n, (i) => r[i] < 20 ? 1 : r[i] > 80 ? -1 : 0);
	}),
	spec("rsi", "rsi-div", "RSI divergence 10", {
		p: 14,
		look: 10,
		keep: 4
	}, (k) => {
		const r = k.rsi(14), c = k.b.c;
		return hold(state(k.b.n, (i) => {
			if (i < 10 || !ok(r[i], r[i - 10])) return 0;
			if (c[i] < c[i - 10] && r[i] > r[i - 10] + 4 && r[i] < 45) return 1;
			if (c[i] > c[i - 10] && r[i] < r[i - 10] - 4 && r[i] > 55) return -1;
			return 0;
		}), 4);
	}),
	spec("bollinger", "bb-bounce", "BB bounce", {
		p: 20,
		k: 2
	}, (k) => {
		const { up, lo } = k.bb(20, 2), c = k.b.c;
		return state(k.b.n, (i) => c[i] < lo[i] ? 1 : c[i] > up[i] ? -1 : 0);
	}),
	spec("bollinger", "bb-walk", "BB band walk", {
		p: 20,
		k: 2
	}, (k) => {
		const { up, lo } = k.bb(20, 2), c = k.b.c;
		return state(k.b.n, (i) => i > 0 && c[i] > up[i] && c[i - 1] > up[i - 1] ? 1 : i > 0 && c[i] < lo[i] && c[i - 1] < lo[i - 1] ? -1 : 0);
	}),
	spec("bollinger", "bb-mid", "BB mid reclaim", {
		p: 20,
		keep: 4
	}, (k) => {
		const { mid } = k.bb(20, 2), c = k.b.c;
		return hold(state(k.b.n, (i) => i > 0 && ok(mid[i - 1]) ? c[i - 1] < mid[i - 1] && c[i] > mid[i] ? 1 : c[i - 1] > mid[i - 1] && c[i] < mid[i] ? -1 : 0 : 0), 4);
	}),
	spec("bollinger", "bb-wick", "BB wick tag", {
		p: 20,
		keep: 3
	}, (k) => {
		const { up, lo } = k.bb(20, 2), { c, h, l } = k.b;
		return hold(state(k.b.n, (i) => l[i] < lo[i] && c[i] > lo[i] ? 1 : h[i] > up[i] && c[i] < up[i] ? -1 : 0), 3);
	}),
	spec("sar", "sar-std", "PSAR 0.02", { step: .02 }, (k) => k.psar(.02, .2).dir),
	spec("sar", "sar-fast", "PSAR 0.04 fast", { step: .04 }, (k) => k.psar(.04, .3).dir),
	spec("sar", "sar-flip", "PSAR flip event", {
		step: .02,
		keep: 6
	}, (k) => {
		const d = k.psar(.02, .2).dir;
		return hold(state(k.b.n, (i) => i > 0 && d[i] !== d[i - 1] ? d[i] : 0), 6);
	}),
	spec("macd", "macd-cross", "MACD signal cross", { keep: 6 }, (k) => {
		const { line, signal } = k.macd();
		return hold(state(k.b.n, (i) => i > 0 && ok(signal[i - 1]) ? line[i - 1] < signal[i - 1] && line[i] > signal[i] ? 1 : line[i - 1] > signal[i - 1] && line[i] < signal[i] ? -1 : 0 : 0), 6);
	}),
	spec("macd", "macd-hist", "MACD hist rising", {}, (k) => {
		const { hist } = k.macd();
		return state(k.b.n, (i) => i > 1 && ok(hist[i - 2]) ? hist[i] > hist[i - 1] && hist[i - 1] > hist[i - 2] ? 1 : hist[i] < hist[i - 1] && hist[i - 1] < hist[i - 2] ? -1 : 0 : NaN);
	}),
	spec("macd", "macd-zero", "MACD zero line", {}, (k) => {
		const { line } = k.macd();
		return state(k.b.n, (i) => line[i]);
	}),
	spec("ema", "ema-21-55", "EMA 21/55", {
		f: 21,
		s: 55
	}, (k) => {
		const f = k.ema(21), s = k.ema(55);
		return state(k.b.n, (i) => f[i] - s[i]);
	}),
	spec("ema", "ema-pullback", "EMA21 pullback", { p: 21 }, (k) => {
		const e21 = k.ema(21), e55 = k.ema(55), { c, l, h } = k.b;
		return state(k.b.n, (i) => {
			if (!ok(e21[i], e55[i])) return NaN;
			if (e21[i] > e55[i] && l[i] <= e21[i] && c[i] > e21[i]) return 1;
			if (e21[i] < e55[i] && h[i] >= e21[i] && c[i] < e21[i]) return -1;
			return 0;
		});
	}),
	spec("ema", "ema-slope", "EMA50 slope", {
		p: 50,
		n: 5
	}, (k) => {
		const e = k.ema(50);
		return state(k.b.n, (i) => i >= 5 && ok(e[i - 5]) ? (e[i] - e[i - 5]) / e[i] - 0 : NaN);
	}),
	spec("ema", "ema-stoch", "EMA trend + stoch dip", { p: 21 }, (k) => {
		const e = k.ema(21), e2 = k.ema(55), { k: st } = k.stoch(14, 3);
		return state(k.b.n, (i) => ok(e[i], e2[i], st[i]) ? e[i] > e2[i] && st[i] < 25 ? 1 : e[i] < e2[i] && st[i] > 75 ? -1 : 0 : NaN);
	})
];
var VARIANTS = [];
var add = (x) => VARIANTS.push(x);
for (const [f, sl] of [
	[5, 20],
	[12, 26],
	[20, 50],
	[50, 200]
]) add(spec("trend", `trend-ema-${f}-${sl}`, `EMA ${f}/${sl} trend`, {
	fast: f,
	slow: sl
}, (k) => {
	const a = k.ema(f), b = k.ema(sl), c = k.b.c;
	return state(k.b.n, (i) => ok(a[i], b[i]) ? a[i] > b[i] && c[i] > b[i] ? 1 : a[i] < b[i] && c[i] < b[i] ? -1 : 0 : NaN);
}));
for (const min of [20, 30]) add(spec("trend", `trend-adx-${min}`, `ADX ${min} + DI`, {
	p: 14,
	min
}, (k) => {
	const { adx, pdi, mdi } = k.dmi(14);
	return state(k.b.n, (i) => ok(adx[i]) && adx[i] >= min ? pdi[i] - mdi[i] : 0);
}));
for (const [p, m] of [
	[7, 2],
	[14, 4],
	[21, 5]
]) add(spec("trend", `trend-st-${p}-${m}`, `Supertrend ${p}×${m}`, {
	p,
	m
}, (k) => k.st(p, m).dir));
for (const p of [
	10,
	40,
	55
]) add(spec("break", `break-don${p}`, `Donchian ${p} break`, {
	p,
	keep: 6
}, (k) => {
	const { hi, lo } = k.don(p), c = k.b.c;
	return hold(state(k.b.n, (i) => c[i] > hi[i] ? 1 : c[i] < lo[i] ? -1 : 0), 6);
}));
for (const mul of [1.3, 2]) add(spec("break", `break-vol-${mul}`, `Break + volume ${mul}×`, {
	p: 20,
	vol: mul,
	keep: 6
}, (k) => {
	const { hi, lo } = k.don(20), c = k.b.c, v = k.b.v, vs = k.volSma(20);
	return hold(state(k.b.n, (i) => v[i] > mul * vs[i] ? c[i] > hi[i] ? 1 : c[i] < lo[i] ? -1 : 0 : 0), 6);
}));
for (const mul of [
	.9,
	1.5,
	2
]) add(spec("break", `break-atr-${mul}`, `ATR ${mul}× expansion`, {
	p: 14,
	mul,
	keep: 4
}, (k) => {
	const a = k.atr(14), c = k.b.c;
	return hold(state(k.b.n, (i) => i > 0 && ok(a[i - 1]) && Math.abs(c[i] - c[i - 1]) > mul * a[i - 1] ? c[i] - c[i - 1] : 0), 4);
}));
for (const mul of [1.5, 2.5]) add(spec("active", `act-burst-${mul}`, `Range burst ${mul}×`, {
	p: 20,
	mul,
	keep: 4
}, (k) => {
	const rs = k.rangeSma(20), { o, c, h, l } = k.b;
	return hold(state(k.b.n, (i) => i > 0 && h[i] - l[i] > mul * rs[i - 1] ? c[i] - o[i] : 0), 4);
}));
for (const n of [5, 8]) add(spec("active", `act-hf-${n}`, `HF momentum ${n}`, { n }, (k) => {
	const a = k.atr(14), c = k.b.c;
	return state(k.b.n, (i) => {
		if (i < n || !ok(a[i])) return NaN;
		const d = c[i] - c[i - n];
		return Math.abs(d) > .9 * a[i] * Math.sqrt(n / 3) ? d : 0;
	});
}));
for (const [f, sl] of [
	[5, 13],
	[12, 26],
	[20, 50]
]) add(spec("direction", `dir-emax-${f}-${sl}`, `EMA ${f}/${sl} cross`, {
	f,
	s: sl
}, (k) => {
	const a = k.ema(f), b = k.ema(sl);
	return state(k.b.n, (i) => a[i] - b[i]);
}));
for (const p of [
	30,
	120,
	240
]) add(spec("direction", `dir-vwap-${p}`, `VWAP ${p} axis`, { p }, (k) => {
	const w = k.vwap(p), c = k.b.c;
	return state(k.b.n, (i) => c[i] - w[i]);
}));
add(spec("direction", "dir-thrust-4", "4-bar thrust", {
	n: 4,
	keep: 3
}, (k) => {
	const { c, o } = k.b;
	return hold(state(k.b.n, (i) => {
		if (i < 3) return 0;
		let u = true, d = true;
		for (let j = i - 3; j <= i; j++) {
			if (!(c[j] > o[j] && (j === i - 3 || c[j] > c[j - 1]))) u = false;
			if (!(c[j] < o[j] && (j === i - 3 || c[j] < c[j - 1]))) d = false;
		}
		return u ? 1 : d ? -1 : 0;
	}), 3);
}));
add(spec("direction", "dir-reclaim-50", "EMA50 reclaim", {
	p: 50,
	keep: 4
}, (k) => {
	const e = k.ema(50), c = k.b.c;
	return hold(state(k.b.n, (i) => i > 0 && ok(e[i - 1]) ? c[i - 1] < e[i - 1] && c[i] > e[i] ? 1 : c[i - 1] > e[i - 1] && c[i] < e[i] ? -1 : 0 : 0), 4);
}));
for (const [n, mul] of [
	[4, 1.2],
	[10, 2],
	[20, 2.5]
]) add(spec("move", `move-impulse-${n}-${mul}`, `Impulse ${n} bars ${mul} ATR`, {
	n,
	mul,
	keep: 4
}, (k) => {
	const a = k.atr(14), c = k.b.c;
	return hold(state(k.b.n, (i) => i >= n && ok(a[i]) && Math.abs(c[i] - c[i - n]) > mul * a[i] ? c[i] - c[i - n] : 0), 4);
}));
for (const n of [16, 32]) add(spec("move", `move-swing-${n}`, `Swing ${n} mid`, { n }, (k) => {
	const { hi, lo } = k.don(n), c = k.b.c;
	return state(k.b.n, (i) => ok(hi[i], lo[i]) ? c[i] > hi[i] - (hi[i] - lo[i]) * .25 ? 1 : c[i] < lo[i] + (hi[i] - lo[i]) * .25 ? -1 : 0 : NaN);
}));
for (const [p, lo, hi] of [
	[
		14,
		25,
		75
	],
	[
		14,
		20,
		80
	],
	[
		21,
		30,
		70
	],
	[
		7,
		15,
		85
	]
]) add(spec("rsi", `rsi-${p}-${lo}-${hi}`, `RSI${p} ${lo}/${hi} revert`, {
	p,
	lo,
	hi
}, (k) => {
	const r = k.rsi(p);
	return state(k.b.n, (i) => r[i] < lo ? 1 : r[i] > hi ? -1 : 0);
}));
for (const [p, lvl] of [
	[10, 25],
	[14, 15],
	[14, 20],
	[14, 25],
	[21, 15],
	[21, 20],
	[21, 25]
]) add(spec("rsi", `rsi-mom-${p}-${lvl}`, `RSI${p} ${lvl}/${100 - lvl} momentum`, {
	p,
	lvl
}, (k) => {
	const r = k.rsi(p);
	return state(k.b.n, (i) => r[i] > 100 - lvl ? 1 : r[i] < lvl ? -1 : 0);
}));
for (const [up, dn] of [[60, 40], [52, 48]]) add(spec("rsi", `rsi-mid-${up}-${dn}`, `RSI14 ${up}/${dn} momentum`, {
	p: 14,
	up,
	dn
}, (k) => {
	const r = k.rsi(14);
	return state(k.b.n, (i) => r[i] > up ? 1 : r[i] < dn ? -1 : 0);
}));
for (const [p, kk] of [
	[20, 2.5],
	[20, 3],
	[50, 2]
]) add(spec("bollinger", `bb-bounce-${p}-${kk}`, `BB ${p}/${kk} bounce`, {
	p,
	k: kk
}, (k) => {
	const { up, lo } = k.bb(p, kk), c = k.b.c;
	return state(k.b.n, (i) => c[i] < lo[i] ? 1 : c[i] > up[i] ? -1 : 0);
}));
add(spec("bollinger", "bb-walk-50", "BB 50 band walk", {
	p: 50,
	k: 2
}, (k) => {
	const { up, lo } = k.bb(50, 2), c = k.b.c;
	return state(k.b.n, (i) => i > 0 && c[i] > up[i] && c[i - 1] > up[i - 1] ? 1 : i > 0 && c[i] < lo[i] && c[i - 1] < lo[i - 1] ? -1 : 0);
}));
for (const step of [.01, .03]) add(spec("sar", `sar-${step}`, `PSAR ${step}`, { step }, (k) => k.psar(step, .2).dir));
for (const [f, sl, g] of [
	[
		5,
		35,
		5
	],
	[
		8,
		21,
		5
	],
	[
		19,
		39,
		9
	]
]) {
	add(spec("macd", `macd-cross-${f}-${sl}-${g}`, `MACD ${f}/${sl}/${g} cross`, {
		f,
		s: sl,
		g,
		keep: 6
	}, (k) => {
		const { line, signal } = k.macd(f, sl, g);
		return hold(state(k.b.n, (i) => i > 0 && ok(signal[i - 1]) ? line[i - 1] < signal[i - 1] && line[i] > signal[i] ? 1 : line[i - 1] > signal[i - 1] && line[i] < signal[i] ? -1 : 0 : 0), 6);
	}));
	add(spec("macd", `macd-hist-${f}-${sl}-${g}`, `MACD ${f}/${sl}/${g} hist sign`, {
		f,
		s: sl,
		g
	}, (k) => {
		const { hist } = k.macd(f, sl, g);
		return state(k.b.n, (i) => hist[i]);
	}));
}
for (const [f, sl] of [[9, 21], [50, 100]]) add(spec("ema", `ema-${f}-${sl}`, `EMA ${f}/${sl}`, {
	f,
	s: sl
}, (k) => {
	const a = k.ema(f), b = k.ema(sl);
	return state(k.b.n, (i) => a[i] - b[i]);
}));
for (const p of [20, 100]) add(spec("ema", `ema-slope-${p}`, `EMA${p} slope`, {
	p,
	n: 5
}, (k) => {
	const e = k.ema(p);
	return state(k.b.n, (i) => i >= 5 && ok(e[i - 5]) ? e[i] - e[i - 5] : NaN);
}));
add(spec("ema", "ema-pullback-50", "EMA50 pullback", { p: 50 }, (k) => {
	const e = k.ema(50), e2 = k.ema(100), { c, l, h } = k.b;
	return state(k.b.n, (i) => {
		if (!ok(e[i], e2[i])) return NaN;
		if (e[i] > e2[i] && l[i] <= e[i] && c[i] > e[i]) return 1;
		if (e[i] < e2[i] && h[i] >= e[i] && c[i] < e[i]) return -1;
		return 0;
	});
}));
for (const p of [
	14,
	20,
	40
]) for (const lvl of [100, 200]) add(spec("osc", `cci-${p}-${lvl}`, `CCI${p} ±${lvl}`, {
	p,
	lvl
}, (k) => {
	const x = k.cci(p);
	return state(k.b.n, (i) => x[i] < -lvl ? 1 : x[i] > lvl ? -1 : 0);
}));
for (const p of [14, 28]) for (const lvl of [80, 90]) add(spec("osc", `willr-${p}-${lvl}`, `Williams %R${p} ${lvl}`, {
	p,
	lvl
}, (k) => {
	const x = k.willr(p);
	return state(k.b.n, (i) => x[i] < -lvl ? 1 : x[i] > lvl - 100 ? -1 : 0);
}));
for (const lvl of [10, 20]) add(spec("osc", `srsi-14-${lvl}`, `Stoch RSI 14 ${lvl}/${100 - lvl}`, {
	p: 14,
	lvl
}, (k) => {
	const x = k.stochRsi(14);
	return state(k.b.n, (i) => x[i] < lvl ? 1 : x[i] > 100 - lvl ? -1 : 0);
}));
for (const p of [20, 50]) for (const t of [2, 2.5]) add(spec("osc", `z-${p}-${t}`, `Z-score ${p} ±${t}`, {
	p,
	t
}, (k) => {
	const x = k.z(p);
	return state(k.b.n, (i) => x[i] < -t ? 1 : x[i] > t ? -1 : 0);
}));
for (const lvl of [20, 10]) add(spec("volume", `mfi-14-${lvl}`, `MFI14 ${lvl}/${100 - lvl}`, {
	p: 14,
	lvl
}, (k) => {
	const x = k.mfi(14);
	return state(k.b.n, (i) => x[i] < lvl ? 1 : x[i] > 100 - lvl ? -1 : 0);
}));
for (const p of [20, 50]) add(spec("volume", `obv-${p}`, `OBV vs EMA${p}`, { p }, (k) => {
	const o = k.obv();
	const e = k.memo(`obvema${p}`, () => ema(o, p));
	return state(k.b.n, (i) => ok(e[i]) ? o[i] - e[i] : NaN);
}));
for (const t of [.05, .1]) add(spec("volume", `cmf-20-${t}`, `CMF20 ±${t}`, {
	p: 20,
	t
}, (k) => {
	const x = k.cmf(20);
	return state(k.b.n, (i) => x[i] > t ? 1 : x[i] < -t ? -1 : 0);
}));
for (const m of [
	1.5,
	2,
	2.5
]) add(spec("channel", `kelt-20-${m}`, `Keltner 20×${m} break`, {
	p: 20,
	m,
	keep: 4
}, (k) => {
	const { up, lo } = k.kelt(20, m), c = k.b.c;
	return hold(state(k.b.n, (i) => c[i] > up[i] ? 1 : c[i] < lo[i] ? -1 : 0), 4);
}));
for (const p of [20, 30]) add(spec("channel", `squeeze-${p}`, `Squeeze ${p} release`, {
	p,
	keep: 6
}, (k) => {
	const bb = k.bb(p, 2), kc = k.kelt(p, 1.5), c = k.b.c;
	return hold(state(k.b.n, (i) => {
		if (i < 1 || !ok(bb.up[i], kc.up[i], bb.up[i - 1], kc.up[i - 1])) return 0;
		const was = bb.up[i - 1] < kc.up[i - 1] && bb.lo[i - 1] > kc.lo[i - 1];
		const now = bb.up[i] < kc.up[i] && bb.lo[i] > kc.lo[i];
		return was && !now ? c[i] - kc.mid[i] : 0;
	}), 6);
}));
for (const p of [14, 25]) add(spec("channel", `aroon-${p}`, `Aroon ${p}`, { p }, (k) => {
	const { up, dn } = k.aroon(p);
	return state(k.b.n, (i) => up[i] > 70 && dn[i] < 30 ? 1 : dn[i] > 70 && up[i] < 30 ? -1 : 0);
}));
for (const [t, kk, b] of [[
	9,
	26,
	52
], [
	20,
	60,
	120
]]) {
	add(spec("ichimoku", `ichi-tk-${t}`, `Ichimoku ${t}/${kk} TK`, {
		t,
		k: kk,
		b
	}, (k) => {
		const x = k.ichi(t, kk, b);
		return state(k.b.n, (i) => ok(x.tenkan[i], x.kijun[i]) ? x.tenkan[i] - x.kijun[i] : NaN);
	}));
	add(spec("ichimoku", `ichi-cloud-${t}`, `Ichimoku ${t}/${kk} cloud`, {
		t,
		k: kk,
		b
	}, (k) => {
		const x = k.ichi(t, kk, b), c = k.b.c;
		return state(k.b.n, (i) => {
			if (!ok(x.spanA[i], x.spanB[i])) return NaN;
			const top = Math.max(x.spanA[i], x.spanB[i]), bot = Math.min(x.spanA[i], x.spanB[i]);
			return c[i] > top && x.tenkan[i] > x.kijun[i] ? 1 : c[i] < bot && x.tenkan[i] < x.kijun[i] ? -1 : 0;
		});
	}));
}
for (const p of [
	16,
	32,
	55
]) add(spec("smooth", `hma-${p}`, `HMA ${p} slope`, { p }, (k) => {
	const x = k.hma(p);
	return state(k.b.n, (i) => i > 0 && ok(x[i], x[i - 1]) ? x[i] - x[i - 1] : NaN);
}));
for (const p of [9, 15]) add(spec("smooth", `trix-${p}`, `TRIX ${p}`, { p }, (k) => {
	const x = k.trix(p);
	return state(k.b.n, (i) => x[i]);
}));
for (const p of [10, 20]) add(spec("smooth", `kama-${p}`, `KAMA ${p}`, { p }, (k) => {
	const x = k.kama(p), c = k.b.c;
	return state(k.b.n, (i) => i > 0 && ok(x[i], x[i - 1]) ? c[i] > x[i] && x[i] > x[i - 1] ? 1 : c[i] < x[i] && x[i] < x[i - 1] ? -1 : 0 : NaN);
}));
for (const n of [1, 3]) add(spec("smooth", `ha-${n}`, `Heikin-Ashi ${n} bar${n > 1 ? "s" : ""}`, { n }, (k) => {
	const x = k.ha();
	return state(k.b.n, (i) => {
		if (i < n - 1) return NaN;
		let up = 0, dn = 0;
		for (let j = i - n + 1; j <= i; j++) x.c[j] > x.o[j] ? up++ : x.c[j] < x.o[j] && dn++;
		return up === n ? 1 : dn === n ? -1 : 0;
	});
}));
var COMBINED_BASE = [
	"bb-walk",
	"break-vol",
	"break-vol-2",
	"break-atr-2",
	"act-burst-2.5",
	"act-chop",
	"cci-14-200",
	"cci-40-200",
	"z-50-2.5"
];
var INDICATIONS = [...BASE_INDICATIONS, ...VARIANTS];
var INDICATION_BY_ID = new Map(INDICATIONS.map((s) => [s.id, s]));
var TF_LADDER = [
	1,
	5,
	15,
	30
];
function laneOf(ind) {
	const m = /^(.*)@m(\d+)(c?)$/.exec(ind);
	return m ? {
		base: m[1],
		tf: +m[2],
		combined: m[3] === "c"
	} : {
		base: ind,
		tf: null,
		combined: false
	};
}
var laneInd = (base, tf, combined = false) => `${base}@m${tf}${combined ? "c" : ""}`;
/** Factors (× tf) of the higher ladder timeframes a combined lane must agree with. */
var higherFactors = (tf, ladder = TF_LADDER) => ladder.filter((h) => h > tf && h % tf === 0).map((h) => h / tf);
function indicationState(id, k) {
	const lane = laneOf(id);
	if (lane.tf !== null) {
		if (lane.base === "none") return null;
		if (!lane.combined) return indicationState(lane.base, k);
		const f = higherFactors(k.b.tfMin);
		return f.length ? mtfState(lane.base, k, f) : indicationState(lane.base, k);
	}
	if (id === "none") return null;
	const s = INDICATION_BY_ID.get(id);
	if (!s) throw new Error(`unknown indication ${id}`);
	return k.memo(`ind:${id}`, () => s.fn(k));
}
for (const id of COMBINED_BASE) {
	const base = [...BASE_INDICATIONS, ...VARIANTS].find((x) => x.id === id);
	if (!base) throw new Error(`combined base ${id} missing`);
	const c = spec(base.kind, `${id}@x4`, `${base.label} · 4× TF agrees`, {
		...base.params,
		htf: 4
	}, (k) => mtfState(id, k, [4]));
	INDICATIONS.push(c);
	INDICATION_BY_ID.set(c.id, c);
}
/**
* Combined timeframes: the indication's state on this timeframe, kept only where the SAME indication agrees on
* every higher timeframe `factors` (× this one), computed from completed higher bars only.
*/
function mtfState(id, k, factors) {
	if (!factors.length) return indicationState(id, k);
	return k.memo(`mtf:${factors.join("x")}:${id}`, () => {
		const base = indicationState(id, k);
		if (!base) return null;
		const out = Int8Array.from(base);
		for (const f of factors) {
			const { k: hk, map } = k.htf(f);
			const hs = indicationState(id, hk);
			for (let i = 0; i < out.length; i++) if (out[i] !== 0 && (map[i] < 0 || hs[map[i]] !== out[i])) out[i] = 0;
		}
		return out;
	});
}
//#endregion
//#region src/core/bots/bots.ts
var BOTS = [
	{
		type: "sandwich",
		label: "Sandwich",
		magnet: "1H VWAP",
		thesis: "Fade a stretch away from the hour VWAP once price turns back."
	},
	{
		type: "snap",
		label: "Snap",
		magnet: "1H VWAP + RSI",
		thesis: "VWAP fade confirmed by an RSI extreme."
	},
	{
		type: "pulse",
		label: "Pulse",
		magnet: "1H VWAP (expansion)",
		thesis: "VWAP fade only when this hour's range exceeds the last hour's."
	},
	{
		type: "ribbon",
		label: "Ribbon",
		magnet: "EMA21",
		thesis: "Fade a stretch from EMA21."
	},
	{
		type: "sweep",
		label: "Sweep",
		magnet: "Prior hour extreme",
		thesis: "Wick through the prior hour high/low, then reclaim."
	},
	{
		type: "clamp",
		label: "Clamp",
		magnet: "Hour open",
		thesis: "Fade a stretch from the hour open."
	},
	{
		type: "magnet",
		label: "Magnet",
		magnet: "Prior hour VWAP",
		thesis: "First half of the hour: fade back to the prior hour VWAP."
	},
	{
		type: "pivot",
		label: "Pivot",
		magnet: "Prior hour pivot",
		thesis: "Fade toward the prior hour (H+L+C)/3."
	},
	{
		type: "follow",
		label: "Follow",
		magnet: "—",
		thesis: "Enter in the indication's direction when its state turns on."
	},
	{
		type: "revert",
		label: "Revert",
		magnet: "—",
		thesis: "Fade the indication: enter against its direction when its state turns on."
	}
];
new Map(BOTS.map((b) => [b.type, b]));
var HOUR = 36e5;
function fade(k, magnet, extra) {
	const { c, n } = k.b;
	const a = k.atr(14);
	const out = new Int8Array(n);
	for (let i = 1; i < n; i++) {
		const m = magnet[i];
		const at = a[i];
		if (!Number.isFinite(m) || !Number.isFinite(at) || at <= 0) continue;
		const d = c[i] - m;
		if (d < -.9 * at && c[i] > c[i - 1]) {
			if (!extra || extra(i, 1)) out[i] = 1;
		} else if (d > .9 * at && c[i] < c[i - 1]) {
			if (!extra || extra(i, -1)) out[i] = -1;
		}
	}
	return out;
}
function botTrigger(type, k) {
	if (type === "follow" || type === "revert") return null;
	return k.memo(`bot:${type}`, () => {
		const per = k.period(HOUR);
		const { t, c, h, l, n } = k.b;
		switch (type) {
			case "sandwich": return fade(k, per.curVwap);
			case "snap": {
				const r = k.rsi(14);
				return fade(k, per.curVwap, (i, s) => s === 1 ? r[i] < 35 : r[i] > 65);
			}
			case "pulse": return fade(k, per.curVwap, (i) => per.curRange[i] > per.prevRange[i]);
			case "ribbon": return fade(k, k.ema(21));
			case "clamp": return fade(k, per.curOpen);
			case "magnet": return fade(k, per.prevVwap, (i) => t[i] % HOUR / 6e4 < 30);
			case "pivot": return fade(k, per.prevPivot);
			case "sweep": {
				const out = new Int8Array(n);
				for (let i = 0; i < n; i++) {
					const ph = per.prevHigh[i];
					const pl = per.prevLow[i];
					if (!Number.isFinite(ph)) continue;
					if (l[i] < pl && c[i] > pl) out[i] = 1;
					else if (h[i] > ph && c[i] < ph) out[i] = -1;
				}
				return out;
			}
			default: return new Int8Array(n);
		}
	});
}
/** Final entry signal for a bot × indication combo. Returns null when the combo is not defined. */
function comboSignal(bot, ind, k) {
	return k.memo(`combo:${bot}:${ind}`, () => {
		const st = indicationState(ind, k);
		if (bot === "follow" || bot === "revert") {
			if (!st) return null;
			const dir = bot === "follow" ? 1 : -1;
			const out = new Int8Array(k.b.n);
			for (let i = 1; i < st.length; i++) if (st[i] !== 0 && st[i] !== st[i - 1]) out[i] = st[i] * dir;
			return out;
		}
		const trig = botTrigger(bot, k);
		if (!st) return trig;
		const out = new Int8Array(trig.length);
		for (let i = 0; i < trig.length; i++) if (trig[i] !== 0 && st[i] === trig[i]) out[i] = trig[i];
		return out;
	});
}
/** Entry signal of a combo after the engine-wide tactics (session, volatility, trend strength). */
function entrySignal(bot, ind, k, tactics) {
	const sig = comboSignal(bot, ind, k);
	if (!sig) return null;
	return withTactics(sig, k, tacticKey(tactics), `${bot}:${ind}`);
}
//#endregion
//#region src/core/evals/evaluator.ts
var H$4 = 36e5;
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
		const from = o.nowT - h * H$4;
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
	const recentFrom = o.nowT - 72 * H$4;
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
//#endregion
//#region src/core/indications/cache.ts
var SeriesCache = class SeriesCache {
	b;
	m = /* @__PURE__ */ new Map();
	constructor(b) {
		this.b = b;
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
//#endregion
//#region src/core/lastn/optimizer.ts
var H$3 = 36e5;
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
	return ddt / H$3;
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
//#endregion
//#region src/core/sim/backtest.ts
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
//#endregion
//#region src/core/pipeline/portfolio.ts
var H$2 = 36e5;
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
			const k = Math.floor(x.exitT / H$2);
			hourNet.set(k, (hourNet.get(k) ?? 0) + x.r * 100);
		}
		if ((hourNet.get(Math.floor(tr.entryT / H$2)) ?? 0) <= -stopPct) continue;
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
//#endregion
//#region src/core/pipeline/pipeline.ts
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
	return {
		...p,
		tp: r4(p.tp),
		sl: r4(p.sl),
		trail: p.trail > 0 ? r4(p.trail) : 0,
		hold: Math.max(2, Math.round(p.hold * 15 / tf))
	};
}
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
	if (!byLane.size || mainTop <= 0) return out;
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
		for (const ind of INDICATIONS) if (!off.has(ind.kind)) plain.push({
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
function runCombo(u, bot, ind, protect, cost, stage, tactics) {
	const cooldown = tacticCooldown(tactics);
	protect = laneProtect(protect, ind);
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
		if (res.trades.length) {
			const st = statsOf(res.trades);
			bySym[u.bars[s].sym] = {
				n: st.n,
				net: st.net,
				pf: st.pf
			};
		}
	}
	trades.sort((a, b) => a.exitT - b.exitT || a.entryT - b.entryT);
	const is = statsOf(trades.filter((t) => t.exitT <= u.splitT), u.splitT);
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
function* runPipeline(u, s) {
	const timings = {};
	const cost = s.cost;
	const g = s.gates;
	let t0 = performance.now();
	const combos = allCombos(s.focus, s.disabledKinds, s.tfs);
	const s1 = [];
	for (let i = 0; i < combos.length; i++) {
		const c = combos[i];
		const r = runCombo(u, c.bot, c.ind, DEFAULT_PROTECT, cost, 1, s.tactics);
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
	const leaders = s1.filter((r) => r.is.n >= 4).slice(0, s.refineTop);
	const runs = /* @__PURE__ */ new Map();
	const s2 = [];
	const grid = REFINE_GRID;
	const total2 = leaders.length * grid.length;
	let done2 = 0;
	for (const L of leaders) for (const p of grid) {
		const r = runCombo(u, L.bot, L.ind, p, cost, 2, s.tactics);
		done2++;
		if (!r) continue;
		s2.push(r);
		if (done2 % 2 === 0) yield {
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
//#region src/core/sim/dca.ts
function simulateDca(cfg, bars, sig, p, dca, active, cost, cooldown = 0) {
	const { n, t, o, h, l, c, sym } = bars;
	const tfMs = bars.tfMin * 6e4;
	const trades = [];
	const kind = active ? "dca-active" : "dca";
	const levels = Math.max(1, dca.levels);
	const slDist = Math.max(p.sl, dca.step * (active ? 1 : levels) + dca.step * .5);
	let state = "flat";
	let side = 1;
	let ref = 0;
	let waitUntil = 0;
	let legs = [];
	let nextLevel = 0;
	let startI = 0;
	let stop = 0;
	let target = 0;
	let mfe = 0;
	let mae = 0;
	let filledThisBar = false;
	const lvlPx = (k) => side === 1 ? ref * (1 - dca.step * k) : ref * (1 + dca.step * k);
	const avg = () => legs.reduce((a, b) => a + b, 0) / legs.length;
	const retarget = () => {
		const a = avg();
		target = side === 1 ? a * (1 + p.tp) : a * (1 - p.tp);
	};
	let nextAllowed = 0;
	const close = (i, exit, reason) => {
		nextAllowed = i + 1 + cooldown;
		let r = 0;
		for (const px of legs) r += side * (exit - px) / px - cost;
		const a = avg();
		trades.push({
			cfg,
			sym,
			side,
			entryT: t[startI],
			exitT: t[i] + tfMs,
			entry: a,
			exit,
			r,
			reason,
			bars: i - startI + 1,
			mfe,
			mae,
			kind,
			vol: legs.length,
			level: active ? 1 : legs.length - 1
		});
		state = "flat";
		legs = [];
	};
	for (let i = 0; i < n; i++) {
		filledThisBar = false;
		if (state === "wait") {
			const px = lvlPx(1);
			if (side === 1 ? l[i] <= px : h[i] >= px) {
				legs = [side === 1 ? Math.min(o[i], px) : Math.max(o[i], px)];
				startI = i;
				state = "pos";
				stop = side === 1 ? ref * (1 - slDist) : ref * (1 + slDist);
				retarget();
				mfe = 0;
				mae = 0;
				filledThisBar = true;
				nextLevel = levels + 1;
			} else if (i >= waitUntil) state = "flat";
		}
		if (state === "pos") {
			while (nextLevel <= levels) {
				const px = lvlPx(nextLevel);
				if (!(side === 1 ? l[i] <= px : h[i] >= px)) break;
				legs.push(side === 1 ? Math.min(o[i], px) : Math.max(o[i], px));
				nextLevel++;
				filledThisBar = true;
				retarget();
			}
			const a = avg();
			const up = side === 1 ? (h[i] - a) / a : (a - l[i]) / a;
			const dn = side === 1 ? (a - l[i]) / a : (h[i] - a) / a;
			if (up > mfe) mfe = up;
			if (dn > mae) mae = dn;
			const gap = i > startI;
			if (side === 1 ? l[i] <= stop : h[i] >= stop) close(i, gap ? side === 1 ? Math.min(o[i], stop) : Math.max(o[i], stop) : stop, "sl");
			else if (!filledThisBar && (side === 1 ? h[i] >= target : l[i] <= target)) close(i, gap ? side === 1 ? Math.max(o[i], target) : Math.min(o[i], target) : target, "tp");
			else if (i - startI + 1 >= p.hold) close(i, c[i], "time");
		}
		if (state === "flat" && i + 1 < n && i + 1 >= nextAllowed && sig[i] !== 0) {
			side = sig[i] > 0 ? 1 : -1;
			ref = o[i + 1];
			if (active) {
				state = "wait";
				waitUntil = i + p.hold;
			} else {
				state = "pos";
				legs = [ref];
				startI = i + 1;
				nextLevel = 1;
				stop = side === 1 ? ref * (1 - slDist) : ref * (1 + slDist);
				retarget();
				mfe = 0;
				mae = 0;
			}
		}
	}
	const last = n > 0 ? sig[n - 1] : 0;
	return {
		trades,
		pending: state === "flat" && last !== 0 && n >= nextAllowed ? last > 0 ? 1 : -1 : 0
	};
}
//#endregion
//#region src/core/sim/axis.ts
function simulateAxis(cfg, bars, sig, p, ax, center, atr, cost, cooldown = 0) {
	const { n, t, o, h, l, c, sym } = bars;
	const tfMs = bars.tfMin * 6e4;
	const trades = [];
	const levels = Math.max(1, Math.round(ax.levels));
	let state = "flat";
	let side = 1;
	let legs = [];
	let rungs = [];
	let nextRung = 0;
	let startI = 0;
	let stop = 0;
	let target = 0;
	let mfe = 0;
	let mae = 0;
	const wsum = () => legs.reduce((a, x) => a + x.w, 0);
	const avg = () => legs.reduce((a, x) => a + x.px * x.w, 0) / wsum();
	let nextAllowed = 0;
	const admissible = (i, s, ref) => {
		const m = center[i];
		const a = atr[i];
		if (!Number.isFinite(m) || !Number.isFinite(a) || a <= 0) return false;
		const disp = (c[i] - m) / a;
		if ((s === 1 ? disp >= 0 : disp <= 0) || Math.abs(disp) < ax.minDisp || Math.abs(disp) > ax.maxDisp) return false;
		return s * (m - ref) / ref > 2 * cost;
	};
	const close = (i, exit, reason) => {
		nextAllowed = i + 1 + cooldown;
		let r = 0;
		for (const x of legs) r += x.w * (side * (exit - x.px) / x.px - cost);
		trades.push({
			cfg,
			sym,
			side,
			entryT: t[startI],
			exitT: t[i] + tfMs,
			entry: avg(),
			exit,
			r,
			reason,
			bars: i - startI + 1,
			mfe,
			mae,
			kind: "axis",
			vol: wsum(),
			level: legs.length - 1
		});
		state = "flat";
		legs = [];
	};
	let pendingOpen = -1;
	for (let i = 0; i < n; i++) {
		let filled = false;
		if (pendingOpen === i) {
			legs = [{
				px: o[i],
				w: 1
			}];
			startI = i;
			state = "pos";
			mfe = 0;
			mae = 0;
			pendingOpen = -1;
		}
		if (state === "pos") {
			while (nextRung < rungs.length) {
				const px = rungs[nextRung];
				if (!(side === 1 ? l[i] <= px : h[i] >= px)) break;
				legs.push({
					px: side === 1 ? Math.min(o[i], px) : Math.max(o[i], px),
					w: ax.ratio
				});
				nextRung++;
				filled = true;
			}
			const a = avg();
			const up = side === 1 ? (h[i] - a) / a : (a - l[i]) / a;
			const dn = side === 1 ? (a - l[i]) / a : (h[i] - a) / a;
			if (up > mfe) mfe = up;
			if (dn > mae) mae = dn;
			const gap = i > startI;
			if (side === 1 ? l[i] <= stop : h[i] >= stop) close(i, gap ? side === 1 ? Math.min(o[i], stop) : Math.max(o[i], stop) : stop, "sl");
			else if (!filled && (side === 1 ? h[i] >= target : l[i] <= target)) close(i, gap ? side === 1 ? Math.max(o[i], target) : Math.min(o[i], target) : target, "tp");
			else if (i - startI + 1 >= p.hold) close(i, c[i], "time");
		}
		if (state === "flat" && pendingOpen < 0 && i + 1 < n && i + 1 >= nextAllowed && sig[i] !== 0) {
			const s = sig[i] > 0 ? 1 : -1;
			const ref = o[i + 1];
			if (!admissible(i, s, ref)) continue;
			const m = center[i];
			const a = atr[i];
			side = s;
			target = m;
			const step = ax.spacing * a;
			rungs = [];
			for (let k = 1; k < levels; k++) rungs.push(side === 1 ? ref - step * k : ref + step * k);
			nextRung = 0;
			const deepest = side === 1 ? ref - step * (levels - 1) : ref + step * (levels - 1);
			stop = side === 1 ? deepest * (1 - p.sl) : deepest * (1 + p.sl);
			pendingOpen = i + 1;
		}
	}
	const last = n > 0 ? sig[n - 1] : 0;
	const ls = last > 0 ? 1 : -1;
	return {
		trades,
		pending: n > 0 && last !== 0 && state === "flat" && pendingOpen < 0 && n >= nextAllowed && admissible(n - 1, ls, c[n - 1]) ? ls : 0
	};
}
//#endregion
//#region src/core/sim/block.ts
var BLOCK_SOURCES = [
	"config",
	"overall",
	"symbol",
	"direction",
	"indication"
];
function levelOfTail(rs, maxLevel) {
	let level = 0;
	let sum = 0;
	for (let n = 1; n <= maxLevel && n <= rs.length; n++) {
		sum += rs[rs.length - n];
		if (sum > 0) level++;
	}
	return level;
}
/** Closed positions by source key, in exit order (append-only). */
var BlockBook = class {
	lists = /* @__PURE__ */ new Map();
	add(t) {
		for (const k of [
			"all",
			`s:${t.sym}`,
			`d:${t.side}`,
			`i:${t.kind}`
		]) {
			const l = this.lists.get(k);
			if (l) {
				l.push(t.r);
				if (l.length > 256) l.splice(0, l.length - 64);
			} else this.lists.set(k, [t.r]);
		}
	}
	level(key, maxLevel) {
		return levelOfTail(this.lists.get(key) ?? [], maxLevel);
	}
};
function sourcesOf(b) {
	const s = b.sources ?? {};
	return {
		config: s.config !== false,
		overall: !!s.overall,
		symbol: !!s.symbol,
		direction: !!s.direction,
		indication: !!s.indication
	};
}
function bookLevels(book, t, maxLevel) {
	if (!book) return {
		overall: 0,
		symbol: 0,
		direction: 0,
		indication: 0
	};
	return {
		overall: book.level("all", maxLevel),
		symbol: book.level(`s:${t.sym}`, maxLevel),
		direction: book.level(`d:${t.side}`, maxLevel),
		indication: book.level(`i:${t.kind}`, maxLevel)
	};
}
/** Combined level of the enabled sources: shared = max, additive = sum. */
function combineLevels(levels, b) {
	const on = sourcesOf(b);
	const xs = BLOCK_SOURCES.filter((k) => on[k]).map((k) => levels[k]);
	if (!xs.length) return 0;
	return (b.mode ?? "shared") === "additive" ? xs.reduce((a, x) => a + x, 0) : Math.max(...xs);
}
//#endregion
//#region src/core/sim/walkforward.ts
var H$1 = 36e5;
var DEFAULT_GRID = {
	tp: [
		.026,
		.035,
		.05,
		.07
	],
	slOfTp: [
		1,
		1.5,
		2,
		2.5
	],
	trailOfTp: [0, .5],
	minTrail: .006,
	minSl: .01,
	holdH: [8, 24],
	trailStep: 1,
	trailFree: false
};
/** Every protect variant of a grid (hold converted to bars). Each variant is computed independently. */
function protectGrid(tfMin, g = DEFAULT_GRID) {
	const out = [];
	const seen = /* @__PURE__ */ new Set();
	for (const tp of g.tp) for (const k of g.slOfTp) for (const tr of g.trailOfTp) for (const h of g.holdH) {
		const p = {
			tp,
			sl: +Math.max(g.minSl, tp * k).toFixed(4),
			trail: tr > 0 ? +Math.max(g.minTrail, tp * tr).toFixed(4) : 0,
			hold: Math.max(2, Math.round(h * 60 / tfMin))
		};
		if (p.trail > 0) {
			p.trailStep = g.trailStep ?? 1;
			p.trailFree = g.trailFree ?? false;
		}
		const key = `${p.tp}|${p.sl}|${p.trail}|${p.hold}`;
		if (!seen.has(key)) {
			seen.add(key);
			out.push(p);
		}
	}
	return out;
}
function dcaProtectGrid(tfMin) {
	const hold = Math.max(4, Math.round(480 / tfMin));
	return [.026, .035].map((tp) => ({
		tp,
		sl: +(tp * 1.5).toFixed(4),
		trail: 0,
		hold
	}));
}
function defaultWalkForward(s) {
	return {
		preH: 20,
		simH: 48,
		stepH: 1,
		portfolio: 12,
		lastN: 12,
		lastNMinPf: 1,
		maxPerSymbol: 3,
		maxOpen: 60,
		guardPct: 1,
		longH: 336,
		robustFrac: .6,
		rank: "lcb",
		bots: [],
		mode: "durable",
		durableSplits: 4,
		durableFrac: .75,
		preGate: true,
		maxPerSide: 16,
		toggles: {
			...DEFAULT_TOGGLES,
			...s.toggles ?? {}
		},
		block: {
			...DEFAULT_BLOCK,
			...s.block ?? {}
		},
		dca: {
			...DEFAULT_DCA,
			...s.dca ?? {}
		},
		gates: s.gates,
		cost: s.cost,
		protects: protectGrid(s.tfs?.length ? 15 : s.tfMin, s.grid ?? DEFAULT_GRID),
		dcaProtects: dcaProtectGrid(s.tfs?.length ? 15 : s.tfMin)
	};
}
var REASONS = [
	"tp",
	"sl",
	"trail",
	"time",
	"disarm"
];
function makeTape(id, bot, ind, protect, kind, syms, trades, open, pending) {
	trades.sort((a, b) => a.exitT - b.exitT || a.entryT - b.entryT);
	const n = trades.length;
	const symIdx = new Map(syms.map((s, i) => [s, i]));
	const f64 = 3 * n + 4 * (n + 1);
	const buf = /* @__PURE__ */ new ArrayBuffer(f64 * 8 + n * 4 * 3 + n * 2 * 2 + n * 3);
	let off = 0;
	const F = (len) => {
		const a = new Float64Array(buf, off, len);
		off += len * 8;
		return a;
	};
	const exitT = F(n), entryT = F(n), r = F(n), gp = F(n + 1), gl = F(n + 1), rs = F(n + 1), r2 = F(n + 1);
	const entry = new Float32Array(buf, off, n);
	off += n * 4;
	const exit = new Float32Array(buf, off, n);
	off += n * 4;
	const vol = new Float32Array(buf, off, n);
	off += n * 4;
	const symI = new Uint16Array(buf, off, n);
	off += n * 2;
	const bars = new Uint16Array(buf, off, n);
	off += n * 2;
	const side = new Int8Array(buf, off, n);
	off += n;
	const reason = new Uint8Array(buf, off, n);
	off += n;
	const tp = {
		id,
		bot,
		ind,
		protect,
		kind,
		n,
		syms,
		exitT,
		entryT,
		r,
		entry,
		exit,
		symI,
		side,
		reason,
		bars,
		vol,
		level: new Uint8Array(buf, off, n),
		gp,
		gl,
		rs,
		r2,
		open,
		pending
	};
	for (let i = 0; i < n; i++) {
		const t = trades[i];
		tp.exitT[i] = t.exitT;
		tp.entryT[i] = t.entryT;
		tp.r[i] = t.r;
		tp.entry[i] = t.entry;
		tp.exit[i] = t.exit;
		tp.symI[i] = symIdx.get(t.sym) ?? 0;
		tp.side[i] = t.side;
		tp.reason[i] = Math.max(0, REASONS.indexOf(t.reason));
		tp.bars[i] = Math.min(65535, t.bars);
		tp.vol[i] = t.vol ?? 1;
		tp.level[i] = Math.min(255, t.level ?? 0);
		const r = t.r;
		tp.gp[i + 1] = tp.gp[i] + (r > 0 ? r : 0);
		tp.gl[i + 1] = tp.gl[i] + (r < 0 ? -r : 0);
		tp.rs[i + 1] = tp.rs[i] + r;
		tp.r2[i + 1] = tp.r2[i] + r * r;
	}
	return tp;
}
/** Materialise one trade of a compact tape. */
function tradeAt(tp, i) {
	return {
		cfg: tp.id,
		sym: tp.syms[tp.symI[i]],
		side: tp.side[i],
		entryT: tp.entryT[i],
		exitT: tp.exitT[i],
		entry: tp.entry[i],
		exit: tp.exit[i],
		r: tp.r[i],
		reason: REASONS[tp.reason[i]],
		bars: tp.bars[i],
		mfe: 0,
		mae: 0,
		kind: tp.kind,
		vol: tp.vol[i],
		level: tp.level[i]
	};
}
function tapeTrades(tp, from = 0, to = tp.n) {
	const out = [];
	for (let i = from; i < to; i++) out.push(tradeAt(tp, i));
	return out;
}
/** O(1) window numbers from prefix sums (net in percent). */
function win(tp, a, b) {
	const gp = tp.gp[b] - tp.gp[a];
	const gl = tp.gl[b] - tp.gl[a];
	return {
		n: b - a,
		net: (tp.rs[b] - tp.rs[a]) * 100,
		pf: profitFactor(gp, gl)
	};
}
/** Longest time under the running peak inside [a, b), counting an open dip up to nowT (hours). */
function winDdt(tp, a, b, nowT) {
	if (b <= a) return 0;
	let cum = 0;
	let peak = 0;
	let peakT = tp.entryT[a];
	let dipped = false;
	let ddt = 0;
	for (let i = a; i < b; i++) {
		cum += tp.r[i];
		if (cum < peak) dipped = true;
		else {
			if (dipped && tp.exitT[i] - peakT > ddt) ddt = tp.exitT[i] - peakT;
			dipped = false;
			peak = cum;
			peakT = tp.exitT[i];
		}
	}
	if (dipped && nowT - peakT > ddt) ddt = nowT - peakT;
	return ddt / H$1;
}
/** Base: causal tapes for every combo × protect × sub-strategy. Generator so callers can time-slice. */
function* buildTapesGen(u, protects, cost, dcaOpt, only, tactics, adjust) {
	const adj = (bot, ind, kind, p) => adjustProtect(p, adjust?.[`${bot}|${ind}|${kind}`]);
	const cooldown = tacticCooldown(tactics);
	const combos = only ? [...only].map((k) => {
		const [bot, ind] = k.split("|");
		return {
			bot,
			ind
		};
	}) : allCombos();
	const syms = u.bars.map((b) => b.sym);
	const out = [];
	const per = protects.length + (dcaOpt ? dcaOpt.protects.length * (dcaOpt.axis ? 3 : 2) : 0);
	const total = combos.length * per;
	let done = 0;
	for (const c of combos) {
		const series = seriesOf(u, c.ind);
		const sigs = new Array(u.bars.length).fill(null);
		for (const s of series) {
			sigs[s] = entrySignal(c.bot, c.ind, u.caches[s], tactics);
			yield {
				done,
				total
			};
		}
		if (!series.length || series.some((s) => sigs[s] === null)) {
			done += per;
			continue;
		}
		for (const p0 of protects) {
			const kind = p0.trail > 0 ? "trailing" : "normal";
			const p = adj(c.bot, c.ind, kind, laneProtect(p0, c.ind));
			const id = configId(c.bot, c.ind, p);
			const trades = [];
			const open = [];
			const pending = [];
			for (const s of series) {
				const res = simulate(id, u.bars[s], sigs[s], p, {
					cost,
					cooldown
				});
				for (const tr of res.trades) {
					tr.kind = kind;
					trades.push(tr);
				}
				if (res.open) open.push(res.open);
				if (res.pending) pending.push({
					sym: u.bars[s].sym,
					side: res.pending
				});
			}
			out.push(makeTape(id, c.bot, c.ind, p, kind, syms, trades, open, pending));
			done++;
			yield {
				done,
				total
			};
		}
		if (dcaOpt) {
			for (const p0 of dcaOpt.protects) for (const active of [false, true]) {
				const kind = active ? "dca-active" : "dca";
				const p = adj(c.bot, c.ind, kind, laneProtect(p0, c.ind));
				const id = configId(c.bot, c.ind, p, kind);
				const trades = [];
				const pending = [];
				for (const s of series) {
					const res = simulateDca(id, u.bars[s], sigs[s], p, dcaOpt.dca, active, cost, cooldown);
					for (const tr of res.trades) trades.push(tr);
					if (res.pending) pending.push({
						sym: u.bars[s].sym,
						side: res.pending
					});
				}
				out.push(makeTape(id, c.bot, c.ind, p, kind, syms, trades, [], pending));
				done++;
				yield {
					done,
					total
				};
			}
			if (dcaOpt.axis) {
				const ax = dcaOpt.axis;
				for (const p0 of dcaOpt.protects) {
					const p = adj(c.bot, c.ind, "axis", laneProtect(p0, c.ind));
					const id = configId(c.bot, c.ind, p, "axis");
					const trades = [];
					const pending = [];
					for (const s of series) {
						const k = u.caches[s];
						const res = simulateAxis(id, u.bars[s], sigs[s], p, ax, k.ema(Math.max(2, Math.round(ax.center))), k.atr(14), cost, cooldown);
						for (const tr of res.trades) trades.push(tr);
						if (res.pending) pending.push({
							sym: u.bars[s].sym,
							side: res.pending
						});
					}
					out.push(makeTape(id, c.bot, c.ind, p, "axis", syms, trades, [], pending));
					done++;
					yield {
						done,
						total
					};
				}
			}
		}
	}
	return out;
}
/** First index with exitT >= t. */
function lowerBound(a, t) {
	let lo = 0;
	let hi = a.length;
	while (lo < hi) {
		const m = lo + hi >> 1;
		if (a[m] < t) lo = m + 1;
		else hi = m;
	}
	return lo;
}
/** Whether a sub-strategy may execute at all under the toggles (Block may still veto per trade). */
function kindExecutable(kind, tg) {
	switch (kind) {
		case "normal": return tg.normal || tg.block;
		case "trailing": return tg.trailing;
		case "dca": return tg.dca && !tg.dcaActive;
		case "dca-active": return tg.dca && tg.dcaActive;
		case "axis": return tg.axis !== false;
	}
}
/** Block level from the config's own closes before `entryT`: independent last-n windows, n = 1..maxLevel. */
function blockLevel(tp, entryT, b) {
	const end = lowerBound(tp.exitT, entryT + 1);
	let level = 0;
	let sum = 0;
	for (let n = 1; n <= b.maxLevel && n <= end; n++) {
		sum += tp.r[end - n];
		if (sum > 0) level++;
	}
	return level;
}
/** Lower confidence bound (≈ 1σ) of the summed return over [a, b): mean·n − sd·√n, in percent. */
function lcbFast(tp, a, b) {
	const n = b - a;
	if (n < 2) return 0;
	const s = tp.rs[b] - tp.rs[a];
	const s2 = tp.r2[b] - tp.r2[a];
	const m = s / n;
	const sd = Math.sqrt(Math.max(0, (s2 - n * m * m) / (n - 1)));
	return (m * n - sd * Math.sqrt(n)) * 100;
}
/**
* Main + Real selection at time t (only trades closed before t count).
* Main: long window passes PF/DDT (DDT limit scales per 72h) and the pair is parameter-robust.
* Real: still working over the pre-historic window (PF >= neutral, net >= 0; < 3 closes = quiet, allowed)
*       and executable under the toggles. Best variant per pair, top `portfolio` by rank.
*/
function selectAt(tapes, t, o) {
	const longH = Math.max(o.longH, o.preH);
	const fromLong = t - longH * H$1;
	const fromPre = t - o.preH * H$1;
	const minLong = Math.max(8, o.gates.minTrades);
	const ddtMax = o.gates.maxDdtH * longH / 72;
	const pairTotal = /* @__PURE__ */ new Map();
	const pairOk = /* @__PURE__ */ new Map();
	const cand = [];
	const botOk = o.bots.length ? new Set(o.bots) : null;
	for (const tp of tapes) {
		if (botOk && !botOk.has(tp.bot)) continue;
		const a = lowerBound(tp.exitT, fromLong);
		const b = lowerBound(tp.exitT, t);
		if (b - a < minLong) continue;
		const pair = `${tp.bot}|${tp.ind}`;
		pairTotal.set(pair, (pairTotal.get(pair) ?? 0) + 1);
		const w = win(tp, a, b);
		if (w.net <= 0 || w.pf < o.gates.minPf) continue;
		const ddt = winDdt(tp, a, b, t);
		if (ddt > ddtMax) continue;
		pairOk.set(pair, (pairOk.get(pair) ?? 0) + 1);
		if (!kindExecutable(tp.kind, o.toggles)) continue;
		const pre = win(tp, lowerBound(tp.exitT, fromPre), b);
		if (o.preGate && pre.n >= 3 && (pre.pf < 1 || pre.net < 0)) continue;
		const score = o.rank === "lcb" ? lcbFast(tp, a, b) : o.rank === "net" ? w.net : scoreStats(statsOf(tapeTrades(tp, a, b), t), minLong);
		if (!(score > 0)) continue;
		cand.push({
			id: tp.id,
			score,
			window: {
				...w,
				ddt
			},
			pair
		});
	}
	const robust = (pair) => (pairOk.get(pair) ?? 0) / Math.max(1, pairTotal.get(pair) ?? 0) >= o.robustFrac;
	const scored = cand.filter((c) => robust(c.pair)).sort((x, y) => y.score - x.score);
	const pairs = /* @__PURE__ */ new Set();
	const picks = [];
	for (const s of scored) {
		if (pairs.has(s.pair)) continue;
		pairs.add(s.pair);
		picks.push({
			id: s.id,
			score: s.score,
			window: s.window
		});
		if (picks.length >= o.portfolio) break;
	}
	return {
		picks,
		eligible: scored.length
	};
}
/** Durable winners at t: consistent across sub-windows of the long window. */
function selectDurable(tapes, t, o, held) {
	const longH = Math.max(o.longH, o.preH);
	const from = t - longH * H$1;
	const minLong = Math.max(8, o.gates.minTrades);
	const k = Math.max(2, o.durableSplits);
	const span = longH * H$1 / k;
	const botOk = o.bots.length ? new Set(o.bots) : null;
	const keep = [];
	const cand = [];
	for (const tp of tapes) {
		if (botOk && !botOk.has(tp.bot)) continue;
		if (!kindExecutable(tp.kind, o.toggles)) continue;
		const a = lowerBound(tp.exitT, from);
		const b = lowerBound(tp.exitT, t);
		const w = win(tp, a, b);
		const pair = `${tp.bot}|${tp.ind}`;
		if (held.has(tp.id)) {
			if (w.n >= 3 && w.pf >= 1 && w.net > 0) keep.push({
				id: tp.id,
				score: w.net,
				window: {
					...w,
					ddt: 0
				},
				pair
			});
			continue;
		}
		if (w.n < minLong || w.net <= 0 || w.pf < o.gates.minPf) continue;
		let pos = 0;
		for (let i = 0; i < k; i++) {
			const sa = lowerBound(tp.exitT, from + i * span);
			const sb = lowerBound(tp.exitT, from + (i + 1) * span);
			if (sb > sa && tp.rs[sb] - tp.rs[sa] > 0) pos++;
		}
		if (pos / k < o.durableFrac) continue;
		if (o.preGate) {
			const pre = win(tp, lowerBound(tp.exitT, t - o.preH * H$1), b);
			if (pre.n >= 3 && (pre.pf < 1 || pre.net < 0)) continue;
		}
		cand.push({
			id: tp.id,
			score: lcbFast(tp, a, b),
			window: {
				...w,
				ddt: 0
			},
			pair
		});
	}
	const pairs = /* @__PURE__ */ new Set();
	const picks = [];
	for (const s of keep.sort((x, y) => y.score - x.score)) {
		if (pairs.has(s.pair) || picks.length >= o.portfolio) continue;
		pairs.add(s.pair);
		picks.push(s);
	}
	for (const s of cand.sort((x, y) => y.score - x.score)) {
		if (picks.length >= o.portfolio) break;
		if (pairs.has(s.pair)) continue;
		pairs.add(s.pair);
		picks.push(s);
	}
	return {
		picks,
		eligible: keep.length + cand.length
	};
}
/**
* Fixed set: every focus pair trades continuously (no PF / durability gate — the set was validated offline, see
* the research presets). Per pair the protect × sub-strategy with the best lower-confidence score over the long
* window is used; last-N, Block and the caps still apply at execution.
*/
function selectFixed(tapes, t, o) {
	const from = t - Math.max(o.longH, o.preH) * H$1;
	const botOk = o.bots.length ? new Set(o.bots) : null;
	const best = /* @__PURE__ */ new Map();
	for (const tp of tapes) {
		if (botOk && !botOk.has(tp.bot)) continue;
		if (!kindExecutable(tp.kind, o.toggles)) continue;
		const a = lowerBound(tp.exitT, from);
		const b = lowerBound(tp.exitT, t);
		const w = win(tp, a, b);
		const score = w.n >= 3 ? lcbFast(tp, a, b) : -1e9;
		const pair = `${tp.bot}|${tp.ind}`;
		const cur = best.get(pair);
		if (!cur || score > cur.score) best.set(pair, {
			id: tp.id,
			score,
			window: {
				...w,
				ddt: 0
			}
		});
	}
	return {
		picks: [...best.values()].sort((x, y) => y.score - x.score).slice(0, o.portfolio),
		eligible: best.size
	};
}
function lastNOk(tp, entryT, n, minPf) {
	if (n <= 0) return true;
	const b = lowerBound(tp.exitT, entryT + 1);
	if (b < n) return false;
	return profitFactor(tp.gp[b] - tp.gp[b - n], tp.gl[b] - tp.gl[b - n]) >= minPf;
}
/** Indication type of a tape (Block "indication" source). */
var kindOfInd = (ind) => INDICATION_BY_ID.get(laneOf(ind).base)?.kind ?? "none";
/** Block book entry of a position: its unit result (without the Block multiplier, like the config level). */
var blockEntryOf = (x) => ({
	sym: x.sym,
	side: x.side,
	kind: kindOfInd(x.cfg.split("|")[1] ?? ""),
	r: x.r / (x.mult || 1)
});
/** Real-stage execution rules for one candidate entry (toggles, last-N, Block / Block Active). */
function execDecision(tp, entryT, o, ctx) {
	const tg = o.toggles;
	if (!kindExecutable(tp.kind, tg)) return {
		ok: false,
		why: "toggle"
	};
	if (o.paused?.size && o.paused.has(setKeyOf(tp.id))) return {
		ok: false,
		why: "adjustPause"
	};
	if (!lastNOk(tp, entryT, o.lastN, o.lastNMinPf)) return {
		ok: false,
		why: "lastN"
	};
	const level = tg.block ? combineLevels({
		config: blockLevel(tp, entryT, o.block),
		...bookLevels(ctx?.book, {
			sym: ctx?.sym ?? "",
			side: ctx?.side ?? 0,
			kind: kindOfInd(tp.ind)
		}, o.block.maxLevel)
	}, o.block) : 0;
	if (tg.block && tg.blockActive && level < o.block.minActiveLevel) return {
		ok: false,
		why: "blockActive"
	};
	if (tp.kind === "normal" && !tg.normal && level < 1) return {
		ok: false,
		why: "normalOff"
	};
	return {
		ok: true,
		level,
		vol: tg.block ? Math.min(o.block.maxMult, 1 + o.block.ratio * level) : 1
	};
}
function* walkForwardGen(u, tapes, o) {
	const byId = new Map(tapes.map((t) => [t.id, t]));
	const endT = u.nowT;
	const startT = o.startT ?? Math.floor((endT - o.simH * H$1) / H$1) * H$1;
	const stopT = o.startT === void 0 ? endT : Math.min(endT, startT + o.simH * H$1);
	const steps = [];
	const trades = [];
	const open = [];
	const hourNet = /* @__PURE__ */ new Map();
	const skips = {};
	const skip = (why) => skips[why] = (skips[why] ?? 0) + 1;
	const book = new BlockBook();
	const feed = [];
	const vopen = [];
	const seen = /* @__PURE__ */ new Set();
	const settle = (t) => {
		while (vopen.length && vopen[0].exitT <= t) book.add(vopen.shift());
		while (open.length && open[0].exitT <= t) {
			const x = open.shift();
			const k = Math.floor(x.exitT / H$1);
			hourNet.set(k, (hourNet.get(k) ?? 0) + x.r * 100);
		}
	};
	let held = /* @__PURE__ */ new Set();
	const barH = (u.baseTf ?? u.bars[0]?.tfMin ?? 60) / 60;
	const stepH = Math.max(o.stepH, barH);
	for (let t = startT; t < stopT; t += stepH * H$1) {
		const { picks, eligible } = o.mode === "durable" ? selectDurable(tapes, t, o, held) : o.mode === "fixed" ? selectFixed(tapes, t, o) : selectAt(tapes, t, o);
		held = new Set(picks.map((p) => p.id));
		const cands = [];
		for (const p of picks) {
			const tp = byId.get(p.id);
			for (let i = 0; i < tp.n; i++) {
				const e = tp.entryT[i];
				if (e >= t && e < t + stepH * H$1 && e < stopT) cands.push({
					tr: tradeAt(tp, i),
					tp
				});
			}
		}
		cands.sort((a, b) => a.tr.entryT - b.tr.entryT || a.tr.cfg.localeCompare(b.tr.cfg));
		let taken = 0;
		let skipped = 0;
		let net = 0;
		for (const { tr, tp } of cands) {
			settle(tr.entryT);
			const fk = `${tr.cfg}|${tr.sym}|${tr.entryT}`;
			if (!seen.has(fk)) {
				seen.add(fk);
				const fe = blockEntryOf(tr);
				const fx = {
					exitT: tr.exitT,
					...fe
				};
				feed.push(fx);
				let j = vopen.length;
				vopen.push(fx);
				while (j > 0 && vopen[j - 1].exitT > fx.exitT) {
					vopen[j] = vopen[j - 1];
					j--;
				}
				vopen[j] = fx;
			}
			const hourKey = Math.floor(tr.entryT / H$1);
			let why = "";
			if (o.guardPct > 0 && (hourNet.get(hourKey) ?? 0) <= -o.guardPct) why = "hourGuard";
			else if (open.some((x) => x.sym === tr.sym && x.cfg === tr.cfg)) why = "dupe";
			else if (open.reduce((a, x) => a + (x.sym === tr.sym ? 1 : 0), 0) >= o.maxPerSymbol) why = "perSymbol";
			else if (open.length >= o.maxOpen) why = "maxOpen";
			else if (open.reduce((a, x) => a + (x.side === tr.side ? 1 : 0), 0) >= o.maxPerSide) why = "perSide";
			const dec = why ? null : execDecision(tp, tr.entryT, o, {
				book,
				sym: tr.sym,
				side: tr.side
			});
			if (dec && !dec.ok) why = dec.why;
			if (why || !dec || !dec.ok) {
				skipped++;
				skip(why);
				continue;
			}
			const x = {
				...tr,
				r: tr.r * dec.vol,
				vol: (tr.vol ?? 1) * dec.vol,
				mult: dec.vol,
				level: tp.kind.startsWith("dca") || tp.kind === "axis" ? tr.level : dec.level
			};
			trades.push(x);
			taken++;
			net += x.r * 100;
			let j = open.length;
			open.push(x);
			while (j > 0 && open[j - 1].exitT > x.exitT) {
				open[j] = open[j - 1];
				j--;
			}
			open[j] = x;
		}
		steps.push({
			t,
			main: eligible,
			real: picks.map((p) => p.id),
			taken,
			skipped,
			net
		});
		yield t;
	}
	trades.sort((a, b) => a.exitT - b.exitT);
	const stats = statsOf(trades, stopT);
	const hn = hourlyNet(trades);
	const perHour = /* @__PURE__ */ new Map();
	for (const x of trades) {
		const k = Math.floor((x.exitT - 1) / H$1) * H$1;
		const e = perHour.get(k) ?? {
			gp: 0,
			gl: 0
		};
		if (x.r > 0) e.gp += x.r;
		else e.gl -= x.r;
		perHour.set(k, e);
	}
	const hourly = [...hn.entries()].sort((a, b) => a[0] - b[0]).map(([t, e]) => ({
		t,
		net: e.net,
		n: e.n,
		pf: profitFactor(perHour.get(t)?.gp ?? 0, perHour.get(t)?.gl ?? 0)
	}));
	const blockH = 8;
	const blocks = [];
	for (let b = startT; b < stopT; b += blockH * H$1) {
		const s = statsOf(trades.filter((x) => x.exitT >= b && x.exitT < b + blockH * H$1));
		blocks.push({
			t: b,
			n: s.n,
			pf: s.pf,
			net: s.net
		});
	}
	const group = (key) => {
		const m = /* @__PURE__ */ new Map();
		for (const tr of trades) {
			const k = key(tr);
			(m.get(k) ?? m.set(k, []).get(k)).push(tr);
		}
		return m;
	};
	const byConfig = [...group((t) => t.cfg).entries()].map(([id, xs]) => {
		const s = statsOf(xs);
		return {
			id,
			n: s.n,
			net: s.net,
			pf: s.pf
		};
	}).sort((a, b) => b.net - a.net);
	const byKind = {};
	for (const [k, xs] of group((t) => t.kind ?? "normal")) {
		const s = statsOf(xs);
		byKind[k] = {
			n: s.n,
			net: s.net,
			pf: s.pf
		};
	}
	const activeBlocks = blocks.filter((b) => b.n >= 3);
	const stable = stats.pf >= o.gates.minPf && stats.net > 0 && activeBlocks.every((b) => b.pf >= .9);
	const { protects: _p, dcaProtects: _d, ...rest } = o;
	return {
		startT,
		endT: stopT,
		opts: rest,
		trades,
		stats,
		hourly,
		blocks,
		steps,
		byConfig,
		byKind,
		skips,
		stable,
		feed: feed.sort((a, b) => a.exitT - b.exitT)
	};
}
//#endregion
//#region src/core/audit.ts
var close = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps * Math.max(1, Math.abs(a), Math.abs(b));
function auditState(inp) {
	const t0 = performance.now();
	const checks = [];
	const add = (name, ok, detail) => checks.push({
		name,
		ok,
		detail
	});
	const byId = new Map(inp.tapes.map((t) => [t.id, t]));
	if (inp.base?.evaluated !== void 0) {
		const { evaluated = 0, passed = 0 } = inp.base;
		add("stages: Base passed ≤ evaluated", passed <= evaluated, `${passed} / ${evaluated}`);
	}
	const sim = inp.sim;
	if (sim) {
		const o = sim.opts;
		const trades = sim.trades;
		let foreign = 0;
		let offKind = 0;
		let badR = 0;
		for (const x of trades) {
			const tp = byId.get(x.cfg);
			if (!tp) foreign++;
			else if (!kindExecutable(tp.kind, o.toggles)) offKind++;
			if (!Number.isFinite(x.r) || x.exitT < x.entryT) badR++;
		}
		add("lanes: trades come from Main tapes", foreign === 0, `${foreign} of ${trades.length} without a tape`);
		add("lanes: only enabled strategies execute", offKind === 0, `${offKind} of a disabled kind`);
		add("numbers: finite results, exit ≥ entry", badR === 0, `${badR} invalid`);
		const order = [...trades].sort((a, b) => a.entryT - b.entryT || a.cfg.localeCompare(b.cfg) || a.sym.localeCompare(b.sym));
		const exits = sim.feed ?? [];
		const book = new BlockBook();
		let ei = 0;
		let denied = 0;
		let volMismatch = 0;
		let levelMismatch = 0;
		let checked = 0;
		const firstBad = [];
		for (const x of order) {
			while (ei < exits.length && exits[ei].exitT <= x.entryT) book.add(exits[ei++]);
			const tp = byId.get(x.cfg);
			if (!tp) continue;
			checked++;
			const d = execDecision(tp, x.entryT, o, {
				book,
				sym: x.sym,
				side: x.side
			});
			if (!d.ok) {
				denied++;
				if (firstBad.length < 3) firstBad.push(`${x.cfg}@${x.sym} ${d.why}`);
				continue;
			}
			const mult = x.mult ?? 1;
			if (!close(d.vol, mult)) {
				volMismatch++;
				if (firstBad.length < 3) firstBad.push(`${x.cfg}@${x.sym} vol ${mult} ≠ ${d.vol}`);
			}
			if (!(tp.kind.startsWith("dca") || tp.kind === "axis") && (x.level ?? 0) !== d.level) levelMismatch++;
		}
		add("replay: every trade passes the Real rules with its recorded Block volume and level", denied + volMismatch + levelMismatch === 0, `${checked} replayed · denied ${denied} · volume ≠ ${volMismatch} · level ≠ ${levelMismatch}${firstBad.length ? ` · ${firstBad.join("; ")}` : ""}`);
		if (o.toggles.block) {
			const over = trades.filter((x) => (x.mult ?? 1) > o.block.maxMult + 1e-9 || (x.mult ?? 1) < 1 - 1e-9).length;
			add("block: volume within [1, max multiple]", over === 0, `${over} outside · max ${o.block.maxMult}`);
		} else {
			const scaled = trades.filter((x) => !close(x.mult ?? 1, 1)).length;
			add("block: off → volume 1", scaled === 0, `${scaled} scaled`);
		}
		const ev = [];
		for (const x of trades) {
			ev.push([
				x.entryT,
				1,
				x
			]);
			ev.push([
				x.exitT,
				-1,
				x
			]);
		}
		ev.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
		let open = 0;
		let maxOpen = 0;
		const perSym = /* @__PURE__ */ new Map();
		const perSide = /* @__PURE__ */ new Map();
		const live = /* @__PURE__ */ new Set();
		let symOver = 0;
		let sideOver = 0;
		let dupes = 0;
		for (const [, k, x] of ev) {
			const key = `${x.cfg}|${x.sym}`;
			if (k === 1) {
				if (live.has(key)) dupes++;
				live.add(key);
				open++;
				maxOpen = Math.max(maxOpen, open);
				const s = (perSym.get(x.sym) ?? 0) + 1;
				perSym.set(x.sym, s);
				if (s > o.maxPerSymbol) symOver++;
				const d = (perSide.get(x.side) ?? 0) + 1;
				perSide.set(x.side, d);
				if (d > o.maxPerSide) sideOver++;
			} else {
				live.delete(key);
				open--;
				perSym.set(x.sym, (perSym.get(x.sym) ?? 1) - 1);
				perSide.set(x.side, (perSide.get(x.side) ?? 1) - 1);
			}
		}
		add("caps: max open", maxOpen <= o.maxOpen, `peak ${maxOpen} / ${o.maxOpen}`);
		add("caps: per symbol / per side", symOver + sideOver === 0, `symbol over ${symOver} · side over ${sideOver}`);
		add("caps: no duplicate config × symbol open at once", dupes === 0, `${dupes}`);
		const s = statsOf([...trades].sort((a, b) => a.exitT - b.exitT), sim.endT);
		add("numbers: stats match the trade list", s.n === sim.stats.n && close(s.net, sim.stats.net) && close(s.pf, sim.stats.pf), `n ${sim.stats.n}/${s.n} · net ${sim.stats.net.toFixed(3)}/${s.net.toFixed(3)} · PF ${sim.stats.pf.toFixed(3)}/${s.pf.toFixed(3)}`);
		const hn = sim.hourly.reduce((a, h) => a + h.n, 0);
		const hnet = sim.hourly.reduce((a, h) => a + h.net, 0);
		add("numbers: hourly rows add up", hn === trades.length && close(hnet, s.net, 1e-4), `n ${hn}/${trades.length} · net ${hnet.toFixed(3)}/${s.net.toFixed(3)}`);
		const kn = Object.values(sim.byKind).reduce((a, k) => a + k.n, 0);
		add("numbers: per-kind rows add up", kn === trades.length, `${kn}/${trades.length}`);
		let costBad = 0;
		let costChecked = 0;
		for (const x of trades) {
			const tp = byId.get(x.cfg);
			if (!tp || tp.kind.startsWith("dca") || tp.kind === "axis" || (x.vol ?? 1) !== (x.mult ?? 1)) continue;
			costChecked++;
			if (!close(x.r / (x.mult ?? 1), x.side * (x.exit - x.entry) / x.entry - inp.cost, 1e-4)) costBad++;
		}
		add("numbers: every plain close pays the round-trip cost", costBad === 0, `${costChecked} checked · ${costBad} off`);
	}
	const p = inp.paper;
	if (p) {
		const ids = new Set(inp.tapes.map((t) => t.id));
		const orphan = p.selected.filter((id) => !ids.has(id)).length;
		add("stages: Real selection ⊆ Main tapes", orphan === 0, `${orphan} of ${p.selected.length} missing`);
		const eq = p.trades.reduce((a, t) => a + t.r * p.notional, 0) + p.positions.reduce((a, x) => a + x.mtm * p.notional, 0);
		add("paper: equity = closed + open mark-to-market", close(eq, p.equity, 1e-6), `${p.equity.toFixed(4)} vs ${eq.toFixed(4)}`);
		const maxMult = sim?.opts.block.maxMult ?? Infinity;
		const badVol = p.positions.filter((x) => (x.vol ?? 1) < 1 - 1e-9 || (x.vol ?? 1) > maxMult + 1e-9).length;
		add("paper: position volume within [1, max multiple]", badVol === 0, `${badVol} of ${p.positions.length}`);
	}
	return {
		at: Date.now(),
		ok: checks.every((c) => c.ok),
		checks,
		ms: Math.round(performance.now() - t0)
	};
}
//#endregion
//#region src/core/server/db.server.ts
var SCHEMA = `
CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT NOT NULL, at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS symbols (sym TEXT PRIMARY KEY, last REAL, quote_vol REAL, change_pct REAL, bars INTEGER DEFAULT 0, first_t INTEGER, last_t INTEGER, at INTEGER);
CREATE TABLE IF NOT EXISTS candles (sym TEXT NOT NULL, t INTEGER NOT NULL, o REAL, h REAL, l REAL, c REAL, v REAL, PRIMARY KEY (sym, t)) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS results (
  id TEXT PRIMARY KEY, stage INTEGER, bot TEXT, ind TEXT, tp REAL, sl REAL, trail REAL, hold INTEGER,
  n INTEGER, pf REAL, net REAL, wr REAL, mdd REAL, ddt REAL, gh REAL, tph REAL,
  is_n INTEGER, is_pf REAL, is_net REAL, score REAL, rank INTEGER, armed INTEGER DEFAULT 0,
  best_n INTEGER, oos_n INTEGER, oos_pf REAL, oos_net REAL, oos_ddt REAL, lastn_ok INTEGER, eval_pass REAL, eval_ok INTEGER,
  by_sym TEXT, at INTEGER);
CREATE INDEX IF NOT EXISTS results_stage ON results(stage, score DESC);
CREATE TABLE IF NOT EXISTS lastn (cfg TEXT NOT NULL, n INTEGER NOT NULL, part TEXT NOT NULL, taken INTEGER, pf REAL, net REAL, ddt REAL, score REAL, PRIMARY KEY (cfg, n, part)) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS evals (id INTEGER PRIMARY KEY AUTOINCREMENT, cfg TEXT NOT NULL, at INTEGER NOT NULL, win TEXT NOT NULL, n INTEGER, pf REAL, net REAL, ddt REAL, wr REAL, pass INTEGER);
CREATE INDEX IF NOT EXISTS evals_cfg ON evals(cfg, at);
CREATE TABLE IF NOT EXISTS tapes (cfg TEXT NOT NULL, sym TEXT NOT NULL, side INTEGER, entry_t INTEGER NOT NULL, exit_t INTEGER, entry REAL, exit REAL, r REAL, reason TEXT, bars INTEGER, PRIMARY KEY (cfg, sym, entry_t)) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS sim_runs (id INTEGER PRIMARY KEY AUTOINCREMENT, at INTEGER, start_t INTEGER, end_t INTEGER, n INTEGER, pf REAL, net REAL, gh REAL, tph REAL, ddt REAL, stable INTEGER, opts TEXT, blocks TEXT, hourly TEXT);
CREATE TABLE IF NOT EXISTS paper_trades (cfg TEXT NOT NULL, sym TEXT NOT NULL, side INTEGER, entry_t INTEGER NOT NULL, exit_t INTEGER, entry REAL, exit REAL, r REAL, pnl REAL, reason TEXT, PRIMARY KEY (cfg, sym, entry_t)) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS paper_positions (cfg TEXT NOT NULL, sym TEXT NOT NULL, side INTEGER, entry_t INTEGER, entry REAL, stop REAL, target REAL, mtm REAL, at INTEGER, PRIMARY KEY (cfg, sym)) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS live_orders (coid TEXT PRIMARY KEY, cfg TEXT, sym TEXT, side INTEGER, kind TEXT, qty REAL, px REAL, status TEXT, msg TEXT, at INTEGER);
CREATE TABLE IF NOT EXISTS live_fills (coid TEXT PRIMARY KEY, sym TEXT, side INTEGER, kind TEXT, qty REAL, ref_px REAL, fill_px REAL, fee REAL, at INTEGER);
CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT, at INTEGER NOT NULL, level TEXT NOT NULL, msg TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS runs (id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT, started INTEGER, ended INTEGER, items INTEGER, ms REAL, note TEXT);
`;
var TABLES = [
	"kv",
	"symbols",
	"candles",
	"results",
	"lastn",
	"evals",
	"tapes",
	"sim_runs",
	"paper_trades",
	"paper_positions",
	"live_orders",
	"live_fills",
	"events",
	"runs"
];
var CoreDb = class {
	db;
	stmts = /* @__PURE__ */ new Map();
	/** JSON file holding the durable kv keys (settings, presets, backtests …) across restarts; null = memory only */
	statePath = null;
	stateTimer = null;
	constructor(path = ":memory:", opts = {}) {
		this.db = new DatabaseSync(path);
		this.db.exec("PRAGMA journal_mode = MEMORY; PRAGMA synchronous = OFF; PRAGMA temp_store = MEMORY;");
		this.db.exec(SCHEMA);
		if (opts.statePath) this.loadState(opts.statePath);
	}
	loadState(path) {
		this.statePath = path;
		try {
			if (!existsSync(path)) return;
			const j = JSON.parse(readFileSync(path, "utf8"));
			for (const [k, v] of Object.entries(j)) if (DURABLE_KEYS.has(k)) this.kvWrite(k, v);
		} catch (err) {
			console.warn(`[core-v2] state file ${path} not loaded: ${err instanceof Error ? err.message : err}`);
		}
	}
	/** Debounced write of the durable keys; a read-only host disables it quietly. */
	persistState() {
		if (!this.statePath || this.stateTimer) return;
		this.stateTimer = setTimeout(() => {
			this.stateTimer = null;
			if (!this.statePath) return;
			try {
				const out = {};
				for (const k of DURABLE_KEYS) {
					const v = this.kvGet(k);
					if (v !== void 0) out[k] = v;
				}
				mkdirSync(dirname(this.statePath), { recursive: true });
				const tmp = `${this.statePath}.tmp`;
				writeFileSync(tmp, JSON.stringify(out));
				renameSync(tmp, this.statePath);
			} catch (err) {
				console.warn(`[core-v2] state file not writable (${err instanceof Error ? err.message : err}) — memory only`);
				this.statePath = null;
			}
		}, 1e3);
		this.stateTimer.unref?.();
	}
	prep(sql) {
		let s = this.stmts.get(sql);
		if (!s) {
			s = this.db.prepare(sql);
			this.stmts.set(sql, s);
		}
		return s;
	}
	tx(fn) {
		this.db.exec("BEGIN");
		try {
			const r = fn();
			this.db.exec("COMMIT");
			return r;
		} catch (e) {
			this.db.exec("ROLLBACK");
			throw e;
		}
	}
	all(sql, ...p) {
		return this.prep(sql).all(...p);
	}
	get(sql, ...p) {
		return this.prep(sql).get(...p);
	}
	run(sql, ...p) {
		return this.prep(sql).run(...p);
	}
	kvGet(k) {
		const r = this.get("SELECT v FROM kv WHERE k = ?", k);
		return r ? JSON.parse(r.v) : void 0;
	}
	kvSet(k, v) {
		this.kvWrite(k, v);
		if (DURABLE_KEYS.has(k)) this.persistState();
	}
	kvWrite(k, v) {
		this.run("INSERT INTO kv (k, v, at) VALUES (?, ?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v, at = excluded.at", k, JSON.stringify(v), Date.now());
	}
	event(level, msg) {
		this.run("INSERT INTO events (at, level, msg) VALUES (?, ?, ?)", Date.now(), level, msg.slice(0, 500));
	}
	/** Row counts and page usage for the Engine page. */
	tableStats() {
		return TABLES.map((t) => ({
			table: t,
			rows: Number(this.get(`SELECT COUNT(*) AS n FROM ${t}`)?.n ?? 0)
		}));
	}
	bytes() {
		return Number(this.get("PRAGMA page_count")?.page_count ?? 0) * Number(this.get("PRAGMA page_size")?.page_size ?? 4096);
	}
	trim() {
		this.run("DELETE FROM events WHERE id <= (SELECT MAX(id) - 3000 FROM events)");
		this.run("DELETE FROM evals WHERE id <= (SELECT MAX(id) - 20000 FROM evals)");
		this.run("DELETE FROM runs WHERE id <= (SELECT MAX(id) - 500 FROM runs)");
		this.run("DELETE FROM sim_runs WHERE id <= (SELECT MAX(id) - 200 FROM sim_runs)");
		this.run("DELETE FROM live_orders WHERE at < (SELECT at FROM live_orders ORDER BY at DESC LIMIT 1 OFFSET 20000)");
		this.run("DELETE FROM paper_trades WHERE exit_t < (SELECT exit_t FROM paper_trades ORDER BY exit_t DESC LIMIT 1 OFFSET 20000)");
	}
	/** Create empty shadow copies (same DDL) of tables, e.g. results → results_next. */
	shadowCreate(tables) {
		for (const t of tables) {
			const m = new RegExp(`CREATE TABLE IF NOT EXISTS ${t} \\(([\\s\\S]*?)\\)( WITHOUT ROWID)?;`).exec(SCHEMA);
			if (!m) throw new Error(`no DDL for ${t}`);
			this.db.exec(`DROP TABLE IF EXISTS ${t}_next; CREATE TABLE ${t}_next (${m[1]})${m[2] ?? ""};`);
		}
	}
	/** Atomically replace tables with their shadow copies (readers see old or new, never half). */
	shadowSwap(tables) {
		this.tx(() => {
			for (const t of tables) this.db.exec(`DROP TABLE ${t}; ALTER TABLE ${t}_next RENAME TO ${t};`);
			this.db.exec(SCHEMA);
		});
		this.stmts.clear();
	}
	snapshot(path) {
		try {
			mkdirSync(dirname(path), { recursive: true });
			const tmp = `${path}.tmp`;
			if (existsSync(tmp)) renameSync(tmp, `${tmp}.old`);
			this.db.exec(`VACUUM INTO '${tmp.replace(/'/g, "''")}'`);
			renameSync(tmp, path);
			return true;
		} catch {
			return false;
		}
	}
	restore(path) {
		if (!existsSync(path)) return false;
		try {
			this.db.exec(`ATTACH DATABASE '${path.replace(/'/g, "''")}' AS snap`);
			this.tx(() => {
				for (const t of TABLES) if (this.get("SELECT COUNT(*) AS n FROM snap.sqlite_master WHERE type='table' AND name = ?", t)?.n) this.db.exec(`INSERT OR REPLACE INTO main.${t} SELECT * FROM snap.${t}`);
			});
			this.db.exec("DETACH DATABASE snap");
			return true;
		} catch {
			try {
				this.db.exec("DETACH DATABASE snap");
			} catch {}
			return false;
		}
	}
};
var G$1 = globalThis;
/** kv keys that survive a restart (the market data and results are recomputed) */
var DURABLE_KEYS = /* @__PURE__ */ new Set([
	"settings",
	"wf",
	"presets",
	"presetBacktests",
	"activePreset",
	"liveModes",
	"controlStatus",
	"adjust",
	"liveCost"
]);
function coreDb() {
	const env = (process.env.CTS_CORE_STATE ?? "").trim();
	const statePath = env === "off" ? null : env || join(process.cwd(), ".cts-core", "state.json");
	if (!G$1.__ctsCoreDb) G$1.__ctsCoreDb = new CoreDb(":memory:", { statePath });
	else if (!upgraded) upgradeShared(G$1.__ctsCoreDb);
	upgraded = true;
	return G$1.__ctsCoreDb;
}
var upgraded = false;
/**
* A hot-reloaded server module finds the database created by an older module version: give it this version's
* methods and create the tables added since (the schema is idempotent). Without this a new table is missing
* until a restart and every cycle that touches it fails.
*/
function upgradeShared(db) {
	if (Object.getPrototypeOf(db) !== CoreDb.prototype) Object.setPrototypeOf(db, CoreDb.prototype);
	db.db?.exec(SCHEMA);
	db.stmts?.clear();
}
//#endregion
//#region src/core/server/runtime.server.ts
var H = 36e5;
var SLICE_MS = 12;
var BACKTEST_LIMIT_MS = 9e5;
var yieldNow = () => new Promise((r) => setImmediate(r));
var CoreRuntime = class {
	db;
	settings;
	wf;
	status;
	candles = /* @__PURE__ */ new Map();
	tickers = [];
	pipeline = null;
	tapes = [];
	sim = null;
	paper;
	/** self-audit after every paper step (invariants recomputed from the published state) */
	audit = null;
	lastAuditKey = "";
	timer = null;
	busy = false;
	dirty = true;
	/** loop generation: a cycle from an older generation never reschedules or publishes */
	gen = 0;
	stopped = false;
	resetUniverse = false;
	loop = monitorEventLoopDelay({ resolution: 20 });
	snapshotPath = process.env.CTS_CORE_SNAPSHOT || "";
	lastSnapshot = 0;
	onLive;
	/** market source: live BingX (the app) or synthetic (automated tests only, explicit opt-in) */
	market;
	/** market data functions (injectable for recovery tests) */
	feed;
	healer = null;
	errorsInRow = 0;
	constructor(db = coreDb(), settings, opts = {}) {
		this.feed = {
			tickers: fetchTickers,
			history: fetchHistory,
			klines: fetchKlines,
			...opts.feed ?? {}
		};
		this.market = opts.market ?? "bingx";
		this.db = db;
		const saved = db.kvGet("settings");
		this.settings = mergeSettings(DEFAULT_SETTINGS, saved, settings);
		this.settings.gates.minPf = Math.min(1.5, Math.max(1.05, this.settings.gates.minPf));
		this.settings.gates.maxDdtH = Math.min(20, Math.max(2, this.settings.gates.maxDdtH));
		this.wf = {
			...defaultWalkForward(this.settings),
			...pickWf(db.kvGet("wf") ?? {})
		};
		const now = Date.now();
		this.status = {
			state: "idle",
			stage: "",
			progress: 0,
			label: "",
			cycles: 0,
			computes: 0,
			startedAt: now,
			heartbeat: now,
			lastCycleMs: 0,
			lastComputeMs: 0,
			lastBarT: 0,
			source: "none",
			symbols: [],
			error: null,
			nextCycleAt: now,
			phases: {},
			mainPairs: 0,
			settingsAt: 0,
			appliedSettingsAt: 0,
			lastComputeAt: 0,
			pending: true,
			heals: 0,
			lastHeal: "",
			errorsInRow: 0,
			loop: {
				p50: 0,
				p99: 0,
				max: 0
			}
		};
		this.loop.enable();
		this.paper = {
			selected: [],
			eligible: 0,
			positions: [],
			trades: [],
			equity: 0,
			startedAt: now
		};
	}
	/** Current loop generation (live steps abort when it changes). */
	get generation() {
		return this.gen;
	}
	/** Tickers fetched now (for live pricing); falls back to the last known ones. */
	/** when `tickers` were last fetched successfully (live sizing refuses prices older than 30 s) */
	tickersAt = 0;
	async freshTickers() {
		try {
			const t = await this.feed.tickers();
			if (t.length) {
				this.tickers = t;
				this.tickersAt = Date.now();
			}
		} catch {}
		return this.tickers;
	}
	start() {
		if (!this.stopped && this.status.state !== "idle" && this.status.state !== "error") return;
		if (this.status.state === "idle" && this.snapshotPath && this.db.restore(this.snapshotPath)) this.db.event("info", `restored snapshot ${this.snapshotPath}`);
		this.stopped = false;
		if (!this.busy) this.status.state = "booting";
		if (!this.healer) {
			this.healer = setInterval(() => {
				this.heal().catch((err) => {
					try {
						this.db.event("error", `heal: ${err instanceof Error ? err.message : err}`);
					} catch {}
				});
			}, 3e4);
			this.healer.unref?.();
		}
		this.db.event("info", "runtime start");
		this.schedule(0);
	}
	/** Stop now: the in-flight cycle is abandoned at its next yield (a new generation), nothing half-published. */
	stop() {
		this.stopped = true;
		this.gen++;
		this.busy = false;
		this.dirty = true;
		if (this.timer) clearTimeout(this.timer);
		this.timer = null;
		this.status.state = "stopped";
		this.db.event("info", "runtime stopped");
	}
	/** Watchdog: if a cycle has not beaten for a long time, abandon it (new generation) and start fresh. */
	ensureAlive() {
		if (this.status.state === "idle") return this.start();
		if (this.stopped) return;
		if (!(!this.busy && this.timer !== null && this.status.nextCycleAt > Date.now() - 6e4) && Date.now() - this.status.heartbeat > Math.max(18e4, this.settings.cycleMs * 8)) {
			this.db.event("warn", "watchdog: loop stale, starting a new generation");
			this.gen++;
			this.busy = false;
			this.dirty = true;
			this.status.heartbeat = Date.now();
			this.schedule(0);
		}
	}
	noteHeal(msg, level = "warn") {
		this.status.heals++;
		this.status.lastHeal = `${(/* @__PURE__ */ new Date()).toISOString().slice(11, 19)} ${msg}`;
		this.db.event(level, `self-heal: ${msg}`);
	}
	/**
	* Periodic self-healing (every 30 s, independent of viewers):
	*  - stale loop → new generation (ensureAlive)
	*  - a lost timer (nothing scheduled while not busy / stopped) → reschedule
	*/
	/** Fields added in newer code versions, for an instance re-bound after a dev hot reload. */
	ensureFields() {
		const self = this;
		if (!(self.btCandles instanceof Map)) self.btCandles = /* @__PURE__ */ new Map();
		if (self.backtestJob === void 0) self.backtestJob = null;
		if (typeof self.lastConsoleAt !== "number") self.lastConsoleAt = 0;
		if (typeof self.backfillKey !== "string") self.backfillKey = "";
		if (self.audit === void 0) self.audit = null;
		if (typeof self.lastAuditKey !== "string") self.lastAuditKey = "";
		if (typeof self.tickersAt !== "number") self.tickersAt = 0;
		if (typeof self.workersBroken !== "boolean") self.workersBroken = false;
		if (!(self.staleUntil instanceof Map)) self.staleUntil = /* @__PURE__ */ new Map();
		if (!(self.prehistSyms instanceof Map)) self.prehistSyms = /* @__PURE__ */ new Map();
		if (typeof self.prehistTotal !== "number") self.prehistTotal = 0;
		if (typeof self.prehistPending !== "boolean") self.prehistPending = false;
		if (typeof self.prehistStartedAt !== "number") self.prehistStartedAt = 0;
		if (typeof self.prehistReadyAt !== "number") self.prehistReadyAt = 0;
	}
	async heal() {
		for (const [tf, c] of this.btCandles) if (Date.now() - c.at > 6e5) this.btCandles.delete(tf);
		try {
			this.db.trim();
		} catch {}
		if (this.backtestJob?.state === "running" && Date.now() - this.backtestJob.startedAt > 96e4) {
			this.backtestJob.state = "error";
			this.backtestJob.error = "timed out";
		}
		if (this.stopped) return;
		const beforeGen = this.gen;
		this.ensureAlive();
		if (this.gen !== beforeGen) this.noteHeal("stale loop replaced by a new generation");
		if (!this.busy && !this.timer && !this.stopped && this.status.state !== "idle") {
			this.noteHeal("no cycle scheduled, rescheduling");
			this.schedule(0);
		}
	}
	updateSettings(patch, wfPatch) {
		const prevUniverse = `${this.settings.symbols}|${this.settings.tfMin}|${this.settings.historyDays}|${this.settings.symbolRank}`;
		const next = mergeSettings(this.settings, patch);
		if (patch.fees && patch.cost === void 0) next.cost = +(2 * (next.fees.taker + next.fees.slippage)).toFixed(5);
		const g = next.grid;
		const variants = g.tp.length * g.slOfTp.length * g.trailOfTp.length * g.holdH.length;
		if (variants > 240) throw new Error(`protect grid too large (${variants} variants, max 240)`);
		next.gates.minPf = Math.min(1.5, Math.max(1.05, next.gates.minPf));
		next.gates.maxDdtH = Math.min(20, Math.max(2, next.gates.maxDdtH));
		this.settings = next;
		this.wf = {
			...defaultWalkForward(this.settings),
			...pickWf(this.wf),
			...sanitizeWf(wfPatch ?? {}),
			gates: this.settings.gates,
			cost: this.settings.cost,
			toggles: this.settings.toggles,
			block: this.settings.block,
			dca: this.settings.dca
		};
		this.db.kvSet("settings", this.settings);
		this.db.kvSet("wf", pickWf(this.wf));
		this.status.settingsAt = Date.now();
		if (prevUniverse !== `${this.settings.symbols}|${this.settings.tfMin}|${this.settings.historyDays}|${this.settings.symbolRank}`) this.resetUniverse = true;
		this.db.event("info", this.busy ? "settings updated — applied after the running compute" : "settings updated");
		this.kick();
	}
	/** Drop all candles and backfill again (applied at the start of the next cycle). */
	requestResync() {
		this.resetUniverse = true;
		this.kick();
	}
	/** Re-run the compute stages on the next cycle, now (or right after the running one). */
	kick() {
		this.dirty = true;
		this.status.pending = true;
		if (!this.busy && !this.stopped) this.schedule(0);
	}
	/**
	* Time to the next cycle: the next bar close (+2 s for the exchange to publish it), never later than cycleMs
	* (live control and tickers keep their cadence) and never sooner than 1 s. The next cycle only starts after
	* this one has finished (schedule is called from its end).
	*/
	nextInterval() {
		const tfMs = this.settings.tfMin * 6e4;
		const now = Date.now();
		const toClose = Math.ceil(now / tfMs) * tfMs + 2e3 - now;
		return Math.max(1e3, Math.min(this.settings.cycleMs, toClose));
	}
	schedule(ms) {
		if (this.timer) clearTimeout(this.timer);
		this.status.nextCycleAt = Date.now() + ms;
		this.timer = setTimeout(() => {
			this.timer = null;
			this.cycle().catch((err) => {
				this.status.error = err instanceof Error ? err.message : String(err);
				try {
					this.db.event("error", `cycle crashed: ${this.status.error}`);
				} catch {}
				if (!this.stopped) this.schedule(3e4);
			});
		}, ms);
		this.timer.unref?.();
	}
	setStage(stage, done, total, label = "") {
		this.status.stage = stage;
		this.status.progress = total ? done / total : 0;
		this.status.label = label;
		this.status.heartbeat = Date.now();
	}
	async cycle() {
		if (this.busy || this.stopped) return;
		this.busy = true;
		const gen = this.gen;
		const t0 = performance.now();
		try {
			if (this.resetUniverse) {
				this.resetUniverse = false;
				this.candles.clear();
				this.backfillKey = "";
				this.staleUntil.clear();
				this.prehistSyms.clear();
				this.prehistTotal = 0;
				this.prehistPending = false;
				this.prehistStartedAt = Date.now();
				this.prehistReadyAt = 0;
				this.db.run("DELETE FROM candles");
				this.db.run("DELETE FROM symbols");
				this.dirty = true;
			}
			const newBars = await this.syncMarket(gen);
			if (gen !== this.gen) return;
			if (this.resetUniverse) return;
			if (newBars || this.dirty) await this.compute(gen);
			if (gen !== this.gen) return;
			const stale = this.dirty || this.resetUniverse;
			if (!stale) this.phase("Paper", () => this.stepPaper());
			if (!stale) this.phase("Adjust", () => this.runAdjust());
			if (!stale) this.phase("Audit", () => this.runAudit());
			if (!stale && this.onLive && this.settings.live.enabled) {
				await this.onLive(this, this.pendingEntries(), gen);
				if (gen !== this.gen) return;
			}
			if (!this.stopped) this.status.state = "running";
			this.status.error = null;
			if (this.snapshotPath && Date.now() - this.lastSnapshot > 6e5) {
				this.lastSnapshot = Date.now();
				this.db.snapshot(this.snapshotPath);
			}
			this.db.trim();
			if (this.errorsInRow > 0) this.noteHeal(`recovered after ${this.errorsInRow} failed cycle(s)`, "info");
			this.errorsInRow = 0;
		} catch (e) {
			if (gen === this.gen) {
				this.errorsInRow++;
				this.dirty = true;
				this.status.state = this.stopped ? "stopped" : "error";
				this.status.error = e instanceof Error ? e.message : String(e);
				this.db.event("error", `cycle: ${this.status.error}`);
			}
		} finally {
			if (gen === this.gen) {
				this.status.cycles++;
				this.status.lastCycleMs = performance.now() - t0;
				this.status.heartbeat = Date.now();
				this.busy = false;
				this.status.errorsInRow = this.errorsInRow;
				const backoff = this.errorsInRow ? Math.min(6e5, 5e3 * 2 ** Math.min(7, this.errorsInRow - 1)) : 0;
				if (!this.stopped) this.schedule(backoff || (this.dirty ? 0 : this.nextInterval()));
			}
		}
	}
	phase(name, fn) {
		const t = performance.now();
		const r = fn();
		const ms = performance.now() - t;
		this.status.phases[name] = {
			ms,
			maxSliceMs: ms
		};
		return r;
	}
	async syncMarket(gen) {
		const s = this.settings;
		const want = Math.round(s.historyDays * 24 * 60 / s.tfMin);
		const minBars = Math.max(50, Math.min(200, Math.floor(want * .8)));
		const uniKey = `${s.symbols}|${s.tfMin}|${s.historyDays}|${s.symbolRank}`;
		if (this.candles.size === 0) {
			this.status.state = "backfill";
			this.loadCandlesFromDb();
			if (this.candles.size) this.backfillKey = uniKey;
		}
		const baseMs = s.tfMin * 6e4;
		const spacing = (cs) => {
			let m = Infinity;
			for (let i = Math.max(1, cs.length - 10); i < cs.length; i++) m = Math.min(m, cs[i].t - cs[i - 1].t);
			return m;
		};
		if ([...this.candles.values()].some((cs) => cs.length > 2 && spacing(cs) !== baseMs)) {
			this.db.event("info", `stored candles are not ${s.tfMin}m bars: re-backfilling`);
			this.candles.clear();
			this.db.run("DELETE FROM candles");
			this.backfillKey = "";
			this.prehistSyms.clear();
			this.dirty = true;
		}
		if (this.candles.size === 0 || this.backfillKey !== uniKey) {
			if (this.market === "synthetic") {
				const end = Date.now();
				for (let i = 0; i < s.symbols; i++) {
					await this.storeCandles(`SYN${i}-USDT`, syntheticCandles(`SYN${i}`, s.tfMin, want, end));
					await yieldNow();
				}
				this.status.source = "synthetic";
			} else {
				try {
					this.tickers = await this.feed.tickers();
				} catch (e) {
					this.status.source = "none";
					throw new Error(`BingX market unavailable (${e instanceof Error ? e.message : e}) — retrying, no mock data is used`);
				}
				const missing = (await rankUniverse(this.tickers, s.symbols, s.symbolRank ?? "volatility1h", this.feed.klines)).filter((x) => !this.candles.has(x)).slice(0, Math.max(0, s.symbols - this.candles.size));
				const batch = Math.max(5, Math.ceil(s.symbols / 4));
				const syms = missing.slice(0, batch);
				const more = missing.length > syms.length;
				this.prehistTotal = Math.min(s.symbols, this.candles.size + missing.length);
				for (const x of missing) if (!this.prehistSyms.has(x)) this.prehistSyms.set(x, { state: "queued" });
				for (const x of syms) this.prehistSyms.set(x, { state: "loading" });
				let done = 0;
				await mapLimit(syms, 4, async (sym) => {
					const cs = await this.feed.history(sym, s.tfMin, want, { pauseMs: 60 }).catch(() => []);
					if (gen !== this.gen) return;
					if (cs.length >= minBars) {
						await this.storeCandles(sym, cs);
						this.prehistSyms.set(sym, {
							state: "computing",
							bars: cs.length
						});
					} else this.prehistSyms.set(sym, {
						state: "skipped",
						bars: cs.length
					});
					this.setStage("backfill", ++done, syms.length, `${sym} · batch ${this.candles.size}/${this.prehistTotal}`);
				}, () => gen === this.gen);
				if (gen !== this.gen) return false;
				this.prehistPending = more;
				if (this.candles.size === 0) {
					this.status.source = "none";
					throw new Error("BingX returned no history — retrying, no mock data is used");
				}
				this.status.source = "bingx";
				this.db.event("info", `backfilled ${this.candles.size} symbols × ${want} bars (${s.tfMin}m)`);
			}
			if (this.market === "synthetic" || !this.prehistMore(s)) this.backfillKey = uniKey;
			else this.dirty = true;
			this.status.symbols = [...this.candles.keys()];
			this.upsertSymbols();
			return true;
		}
		const tfMs = s.tfMin * 6e4;
		const now = Date.now();
		let added = 0;
		if (this.status.source === "synthetic") return false;
		const wantBars = Math.round(s.historyDays * 24 * 60 / s.tfMin);
		const behind = [...this.candles.entries()].filter(([sym, cs]) => now - (cs[cs.length - 1]?.t ?? 0) > 300 * tfMs && (this.staleUntil.get(sym) ?? 0) < now);
		if (behind.length) {
			let repaired = 0;
			await mapLimit(behind, 4, async ([sym, old]) => {
				const prevLast = old[old.length - 1]?.t ?? 0;
				const cs = await this.feed.history(sym, s.tfMin, wantBars, { pauseMs: 60 }).catch(() => []);
				if (gen !== this.gen || !this.candles.has(sym)) return;
				const fresh = cs.filter((c) => c.t > prevLast).length;
				if (cs.length >= minBars && fresh > 0) {
					await this.storeCandles(sym, cs);
					added += fresh;
					repaired++;
				}
				const last = (fresh > 0 ? cs[cs.length - 1]?.t : prevLast) ?? 0;
				if (now - last > 300 * tfMs) this.staleUntil.set(sym, now + 18e5);
			}, () => gen === this.gen);
			if (repaired) this.noteHeal(`re-backfilled ${repaired} symbol(s) with a gap > 300 bars`);
		}
		await mapLimit([...this.candles.entries()].filter(([, cs]) => {
			const last = cs[cs.length - 1]?.t ?? 0;
			return last + 2 * tfMs <= now && now - last <= 300 * tfMs;
		}), 6, async ([sym, cs]) => {
			const last = cs[cs.length - 1]?.t ?? 0;
			try {
				const extra = (await this.feed.klines(sym, s.tfMin, {
					startT: last + 1,
					limit: 300,
					nowT: now
				})).filter((c) => c.t > last);
				if (extra.length && gen === this.gen && this.candles.has(sym)) {
					await this.storeCandles(sym, extra, true);
					added += extra.length;
				}
			} catch (e) {
				this.db.event("warn", `${sym} klines: ${e instanceof Error ? e.message : e}`);
			}
		});
		this.status.heartbeat = Date.now();
		if (added) try {
			this.tickers = await this.feed.tickers();
			this.upsertSymbols();
		} catch {}
		return added > 0;
	}
	loadCandlesFromDb() {
		const rows = this.db.all("SELECT sym, t, o, h, l, c, v FROM candles ORDER BY sym, t");
		for (const r of rows) {
			const arr = this.candles.get(r.sym) ?? [];
			arr.push({
				t: r.t,
				o: r.o,
				h: r.h,
				l: r.l,
				c: r.c,
				v: r.v
			});
			this.candles.set(r.sym, arr);
		}
		if (this.candles.size) {
			this.status.source = this.status.source === "none" ? "bingx" : this.status.source;
			this.status.symbols = [...this.candles.keys()];
		}
	}
	/**
	* Candles in memory at once (the engine reads these); the SQLite copy is written in slices of 4000 rows with a
	* yield between them — a 1m backfill is ~26k rows per symbol and must not block the event loop.
	*/
	async storeCandles(sym, cs, append = false) {
		const want = Math.round(this.settings.historyDays * 24 * 60 / this.settings.tfMin);
		const arr = append ? [...this.candles.get(sym) ?? [], ...cs] : [...cs];
		const trimmed = arr.slice(Math.max(0, arr.length - want));
		this.candles.set(sym, trimmed);
		const last = trimmed[trimmed.length - 1]?.t ?? 0;
		if (last > this.status.lastBarT) this.status.lastBarT = last;
		const ins = "INSERT OR REPLACE INTO candles (sym, t, o, h, l, c, v) VALUES (?, ?, ?, ?, ?, ?, ?)";
		const rows = cs.length > want ? cs.slice(cs.length - want) : cs;
		for (let i = 0; i < rows.length; i += 4e3) {
			if (i > 0) await yieldNow();
			const part = rows.slice(i, i + 4e3);
			this.db.tx(() => {
				for (const c of part) this.db.run(ins, sym, c.t, c.o, c.h, c.l, c.c, c.v);
			});
		}
		if (trimmed.length) this.db.run("DELETE FROM candles WHERE sym = ? AND t < ?", sym, trimmed[0].t);
	}
	upsertSymbols() {
		const tick = new Map(this.tickers.map((t) => [t.sym, t]));
		this.db.tx(() => {
			for (const [sym, cs] of this.candles) {
				const t = tick.get(sym);
				this.db.run("INSERT OR REPLACE INTO symbols (sym, last, quote_vol, change_pct, bars, first_t, last_t, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", sym, t?.last ?? cs[cs.length - 1]?.c ?? 0, t?.quoteVol ?? 0, t?.changePct ?? 0, cs.length, cs[0]?.t ?? 0, cs[cs.length - 1]?.t ?? 0, Date.now());
			}
		});
	}
	/** Run a generator in time slices; records total time and the longest uninterrupted slice. */
	async drive(name, gen, onStep, runGen = this.gen) {
		const t0 = performance.now();
		let slice = t0;
		let maxSlice = 0;
		for (;;) {
			const r = gen.next();
			if (r.done) {
				maxSlice = Math.max(maxSlice, performance.now() - slice);
				this.status.phases[name] = {
					ms: performance.now() - t0,
					maxSliceMs: maxSlice
				};
				return r.value;
			}
			onStep(r.value);
			const el = performance.now() - slice;
			if (el > SLICE_MS) {
				maxSlice = Math.max(maxSlice, el);
				await yieldNow();
				if (runGen !== this.gen) throw new Error("superseded by a newer loop generation");
				slice = performance.now();
			}
		}
	}
	async compute(gen = this.gen) {
		const t0 = performance.now();
		this.dirty = false;
		this.status.state = "computing";
		this.loop.reset();
		const settingsAt = this.status.settingsAt;
		const s = this.settings;
		const wf = {
			...this.wf,
			paused: s.adjust?.enabled ? pausedSets(this.adjustState()) : void 0
		};
		const allBars = [];
		for (const [sym, cs] of this.candles) {
			allBars.push(...laneSeriesFrom(/* @__PURE__ */ new Map([[sym, cs]]), s));
			await yieldNow();
			if (gen !== this.gen) return;
		}
		const u = makeUniverse(allBars);
		if (!u.bars.length) return;
		const stageName = {
			S1: "Base",
			S2: "Main",
			S3: "Main",
			S4: "Real",
			S5: "Real"
		};
		const pipeline = await this.drive("Pipeline", runPipeline(u, s), (p) => this.setStage(stageName[p.stage] ?? p.stage, p.done, p.total, p.label), gen);
		await this.persistPipeline(pipeline, gen);
		this.pipeline = pipeline;
		const tailOf = (tf) => Math.round((24 + Math.max(wf.preH, wf.longH) + wf.simH) * 60 / tf) + tacticWarmupBars(s.tactics);
		const wu = makeUniverse(allBars.map((b) => tailBars(b, tailOf(b.tfMin))));
		const main = /* @__PURE__ */ new Set();
		const passed = pipeline.s1.filter((r) => passesBase(r.full, s.gates));
		this.status.basePassed = passed.length;
		this.status.baseEvaluated = pipeline.s1.length;
		for (const k of mainByLane(passed, s.mainTop)) main.add(k);
		if (s.tfs?.length) {
			const plain = (cfg) => laneOf(cfg.split("|")[1] ?? "").tf === null;
			const retired = this.paper.positions.filter((p) => plain(p.cfg));
			if (retired.length) {
				this.paper.positions = this.paper.positions.filter((p) => !plain(p.cfg));
				this.paper.selected = this.paper.selected.filter((id) => !plain(id));
				this.db.event("info", `retired ${retired.length} paper position(s) from before the timeframe lanes (base timeframe changed)`);
			}
		}
		for (const id of this.paper.selected) main.add(id.split("|").slice(0, 2).join("|"));
		for (const p of this.paper.positions) main.add(p.cfg.split("|").slice(0, 2).join("|"));
		this.status.mainPairs = main.size;
		const tapes = await this.drive("Tapes", buildTapesGen(wu, wf.protects, s.cost, {
			protects: wf.dcaProtects,
			dca: wf.dca,
			axis: s.axis
		}, main, s.tactics, s.adjust?.enabled ? this.adjustState() : null), (p) => this.setStage("Base", p.done, p.total, "strategy tapes (normal · trailing · DCA · DCA Active)"), gen);
		let step = 0;
		const steps = Math.max(1, Math.ceil(wf.simH / Math.max(wf.stepH, s.tfMin / 60)));
		const sim = await this.drive("Simulation", walkForwardGen(wu, tapes, wf), () => this.setStage("Real", ++step, steps, `${wf.simH}h simulated run, ${wf.preH}h pre-calc`), gen);
		this.tapes = tapes;
		this.sim = sim;
		this.persistSim(sim);
		this.autoPreset(s, wf, sim);
		this.updatePrehist(u.bars.map((b) => b.sym), pipeline, tapes, sim, wf);
		const presets = {};
		const names = Object.keys(STRATEGY_PRESETS);
		const tc = performance.now();
		let maxSlice = 0;
		for (let i = 0; i < names.length; i++) {
			const name = names[i];
			this.setStage("Compare", i, names.length, name);
			const r = await this.drive("Compare", walkForwardGen(wu, tapes, {
				...wf,
				toggles: STRATEGY_PRESETS[name].toggles
			}), () => void 0, gen);
			maxSlice = Math.max(maxSlice, this.status.phases.Compare?.maxSliceMs ?? 0);
			presets[name] = {
				label: STRATEGY_PRESETS[name].label,
				toggles: STRATEGY_PRESETS[name].toggles,
				stats: r.stats,
				hourly: r.hourly,
				byKind: r.byKind,
				skips: r.skips,
				blocks: r.blocks,
				stable: r.stable
			};
		}
		this.status.phases.Compare = {
			ms: performance.now() - tc,
			maxSliceMs: maxSlice
		};
		this.db.kvSet("presetSims", {
			at: Date.now(),
			startT: sim.startT,
			endT: sim.endT,
			presets
		});
		this.setStage("Real", 1, 1, "done");
		this.status.computes++;
		this.status.lastComputeMs = performance.now() - t0;
		this.status.lastComputeAt = Date.now();
		this.status.appliedSettingsAt = settingsAt;
		this.status.pending = this.dirty;
		this.status.loop = {
			p50: this.loop.percentile(50) / 1e6,
			p99: this.loop.percentile(99) / 1e6,
			max: this.loop.max / 1e6
		};
		const ph = Object.entries(this.status.phases).map(([k, v]) => `${k} ${Math.round(v.ms)}/${Math.round(v.maxSliceMs)}`).join(" · ");
		this.db.run("INSERT INTO runs (kind, started, ended, items, ms, note) VALUES (?, ?, ?, ?, ?, ?)", "compute", Date.now() - Math.round(this.status.lastComputeMs), Date.now(), pipeline.s1.length + pipeline.s2.length + tapes.length, this.status.lastComputeMs, `${ph} (ms total/max slice) · loop p99 ${this.status.loop.p99.toFixed(0)} max ${this.status.loop.max.toFixed(0)}`);
		if (Date.now() - this.lastConsoleAt > 3e5) {
			this.lastConsoleAt = Date.now();
			console.info(`[core-v2] compute #${this.status.computes} done in ${Math.round(this.status.lastComputeMs)} ms · sim PF ${sim.stats.pf.toFixed(2)} n ${sim.stats.n} · loop max ${this.status.loop.max.toFixed(0)} ms`);
		}
		this.db.event("info", `compute #${this.status.computes}: sim PF ${sim.stats.pf.toFixed(2)} net ${sim.stats.net.toFixed(1)}% n ${sim.stats.n} · armed ${pipeline.armed.length} · ${Math.round(this.status.lastComputeMs)}ms`);
	}
	/** Write rows in small transactions, yielding between them. */
	async writeChunked(rows, gen, chunk = 1500) {
		const db = this.db;
		let n = 0;
		let slice = performance.now();
		let maxSlice = 0;
		db.db.exec("BEGIN");
		try {
			for (const [sql, p] of rows) {
				db.run(sql, ...p);
				if (++n % chunk === 0) {
					db.db.exec("COMMIT");
					maxSlice = Math.max(maxSlice, performance.now() - slice);
					await yieldNow();
					if (gen !== this.gen) throw new Error("superseded by a newer loop generation");
					slice = performance.now();
					db.db.exec("BEGIN");
				}
			}
			db.db.exec("COMMIT");
		} catch (e) {
			try {
				db.db.exec("ROLLBACK");
			} catch {}
			throw e;
		}
		return Math.max(maxSlice, performance.now() - slice);
	}
	async persistPipeline(o, gen) {
		const t0 = performance.now();
		const now = Date.now();
		const db = this.db;
		const TABLES = [
			"results",
			"lastn",
			"tapes"
		];
		db.shadowCreate(TABLES);
		const ins = `INSERT OR REPLACE INTO results_next (id, stage, bot, ind, tp, sl, trail, hold, n, pf, net, wr, mdd, ddt, gh, tph, is_n, is_pf, is_net, score,
        rank, armed, best_n, oos_n, oos_pf, oos_net, oos_ddt, lastn_ok, eval_pass, eval_ok, by_sym, at) VALUES (${Array(32).fill("?").join(",")})`;
		const lnIns = "INSERT OR REPLACE INTO lastn_next (cfg, n, part, taken, pf, net, ddt, score) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
		const evIns = "INSERT INTO evals (cfg, at, win, n, pf, net, ddt, wr, pass) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
		const tpIns = "INSERT OR REPLACE INTO tapes_next (cfg, sym, side, entry_t, exit_t, entry, exit, r, reason, bars) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
		const rankedById = new Map(o.ranked.map((k) => [k.id, k]));
		const s2Ids = new Set(o.s2.map((r) => r.id));
		function* rows() {
			for (const r of o.s1) {
				if (s2Ids.has(r.id)) continue;
				yield [ins, [
					r.id,
					1,
					r.bot,
					r.ind,
					r.protect.tp,
					r.protect.sl,
					r.protect.trail,
					r.protect.hold,
					r.full.n,
					r.full.pf,
					r.full.net,
					r.full.wr,
					r.full.mdd,
					r.full.ddt,
					r.full.gh,
					r.full.tph,
					r.is.n,
					r.is.pf,
					r.is.net,
					r.score,
					null,
					0,
					null,
					null,
					null,
					null,
					null,
					null,
					null,
					null,
					JSON.stringify(r.bySym),
					now
				]];
			}
			for (const r of o.s2) {
				const k = rankedById.get(r.id);
				yield [ins, [
					r.id,
					k ? 3 : 2,
					r.bot,
					r.ind,
					r.protect.tp,
					r.protect.sl,
					r.protect.trail,
					r.protect.hold,
					r.full.n,
					r.full.pf,
					r.full.net,
					r.full.wr,
					r.full.mdd,
					r.full.ddt,
					r.full.gh,
					r.full.tph,
					r.is.n,
					r.is.pf,
					r.is.net,
					r.score,
					k?.rank ?? null,
					k?.armed ? 1 : 0,
					k?.lastN?.bestN ?? null,
					k?.lastN?.oos.n ?? null,
					k?.lastN?.oos.pf ?? null,
					k?.lastN?.oos.net ?? null,
					k?.lastN?.oos.ddt ?? null,
					k?.lastN ? k.lastN.success ? 1 : 0 : null,
					k?.evalRes?.passRatio ?? null,
					k?.evalRes ? k.evalRes.success ? 1 : 0 : null,
					JSON.stringify(o.runs.get(r.id)?.bySym ?? {}),
					now
				]];
			}
			for (const k of o.ranked) {
				if (k.lastN) {
					for (const r of k.lastN.rows) yield [lnIns, [
						k.id,
						r.n,
						"is",
						r.taken,
						r.pf,
						r.net,
						r.ddt,
						r.score
					]];
					for (const r of k.lastN.oosRows) yield [lnIns, [
						k.id,
						r.n,
						"oos",
						r.taken,
						r.pf,
						r.net,
						r.ddt,
						r.score
					]];
					yield [lnIns, [
						k.id,
						0,
						"is",
						k.lastN.baseline.is.n,
						k.lastN.baseline.is.pf,
						k.lastN.baseline.is.net,
						k.lastN.baseline.is.ddt,
						0
					]];
					yield [lnIns, [
						k.id,
						0,
						"oos",
						k.lastN.baseline.oos.n,
						k.lastN.baseline.oos.pf,
						k.lastN.baseline.oos.net,
						k.lastN.baseline.oos.ddt,
						0
					]];
				}
				for (const t of o.tapes.get(k.id) ?? []) yield [tpIns, [
					t.cfg,
					t.sym,
					t.side,
					t.entryT,
					t.exitT,
					t.entry,
					t.exit,
					t.r,
					t.reason,
					t.bars
				]];
			}
		}
		const maxSlice = await this.writeChunked(rows(), gen);
		const ts = performance.now();
		db.shadowSwap(TABLES);
		db.tx(() => {
			db.run("DELETE FROM evals WHERE at = ?", o.universe.nowT);
			for (const k of o.ranked) {
				if (!k.evalRes) continue;
				for (const w of k.evalRes.windows) db.run(evIns, k.id, o.universe.nowT, w.key, w.n, w.pf, w.net, w.ddt, w.wr, w.pass ? 1 : 0);
			}
		});
		db.kvSet("pipeline", {
			at: o.at,
			universe: o.universe,
			timings: o.timings,
			armed: o.armed,
			s1: o.s1.length,
			s2: o.s2.length,
			ranked: o.ranked.length,
			portfolio: {
				members: o.portfolio.members,
				guardPct: o.portfolio.guardPct,
				is: o.portfolio.is,
				oos: o.portfolio.oos,
				full: o.portfolio.full,
				hourly: o.portfolio.hourly
			}
		});
		this.status.phases.Persist = {
			ms: performance.now() - t0,
			maxSliceMs: Math.max(maxSlice, performance.now() - ts)
		};
	}
	updatePrehist(computed, pipeline, tapes, sim, wf) {
		if (!this.prehistStartedAt) this.prehistStartedAt = this.status.startedAt;
		for (const sym of computed) this.prehistSyms.set(sym, {
			...this.prehistSyms.get(sym) ?? {},
			state: "ready",
			bars: this.candles.get(sym)?.length
		});
		const stats = prehistStats(sim.trades, sim.startT, sim.endT);
		const per = new Map(stats.perSymbol.map((x) => [x.sym, x]));
		const symbols = {};
		for (const [sym, v] of this.prehistSyms) symbols[sym] = {
			...v,
			n: per.get(sym)?.n ?? 0,
			pf: per.get(sym)?.pf
		};
		const ready = [...this.prehistSyms.values()].filter((v) => v.state === "ready").length;
		const complete = !this.prehistPending;
		if (complete && !this.prehistReadyAt) {
			this.prehistReadyAt = Date.now();
			this.db.event("info", `prehistoric start complete: ${ready} symbols computed, realtime running (PF ${stats.pf.toFixed(2)}, ${stats.n} trades)`);
		}
		this.status.prehistoric = {
			hours: wf.preH,
			simH: wf.simH,
			total: Math.max(this.prehistTotal, this.candles.size),
			loaded: this.candles.size,
			ready,
			complete,
			startedAt: this.prehistStartedAt,
			readyAt: this.prehistReadyAt,
			symbols,
			stats,
			counts: {
				base: pipeline.s1.length,
				main: this.status.mainPairs,
				sets: tapes.length,
				real: sim.steps[sim.steps.length - 1]?.real.length ?? 0,
				evals: pipeline.ranked.filter((r) => r.evalRes).length,
				armed: pipeline.armed.length
			}
		};
	}
	adjustState() {
		return this.db.kvGet("adjust") ?? {};
	}
	/** measured live round-trip cost from recorded fills (fees + adverse slippage), null below 20 round trips */
	liveCost() {
		const rows = this.db.all("SELECT side, kind, qty, ref_px, fill_px, fee FROM live_fills WHERE ref_px > 0 AND fill_px > 0 ORDER BY at DESC LIMIT 400");
		if (rows.length < 40) return null;
		let fee = 0;
		let slip = 0;
		for (const r of rows) {
			const notional = r.qty * r.fill_px;
			fee += notional > 0 ? Math.abs(r.fee) / notional : 0;
			const dir = r.kind === "O" || r.kind === "I" ? r.side : -r.side;
			slip += Math.max(0, dir * (r.fill_px - r.ref_px) / r.ref_px);
		}
		fee /= rows.length;
		slip /= rows.length;
		return {
			rt: 2 * (fee + slip),
			fills: rows.length,
			fee,
			slip
		};
	}
	/** One adjuster pass on the executed (Real) positions; a change triggers a recompute with the new ranges. */
	runAdjust() {
		const a = this.settings.adjust;
		if (!a?.enabled) return;
		const lc = this.liveCost();
		const excess = lc ? Math.max(0, lc.rt - this.settings.cost) : 0;
		if (lc) this.db.kvSet("liveCost", {
			...lc,
			model: this.settings.cost,
			at: Date.now()
		});
		if (a.autoCost && lc && lc.rt > this.settings.cost + 2e-4) {
			this.updateSettings({ cost: +Math.min(.02, lc.rt).toFixed(5) });
			this.db.event("warn", `auto-cost: measured live round trip ${(lc.rt * 100).toFixed(3)} % > model — engine cost raised`);
		}
		const trades = this.db.all("SELECT cfg, r, exit_t FROM paper_trades ORDER BY exit_t DESC LIMIT 5000");
		const { state, changed } = evaluateAdjust(this.adjustState(), trades.map((t) => ({
			cfg: t.cfg,
			r: t.r,
			exitT: t.exit_t
		})), a, {
			minSl: this.settings.grid.minSl,
			minTrail: this.settings.grid.minTrail
		}, excess);
		this.db.kvSet("adjust", state);
		if (changed.length) {
			this.db.event("info", `auto-adjust: ${changed.length} set(s) changed — ${changed.slice(0, 4).map((k) => `${k}: ${state[k].note}`).join(" · ")}`);
			this.dirty = true;
		}
	}
	savedPresets() {
		return this.db.kvGet("presets") ?? [];
	}
	currentPreset(kind, label, info, s = this.settings, wf = this.wf, sim = this.sim) {
		if (!sim) return null;
		const settings = presetSettings(s);
		const wfp = pickWf(wf);
		const key = presetKey(settings, wfp);
		const spanH = (sim.endT - sim.startT) / 36e5;
		const period = `${new Date(sim.startT).toISOString().slice(0, 16).replace("T", " ")} → ${new Date(sim.endT).toISOString().slice(0, 16).replace("T", " ")} UTC`;
		return {
			id: kind === "auto" ? `auto-${key}` : `saved-${key}-${Date.now().toString(36)}`,
			label,
			info,
			kind,
			at: Date.now(),
			settings,
			wf: wfp,
			metrics: metricsFromStats(sim.stats, spanH, period, `engine simulated run (${Math.round(spanH)}h, ${wf.preH}h pre-calc)`, {
				positiveRuns: sim.stable ? 1 : 0,
				runs: 1
			})
		};
	}
	/** Save the current settings with the latest simulated run's results. */
	savePreset(label, info = "") {
		const p = this.currentPreset("saved", label.trim().slice(0, 80) || "Saved preset", info.slice(0, 400));
		if (!p) throw new Error("no simulated run yet — wait for the first compute");
		this.db.kvSet("presets", upsertPreset(this.savedPresets(), p));
		this.db.event("info", `preset saved: ${p.label} (PF ${p.metrics.pf.toFixed(2)}, ${p.metrics.n} trades)`);
		return p;
	}
	autoPreset(s, wf, sim) {
		if (!qualifies(sim.stats, sim.stable, s.gates.minPf, s.gates.minTrades)) return;
		const p = this.currentPreset("auto", `Auto · PF ${sim.stats.pf.toFixed(2)} · ${sim.stats.n} trades`, "saved automatically: the simulated run passed min PF, min trades and stability", s, wf, sim);
		if (!p) return;
		const before = this.savedPresets();
		const after = upsertPreset(before, p);
		if (after !== before && JSON.stringify(after) !== JSON.stringify(before)) {
			this.db.kvSet("presets", after);
			this.db.event("info", `auto preset: ${p.label}`);
		}
	}
	lastConsoleAt = 0;
	backfillKey = "";
	/** progressive prehistoric start: per-symbol state and batch bookkeeping */
	prehistSyms = /* @__PURE__ */ new Map();
	prehistTotal = 0;
	prehistPending = false;
	prehistStartedAt = 0;
	prehistReadyAt = 0;
	prehistMore(_s) {
		return this.prehistPending;
	}
	staleUntil = /* @__PURE__ */ new Map();
	backtestJob = null;
	btCandles = /* @__PURE__ */ new Map();
	presetBacktests() {
		return this.db.kvGet("presetBacktests") ?? {};
	}
	/** Start a backtest of a preset over the last `days` (1–12). One at a time; the result is kept per preset. */
	startPresetBacktest(id, days) {
		if (this.backtestJob?.state === "running") throw new Error(`a backtest is running (${this.backtestJob.label}, ${this.backtestJob.days}d)`);
		const p = this.findPreset(id);
		if (!p) throw new Error("unknown preset");
		const d = Math.min(12, Math.max(1, Math.round(days)));
		this.backtestJob = {
			id,
			label: p.label,
			days: d,
			state: "running",
			stage: "market data",
			progress: 0,
			startedAt: Date.now()
		};
		const job = this.backtestJob;
		this.runPresetBacktest(p, d, job).catch((err) => {
			if (job.state === "running") {
				job.state = "error";
				job.error = err instanceof Error ? err.message : String(err);
			}
			this.db.event("error", `backtest ${p.label}: ${err instanceof Error ? err.message : err}`);
		});
	}
	/** Run a backtest phase on worker threads (all cores); false = not available / failed → caller runs in-process. */
	async onWorkers(job, stage, fn) {
		if (!workersAvailable() || this.workersBroken) return false;
		const n = poolSize();
		job.stage = `${stage} · ${n} cores`;
		try {
			await fn(n);
			return true;
		} catch (err) {
			this.workersBroken = true;
			this.db.event("warn", `backtest workers unavailable (${err instanceof Error ? err.message : err}) — computing in-process`);
			job.stage = stage;
			return false;
		}
	}
	workersBroken = false;
	/** Time-sliced driver for backtests: yields every SLICE_MS, aborts past the job's time limit. */
	async sliced(gen, onStep, job = this.backtestJob) {
		let slice = performance.now();
		for (;;) {
			const r = gen.next();
			if (r.done) return r.value;
			onStep(r.value);
			if (performance.now() - slice > SLICE_MS) {
				await yieldNow();
				if (this.backtestJob && Date.now() - this.backtestJob.startedAt > BACKTEST_LIMIT_MS) throw new Error("backtest exceeded its 15 min limit — aborted");
				slice = performance.now();
			}
		}
	}
	async runPresetBacktest(p, days, job) {
		const patch = presetSettings(p.settings);
		const s = mergeSettings(this.settings, {
			...patch,
			tactics: {
				...DEFAULT_SETTINGS.tactics,
				...patch.tactics ?? {}
			},
			focus: patch.focus ?? []
		});
		const wf = {
			...defaultWalkForward(s),
			...sanitizeWf(p.wf),
			gates: s.gates,
			cost: s.cost,
			toggles: s.toggles,
			block: s.block,
			dca: s.dca
		};
		const lookH = Math.max(wf.longH, wf.preH);
		const endT = Math.floor(Date.now() / H) * H;
		const startT = endT - days * 24 * H;
		const wantBars = Math.ceil((24 + lookH + days * 24) * 60 / s.tfMin) + tacticWarmupBars(s.tactics) + 10;
		let candles;
		const sameUniverse = s.symbols === this.settings.symbols && s.symbolRank === this.settings.symbolRank;
		const uniKey = `${s.tfMin}|${s.symbols}|${s.symbolRank}`;
		if (sameUniverse && s.tfMin === this.settings.tfMin && [...this.candles.values()].every((c) => c.length >= wantBars) && this.candles.size > 0) candles = this.candles;
		else {
			const cached = this.btCandles.get(uniKey);
			if (cached && Date.now() - cached.at < 6e5 && [...cached.candles.values()].every((c) => c.length >= wantBars)) candles = cached.candles;
			else {
				candles = /* @__PURE__ */ new Map();
				let syms = sameUniverse ? this.status.symbols.length ? this.status.symbols : [...this.candles.keys()] : [];
				if (!syms.length) {
					if (!this.tickers.length) this.tickers = await this.feed.tickers();
					syms = await rankUniverse(this.tickers, s.symbols, s.symbolRank ?? "volatility1h", this.feed.klines);
				}
				let done = 0;
				const tfMs = s.tfMin * 6e4;
				await mapLimit(syms, 8, async (sym) => {
					const have = s.tfMin === this.settings.tfMin ? this.candles.get(sym) ?? [] : [];
					const missing = wantBars - have.length;
					let cs = have;
					if (missing > 0) {
						const older = await this.feed.history(sym, s.tfMin, have.length ? missing : wantBars, {
							pauseMs: 0,
							nowT: have.length ? have[0].t : void 0
						}).catch(() => []);
						cs = have.length ? [...older.filter((c) => c.t < have[0].t && c.t >= have[0].t - missing * tfMs), ...have] : older;
					}
					if (cs.length) candles.set(sym, cs);
					job.progress = ++done / syms.length * .3;
				});
				if (!candles.size) throw new Error("no market data (exchange unreachable)");
				this.btCandles.set(uniKey, {
					at: Date.now(),
					candles
				});
			}
		}
		const bars = laneSeriesFrom(candles, s, days).map((b) => tailBars(b, Math.ceil(wantBars * s.tfMin / b.tfMin)));
		const u = makeUniverse(bars);
		job.stage = "Base";
		let main;
		const combos = allCombos(s.focus, s.disabledKinds, s.tfs);
		if (wf.mode === "fixed" && s.focus.length) main = new Set(combos.map((c) => `${c.bot}|${c.ind}`));
		else {
			const lookBars = bars.map((b) => {
				let z = 0;
				while (z < b.n && b.t[z] < startT) z++;
				return {
					...b,
					n: z,
					t: b.t.slice(0, z),
					o: b.o.slice(0, z),
					h: b.h.slice(0, z),
					l: b.l.slice(0, z),
					c: b.c.slice(0, z),
					v: b.v.slice(0, z)
				};
			});
			const look = makeUniverse(lookBars);
			let scores = [];
			const viaWorkers = await this.onWorkers(job, "Base", async (n) => {
				scores = (await runOnWorkers(slices(combos, n * 2).map((c) => ({
					type: "base",
					bars: lookBars,
					combos: c,
					cost: s.cost,
					tactics: s.tactics
				})), n)).flatMap((x) => x.scores);
			});
			function* base() {
				for (let i = 0; i < combos.length; i++) {
					const r = runCombo(look, combos[i].bot, combos[i].ind, DEFAULT_PROTECT, s.cost, 1, s.tactics);
					if (r && passesBase(r.full, s.gates)) scores.push({
						pair: `${combos[i].bot}|${combos[i].ind}`,
						score: r.score
					});
					yield i;
				}
			}
			if (!viaWorkers) await this.sliced(base(), (i) => job.progress = .3 + .3 * (i + 1) / combos.length);
			main = new Set(scores.sort((a, b) => b.score - a.score).slice(0, s.mainTop).map((x) => x.pair));
		}
		job.stage = "Tapes";
		const dcaOpt = {
			protects: wf.dcaProtects,
			dca: wf.dca,
			axis: s.axis
		};
		const adjust = s.adjust?.enabled ? this.adjustState() : null;
		let tapes = [];
		const pairs = allCombos().map((c) => `${c.bot}|${c.ind}`).filter((x) => main.has(x));
		if (!await this.onWorkers(job, "Tapes", async (n) => {
			tapes = (await runOnWorkers(slices(pairs, n * 2).map((pp) => ({
				type: "tapes",
				bars,
				pairs: pp,
				protects: wf.protects,
				cost: s.cost,
				dcaOpt,
				tactics: s.tactics,
				adjust
			})), n)).flatMap((x) => x.tapes);
		})) tapes = await this.sliced(buildTapesGen(u, wf.protects, s.cost, dcaOpt, main, s.tactics, adjust), (x) => job.progress = .6 + .3 * x.done / Math.max(1, x.total));
		job.stage = "Simulation";
		const sim = await this.sliced(walkForwardGen(u, tapes, {
			...wf,
			startT,
			simH: days * 24
		}), () => job.progress = Math.min(.99, job.progress + .001));
		const st = sim.stats;
		const r = {
			days,
			at: Date.now(),
			from: startT,
			to: Math.min(endT, u.nowT),
			tfMin: s.tfMin,
			pf: st.pf,
			n: st.n,
			perDay: st.n / days,
			wr: st.wr,
			net: st.net,
			successHours: st.gh,
			greenHours: st.greenHours,
			hours: st.hours,
			ddtH: st.ddt,
			stable: sim.stable,
			minPf: s.gates.minPf,
			maxDdtH: s.gates.maxDdtH,
			pass: st.n > 0 && st.pf >= s.gates.minPf && st.ddt <= s.gates.maxDdtH,
			byKind: sim.byKind
		};
		const all = this.presetBacktests();
		all[p.id] = [r, ...all[p.id] ?? []].slice(0, 30);
		this.db.kvSet("presetBacktests", all);
		this.db.event("info", `backtest ${p.label} · ${days}d: PF ${st.pf.toFixed(2)} · success hours ${(st.gh * 100).toFixed(0)}% · DDT ${st.ddt.toFixed(1)}h · ${st.n} trades`);
		job.state = "done";
		job.stage = "done";
		job.progress = 1;
	}
	findPreset(id) {
		return RESEARCH_PRESETS.find((p) => p.id === id) ?? this.savedPresets().find((p) => p.id === id);
	}
	/** Apply a preset's settings + walk-forward patch (the Live stage is never touched). */
	applyPreset(id) {
		const p = this.findPreset(id);
		if (!p) throw new Error("unknown preset");
		const patch = presetSettings(p.settings);
		this.updateSettings({
			...patch,
			tactics: {
				...DEFAULT_SETTINGS.tactics,
				...patch.tactics ?? {}
			},
			focus: patch.focus ?? []
		}, sanitizeWf(p.wf));
		this.db.kvSet("activePreset", {
			id: p.id,
			label: p.label,
			at: Date.now()
		});
		return p;
	}
	/**
	* Edit a preset's own settings (never the engine's). A saved preset is changed in place; a research preset is
	* copied into a new saved preset. Its measured results no longer match the edited settings → marked stale.
	*/
	updatePreset(id, settings, wf, label, info) {
		const p = this.findPreset(id);
		if (!p) throw new Error("unknown preset");
		const merged = presetSettings({
			...p.settings,
			...settings
		});
		const g = merged.grid;
		if (g && g.tp.length * g.slOfTp.length * g.trailOfTp.length * g.holdH.length > 240) throw new Error("protect grid too large (max 240 variants)");
		const next = {
			...p,
			id: p.kind === "research" ? `saved-${presetKey(merged, wf)}-${Date.now().toString(36)}` : p.id,
			kind: p.kind === "research" ? "saved" : p.kind === "auto" ? "saved" : p.kind,
			label: (label ?? (p.kind === "research" ? `${p.label} (edited)` : p.label)).slice(0, 80),
			info: (info ?? p.info).slice(0, 400),
			at: Date.now(),
			settings: merged,
			wf: {
				...p.wf,
				...sanitizeWf(wf)
			},
			metrics: {
				...p.metrics,
				source: `${p.metrics.source} — settings edited since; run a backtest for current results`
			}
		};
		const list = this.savedPresets().filter((x) => x.id !== next.id);
		this.db.kvSet("presets", upsertPreset(list, next));
		if (next.id === p.id) {
			const bt = this.presetBacktests();
			delete bt[p.id];
			this.db.kvSet("presetBacktests", bt);
		}
		this.db.event("info", `preset ${p.kind === "research" ? "copied and edited" : "edited"}: ${next.label}`);
		return next;
	}
	deletePreset(id) {
		this.db.kvSet("presets", this.savedPresets().filter((p) => p.id !== id));
	}
	persistSim(r) {
		this.db.run("INSERT INTO sim_runs (at, start_t, end_t, n, pf, net, gh, tph, ddt, stable, opts, blocks, hourly) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", Date.now(), r.startT, r.endT, r.stats.n, r.stats.pf, r.stats.net, r.stats.gh, r.stats.tph, r.stats.ddt, r.stable ? 1 : 0, JSON.stringify(r.opts), JSON.stringify(r.blocks), JSON.stringify(r.hourly));
	}
	/** Current-hour selection from the pre-historic window; open positions of the selected configs are the paper book. */
	/** Every lane's series from the engine's 1m candles (see laneSeriesFrom). */
	laneSeries(s = this.settings) {
		return laneSeriesFrom(this.candles, s);
	}
	detailU = null;
	/**
	* Closed trades of one config computed on demand from the current candles (Base configs keep only their
	* stats; tapes exist for Main sets). Plain configs only (DCA / Axis come from tapes). Null if unknown.
	*/
	comboTrades(id) {
		const c = parseConfigId(id);
		if (!c || kindOfId(id) !== "normal" && kindOfId(id) !== "trailing") return null;
		const key = `${this.status.lastBarT}|${this.settings.tfMin}|${this.candles.size}`;
		if (this.detailU?.key !== key) this.detailU = {
			key,
			u: makeUniverse(this.laneSeries())
		};
		const g = this.settings.grid;
		const protect = c.protect.trail > 0 ? {
			...c.protect,
			trailStep: g.trailStep ?? 1,
			trailFree: g.trailFree ?? false
		} : c.protect;
		const r = runCombo(this.detailU.u, c.bot, c.ind, protect, this.settings.cost, 1, this.settings.tactics);
		return r ? r.trades : null;
	}
	/** Recompute the published numbers from their inputs; failures go to the event log once per change. */
	runAudit() {
		const r = auditState({
			sim: this.sim,
			tapes: this.tapes,
			cost: this.settings.cost,
			base: {
				evaluated: this.status.baseEvaluated,
				passed: this.status.basePassed
			},
			paper: {
				...this.paper,
				notional: this.settings.paperNotional
			}
		});
		this.audit = r;
		const key = r.checks.filter((c) => !c.ok).map((c) => c.name).join("|");
		if (key !== this.lastAuditKey) {
			this.lastAuditKey = key;
			if (key) this.db.event("error", `audit failed: ${r.checks.filter((c) => !c.ok).map((c) => `${c.name} (${c.detail})`).join("; ")}`);
			else this.db.event("info", `audit ok: ${r.checks.length} checks`);
		}
		return r;
	}
	stepPaper() {
		if (!this.tapes.length || !this.sim) return;
		const nowT = Math.floor(Date.now() / H) * H;
		const t = Math.min(nowT, this.sim.endT);
		const held = new Set(this.sim.steps[this.sim.steps.length - 1]?.real ?? []);
		const { picks, eligible } = this.wf.mode === "durable" ? selectDurable(this.tapes, t, this.wf, held) : this.wf.mode === "fixed" ? selectFixed(this.tapes, t, this.wf) : selectAt(this.tapes, t, this.wf);
		const sel = new Set(picks.map((p) => p.id));
		const holding = new Set(this.paper.positions.map((p) => p.cfg));
		const keep = /* @__PURE__ */ new Set([...sel, ...[...holding].filter((id) => this.tapes.some((tp) => tp.id === id && tp.open.some((o) => o.cfg === id)))]);
		const positions = [];
		const perSym = /* @__PURE__ */ new Map();
		const perSide = /* @__PURE__ */ new Map();
		const prevByKey = new Map(this.paper.positions.map((p) => [`${p.cfg}|${p.sym}|${p.entryT}`, p]));
		const cands = [];
		for (const tp of this.tapes) {
			if (!keep.has(tp.id)) continue;
			for (const op of tp.open) {
				const held = prevByKey.has(`${op.cfg}|${op.sym}|${op.entryT}`);
				if (!held && !sel.has(tp.id)) continue;
				cands.push({
					tp,
					op,
					held
				});
			}
		}
		cands.sort((a, b) => Number(b.held) - Number(a.held) || a.op.entryT - b.op.entryT);
		const blockAt = this.blockBookAt();
		for (const { tp, op, held } of cands) {
			const prev = prevByKey.get(`${op.cfg}|${op.sym}|${op.entryT}`);
			const d = held ? {
				ok: true,
				vol: prev?.vol ?? 1,
				level: prev?.level ?? 0
			} : execDecision(tp, op.entryT, this.wf, {
				book: blockAt(op.entryT),
				sym: op.sym,
				side: op.side
			});
			if (!d.ok) continue;
			const c = perSym.get(op.sym) ?? 0;
			const sd = perSide.get(op.side) ?? 0;
			if (!held && (c >= this.wf.maxPerSymbol || sd >= this.wf.maxPerSide || positions.length >= this.wf.maxOpen)) continue;
			perSym.set(op.sym, c + 1);
			perSide.set(op.side, sd + 1);
			positions.push({
				...op,
				vol: d.vol,
				level: d.level
			});
		}
		const since = this.paper.startedAt - this.wf.simH * H;
		const trades = this.sim.trades.filter((t) => t.exitT >= since);
		const notional = this.settings.paperNotional;
		const db = this.db;
		db.tx(() => {
			db.run("DELETE FROM paper_positions");
			for (const p of positions) db.run("INSERT OR REPLACE INTO paper_positions (cfg, sym, side, entry_t, entry, stop, target, mtm, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", p.cfg, p.sym, p.side, p.entryT, p.entry, p.stop, p.target, p.mtm, Date.now());
			for (const t of trades) db.run("INSERT OR IGNORE INTO paper_trades (cfg, sym, side, entry_t, exit_t, entry, exit, r, pnl, reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", t.cfg, t.sym, t.side, t.entryT, t.exitT, t.entry, t.exit, t.r, t.r * notional, t.reason);
		});
		this.paper = {
			selected: [...sel],
			eligible,
			positions,
			trades,
			equity: trades.reduce((a, t) => a + t.r * notional, 0) + positions.reduce((a, p) => a + p.mtm * notional, 0),
			startedAt: this.paper.startedAt
		};
	}
	/**
	* Block book over the simulation's Real candidates (the Block feed), advanced causally: call with non-decreasing entry times;
	* each call returns the book holding every position that closed at or before that time. Null when only the
	* config-set source is enabled (nothing else to judge).
	*/
	blockBookAt() {
		const src = this.wf.block.sources ?? {};
		if (!this.wf.toggles.block || !(src.overall || src.symbol || src.direction || src.indication)) return () => null;
		const feed = this.sim?.feed ?? [];
		const book = new BlockBook();
		let i = 0;
		return (t) => {
			while (i < feed.length && feed[i].exitT <= t) book.add(feed[i++]);
			return book;
		};
	}
	/**
	* Entries due NOW: signals of the selected configs on the newest closed bar (they enter at the next open).
	* These are what the live adapter may mirror.
	*/
	pendingEntries() {
		const sel = new Set(this.paper.selected);
		const out = [];
		const entryT = this.status.lastBarT + this.settings.tfMin * 6e4;
		const book = this.blockBookAt()(entryT);
		for (const tp of this.tapes) {
			if (!sel.has(tp.id)) continue;
			for (const p of tp.pending) {
				if (!execDecision(tp, entryT, this.wf, {
					book,
					sym: p.sym,
					side: p.side
				}).ok) continue;
				const barT = this.candles.get(p.sym)?.at(-1)?.t ?? 0;
				const laneTf = laneOf(tp.ind).tf ?? this.settings.tfMin;
				if (!laneClosesWith(barT, this.settings.tfMin, laneTf)) continue;
				out.push({
					cfg: tp.id,
					sym: p.sym,
					side: p.side,
					protect: tp.protect,
					barT,
					kind: tp.kind
				});
			}
		}
		return out;
	}
};
/** The walk-forward knobs that are user settings (grids, toggles and gates come from CoreSettings). */
var WF_KEYS = [
	"preH",
	"simH",
	"stepH",
	"portfolio",
	"lastN",
	"lastNMinPf",
	"maxPerSymbol",
	"maxPerSide",
	"maxOpen",
	"guardPct",
	"longH",
	"robustFrac",
	"rank",
	"bots",
	"preGate",
	"mode",
	"durableSplits",
	"durableFrac"
];
/** Range-checked walk-forward patch (unknown keys dropped, numbers clamped). */
function sanitizeWf(o) {
	const p = pickWf(o);
	const num = (k, lo, hi, int = false) => {
		if (p[k] === void 0) return;
		const v = Number(p[k]);
		if (!Number.isFinite(v)) throw new Error(`${k} must be a number`);
		p[k] = Math.min(hi, Math.max(lo, int ? Math.round(v) : v));
	};
	num("preH", 1, 240);
	num("simH", 6, 240);
	num("stepH", 1 / 60, 48);
	num("portfolio", 1, 60, true);
	num("lastN", 0, 200, true);
	num("lastNMinPf", 0, 5);
	num("maxPerSymbol", 1, 20, true);
	num("maxPerSide", 1, 400, true);
	num("maxOpen", 1, 1e3, true);
	num("guardPct", 0, 100);
	num("longH", 24, 1440);
	num("robustFrac", 0, 1);
	num("durableSplits", 2, 12, true);
	num("durableFrac", 0, 1);
	if (p.rank !== void 0 && ![
		"lcb",
		"score",
		"net"
	].includes(String(p.rank))) delete p.rank;
	if (p.mode !== void 0 && ![
		"hourly",
		"durable",
		"fixed"
	].includes(String(p.mode))) delete p.mode;
	if (p.preGate !== void 0) p.preGate = Boolean(p.preGate);
	if (p.bots !== void 0) p.bots = Array.isArray(p.bots) ? p.bots.map(String).slice(0, 20) : [];
	return p;
}
function pickWf(o) {
	const out = {};
	for (const k of WF_KEYS) if (o[k] !== void 0) out[k] = o[k];
	return out;
}
/** Run `fn` over items with at most `limit` in flight. */
async function mapLimit(items, limit, fn, alive = () => true) {
	let i = 0;
	const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
		while (i < items.length && alive()) await fn(items[i++]);
	});
	await Promise.all(workers);
}
function mergeSettings(base, ...patches) {
	let out = {
		...base,
		tfs: [...base.tfs ?? DEFAULT_SETTINGS.tfs],
		tfDays: {
			...DEFAULT_SETTINGS.tfDays,
			...base.tfDays ?? {}
		},
		gates: { ...base.gates },
		live: { ...base.live },
		toggles: { ...base.toggles },
		tactics: { ...base.tactics },
		focus: [...base.focus ?? []],
		disabledKinds: [...base.disabledKinds ?? []],
		block: { ...base.block },
		dca: { ...base.dca },
		axis: { ...base.axis },
		grid: { ...base.grid },
		fees: { ...base.fees },
		adjust: { ...base.adjust }
	};
	for (const p of patches) {
		if (!p) continue;
		out = {
			...out,
			...p,
			gates: {
				...out.gates,
				...p.gates ?? {}
			},
			live: {
				...out.live,
				...p.live ?? {}
			},
			toggles: {
				...out.toggles,
				...p.toggles ?? {}
			},
			tactics: {
				...out.tactics,
				...p.tactics ?? {}
			},
			focus: p.focus ? [...p.focus] : out.focus,
			disabledKinds: p.disabledKinds ? [...p.disabledKinds] : out.disabledKinds ?? [],
			block: {
				...out.block,
				...p.block ?? {}
			},
			dca: {
				...out.dca,
				...p.dca ?? {}
			},
			axis: {
				...out.axis,
				...p.axis ?? {}
			},
			grid: {
				...out.grid,
				...p.grid ?? {}
			},
			fees: {
				...out.fees,
				...p.fees ?? {}
			},
			adjust: {
				...out.adjust,
				...p.adjust ?? {}
			},
			tfs: p.tfs ? [...p.tfs] : out.tfs,
			tfDays: {
				...out.tfDays,
				...p.tfDays ?? {}
			}
		};
	}
	return normalizeLanes(out);
}
/**
* Timeframe lanes: 1m is the base data and always processed; 5m / 15m / 30m are derived from it. The 1m backfill
* covers the longest lane history. A research timeframe carried by an older preset is normalised to the lanes.
*/
function normalizeLanes(s) {
	const tfs = [.../* @__PURE__ */ new Set([1, ...s.tfs ?? DEFAULT_SETTINGS.tfs])].filter((x) => TF_CHOICES.includes(x)).sort((a, b) => a - b);
	const tfDays = {
		...DEFAULT_SETTINGS.tfDays,
		...s.tfDays ?? {}
	};
	for (const k of Object.keys(tfDays)) tfDays[k] = Math.min(45, Math.max(1, Math.round(tfDays[k])));
	return {
		...s,
		tfMin: 1,
		tfs,
		tfDays,
		historyDays: Math.max(...tfs.map((tf) => tfDays[String(tf)] ?? s.historyDays))
	};
}
/**
* Every lane's series from base candles: the base as stored, 5m / 15m / 30m resampled (completed bars only), each
* over its own history (tfDays) plus `extraDays` (a backtest window).
*/
function laneSeriesFrom(candles, s, extraDays = 0) {
	const out = [];
	for (const [sym, cs] of candles) for (const tf of s.tfs ?? [s.tfMin]) {
		const c = tf === s.tfMin ? cs : resample(cs, s.tfMin, tf);
		const n = laneBars(s, tf) + Math.round(extraDays * 24 * 60 / tf);
		out.push(barsFromCandles(sym, tf, c.length > n ? c.slice(c.length - n) : c));
	}
	return out;
}
/** History (bars of that timeframe) a lane is computed over. */
var laneBars = (s, tf) => Math.round((s.tfDays?.[String(tf)] ?? s.historyDays) * 24 * 60 / tf);
var G = globalThis;
function coreRuntime() {
	const cur = G.__ctsCoreRuntime;
	if (cur && !(cur instanceof CoreRuntime)) {
		Object.setPrototypeOf(cur, CoreRuntime.prototype);
		cur.settings = mergeSettings(DEFAULT_SETTINGS, cur.settings);
		cur.ensureFields();
	}
	if (cur) coreDb();
	if (!G.__ctsCoreRuntime) {
		const rt = new CoreRuntime();
		rt.onLive = async (r, intents, gen) => {
			const { stepLive } = await import("./live.server.mjs");
			await stepLive(r, intents, gen);
		};
		G.__ctsCoreRuntime = rt;
	}
	G.__ctsCoreRuntime.ensureAlive();
	return G.__ctsCoreRuntime;
}
//#endregion
//#region src/core/server/boot.server.ts
function bootCore() {
	if (process.env.CTS_CORE_AUTOSTART === "0") return "autostart disabled";
	return `core v2 runtime ${coreRuntime().status.state}`;
}
//#endregion
export { bootCore };
