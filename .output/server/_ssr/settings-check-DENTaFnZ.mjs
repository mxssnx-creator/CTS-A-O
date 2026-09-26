//#region node_modules/.nitro/vite/services/ssr/assets/settings-check-DENTaFnZ.js
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
	num(s.cycleMs, 5e3, 6e5, "cycleMs");
	num(s.cost, 0, .02, "cost");
	num(s.armTop, 1, 40, "armTop");
	num(s.mainTop, 10, 377, "mainTop");
	num(s.refineTop, 1, 100, "refineTop");
	num(s.evalTop, 1, 400, "evalTop");
	num(s.paperNotional, 1, 1e6, "paperNotional");
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
	if (s.live) {
		num(s.live.notionalUsd, 1, 500, "notionalUsd");
		num(s.live.maxPositions, 1, 20, "maxPositions");
		if (s.live.connId !== void 0 && ![
			"bingx-x01",
			"bingx-vst-01",
			"bingx-vst-02"
		].includes(s.live.connId)) throw new Error("unknown connection");
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
		num(s.block.maxMult, 1, 10, "block max multiple");
		if (s.block.mode !== void 0 && s.block.mode !== "shared" && s.block.mode !== "additive") throw new Error("block type must be shared or additive");
		if (s.block.sources !== void 0) {
			if (typeof s.block.sources !== "object" || s.block.sources === null) throw new Error("block sources: object of switches");
			for (const [k, v] of Object.entries(s.block.sources)) if (![
				"config",
				"overall",
				"symbol",
				"direction",
				"indication"
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
}
//#endregion
export { checkSettings as t };
