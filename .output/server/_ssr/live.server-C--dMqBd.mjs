import { ExchangeRejected, HOSTS, cancelOrder, exchangeMinNotional, fetchBook, fetchContracts, fetchEquity, keysFor, setMarginMode, setPositionMode, signed, snapPx, snapQtyDown, snapQtyExchange } from "./bingx.server-mUvF8FQo.mjs";
import { a as unitNotional, i as sizingSettings } from "./sizing-DzKTMogO.mjs";
import { controlOwnership, controlTargets, externalCloses, isOwnCoid, lanesByKey, liveNetwork, makeCoid, ownSymbols, planControl, planLive, stateHash } from "./live-s0eY_ICy.mjs";
import { createHash } from "node:crypto";
//#region node_modules/.nitro/vite/services/ssr/assets/live.server-C--dMqBd.js
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
/**
* The exchange book is re-read over REST at most every `syncMs` (the live step runs every tick, 100 ms); an own
* order or cancel forces the next read, so decisions never act on a book that predates our own change.
* Contract specs change rarely: cached 10 minutes.
*/
var bookCache = /* @__PURE__ */ new Map();
var contractCache = /* @__PURE__ */ new Map();
function cachedClient(ex, syncMs) {
	const key = () => ex.fingerprint();
	const touch = () => {
		const c = bookCache.get(key());
		if (c) c.dirty = true;
	};
	return {
		...ex,
		book: async () => {
			const c = bookCache.get(key());
			if (c && !c.dirty && Date.now() - c.at < syncMs) return c.book;
			const book = await ex.book();
			bookCache.set(key(), {
				at: Date.now(),
				book,
				dirty: false
			});
			return book;
		},
		contracts: async () => {
			const c = contractCache.get(key());
			if (c && Date.now() - c.at < 6e5) return c.specs;
			const specs = await ex.contracts();
			contractCache.set(key(), {
				at: Date.now(),
				specs
			});
			return specs;
		},
		order: async (p) => {
			touch();
			try {
				return await ex.order(p);
			} finally {
				touch();
			}
		},
		cancel: async (sym, id) => {
			touch();
			try {
				return await ex.cancel(sym, id);
			} finally {
				touch();
			}
		}
	};
}
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
		setMarginMode: (sym, mode) => setMarginMode(network, connId, sym, mode),
		equity: () => fetchEquity(network, connId)
	};
}
/**
* Notional of one live order unit: fixed % of the account equity (read at most every 30 s; a failed read keeps the
* last known equity), or the fixed notional. null in the %-of-equity mode while the equity is unknown (never read,
* or the exchange reports none): nothing opens or grows then — never sized from the paper balance on a real
* account. A client without an equity read (paper / simulated exchange) sizes from the paper balance.
* The per-position cap (maxNotionalUsd) still applies.
*/
var equityCache = /* @__PURE__ */ new Map();
async function liveUnit(rt, ex) {
	const s = rt.settings.live;
	const sz = sizingSettings(rt.settings.sizing);
	if (sz.mode === "fixed") return s.notionalUsd;
	if (!ex.equity) return unitNotional(sz, rt.settings.paperBalance, s.notionalUsd);
	const k = ex.fingerprint();
	let c = equityCache.get(k);
	if (!c || Date.now() - c.at > 3e4) {
		let eq = null;
		try {
			eq = await ex.equity() ?? null;
		} catch {
			eq = c?.eq ?? null;
		}
		c = {
			at: Date.now(),
			eq
		};
		equityCache.set(k, c);
	}
	return c.eq === null ? null : unitNotional(sz, c.eq, s.notionalUsd);
}
/** The unit the control preview shows: the last equity read for the connection (no exchange call), else the paper balance. */
function liveUnitPeek(rt) {
	const s = rt.settings.live;
	const sz = sizingSettings(rt.settings.sizing);
	if (sz.mode === "fixed") return {
		unit: s.notionalUsd,
		from: "fixed"
	};
	for (const [k, c] of equityCache) if (k.startsWith(`${s.connId}|`) && c.eq !== null) return {
		unit: unitNotional(sz, c.eq, s.notionalUsd),
		from: "equity"
	};
	return {
		unit: unitNotional(sz, rt.settings.paperBalance, s.notionalUsd),
		from: "paper"
	};
}
/** The control sizing of the live settings for one lane unit — shared by the live step and the preview. */
function controlSettingsOf(s, unit) {
	return {
		notionalUsd: unit,
		ratio: s.ratio ?? 1,
		maxNotionalUsd: s.maxNotionalUsd ?? s.notionalUsd * 5,
		maxPositions: s.maxPositions,
		rebalancePct: s.rebalancePct ?? .25,
		positionMode: s.positionMode ?? "hedge",
		minStopPct: s.minStopPct ?? .01
	};
}
var backoff = /* @__PURE__ */ new Map();
function waiting(k) {
	const b = backoff.get(k);
	return b && Date.now() < b.until ? b.msg : null;
}
function failed(k, msg, baseMs, maxMs) {
	const n = (backoff.get(k)?.n ?? 0) + 1;
	backoff.set(k, {
		n,
		until: Date.now() + Math.min(maxMs, baseMs * 2 ** (n - 1)),
		msg
	});
}
var cleared = (k) => backoff.delete(k);
var OPEN_BACKOFF = [6e4, 18e5];
var EXIT_BACKOFF = [5e3, 6e4];
/** an action held back by a condition that clears by itself (not a failure: no backoff, no error event) */
var holdOn = (msg) => Object.assign(new Error(msg), { hold: true });
var errText = (err) => err instanceof Error ? err.message : String(err);
var running = null;
/** Serialised entry point: overlapping calls wait for the running step instead of racing it. */
function stepLive(rt, intents, gen, client) {
	rt.flushLive ??= () => flushLiveKv(rt.db);
	const next = (running ?? Promise.resolve(null)).then(() => (rt.settings.live.mode ?? "overall") === "overall" ? runControl(rt, gen, client ?? cachedClient(bingxClient(rt.settings.live.connId), rt.settings.live.syncMs ?? 1e3)) : runStep(rt, intents, gen));
	const tail = next.then(() => void 0, () => void 0).finally(() => {
		if (running === tail) running = null;
	});
	running = tail;
	return next;
}
var lastEntries = null;
/** entry keys already recorded (sent or tried): an intent stays pending for its whole bar but is sent once */
var entriesSent = /* @__PURE__ */ new Set();
var intentKey = (i) => `${i.cfg}|${i.sym}|${i.barT}`;
async function runStep(rt, intents, gen) {
	const s = rt.settings.live;
	if (!intents.filter((i) => !entriesSent.has(intentKey(i))).length && lastEntries && Date.now() - lastEntries.at < (s.syncMs ?? 1e3)) return lastEntries.status;
	const st = await runStepNow(rt, intents, gen);
	lastEntries = {
		at: Date.now(),
		status: st
	};
	return st;
}
async function runStepNow(rt, intents, gen) {
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
		const oneway = (s.positionMode ?? "hedge") === "oneway";
		const reduceOnly = oneway ? { reduceOnly: "true" } : {};
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
		} : s.requireReady === false ? {
			ok: true,
			why: ""
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
		for (const i of intents) if (sent.has(intentKey(i))) entriesSent.add(intentKey(i));
		if (entriesSent.size > 2e4) entriesSent.clear();
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
				sl: Math.max(i.protect.sl, s.minStopPct ?? .01),
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
					positionSide: oneway ? "BOTH" : p.side === "long" ? "LONG" : "SHORT",
					type: "MARKET",
					quantity: p.qty,
					clientOrderID: c,
					...reduceOnly
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
		const raw = await liveUnit(rt, bingxClient(s.connId));
		if (raw === null) {
			status.skipped.push({
				sym: "*",
				why: "account equity unknown — no entries this step"
			});
			return status;
		}
		const unit = Math.min(raw, s.maxNotionalUsd ?? s.notionalUsd * 5);
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
			if (minNotional > unit) {
				status.skipped.push({
					sym: e.sym,
					why: `exchange minimum $${minNotional.toFixed(2)} > notional $${unit.toFixed(2)}`
				});
				continue;
			}
			const qty = snapQtyDown(unit / px, spec);
			if (!(qty > 0) || qty * px > unit * 1.0001) {
				status.skipped.push({
					sym: e.sym,
					why: "size rounds outside the notional cap"
				});
				continue;
			}
			const side = e.side === 1 ? "BUY" : "SELL";
			const exitSide = e.side === 1 ? "SELL" : "BUY";
			const positionSide = oneway ? "BOTH" : e.side === 1 ? "LONG" : "SHORT";
			const key = `${e.cfg}|${e.sym}|${e.barT}`;
			const coid = makeCoid(s.connId, "E");
			record(coid, e.cfg, e.sym, e.side, "E", qty, px, "pending", key);
			entriesSent.add(key);
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
				record(coid, e.cfg, e.sym, e.side, "E", qty, px, err instanceof ExchangeRejected ? "error" : "pending", key);
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
						clientOrderID: c,
						...reduceOnly
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
	liveKvSet(rt.db, "liveStatus", status);
	return status;
}
var liveMem = /* @__PURE__ */ new WeakMap();
var flushTimers = /* @__PURE__ */ new WeakMap();
function memOf(db) {
	let m = liveMem.get(db);
	if (!m) liveMem.set(db, m = /* @__PURE__ */ new Map());
	return m;
}
/** Newest live state value (memory first, else the persisted copy). */
function liveKv(db, key) {
	const e = memOf(db).get(key);
	if (e) return structuredClone(e.v);
	const v = db.kvGet(key) ?? null;
	if (v !== null) memOf(db).set(key, {
		v: structuredClone(v),
		wroteAt: Date.now(),
		dirty: false
	});
	return v;
}
function liveKvSet(db, key, v0) {
	const v = structuredClone(v0);
	const m = memOf(db);
	const e = m.get(key);
	const now = Date.now();
	if (!e || now - e.wroteAt >= 1e3) {
		db.kvSet(key, v);
		m.set(key, {
			v,
			wroteAt: now,
			dirty: false
		});
		return;
	}
	m.set(key, {
		v,
		wroteAt: e.wroteAt,
		dirty: true
	});
	if (!flushTimers.has(db)) {
		const t = setTimeout(() => {
			flushTimers.delete(db);
			flushLiveKv(db);
		}, 1e3);
		t.unref?.();
		flushTimers.set(db, t);
	}
}
/** Persist every live state value changed since its last write (shutdown, snapshot). */
function flushLiveKv(db) {
	const m = liveMem.get(db);
	if (!m) return;
	for (const [k, e] of m) if (e.dirty) {
		db.kvSet(k, e.v);
		m.set(k, {
			v: e.v,
			wroteAt: Date.now(),
			dirty: false
		});
	}
}
/** Paper positions of every lane → contributions (one per lane position, with its Block volume). */
function laneContributions(rt) {
	return rt.paper.positions.filter((p) => !p.stopHit).map((p) => ({
		id: `${p.cfg}|${p.sym}|${p.entryT}`,
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
	const prev = liveKv(rt.db, "controlStatus");
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
		const notReady = !sim || s.requireReady !== false && (sim.stats.pf < minPf || !sim.stable) ? !sim ? "not ready: no simulated run yet" : `not ready: simulated run PF ${sim.stats.pf.toFixed(2)} (min ${minPf})${sim.stable ? "" : ", not stable"}` : null;
		const connHash = stateHash([ex.fingerprint()]);
		const reconnected = !!prev && prev.connHash !== connHash;
		if (reconnected) rt.db.event("warn", `live connection changed (${prev.connHash} → ${connHash}): full re-sync from the exchange book`);
		const book = await ex.book();
		const recent = new Set(rt.db.all("SELECT DISTINCT substr(cfg, 9) AS k FROM live_orders WHERE cfg LIKE 'control|%' AND kind IN ('O', 'I') AND status IN ('ok', 'pending') AND at > ?", Date.now() - 6e5).map((r) => r.k));
		const { held, foreign } = controlOwnership(book, s.connId, recent);
		const specs = await ex.contracts();
		const prices = new Map((await rt.freshTickers()).map((t) => [t.sym, t.last]));
		const pricesFresh = Date.now() - rt.tickersAt <= 3e4;
		const suppressed = liveKv(rt.db, "controlSuppressed") ?? {};
		if (!reconnected) for (const x of externalCloses(prev, held)) {
			for (const id of x.lanes) suppressed[id] = {
				key: x.key,
				at: Date.now()
			};
			rt.db.event("warn", `live: ${x.key} was closed outside CTS-A-O — its ${x.lanes.length} lane order(s) will not reopen it; new orders on it still trade`);
		}
		const allLanes = laneContributions(rt);
		const openIds = new Set(allLanes.map((c) => c.id));
		for (const id of Object.keys(suppressed)) if (!openIds.has(id)) delete suppressed[id];
		liveKvSet(rt.db, "controlSuppressed", suppressed);
		const lanes = allLanes.filter((c) => !c.id || !suppressed[c.id]);
		const unit = await liveUnit(rt, ex);
		const { targets, skipped } = controlTargets(lanes, prices, controlSettingsOf(s, unit ?? 0), (sym, q, px) => snapQtyExchange(q, px, specs.get(sym) ?? null));
		const keep = new Set(skipped.flatMap((x) => x.keep ? [x.keep] : []));
		if (unit === null) for (const l of lanes) keep.add(`${l.sym}|${l.side}`);
		const openBlock = notReady ?? (unit === null ? "account equity unknown — not sizing" : null);
		const bookParts = [...[...held.entries()].sort().map(([k, q]) => `P:${k}:${q}`), ...book.orders.filter((o) => isOwnCoid(o.clientOrderId, s.connId)).map((o) => `O:${o.clientOrderId}`).sort()];
		const plan = planControl({
			targets,
			held,
			foreign,
			rebalancePct: s.rebalancePct ?? .25,
			bookParts,
			keep
		});
		status.enabled = true;
		status.reason = openBlock ? `armed — opening blocked: ${openBlock}` : "armed (overall control orders)";
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
			actions: [],
			lanes: lanesByKey(lanes),
			suppressed: Object.keys(suppressed).length
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
		const modeWait = `${connHash}|mode`;
		if (modes.key !== modeKey) {
			modeError = waiting(modeWait);
			if (!modeError) {
				try {
					await ex.setPositionMode?.(posMode);
					modes.key = modeKey;
					modes.margin = {};
					cleared(modeWait);
				} catch (err) {
					const msg = errText(err);
					if (alreadySet(msg)) {
						modes.key = modeKey;
						modes.margin = {};
						cleared(modeWait);
					} else {
						modeError = `position mode ${posMode} not applied: ${msg}`;
						failed(modeWait, modeError, ...OPEN_BACKOFF);
						rt.db.event("error", `live: ${modeError}`);
					}
				}
				rt.db.kvSet("liveModes", modes);
			}
		}
		if (modeError) status.reason = `armed — opening blocked: ${modeError}`;
		const ensureMargin = async (sym) => {
			if (modes.margin[sym] === marginMode) return;
			const k = `${connHash}|margin|${sym}`;
			const w = waiting(k);
			if (w) throw new Error(w);
			try {
				await ex.setMarginMode?.(sym, marginMode);
			} catch (err) {
				const msg = errText(err);
				if (!alreadySet(msg)) {
					const m = `margin mode ${marginMode} not applied: ${msg}`;
					failed(k, m, ...OPEN_BACKOFF);
					throw new Error(m);
				}
			}
			cleared(k);
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
			const repairKey = `${connHash}|repair|${key}`;
			if (waiting(repairKey)) continue;
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
				cleared(repairKey);
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
					failed(`${connHash}|open|${key}`, `stop repair failed: ${errText(err)}`, ...OPEN_BACKOFF);
					cleared(repairKey);
				} catch (e2) {
					failed(repairKey, errText(e2), ...EXIT_BACKOFF);
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
			const grows = a.kind === "open" || a.kind === "increase";
			const waitKey = `${connHash}|${grows ? "open" : "exit"}|${a.key}`;
			const w = waiting(waitKey);
			if (w) {
				res.msg = `waiting after a failure: ${w}`;
				continue;
			}
			let sent = null;
			try {
				if (grows) {
					if (!pricesFresh) throw holdOn("prices older than 30 s — not opening / increasing");
					if (openBlock) throw holdOn(openBlock);
					if (modeError) throw holdOn(modeError);
					await ensureMargin(a.sym);
					const qty = snapQtyDown(a.qty, spec);
					if (!(px > 0)) throw new Error("no fresh price");
					if (!(qty > 0) || qty * px < exchangeMinNotional(spec, px)) throw new Error("below the exchange minimum");
					const coid = makeCoid(s.connId, "E");
					sent = {
						coid,
						kind: a.kind === "open" ? "O" : "I",
						qty,
						px
					};
					record(coid, a, sent.kind, qty, px, "pending");
					const resp = await ex.order({
						symbol: a.sym,
						side: into,
						positionSide,
						type: "MARKET",
						quantity: qty,
						clientOrderID: coid
					});
					record(coid, a, sent.kind, qty, px, "ok");
					fill(coid, a, sent.kind, qty, px, resp);
					sent = null;
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
					sent = {
						coid,
						kind: a.kind === "close" ? "X" : "R",
						qty,
						px
					};
					record(coid, a, sent.kind, qty, px, "pending");
					const resp = await ex.order({
						symbol: a.sym,
						side: out,
						positionSide,
						type: "MARKET",
						quantity: qty,
						clientOrderID: coid,
						...reduceOnly
					});
					record(coid, a, sent.kind, qty, px, "ok");
					fill(coid, a, sent.kind, qty, px, resp);
					sent = null;
					if (a.kind === "close") {
						status.closed++;
						for (const o of book.orders) if (o.id && o.venueSymbol === a.sym && isOwnCoid(o.clientOrderId, s.connId) && (oneway || !o.positionSide || o.positionSide === positionSide) && await ex.cancel(o.venueSymbol, o.id)) status.cancelled++;
					}
				}
				res.ok = true;
				cleared(waitKey);
			} catch (err) {
				res.msg = errText(err);
				if (sent && err instanceof ExchangeRejected) record(sent.coid, a, sent.kind, sent.qty, sent.px, "error", res.msg);
				if (!err.hold) {
					const [base, max] = grows ? OPEN_BACKOFF : EXIT_BACKOFF;
					failed(waitKey, res.msg, base, max);
					rt.db.event("error", `control ${a.kind} ${a.key}: ${res.msg}`);
				}
			}
		}
		liveKvSet(rt.db, "controlStatus", control);
	} catch (err) {
		status.error = err instanceof Error ? err.message : String(err);
		rt.db.event("error", `live control step: ${status.error}`);
	}
	liveKvSet(rt.db, "liveStatus", status);
	return status;
}
function done(rt, status, reason) {
	status.reason = reason;
	liveKvSet(rt.db, "liveStatus", status);
	return status;
}
//#endregion
export { controlSettingsOf, liveKv, liveUnitPeek, stepLive };
