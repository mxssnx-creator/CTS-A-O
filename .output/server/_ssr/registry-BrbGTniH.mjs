import { t as __exportAll } from "./rolldown-runtime-D7D4PA-g.mjs";
import { a as signalId, r as SIGNAL_SOURCES } from "./signal-config-BzfoBGpo.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/registry-BrbGTniH.js
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
/** ATR as an EMA of the true range (the Stable-02 desk's ATR; `atr` above is Wilder's). */
function atrEma(h, l, c, p) {
	return ema(trueRange(h, l, c), p);
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
var fin = (x) => Number.isFinite(x);
/** Stable-02 DMI: true range and ±DM smoothed with EMAs, ADX = EMA of DX (non-finite DX → 0). */
function s2Dmi(k, p = 14) {
	return k.memo(`s2dmi${p}`, () => {
		const { h, l, c, n } = k.b;
		const pdm = new Float64Array(n);
		const mdm = new Float64Array(n);
		for (let i = 1; i < n; i++) {
			const up = h[i] - h[i - 1];
			const dn = l[i - 1] - l[i];
			pdm[i] = up > dn && up > 0 ? up : 0;
			mdm[i] = dn > up && dn > 0 ? dn : 0;
		}
		const str = ema(trueRange(h, l, c), p);
		const sp = ema(pdm, p);
		const sm = ema(mdm, p);
		const pdi = new Float64Array(n).fill(NaN);
		const mdi = new Float64Array(n).fill(NaN);
		const dx = new Float64Array(n);
		for (let i = 0; i < n; i++) {
			if (str[i]) {
				pdi[i] = 100 * sp[i] / str[i];
				mdi[i] = 100 * sm[i] / str[i];
			}
			const s = pdi[i] + mdi[i];
			const x = s === 0 || !fin(s) ? NaN : 100 * Math.abs(pdi[i] - mdi[i]) / s;
			dx[i] = fin(x) ? x : 0;
		}
		return {
			adx: ema(dx, p),
			pdi,
			mdi
		};
	});
}
/** Stable-02 Supertrend: on the desk's ATR (EMA of the true range, `atrP` bars) × mult; direction ±1 (0 = warm-up). */
function s2Supertrend(k, atrP = 14, mult = 3) {
	return k.memo(`s2st${atrP}.${mult}`, () => {
		const { h, l, c, n } = k.b;
		const a = k.atrEma(atrP);
		const dir = new Int8Array(n);
		let upper = 0;
		let lower = 0;
		let d = 1;
		let prevOk = false;
		for (let i = 0; i < n; i++) {
			if (!fin(a[i])) {
				prevOk = false;
				continue;
			}
			const hl2 = (h[i] + l[i]) / 2;
			const bu = hl2 + mult * a[i];
			const bl = hl2 - mult * a[i];
			if (i === 0 || !prevOk) {
				upper = bu;
				lower = bl;
				d = c[i] >= hl2 ? 1 : -1;
			} else {
				lower = bl > lower || c[i - 1] < lower ? bl : lower;
				upper = bu < upper || c[i - 1] > upper ? bu : upper;
				if (d === 1 && c[i] < lower) d = -1;
				else if (d === -1 && c[i] > upper) d = 1;
			}
			dir[i] = d;
			prevOk = true;
		}
		return dir;
	});
}
/** Stable-02 range change: (bar range + |close change|) ÷ ATR(14) (0 without ATR). */
function s2RangeChange(k) {
	return k.memo("s2rc", () => {
		const { h, l, c, n } = k.b;
		const a = k.atrEma(14);
		const out = new Float64Array(n);
		for (let i = 1; i < n; i++) {
			const ai = a[i] || 0;
			out[i] = ai > 0 ? (h[i] - l[i] + Math.abs(c[i] - c[i - 1])) / ai : 0;
		}
		return out;
	});
}
/** Stable-02 activity: volume pulse (bar and 2-bar vs volume SMA 20) × range change, capped at 4 (NaN in warm-up). */
function s2Activity(k) {
	return k.memo("s2act", () => {
		const { v, n } = k.b;
		const rc = s2RangeChange(k);
		const vs = k.volSma(20);
		const out = new Float64Array(n);
		for (let i = 1; i < n; i++) {
			const s = vs[i] || 0;
			const volX = s > 0 ? v[i] / s : 1;
			const fast = i >= 2 ? (v[i] + v[i - 1]) / Math.max(vs[i] * 2, 1e-9) : volX;
			out[i] = Math.min(4, (volX * .55 + fast * .45) * (.4 + rc[i] * .6));
		}
		return out;
	});
}
var crossUp = (a, b, i) => i > 0 && fin(a[i]) && fin(b[i]) && fin(a[i - 1]) && fin(b[i - 1]) && a[i - 1] <= b[i - 1] && a[i] > b[i];
var crossDn = (a, b, i) => i > 0 && fin(a[i]) && fin(b[i]) && fin(a[i - 1]) && fin(b[i - 1]) && a[i - 1] >= b[i - 1] && a[i] < b[i];
/** Desk signal loop: f(i) ∈ {−1, 0, 1} from the warm-up bar on. */
function events(n, f) {
	const out = new Int8Array(n);
	for (let i = 55; i < n; i++) out[i] = f(i);
	return out;
}
/** Extend events into a state that persists `keep` bars (latest event wins). */
function hold$1(ev, keep) {
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
var spec$1 = (kind, id, label, params, fn) => ({
	id,
	kind,
	label,
	params,
	fn
});
/** "ema-cross": EMA fast/slow cross gated by ADX > 18 and volume > 1.05 × SMA 20. */
function emaCross(f, s) {
	return (k) => {
		const a = k.ema(f), b = k.ema(s), vs = k.volSma(20), { adx } = s2Dmi(k, 14), v = k.b.v;
		return events(k.b.n, (i) => {
			const volOk = fin(vs[i]) && v[i] > vs[i] * 1.05;
			const adxOk = fin(adx[i]) && adx[i] > 18;
			if (crossUp(a, b, i) && adxOk && volOk) return 1;
			if (crossDn(a, b, i) && adxOk && volOk) return -1;
			return 0;
		});
	};
}
/** "rsi-revert": RSI < 32 at / below the lower band (long), > 68 at / above the upper band (short). */
function rsiRevert(rp, bp) {
	return (k) => {
		const r = k.rsi(rp), { up, lo } = k.bb(bp, 2), c = k.b.c;
		return events(k.b.n, (i) => fin(r[i]) && fin(lo[i]) && r[i] < 32 && c[i] <= lo[i] ? 1 : fin(r[i]) && fin(up[i]) && r[i] > 68 && c[i] >= up[i] ? -1 : 0);
	};
}
/** "bb-bounce": close back inside the band after a close outside it, Stochastic %K < 35 / > 65. */
function bbBounce(bp, sp) {
	return (k) => {
		const { up, lo } = k.bb(bp, 2), { k: sk } = k.stoch(sp, 3), c = k.b.c;
		return events(k.b.n, (i) => fin(lo[i]) && c[i - 1] < lo[i - 1] && c[i] > lo[i] && sk[i] < 35 ? 1 : fin(up[i]) && c[i - 1] > up[i - 1] && c[i] < up[i] && sk[i] > 65 ? -1 : 0);
	};
}
/** "vwap-axis": close crosses the VWAP with volume above its SMA 20, on the EMA's side. */
function vwapAxis(wp, ep) {
	return (k) => {
		const w = k.vwap(wp), e = k.ema(ep), vs = k.volSma(20), { c, v } = k.b;
		return events(k.b.n, (i) => {
			const volOk = fin(vs[i]) && v[i] > vs[i];
			const ei = fin(e[i]) ? e[i] : c[i];
			if (crossUp(c, w, i) && volOk && c[i] > ei) return 1;
			if (crossDn(c, w, i) && volOk && c[i] < ei) return -1;
			return 0;
		});
	};
}
/** "vol-break": volume > 1.8 × its SMA, close beyond the SMA of closes in the bar's direction. */
function volBreak(p) {
	return (k) => {
		const vs = k.volSma(p), m = k.sma(p), { o, c, v } = k.b;
		return events(k.b.n, (i) => {
			const volOk = fin(vs[i]) && v[i] > vs[i] * 1.8;
			if (volOk && fin(m[i]) && c[i] > m[i] && c[i] > o[i]) return 1;
			if (volOk && fin(m[i]) && c[i] < m[i] && c[i] < o[i]) return -1;
			return 0;
		});
	};
}
/** "adx-gate": ADX > 22 with +DI / −DI in the direction of the EMA slope (every bar the gate holds). */
function adxGate(dp, ep) {
	return (k) => {
		const { adx, pdi, mdi } = s2Dmi(k, dp), e = k.ema(ep);
		return events(k.b.n, (i) => {
			if (!(fin(adx[i]) && adx[i] > 22 && fin(pdi[i]) && fin(mdi[i]) && fin(e[i]) && fin(e[i - 1]))) return 0;
			const slope = e[i] - e[i - 1];
			if (pdi[i] > mdi[i] && slope > 0) return 1;
			if (mdi[i] > pdi[i] && slope < 0) return -1;
			return 0;
		});
	};
}
/** "stoch-swing": %K crosses %D below 28 with CCI < −50 (long), above 72 with CCI > 50 (short). */
function stochSwing(sp, dp, cp) {
	return (k) => {
		const { k: sk, d } = k.stoch(sp, dp), x = k.cci(cp);
		return events(k.b.n, (i) => crossUp(sk, d, i) && sk[i] < 28 && x[i] < -50 ? 1 : crossDn(sk, d, i) && sk[i] > 72 && x[i] > 50 ? -1 : 0);
	};
}
/** "confluence": three of five independent confirms (EMA stack, MACD, Supertrend, RSI band, volume bar). */
function confluence(f, s, m, st, rp, vp) {
	return (k) => {
		const a = k.ema(f), b = k.ema(s), { line, signal } = k.macd(m[0], m[1], m[2]), dir = s2Supertrend(k, st[0], st[1]), r = k.rsi(rp), vs = k.volSma(vp), { o, c, v } = k.b;
		return events(k.b.n, (i) => {
			let long = 0;
			let short = 0;
			if (fin(a[i]) && fin(b[i]) && a[i] > b[i]) long++;
			else if (fin(a[i]) && fin(b[i]) && a[i] < b[i]) short++;
			if (fin(line[i]) && fin(signal[i]) && line[i] > signal[i]) long++;
			else if (fin(line[i]) && fin(signal[i])) short++;
			if (dir[i] === 1) long++;
			else if (dir[i] === -1) short++;
			if (fin(r[i]) && r[i] > 45 && r[i] < 70) long++;
			else if (fin(r[i]) && r[i] < 55 && r[i] > 30) short++;
			if (fin(vs[i]) && v[i] > vs[i]) {
				if (c[i] > o[i]) long++;
				else short++;
			}
			return long >= 3 && long > short ? 1 : short >= 3 && short > long ? -1 : 0;
		});
	};
}
/** "range-break": close beyond the prior `look`-bar high / low on volume > 1.15 × SMA and a bar > 1.1 × ATR. */
function rangeBreak(look) {
	return (k) => {
		const { hi, lo } = k.don(look), vs = k.volSma(20), a = k.atrEma(14), { h, l, c, v } = k.b;
		return events(k.b.n, (i) => {
			if (i < look) return 0;
			const volOk = fin(vs[i]) && v[i] > vs[i] * 1.15;
			const expand = fin(a[i]) && h[i] - l[i] > a[i] * 1.1;
			if (volOk && expand && c[i] > hi[i]) return 1;
			if (volOk && expand && c[i] < lo[i]) return -1;
			return 0;
		});
	};
}
/** "atr-break": close beyond EMA ± band × ATR while the range change is > 1.15. */
function atrBreak(ep, band) {
	return (k) => {
		const a = k.atrEma(14), e = k.ema(ep), rc = s2RangeChange(k), c = k.b.c;
		return events(k.b.n, (i) => {
			if (!fin(a[i]) || !fin(e[i])) return 0;
			const b = a[i] * band;
			const expand = rc[i] > 1.15;
			if (expand && c[i] > e[i] + b) return 1;
			if (expand && c[i] < e[i] - b) return -1;
			return 0;
		});
	};
}
/** "active-hf": activity ≥ 1.2 and an EMA cross, or a directional bar with activity > 1.6. */
function activeHf(f, s) {
	return (k) => {
		const act = s2Activity(k), a = k.ema(f), b = k.ema(s), { o, c } = k.b;
		return events(k.b.n, (i) => {
			const x = act[i];
			if (x < 1.2) return 0;
			if (crossUp(a, b, i) || c[i] > o[i] && x > 1.6) return 1;
			if (crossDn(a, b, i) || c[i] < o[i] && x > 1.6) return -1;
			return 0;
		});
	};
}
/** "range-shift": range change and activity ≥ 1.05 with a directional close beyond the band. */
function rangeShift(bp) {
	return (k) => {
		const rc = s2RangeChange(k), act = s2Activity(k), { up, lo } = k.bb(bp, 2), { o, c } = k.b;
		return events(k.b.n, (i) => {
			if (rc[i] < 1.05 || act[i] < 1.05) return 0;
			if (fin(up[i]) && c[i] > up[i] && c[i] > o[i]) return 1;
			if (fin(lo[i]) && c[i] < lo[i] && c[i] < o[i]) return -1;
			return 0;
		});
	};
}
/** "block-stack": ≥ need of the last `look` bars in one direction, volume > 1.05 × SMA, close on the EMA's side. */
function blockStack(look, need, ep) {
	return (k) => {
		const e = k.ema(ep), vs = k.volSma(20), { o, c, v } = k.b;
		return events(k.b.n, (i) => {
			if (i < look) return 0;
			let up = 0;
			let dn = 0;
			for (let j = i - look + 1; j <= i; j++) if (c[j] >= o[j]) up++;
			else dn++;
			const volOk = fin(vs[i]) && v[i] > vs[i] * 1.05;
			const ei = fin(e[i]) ? e[i] : c[i];
			if (volOk && up >= need && c[i] > ei) return 1;
			if (volOk && dn >= need && c[i] < ei) return -1;
			return 0;
		});
	};
}
/** "block-scale": ADX ≥ 16 and volume above its SMA, on the VWAP's side (every bar it holds). */
function blockScale(dp, wp) {
	return (k) => {
		const { adx } = s2Dmi(k, dp), vs = k.volSma(20), w = k.vwap(wp), { c, v } = k.b;
		return events(k.b.n, (i) => {
			const adxOk = fin(adx[i]) && adx[i] >= 16;
			const volOk = fin(vs[i]) && v[i] > vs[i];
			if (adxOk && volOk && fin(w[i]) && c[i] > w[i]) return 1;
			if (adxOk && volOk && fin(w[i]) && c[i] < w[i]) return -1;
			return 0;
		});
	};
}
/**
* Ported entry signals: desk id → [kind, label, short params, short fn, medium params, medium fn]. "normal" (EMA
* 9/21 cross = registry "ema-9-21") and "macd-mom" (MACD signal cross; the histogram sign always agrees with the
* cross = registry "macd-cross") already exist and are not ported.
*/
var S2_ENTRIES = [
	{
		id: "ema-cross",
		kind: "trend",
		label: "EMA cross pulse",
		short: [{
			f: 9,
			s: 21,
			adx: 18,
			vol: 1.05
		}, emaCross(9, 21)],
		medium: [{
			f: 21,
			s: 55,
			adx: 18,
			vol: 1.05
		}, emaCross(21, 55)]
	},
	{
		id: "rsi-revert",
		kind: "rsi",
		label: "RSI mean revert",
		short: [{
			rsi: 14,
			lo: 32,
			hi: 68,
			bb: 20
		}, rsiRevert(14, 20)],
		medium: [{
			rsi: 21,
			lo: 32,
			hi: 68,
			bb: 30
		}, rsiRevert(21, 30)]
	},
	{
		id: "st-trail",
		kind: "trend",
		label: "Supertrend trail",
		short: [{
			atr: 14,
			m: 3
		}, (k) => s2Supertrend(k, 14, 3)],
		medium: [{
			atr: 21,
			m: 4
		}, (k) => s2Supertrend(k, 21, 4)]
	},
	{
		id: "bb-bounce",
		kind: "bollinger",
		label: "Bollinger bounce",
		short: [{
			bb: 20,
			k: 2,
			stoch: 14,
			lo: 35,
			hi: 65
		}, bbBounce(20, 14)],
		medium: [{
			bb: 30,
			k: 2,
			stoch: 21,
			lo: 35,
			hi: 65
		}, bbBounce(30, 21)]
	},
	{
		id: "vwap-axis",
		kind: "direction",
		label: "VWAP axis",
		short: [{
			vwap: 240,
			ema: 21,
			vol: 20
		}, vwapAxis(240, 21)],
		medium: [{
			vwap: 480,
			ema: 55,
			vol: 20
		}, vwapAxis(480, 55)]
	},
	{
		id: "vol-break",
		kind: "volume",
		label: "Volume breakout",
		short: [{
			p: 20,
			vol: 1.8
		}, volBreak(20)],
		medium: [{
			p: 50,
			vol: 1.8
		}, volBreak(50)]
	},
	{
		id: "adx-gate",
		kind: "trend",
		label: "ADX trend gate",
		short: [{
			dmi: 14,
			adx: 22,
			ema: 55
		}, adxGate(14, 55)],
		medium: [{
			dmi: 21,
			adx: 22,
			ema: 100
		}, adxGate(21, 100)]
	},
	{
		id: "stoch-swing",
		kind: "osc",
		label: "Stoch swing",
		short: [{
			k: 14,
			d: 3,
			lo: 28,
			hi: 72,
			cci: 20
		}, stochSwing(14, 3, 20)],
		medium: [{
			k: 21,
			d: 5,
			lo: 28,
			hi: 72,
			cci: 40
		}, stochSwing(21, 5, 40)]
	},
	{
		id: "confluence",
		kind: "trend",
		label: "Confluence 3 of 5",
		short: [{
			f: 9,
			s: 21,
			st: 14,
			rsi: 14,
			vol: 20
		}, confluence(9, 21, [
			12,
			26,
			9
		], [14, 3], 14, 20)],
		medium: [{
			f: 21,
			s: 55,
			st: 21,
			rsi: 21,
			vol: 50
		}, confluence(21, 55, [
			19,
			39,
			9
		], [21, 4], 21, 50)]
	},
	{
		id: "range-break",
		kind: "break",
		label: "Range break",
		short: [{
			look: 20,
			vol: 1.15,
			atr: 1.1
		}, rangeBreak(20)],
		medium: [{
			look: 40,
			vol: 1.15,
			atr: 1.1
		}, rangeBreak(40)]
	},
	{
		id: "atr-break",
		kind: "break",
		label: "ATR break",
		short: [{
			ema: 21,
			band: 1.5,
			rc: 1.15
		}, atrBreak(21, 1.5)],
		medium: [{
			ema: 55,
			band: 2,
			rc: 1.15
		}, atrBreak(55, 2)]
	},
	{
		id: "active-hf",
		kind: "active",
		label: "Active high-freq",
		short: [{
			act: 1.2,
			burst: 1.6,
			f: 9,
			s: 21
		}, activeHf(9, 21)],
		medium: [{
			act: 1.2,
			burst: 1.6,
			f: 21,
			s: 55
		}, activeHf(21, 55)]
	},
	{
		id: "range-shift",
		kind: "active",
		label: "Range shift",
		short: [{
			rc: 1.05,
			act: 1.05,
			bb: 20
		}, rangeShift(20)],
		medium: [{
			rc: 1.05,
			act: 1.05,
			bb: 50
		}, rangeShift(50)]
	},
	{
		id: "block-stack",
		kind: "move",
		label: "Block stack",
		short: [{
			look: 4,
			need: 3,
			vol: 1.05,
			ema: 9
		}, blockStack(4, 3, 9)],
		medium: [{
			look: 8,
			need: 6,
			vol: 1.05,
			ema: 21
		}, blockStack(8, 6, 21)]
	},
	{
		id: "block-scale",
		kind: "direction",
		label: "Block scale",
		short: [{
			dmi: 14,
			adx: 16,
			vwap: 240
		}, blockScale(14, 240)],
		medium: [{
			dmi: 21,
			adx: 16,
			vwap: 480
		}, blockScale(21, 480)]
	}
];
/** Registry id of a ported entry in a range ("s2-ema-cross", "s2-ema-cross-m"). */
var s2EntryId = (id, range) => `s2-${id}${range === "medium" ? "-m" : ""}`;
/** kind "break" (break-vol / break-atr): volume > volMult × SMA or range change ≥ 0.7 × atrMult → bar direction. */
function breakExpand(volMult, atrMult) {
	return (k) => {
		const vs = k.volSma(20), rc = s2RangeChange(k), { o, c, v } = k.b;
		const out = new Int8Array(k.b.n);
		for (let i = 0; i < k.b.n; i++) {
			const volOk = fin(vs[i]) && v[i] > vs[i] * volMult;
			const expand = rc[i] >= atrMult * .7;
			if (volOk || expand) out[i] = c[i] >= o[i] ? 1 : -1;
		}
		return out;
	};
}
/** kind "active": mean activity of the last `look` bars ≥ 1.05 with volume or ranging → bar direction. */
function activeLook(look, volMult) {
	return (k) => {
		const act = s2Activity(k), rc = s2RangeChange(k), vs = k.volSma(20), { o, c, v, n } = k.b;
		const out = new Int8Array(n);
		for (let i = 0; i < n; i++) {
			const from = Math.max(1, i - look + 1);
			let a = 0;
			for (let j = from; j <= i; j++) a += act[j];
			a /= Math.max(1, i - from + 1);
			const volOk = fin(vs[i]) && v[i] > vs[i] * volMult;
			if (a >= 1.05 && (volOk || rc[i] > .85)) out[i] = c[i] >= o[i] ? 1 : -1;
		}
		return out;
	};
}
/** kind "direction": the latest sign change of `sgn` within the last `look` bars. */
function dirFlip(look, sgn) {
	return (k) => {
		const s = sgn(k);
		const n = k.b.n;
		const ev = new Int8Array(n);
		let was = n > 0 ? s(0) : 0;
		for (let i = 1; i < n; i++) {
			const now = s(i);
			if (now !== 0 && now !== was) ev[i] = now;
			was = now;
		}
		return hold$1(ev, look);
	};
}
var signOf = (x) => fin(x) ? Math.sign(x) : 0;
/**
* Ported indications. "trend-ema" (EMA 9 vs 21 = registry "ema-9-21") exists already; "trend-st" is the state of
* the ported "s2-st-trail" (desk Supertrend direction) — neither is added twice.
*/
var S2_INDICATIONS = [
	spec$1("trend", "s2-trend-adx", "S2 trend ADX 26 (EMA DMI)", {
		p: 14,
		adx: 26
	}, (k) => {
		const { adx, pdi, mdi } = s2Dmi(k, 14);
		const out = new Int8Array(k.b.n);
		for (let i = 0; i < k.b.n; i++) if (fin(adx[i]) && adx[i] >= 26 && fin(pdi[i]) && fin(mdi[i])) out[i] = pdi[i] > mdi[i] ? 1 : -1;
		return out;
	}),
	spec$1("break", "s2-break-vol", "S2 break volume 1.6×", {
		vol: 1.6,
		atr: 1.3
	}, breakExpand(1.6, 1.3)),
	spec$1("break", "s2-break-atr", "S2 break ATR 1.15×", {
		vol: 1.5,
		atr: 1.15
	}, breakExpand(1.5, 1.15)),
	spec$1("break", "s2-break-hi", "S2 break 8-bar range", { look: 8 }, (k) => {
		const { hi, lo } = k.don(8), c = k.b.c;
		const out = new Int8Array(k.b.n);
		for (let i = 8; i < k.b.n; i++) out[i] = c[i] > hi[i] ? 1 : c[i] < lo[i] ? -1 : 0;
		return out;
	}),
	spec$1("active", "s2-act-hf", "S2 active high-freq", {
		look: 4,
		vol: 1.15
	}, activeLook(4, 1.15)),
	spec$1("active", "s2-act-range", "S2 active range shift", {
		look: 6,
		vol: 1.05
	}, activeLook(6, 1.05)),
	spec$1("active", "s2-act-burst", "S2 active burst", {
		look: 3,
		vol: 1.5
	}, activeLook(3, 1.5)),
	spec$1("direction", "s2-dir-cross", "S2 dir EMA cross", { look: 5 }, dirFlip(5, (k) => {
		const a = k.ema(9), b = k.ema(21);
		return (i) => fin(a[i]) && fin(b[i]) ? Math.sign(a[i] - b[i]) : 0;
	})),
	spec$1("direction", "s2-dir-st", "S2 dir Supertrend flip", { look: 6 }, dirFlip(6, (k) => {
		const d = s2Supertrend(k, 14, 3);
		return (i) => d[i];
	})),
	spec$1("direction", "s2-dir-axis", "S2 dir axis VWAP", {
		look: 5,
		vwap: 240
	}, dirFlip(5, (k) => {
		const w = k.vwap(240), c = k.b.c;
		return (i) => fin(w[i]) ? Math.sign(c[i] - w[i]) : 0;
	})),
	spec$1("direction", "s2-dir-macd", "S2 dir MACD flip", { look: 5 }, dirFlip(5, (k) => {
		const { hist } = k.macd();
		return (i) => signOf(hist[i]);
	}))
];
/** Every Stable-02 registry indication: the entries in both ranges, then the indications. */
function stable02Specs() {
	const out = [];
	for (const e of S2_ENTRIES) for (const range of ["short", "medium"]) {
		const [params, fn] = e[range];
		out.push(spec$1(e.kind, s2EntryId(e.id, range), `S2 ${e.label}${range === "medium" ? " (slow)" : ""}`, params, fn));
	}
	return [...out, ...S2_INDICATIONS];
}
var registry_exports = /* @__PURE__ */ __exportAll({
	COMBINED_BASE: () => COMBINED_BASE,
	INDICATIONS: () => INDICATIONS,
	INDICATION_BY_ID: () => INDICATION_BY_ID,
	SIGNAL_SOURCES: () => SIGNAL_SOURCES,
	TF_LADDER: () => TF_LADDER,
	higherFactors: () => higherFactors,
	indicationState: () => indicationState,
	isSignalInd: () => isSignalInd,
	laneInd: () => laneInd,
	laneLabel: () => laneLabel,
	laneOf: () => laneOf,
	mtfState: () => mtfState,
	signalId: () => signalId,
	signalSourceOf: () => signalSourceOf
});
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
for (const x of stable02Specs()) add(x);
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
/** Short lane label for tables: "15m", "5m+" (combined). */
var laneLabel = (ind) => {
	const l = laneOf(ind);
	return l.tf === null ? "" : `${l.tf}m${l.combined ? "+" : ""}`;
};
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
var isSignalInd = (ind) => laneOf(ind).base.startsWith("sig-");
/** Source name of a signal indication ("sig-ema-cross-s@m5" → "ema-cross"). */
var signalSourceOf = (ind) => laneOf(ind).base.replace(/^sig-/, "").replace(/-[sm]$/, "");
for (const src of SIGNAL_SOURCES) for (const range of ["short", "medium"]) {
	const base = INDICATION_BY_ID.get(range === "short" ? src.short : src.medium);
	if (!base) throw new Error(`signal source ${src.name} ${range}: ${range === "short" ? src.short : src.medium} missing`);
	const c = spec(base.kind, signalId(src.name, range), `${src.label} · ${range}`, { ...base.params }, base.fn);
	INDICATIONS.push(c);
	INDICATION_BY_ID.set(c.id, c);
}
//#endregion
export { roc as A, kama as C, obv as D, mfi as E, supertrend as F, trix as I, vwapRolling as L, sma as M, stoch as N, periodLevels as O, stochRsi as P, willr as R, ichimoku as S, macd as T, dmi as _, indicationState as a, heikinAshi as b, laneOf as c, aroon as d, atr as f, cmf as g, cci as h, higherFactors as i, rsi as j, psar as k, registry_exports as l, bollinger as m, INDICATION_BY_ID as n, isSignalInd as o, atrEma as p, TF_LADDER as r, laneInd as s, INDICATIONS as t, signalSourceOf as u, donchianPrior as v, keltner as w, hma as x, ema as y, zscore as z };
