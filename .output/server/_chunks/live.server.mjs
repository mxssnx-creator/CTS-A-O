import { createHash, createHmac } from "node:crypto";
//#region src/core/exchange/bingx.server.ts
var HOSTS = {
	mainnet: ["https://open-api.bingx.com", "https://open-api.bingx.pro"],
	testnet: ["https://open-api-vst.bingx.com", "https://open-api-vst.bingx.pro"]
};
var TIMEOUT_MS = 1e4;
var env = (k) => (process.env[k] ?? "").trim();
function keysFor(conn) {
	const slot = conn === "bingx-x01" ? "X01" : conn === "bingx-vst-02" ? "X02" : "V01";
	return {
		apiKey: env(`BINGX_${slot}_API_KEY`),
		secret: env(`BINGX_${slot}_SECRET`)
	};
}
function signedUrl(base, path, secret, params) {
	const keys = Object.keys(params).sort();
	const canonical = keys.map((k) => `${k}=${params[k]}`).join("&");
	const signature = createHmac("sha256", secret).update(canonical).digest("hex");
	return `${base}${path}?${keys.map((k) => {
		const v = String(params[k]);
		return `${k}=${/[{}"\s,]/.test(v) ? encodeURIComponent(v) : v}`;
	}).join("&")}&signature=${signature}`;
}
async function timedFetch(url, init = {}) {
	const ctl = new AbortController();
	const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
	try {
		return await (await fetch(url, {
			...init,
			signal: ctl.signal
		})).json();
	} finally {
		clearTimeout(timer);
	}
}
/** Signed request; throws with BingX's message on a non-zero code. */
async function signed(network, conn, method, path, params = {}) {
	const { apiKey, secret } = keysFor(conn);
	if (!apiKey || !secret) throw new Error(`no API keys for ${conn}`);
	const body = await timedFetch(signedUrl(HOSTS[network][0], path, secret, {
		...params,
		recvWindow: 5e3,
		timestamp: Date.now()
	}), {
		method,
		headers: { "X-BX-APIKEY": apiKey }
	});
	if (body?.code !== 0) throw new Error(body?.msg || `BingX ${body?.code}`);
	return body.data;
}
var n = (v) => {
	const x = typeof v === "number" ? v : Number(v);
	return Number.isFinite(x) ? x : 0;
};
var contracts = null;
async function fetchContracts(network) {
	if (contracts && contracts.network === network && Date.now() - contracts.at < 6e5) return contracts.map;
	const map = /* @__PURE__ */ new Map();
	for (const host of HOSTS[network]) try {
		const body = await timedFetch(`${host}/openApi/swap/v2/quote/contracts`);
		for (const r of body?.data ?? []) {
			const symbol = String(r.symbol ?? "");
			if (!symbol) continue;
			const qtyPrec = n(r.quantityPrecision);
			const step = n(r.size) || 10 ** -Math.max(0, qtyPrec);
			map.set(symbol, {
				symbol,
				qtyPrec,
				step: step > 0 ? step : 1,
				minQty: Math.max(n(r.tradeMinQuantity), n(r.tradeMinVolume), n(r.minQty), step, 0),
				pxPrec: n(r.pricePrecision),
				minUsdt: Math.max(n(r.tradeMinUSDT), n(r.minNotional), 0) || 2
			});
		}
		if (map.size) break;
	} catch {}
	contracts = {
		at: Date.now(),
		network,
		map
	};
	return map;
}
/** Floor to the lot step (never larger than qty). */
function snapQtyDown(qty, spec) {
	if (!(qty > 0)) return 0;
	if (!spec) return qty;
	const q = Math.floor(qty / spec.step + 1e-12) * spec.step;
	return Number(Math.max(0, q).toFixed(Math.max(0, spec.qtyPrec)));
}
function snapPx(px, spec) {
	if (!(px > 0)) return 0;
	return Number(px.toFixed(Math.max(0, Math.min(8, spec?.pxPrec ?? 4))));
}
function exchangeMinNotional(spec, px) {
	return Math.max(spec?.minUsdt ?? 2, (spec?.minQty ?? 0) * Math.max(px, 0));
}
/** Positions and open orders of the account (all of them — ownership is decided by the planner). */
async function fetchBook(network, conn) {
	const [posRaw, ordRaw] = await Promise.all([signed(network, conn, "GET", "/openApi/swap/v2/user/positions"), signed(network, conn, "GET", "/openApi/swap/v2/trade/openOrders")]);
	const posRows = Array.isArray(posRaw) ? posRaw : posRaw?.positions ?? [];
	const positions = [];
	for (const r of posRows) {
		const venueSymbol = String(r.symbol ?? "");
		const amt = n(r.positionAmt ?? r.availableAmt ?? r.positionQty ?? r.volume);
		const qty = Math.abs(amt);
		if (!venueSymbol || !(qty > 0)) continue;
		const ps = String(r.positionSide ?? "").toUpperCase();
		const side = ps === "SHORT" ? "short" : ps === "LONG" ? "long" : amt < 0 ? "short" : "long";
		positions.push({
			symbol: venueSymbol.replace("-", ""),
			venueSymbol,
			side,
			qty
		});
	}
	return {
		positions,
		orders: (Array.isArray(ordRaw) ? ordRaw : ordRaw?.orders ?? []).filter((r) => r.symbol).map((r) => ({
			id: String(r.orderId ?? r.orderID ?? ""),
			symbol: String(r.symbol).replace("-", ""),
			venueSymbol: String(r.symbol),
			clientOrderId: String(r.clientOrderID ?? r.clientOrderId ?? r.clientOid ?? "").trim() || void 0,
			positionSide: String(r.positionSide ?? "").toUpperCase() === "SHORT" ? "SHORT" : String(r.positionSide ?? "").toUpperCase() === "LONG" ? "LONG" : void 0,
			type: r.type ? String(r.type) : void 0
		}))
	};
}
async function cancelOrder(network, conn, venueSymbol, orderId) {
	try {
		await signed(network, conn, "DELETE", "/openApi/swap/v2/trade/order", {
			symbol: venueSymbol,
			orderId
		});
		return true;
	} catch {
		return false;
	}
}
/** Position mode of the account: hedge (dual side) or one-way. */
async function setPositionMode(network, conn, mode) {
	await signed(network, conn, "POST", "/openApi/swap/v1/positionSide/dual", { dualSidePosition: mode === "hedge" ? "true" : "false" });
}
/** Margin type of one symbol: cross or isolated. */
async function setMarginMode(network, conn, venueSymbol, mode) {
	await signed(network, conn, "POST", "/openApi/swap/v2/trade/marginType", {
		symbol: venueSymbol,
		marginType: mode === "cross" ? "CROSSED" : "ISOLATED"
	});
}
//#endregion
//#region src/core/server/live.ts
var LIVE_TAG = {
	"bingx-x01": "CTSBX1_",
	"bingx-vst-01": "CTSBV1_",
	"bingx-vst-02": "CTSBV2_"
};
function liveNetwork(connId) {
	return connId === "bingx-x01" ? "mainnet" : "testnet";
}
function makeCoid(connId, kind, now = Date.now()) {
	return `${LIVE_TAG[connId]}${kind}${now.toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`.slice(0, 40);
}
function isOwnCoid(coid, connId) {
	return !!coid && coid.toUpperCase().startsWith(LIVE_TAG[connId]);
}
/** Symbols we own on the exchange: own-tagged open orders, or a position that one of our recent entries opened. */
function ownSymbols(book, connId, recentEntrySyms) {
	const own = /* @__PURE__ */ new Set();
	for (const o of book.orders) if (isOwnCoid(o.clientOrderId, connId)) own.add(o.venueSymbol);
	for (const p of book.positions) if (recentEntrySyms.has(p.venueSymbol) && !book.orders.some((o) => o.venueSymbol === p.venueSymbol && !isOwnCoid(o.clientOrderId, connId))) own.add(p.venueSymbol);
	return own;
}
function planLive(input) {
	const { settings, intents, book } = input;
	const off = (reason) => ({
		enabled: false,
		reason,
		entries: [],
		skipped: []
	});
	if (!settings.enabled) return off("live disabled in settings");
	if (!input.envArmed) return off("CTS_CORE_LIVE=1 not set on the host");
	if (!input.hasKeys) return off(`no API keys for ${settings.connId}`);
	if (input.ready && !input.ready.ok) return off(`not ready: ${input.ready.why}`);
	if (!book) return off("exchange book unavailable");
	const foreign = /* @__PURE__ */ new Set();
	for (const o of book.orders) if (!isOwnCoid(o.clientOrderId, settings.connId)) foreign.add(o.venueSymbol);
	for (const p of book.positions) if (!input.ownSyms.has(p.venueSymbol)) foreign.add(p.venueSymbol);
	let open = [...input.ownSyms].filter((s) => book.positions.some((p) => p.venueSymbol === s)).length;
	const entries = [];
	const skipped = [];
	const seen = /* @__PURE__ */ new Set();
	for (const it of intents) {
		const key = `${it.cfg}|${it.sym}|${it.barT}`;
		if (input.sent.has(key)) continue;
		if (it.managed) {
			skipped.push({
				sym: it.sym,
				why: "managed exit (trailing / DCA / Axis) needs overall mode"
			});
			continue;
		}
		if (input.newestBarT !== void 0 && it.barT < input.newestBarT) {
			skipped.push({
				sym: it.sym,
				why: "stale signal (symbol not updated)"
			});
			continue;
		}
		if (foreign.has(it.sym)) {
			skipped.push({
				sym: it.sym,
				why: "foreign position/order on symbol"
			});
			continue;
		}
		if (input.ownSyms.has(it.sym) || seen.has(it.sym)) {
			skipped.push({
				sym: it.sym,
				why: "already holding symbol"
			});
			continue;
		}
		if (open >= settings.maxPositions) {
			skipped.push({
				sym: it.sym,
				why: "max positions"
			});
			continue;
		}
		seen.add(it.sym);
		entries.push(it);
		open++;
	}
	return {
		enabled: true,
		reason: "armed",
		entries,
		skipped
	};
}
/** Small stable hash (FNV-1a, base36) for state fingerprints. */
function stateHash(parts) {
	let h = 2166136261;
	for (const p of parts) {
		for (let i = 0; i < p.length; i++) h = Math.imul(h ^ p.charCodeAt(i), 16777619);
		h = Math.imul(h ^ 10, 16777619);
	}
	return (h >>> 0).toString(36).padStart(7, "0");
}
function controlTargets(lanes, prices, cs, snap = (_s, q) => q) {
	let agg = /* @__PURE__ */ new Map();
	for (const l of lanes) {
		const key = `${l.sym}|${l.side}`;
		const a = agg.get(key) ?? {
			sym: l.sym,
			side: l.side,
			lanes: 0,
			vol: 0,
			sl: 0
		};
		a.lanes++;
		a.vol += Math.max(0, l.vol);
		a.sl = Math.max(a.sl, l.sl);
		agg.set(key, a);
	}
	if (cs.positionMode === "oneway") {
		const net = /* @__PURE__ */ new Map();
		const syms = new Set([...agg.values()].map((a) => a.sym));
		for (const sym of syms) {
			const L = agg.get(`${sym}|1`);
			const S = agg.get(`${sym}|-1`);
			const v = (L?.vol ?? 0) - (S?.vol ?? 0);
			if (Math.abs(v) < 1e-9) continue;
			const side = v > 0 ? 1 : -1;
			net.set(`${sym}|${side}`, {
				sym,
				side,
				lanes: (L?.lanes ?? 0) + (S?.lanes ?? 0),
				vol: Math.abs(v),
				sl: Math.max(L?.sl ?? 0, S?.sl ?? 0)
			});
		}
		agg = net;
	}
	const targets = [];
	const skipped = [];
	for (const [key, a] of [...agg.entries()].sort((x, y) => y[1].vol - x[1].vol || (x[0] < y[0] ? -1 : 1))) {
		const px = prices.get(a.sym) ?? 0;
		if (!(px > 0)) {
			skipped.push({
				sym: a.sym,
				why: "no fresh price"
			});
			continue;
		}
		if (targets.length >= cs.maxPositions) {
			skipped.push({
				sym: a.sym,
				why: "max control positions"
			});
			continue;
		}
		const notional = Math.min(cs.maxNotionalUsd, cs.notionalUsd * a.vol * cs.ratio);
		const qty = snap(a.sym, notional / px);
		if (!(qty > 0)) {
			skipped.push({
				sym: a.sym,
				why: "size rounds to zero"
			});
			continue;
		}
		targets.push({
			key,
			sym: a.sym,
			side: a.side,
			lanes: a.lanes,
			vol: a.vol,
			notional: qty * px,
			qty,
			stopDist: Math.min(.2, Math.max(.01, a.sl * 1.2))
		});
	}
	return {
		targets,
		skipped
	};
}
/**
* Minimal actions that bring the own control positions to the targets.
* `held` = own positions per key (sym|side → qty). `foreign` = symbols that must not be touched.
*/
function planControl(input) {
	const actions = [];
	const skipped = [];
	const tmap = new Map(input.targets.map((t) => [t.key, t]));
	const keys = [.../* @__PURE__ */ new Set([...tmap.keys(), ...input.held.keys()])].sort();
	for (const key of keys) {
		const [sym, s] = key.split("|");
		const side = Number(s) === 1 ? 1 : -1;
		if (input.foreign.has(sym)) {
			skipped.push({
				sym,
				why: "foreign position/order on symbol"
			});
			continue;
		}
		const t = tmap.get(key);
		const have = input.held.get(key) ?? 0;
		const want = t?.qty ?? 0;
		if (want <= 0 && have > 0) actions.push({
			kind: "close",
			key,
			sym,
			side,
			qty: have
		});
		else if (want > 0 && have <= 0) actions.push({
			kind: "open",
			key,
			sym,
			side,
			qty: want,
			stopDist: t.stopDist
		});
		else if (want > 0 && have > 0) {
			const diff = want - have;
			if (Math.abs(diff) / want <= input.rebalancePct) continue;
			actions.push(diff > 0 ? {
				kind: "increase",
				key,
				sym,
				side,
				qty: diff
			} : {
				kind: "reduce",
				key,
				sym,
				side,
				qty: -diff
			});
		}
	}
	const rank = {
		close: 0,
		reduce: 1,
		open: 2,
		increase: 3
	};
	actions.sort((a, b) => rank[a.kind] - rank[b.kind] || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
	const targetsHash = stateHash(input.targets.map((t) => `${t.key}:${t.qty}`));
	const bookHash = stateHash(input.bookParts ?? [...input.held.entries()].sort().map(([k, q]) => `${k}:${q}`));
	return {
		targets: [...input.targets],
		actions,
		skipped,
		hashes: {
			targets: targetsHash,
			book: bookHash,
			plan: stateHash(actions.map((a) => `${a.kind}:${a.key}:${a.qty}`))
		}
	};
}
/**
* Ownership in Overall mode, restart-safe: a (symbol, direction) position is ours when an own-tagged order rests on
* that symbol and position side (every control position carries an own protective stop), or when we just opened it
* (`recent`). A symbol with any foreign order, or a position we do not own, is foreign and never touched.
*/
function controlOwnership(book, connId, recent) {
	const held = /* @__PURE__ */ new Map();
	const foreign = /* @__PURE__ */ new Set();
	for (const o of book.orders) if (!isOwnCoid(o.clientOrderId, connId)) foreign.add(o.venueSymbol);
	for (const p of book.positions) {
		const side = p.side === "long" ? 1 : -1;
		const key = `${p.venueSymbol}|${side}`;
		const ps = p.side === "long" ? "LONG" : "SHORT";
		if (book.orders.some((o) => o.venueSymbol === p.venueSymbol && isOwnCoid(o.clientOrderId, connId) && (!o.positionSide || o.positionSide === ps)) || recent.has(key)) held.set(key, (held.get(key) ?? 0) + p.qty);
		else foreign.add(p.venueSymbol);
	}
	for (const k of [...held.keys()]) if (foreign.has(k.split("|")[0])) held.delete(k);
	return {
		held,
		foreign
	};
}
//#endregion
//#region src/core/server/live.server.ts
/** Fill price / commission from an order reply (BingX: data.order.{avgPrice, commission}); null when absent. */
function parseFill(resp) {
	const o = resp?.order ?? resp;
	if (!o || typeof o !== "object") return null;
	const px = Number(o.avgPrice ?? o.price ?? 0);
	const fee = Math.abs(Number(o.commission ?? o.fee ?? 0)) || 0;
	return px > 0 ? {
		px,
		fee
	} : null;
}
/** "already in that mode" replies are success */
var alreadySet = (msg) => /no need|already|not modified|same|repeat/i.test(msg);
function bingxClient(connId) {
	const network = liveNetwork(connId);
	return {
		hasKeys: () => {
			const k = keysFor(connId);
			return !!(k.apiKey && k.secret);
		},
		fingerprint: () => {
			const k = keysFor(connId).apiKey;
			const fp = k ? createHash("sha256").update(k).digest("hex").slice(0, 10) : "nokey";
			return `${connId}|${network}|${HOSTS[network][0]}|${fp}`;
		},
		book: () => fetchBook(network, connId),
		contracts: () => fetchContracts(network),
		order: (p) => signed(network, connId, "POST", "/openApi/swap/v2/trade/order", p),
		cancel: (sym, id) => cancelOrder(network, connId, sym, id),
		setPositionMode: (mode) => setPositionMode(network, connId, mode),
		setMarginMode: (sym, mode) => setMarginMode(network, connId, sym, mode)
	};
}
var running = null;
/** Serialised entry point: overlapping calls wait for the running step instead of racing it. */
function stepLive(rt, intents, gen, client) {
	const next = (running ?? Promise.resolve(null)).then(() => (rt.settings.live.mode ?? "overall") === "overall" ? runControl(rt, gen, client ?? bingxClient(rt.settings.live.connId)) : runStep(rt, intents, gen));
	const tail = next.then(() => void 0, () => void 0).finally(() => {
		if (running === tail) running = null;
	});
	running = tail;
	return next;
}
async function runStep(rt, intents, gen) {
	const s = rt.settings.live;
	const status = {
		at: Date.now(),
		enabled: false,
		reason: "",
		placed: 0,
		closed: 0,
		cancelled: 0,
		skipped: [],
		error: null
	};
	const alive = () => rt.generation === gen;
	const record = (coid, cfg, sym, side, kind, qty, px, st, key) => rt.db.run("INSERT OR REPLACE INTO live_orders (coid, cfg, sym, side, kind, qty, px, status, msg, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", coid, cfg, sym, side, kind, qty, px, st, key, Date.now());
	try {
		const network = liveNetwork(s.connId);
		const keys = keysFor(s.connId);
		const hasKeys = !!(keys.apiKey && keys.secret);
		const envArmed = process.env.CTS_CORE_LIVE === "1";
		let book = null;
		if (s.enabled && envArmed && hasKeys) try {
			book = await fetchBook(network, s.connId);
		} catch (err) {
			rt.db.event("warn", `live book: ${err instanceof Error ? err.message : err}`);
		}
		const sim = rt.sim;
		const minPf = rt.settings.gates.minPf;
		const ready = !sim ? {
			ok: false,
			why: "no simulated run yet"
		} : sim.stats.pf < minPf || !sim.stable ? {
			ok: false,
			why: `simulated run PF ${sim.stats.pf.toFixed(2)} (min ${minPf})${sim.stable ? "" : ", not stable"}`
		} : {
			ok: true,
			why: ""
		};
		const dayAgo = Date.now() - 864e5;
		const recent = new Set(rt.db.all("SELECT DISTINCT sym FROM live_orders WHERE kind = 'E' AND status IN ('ok', 'pending') AND at > ?", dayAgo).map((r) => r.sym));
		const own = book ? ownSymbols(book, s.connId, recent) : /* @__PURE__ */ new Set();
		const sent = new Set(rt.db.all("SELECT msg AS k FROM live_orders WHERE kind = 'E'").map((r) => r.k));
		const plan = planLive({
			ready,
			settings: s,
			envArmed,
			hasKeys,
			book,
			ownSyms: own,
			sent,
			newestBarT: rt.status.lastBarT,
			intents: intents.map((i) => ({
				cfg: i.cfg,
				sym: i.sym,
				side: i.side,
				tp: i.protect.tp,
				sl: i.protect.sl,
				barT: i.barT,
				managed: i.protect.trail > 0 || i.kind !== void 0 && i.kind !== "normal"
			}))
		});
		status.enabled = plan.enabled;
		status.reason = plan.reason;
		status.skipped = plan.skipped;
		if (!plan.enabled || !book) return status;
		for (const o of book.orders) {
			if (!alive()) break;
			if (!isOwnCoid(o.clientOrderId, s.connId)) continue;
			if (!o.id || book.positions.some((p) => p.venueSymbol === o.venueSymbol)) continue;
			if (await cancelOrder(network, s.connId, o.venueSymbol, o.id)) status.cancelled++;
		}
		for (const p of book.positions) {
			if (!alive()) break;
			if (!own.has(p.venueSymbol)) continue;
			if (book.orders.some((o) => o.venueSymbol === p.venueSymbol && isOwnCoid(o.clientOrderId, s.connId))) continue;
			const c = makeCoid(s.connId, "C");
			try {
				await signed(network, s.connId, "POST", "/openApi/swap/v2/trade/order", {
					symbol: p.venueSymbol,
					side: p.side === "long" ? "SELL" : "BUY",
					positionSide: p.side === "long" ? "LONG" : "SHORT",
					type: "MARKET",
					quantity: p.qty,
					clientOrderID: c
				});
				record(c, "protect", p.venueSymbol, p.side === "long" ? 1 : -1, "C", p.qty, 0, "ok", "unprotected position closed");
				status.closed++;
			} catch (err) {
				rt.db.event("error", `live protective close ${p.venueSymbol} FAILED: ${err instanceof Error ? err.message : err}`);
			}
		}
		if (!plan.entries.length || !alive()) return status;
		const specs = await fetchContracts(network);
		const ticks = await rt.freshTickers();
		if (Date.now() - rt.tickersAt > 3e4) {
			status.skipped.push({
				sym: "*",
				why: "prices older than 30 s — no entries this step"
			});
			return status;
		}
		const fresh = new Map(ticks.map((t) => [t.sym, t.last]));
		for (const e of plan.entries) {
			if (!alive()) break;
			const spec = specs.get(e.sym) ?? null;
			const px = fresh.get(e.sym) ?? 0;
			if (!(px > 0)) {
				status.skipped.push({
					sym: e.sym,
					why: "no fresh price"
				});
				continue;
			}
			const minNotional = exchangeMinNotional(spec, px);
			if (minNotional > s.notionalUsd) {
				status.skipped.push({
					sym: e.sym,
					why: `exchange minimum $${minNotional.toFixed(2)} > notional $${s.notionalUsd}`
				});
				continue;
			}
			const qty = snapQtyDown(s.notionalUsd / px, spec);
			if (!(qty > 0) || qty * px > s.notionalUsd * 1.0001) {
				status.skipped.push({
					sym: e.sym,
					why: "size rounds outside the notional cap"
				});
				continue;
			}
			const side = e.side === 1 ? "BUY" : "SELL";
			const exitSide = e.side === 1 ? "SELL" : "BUY";
			const positionSide = e.side === 1 ? "LONG" : "SHORT";
			const key = `${e.cfg}|${e.sym}|${e.barT}`;
			const coid = makeCoid(s.connId, "E");
			record(coid, e.cfg, e.sym, e.side, "E", qty, px, "pending", key);
			try {
				await signed(network, s.connId, "POST", "/openApi/swap/v2/trade/order", {
					symbol: e.sym,
					side,
					positionSide,
					type: "MARKET",
					quantity: qty,
					clientOrderID: coid
				});
				record(coid, e.cfg, e.sym, e.side, "E", qty, px, "ok", key);
				status.placed++;
			} catch (err) {
				record(coid, e.cfg, e.sym, e.side, "E", qty, px, "pending", key);
				rt.db.event("error", `live entry ${e.sym}: ${err instanceof Error ? err.message : err} — state unknown, re-checked next step`);
				continue;
			}
			const sl = snapPx(e.side === 1 ? px * (1 - e.sl) : px * (1 + e.sl), spec);
			const tp = snapPx(e.side === 1 ? px * (1 + e.tp) : px * (1 - e.tp), spec);
			let protectedOk = true;
			for (const [kind, type, stopPrice] of [[
				"S",
				"STOP_MARKET",
				sl
			], [
				"T",
				"TAKE_PROFIT_MARKET",
				tp
			]]) {
				const c = makeCoid(s.connId, kind);
				try {
					await signed(network, s.connId, "POST", "/openApi/swap/v2/trade/order", {
						symbol: e.sym,
						side: exitSide,
						positionSide,
						type,
						stopPrice,
						closePosition: "true",
						workingType: "MARK_PRICE",
						clientOrderID: c
					});
					record(c, e.cfg, e.sym, e.side, kind, qty, stopPrice, "ok", key);
				} catch (err) {
					protectedOk = false;
					record(c, e.cfg, e.sym, e.side, kind, qty, stopPrice, "error", key);
					rt.db.event("error", `live ${kind} ${e.sym}: ${err instanceof Error ? err.message : err}`);
				}
			}
			if (!protectedOk) {
				const c = makeCoid(s.connId, "C");
				try {
					await signed(network, s.connId, "POST", "/openApi/swap/v2/trade/order", {
						symbol: e.sym,
						side: exitSide,
						positionSide,
						type: "MARKET",
						quantity: qty,
						clientOrderID: c
					});
					record(c, e.cfg, e.sym, e.side, "C", qty, px, "ok", key);
					status.closed++;
				} catch (err) {
					record(c, e.cfg, e.sym, e.side, "C", qty, px, "error", key);
					rt.db.event("error", `live protective close ${e.sym} FAILED: ${err instanceof Error ? err.message : err}`);
				}
			}
		}
	} catch (err) {
		status.error = err instanceof Error ? err.message : String(err);
	}
	rt.db.kvSet("liveStatus", status);
	return status;
}
/** Paper positions of every lane → contributions (one per lane position, with its Block volume). */
function laneContributions(rt) {
	return rt.paper.positions.map((p) => ({
		cfg: p.cfg,
		sym: p.sym,
		side: p.side,
		vol: p.vol ?? 1,
		sl: Math.abs(p.entry - p.stop) / p.entry || .05
	}));
}
async function runControl(rt, gen, ex) {
	const s = rt.settings.live;
	const status = {
		at: Date.now(),
		enabled: false,
		reason: "",
		placed: 0,
		closed: 0,
		cancelled: 0,
		skipped: [],
		error: null,
		mode: "overall"
	};
	const alive = () => rt.generation === gen;
	const prev = rt.db.kvGet("controlStatus");
	const fill = (coid, a, kind, qty, refPx, resp) => {
		const f = parseFill(resp);
		if (!f || !(refPx > 0)) return;
		rt.db.run("INSERT OR REPLACE INTO live_fills (coid, sym, side, kind, qty, ref_px, fill_px, fee, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", coid, a.sym, a.side, kind, qty, refPx, f.px, f.fee, Date.now());
	};
	const record = (coid, a, kind, qty, px, st, msg = "") => rt.db.run("INSERT OR REPLACE INTO live_orders (coid, cfg, sym, side, kind, qty, px, status, msg, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", coid, `control|${a.key}`, a.sym, a.side, kind, qty, px, st, msg, Date.now());
	try {
		const envArmed = process.env.CTS_CORE_LIVE === "1";
		const sim = rt.sim;
		const minPf = rt.settings.gates.minPf;
		if (!s.enabled) return done(rt, status, "live disabled in settings");
		if (!envArmed) return done(rt, status, "CTS_CORE_LIVE=1 not set on the host");
		if (!ex.hasKeys()) return done(rt, status, `no API keys for ${s.connId}`);
		if (!sim || sim.stats.pf < minPf || !sim.stable) return done(rt, status, !sim ? "not ready: no simulated run yet" : `not ready: simulated run PF ${sim.stats.pf.toFixed(2)} (min ${minPf})${sim.stable ? "" : ", not stable"}`);
		const connHash = stateHash([ex.fingerprint()]);
		const reconnected = !!prev && prev.connHash !== connHash;
		if (reconnected) rt.db.event("warn", `live connection changed (${prev.connHash} → ${connHash}): full re-sync from the exchange book`);
		const book = await ex.book();
		const recent = new Set(rt.db.all("SELECT DISTINCT substr(cfg, 9) AS k FROM live_orders WHERE cfg LIKE 'control|%' AND kind IN ('O', 'I') AND status IN ('ok', 'pending') AND at > ?", Date.now() - 6e5).map((r) => r.k));
		const { held, foreign } = controlOwnership(book, s.connId, recent);
		const specs = await ex.contracts();
		const prices = new Map((await rt.freshTickers()).map((t) => [t.sym, t.last]));
		const pricesFresh = Date.now() - rt.tickersAt <= 3e4;
		const { targets, skipped } = controlTargets(laneContributions(rt), prices, {
			notionalUsd: s.notionalUsd,
			ratio: s.ratio ?? 1,
			maxNotionalUsd: s.maxNotionalUsd ?? s.notionalUsd * 5,
			maxPositions: s.maxPositions,
			rebalancePct: s.rebalancePct ?? .25,
			positionMode: s.positionMode ?? "hedge"
		}, (sym, q) => snapQtyDown(q, specs.get(sym) ?? null));
		const bookParts = [...[...held.entries()].sort().map(([k, q]) => `P:${k}:${q}`), ...book.orders.filter((o) => isOwnCoid(o.clientOrderId, s.connId)).map((o) => `O:${o.clientOrderId}`).sort()];
		const plan = planControl({
			targets,
			held,
			foreign,
			rebalancePct: s.rebalancePct ?? .25,
			bookParts
		});
		status.enabled = true;
		status.reason = "armed (overall control orders)";
		status.skipped = [...skipped, ...plan.skipped];
		const unchanged = !reconnected && !!prev && prev.targetsHash === plan.hashes.targets && prev.bookHash === plan.hashes.book && plan.actions.length === 0;
		const control = {
			at: Date.now(),
			connHash,
			targetsHash: plan.hashes.targets,
			bookHash: plan.hashes.book,
			planHash: plan.hashes.plan,
			reconnected,
			unchanged,
			steps: (prev?.steps ?? 0) + 1,
			changes: (prev?.changes ?? 0) + (unchanged ? 0 : 1),
			targets: plan.targets,
			held: [...held.entries()].map(([key, qty]) => ({
				key,
				qty
			})),
			actions: []
		};
		status.control = control;
		const posMode = s.positionMode ?? "hedge";
		const marginMode = s.marginMode ?? "cross";
		const oneway = posMode === "oneway";
		const modes = rt.db.kvGet("liveModes") ?? {
			key: "",
			margin: {}
		};
		let modeError = null;
		const modeKey = `${connHash}|${posMode}`;
		if (modes.key !== modeKey) {
			try {
				await ex.setPositionMode?.(posMode);
				modes.key = modeKey;
				modes.margin = {};
			} catch (err) {
				const msg = err instanceof Error ? err.message : String(err);
				if (alreadySet(msg)) {
					modes.key = modeKey;
					modes.margin = {};
				} else modeError = `position mode ${posMode} not applied: ${msg}`;
			}
			rt.db.kvSet("liveModes", modes);
		}
		if (modeError) {
			status.reason = `armed — opening blocked: ${modeError}`;
			rt.db.event("error", `live: ${modeError}`);
		}
		const ensureMargin = async (sym) => {
			if (modes.margin[sym] === marginMode) return;
			try {
				await ex.setMarginMode?.(sym, marginMode);
			} catch (err) {
				const msg = err instanceof Error ? err.message : String(err);
				if (!alreadySet(msg)) throw new Error(`margin mode ${marginMode} not applied: ${msg}`);
			}
			modes.margin[sym] = marginMode;
			rt.db.kvSet("liveModes", modes);
		};
		for (const o of book.orders) {
			if (!alive()) break;
			if (!isOwnCoid(o.clientOrderId, s.connId) || !o.id) continue;
			if (!book.positions.some((p) => p.venueSymbol === o.venueSymbol && (!o.positionSide || p.side === "long" === (o.positionSide === "LONG"))) && await ex.cancel(o.venueSymbol, o.id)) status.cancelled++;
		}
		const closing = new Set(plan.actions.filter((a) => a.kind === "close").map((a) => a.key));
		for (const [key, qty] of held) {
			if (!alive()) break;
			if (closing.has(key)) continue;
			const [sym, sd] = key.split("|");
			const side = Number(sd) === 1 ? 1 : -1;
			const positionSide = oneway ? "BOTH" : side === 1 ? "LONG" : "SHORT";
			if (book.orders.some((o) => o.venueSymbol === sym && isOwnCoid(o.clientOrderId, s.connId) && (oneway || !o.positionSide || o.positionSide === positionSide))) continue;
			const px = prices.get(sym) ?? 0;
			const spec = specs.get(sym) ?? null;
			const dist = plan.targets.find((t) => t.key === key)?.stopDist ?? .05;
			const a = {
				key,
				sym,
				side
			};
			const sc = makeCoid(s.connId, "S");
			try {
				if (!(px > 0)) throw new Error("no fresh price");
				const stopPrice = snapPx(side === 1 ? px * (1 - dist) : px * (1 + dist), spec);
				await ex.order({
					symbol: sym,
					side: side === 1 ? "SELL" : "BUY",
					positionSide,
					type: "STOP_MARKET",
					stopPrice,
					closePosition: "true",
					workingType: "MARK_PRICE",
					clientOrderID: sc
				});
				record(sc, a, "S", qty, stopPrice, "ok", "repair");
				rt.db.event("warn", `control ${key}: protective stop was missing — re-placed`);
			} catch (err) {
				record(sc, a, "S", qty, 0, "error", "repair");
				try {
					const cc = makeCoid(s.connId, "C");
					await ex.order({
						symbol: sym,
						side: side === 1 ? "SELL" : "BUY",
						positionSide,
						type: "MARKET",
						quantity: qty,
						clientOrderID: cc,
						...oneway ? { reduceOnly: "true" } : {}
					});
					record(cc, a, "X", qty, px, "ok", "protective close (stop repair failed)");
					status.closed++;
					held.delete(key);
				} catch (e2) {
					rt.db.event("error", `control ${key}: UNPROTECTED — stop repair and close failed: ${e2 instanceof Error ? e2.message : e2} (${err instanceof Error ? err.message : err})`);
				}
			}
		}
		for (const a of plan.actions) {
			if (!alive()) break;
			const spec = specs.get(a.sym) ?? null;
			const px = prices.get(a.sym) ?? 0;
			const positionSide = oneway ? "BOTH" : a.side === 1 ? "LONG" : "SHORT";
			const into = a.side === 1 ? "BUY" : "SELL";
			const out = a.side === 1 ? "SELL" : "BUY";
			const reduceOnly = oneway ? { reduceOnly: "true" } : {};
			const res = {
				...a,
				ok: false
			};
			control.actions.push(res);
			try {
				if (a.kind === "open" || a.kind === "increase") {
					if (!pricesFresh) throw new Error("prices older than 30 s — not opening / increasing");
					if (modeError) throw new Error(modeError);
					await ensureMargin(a.sym);
					const qty = snapQtyDown(a.qty, spec);
					if (!(px > 0)) throw new Error("no fresh price");
					if (!(qty > 0) || qty * px < exchangeMinNotional(spec, px)) throw new Error("below the exchange minimum");
					const coid = makeCoid(s.connId, "E");
					record(coid, a, a.kind === "open" ? "O" : "I", qty, px, "pending");
					const resp = await ex.order({
						symbol: a.sym,
						side: into,
						positionSide,
						type: "MARKET",
						quantity: qty,
						clientOrderID: coid
					});
					record(coid, a, a.kind === "open" ? "O" : "I", qty, px, "ok");
					fill(coid, a, a.kind === "open" ? "O" : "I", qty, px, resp);
					status.placed++;
					if (a.kind === "open") {
						const stopPrice = snapPx(a.side === 1 ? px * (1 - a.stopDist) : px * (1 + a.stopDist), spec);
						const sc = makeCoid(s.connId, "S");
						try {
							await ex.order({
								symbol: a.sym,
								side: out,
								positionSide,
								type: "STOP_MARKET",
								stopPrice,
								closePosition: "true",
								workingType: "MARK_PRICE",
								clientOrderID: sc
							});
							record(sc, a, "S", qty, stopPrice, "ok");
						} catch (err) {
							record(sc, a, "S", qty, stopPrice, "error", String(err instanceof Error ? err.message : err));
							const cc = makeCoid(s.connId, "C");
							await ex.order({
								symbol: a.sym,
								side: out,
								positionSide,
								type: "MARKET",
								quantity: qty,
								clientOrderID: cc,
								...reduceOnly
							});
							record(cc, a, "X", qty, px, "ok", "protective close");
							status.closed++;
							throw new Error(`stop failed, position closed: ${err instanceof Error ? err.message : err}`);
						}
					}
				} else {
					const qty = a.kind === "close" ? a.qty : snapQtyDown(a.qty, spec);
					if (!(qty > 0)) throw new Error("reduce rounds to zero");
					const coid = makeCoid(s.connId, "C");
					record(coid, a, a.kind === "close" ? "X" : "R", qty, px, "pending");
					const resp = await ex.order({
						symbol: a.sym,
						side: out,
						positionSide,
						type: "MARKET",
						quantity: qty,
						clientOrderID: coid,
						...reduceOnly
					});
					record(coid, a, a.kind === "close" ? "X" : "R", qty, px, "ok");
					fill(coid, a, a.kind === "close" ? "X" : "R", qty, px, resp);
					if (a.kind === "close") {
						status.closed++;
						for (const o of book.orders) if (o.id && o.venueSymbol === a.sym && isOwnCoid(o.clientOrderId, s.connId) && (oneway || !o.positionSide || o.positionSide === positionSide) && await ex.cancel(o.venueSymbol, o.id)) status.cancelled++;
					}
				}
				res.ok = true;
			} catch (err) {
				res.msg = err instanceof Error ? err.message : String(err);
				rt.db.event("error", `control ${a.kind} ${a.key}: ${res.msg}`);
			}
		}
		rt.db.kvSet("controlStatus", control);
	} catch (err) {
		status.error = err instanceof Error ? err.message : String(err);
		rt.db.event("error", `live control step: ${status.error}`);
	}
	rt.db.kvSet("liveStatus", status);
	return status;
}
function done(rt, status, reason) {
	status.reason = reason;
	rt.db.kvSet("liveStatus", status);
	return status;
}
//#endregion
export { stepLive };
