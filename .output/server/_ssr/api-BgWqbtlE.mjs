import { t as __exportAll } from "./rolldown-runtime-D7D4PA-g.mjs";
import { n as TSS_SERVER_FUNCTION, t as createServerFn } from "./ssr.mjs";
import { n as checkSettings, t as checkMerged } from "./settings-check-Bcofhpy4.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/api-BgWqbtlE.js
var createServerRpc = (serverFnMeta, splitImportFn) => {
	const url = "/_serverFn/" + serverFnMeta.id;
	return Object.assign(splitImportFn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
/** Open positions (distinct symbol × direction) and orders (partials) of a book. */
function openBook(orders) {
	const keys = /* @__PURE__ */ new Set();
	let long = 0;
	let short = 0;
	for (const o of orders) {
		const k = `${o.sym}|${o.side > 0 ? 1 : -1}`;
		if (keys.has(k)) continue;
		keys.add(k);
		if (o.side > 0) long++;
		else short++;
	}
	return {
		positions: keys.size,
		orders: orders.length,
		long,
		short
	};
}
/** Closed positions: per symbol × direction, the number of episodes of overlapping orders. */
function closedPositions(trades) {
	const by = /* @__PURE__ */ new Map();
	for (const t of trades) {
		const k = `${t.sym}|${t.side > 0 ? 1 : -1}`;
		let xs = by.get(k);
		if (!xs) by.set(k, xs = []);
		xs.push([t.entryT, t.exitT]);
	}
	let n = 0;
	for (const xs of by.values()) {
		xs.sort((a, b) => a[0] - b[0]);
		let end = -Infinity;
		for (const [a, b] of xs) {
			if (a >= end) n++;
			end = Math.max(end, b);
		}
	}
	return n;
}
/**
* Time-weighted average and peak of open positions and open orders over [startT, endT).
*/
function openTimeline(trades, startT, endT) {
	const span = Math.max(1, endT - startT);
	const ev = [];
	for (const t of trades) {
		const a = Math.max(startT, t.entryT);
		const b = Math.min(endT, t.exitT);
		if (b <= a) continue;
		const k = `${t.sym}|${t.side > 0 ? 1 : -1}`;
		ev.push([
			a,
			1,
			k
		], [
			b,
			-1,
			k
		]);
	}
	ev.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
	const per = /* @__PURE__ */ new Map();
	let orders = 0;
	let positions = 0;
	let maxO = 0;
	let maxP = 0;
	let areaO = 0;
	let areaP = 0;
	let last = ev.length ? ev[0][0] : startT;
	for (const [t, d, k] of ev) {
		areaO += orders * (t - last);
		areaP += positions * (t - last);
		last = t;
		orders += d;
		const c = (per.get(k) ?? 0) + d;
		if (d > 0 && c === 1) positions++;
		if (d < 0 && c === 0) positions--;
		per.set(k, c);
		if (orders > maxO) maxO = orders;
		if (positions > maxP) maxP = positions;
	}
	return {
		avgPositions: areaP / span,
		maxPositions: maxP,
		avgOrders: areaO / span,
		maxOrders: maxO
	};
}
var api_exports = /* @__PURE__ */ __exportAll({
	coreConfig_createServerFn_handler: () => coreConfig_createServerFn_handler,
	coreControl_createServerFn_handler: () => coreControl_createServerFn_handler,
	coreEngine_createServerFn_handler: () => coreEngine_createServerFn_handler,
	coreMarket_createServerFn_handler: () => coreMarket_createServerFn_handler,
	coreMatrix_createServerFn_handler: () => coreMatrix_createServerFn_handler,
	coreOverview_createServerFn_handler: () => coreOverview_createServerFn_handler,
	corePresets_createServerFn_handler: () => corePresets_createServerFn_handler,
	coreResults_createServerFn_handler: () => coreResults_createServerFn_handler,
	coreSettings_createServerFn_handler: () => coreSettings_createServerFn_handler,
	coreSim_createServerFn_handler: () => coreSim_createServerFn_handler,
	coreStatus_createServerFn_handler: () => coreStatus_createServerFn_handler,
	coreTrading_createServerFn_handler: () => coreTrading_createServerFn_handler,
	presetAction_createServerFn_handler: () => presetAction_createServerFn_handler,
	saveCoreSettings_createServerFn_handler: () => saveCoreSettings_createServerFn_handler
});
/** Newest live state (in memory in the live step; the database copy trails it by up to ~1 s). */
async function liveState(db, key) {
	const { liveKv } = await import("./live.server-C--dMqBd.mjs");
	return liveKv(db, key);
}
async function rt() {
	const { coreRuntime } = await import("./runtime.server-D3VkG11m.mjs");
	return coreRuntime();
}
/** Server-function payloads must be serializable; this also strips typed arrays and undefined. */
var ser = (x) => JSON.parse(JSON.stringify(x ?? null));
/** Base-stage rows: stage 1, plus the Base-protect variant of pairs refined in Main (stored as stage ≥ 2). */
var BASE_ROWS = "(stage = 1 OR (ABS(tp - 0.026) < 1e-9 AND ABS(sl - 0.039) < 1e-9 AND trail = 0 AND hold = 32))";
/** Light status for the header (polled often). */
var coreStatus_createServerFn_handler = createServerRpc({
	id: "eb7aec91bc180eef0ec4436cae28e2ecb4953d45f3b32e18476e82ea68ffd427",
	name: "coreStatus",
	filename: "src/core/api.ts"
}, (opts) => coreStatus.__executeServer(opts));
var coreStatus = createServerFn({ method: "GET" }).handler(coreStatus_createServerFn_handler, async () => {
	const r = await rt();
	const st = r.status;
	const live = await liveState(r.db, "liveStatus");
	return ser({
		state: st.state,
		stage: st.stage,
		progress: st.progress,
		label: st.label,
		source: st.source,
		symbols: st.symbols.length,
		lastBarT: st.lastBarT,
		computes: st.computes,
		pending: st.pending,
		settingsAt: st.settingsAt,
		appliedSettingsAt: st.appliedSettingsAt,
		lastComputeAt: st.lastComputeAt,
		error: st.error,
		live: r.settings.live.enabled,
		liveStatus: live ? {
			enabled: live.enabled,
			reason: live.reason
		} : null,
		signals: st.signals,
		baseEvaluated: st.baseEvaluated,
		basePassed: st.basePassed
	});
});
var coreOverview_createServerFn_handler = createServerRpc({
	id: "32d99862dc108331f6ed91e05656d7f5818b34bb848fe1e329bbbcd7b240bbdf",
	name: "coreOverview",
	filename: "src/core/api.ts"
}, (opts) => coreOverview.__executeServer(opts));
var coreOverview = createServerFn({ method: "GET" }).handler(coreOverview_createServerFn_handler, async () => {
	const r = await rt();
	const db = r.db;
	const sim = r.sim;
	const pipe = db.kvGet("pipeline") ?? null;
	const counts = db.get(`SELECT (SELECT COUNT(*) FROM results WHERE ${BASE_ROWS}) AS base, (SELECT COUNT(*) FROM results WHERE stage >= 2) AS main, (SELECT COUNT(*) FROM results WHERE stage = 3) AS evaluated, (SELECT COUNT(*) FROM results WHERE armed = 1) AS armed`);
	const paperTrades = db.get("SELECT COUNT(*) AS n, COALESCE(SUM(pnl), 0) AS pnl, COALESCE(SUM(CASE WHEN r > 0 THEN r ELSE 0 END), 0) AS gp, COALESCE(SUM(CASE WHEN r < 0 THEN -r ELSE 0 END), 0) AS gl FROM paper_trades");
	return ser({
		status: r.status,
		settings: r.settings,
		wf: {
			preH: r.wf.preH,
			simH: r.wf.simH,
			portfolio: r.wf.portfolio,
			lastN: r.wf.lastN,
			longH: r.wf.longH,
			tapes: r.tapes.length,
			protects: r.wf.protects.length
		},
		counts,
		pipeline: pipe,
		sim: sim ? {
			startT: sim.startT,
			endT: sim.endT,
			stats: sim.stats,
			positions: closedPositions(sim.trades),
			hourly: sim.hourly,
			blocks: sim.blocks,
			byKind: sim.byKind,
			skips: sim.skips,
			stable: sim.stable,
			byConfig: sim.byConfig.slice(0, 12)
		} : null,
		paper: {
			selected: r.paper.selected,
			eligible: r.paper.eligible,
			positions: r.paper.positions.length,
			book: openBook(r.paper.positions),
			equity: r.paper.equity,
			balance: r.paper.balance ?? r.settings.paperBalance + r.paper.equity,
			startBalance: r.settings.paperBalance,
			sizing: r.settings.sizing,
			trades: paperTrades
		},
		live: await liveState(db, "liveStatus") ?? null,
		db: { bytes: db.bytes() },
		lanes: await laneSummary(r)
	});
});
/** Per timeframe lane: Base evaluated / passed, Main tapes, simulated trades (n, PF, net), open paper positions. */
async function laneSummary(r) {
	const { laneLabel } = await import("./registry-BrbGTniH.mjs").then((n) => n.l);
	const { passesBase } = await import("./pipeline-ijNv6iLw.mjs");
	const { statsOf } = await import("./stats-CgkRoLVg.mjs");
	const lab = (ind) => laneLabel(ind) || "plain";
	const rows = /* @__PURE__ */ new Map();
	const row = (lane) => {
		let x = rows.get(lane);
		if (!x) rows.set(lane, x = {
			lane,
			base: 0,
			passed: 0,
			tapes: 0,
			trades: [],
			open: []
		});
		return x;
	};
	for (const c of r.pipeline?.s1 ?? []) {
		const x = row(lab(c.ind));
		x.base++;
		if (passesBase(c.full, r.settings.gates)) x.passed++;
	}
	for (const t of r.tapes) row(lab(t.ind)).tapes++;
	const indOf = (cfg) => cfg.split("|")[1] ?? "";
	for (const t of r.sim?.trades ?? []) row(lab(indOf(t.cfg))).trades.push(t);
	for (const p of r.paper.positions) row(lab(indOf(p.cfg))).open.push(p);
	const order = [
		"1m",
		"1m+",
		"5m",
		"5m+",
		"15m",
		"15m+",
		"30m",
		"plain"
	];
	return [...rows.values()].sort((a, b) => order.indexOf(a.lane) - order.indexOf(b.lane)).map((x) => {
		const st = statsOf([...x.trades].sort((a, b) => a.exitT - b.exitT));
		return {
			lane: x.lane,
			base: x.base,
			passed: x.passed,
			tapes: x.tapes,
			n: st.n,
			positions: closedPositions(x.trades),
			pf: st.pf,
			net: st.net,
			wr: st.wr,
			open: openBook(x.open)
		};
	});
}
var coreResults_createServerFn_handler = createServerRpc({
	id: "7474d478cfbef3775c443f51a80c413ac2aa553145604fe15144bd68b85b107d",
	name: "coreResults",
	filename: "src/core/api.ts"
}, (opts) => coreResults.__executeServer(opts));
var coreResults = createServerFn({ method: "GET" }).validator((d) => {
	if (d?.lane !== void 0 && d.lane !== "" && !/^(1|5|15|30)c?$/.test(d.lane)) throw new Error("lane: 1, 5, 15 or 30, optionally combined (c)");
	return d ?? {};
}).handler(coreResults_createServerFn_handler, async ({ data }) => {
	const r = await rt();
	const where = [];
	const p = [];
	if (data.stage) {
		where.push(data.stage === 1 ? BASE_ROWS : "stage >= ?");
		if (data.stage !== 1) p.push(data.stage);
	}
	if (data.bot) {
		where.push("bot = ?");
		p.push(data.bot);
	}
	if (data.ind) {
		where.push("(ind = ? OR ind LIKE ?)");
		p.push(data.ind, `${data.ind}@m%`);
	}
	if (data.lane) {
		where.push("ind LIKE ?");
		p.push(`%@m${data.lane}`);
	}
	if (data.q) {
		where.push("id LIKE ?");
		p.push(`%${data.q}%`);
	}
	const sorts = {
		score: "score DESC",
		pf: "pf DESC",
		net: "net DESC",
		n: "n DESC",
		rank: "rank IS NULL, rank ASC",
		oos: "oos_pf IS NULL, oos_pf DESC",
		gh: "gh DESC"
	};
	const order = sorts[data.sort ?? "score"] ?? sorts.score;
	const limit = Math.min(1e3, Math.max(1, Math.floor(Number(data.limit) || 200)));
	return ser({
		rows: r.db.all(`SELECT * FROM results ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY ${order} LIMIT ${limit}`, ...p),
		total: r.db.get(`SELECT COUNT(*) AS n FROM results ${where.length ? `WHERE ${where.join(" AND ")}` : ""}`, ...p)?.n ?? 0
	});
});
var coreMatrix_createServerFn_handler = createServerRpc({
	id: "9d243d5d274c25d3ab7a59e28a37885e4fa4588c25dde9730ccbe561b8e78e1a",
	name: "coreMatrix",
	filename: "src/core/api.ts"
}, (opts) => coreMatrix.__executeServer(opts));
var coreMatrix = createServerFn({ method: "GET" }).handler(coreMatrix_createServerFn_handler, async () => {
	const r = await rt();
	return ser({
		rows: r.db.all(`SELECT bot, ind, n, pf, net, gh, is_pf, is_net, score FROM results WHERE ${BASE_ROWS}`),
		refined: r.db.all("SELECT bot, ind, MAX(score) AS score, MAX(oos_pf) AS oos_pf, SUM(armed) AS armed FROM results WHERE stage >= 2 GROUP BY bot, ind"),
		minPf: r.settings.gates.minPf
	});
});
var coreConfig_createServerFn_handler = createServerRpc({
	id: "51209c6f7a6ee36c665fd2316278688b46b2a5ab9a4ad8cb8345e22c6d01a156",
	name: "coreConfig",
	filename: "src/core/api.ts"
}, (opts) => coreConfig.__executeServer(opts));
var coreConfig = createServerFn({ method: "GET" }).validator((d) => {
	if (!d?.id) throw new Error("id required");
	return d;
}).handler(coreConfig_createServerFn_handler, async ({ data }) => {
	const r = await rt();
	const row = r.db.get("SELECT * FROM results WHERE id = ?", data.id) ?? null;
	const lastn = r.db.all("SELECT n, part, taken, pf, net, ddt, score FROM lastn WHERE cfg = ? ORDER BY part, n", data.id);
	const evals = r.db.all("SELECT at, win, n, pf, net, ddt, wr, pass FROM evals WHERE cfg = ? ORDER BY at DESC, win LIMIT 400", data.id);
	const trades = r.db.all("SELECT sym, side, entry_t, exit_t, entry, exit, r, reason, bars FROM tapes WHERE cfg = ? ORDER BY exit_t", data.id);
	if (!trades.length) {
		const ts = r.comboTrades(data.id) ?? [];
		for (const t of ts) trades.push({
			sym: t.sym,
			side: t.side,
			entry_t: t.entryT,
			exit_t: t.exitT,
			entry: t.entry,
			exit: t.exit,
			r: t.r,
			reason: t.reason,
			bars: t.bars
		});
	}
	return ser({
		row,
		lastn,
		evals,
		trades
	});
});
var coreSim_createServerFn_handler = createServerRpc({
	id: "189517c95f4b7ef12db13945ff1ccb1fdee09cf26dd5486a82cff17d70579451",
	name: "coreSim",
	filename: "src/core/api.ts"
}, (opts) => coreSim.__executeServer(opts));
var coreSim = createServerFn({ method: "GET" }).handler(coreSim_createServerFn_handler, async () => {
	const r = await rt();
	const sim = r.sim;
	const presets = r.db.kvGet("presetSims") ?? null;
	const runs = r.db.all("SELECT id, at, start_t, end_t, n, pf, net, gh, tph, ddt, stable FROM sim_runs ORDER BY id DESC LIMIT 60");
	if (!sim) return ser({
		sim: null,
		presets,
		runs
	});
	return ser({
		sim: {
			startT: sim.startT,
			endT: sim.endT,
			stats: sim.stats,
			positions: closedPositions(sim.trades),
			hourly: sim.hourly,
			blocks: sim.blocks,
			byKind: sim.byKind,
			skips: sim.skips,
			stable: sim.stable,
			byConfig: sim.byConfig,
			steps: sim.steps.map((s) => ({
				t: s.t,
				main: s.main,
				real: s.real.length,
				taken: s.taken,
				skipped: s.skipped,
				net: s.net
			})),
			trades: sim.trades.slice(-400).reverse(),
			opts: {
				preH: sim.opts.preH,
				simH: sim.opts.simH,
				lastN: sim.opts.lastN,
				portfolio: sim.opts.portfolio,
				toggles: sim.opts.toggles,
				block: sim.opts.block,
				dca: sim.opts.dca
			}
		},
		presets,
		runs
	});
});
/** latest paper closes listed on the Trading page */
var TRADES_SHOWN = 300;
var coreTrading_createServerFn_handler = createServerRpc({
	id: "ae76160d672121092847c837d3f2c2772b3e68f39dc3541ac32117230ed8baf2",
	name: "coreTrading",
	filename: "src/core/api.ts"
}, (opts) => coreTrading.__executeServer(opts));
var coreTrading = createServerFn({ method: "GET" }).handler(coreTrading_createServerFn_handler, async () => {
	const r = await rt();
	const units = r.paper.units;
	const unitOf = (x) => units?.get(`${x.cfg}|${x.sym}|${x.entryT}`) ?? r.settings.paperNotional;
	let realized = r.paper.carried ?? 0;
	for (const t of r.paper.trades) realized += t.r * unitOf(t);
	return ser({
		positions: [...r.paper.positions].sort((a, b) => b.entryT - a.entryT).map((p) => ({
			cfg: p.cfg,
			sym: p.sym,
			side: p.side,
			entry_t: p.entryT,
			entry: p.entry,
			stop: p.stop,
			target: p.target,
			mtm: p.mtm,
			vol: p.vol ?? 1,
			level: p.level ?? null,
			unit: unitOf(p)
		})),
		realized,
		adjustWindow: r.settings.adjust.window,
		book: openBook(r.paper.positions),
		closed: {
			orders: r.paper.trades.length,
			positions: closedPositions(r.paper.trades)
		},
		trades: r.db.all(`SELECT * FROM paper_trades ORDER BY exit_t DESC LIMIT ${TRADES_SHOWN}`),
		tradesShown: TRADES_SHOWN,
		selected: r.paper.selected,
		equity: r.paper.equity,
		balance: r.paper.balance ?? r.settings.paperBalance + r.paper.equity,
		startBalance: r.settings.paperBalance,
		sizing: r.settings.sizing,
		live: await liveState(r.db, "liveStatus") ?? null,
		liveOrders: r.db.all("SELECT * FROM live_orders ORDER BY at DESC LIMIT 200"),
		pending: r.pendingEntries().slice(0, 50),
		control: await liveState(r.db, "controlStatus") ?? null,
		adjust: Object.values(r.adjustState()).sort((a, b) => b.level - a.level || b.at - a.at).slice(0, 60),
		liveCost: r.liveCost(),
		cost: {
			model: r.settings.cost,
			fees: r.settings.fees
		},
		controlPreview: await controlPreview(r),
		liveSettings: r.settings.live,
		liveKeys: (await import("./bingx.server-mUvF8FQo.mjs")).keysFor(r.settings.live.connId).source
	});
});
/**
* The Overall control positions the current paper book asks for (shown even while Live is off): the same sizing
* as the live step (unit from the last equity read, else the paper balance; position mode; exchange minimum).
*/
async function controlPreview(r) {
	const { controlTargets, liveNetwork } = await import("./live-s0eY_ICy.mjs");
	const { controlSettingsOf, liveUnitPeek } = await import("./live.server-C--dMqBd.mjs");
	const bx = await import("./bingx.server-mUvF8FQo.mjs");
	const s = r.settings.live;
	const specs = await bx.fetchContracts(liveNetwork(s.connId)).catch(() => /* @__PURE__ */ new Map());
	const prices = /* @__PURE__ */ new Map();
	for (const [sym, cs] of r.candles) if (cs.length) prices.set(sym, cs[cs.length - 1].c);
	const lanes = r.paper.positions.map((p) => ({
		cfg: p.cfg,
		sym: p.sym,
		side: p.side,
		vol: p.vol ?? 1,
		sl: Math.abs(p.entry - p.stop) / p.entry || .05
	}));
	const u = liveUnitPeek(r);
	return {
		...controlTargets(lanes, prices, controlSettingsOf(s, u.unit), (sym, q, px) => bx.snapQtyExchange(q, px, specs.get(sym) ?? null)),
		unit: u.unit,
		unitFrom: u.from
	};
}
var coreMarket_createServerFn_handler = createServerRpc({
	id: "14875743c503a48bd4dddbc331bd72052883a9c9bfac81a4344991265f037327",
	name: "coreMarket",
	filename: "src/core/api.ts"
}, (opts) => coreMarket.__executeServer(opts));
var coreMarket = createServerFn({ method: "GET" }).handler(coreMarket_createServerFn_handler, async () => {
	const r = await rt();
	const symbols = r.db.all("SELECT * FROM symbols ORDER BY quote_vol DESC");
	const spark = {};
	for (const [sym, cs] of r.candles) spark[sym] = cs.slice(-96).map((c) => c.c);
	return ser({
		symbols,
		spark,
		tfMin: r.settings.tfMin,
		source: r.status.source
	});
});
var coreEngine_createServerFn_handler = createServerRpc({
	id: "7f495d939966c14ab587b59207c7621b93af3f6b7659297e4bfa4a5ad3d49ac8",
	name: "coreEngine",
	filename: "src/core/api.ts"
}, (opts) => coreEngine.__executeServer(opts));
var coreEngine = createServerFn({ method: "GET" }).handler(coreEngine_createServerFn_handler, async () => {
	const r = await rt();
	const mem = process.memoryUsage();
	return ser({
		status: r.status,
		settings: { gates: r.settings.gates },
		audit: r.audit,
		tables: r.db.tableStats(),
		bytes: r.db.bytes(),
		runs: r.db.all("SELECT * FROM runs ORDER BY id DESC LIMIT 40"),
		events: r.db.all("SELECT * FROM events ORDER BY id DESC LIMIT 200"),
		process: {
			rss: mem.rss,
			heap: mem.heapUsed,
			heapTotal: mem.heapTotal,
			external: mem.external,
			arrayBuffers: mem.arrayBuffers,
			uptime: process.uptime(),
			node: process.version
		}
	});
});
var coreSettings_createServerFn_handler = createServerRpc({
	id: "b64d3fb997da74665ad1595b54ca2964e608c581687ca75bbf44e3184e712bd3",
	name: "coreSettings",
	filename: "src/core/api.ts"
}, (opts) => coreSettings.__executeServer(opts));
var coreSettings = createServerFn({ method: "GET" }).handler(coreSettings_createServerFn_handler, async () => {
	const r = await rt();
	const { WF_KEYS } = await import("./runtime.server-D3VkG11m.mjs");
	const wf = {};
	for (const k of WF_KEYS) wf[k] = r.wf[k];
	return ser({
		settings: r.settings,
		wf
	});
});
var saveCoreSettings_createServerFn_handler = createServerRpc({
	id: "a63309d43925369161614e5f8884c831dc9aa0328ae152fc0321ab640ece2695",
	name: "saveCoreSettings",
	filename: "src/core/api.ts"
}, (opts) => saveCoreSettings.__executeServer(opts));
var saveCoreSettings = createServerFn({ method: "POST" }).validator((d) => {
	if (!d || typeof d !== "object") throw new Error("invalid");
	checkSettings(d.settings ?? {});
	return d;
}).handler(saveCoreSettings_createServerFn_handler, async ({ data }) => {
	const r = await rt();
	checkMerged(r.settings, data.settings ?? {});
	r.updateSettings(data.settings ?? {}, data.wf ?? {});
	return ser({
		ok: true,
		settings: r.settings
	});
});
var corePresets_createServerFn_handler = createServerRpc({
	id: "da8c934705c19ef0981360deb820bd099ccd19f8d0065a3ece23b603ab8d475c",
	name: "corePresets",
	filename: "src/core/api.ts"
}, (opts) => corePresets.__executeServer(opts));
var corePresets = createServerFn({ method: "GET" }).handler(corePresets_createServerFn_handler, async () => {
	const r = await rt();
	const { RESEARCH_PRESETS } = await import("./presets-CcqKlipW.mjs");
	const sim = r.sim;
	return ser({
		research: RESEARCH_PRESETS,
		saved: r.savedPresets().sort((a, b) => b.at - a.at),
		active: r.db.kvGet("activePreset") ?? null,
		backtests: r.presetBacktests(),
		job: r.backtestJob,
		gates: r.settings.gates,
		current: sim ? {
			pf: sim.stats.pf,
			n: sim.stats.n,
			gh: sim.stats.gh,
			wr: sim.stats.wr,
			net: sim.stats.net,
			stable: sim.stable,
			hours: (sim.endT - sim.startT) / 36e5
		} : null
	});
});
var presetAction_createServerFn_handler = createServerRpc({
	id: "498484c8cfd025a3da3efd6da82d7f9f5dcb0eff0eb697aff3cf16fbfb1c8329",
	name: "presetAction",
	filename: "src/core/api.ts"
}, (opts) => presetAction.__executeServer(opts));
var presetAction = createServerFn({ method: "POST" }).validator((d) => {
	if (!d || ![
		"save",
		"apply",
		"delete",
		"backtest",
		"update"
	].includes(d.action)) throw new Error("bad action");
	if (d.action === "update") {
		if (!d.settings || typeof d.settings !== "object") throw new Error("settings required");
		if ("live" in d.settings) throw new Error("a preset never carries the Live stage");
		checkSettings(d.settings);
	}
	if (d.action === "backtest" && (typeof d.days !== "number" || !Number.isInteger(d.days) || d.days < 1 || d.days > 12)) throw new Error("days: 1–12");
	if (d.action !== "save" && (typeof d.id !== "string" || d.id.length > 120)) throw new Error("preset id required");
	if (d.label !== void 0 && (typeof d.label !== "string" || d.label.length > 80)) throw new Error("label: up to 80 characters");
	if (d.info !== void 0 && (typeof d.info !== "string" || d.info.length > 400)) throw new Error("info: up to 400 characters");
	return d;
}).handler(presetAction_createServerFn_handler, async ({ data }) => {
	const r = await rt();
	if (data.action === "save") return ser({
		ok: true,
		preset: r.savePreset(data.label ?? "", data.info ?? "")
	});
	if (data.action === "apply") return ser({
		ok: true,
		preset: r.applyPreset(data.id)
	});
	if (data.action === "update") return ser({
		ok: true,
		preset: r.updatePreset(data.id, data.settings, data.wf ?? {}, data.label, data.info)
	});
	if (data.action === "backtest") {
		r.startPresetBacktest(data.id, data.days);
		return ser({
			ok: true,
			job: r.backtestJob
		});
	}
	r.deletePreset(data.id);
	return ser({ ok: true });
});
var coreControl_createServerFn_handler = createServerRpc({
	id: "f71eacfb6360cc1cb25f4528304995eb4f1d9eab184b9b470101f3829e75b782",
	name: "coreControl",
	filename: "src/core/api.ts"
}, (opts) => coreControl.__executeServer(opts));
var coreControl = createServerFn({ method: "POST" }).validator((d) => {
	if (![
		"start",
		"stop",
		"recompute",
		"resync"
	].includes(d?.action)) throw new Error("bad action");
	return d;
}).handler(coreControl_createServerFn_handler, async ({ data }) => {
	const r = await rt();
	if (data.action === "stop") r.stop();
	else if (data.action === "start") r.start();
	else if (data.action === "resync") r.requestResync();
	else r.kick();
	return ser({
		ok: true,
		state: r.status.state
	});
});
//#endregion
export { closedPositions as n, openTimeline as r, api_exports as t };
