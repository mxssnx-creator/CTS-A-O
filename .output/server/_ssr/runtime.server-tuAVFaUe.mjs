import { n as closedPositions, r as openTimeline } from "./api-BkJXU631.mjs";
import { i as mergeSignals, o as signalSettings } from "./signal-config-B9M82AI0.mjs";
import { i as sizingSettings, n as orderKey, r as sizeBook } from "./sizing-DzKTMogO.mjs";
import { a as DEFAULT_TOGGLES, h as TF_CHOICES, i as DEFAULT_SETTINGS, n as DEFAULT_DCA, p as STRATEGY_PRESETS, r as DEFAULT_PROTECT, t as DEFAULT_BLOCK } from "./config-D_G1clvp.mjs";
import { c as laneOf, n as INDICATION_BY_ID, o as isSignalInd, u as signalSourceOf } from "./registry-DAOXOhzn.mjs";
import { i as tacticWarmupBars, n as entrySignal, r as tacticCooldown } from "./bots-BwclXPEV.mjs";
import { hourlyNet, profitFactor, scoreStats, statsOf } from "./stats-CgkRoLVg.mjs";
import { a as signalCandidates, allCombos, configId, forgetCombo, i as guardKey, kindOfId, laneClosesWith, laneProtect, mainByLane, makeUniverse, n as SignalGuard, o as signalCombos, parseConfigId, passesBase, r as activeSignals, runCombo, runPipeline, s as signalProtects, seriesOf, t as simulate } from "./pipeline-I4C2vyue.mjs";
import { RESEARCH_PRESETS, metricsFromStats, presetKey, presetSettings, qualifies, upsertPreset } from "./presets-CcqKlipW.mjs";
import { existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { availableParallelism } from "node:os";
import { Worker } from "node:worker_threads";
import { monitorEventLoopDelay } from "node:perf_hooks";
import { gunzipSync } from "node:zlib";
import { DatabaseSync } from "node:sqlite";
//#region node_modules/.nitro/vite/services/ssr/assets/runtime.server-tuAVFaUe.js
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
	const tl = openTimeline(sorted, startT, endT);
	return {
		pf: st.pf,
		ddtH: st.ddt,
		n: st.n,
		wr: st.wr,
		greenHours: st.gh,
		net: st.net,
		avgOpen: openTime / span,
		maxOpen,
		positions: closedPositions(sorted),
		avgPositions: tl.avgPositions,
		maxPositions: tl.maxPositions,
		perSymbol: [...bySym.entries()].map(([sym, e]) => ({
			sym,
			n: e.n,
			pf: profitFactor(e.gp, e.gl),
			net: e.net
		})).sort((a, b) => b.n - a.n)
	};
}
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
	return Math.max(1, Math.min(32, availableParallelism()));
}
var IDLE_MS = 12e4;
/** the worker file's version: a reused worker never runs older code than the file on disk (hot reload) */
var workerVersion = () => {
	try {
		return statSync(fileURLToPath(WORKER_URL)).mtimeMs;
	} catch {
		return 0;
	}
};
var G$2 = globalThis;
var pool = () => G$2.__ctsPool ??= {
	slots: [],
	idle: null
};
function spawn() {
	const w = new Worker(WORKER_URL, {
		execArgv: ["--experimental-strip-types", "--no-warnings"],
		resourceLimits: { maxOldGenerationSizeMb: 4096 }
	});
	w.unref();
	const slot = {
		w,
		busy: false,
		ver: workerVersion()
	};
	w.on("error", () => drop(slot));
	w.on("exit", () => drop(slot));
	pool().slots.push(slot);
	return slot;
}
function drop(slot) {
	const p = pool();
	p.slots = p.slots.filter((x) => x !== slot);
	slot.w.terminate().catch(() => void 0);
}
/** Run the messages on up to `size` pooled workers (one message per worker at a time); replies in order. */
/** Worker runs in flight and the time of the last start / reply: the watchdog keeps a waiting cycle alive. */
var activity = {
	inFlight: 0,
	at: 0
};
function workerActivity() {
	return { ...activity };
}
async function runOnWorkers(messages, size = poolSize(), timeoutMs = 9e5) {
	activity.inFlight++;
	activity.at = Date.now();
	try {
		return await runOnWorkersNow(messages, size, timeoutMs);
	} finally {
		activity.inFlight--;
		activity.at = Date.now();
	}
}
async function runOnWorkersNow(messages, size = poolSize(), timeoutMs = 9e5) {
	const p = pool();
	if (p.idle) clearTimeout(p.idle);
	p.idle = null;
	const ver = workerVersion();
	for (const x of p.slots.filter((y) => !y.busy && y.ver !== ver)) drop(x);
	const out = new Array(messages.length);
	let next = 0;
	const lane = async () => {
		let slot = p.slots.find((x) => !x.busy);
		if (!slot) slot = spawn();
		slot.busy = true;
		try {
			while (next < messages.length) {
				const i = next++;
				const w = slot.w;
				out[i] = await new Promise((resolve, reject) => {
					const timer = setTimeout(() => {
						cleanup();
						drop(slot);
						reject(/* @__PURE__ */ new Error("worker timed out"));
					}, timeoutMs);
					const onMsg = (m) => {
						cleanup();
						activity.at = Date.now();
						if (!m.ok) reject(new Error(m.error ?? "worker failed"));
						else resolve(m);
					};
					const onErr = (e) => {
						cleanup();
						reject(e);
					};
					const onExit = (code) => {
						cleanup();
						reject(/* @__PURE__ */ new Error(`worker exited (${code})`));
					};
					const cleanup = () => {
						clearTimeout(timer);
						w.off("message", onMsg);
						w.off("error", onErr);
						w.off("exit", onExit);
					};
					w.on("message", onMsg);
					w.once("error", onErr);
					w.once("exit", onExit);
					w.postMessage({
						...messages[i],
						id: i
					});
				});
			}
		} finally {
			slot.busy = false;
		}
	};
	try {
		await Promise.all(Array.from({ length: Math.max(1, Math.min(size, messages.length)) }, lane));
	} finally {
		if (p.idle) clearTimeout(p.idle);
		p.idle = setTimeout(() => {
			p.idle = null;
			for (const x of p.slots.filter((y) => !y.busy)) drop(x);
		}, IDLE_MS);
		p.idle.unref?.();
	}
	return out;
}
/** Split a list into `k` contiguous slices (order preserved). */
function slices(xs, k) {
	const n = Math.max(1, Math.min(k, xs.length));
	const out = [];
	for (let i = 0; i < n; i++) out.push(xs.slice(Math.floor(i * xs.length / n), Math.floor((i + 1) * xs.length / n)));
	return out.filter((s) => s.length);
}
/** Bars backed by one SharedArrayBuffer per series (read-only for every worker). */
function shareBars(bars) {
	return bars.map((b) => {
		const sab = new SharedArrayBuffer(Math.max(1, b.n) * 6 * 8);
		const cols = [
			"t",
			"o",
			"h",
			"l",
			"c",
			"v"
		];
		const out = { ...b };
		cols.forEach((k, i) => {
			const a = new Float64Array(sab, i * b.n * 8, b.n);
			a.set(b[k].subarray(0, b.n));
			out[k] = a;
		});
		return out;
	});
}
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
/** Rung spacing (price units) of a range type at price `px` with ATR `a`. */
function axisSpacing(range, spacing, px, a) {
	switch (range) {
		case "linear": return px * (spacing / 100) * 1.8 + a * .25;
		case "geo": return px * (spacing / 80);
		case "fib": return a * .809;
		default: return a * spacing;
	}
}
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
	const managed = ax.exits !== "fixed";
	const range = ax.range ?? "atr";
	let sp = 0;
	let risk = 0;
	const derive = (i) => {
		const a = avg();
		const at = Number.isFinite(atr[i]) ? atr[i] : 0;
		const step = Math.max(sp, .7 * at, .002 * a);
		const m = Number.isFinite(center[i]) ? center[i] : target;
		target = side === 1 ? Math.max(m + .25 * step, a + .85 * step) : Math.min(m - .25 * step, a - .85 * step);
		const slDist = Math.min(step, Math.abs(target - a));
		stop = a - side * slDist;
		risk = Math.max(slDist, sp, .45 * at);
	};
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
			if (managed) derive(i - 1);
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
			if (managed && filled) derive(i - 1);
			const a = avg();
			const up = side === 1 ? (h[i] - a) / a : (a - l[i]) / a;
			const dn = side === 1 ? (a - l[i]) / a : (h[i] - a) / a;
			if (up > mfe) mfe = up;
			if (dn > mae) mae = dn;
			const gap = i > startI;
			if (side === 1 ? l[i] <= stop : h[i] >= stop) close(i, gap ? side === 1 ? Math.min(o[i], stop) : Math.max(o[i], stop) : stop, "sl");
			else if (!filled && (side === 1 ? h[i] >= target : l[i] <= target)) close(i, gap ? side === 1 ? Math.max(o[i], target) : Math.min(o[i], target) : target, "tp");
			else if (i - startI + 1 >= p.hold) close(i, c[i], "time");
			else if (managed) {
				const m = center[i];
				if (Number.isFinite(m)) {
					const want = side === 1 ? Math.max(m + .2 * sp, a + .95 * risk) : Math.min(m - .2 * sp, a - .95 * risk);
					if (side === 1 ? want < target && want > a : want > target && want < a) target = want;
				}
				if (side * (c[i] - a) >= .85 * risk) stop = side === 1 ? Math.max(stop, a) : Math.min(stop, a);
			}
		}
		if (state === "flat" && pendingOpen < 0 && i + 1 < n && i + 1 >= nextAllowed && sig[i] !== 0) {
			const s = sig[i] > 0 ? 1 : -1;
			const ref = o[i + 1];
			if (!admissible(i, s, ref)) continue;
			const m = center[i];
			const a = atr[i];
			side = s;
			target = m;
			const step = managed ? axisSpacing(range, ax.spacing, ref, a) : ax.spacing * a;
			sp = step;
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
var BLOCK_SOURCES = [
	"config",
	"overall",
	"symbol",
	"direction",
	"indication",
	"type"
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
			`i:${t.kind}`,
			`t:${t.type ?? "normal"}`
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
		indication: !!s.indication,
		type: !!s.type
	};
}
function bookLevels(book, t, maxLevel) {
	if (!book) return {
		overall: 0,
		symbol: 0,
		direction: 0,
		indication: 0,
		type: 0
	};
	return {
		overall: book.level("all", maxLevel),
		symbol: book.level(`s:${t.sym}`, maxLevel),
		direction: book.level(`d:${t.side}`, maxLevel),
		indication: book.level(`i:${t.kind}`, maxLevel),
		type: book.level(`t:${t.type ?? "normal"}`, maxLevel)
	};
}
/** Combined level of the enabled sources: shared = max, additive = sum. */
function combineLevels(levels, b) {
	const on = sourcesOf(b);
	const xs = BLOCK_SOURCES.filter((k) => on[k]).map((k) => levels[k]);
	if (!xs.length) return 0;
	return (b.mode ?? "shared") === "additive" ? xs.reduce((a, x) => a + x, 0) : Math.max(...xs);
}
var H$1 = 36e5;
var DEFAULT_COORD = {
	enabled: true,
	hourLock: 0,
	cooldown: "off",
	conflict: false,
	confirm: true
};
function coordSettings(c) {
	const hl = Number(c?.hourLock);
	return {
		enabled: c?.enabled !== false,
		hourLock: Number.isFinite(hl) ? Math.min(100, Math.max(0, hl)) : DEFAULT_COORD.hourLock,
		cooldown: c?.cooldown === "signals" || c?.cooldown === "all" || c?.cooldown === "off" ? c.cooldown : DEFAULT_COORD.cooldown,
		conflict: c?.conflict === void 0 ? DEFAULT_COORD.conflict : Boolean(c.conflict),
		confirm: c?.confirm === void 0 ? DEFAULT_COORD.confirm : Boolean(c.confirm)
	};
}
/**
* The coordination verdict for one entry (null = allowed). `hourNet` = realized Σ trade % per clock hour of the
* executed orders closed so far; `open` = executed orders open at the entry.
*/
function coordBlock(c, tr, hourNet, open) {
	if (!c?.enabled) return null;
	const hk = Math.floor(tr.entryT / H$1);
	const signal = sigCfg(tr.cfg);
	if (c.hourLock > 0 && (hourNet.get(hk) ?? 0) >= c.hourLock) return "hourLock";
	if (c.cooldown !== "off" && (hourNet.get(hk - 1) ?? 0) < 0 && (c.cooldown === "all" || signal)) return "cooldown";
	if (c.conflict && open.some((x) => x.sym === tr.sym && x.side !== tr.side)) return "conflict";
	if (c.confirm && signal && !open.some((x) => x.sym === tr.sym && x.side === tr.side && !sigCfg(x.cfg))) return "confirm";
	return null;
}
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
		maxPerSymbol: 0,
		maxOpen: 0,
		guardPct: 0,
		coord: { ...DEFAULT_COORD },
		longH: 336,
		robustFrac: .6,
		rank: "lcb",
		bots: [],
		mode: "durable",
		durableSplits: 4,
		durableFrac: .75,
		preGate: true,
		maxPerSide: 0,
		maxPositions: 12,
		familySeats: false,
		laneSeats: 3,
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
/** Bytes of one tape's backing buffer: 9 float64 columns (3 × n, 4 × n+1), 3 float32, 2 uint16, 3 int8/uint8. */
var tapeBytes = (n) => (3 * n + 4 * (n + 1)) * 8 + n * 4 * 3 + n * 2 * 2 + n * 3;
/** The column views of a tape of `n` trades laid out at `off` in `buf` (the one layout, used everywhere). */
function tapeViews(buf, off0, n) {
	let off = off0;
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
	return {
		exitT,
		entryT,
		r,
		gp,
		gl,
		rs,
		r2,
		entry,
		exit,
		vol,
		symI,
		bars,
		side,
		reason,
		level: new Uint8Array(buf, off, n)
	};
}
function packTapes(tapes) {
	const align = (x) => x + 7 & -8;
	let total = 0;
	for (const t of tapes) total = align(total) + tapeBytes(t.n);
	const sab = new SharedArrayBuffer(Math.max(8, align(total)));
	const dst = new Uint8Array(sab);
	const symTables = [];
	const symIdx = /* @__PURE__ */ new Map();
	const rows = [];
	let off = 0;
	for (const t of tapes) {
		off = align(off);
		const src = t.exitT.buffer;
		if (t.exitT.byteOffset !== 0 || src.byteLength < tapeBytes(t.n)) throw new Error("tape not in the packed layout");
		dst.set(new Uint8Array(src, 0, tapeBytes(t.n)), off);
		let si = symIdx.get(t.syms);
		if (si === void 0) {
			si = symTables.length;
			symTables.push(t.syms);
			symIdx.set(t.syms, si);
		}
		rows.push([
			t.id,
			t.bot,
			t.ind,
			t.protect,
			t.kind,
			t.n,
			si,
			off,
			t.open,
			t.pending,
			t.fromT ?? null
		]);
		off += tapeBytes(t.n);
	}
	return {
		sab,
		meta: JSON.stringify({
			syms: symTables,
			rows
		})
	};
}
function makeTape(id, bot, ind, protect, kind, syms, trades, open, pending) {
	trades.sort((a, b) => a.exitT - b.exitT || a.entryT - b.entryT);
	const n = trades.length;
	const symIdx = new Map(syms.map((s, i) => [s, i]));
	const { exitT, entryT, r, gp, gl, rs, r2, entry, exit, vol, symI, bars, side, reason, level } = tapeViews(new ArrayBuffer(tapeBytes(n)), 0, n);
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
		level,
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
	const axisN = !dcaOpt?.axis ? 0 : dcaOpt.axis.exits === "fixed" ? dcaOpt.protects.length : (dcaOpt.axis.ranges?.length || 1) * (dcaOpt.axis.levelsSet?.length || 1);
	const per = protects.length + (dcaOpt ? dcaOpt.protects.length * 2 + axisN : 0);
	const total = combos.length * per;
	let done = 0;
	for (const c of combos) {
		const series = seriesOf(u, c.ind);
		let fromT = Infinity;
		for (const s of series) fromT = Math.min(fromT, (u.bars[s].t[0] ?? Infinity) + 24 * H$1);
		const atFrom = (t) => {
			if (Number.isFinite(fromT)) t.fromT = fromT;
			return t;
		};
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
		const built = /* @__PURE__ */ new Set();
		for (const p0 of protects) {
			const kind = p0.trail > 0 ? "trailing" : "normal";
			const p = adj(c.bot, c.ind, kind, laneProtect(p0, c.ind));
			const id = configId(c.bot, c.ind, p);
			if (built.has(id)) {
				done++;
				continue;
			}
			built.add(id);
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
			out.push(atFrom(makeTape(id, c.bot, c.ind, p, kind, syms, trades, open, pending)));
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
				if (built.has(id)) {
					done++;
					continue;
				}
				built.add(id);
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
				out.push(atFrom(makeTape(id, c.bot, c.ind, p, kind, syms, trades, [], pending)));
				done++;
				yield {
					done,
					total
				};
			}
			if (dcaOpt.axis) {
				const ax0 = dcaOpt.axis;
				const variants = ax0.exits === "fixed" ? dcaOpt.protects.map((p0) => ({
					p0,
					ax: ax0,
					tag: ""
				})) : (ax0.ranges?.length ? ax0.ranges : [ax0.range ?? "atr"]).flatMap((range) => (ax0.levelsSet?.length ? ax0.levelsSet : [ax0.levels]).map((levels) => ({
					p0: dcaOpt.protects[0],
					ax: {
						...ax0,
						range,
						levels
					},
					tag: `|ax-${range}${levels}`
				})));
				for (const { p0, ax, tag } of variants) {
					const p = adj(c.bot, c.ind, "axis", laneProtect(p0, c.ind));
					const id = configId(c.bot, c.ind, p, "axis").replace(/\|axis$/, `${tag}|axis`);
					if (built.has(id)) {
						done++;
						continue;
					}
					built.add(id);
					const trades = [];
					const pending = [];
					for (const s of series) {
						const k = u.caches[s];
						const res = simulateAxis(id, u.bars[s], sigs[s], p, ax, k.ema(Math.max(2, Math.round(ax.centerMin ? ax.centerMin / (u.bars[s].tfMin || 1) : ax.center))), k.atr(14), cost, cooldown);
						for (const tr of res.trades) trades.push(tr);
						if (res.pending) pending.push({
							sym: u.bars[s].sym,
							side: res.pending
						});
					}
					out.push(atFrom(makeTape(id, c.bot, c.ind, p, "axis", syms, trades, [], pending)));
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
		case "trailing": return tg.trailing && (tg.normal || tg.block);
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
/** Feed one closed candidate into the Block book and, for a signal, into the signal guard. */
function feedBooks(e, book, guard) {
	book?.add(e);
	if (guard && e.ind && isSignalInd(e.ind)) guard.add(guardKey(e.cfg ?? e.ind, e.sym, e.side, e.type ?? "normal"), e.r, e.exitT);
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
/** Real seats per family: `portfolio`, 0 = no limit. */
var seatsOf = (o) => o.portfolio > 0 ? o.portfolio : Infinity;
/** Strategy family of a sub-strategy: base (Normal / Trailing), DCA (both variants), Axis. */
var familyOf = (kind) => kind === "axis" ? "axis" : kind === "dca" || kind === "dca-active" ? "dca" : "base";
/** Seat key of a tape: its pair, per family when every family has its own seats. */
var seatKey = (tp, o) => o.familySeats ? `${tp.bot}|${tp.ind}|${familyOf(tp.kind)}` : `${tp.bot}|${tp.ind}`;
var famOfKey = (pair) => pair.split("|")[2] ?? "base";
/**
* Additional strategies (DCA, Axis) must beat the base: a candidate of another family stays only when its window
* PF is at least the best base-family (Normal / Trailing) PF of the same pair in that window.
*/
function beatsBase(xs, basePf, o) {
	if (!o.familySeats) return xs;
	return xs.filter((c) => {
		if (famOfKey(c.pair) === "base") return true;
		const b = basePf.get(c.pair.split("|").slice(0, 2).join("|"));
		if (b === void 0) return o.familyNeedsBase === false;
		return c.window.pf >= b;
	});
}
var noteBase = (m, tp, w) => {
	if (w.n < 3 || familyOf(tp.kind) !== "base") return;
	const k = `${tp.bot}|${tp.ind}`;
	m.set(k, Math.max(m.get(k) ?? -Infinity, w.pf));
};
/** pickByLane per strategy family (each with `seats` of its own) when family seats are on. */
function pickSeats(cands, seats, picks, pairs, o) {
	const ls = o.laneSeats ?? 0;
	if (!o.familySeats) return pickByLane(cands, seats, picks, pairs, ls);
	const fams = /* @__PURE__ */ new Map();
	for (const c of cands) {
		const f = famOfKey(c.pair);
		let xs = fams.get(f);
		if (!xs) fams.set(f, xs = []);
		xs.push(c);
	}
	const held = /* @__PURE__ */ new Map();
	for (const p of picks) {
		const f = famOfKey(p.pair ?? "");
		let xs = held.get(f);
		if (!xs) held.set(f, xs = []);
		xs.push(p);
	}
	const out = [];
	for (const f of [
		"base",
		"dca",
		"axis"
	]) out.push(...pickByLane(fams.get(f) ?? [], seats, held.get(f) ?? [], pairs, ls));
	return out;
}
/**
* Real seats with a share per timeframe lane: `picks` (held) first, then floor(free / lanes) of each lane's best
* candidates, then the best remaining — one config per bot × indication pair. Without it the slower lanes
* (longer history, bigger windows, higher scores) take every seat and the fast lanes never trade.
*/
function pickByLane(cands, seats0, picks, pairs, laneSeats = 0) {
	const laneKey = (pair) => {
		const ind = pair.split("|")[1] ?? "";
		const l = laneOf(ind);
		return isSignalInd(ind) ? "signal" : l.tf === null ? "plain" : `${l.tf}${l.combined ? "c" : ""}`;
	};
	const byLane = /* @__PURE__ */ new Map();
	for (const c of cands) {
		const k = laneKey(c.pair);
		let xs = byLane.get(k);
		if (!xs) byLane.set(k, xs = []);
		xs.push(c);
	}
	const heldBy = /* @__PURE__ */ new Map();
	for (const p of picks) {
		const pair = p.pair;
		if (pair) heldBy.set(laneKey(pair), (heldBy.get(laneKey(pair)) ?? 0) + 1);
	}
	let deficit = 0;
	for (const k of byLane.keys()) deficit += Math.max(0, laneSeats - (heldBy.get(k) ?? 0));
	const seats = Math.max(seats0, laneSeats * byLane.size, picks.length + deficit);
	if (seats - picks.length <= 0) return picks;
	const take = (c) => {
		if (picks.length >= seats || pairs.has(c.pair)) return;
		pairs.add(c.pair);
		picks.push(c);
	};
	const sorted = new Map([...byLane].map(([k, xs]) => [k, [...xs].sort((x, y) => y.score - x.score)]));
	const fill = (k, upTo) => {
		let n = heldBy.get(k) ?? 0;
		for (const c of sorted.get(k) ?? []) {
			if (n >= upTo) break;
			if (pairs.has(c.pair)) continue;
			const before = picks.length;
			take(c);
			if (picks.length > before) {
				n++;
				heldBy.set(k, n);
			}
		}
	};
	if (byLane.size > 1) {
		for (const k of sorted.keys()) fill(k, laneSeats);
		const even = Math.floor(seats / byLane.size);
		for (const k of sorted.keys()) fill(k, Math.max(laneSeats, even));
	}
	for (const c of [...cands].sort((x, y) => y.score - x.score)) take(c);
	return picks;
}
function selectAt(tapes, t, o) {
	const longH = Math.max(o.longH, o.preH);
	const fromLong = t - longH * H$1;
	const fromPre = t - o.preH * H$1;
	const minLong = Math.max(8, o.gates.minTrades);
	const ddtMax = o.gates.maxDdtH * longH / 72;
	const pairTotal = /* @__PURE__ */ new Map();
	const pairOk = /* @__PURE__ */ new Map();
	const basePf = /* @__PURE__ */ new Map();
	const cand = [];
	const botOk = o.bots.length ? new Set(o.bots) : null;
	for (const tp of tapes) {
		if (botOk && !botOk.has(tp.bot)) continue;
		const a = lowerBound(tp.exitT, fromLong);
		const b = lowerBound(tp.exitT, t);
		if (b - a < minLong) continue;
		const pair = seatKey(tp, o);
		pairTotal.set(pair, (pairTotal.get(pair) ?? 0) + 1);
		const w = win(tp, a, b);
		noteBase(basePf, tp, w);
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
	const scored = beatsBase(cand.filter((c) => robust(c.pair)), basePf, o).sort((x, y) => y.score - x.score);
	return {
		picks: pickSeats(scored, seatsOf(o), [], /* @__PURE__ */ new Set(), o).map((x) => ({
			id: x.id,
			score: x.score,
			window: x.window
		})),
		eligible: scored.length
	};
}
/** Durable winners at t: consistent across sub-windows of the long window. */
function selectDurable(tapes, t, o, held) {
	const from0 = t - Math.max(o.longH, o.preH) * H$1;
	const minLong = Math.max(8, o.gates.minTrades);
	const k = Math.max(2, o.durableSplits);
	const botOk = o.bots.length ? new Set(o.bots) : null;
	const keep = [];
	const cand0 = [];
	const basePf = /* @__PURE__ */ new Map();
	for (const tp of tapes) {
		if (botOk && !botOk.has(tp.bot)) continue;
		if (!kindExecutable(tp.kind, o.toggles)) continue;
		const from = Math.min(t - o.preH * H$1, Math.max(from0, tp.fromT ?? from0));
		const span = (t - from) / k;
		const a = lowerBound(tp.exitT, from);
		const b = lowerBound(tp.exitT, t);
		const w = win(tp, a, b);
		const pair = seatKey(tp, o);
		noteBase(basePf, tp, w);
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
		cand0.push({
			id: tp.id,
			score: lcbFast(tp, a, b),
			window: {
				...w,
				ddt: 0
			},
			pair
		});
	}
	const cand = beatsBase(cand0, basePf, o);
	const pairs = /* @__PURE__ */ new Set();
	const picks = [];
	const perFam = /* @__PURE__ */ new Map();
	for (const s of keep.sort((x, y) => y.score - x.score)) {
		const f = o.familySeats ? famOfKey(s.pair) : "all";
		if (pairs.has(s.pair) || (perFam.get(f) ?? 0) >= seatsOf(o)) continue;
		pairs.add(s.pair);
		perFam.set(f, (perFam.get(f) ?? 0) + 1);
		picks.push(s);
	}
	return {
		picks: pickSeats(cand, seatsOf(o), picks, pairs, o).map((x) => ({
			id: x.id,
			score: x.score,
			window: x.window
		})),
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
	const basePf = /* @__PURE__ */ new Map();
	for (const tp of tapes) {
		if (botOk && !botOk.has(tp.bot)) continue;
		if (!kindExecutable(tp.kind, o.toggles)) continue;
		const a = lowerBound(tp.exitT, from);
		const b = lowerBound(tp.exitT, t);
		const w = win(tp, a, b);
		const score = w.n >= 3 ? lcbFast(tp, a, b) : -1e9;
		const pair = seatKey(tp, o);
		noteBase(basePf, tp, w);
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
	const ok = new Set(beatsBase([...best.entries()].map(([pair, v]) => ({
		pair,
		window: v.window
	})), basePf, o).map((x) => x.pair));
	const perFam = /* @__PURE__ */ new Map();
	return {
		picks: [...best.entries()].filter(([pair]) => ok.has(pair)).sort((x, y) => y[1].score - x[1].score).filter(([pair]) => {
			const f = o.familySeats ? famOfKey(pair) : "all";
			const n = perFam.get(f) ?? 0;
			perFam.set(f, n + 1);
			return n < seatsOf(o);
		}).map(([, v]) => v),
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
	r: x.r / (x.mult || 1),
	ind: x.cfg.split("|")[1] ?? "",
	type: x.kind ?? "normal",
	cfg: x.cfg
});
/** Real-stage execution rules for one candidate entry (toggles, last-N, Block / Block Active). */
function execDecision(tp, entryT, o, ctx) {
	const tg = o.toggles;
	if (!kindExecutable(tp.kind, tg)) return {
		ok: false,
		why: "toggle"
	};
	if (ctx && isSignalInd(tp.ind)) {
		if (o.signalActive && !o.signalActive.has(`${tp.bot}|${tp.ind}|${ctx.sym}`)) return {
			ok: false,
			why: "signalInactive"
		};
		if (o.signalGuardN && ctx.guard?.disabled(guardKey(tp.id, ctx.sym, ctx.side, tp.kind), o.signalGuardN)) return {
			ok: false,
			why: "signalGuard"
		};
		if (o.signalCluster?.enabled && ctx.guard?.clustered(entryT, o.signalCluster)) return {
			ok: false,
			why: "signalCluster"
		};
	}
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
			kind: kindOfInd(tp.ind),
			type: tp.kind
		}, o.block.maxLevel)
	}, o.block) : 0;
	const adjusted = tg.block && level >= (tg.blockActive ? Math.max(1, o.block.minActiveLevel) : 1);
	if ((tp.kind === "normal" || tp.kind === "trailing") && !tg.normal && !adjusted) return {
		ok: false,
		why: "normalOff"
	};
	if (!adjusted) return {
		ok: true,
		level: 0,
		vol: 1
	};
	return {
		ok: true,
		level,
		vol: Math.min(Math.min(8, o.block.maxMult), 1 + o.block.ratio * level)
	};
}
var sigCfgMemo = /* @__PURE__ */ new Map();
/** Whether a config id ("bot|ind|…") is a signal config (memoised: called per open order per candidate). */
function sigCfg(cfg) {
	let v = sigCfgMemo.get(cfg);
	if (v === void 0) {
		v = isSignalInd(cfg.split("|")[1] ?? "");
		if (sigCfgMemo.size > 2e5) sigCfgMemo.clear();
		sigCfgMemo.set(cfg, v);
	}
	return v;
}
/** Order caps for engine orders, or for signal orders (their own budget); 0 / unset = no limit. */
function capsOf(o, signal) {
	const lim = (x) => x && x > 0 ? x : Infinity;
	if (!signal) return {
		perSymbol: lim(o.maxPerSymbol),
		maxOpen: lim(o.maxOpen),
		perSide: lim(o.maxPerSide)
	};
	const maxOpen = lim(o.signalMaxOpen);
	return {
		perSymbol: lim(o.signalPerSymbol),
		maxOpen,
		perSide: maxOpen
	};
}
var signalIndexCache = /* @__PURE__ */ new WeakMap();
function signalIndex(sigTapes, cacheKey) {
	const g = signalIndexGen(sigTapes, cacheKey);
	for (let r = g.next();; r = g.next()) if (r.done) return r.value;
}
/** signalIndex in slices (yields every few tapes, so a large index never blocks the event loop). */
function* signalIndexGen(sigTapes, cacheKey) {
	const hit = cacheKey && signalIndexCache.get(cacheKey);
	if (hit) return hit;
	const cfgs = /* @__PURE__ */ new Map();
	for (const tp of sigTapes) {
		const pair = `${tp.bot}|${tp.ind}`;
		cfgs.set(pair, (cfgs.get(pair) ?? 0) + 1);
	}
	const acc = /* @__PURE__ */ new Map();
	let done = 0;
	for (const tp of sigTapes) {
		if (++done % 100 === 0) yield done;
		const pair = `${tp.bot}|${tp.ind}`;
		const k = cfgs.get(pair);
		for (let i = 0; i < tp.n; i++) {
			const key = `${pair}|${tp.syms[tp.symI[i]]}`;
			let m = acc.get(key);
			if (!m) acc.set(key, m = /* @__PURE__ */ new Map());
			const hb = Math.floor(tp.exitT[i] / H$1);
			let x = m.get(hb);
			if (!x) m.set(hb, x = [
				0,
				0,
				0,
				0
			]);
			const r = tp.r[i];
			x[0] += r * 100 / k;
			if (r > 0) x[1] += r;
			else x[2] -= r;
			x[3] += 1 / k;
		}
	}
	const out = [];
	for (const [key, m] of acc) {
		const i2 = key.lastIndexOf("|");
		const hs = [...m.keys()].sort((x, y) => x - y);
		const g = {
			pair: key.slice(0, i2),
			src: signalSourceOf(key.slice(key.indexOf("|") + 1, i2)),
			sym: key.slice(i2 + 1),
			h: new Float64Array(hs),
			net: new Float64Array(hs.length),
			gp: new Float64Array(hs.length),
			gl: new Float64Array(hs.length),
			n: new Float64Array(hs.length)
		};
		hs.forEach((hb, j) => {
			const x = m.get(hb);
			g.net[j] = x[0];
			g.gp[j] = x[1];
			g.gl[j] = x[2];
			g.n[j] = x[3];
		});
		out.push(g);
	}
	if (cacheKey) signalIndexCache.set(cacheKey, out);
	return out;
}
/**
* Source stability on its executed (taken) signal orders: the orders of the source closed in the `days` × 24 h
* before t, in 24-hour buckets counted back from t. Unstable = at least `minTrades` of them and negative in sum,
* or positive in fewer than `minShare` of the buckets it traded in. A source without enough executed history is
* not judged (it trades).
*/
function sourceUnstable(closed, t, gate) {
	if (!closed?.length) return false;
	const from = t - gate.days * 24 * H$1;
	const buckets = /* @__PURE__ */ new Map();
	let n = 0;
	let sum = 0;
	for (let i = closed.length - 1; i >= 0; i--) {
		const x = closed[i];
		if (x.exitT > t) continue;
		if (x.exitT <= from) break;
		n++;
		sum += x.r;
		const b = Math.floor((t - x.exitT) / (24 * H$1));
		buckets.set(b, (buckets.get(b) ?? 0) + x.r);
	}
	if (n < (gate.minTrades ?? 5)) return false;
	let pos = 0;
	for (const v of buckets.values()) if (v > 0) pos++;
	return sum < 0 || pos < gate.minShare * buckets.size;
}
/**
* The active signals at time t, causally: every signal (pair × symbol) judged on its tapes' results in the hours
* that closed completely in the `windowH` hours before t (hourly resolution: drawdown over hourly steps), averaged
* over the signal's configs, then ranked by the same rules as the Base ranking (activeSignals: drawdown /
* consistency / latest-24 h validation, the best `count`).
*/
function activeSignalsAt(sigTapes, t, sig, windowH) {
	const groups = sigTapes.length && "h" in sigTapes[0] ? sigTapes : signalIndex(sigTapes);
	const endB = Math.floor(t / H$1);
	const fromB = endB - windowH;
	const recentB = endB - (sig.validateH ?? 24);
	const byPair = /* @__PURE__ */ new Map();
	const hb = (x, v) => {
		let lo = 0;
		let hi = x.length;
		while (lo < hi) {
			const m = lo + hi >> 1;
			if (x[m] < v) lo = m + 1;
			else hi = m;
		}
		return lo;
	};
	for (const g of groups) {
		const a = hb(g.h, fromB);
		const b = hb(g.h, endB);
		if (a >= b) continue;
		let cum = 0;
		let peak = 0;
		let dd = 0;
		let gp = 0;
		let gl = 0;
		let n = 0;
		let recentN = 0;
		let recentNet = 0;
		let blocks = 0;
		let ok = 0;
		let blk = NaN;
		let blkSum = 0;
		for (let j = a; j < b; j++) {
			cum += g.net[j];
			if (cum > peak) peak = cum;
			if (peak - cum > dd) dd = peak - cum;
			gp += g.gp[j];
			gl += g.gl[j];
			n += g.n[j];
			if (g.h[j] >= recentB) {
				recentN += g.n[j];
				recentNet += g.net[j];
			}
			const bk = Math.floor(g.h[j] / 4);
			if (bk !== blk) {
				if (blocks && blkSum > 0) ok++;
				blocks++;
				blk = bk;
				blkSum = 0;
			}
			blkSum += g.net[j];
		}
		if (blocks && blkSum > 0) ok++;
		let rec = byPair.get(g.pair);
		if (!rec) byPair.set(g.pair, rec = {});
		rec[g.sym] = {
			n,
			net: cum,
			pf: profitFactor(gp, gl),
			dd,
			okShare: blocks ? ok / blocks : 0,
			recentN,
			recentNet
		};
	}
	const pairs = [...byPair];
	return activeSignals(pairs.map(([pair, bySym]) => {
		const i = pair.indexOf("|");
		return {
			bot: pair.slice(0, i),
			ind: pair.slice(i + 1),
			bySym
		};
	}), sig);
}
/**
* Best-first order of candidates entering at the same time (lower = earlier): engine sets before signals (engine
* PF 2.4–2.8 vs signals 1.0–1.5 on real data); engine sets by their selection score, best first; signals by their
* active ranking (the order of `signalActive`: recovery factor), best first.
*/
function bestFirst(picks, o) {
	if (o.bestFirst === false) return () => 0;
	const rank = new Map([...picks].sort((a, b) => b.score - a.score || (a.id < b.id ? -1 : 1)).map((p, i) => [p.id, i]));
	const sigRank = new Map([...o.signalActive ?? []].map((k, i) => [k, i]));
	const E = rank.size + 1;
	return (tp, sym) => {
		const r = rank.get(tp.id);
		if (r !== void 0) return r;
		if (isSignalInd(tp.ind)) return E + (sigRank.get(`${tp.bot}|${tp.ind}|${sym}`) ?? sigRank.size);
		return E - 1;
	};
}
/**
* Engine tapes (selected into Real seats) and signal tapes (every config of an active signal runs on its own;
* none when signals are off).
*/
function splitSignalTapes(tapes, o) {
	if (!tapes.some((t) => isSignalInd(t.ind))) return {
		engine: tapes,
		signal: []
	};
	if (o.signalRank) return {
		engine: tapes.filter((t) => !isSignalInd(t.ind)),
		signal: tapes.filter((t) => isSignalInd(t.ind))
	};
	const pairs = new Set([...o.signalActive ?? []].map((k) => k.split("|").slice(0, 2).join("|")));
	return {
		engine: tapes.filter((t) => !isSignalInd(t.ind)),
		signal: o.signalActive ? tapes.filter((t) => isSignalInd(t.ind) && pairs.has(`${t.bot}|${t.ind}`)) : []
	};
}
/** The active signal set a step recorded for an entry at t (the last step starting at or before t). */
function signalSetAt(steps, t) {
	let lo = 0;
	let hi = steps.length;
	while (lo < hi) {
		const m = lo + hi >> 1;
		if (steps[m].t <= t) lo = m + 1;
		else hi = m;
	}
	return lo ? new Set(steps[lo - 1].keys) : void 0;
}
function* walkForwardGen(u, tapes, o) {
	const byId = new Map(tapes.map((t) => [t.id, t]));
	const { engine: selTapes, signal: sigTapes } = splitSignalTapes(tapes, o);
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
	const guard = new SignalGuard();
	const feed = [];
	const vopen = [];
	const seen = /* @__PURE__ */ new Set();
	const srcClosed = /* @__PURE__ */ new Map();
	const settle = (t) => {
		while (vopen.length && vopen[0].exitT <= t) feedBooks(vopen.shift(), book, guard);
		while (open.length && open[0].exitT <= t) {
			const x = open.shift();
			const k = Math.floor(x.exitT / H$1);
			hourNet.set(k, (hourNet.get(k) ?? 0) + x.r * 100);
			if (sigCfg(x.cfg)) {
				const src = signalSourceOf(x.cfg.split("|")[1]);
				let l = srcClosed.get(src);
				if (!l) srcClosed.set(src, l = []);
				l.push({
					exitT: x.exitT,
					r: x.r
				});
			}
		}
	};
	const sigCands = [];
	let built = 0;
	for (const tp of sigTapes) {
		if (++built % 200 === 0) yield -1;
		const pair = `${tp.bot}|${tp.ind}|`;
		for (let i = 0; i < tp.n; i++) {
			const e = tp.entryT[i];
			if (e < startT || e >= stopT) continue;
			const key = pair + tp.syms[tp.symI[i]];
			if (o.signalRank || !o.signalActive || o.signalActive.has(key)) sigCands.push({
				e,
				i,
				tp,
				key
			});
		}
	}
	sigCands.sort((a, b) => a.e - b.e);
	let sp = 0;
	let held = /* @__PURE__ */ new Set();
	const barH = (u.baseTf ?? u.bars[0]?.tfMin ?? 60) / 60;
	const stepH = Math.max(o.stepH, barH);
	const signalSteps = [];
	let sigIdx = [];
	if (o.signalRank && sigTapes.length) {
		const ig = signalIndexGen(sigTapes, tapes);
		for (let r = ig.next();; r = ig.next()) {
			if (r.done) {
				sigIdx = r.value;
				break;
			}
			yield -1;
		}
	}
	let stepOpts = o;
	for (let t = startT; t < stopT; t += stepH * H$1) {
		if (o.signalRank && sigTapes.length) {
			const act = activeSignalsAt(sigIdx, t, o.signalRank, Math.max(o.longH, o.preH));
			stepOpts = {
				...o,
				signalActive: act
			};
			signalSteps.push({
				t,
				keys: [...act]
			});
		}
		const { picks, eligible } = o.mode === "durable" ? selectDurable(selTapes, t, o, held) : o.mode === "fixed" ? selectFixed(selTapes, t, o) : selectAt(selTapes, t, o);
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
		while (sp < sigCands.length && sigCands[sp].e < t + stepH * H$1) {
			const c = sigCands[sp++];
			if (o.signalRank && !stepOpts.signalActive?.has(c.key)) continue;
			cands.push({
				tr: tradeAt(c.tp, c.i),
				tp: c.tp
			});
		}
		const prio = bestFirst(picks, stepOpts);
		cands.sort((a, b) => a.tr.entryT - b.tr.entryT || prio(a.tp, a.tr.sym) - prio(b.tp, b.tr.sym) || a.tr.cfg.localeCompare(b.tr.cfg));
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
			const cls = sigCfg(tr.cfg);
			const caps = capsOf(o, cls);
			const gateOn = cls && o.signalSourceGate?.enabled;
			const coordWhy = coordBlock(o.coord, tr, hourNet, open) ?? (gateOn && sourceUnstable(srcClosed.get(signalSourceOf(tr.cfg.split("|")[1])), tr.entryT, o.signalSourceGate) ? "sourceUnstable" : null);
			if (o.guardPct > 0 && (hourNet.get(hourKey) ?? 0) <= -o.guardPct) why = "hourGuard";
			else if (coordWhy) why = coordWhy;
			else if (open.some((x) => x.sym === tr.sym && x.cfg === tr.cfg)) why = "dupe";
			else if (open.reduce((a, x) => a + (x.sym === tr.sym && sigCfg(x.cfg) === cls ? 1 : 0), 0) >= caps.perSymbol) why = "perSymbol";
			else if (open.reduce((a, x) => a + (sigCfg(x.cfg) === cls ? 1 : 0), 0) >= caps.maxOpen) why = "maxOpen";
			else if (open.reduce((a, x) => a + (x.side === tr.side && sigCfg(x.cfg) === cls ? 1 : 0), 0) >= caps.perSide) why = "perSide";
			else if (o.maxPositions && !open.some((x) => x.sym === tr.sym && x.side === tr.side) && new Set(open.map((x) => `${x.sym}|${x.side}`)).size >= o.maxPositions) why = "maxPositions";
			const dec = why ? null : execDecision(tp, tr.entryT, stepOpts, {
				book,
				guard,
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
		feed: feed.sort((a, b) => a.exitT - b.exitT),
		...o.signalRank ? {
			signalSteps,
			signalActiveEnd: sigTapes.length ? [...activeSignalsAt(sigIdx, stopT, o.signalRank, Math.max(o.longH, o.preH))] : []
		} : {}
	};
}
var URL_MAINNET = "wss://open-api-swap.bingx.com/swap-market";
var PriceStream = class {
	ws = null;
	prices = /* @__PURE__ */ new Map();
	want = /* @__PURE__ */ new Set();
	subscribed = /* @__PURE__ */ new Set();
	closed = true;
	backoff = 1e3;
	retry = null;
	recent = [];
	reconnects = 0;
	lastError = null;
	seq = 0;
	url;
	constructor(url = URL_MAINNET) {
		this.url = url;
	}
	/** Start (idempotent) and follow this symbol list. */
	follow(symbols) {
		this.want = new Set(symbols);
		if (this.closed) {
			this.closed = false;
			this.connect();
		} else this.sync();
	}
	stop() {
		this.closed = true;
		if (this.retry) clearTimeout(this.retry);
		this.retry = null;
		try {
			this.ws?.close();
		} catch {}
		this.ws = null;
		this.subscribed.clear();
	}
	/** Newest price of a symbol if not older than maxAgeMs. */
	price(sym, maxAgeMs = 3e4) {
		const p = this.prices.get(sym);
		return p && Date.now() - p.at <= maxAgeMs ? p.px : null;
	}
	/** Feed a price from another source (REST fallback). */
	put(sym, px, at = Date.now()) {
		if (px > 0) this.prices.set(sym, {
			px,
			at
		});
	}
	stats() {
		const now = Date.now();
		this.recent = this.recent.filter((t) => now - t <= 1e4);
		let newest = 0;
		for (const p of this.prices.values()) newest = Math.max(newest, p.at);
		return {
			connected: !!this.ws && this.ws.readyState === 1,
			symbols: this.subscribed.size,
			rate: this.recent.length / 10,
			ageMs: newest ? now - newest : Infinity,
			reconnects: this.reconnects,
			lastError: this.lastError
		};
	}
	connect() {
		if (this.closed || typeof WebSocket === "undefined") return;
		let ws;
		try {
			ws = new WebSocket(this.url);
		} catch (err) {
			this.fail(err);
			return;
		}
		ws.binaryType = "arraybuffer";
		this.ws = ws;
		ws.onopen = () => {
			this.backoff = 1e3;
			this.subscribed.clear();
			this.sync();
		};
		ws.onmessage = (e) => {
			let txt;
			try {
				txt = typeof e.data === "string" ? e.data : gunzipSync(Buffer.from(e.data)).toString();
			} catch {
				return;
			}
			if (txt === "Ping") {
				ws.send("Pong");
				return;
			}
			const m = /"s":"([A-Z0-9-]+)","c":"([0-9.]+)"/.exec(txt);
			if (m) {
				this.prices.set(m[1], {
					px: Number(m[2]),
					at: Date.now()
				});
				this.recent.push(Date.now());
				if (this.recent.length > 2e4) this.recent.splice(0, 1e4);
			}
		};
		ws.onerror = (e) => {
			this.lastError = e.message ?? "stream error";
		};
		ws.onclose = () => {
			if (this.ws === ws) this.ws = null;
			this.subscribed.clear();
			if (!this.closed) this.scheduleReconnect();
		};
	}
	fail(err) {
		this.lastError = err instanceof Error ? err.message : String(err);
		this.scheduleReconnect();
	}
	scheduleReconnect() {
		if (this.retry || this.closed) return;
		this.reconnects++;
		const ms = this.backoff;
		this.backoff = Math.min(6e4, this.backoff * 2);
		this.retry = setTimeout(() => {
			this.retry = null;
			this.connect();
		}, ms);
		this.retry.unref?.();
	}
	/** Subscribe what is wanted, unsubscribe what is not. */
	sync() {
		const ws = this.ws;
		if (!ws || ws.readyState !== 1) return;
		for (const s of this.want) if (!this.subscribed.has(s)) {
			ws.send(JSON.stringify({
				id: String(++this.seq),
				reqType: "sub",
				dataType: `${s}@lastPrice`
			}));
			this.subscribed.add(s);
		}
		for (const s of [...this.subscribed]) if (!this.want.has(s)) {
			ws.send(JSON.stringify({
				id: String(++this.seq),
				reqType: "unsub",
				dataType: `${s}@lastPrice`
			}));
			this.subscribed.delete(s);
			this.prices.delete(s);
		}
	}
};
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
	const st = inp.stages;
	if (st) {
		const tapePairs = /* @__PURE__ */ new Set();
		for (const t of inp.tapes) tapePairs.add(`${t.bot}|${t.ind}`);
		if (st.mainTop <= 0) {
			const missing = [...st.passed].filter((k) => !tapePairs.has(k));
			add("stages: every validated pair has config sets", missing.length === 0, `${st.passed.size - missing.length} / ${st.passed.size}${missing.length ? ` · missing ${missing.slice(0, 3).join(", ")}` : ""}`);
		}
		const stray = [...st.main].filter((k) => !st.passed.has(k) && !st.held.has(k));
		add("stages: Main ⊆ Base-validated ∪ held", stray.length === 0, `${st.main.size} Main · ${stray.length} stray${stray.length ? ` (${stray.slice(0, 3).join(", ")})` : ""}`);
		if (inp.sim) {
			let badEngine = 0;
			let badSignal = 0;
			const steps = inp.sim.signalSteps;
			const activeAt = (t) => steps ? signalSetAt(steps, t) ?? /* @__PURE__ */ new Set() : st.signalActive;
			for (const x of inp.sim.trades) {
				const [bot, ind] = x.cfg.split("|");
				const pair = `${bot}|${ind}`;
				if (sigCfg(x.cfg)) {
					const act = activeAt(x.entryT);
					if (act && !act.has(`${pair}|${x.sym}`)) badSignal++;
				} else if (!st.main.has(pair)) badEngine++;
			}
			add("stages: engine trades come from Main config sets", badEngine === 0, `${badEngine} outside Main`);
			add("stages: signal trades come from active signals", badSignal === 0, `${badSignal} from an inactive signal × symbol`);
			let badPick = 0;
			for (const step of inp.sim.steps) for (const id of step.real) if (!byId.has(id)) badPick++;
			add("stages: Real picks are Main tapes", badPick === 0, `${badPick} picks without a tape`);
		}
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
		const guard = new SignalGuard();
		let ei = 0;
		let denied = 0;
		let volMismatch = 0;
		let levelMismatch = 0;
		let checked = 0;
		const firstBad = [];
		for (const x of order) {
			while (ei < exits.length && exits[ei].exitT <= x.entryT) feedBooks(exits[ei++], book, guard);
			const tp = byId.get(x.cfg);
			if (!tp) continue;
			checked++;
			const oAt = sim.signalSteps ? {
				...o,
				signalActive: signalSetAt(sim.signalSteps, x.entryT) ?? /* @__PURE__ */ new Set()
			} : o;
			const d = execDecision(tp, x.entryT, oAt, {
				book,
				guard,
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
		let symOver = 0;
		let sideOver = 0;
		let dupes = 0;
		const peak = [0, 0];
		const openN = [0, 0];
		const perSym = [/* @__PURE__ */ new Map(), /* @__PURE__ */ new Map()];
		const perSide = [/* @__PURE__ */ new Map(), /* @__PURE__ */ new Map()];
		const live = /* @__PURE__ */ new Set();
		for (const [, k, x] of ev) {
			const key = `${x.cfg}|${x.sym}`;
			const c = sigCfg(x.cfg) ? 1 : 0;
			const caps = capsOf(o, c === 1);
			if (k === 1) {
				if (live.has(key)) dupes++;
				live.add(key);
				openN[c]++;
				peak[c] = Math.max(peak[c], openN[c]);
				const s = (perSym[c].get(x.sym) ?? 0) + 1;
				perSym[c].set(x.sym, s);
				if (s > caps.perSymbol) symOver++;
				const d = (perSide[c].get(x.side) ?? 0) + 1;
				perSide[c].set(x.side, d);
				if (d > caps.perSide) sideOver++;
			} else {
				live.delete(key);
				openN[c]--;
				perSym[c].set(x.sym, (perSym[c].get(x.sym) ?? 1) - 1);
				perSide[c].set(x.side, (perSide[c].get(x.side) ?? 1) - 1);
			}
		}
		const capE = capsOf(o, false).maxOpen;
		const capS = capsOf(o, true).maxOpen;
		const lim = (x) => Number.isFinite(x) ? String(x) : "no limit";
		add("caps: max open", peak[0] <= capE && peak[1] <= capS, `peak ${peak[0]} / ${lim(capE)}${peak[1] ? ` · signals ${peak[1]} / ${lim(capS)}` : ""}`);
		add("caps: per symbol / per side", symOver + sideOver === 0, `symbol over ${symOver} · side over ${sideOver}`);
		add("caps: no duplicate config × symbol open at once", dupes === 0, `${dupes}`);
		if (o.maxPositions) {
			const evp = [];
			for (const x of trades) evp.push([
				x.entryT,
				1,
				`${x.sym}|${x.side}`
			], [
				x.exitT,
				-1,
				`${x.sym}|${x.side}`
			]);
			evp.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
			const per = /* @__PURE__ */ new Map();
			let posNow = 0;
			let posPeak = 0;
			for (const [, d, k] of evp) {
				const c = (per.get(k) ?? 0) + d;
				if (d > 0 && c === 1) posNow++;
				if (d < 0 && c === 0) posNow--;
				per.set(k, c);
				posPeak = Math.max(posPeak, posNow);
			}
			add("caps: max positions (symbol × direction)", posPeak <= o.maxPositions, `peak ${posPeak} / ${o.maxPositions}`);
		}
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
		const sized = sizeBook(p.trades, p.positions, p.sizing);
		const eq = (p.carried ?? 0) + sized.pnl + p.positions.reduce((a, x) => a + x.mtm * (x.vol ?? 1) * (sized.units.get(orderKey(x)) ?? p.sizing.fixedNotional), 0);
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
			this.flushState();
		}, 1e3);
		this.stateTimer.unref?.();
	}
	/** Write the durable keys now (shutdown: a pending debounced write would be lost). */
	flushState() {
		if (this.stateTimer) {
			clearTimeout(this.stateTimer);
			this.stateTimer = null;
		}
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
				for (const t of TABLES) {
					if (!this.get("SELECT COUNT(*) AS n FROM snap.sqlite_master WHERE type='table' AND name = ?", t)?.n) continue;
					if (t === "kv") this.db.prepare(`INSERT OR REPLACE INTO main.kv SELECT * FROM snap.kv WHERE k NOT IN (SELECT value FROM json_each(?)) OR k NOT IN (SELECT k FROM main.kv)`).run(JSON.stringify([...DURABLE_KEYS]));
					else this.db.exec(`INSERT OR REPLACE INTO main.${t} SELECT * FROM snap.${t}`);
				}
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
	"liveCost",
	"hostSettingsApplied"
]);
function coreDb() {
	const env = (process.env.CTS_CORE_STATE ?? "").trim();
	const statePath = env === "off" ? null : env || join(process.cwd(), ".cts-core", "state.json");
	if (!G$1.__ctsCoreDb) G$1.__ctsCoreDb = new CoreDb(":memory:", { statePath });
	else if (!upgraded) upgradeShared(G$1.__ctsCoreDb, statePath);
	upgraded = true;
	return G$1.__ctsCoreDb;
}
var upgraded = false;
/**
* A hot-reloaded server module finds the database created by an older module version: give it this version's
* methods and create the tables added since (the schema is idempotent). Without this a new table is missing
* until a restart and every cycle that touches it fails.
*/
function upgradeShared(db, statePath = null) {
	if (Object.getPrototypeOf(db) !== CoreDb.prototype) Object.setPrototypeOf(db, CoreDb.prototype);
	const d = db;
	if (!d.statePath && statePath) {
		d.statePath = statePath;
		db.flushState();
	}
	db.db?.exec(SCHEMA);
	db.stmts?.clear();
}
var H = 36e5;
var SLICE_MS = 12;
var BACKTEST_LIMIT_MS = 9e5;
var blankTick = () => ({
	at: 0,
	ms: 0,
	count: 0,
	open: 0,
	stream: null,
	error: null
});
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
	/** the paper book was stepped at least once since start */
	paperStepped = false;
	lastTrim = 0;
	/** live prices (public WebSocket) for the tick; null for the synthetic test market */
	stream = null;
	tickTimer = null;
	ticking = false;
	liveStartedAt = 0;
	liveSlowNoted = false;
	liveBusy = false;
	streamKey = "";
	lastMtmWrite = 0;
	/** last klines request per symbol (a bar the exchange has not published yet is not re-asked every cycle) */
	klinesAt = /* @__PURE__ */ new Map();
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
		const savedWf = migrateWfCaps(db);
		const saved = db.kvGet("settings");
		if (saved && saved.tickMs === void 0 && (saved.cycleMs ?? 0) >= 5e3) {
			saved.cycleMs = DEFAULT_SETTINGS.cycleMs;
			saved.tickMs = DEFAULT_SETTINGS.tickMs;
		}
		this.settings = mergeSettings(DEFAULT_SETTINGS, saved, settings);
		this.settings.gates.minPf = Math.min(1.5, Math.max(1.05, this.settings.gates.minPf));
		this.settings.gates.maxDdtH = Math.min(20, Math.max(2, this.settings.gates.maxDdtH));
		this.wf = {
			...defaultWalkForward(this.settings),
			...pickWf(savedWf)
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
	/** last REST ticker request (the fallback runs at most every 2 s) */
	restTickersAt = 0;
	async freshTickers() {
		const st = this.stream;
		if (st && this.tickers.length) {
			const live = this.tickers.map((t) => ({
				...t,
				last: st.price(t.sym, 5e3) ?? NaN
			}));
			if (live.every((t) => Number.isFinite(t.last))) {
				this.tickersAt = Date.now();
				return live;
			}
			if (Date.now() - this.restTickersAt < 2e3) return this.tickers.map((t) => ({
				...t,
				last: st.price(t.sym, 5e3) ?? t.last
			}));
		} else if (Date.now() - this.restTickersAt < 2e3) return this.tickers;
		this.restTickersAt = Date.now();
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
		this.startTick();
	}
	/** The tick: every tickMs, open paper positions marked to market and the live step (never overlapping). */
	startTick() {
		if (this.tickTimer) return;
		if (!this.stream && this.market === "bingx") this.stream = new PriceStream();
		const loop = () => {
			this.tickTimer = setTimeout(() => {
				this.tick().catch((err) => {
					this.status.tick = {
						...this.status.tick ?? blankTick(),
						error: err instanceof Error ? err.message : String(err)
					};
				}).finally(() => {
					if (this.tickTimer && !this.stopped) loop();
				});
			}, Math.max(20, this.settings.tickMs ?? 100));
			this.tickTimer.unref?.();
		};
		loop();
	}
	stopTick() {
		if (this.tickTimer) clearTimeout(this.tickTimer);
		this.tickTimer = null;
		this.stream?.stop();
		this.streamKey = "";
	}
	async tick() {
		if (this.ticking || this.stopped) return;
		this.ticking = true;
		const t0 = performance.now();
		try {
			const syms = this.status.symbols;
			const key = syms.join(",");
			if (this.stream && key && key !== this.streamKey) {
				this.streamKey = key;
				this.stream.follow(syms);
			}
			const cost = this.settings.cost;
			let open = 0;
			const units = this.paper.units;
			for (const p of this.paper.positions) {
				const px = this.stream?.price(p.sym) ?? this.candles.get(p.sym)?.at(-1)?.c;
				if (!px || !(p.entry > 0)) continue;
				p.mtm = p.side * (px - p.entry) / p.entry - cost;
				open += p.mtm * (p.vol ?? 1) * (units?.get(orderKey(p)) ?? this.settings.paperNotional);
			}
			let closed = 0;
			for (const t of this.paper.trades) closed += t.r * (units?.get(orderKey(t)) ?? this.settings.paperNotional);
			this.paper.equity = (this.paper.carried ?? 0) + closed + open;
			this.paper.balance = this.settings.paperBalance + this.paper.equity;
			if (Date.now() - this.lastMtmWrite > 1e3 && this.paper.positions.length) {
				this.lastMtmWrite = Date.now();
				const db = this.db;
				db.tx(() => {
					for (const p of this.paper.positions) db.run("UPDATE paper_positions SET mtm = ?, at = ? WHERE cfg = ? AND sym = ? AND entry_t = ?", p.mtm, Date.now(), p.cfg, p.sym, p.entryT);
				});
			}
			if (!(this.dirty || this.resetUniverse) && this.paperStepped && this.onLive && this.settings.live.enabled && !this.liveBusy) {
				this.liveBusy = true;
				this.liveStartedAt = Date.now();
				const intents = this.pendingEntries();
				this.onLive(this, intents, this.gen).catch((err) => this.db.event("error", `live step failed: ${err instanceof Error ? err.message : err}`)).finally(() => {
					this.liveBusy = false;
					this.liveSlowNoted = false;
				});
			} else if (this.liveBusy && !this.liveSlowNoted && Date.now() - this.liveStartedAt > 6e4) {
				this.liveSlowNoted = true;
				this.db.event("warn", "live step in flight for over 60 s (exchange slow?) — no new step until it returns");
			}
			const st = this.stream?.stats() ?? null;
			const prev = this.status.tick ?? blankTick();
			this.status.tick = {
				at: Date.now(),
				ms: performance.now() - t0,
				count: prev.count + 1,
				open: this.paper.positions.length,
				stream: st,
				error: null
			};
		} finally {
			this.ticking = false;
		}
	}
	/** Stop now: the in-flight cycle is abandoned at its next yield (a new generation), nothing half-published. */
	stop() {
		this.stopTick();
		this.stopped = true;
		this.gen++;
		this.busy = false;
		this.dirty = true;
		if (this.timer) clearTimeout(this.timer);
		this.timer = null;
		this.status.state = "stopped";
		this.db.event("info", "runtime stopped");
	}
	/**
	* Process shutdown (service stop / update / reboot): stop the loop, then persist everything that would
	* otherwise wait for its interval — the durable settings / presets and the SQLite snapshot (stats, trades,
	* runs, evals). The next start restores both.
	*/
	shutdown(reason = "shutdown") {
		if (!this.stopped) this.stop();
		this.flushLive?.();
		this.db.event("info", `${reason}: state and snapshot saved`);
		let snapshot = false;
		if (this.snapshotPath) snapshot = this.db.snapshot(this.snapshotPath);
		this.db.flushState();
		return { snapshot };
	}
	/** Watchdog: if a cycle has not beaten for a long time, abandon it (new generation) and start fresh. */
	ensureAlive() {
		if (this.status.state === "idle") return this.start();
		if (this.stopped) return;
		const waitingBackoff = !this.busy && this.timer !== null && this.status.nextCycleAt > Date.now() - 6e4;
		const w = workerActivity();
		const onWorkers = this.busy && w.inFlight > 0 && Date.now() - w.at < 96e4;
		if (!waitingBackoff && !onWorkers && Date.now() - this.status.heartbeat > Math.max(18e4, this.settings.cycleMs * 8)) {
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
		if (typeof self.paperStepped !== "boolean") self.paperStepped = false;
		if (typeof self.lastTrim !== "number") self.lastTrim = 0;
		if (self.stream === void 0) self.stream = null;
		if (self.tickTimer === void 0) self.tickTimer = null;
		if (typeof self.ticking !== "boolean") self.ticking = false;
		if (typeof self.liveBusy !== "boolean") self.liveBusy = false;
		if (typeof self.liveStartedAt !== "number") self.liveStartedAt = 0;
		if (typeof self.liveSlowNoted !== "boolean") self.liveSlowNoted = false;
		if (typeof self.streamKey !== "string") self.streamKey = "";
		if (typeof self.lastMtmWrite !== "number") self.lastMtmWrite = 0;
		if (typeof self.restTickersAt !== "number") self.restTickersAt = 0;
		if (!(self.klinesAt instanceof Map)) self.klinesAt = /* @__PURE__ */ new Map();
		if (!this.stopped && this.status.state !== "idle" && !self.tickTimer) this.startTick();
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
		const carry = {
			signalActive: this.wf.signalActive,
			signalGuardN: this.wf.signalGuardN,
			signalCluster: this.wf.signalCluster,
			signalSourceGate: this.wf.signalSourceGate,
			signalPerSymbol: this.wf.signalPerSymbol,
			signalMaxOpen: this.wf.signalMaxOpen,
			paused: this.wf.paused
		};
		this.wf = {
			...defaultWalkForward(this.settings),
			...pickWf(this.wf),
			...sanitizeWf(wfPatch ?? {}),
			...carry,
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
	* (250 ms by default: a cycle with no closed bar does no exchange call and no stage) and never sooner than
	* 100 ms. The next cycle only starts after this one has finished (schedule is called from its end).
	* Open positions and the live step run on their own, faster tick (tickMs).
	*/
	nextInterval() {
		const tfMs = this.settings.tfMin * 6e4;
		const now = Date.now();
		const toClose = Math.ceil(now / tfMs) * tfMs + 2e3 - now;
		return Math.max(100, Math.min(this.settings.cycleMs, toClose));
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
			const computed = newBars || this.dirty;
			if (computed) await this.compute(gen);
			if (gen !== this.gen) return;
			if (!(this.dirty || this.resetUniverse) && (computed || !this.paperStepped)) {
				this.phase("Paper", () => this.stepPaper());
				this.phase("Adjust", () => this.runAdjust());
				this.phase("Audit", () => this.runAudit());
				this.paperStepped = true;
			}
			if (!this.stopped) this.status.state = "running";
			this.status.error = null;
			if (this.snapshotPath && Date.now() - this.lastSnapshot > 6e5) {
				this.lastSnapshot = Date.now();
				this.db.snapshot(this.snapshotPath);
			}
			if (Date.now() - this.lastTrim > 6e4) {
				this.lastTrim = Date.now();
				this.db.trim();
			}
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
		const due = [...this.candles.entries()].filter(([sym, cs]) => {
			const last = cs[cs.length - 1]?.t ?? 0;
			return last + 2 * tfMs <= now && now - last <= 300 * tfMs && now - (this.klinesAt.get(sym) ?? 0) >= 1e3;
		});
		for (const [sym] of due) this.klinesAt.set(sym, now);
		await mapLimit(due, 6, async ([sym, cs]) => {
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
		for (let i = 0; i < rows.length; i += 1e3) {
			if (i > 0) await yieldNow();
			const part = rows.slice(i, i + 1e3);
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
		let slowest = "";
		let stepT = t0;
		let maxStep = 0;
		const label = (v) => {
			const x = v;
			return x && typeof x === "object" ? `${x.stage ?? ""} ${x.label ?? ""}`.trim() : "";
		};
		for (;;) {
			const r = gen.next();
			const now = performance.now();
			if (now - stepT > maxStep) {
				maxStep = now - stepT;
				slowest = r.done ? "finish" : label(r.value);
			}
			stepT = now;
			if (r.done) {
				maxSlice = Math.max(maxSlice, now - slice);
				this.status.phases[name] = {
					ms: now - t0,
					maxSliceMs: maxSlice,
					slowest: `${slowest} (${Math.round(maxStep)} ms)`
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
				stepT = slice;
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
		let pre;
		const sharedU = workersAvailable() && !this.workersBroken ? shareBars(u.bars) : u.bars;
		this.status.workers = !workersAvailable() ? "unavailable (in-process)" : this.workersBroken ? "failed earlier (in-process)" : `${poolSize()} cores`;
		if (workersAvailable() && !this.workersBroken) {
			const combos = [...allCombos(s.focus, s.disabledKinds, s.tfs), ...signalCombos(signalSettings(s.signals), s.tfs)];
			const n = poolSize();
			const parts = Array.from({ length: n * 2 }, () => []);
			combos.forEach((c, i) => parts[i % parts.length].push(c));
			this.setStage("Base", 0, combos.length, `Base on ${n} cores · ${combos.length} combos`);
			const tb = performance.now();
			try {
				const res = await runOnWorkers(parts.filter((p) => p.length).map((c) => ({
					type: "s1",
					bars: sharedU,
					combos: c,
					cost: s.cost,
					tactics: s.tactics
				})), n);
				if (gen !== this.gen) return;
				if (!res.every((r) => Array.isArray(r?.runsJson))) throw new Error("unexpected Base worker reply (module version mismatch?)");
				const s1 = [];
				for (const r of res) for (const chunk of r.runsJson) {
					for (const x of JSON.parse(chunk)) s1.push(x);
					await yieldNow();
					if (gen !== this.gen) return;
				}
				pre = { s1 };
				this.status.phases["Base (workers)"] = {
					ms: performance.now() - tb,
					maxSliceMs: 0,
					slowest: `${combos.length} combos on ${n} cores`
				};
			} catch (err) {
				if (gen !== this.gen) return;
				this.workersBroken = true;
				this.db.event("warn", `Base workers unavailable (${err instanceof Error ? err.message : err}) — computing in-process`);
			}
		}
		const pipeline = await this.drive("Pipeline", runPipeline(u, s, pre), (p) => this.setStage(stageName[p.stage] ?? p.stage, p.done, p.total, p.label), gen);
		await this.persistPipeline(pipeline, gen);
		this.pipeline = pipeline;
		this.lastUniverse = u;
		const tailOf = (tf) => Math.round((24 + Math.max(wf.preH, wf.longH) + wf.simH) * 60 / tf) + tacticWarmupBars(s.tactics);
		const wu = makeUniverse(allBars.map((b) => tailBars(b, tailOf(b.tfMin))));
		const main = /* @__PURE__ */ new Set();
		const passed = pipeline.s1.filter((r) => !isSignalInd(r.ind) && passesBase(r.full, s.gates));
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
		const held = /* @__PURE__ */ new Set();
		for (const id of this.paper.selected) held.add(id.split("|").slice(0, 2).join("|"));
		for (const p of this.paper.positions) held.add(p.cfg.split("|").slice(0, 2).join("|"));
		for (const k of held) main.add(k);
		const sig = signalSettings(s.signals);
		let sigActive = sig.enabled ? activeSignals(pipeline.s1, sig) : /* @__PURE__ */ new Set();
		const sigPairs = sig.enabled ? signalCandidates(pipeline.s1, sig.minTrades) : /* @__PURE__ */ new Set();
		for (const k of [...main]) if (isSignalInd(k.split("|")[1] ?? "")) {
			main.delete(k);
			if (sig.enabled) sigPairs.add(k);
		}
		this.status.mainPairs = main.size;
		this.status.signals = {
			enabled: sig.enabled,
			combos: pipeline.s1.filter((r) => isSignalInd(r.ind)).length,
			active: sigActive.size,
			pairs: sigPairs.size,
			configs: sigPairs.size * signalProtects(sig).length
		};
		const dcaOpt = {
			protects: wf.dcaProtects,
			dca: wf.dca,
			axis: s.axis
		};
		const adjustNow = s.adjust?.enabled ? this.adjustState() : null;
		const tapesFor = async (pairs, protects, dcaFor, what) => {
			let workerTapes = null;
			if (workersAvailable() && !this.workersBroken && pairs.size) {
				const n = poolSize();
				const sharedWu = shareBars(wu.bars);
				const order = [...pairs];
				const parts = Array.from({ length: n * 2 }, () => []);
				order.forEach((k, i) => parts[i % parts.length].push(k));
				this.setStage("Base", 0, order.length, `${what} on ${n} cores`);
				const tt = performance.now();
				try {
					const res = await runOnWorkers(parts.filter((p) => p.length).map((pp) => ({
						type: "tapes",
						bars: sharedWu,
						pairs: pp,
						protects,
						cost: s.cost,
						dcaOpt: dcaFor,
						tactics: s.tactics,
						adjust: adjustNow
					})), n);
					if (gen !== this.gen) return null;
					const rank = new Map(order.map((k, i) => [k, i]));
					workerTapes = res.flatMap((r) => r.tapes).map((t, i) => ({
						t,
						i
					})).sort((a, b) => (rank.get(`${a.t.bot}|${a.t.ind}`) ?? 0) - (rank.get(`${b.t.bot}|${b.t.ind}`) ?? 0) || a.i - b.i).map((x) => x.t);
					this.status.phases[what === "strategy tapes" ? "Tapes" : "Signal tapes"] = {
						ms: performance.now() - tt,
						maxSliceMs: 0,
						slowest: `${n} cores`
					};
				} catch (err) {
					if (gen !== this.gen) return null;
					this.workersBroken = true;
					this.db.event("warn", `Tape workers unavailable (${err instanceof Error ? err.message : err}) — computing in-process`);
				}
			}
			if (workerTapes) return workerTapes;
			if (!pairs.size) return [];
			return await this.drive("Tapes", buildTapesGen(wu, protects, s.cost, dcaFor, pairs, s.tactics, adjustNow), (p) => this.setStage("Base", p.done, p.total, what === "strategy tapes" ? "strategy tapes (normal · trailing · DCA · DCA Active)" : what), gen);
		};
		const mainTapes = await tapesFor(main, wf.protects, dcaOpt, "strategy tapes");
		if (!mainTapes || gen !== this.gen) return;
		const sigTapes = sigPairs.size ? await tapesFor(sigPairs, signalProtects(sig), void 0, "signal tapes") : [];
		if (!sigTapes || gen !== this.gen) return;
		const tapes = [...mainTapes, ...sigTapes];
		wf.signalRank = sig.enabled ? sig : void 0;
		wf.signalActive = sig.enabled ? sigActive : void 0;
		wf.signalGuardN = sig.enabled && sig.guard.enabled ? sig.guard.lastN : 0;
		wf.signalCluster = sig.enabled ? sig.cluster : void 0;
		wf.signalSourceGate = sig.enabled ? sig.sourceGate : void 0;
		wf.signalPerSymbol = sig.perSymbol;
		wf.signalMaxOpen = sig.maxOpen;
		this.wf.signalActive = wf.signalActive;
		this.wf.paused = wf.paused;
		this.wf.signalGuardN = wf.signalGuardN;
		this.wf.signalCluster = wf.signalCluster;
		this.wf.signalSourceGate = wf.signalSourceGate;
		this.wf.signalPerSymbol = wf.signalPerSymbol;
		this.wf.signalMaxOpen = wf.signalMaxOpen;
		let step = 0;
		const steps = Math.max(1, Math.ceil(wf.simH / Math.max(wf.stepH, s.tfMin / 60)));
		const sim = await this.drive("Simulation", walkForwardGen(wu, tapes, wf), (v) => {
			if (v >= 0) this.setStage("Real", ++step, steps, `${wf.simH}h simulated run, ${wf.preH}h pre-calc`);
		}, gen);
		this.tapes = tapes;
		this.sim = sim;
		if (sig.enabled && sim.signalActiveEnd) {
			sigActive = new Set(sim.signalActiveEnd);
			this.wf.signalActive = sigActive;
			if (this.status.signals) this.status.signals.active = sigActive.size;
		}
		this.stageSets = {
			passed: new Set(passed.map((r) => `${r.bot}|${r.ind}`)),
			main: new Set(main),
			held,
			mainTop: s.mainTop,
			signalActive: wf.signalActive
		};
		if (this.status.signals && sig.enabled) {
			const g = new SignalGuard();
			for (const e of sim.feed ?? []) feedBooks(e, null, g);
			const xs = sim.trades.filter((x) => isSignalInd(x.cfg.split("|")[1] ?? ""));
			const st = statsOf(xs);
			Object.assign(this.status.signals, {
				disabled: sig.guard.enabled ? g.disabledKeys(sig.guard.lastN).length : 0,
				trades: xs.length,
				pf: st.pf,
				net: st.net
			});
		}
		this.persistSim(sim);
		this.autoPreset(s, wf, sim);
		this.updatePrehist(u.bars.map((b) => b.sym), pipeline, tapes, sim, wf);
		const presets = {};
		const names = Object.keys(STRATEGY_PRESETS);
		const tc = performance.now();
		let maxSlice = 0;
		let viaWorkers = false;
		if (workersAvailable() && !this.workersBroken) {
			const packed = packTapes(tapes);
			const n = poolSize();
			const parts = Array.from({ length: n }, () => []);
			names.forEach((nm, i) => parts[i % n].push(nm));
			this.setStage("Compare", 0, names.length, `${names.length} presets on ${n} cores`);
			try {
				const res = await runOnWorkers(parts.filter((p) => p.length).map((pp) => ({
					type: "compare",
					nowT: wu.nowT,
					baseTf: wu.baseTf,
					packed,
					wf,
					presets: pp.map((name) => ({
						name,
						toggles: STRATEGY_PRESETS[name].toggles
					}))
				})), n);
				if (gen !== this.gen) return;
				for (const x of res.flatMap((r) => r.results)) {
					const { name, ...rest } = x;
					presets[name] = {
						label: STRATEGY_PRESETS[name].label,
						toggles: STRATEGY_PRESETS[name].toggles,
						...rest
					};
				}
				viaWorkers = true;
			} catch (err) {
				if (gen !== this.gen) return;
				this.workersBroken = true;
				this.db.event("warn", `Compare workers unavailable (${err instanceof Error ? err.message : err}) — computing in-process`);
			}
		}
		for (let i = 0; i < (viaWorkers ? 0 : names.length); i++) {
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
					typeof r.bySym === "string" ? r.bySym : JSON.stringify(r.bySym),
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
					(() => {
						const b = o.runs.get(r.id)?.bySym ?? {};
						return typeof b === "string" ? b : JSON.stringify(b);
					})(),
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
			main = new Set(scores.sort((a, b) => b.score - a.score).slice(0, s.mainTop > 0 ? s.mainTop : void 0).map((x) => x.pair));
		}
		job.stage = "Tapes";
		const dcaOpt = {
			protects: wf.dcaProtects,
			dca: wf.dca,
			axis: s.axis
		};
		const adjust = s.adjust?.enabled ? this.adjustState() : null;
		let tapes = [];
		const pairs = combos.map((c) => `${c.bot}|${c.ind}`).filter((x) => main.has(x));
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
		const sig = signalSettings(s.signals);
		const sigCombos = signalCombos(sig, s.tfs);
		let sigActive;
		if (sigCombos.length) {
			const look = makeUniverse(bars.map((b) => {
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
			}));
			const runs = [];
			const self = this;
			function* sigBase() {
				for (let i = 0; i < sigCombos.length; i++) {
					const c = sigCombos[i];
					const r = runCombo(look, c.bot, c.ind, DEFAULT_PROTECT, s.cost, 1, s.tactics);
					if (r) runs.push(r);
					forgetCombo(look, c.bot, c.ind);
					yield i;
				}
			}
			await self.sliced(sigBase(), () => void 0);
			sigActive = activeSignals(runs, sig);
			const sigPairs = signalCandidates(runs, sig.minTrades);
			if (sigPairs.size) tapes = tapes.concat(await this.sliced(buildTapesGen(u, signalProtects(sig), s.cost, void 0, sigPairs, s.tactics, adjust), () => void 0));
		}
		job.stage = "Simulation";
		const sim = await this.sliced(walkForwardGen(u, tapes, {
			...wf,
			startT,
			simH: days * 24,
			signalActive: sigActive,
			signalRank: sigActive ? sig : void 0,
			signalGuardN: sigActive && sig.guard.enabled ? sig.guard.lastN : 0,
			signalCluster: sigActive ? sig.cluster : void 0,
			signalSourceGate: sigActive ? sig.sourceGate : void 0,
			signalPerSymbol: sig.perSymbol,
			signalMaxOpen: sig.maxOpen
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
	/** the universe of the last finished compute (detail pages recompute trades on exactly this) */
	/** Block / guard books for the live step: a cursor over the current run's feed (advanced, never replayed) */
	liveBooks = null;
	tapeIdx = null;
	/** Tapes by config id (rebuilt when the tape list changes). */
	tapeIndex() {
		if (this.tapeIdx?.tapes !== this.tapes) this.tapeIdx = {
			tapes: this.tapes,
			byId: new Map(this.tapes.map((t) => [t.id, t]))
		};
		return this.tapeIdx.byId;
	}
	/** set by the live step: persists its in-memory state (called on shutdown) */
	flushLive;
	/** stage sets of the last compute (self-audit) */
	stageSets = void 0;
	/** the universe of the last compute (comboTrades, research tools) */
	lastUniverse = null;
	/**
	* Closed trades of one config computed on demand from the current candles (Base configs keep only their
	* stats; tapes exist for Main sets). Plain configs only (DCA / Axis come from tapes). Null if unknown.
	*/
	comboTrades(id) {
		const c = parseConfigId(id);
		if (!c || kindOfId(id) !== "normal" && kindOfId(id) !== "trailing") return null;
		if (!this.lastUniverse) return null;
		this.detailU = {
			key: "last",
			u: this.lastUniverse
		};
		const g = this.settings.grid;
		const protect = c.protect.trail > 0 ? {
			...c.protect,
			trailStep: g.trailStep ?? 1,
			trailFree: g.trailFree ?? false
		} : c.protect;
		const r = runCombo(this.detailU.u, c.bot, c.ind, protect, this.settings.cost, 1, this.settings.tactics, true);
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
			stages: this.stageSets,
			paper: {
				...this.paper,
				sizing: {
					...this.paperSizing(),
					balance: this.paperSizing().balance + (this.paper.carried ?? 0)
				},
				carried: this.paper.carried ?? 0
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
		const { engine: selTapes, signal: sigTapes } = splitSignalTapes(this.tapes, this.wf);
		const { picks, eligible } = this.wf.mode === "durable" ? selectDurable(selTapes, t, this.wf, held) : this.wf.mode === "fixed" ? selectFixed(selTapes, t, this.wf) : selectAt(selTapes, t, this.wf);
		const sel = /* @__PURE__ */ new Set([...picks.map((p) => p.id), ...sigTapes.map((tp) => tp.id)]);
		const holding = new Set(this.paper.positions.map((p) => p.cfg));
		const byId = this.tapeIndex();
		const keep = new Set(sel);
		for (const id of holding) {
			const tp = byId.get(id);
			if (tp && tp.open.some((o) => o.cfg === id)) keep.add(id);
		}
		const positions = [];
		const perSym = /* @__PURE__ */ new Map();
		const perSide = /* @__PURE__ */ new Map();
		const openBy = /* @__PURE__ */ new Map();
		const openPos = /* @__PURE__ */ new Set();
		const prevByKey = new Map(this.paper.positions.map((p) => [`${p.cfg}|${p.sym}|${p.entryT}`, p]));
		const cands = [];
		for (const id of keep) {
			const tp = byId.get(id);
			if (!tp) continue;
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
		const prio = bestFirst(picks, this.wf);
		cands.sort((a, b) => Number(b.held) - Number(a.held) || a.op.entryT - b.op.entryT || prio(a.tp, a.op.sym) - prio(b.tp, b.op.sym) || (a.op.cfg < b.op.cfg ? -1 : a.op.cfg > b.op.cfg ? 1 : 0) || (a.op.sym < b.op.sym ? -1 : a.op.sym > b.op.sym ? 1 : 0));
		const booksAt = this.booksAt();
		const closedBy = [...this.sim.trades].sort((a, b) => a.exitT - b.exitT);
		const srcClosed = /* @__PURE__ */ new Map();
		for (const x of closedBy) if (sigCfg(x.cfg)) {
			const src = signalSourceOf(x.cfg.split("|")[1] ?? "");
			let l = srcClosed.get(src);
			if (!l) srcClosed.set(src, l = []);
			l.push({
				exitT: x.exitT,
				r: x.r
			});
		}
		const hourNet = /* @__PURE__ */ new Map();
		let ci = 0;
		for (const { tp, op, held } of cands) {
			if (!held) {
				while (ci < closedBy.length && closedBy[ci].exitT <= op.entryT) {
					const x = closedBy[ci++];
					const k = Math.floor(x.exitT / H);
					hourNet.set(k, (hourNet.get(k) ?? 0) + x.r * 100);
				}
				if (this.wf.guardPct > 0 && (hourNet.get(Math.floor(op.entryT / H)) ?? 0) <= -this.wf.guardPct) continue;
				if (coordBlock(this.wf.coord, {
					cfg: op.cfg,
					sym: op.sym,
					side: op.side,
					entryT: op.entryT
				}, hourNet, positions)) continue;
				const sg = this.wf.signalSourceGate;
				if (sg?.enabled && sigCfg(op.cfg)) {
					const src = signalSourceOf(op.cfg.split("|")[1] ?? "");
					if (sourceUnstable(srcClosed.get(src), op.entryT, sg)) continue;
				}
			}
			const prev = prevByKey.get(`${op.cfg}|${op.sym}|${op.entryT}`);
			const d = held ? {
				ok: true,
				vol: prev?.vol ?? 1,
				level: prev?.level ?? 0
			} : execDecision(tp, op.entryT, this.wf, {
				...booksAt(op.entryT),
				sym: op.sym,
				side: op.side
			});
			if (!d.ok) continue;
			const cls = sigCfg(op.cfg) ? "s" : "e";
			const caps = capsOf(this.wf, cls === "s");
			const c = perSym.get(`${cls}|${op.sym}`) ?? 0;
			const sd = perSide.get(`${cls}|${op.side}`) ?? 0;
			const posKey = `${op.sym}|${op.side}`;
			if (!held && (c >= caps.perSymbol || sd >= caps.perSide || (openBy.get(cls) ?? 0) >= caps.maxOpen || this.wf.maxPositions && !openPos.has(posKey) && openPos.size >= this.wf.maxPositions)) continue;
			openPos.add(posKey);
			perSym.set(`${cls}|${op.sym}`, c + 1);
			perSide.set(`${cls}|${op.side}`, sd + 1);
			openBy.set(cls, (openBy.get(cls) ?? 0) + 1);
			positions.push({
				...op,
				vol: d.vol,
				level: d.level
			});
		}
		const since = this.paper.startedAt - this.wf.simH * H;
		const trades = this.sim.trades.filter((t) => t.exitT >= since);
		let cut = since;
		for (const t of trades) if (t.entryT < cut) cut = t.entryT;
		for (const p of positions) if (p.entryT < cut) cut = p.entryT;
		const carried = this.db.get("SELECT SUM(pnl) AS s FROM paper_trades WHERE exit_t < ?", cut)?.s ?? 0;
		const sizing = this.paperSizing();
		const sized = sizeBook(trades, positions, {
			...sizing,
			balance: sizing.balance + carried
		});
		const unitOf = (x) => sized.units.get(orderKey(x)) ?? this.settings.paperNotional;
		const db = this.db;
		db.tx(() => {
			db.run("DELETE FROM paper_positions");
			for (const p of positions) db.run("INSERT OR REPLACE INTO paper_positions (cfg, sym, side, entry_t, entry, stop, target, mtm, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", p.cfg, p.sym, p.side, p.entryT, p.entry, p.stop, p.target, p.mtm, Date.now());
			for (const t of trades) db.run("INSERT INTO paper_trades (cfg, sym, side, entry_t, exit_t, entry, exit, r, pnl, reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT (cfg, sym, entry_t) DO UPDATE SET pnl = excluded.pnl", t.cfg, t.sym, t.side, t.entryT, t.exitT, t.entry, t.exit, t.r, t.r * unitOf(t), t.reason);
		});
		this.paper = {
			selected: [...sel],
			eligible,
			positions,
			trades,
			equity: carried + sized.pnl + positions.reduce((a, p) => a + p.mtm * (p.vol ?? 1) * unitOf(p), 0),
			balance: 0,
			units: sized.units,
			carried,
			startedAt: this.paper.startedAt
		};
		this.paper.balance = this.settings.paperBalance + this.paper.equity;
	}
	/** Paper sizing: starting balance, fixed % of equity (or fixed notional) per order unit. */
	paperSizing() {
		return {
			balance: this.settings.paperBalance,
			sizing: sizingSettings(this.settings.sizing),
			fixedNotional: this.settings.paperNotional
		};
	}
	/**
	* Block book over the simulation's Real candidates (the Block feed), advanced causally: call with non-decreasing entry times;
	* each call returns the book holding every position that closed at or before that time. Null when only the
	* config-set source is enabled (nothing else to judge).
	*/
	booksAt() {
		const src = this.wf.block.sources ?? {};
		const wantBook = this.wf.toggles.block && !!(src.overall || src.symbol || src.direction || src.indication || src.type);
		const wantGuard = !!this.wf.signalGuardN || !!this.wf.signalCluster?.enabled;
		if (!wantBook && !wantGuard) return () => ({
			book: null,
			guard: null
		});
		const feed = this.sim?.feed ?? [];
		const book = new BlockBook();
		const guard = new SignalGuard();
		let i = 0;
		return (t) => {
			while (i < feed.length && feed[i].exitT <= t) feedBooks(feed[i++], book, guard);
			return {
				book: wantBook ? book : null,
				guard: wantGuard ? guard : null
			};
		};
	}
	/**
	* Entries due NOW: signals of the selected configs on the newest closed bar (they enter at the next open).
	* These are what the live adapter may mirror.
	*/
	pendingEntries() {
		const out = [];
		const entryT = this.status.lastBarT + this.settings.tfMin * 6e4;
		if (!this.liveBooks || this.liveBooks.sim !== this.sim || entryT < this.liveBooks.t) this.liveBooks = {
			sim: this.sim,
			t: entryT,
			at: this.booksAt()
		};
		this.liveBooks.t = entryT;
		const books = this.liveBooks.at(entryT);
		const byId = this.tapeIndex();
		for (const id of this.paper.selected) {
			const tp = byId.get(id);
			if (!tp) continue;
			for (const p of tp.pending) {
				if (!execDecision(tp, entryT, this.wf, {
					...books,
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
	"maxPositions",
	"guardPct",
	"coord",
	"longH",
	"robustFrac",
	"rank",
	"bots",
	"preGate",
	"familySeats",
	"familyNeedsBase",
	"bestFirst",
	"laneSeats",
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
	num("maxPositions", 0, 1e4, true);
	num("simH", 6, 240);
	num("stepH", 1 / 60, 48);
	num("portfolio", 0, 1e4, true);
	num("lastN", 0, 200, true);
	num("lastNMinPf", 0, 5);
	num("maxPerSymbol", 0, 1e3, true);
	num("maxPerSide", 0, 1e4, true);
	num("maxOpen", 0, 1e5, true);
	num("guardPct", 0, 100);
	if (p.coord !== void 0) p.coord = coordSettings(p.coord);
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
	if (p.familySeats !== void 0) p.familySeats = Boolean(p.familySeats);
	if (p.familyNeedsBase !== void 0) p.familyNeedsBase = Boolean(p.familyNeedsBase);
	if (p.bestFirst !== void 0) p.bestFirst = Boolean(p.bestFirst);
	num("laneSeats", 0, 40, true);
	if (p.bots !== void 0) p.bots = Array.isArray(p.bots) ? p.bots.map(String).slice(0, 20) : [];
	return p;
}
/**
* Saved walk-forward options from before unlimited orders carry the old order caps (3 per symbol, 16 per side,
* 60 open): they are dropped once so every order works; caps chosen afterwards are kept.
*/
function migrateWfCaps(db) {
	const saved = db.kvGet("wf") ?? {};
	const v = db.kvGet("wfCapsV") ?? 0;
	if (v >= 8) return saved;
	const out = { ...saved };
	const st = db.kvGet("settings");
	const sig = st?.signals;
	if (v < 3) {
		delete out.maxPerSymbol;
		delete out.maxPerSide;
		delete out.maxOpen;
		if (sig) {
			delete sig.perSymbol;
			delete sig.maxOpen;
		}
	}
	if (v < 4) {
		if (sig) {
			delete sig.enabled;
			delete sig.lanes;
		}
		if (st?.mainTop === 140) st.mainTop = 0;
	}
	if (v < 5) {
		delete out.maxPositions;
		delete out.portfolio;
		if (st?.live?.maxNotionalUsd === 30) st.live.maxNotionalUsd = 200;
		if (st?.live?.maxPositions === 3) st.live.maxPositions = 12;
	}
	if (v < 6) {
		if (st?.block && st.block.maxLevel === 6 && st.block.minActiveLevel === 1) st.block = {
			...st.block,
			maxLevel: 10,
			minActiveLevel: 6
		};
	}
	if (v >= 5 && v < 7) {
		if (st?.live?.maxPositions === 0) st.live.maxPositions = 12;
	}
	if (v < 8) {
		if (out.guardPct === 1) delete out.guardPct;
		delete out.coord;
		if (sig && sig.rank === "drawdown") delete sig.rank;
	}
	db.kvSet("wf", pickWf(out));
	if (st) db.kvSet("settings", st);
	db.kvSet("wfCapsV", 8);
	return out;
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
		adjust: { ...base.adjust },
		signals: mergeSignals(base.signals),
		sizing: sizingSettings(base.sizing)
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
			signals: mergeSignals(out.signals, p.signals),
			sizing: sizingSettings({
				...out.sizing,
				...p.sizing ?? {}
			}),
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
async function liveStep(r, intents, gen) {
	const { stepLive } = await import("./live.server-Duz1UUqc.mjs");
	await stepLive(r, intents, gen);
}
function coreRuntime() {
	const cur = G.__ctsCoreRuntime;
	if (cur && !(cur instanceof CoreRuntime)) {
		Object.setPrototypeOf(cur, CoreRuntime.prototype);
		cur.settings = mergeSettings(DEFAULT_SETTINGS, cur.settings);
		cur.ensureFields();
	}
	if (cur) coreDb();
	if (!G.__ctsCoreRuntime) G.__ctsCoreRuntime = new CoreRuntime();
	if (G.__ctsCoreRuntime.__liveFrom !== liveStep) {
		G.__ctsCoreRuntime.onLive = liveStep;
		G.__ctsCoreRuntime.__liveFrom = liveStep;
	}
	G.__ctsCoreRuntime.ensureAlive();
	return G.__ctsCoreRuntime;
}
//#endregion
export { WF_KEYS, coreRuntime };
