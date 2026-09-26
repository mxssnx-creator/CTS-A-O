//#region node_modules/.nitro/vite/services/ssr/assets/live-CTLoAJt_.js
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
export { controlOwnership, controlTargets, isOwnCoid, liveNetwork, makeCoid, ownSymbols, planControl, planLive, stateHash };
