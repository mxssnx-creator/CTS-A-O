import { a as indicationState } from "./registry-DAOXOhzn.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/bots-BwclXPEV.js
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
export { tacticWarmupBars as i, entrySignal as n, tacticCooldown as r, BOTS as t };
