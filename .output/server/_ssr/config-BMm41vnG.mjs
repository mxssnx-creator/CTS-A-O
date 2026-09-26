//#region node_modules/.nitro/vite/services/ssr/assets/config-BMm41vnG.js
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
/** Symbol selection rankings (engine universe and preset settings). */
var SYMBOL_RANK_CHOICES = [
	{
		id: "volatility1h",
		label: "1H volatility"
	},
	{
		id: "volume",
		label: "24h volume"
	},
	{
		id: "market",
		label: "Market (majors first)"
	},
	{
		id: "gainers",
		label: "24h gainers"
	},
	{
		id: "losers",
		label: "24h losers"
	}
];
/** Gate choices: min PF 1.05–1.50 (step 0.05), max DDT 2–20 h (step 2). */
var MIN_PF_CHOICES = Array.from({ length: 10 }, (_, i) => Math.round((1.05 + i * .05) * 100) / 100);
var MAX_DDT_CHOICES = Array.from({ length: 10 }, (_, i) => 2 + i * 2);
var GATE_PRESETS = {
	balanced: DEFAULT_GATES,
	strict: {
		minPf: 1.5,
		maxDdtH: 10,
		minTrades: 20,
		quorum: .75
	},
	loose: {
		minPf: 1.05,
		maxDdtH: 20,
		minTrades: 8,
		quorum: .5
	}
};
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
export { DEFAULT_TOGGLES as a, GATE_PRESETS as c, MIN_PF_CHOICES as d, PROTECT_GRID as f, TF_CHOICES as h, DEFAULT_SETTINGS as i, LAST_N_GRID as l, SYMBOL_RANK_CHOICES as m, DEFAULT_DCA as n, EVAL_TIME_WINDOWS_H as o, STRATEGY_PRESETS as p, DEFAULT_PROTECT as r, EVAL_TRADE_WINDOWS as s, DEFAULT_BLOCK as t, MAX_DDT_CHOICES as u };
