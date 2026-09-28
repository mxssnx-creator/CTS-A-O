//#region node_modules/.nitro/vite/services/ssr/assets/settings-check-Bcofhpy4.js
/** Range checks for a settings patch (Settings page and preset dialog alike). */
function checkSettings(s) {
	const num = (v, lo, hi, name) => {
		if (v === void 0) return;
		if (typeof v !== "number" || !Number.isFinite(v) || v < lo || v > hi) throw new Error(`${name} out of range`);
	};
	num(s.symbols, 1, 120, "symbols");
	if (s.symbolRank !== void 0 && ![
		"volatility1h",
		"volume",
		"market",
		"gainers",
		"losers"
	].includes(s.symbolRank)) throw new Error("unknown symbol ranking");
	num(s.historyDays, 2, 45, "historyDays");
	num(s.cycleMs, 100, 6e5, "cycle (ms)");
	num(s.tickMs, 50, 1e4, "tick (ms)");
	num(s.live?.syncMs, 250, 6e4, "exchange sync (ms)");
	num(s.live?.minStopPct, .001, .2, "minimum stop");
	num(s.cost, 0, .02, "cost");
	num(s.armTop, 1, 40, "armTop");
	num(s.mainTop, 0, 1e5, "mainTop");
	num(s.refineTop, 1, 100, "refineTop");
	num(s.evalTop, 1, 400, "evalTop");
	num(s.paperNotional, 1, 1e6, "paperNotional");
	num(s.paperBalance, 1, 1e8, "paper balance");
	if (s.sizing) {
		if (s.sizing.mode !== void 0 && !["equityPct", "fixed"].includes(s.sizing.mode)) throw new Error("sizing: equityPct or fixed");
		num(s.sizing.pct, .001, .25, "sizing % of equity per order");
	}
	const int = (v, name) => {
		if (v !== void 0 && !Number.isInteger(v)) throw new Error(`${name} must be a whole number`);
	};
	int(s.symbols, "symbols");
	int(s.refineTop, "refineTop");
	int(s.evalTop, "evalTop");
	int(s.mainTop, "mainTop");
	int(s.armTop, "armTop");
	int(s.axis?.levels, "axis levels");
	int(s.dca?.levels, "dca levels");
	int(s.live?.maxPositions, "max positions");
	if (s.tfMin !== void 0 && ![
		1,
		5,
		15,
		30,
		60
	].includes(s.tfMin)) throw new Error("tfMin must be 1, 5, 15, 30 or 60");
	if (s.tfs !== void 0) {
		if (!Array.isArray(s.tfs) || !s.tfs.every((x) => [
			1,
			5,
			15,
			30
		].includes(x))) throw new Error("timeframes: any of 1, 5, 15, 30 (minutes)");
		if (!s.tfs.includes(1)) throw new Error("timeframes: 1m is the base and always on");
	}
	if (s.tfDays !== void 0) {
		if (typeof s.tfDays !== "object" || s.tfDays === null) throw new Error("lane history: days per timeframe");
		for (const [k, v] of Object.entries(s.tfDays)) {
			if (![
				"1",
				"5",
				"15",
				"30"
			].includes(k)) throw new Error(`lane history: unknown timeframe ${k}`);
			num(v, 1, 45, `lane history ${k}m`);
		}
	}
	if (s.gates) {
		num(s.gates.minPf, .5, 5, "min PF");
		num(s.gates.maxDdtH, 1, 500, "max DDT");
		num(s.gates.minTrades, 1, 500, "minTrades");
		num(s.gates.quorum, 0, 1, "quorum");
	}
	if (s.protectFloor) {
		num(s.protectFloor.minSl, 0, .1, "minimum stop");
		num(s.protectFloor.minTrail, 0, .1, "minimum trailing distance");
	}
	if (s.live) {
		num(s.live.notionalUsd, 1, 500, "notionalUsd");
		num(s.live.maxPositions, 0, 1e4, "maxPositions");
		if (s.live.connId !== void 0 && ![
			"bingx-x01",
			"bingx-vst-01",
			"bingx-vst-02"
		].includes(s.live.connId)) throw new Error("unknown connection");
		if (s.live.requireReady !== void 0 && typeof s.live.requireReady !== "boolean") throw new Error("live requireReady must be true or false");
		if (s.live.enabled !== void 0 && typeof s.live.enabled !== "boolean") throw new Error("live.enabled must be boolean");
		if (s.live.mode !== void 0 && !["overall", "entries"].includes(s.live.mode)) throw new Error("live mode must be overall or entries");
		num(s.live.ratio, .1, 10, "control ratio");
		num(s.live.maxNotionalUsd, 1, 5e3, "max notional per position");
		num(s.live.rebalancePct, 0, 1, "rebalance threshold");
		if (s.live.marginMode !== void 0 && !["cross", "isolated"].includes(s.live.marginMode)) throw new Error("margin mode must be cross or isolated");
		if (s.live.positionMode !== void 0 && !["hedge", "oneway"].includes(s.live.positionMode)) throw new Error("position mode must be hedge or oneway");
	}
	if (s.toggles) {
		for (const [k, v] of Object.entries(s.toggles)) if (typeof v !== "boolean") throw new Error(`toggle ${k} must be boolean`);
	}
	if (s.tactics) {
		for (const k of [
			"session",
			"volRegime",
			"trendStrength",
			"cooldown"
		]) if (s.tactics[k] !== void 0 && typeof s.tactics[k] !== "boolean") throw new Error(`tactic ${k} must be boolean`);
		num(s.tactics.cooldownBars, 0, 96, "cooldown bars");
	}
	if (s.disabledKinds !== void 0) {
		if (!Array.isArray(s.disabledKinds) || s.disabledKinds.some((k) => typeof k !== "string" || !/^[a-z]+$/.test(k))) throw new Error("disabledKinds: list of indication types");
	}
	if (s.focus !== void 0) {
		if (!Array.isArray(s.focus) || s.focus.length > 200) throw new Error("focus: up to 200 bot|indication pairs");
		for (const f of s.focus) if (typeof f !== "string" || !/^[a-z]+\|[a-z0-9.@-]+$/.test(f)) throw new Error(`focus entry ${String(f)} must be bot|indication`);
	}
	if (s.block) {
		num(s.block.ratio, 0, 2, "block ratio");
		num(s.block.maxLevel, 1, 12, "block max level");
		num(s.block.minActiveLevel, 1, 12, "block active level");
		num(s.block.maxMult, 1, 8, "block max multiple (stack ≤ 8×)");
		if (s.block.mode !== void 0 && s.block.mode !== "shared" && s.block.mode !== "additive") throw new Error("block type must be shared or additive");
		if (s.block.sources !== void 0) {
			if (typeof s.block.sources !== "object" || s.block.sources === null) throw new Error("block sources: object of switches");
			for (const [k, v] of Object.entries(s.block.sources)) if (![
				"config",
				"overall",
				"symbol",
				"direction",
				"indication",
				"type"
			].includes(k) || typeof v !== "boolean") throw new Error(`block source ${k} must be a known source with an on/off value`);
		}
	}
	if (s.fees) {
		num(s.fees.taker, 0, .01, "taker fee");
		num(s.fees.maker, 0, .01, "maker fee");
		num(s.fees.slippage, 0, .02, "slippage");
	}
	if (s.adjust) {
		const a = s.adjust;
		if (a.enabled !== void 0 && typeof a.enabled !== "boolean") throw new Error("adjust.enabled must be boolean");
		if (a.autoCost !== void 0 && typeof a.autoCost !== "boolean") throw new Error("adjust.autoCost must be boolean");
		num(a.window, 5, 100, "adjust window");
		if (a.window !== void 0 && !Number.isInteger(a.window)) throw new Error("adjust window must be a whole number");
		num(a.triggerPf, .5, 2, "adjust trigger PF");
		num(a.recoverPf, .5, 3, "adjust recover PF");
		num(a.slStep, 1e-4, .02, "SL step");
		num(a.slMax, .001, .2, "SL max");
		num(a.trailStep, 1e-4, .02, "trail step");
		num(a.trailMax, .001, .2, "trail max");
		num(a.pauseH, 0, 168, "pause hours");
		if (a.triggerPf !== void 0 && a.recoverPf !== void 0 && a.recoverPf < a.triggerPf) throw new Error("recover PF must be ≥ trigger PF");
	}
	if (s.axis) {
		num(s.axis.levels, 1, 8, "axis levels");
		num(s.axis.spacing, .1, 5, "axis spacing (ATR)");
		num(s.axis.ratio, .1, 5, "axis rung ratio");
		num(s.axis.minDisp, 0, 10, "axis min displacement");
		num(s.axis.maxDisp, .1, 20, "axis max displacement");
		num(s.axis.center, 5, 400, "axis EMA period");
		if (s.axis.minDisp !== void 0 && s.axis.maxDisp !== void 0 && s.axis.minDisp >= s.axis.maxDisp) throw new Error("axis min displacement must be below max");
	}
	if (s.dca) {
		num(s.dca.levels, 1, 6, "dca levels");
		num(s.dca.step, .001, .1, "dca step");
	}
	if (s.grid) {
		const list = (xs, lo, hi, name) => {
			if (xs === void 0) return;
			if (!Array.isArray(xs) || xs.length < 1 || xs.length > 12) throw new Error(`${name}: 1–12 values`);
			for (const x of xs) num(x, lo, hi, name);
		};
		list(s.grid.tp, .002, .2, "grid TP");
		list(s.grid.slOfTp, .2, 5, "grid SL×TP");
		list(s.grid.trailOfTp, 0, 1, "grid trail share");
		list(s.grid.holdH, .25, 72, "grid hold");
		num(s.grid.minTrail, 0, .1, "min trail");
		num(s.grid.minSl, 0, .2, "min SL");
		num(s.grid.trailStep, .1, 1, "trail step");
		if (s.grid.trailFree !== void 0 && typeof s.grid.trailFree !== "boolean") throw new Error("trail free: on / off");
		const n = (s.grid.tp?.length ?? 4) * (s.grid.slOfTp?.length ?? 4) * (s.grid.trailOfTp?.length ?? 3) * (s.grid.holdH?.length ?? 2);
		if (n > 240) throw new Error(`protect grid too large (${n} variants, max 240)`);
	}
	if (s.signals) {
		const g = s.signals;
		const bool = (v, name) => {
			if (v !== void 0 && typeof v !== "boolean") throw new Error(`${name}: on / off`);
		};
		const list = (xs, lo, hi, name) => {
			if (xs === void 0) return;
			if (!Array.isArray(xs) || xs.length < 1 || xs.length > 8) throw new Error(`${name}: 1–8 values`);
			for (const x of xs) num(x, lo, hi, name);
		};
		bool(g.enabled, "signals");
		if (g.count !== void 0) {
			num(g.count, 10, 200, "active signals");
			if (g.count % 10 !== 0) throw new Error("active signals: steps of 10");
		}
		if (g.sources !== void 0) {
			if (typeof g.sources !== "object" || g.sources === null) throw new Error("signal sources: on / off per source");
			for (const [k, v] of Object.entries(g.sources)) bool(v, `signal source ${k}`);
		}
		if (g.ranges) {
			bool(g.ranges.short, "short range");
			bool(g.ranges.medium, "medium range");
			if (g.ranges.short === false && g.ranges.medium === false) throw new Error("signals: at least one range");
		}
		if (g.lanes !== void 0) {
			if (!Array.isArray(g.lanes) || !g.lanes.length || !g.lanes.every((x) => [
				1,
				5,
				15,
				30
			].includes(x))) throw new Error("signal lanes: any of 1, 5, 15, 30 (minutes)");
		}
		list(g.normal?.tp, .002, .2, "signal Normal TP");
		list(g.normal?.slOfTp, .2, 5, "signal Normal SL×TP");
		list(g.trailing?.tp, .002, .2, "signal Trailing TP");
		list(g.trailing?.trailOfTp, .05, 1, "signal trail share");
		num(g.trailing?.slOfTp, .2, 5, "signal Trailing SL×TP");
		num(g.holdH, .5, 96, "signal hold");
		if (g.exits !== void 0 && ![
			"pct",
			"atr",
			"both"
		].includes(g.exits)) throw new Error("signal exits: pct, atr or both");
		if (g.atr) {
			list(g.atr.sl, .2, 2, "signal ATR stop (× ATR)");
			list(g.atr.tpRatio, .2, 3, "signal ATR target ratio (× stop)");
			if (g.atr.trail !== void 0) {
				if (!Array.isArray(g.atr.trail) || g.atr.trail.length > 4) throw new Error("signal ATR trail: 0–4 values");
				for (const x of g.atr.trail) num(x, .4, 2.4, "signal ATR trail (%)");
			}
			num(g.atr.holdBars, 0, 384, "signal ATR hold (15m bars)");
			int(g.atr.holdBars, "signal ATR hold (15m bars)");
			const n = (g.atr.sl?.length ?? 3) * (g.atr.tpRatio?.length ?? 3) * (1 + (g.atr.trail?.length ?? 1));
			if (n > 60) throw new Error(`signal ATR grid too large (${n} configs, max 60)`);
		}
		bool(g.guard?.enabled, "signal guard");
		num(g.guard?.lastN, 2, 50, "signal guard last N");
		num(g.minTrades, 1, 100, "signal min trades");
		int(g.guard?.lastN, "signal guard last N");
		int(g.minTrades, "signal min trades");
		if (g.rank !== void 0 && ![
			"drawdown",
			"lowdd",
			"net"
		].includes(g.rank)) throw new Error("signal ranking: drawdown or net");
		num(g.minBlockShare, 0, 1, "signal min positive 4-hour block share");
		bool(g.validate, "signal validation on the latest hours");
		num(g.validateH, 2, 72, "signal validation window (h)");
		num(g.minSl, 0, .1, "signal minimum stop");
		num(g.minTrail, 0, .1, "signal minimum trailing distance");
		if (g.sourceGate) {
			bool(g.sourceGate.enabled, "source stability gate");
			num(g.sourceGate.days, 1, 14, "source gate days");
			num(g.sourceGate.minShare, 0, 1, "source gate positive-day share");
			num(g.sourceGate.minTrades, 1, 100, "source gate minimum orders");
		}
		if (g.cluster) {
			bool(g.cluster.enabled, "signal loss-cluster guard");
			num(g.cluster.windowMin, 5, 720, "loss-cluster window (min)");
			num(g.cluster.minLosses, 1, 1e3, "loss-cluster min losses");
			num(g.cluster.lossShare, .3, 1, "loss-cluster loss share");
			int(g.cluster.minLosses, "loss-cluster min losses");
		}
		num(g.perSymbol, 0, 1e3, "signal orders per symbol");
		num(g.maxOpen, 0, 1e5, "signal open orders");
		int(g.perSymbol, "signal orders per symbol");
		int(g.maxOpen, "signal open orders");
	}
}
/**
* Cross-field rules against the settings a patch produces (recover PF ≥ trigger PF, axis min < max, a signal
* range left on): checkSettings alone only sees the fields inside the patch.
*/
function checkMerged(cur, patch) {
	const merged = {};
	if (patch.adjust) merged.adjust = {
		...cur.adjust,
		...patch.adjust
	};
	if (patch.axis) merged.axis = {
		...cur.axis,
		...patch.axis
	};
	if (patch.signals?.ranges) merged.signals = { ranges: {
		...cur.signals?.ranges,
		...patch.signals.ranges
	} };
	checkSettings(merged);
}
//#endregion
export { checkSettings as n, checkMerged as t };
