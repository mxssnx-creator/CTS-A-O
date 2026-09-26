//#region node_modules/.nitro/vite/services/ssr/assets/presets-Dkv3-sa6.js
var RESEARCH_PRESETS = [
	{
		id: "mx-robust-none-std-ln12-trailing",
		label: "robust 1h+4h set · Trailing only · last-N 12",
		info: "Worst period PF 1.10 over three separate periods of real 1h data (the 2024 period was never used for any selection). robust 1h+4h set: 12 bot × indication pairs, fixed selection, execution “Trailing only”.",
		kind: "research",
		at: 1790444372242,
		settings: {
			tfMin: 60,
			historyDays: 35,
			focus: [
				"follow|rsi-mom-14-15",
				"follow|rsi-mom-21-20",
				"follow|rsi-mom-21-25",
				"follow|bb-walk@x4",
				"follow|break-vol-2@x4",
				"follow|break-vol@x4",
				"follow|break-atr-2@x4",
				"follow|act-burst-2.5@x4",
				"revert|act-chop@x4",
				"revert|cci-14-200@x4",
				"revert|cci-40-200@x4",
				"revert|z-50-2.5@x4"
			],
			grid: {
				tp: [
					.03,
					.05,
					.08
				],
				slOfTp: [1, 2],
				trailOfTp: [0, .5],
				minTrail: .006,
				minSl: .01,
				holdH: [16, 24]
			},
			tactics: {
				session: false,
				volRegime: false,
				trendStrength: false,
				cooldown: false,
				cooldownBars: 4
			},
			block: {
				ratio: .2,
				maxLevel: 6,
				minActiveLevel: 1,
				maxMult: 2.5
			},
			dca: {
				levels: 2,
				step: .02
			},
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
		wf: {
			preH: 20,
			simH: 48,
			longH: 336,
			stepH: 1,
			mode: "fixed",
			maxPerSymbol: 2,
			portfolio: 16,
			lastN: 12
		},
		metrics: {
			pf: 1.168,
			n: 2927,
			perDay: 8.363,
			wr: .569,
			net: 652.243,
			greenHours: .558,
			greenDays: .457,
			positiveRuns: 71,
			runs: 175,
			ddtH: 3144,
			checks: [
				{
					period: "2025-10-11 → 2026-09-26",
					label: "research year",
					pf: 1.168,
					n: 2927,
					perDay: 8.363,
					greenHours: .558,
					wr: .569,
					positiveRuns: 71,
					runs: 175
				},
				{
					period: "2024-10-11 → 2025-09-26",
					label: "prior year",
					pf: 1.097,
					n: 3144,
					perDay: 8.983,
					greenHours: .547,
					wr: .583,
					positiveRuns: 72,
					runs: 175
				},
				{
					period: "2024-05-12 → 2024-09-25",
					label: "2024 (never selected on)",
					pf: 1.114,
					n: 1284,
					perDay: 9.441,
					greenHours: .519,
					wr: .569,
					positiveRuns: 24,
					runs: 68
				}
			],
			oot: {
				period: "2024-05-12 → 2024-09-25",
				pf: 1.114,
				n: 1284,
				perDay: 9.441,
				greenHours: .519,
				wr: .569
			},
			period: "2025-10-11 → 2026-09-26",
			source: "complete causal 48h walk-forward runs over each period, 40 symbols, 1h bars, 0.2% round-trip cost (docs/matrix.md, docs/matrix/robust-none-std-ln12.*)"
		}
	},
	{
		id: "mx-mom-none-std-ln12-block-active+dca-active",
		label: "RSI momentum · Block Active + DCA Active · last-N 12",
		info: "Worst period PF 1.03 over three separate periods of real 1h data (the 2024 period was never used for any selection). RSI momentum: 7 bot × indication pairs, fixed selection, execution “Block Active + DCA Active”.",
		kind: "research",
		at: 1790444372244,
		settings: {
			tfMin: 60,
			historyDays: 35,
			focus: [
				"follow|rsi-mom-10-25",
				"follow|rsi-mom-14-15",
				"follow|rsi-mom-14-20",
				"follow|rsi-mom-14-25",
				"follow|rsi-mom-21-15",
				"follow|rsi-mom-21-20",
				"follow|rsi-mom-21-25"
			],
			grid: {
				tp: [
					.03,
					.05,
					.08
				],
				slOfTp: [1, 2],
				trailOfTp: [0, .5],
				minTrail: .006,
				minSl: .01,
				holdH: [16, 24]
			},
			tactics: {
				session: false,
				volRegime: false,
				trendStrength: false,
				cooldown: false,
				cooldownBars: 4
			},
			block: {
				ratio: .2,
				maxLevel: 6,
				minActiveLevel: 1,
				maxMult: 2.5
			},
			dca: {
				levels: 2,
				step: .02
			},
			toggles: {
				normal: true,
				trailing: true,
				block: true,
				blockActive: true,
				dca: true,
				dcaActive: true,
				axis: false
			}
		},
		wf: {
			preH: 20,
			simH: 48,
			longH: 336,
			stepH: 1,
			mode: "fixed",
			maxPerSymbol: 2,
			portfolio: 16,
			lastN: 12
		},
		metrics: {
			pf: 1.034,
			n: 2455,
			perDay: 7.014,
			wr: .488,
			net: 264.47,
			greenHours: .499,
			greenDays: .393,
			positiveRuns: 55,
			runs: 175,
			ddtH: 5580,
			checks: [
				{
					period: "2025-10-11 → 2026-09-26",
					label: "research year",
					pf: 1.034,
					n: 2455,
					perDay: 7.014,
					greenHours: .499,
					wr: .488,
					positiveRuns: 55,
					runs: 175
				},
				{
					period: "2024-10-11 → 2025-09-26",
					label: "prior year",
					pf: 1.037,
					n: 3026,
					perDay: 8.646,
					greenHours: .505,
					wr: .532,
					positiveRuns: 64,
					runs: 175
				},
				{
					period: "2024-05-12 → 2024-09-25",
					label: "2024 (never selected on)",
					pf: 1.047,
					n: 1116,
					perDay: 8.206,
					greenHours: .507,
					wr: .569,
					positiveRuns: 23,
					runs: 68
				}
			],
			oot: {
				period: "2024-05-12 → 2024-09-25",
				pf: 1.047,
				n: 1116,
				perDay: 8.206,
				greenHours: .507,
				wr: .569
			},
			period: "2025-10-11 → 2026-09-26",
			source: "complete causal 48h walk-forward runs over each period, 40 symbols, 1h bars, 0.2% round-trip cost (docs/matrix.md, docs/matrix/mom-none-std-ln12.*)"
		}
	},
	{
		id: "mx-mom-none-strong-ln12-block-active",
		label: "RSI momentum · Block Active · last-N 12 · strong Block/DCA",
		info: "Worst period PF 1.03 over three separate periods of real 1h data (the 2024 period was never used for any selection). RSI momentum: 7 bot × indication pairs, fixed selection, execution “Block Active”.",
		kind: "research",
		at: 1790444372244,
		settings: {
			tfMin: 60,
			historyDays: 35,
			focus: [
				"follow|rsi-mom-10-25",
				"follow|rsi-mom-14-15",
				"follow|rsi-mom-14-20",
				"follow|rsi-mom-14-25",
				"follow|rsi-mom-21-15",
				"follow|rsi-mom-21-20",
				"follow|rsi-mom-21-25"
			],
			grid: {
				tp: [
					.03,
					.05,
					.08
				],
				slOfTp: [1, 2],
				trailOfTp: [0, .5],
				minTrail: .006,
				minSl: .01,
				holdH: [16, 24]
			},
			tactics: {
				session: false,
				volRegime: false,
				trendStrength: false,
				cooldown: false,
				cooldownBars: 4
			},
			block: {
				ratio: .5,
				maxLevel: 6,
				minActiveLevel: 2,
				maxMult: 3
			},
			dca: {
				levels: 3,
				step: .035
			},
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
		wf: {
			preH: 20,
			simH: 48,
			longH: 336,
			stepH: 1,
			mode: "fixed",
			maxPerSymbol: 2,
			portfolio: 16,
			lastN: 12
		},
		metrics: {
			pf: 1.044,
			n: 2917,
			perDay: 8.334,
			wr: .523,
			net: 580.355,
			greenHours: .516,
			greenDays: .392,
			positiveRuns: 55,
			runs: 175,
			ddtH: 6258,
			checks: [
				{
					period: "2025-10-11 → 2026-09-26",
					label: "research year",
					pf: 1.044,
					n: 2917,
					perDay: 8.334,
					greenHours: .516,
					wr: .523,
					positiveRuns: 55,
					runs: 175
				},
				{
					period: "2024-10-11 → 2025-09-26",
					label: "prior year",
					pf: 1.032,
					n: 3094,
					perDay: 8.84,
					greenHours: .514,
					wr: .546,
					positiveRuns: 57,
					runs: 175
				},
				{
					period: "2024-05-12 → 2024-09-25",
					label: "2024 (never selected on)",
					pf: 1.063,
					n: 1216,
					perDay: 8.941,
					greenHours: .486,
					wr: .568,
					positiveRuns: 19,
					runs: 68
				}
			],
			oot: {
				period: "2024-05-12 → 2024-09-25",
				pf: 1.063,
				n: 1216,
				perDay: 8.941,
				greenHours: .486,
				wr: .568
			},
			period: "2025-10-11 → 2026-09-26",
			source: "complete causal 48h walk-forward runs over each period, 40 symbols, 1h bars, 0.2% round-trip cost (docs/matrix.md, docs/matrix/mom-none-strong-ln12.*)"
		}
	},
	{
		id: "mx-mom-none-std-ln12-block",
		label: "RSI momentum · Normal + Trailing + Block · last-N 12",
		info: "Worst period PF 1.03 over three separate periods of real 1h data (the 2024 period was never used for any selection). RSI momentum: 7 bot × indication pairs, fixed selection, execution “Normal + Trailing + Block”.",
		kind: "research",
		at: 1790444372244,
		settings: {
			tfMin: 60,
			historyDays: 35,
			focus: [
				"follow|rsi-mom-10-25",
				"follow|rsi-mom-14-15",
				"follow|rsi-mom-14-20",
				"follow|rsi-mom-14-25",
				"follow|rsi-mom-21-15",
				"follow|rsi-mom-21-20",
				"follow|rsi-mom-21-25"
			],
			grid: {
				tp: [
					.03,
					.05,
					.08
				],
				slOfTp: [1, 2],
				trailOfTp: [0, .5],
				minTrail: .006,
				minSl: .01,
				holdH: [16, 24]
			},
			tactics: {
				session: false,
				volRegime: false,
				trendStrength: false,
				cooldown: false,
				cooldownBars: 4
			},
			block: {
				ratio: .2,
				maxLevel: 6,
				minActiveLevel: 1,
				maxMult: 2.5
			},
			dca: {
				levels: 2,
				step: .02
			},
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
		wf: {
			preH: 20,
			simH: 48,
			longH: 336,
			stepH: 1,
			mode: "fixed",
			maxPerSymbol: 2,
			portfolio: 16,
			lastN: 12
		},
		metrics: {
			pf: 1.03,
			n: 3180,
			perDay: 9.086,
			wr: .513,
			net: 292.274,
			greenHours: .511,
			greenDays: .396,
			positiveRuns: 60,
			runs: 175,
			ddtH: 6259,
			checks: [
				{
					period: "2025-10-11 → 2026-09-26",
					label: "research year",
					pf: 1.03,
					n: 3180,
					perDay: 9.086,
					greenHours: .511,
					wr: .513,
					positiveRuns: 60,
					runs: 175
				},
				{
					period: "2024-10-11 → 2025-09-26",
					label: "prior year",
					pf: 1.031,
					n: 3362,
					perDay: 9.606,
					greenHours: .517,
					wr: .547,
					positiveRuns: 64,
					runs: 175
				},
				{
					period: "2024-05-12 → 2024-09-25",
					label: "2024 (never selected on)",
					pf: 1.058,
					n: 1323,
					perDay: 9.728,
					greenHours: .477,
					wr: .556,
					positiveRuns: 21,
					runs: 68
				}
			],
			oot: {
				period: "2024-05-12 → 2024-09-25",
				pf: 1.058,
				n: 1323,
				perDay: 9.728,
				greenHours: .477,
				wr: .556
			},
			period: "2025-10-11 → 2026-09-26",
			source: "complete causal 48h walk-forward runs over each period, 40 symbols, 1h bars, 0.2% round-trip cost (docs/matrix.md, docs/matrix/mom-none-std-ln12.*)"
		}
	},
	{
		id: "mx-mom-none-std-ln12-all-on",
		label: "RSI momentum · All on (no Active) · last-N 12",
		info: "Worst period PF 1.03 over three separate periods of real 1h data (the 2024 period was never used for any selection). RSI momentum: 7 bot × indication pairs, fixed selection, execution “All on (no Active)”.",
		kind: "research",
		at: 1790444372244,
		settings: {
			tfMin: 60,
			historyDays: 35,
			focus: [
				"follow|rsi-mom-10-25",
				"follow|rsi-mom-14-15",
				"follow|rsi-mom-14-20",
				"follow|rsi-mom-14-25",
				"follow|rsi-mom-21-15",
				"follow|rsi-mom-21-20",
				"follow|rsi-mom-21-25"
			],
			grid: {
				tp: [
					.03,
					.05,
					.08
				],
				slOfTp: [1, 2],
				trailOfTp: [0, .5],
				minTrail: .006,
				minSl: .01,
				holdH: [16, 24]
			},
			tactics: {
				session: false,
				volRegime: false,
				trendStrength: false,
				cooldown: false,
				cooldownBars: 4
			},
			block: {
				ratio: .2,
				maxLevel: 6,
				minActiveLevel: 1,
				maxMult: 2.5
			},
			dca: {
				levels: 2,
				step: .02
			},
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
		wf: {
			preH: 20,
			simH: 48,
			longH: 336,
			stepH: 1,
			mode: "fixed",
			maxPerSymbol: 2,
			portfolio: 16,
			lastN: 12
		},
		metrics: {
			pf: 1.058,
			n: 3350,
			perDay: 9.571,
			wr: .516,
			net: 588.669,
			greenHours: .515,
			greenDays: .402,
			positiveRuns: 63,
			runs: 175,
			ddtH: 6271,
			checks: [
				{
					period: "2025-10-11 → 2026-09-26",
					label: "research year",
					pf: 1.058,
					n: 3350,
					perDay: 9.571,
					greenHours: .515,
					wr: .516,
					positiveRuns: 63,
					runs: 175
				},
				{
					period: "2024-10-11 → 2025-09-26",
					label: "prior year",
					pf: 1.03,
					n: 3555,
					perDay: 10.157,
					greenHours: .532,
					wr: .559,
					positiveRuns: 66,
					runs: 175
				},
				{
					period: "2024-05-12 → 2024-09-25",
					label: "2024 (never selected on)",
					pf: 1.056,
					n: 1308,
					perDay: 9.618,
					greenHours: .492,
					wr: .56,
					positiveRuns: 20,
					runs: 68
				}
			],
			oot: {
				period: "2024-05-12 → 2024-09-25",
				pf: 1.056,
				n: 1308,
				perDay: 9.618,
				greenHours: .492,
				wr: .56
			},
			period: "2025-10-11 → 2026-09-26",
			source: "complete causal 48h walk-forward runs over each period, 40 symbols, 1h bars, 0.2% round-trip cost (docs/matrix.md, docs/matrix/mom-none-std-ln12.*)"
		}
	},
	{
		id: "mx-mom-none-std-ln12-normal-off+block",
		label: "RSI momentum · Normal off, Block + DCA · last-N 12",
		info: "Worst period PF 1.03 over three separate periods of real 1h data (the 2024 period was never used for any selection). RSI momentum: 7 bot × indication pairs, fixed selection, execution “Normal off, Block + DCA”.",
		kind: "research",
		at: 1790444372244,
		settings: {
			tfMin: 60,
			historyDays: 35,
			focus: [
				"follow|rsi-mom-10-25",
				"follow|rsi-mom-14-15",
				"follow|rsi-mom-14-20",
				"follow|rsi-mom-14-25",
				"follow|rsi-mom-21-15",
				"follow|rsi-mom-21-20",
				"follow|rsi-mom-21-25"
			],
			grid: {
				tp: [
					.03,
					.05,
					.08
				],
				slOfTp: [1, 2],
				trailOfTp: [0, .5],
				minTrail: .006,
				minSl: .01,
				holdH: [16, 24]
			},
			tactics: {
				session: false,
				volRegime: false,
				trendStrength: false,
				cooldown: false,
				cooldownBars: 4
			},
			block: {
				ratio: .2,
				maxLevel: 6,
				minActiveLevel: 1,
				maxMult: 2.5
			},
			dca: {
				levels: 2,
				step: .02
			},
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
		wf: {
			preH: 20,
			simH: 48,
			longH: 336,
			stepH: 1,
			mode: "fixed",
			maxPerSymbol: 2,
			portfolio: 16,
			lastN: 12
		},
		metrics: {
			pf: 1.076,
			n: 3233,
			perDay: 9.237,
			wr: .525,
			net: 755.036,
			greenHours: .524,
			greenDays: .404,
			positiveRuns: 63,
			runs: 175,
			ddtH: 6247,
			checks: [
				{
					period: "2025-10-11 → 2026-09-26",
					label: "research year",
					pf: 1.076,
					n: 3233,
					perDay: 9.237,
					greenHours: .524,
					wr: .525,
					positiveRuns: 63,
					runs: 175
				},
				{
					period: "2024-10-11 → 2025-09-26",
					label: "prior year",
					pf: 1.029,
					n: 3485,
					perDay: 9.957,
					greenHours: .536,
					wr: .561,
					positiveRuns: 64,
					runs: 175
				},
				{
					period: "2024-05-12 → 2024-09-25",
					label: "2024 (never selected on)",
					pf: 1.058,
					n: 1271,
					perDay: 9.346,
					greenHours: .502,
					wr: .566,
					positiveRuns: 20,
					runs: 68
				}
			],
			oot: {
				period: "2024-05-12 → 2024-09-25",
				pf: 1.058,
				n: 1271,
				perDay: 9.346,
				greenHours: .502,
				wr: .566
			},
			period: "2025-10-11 → 2026-09-26",
			source: "complete causal 48h walk-forward runs over each period, 40 symbols, 1h bars, 0.2% round-trip cost (docs/matrix.md, docs/matrix/mom-none-std-ln12.*)"
		}
	},
	{
		id: "mx-mom-none-std-ln12-trailing+block-active",
		label: "RSI momentum · Normal off · Trailing + Block Active · last-N 12",
		info: "Worst period PF 1.02 over three separate periods of real 1h data (the 2024 period was never used for any selection). RSI momentum: 7 bot × indication pairs, fixed selection, execution “Normal off · Trailing + Block Active”.",
		kind: "research",
		at: 1790444372244,
		settings: {
			tfMin: 60,
			historyDays: 35,
			focus: [
				"follow|rsi-mom-10-25",
				"follow|rsi-mom-14-15",
				"follow|rsi-mom-14-20",
				"follow|rsi-mom-14-25",
				"follow|rsi-mom-21-15",
				"follow|rsi-mom-21-20",
				"follow|rsi-mom-21-25"
			],
			grid: {
				tp: [
					.03,
					.05,
					.08
				],
				slOfTp: [1, 2],
				trailOfTp: [0, .5],
				minTrail: .006,
				minSl: .01,
				holdH: [16, 24]
			},
			tactics: {
				session: false,
				volRegime: false,
				trendStrength: false,
				cooldown: false,
				cooldownBars: 4
			},
			block: {
				ratio: .2,
				maxLevel: 6,
				minActiveLevel: 1,
				maxMult: 2.5
			},
			dca: {
				levels: 2,
				step: .02
			},
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
		wf: {
			preH: 20,
			simH: 48,
			longH: 336,
			stepH: 1,
			mode: "fixed",
			maxPerSymbol: 2,
			portfolio: 16,
			lastN: 12
		},
		metrics: {
			pf: 1.043,
			n: 3008,
			perDay: 8.594,
			wr: .522,
			net: 409.682,
			greenHours: .517,
			greenDays: .394,
			positiveRuns: 58,
			runs: 175,
			ddtH: 4731,
			checks: [
				{
					period: "2025-10-11 → 2026-09-26",
					label: "research year",
					pf: 1.043,
					n: 3008,
					perDay: 8.594,
					greenHours: .517,
					wr: .522,
					positiveRuns: 58,
					runs: 175
				},
				{
					period: "2024-10-11 → 2025-09-26",
					label: "prior year",
					pf: 1.022,
					n: 3231,
					perDay: 9.231,
					greenHours: .519,
					wr: .547,
					positiveRuns: 60,
					runs: 175
				},
				{
					period: "2024-05-12 → 2024-09-25",
					label: "2024 (never selected on)",
					pf: 1.069,
					n: 1261,
					perDay: 9.272,
					greenHours: .486,
					wr: .565,
					positiveRuns: 21,
					runs: 68
				}
			],
			oot: {
				period: "2024-05-12 → 2024-09-25",
				pf: 1.069,
				n: 1261,
				perDay: 9.272,
				greenHours: .486,
				wr: .565
			},
			period: "2025-10-11 → 2026-09-26",
			source: "complete causal 48h walk-forward runs over each period, 40 symbols, 1h bars, 0.2% round-trip cost (docs/matrix.md, docs/matrix/mom-none-std-ln12.*)"
		}
	},
	{
		id: "mx-mom-none-std-ln12-trailing+dca",
		label: "RSI momentum · Normal off · Trailing + DCA · last-N 12",
		info: "Worst period PF 1.02 over three separate periods of real 1h data (the 2024 period was never used for any selection). RSI momentum: 7 bot × indication pairs, fixed selection, execution “Normal off · Trailing + DCA”.",
		kind: "research",
		at: 1790444372244,
		settings: {
			tfMin: 60,
			historyDays: 35,
			focus: [
				"follow|rsi-mom-10-25",
				"follow|rsi-mom-14-15",
				"follow|rsi-mom-14-20",
				"follow|rsi-mom-14-25",
				"follow|rsi-mom-21-15",
				"follow|rsi-mom-21-20",
				"follow|rsi-mom-21-25"
			],
			grid: {
				tp: [
					.03,
					.05,
					.08
				],
				slOfTp: [1, 2],
				trailOfTp: [0, .5],
				minTrail: .006,
				minSl: .01,
				holdH: [16, 24]
			},
			tactics: {
				session: false,
				volRegime: false,
				trendStrength: false,
				cooldown: false,
				cooldownBars: 4
			},
			block: {
				ratio: .2,
				maxLevel: 6,
				minActiveLevel: 1,
				maxMult: 2.5
			},
			dca: {
				levels: 2,
				step: .02
			},
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
		wf: {
			preH: 20,
			simH: 48,
			longH: 336,
			stepH: 1,
			mode: "fixed",
			maxPerSymbol: 2,
			portfolio: 16,
			lastN: 12
		},
		metrics: {
			pf: 1.071,
			n: 3473,
			perDay: 9.923,
			wr: .549,
			net: 344.01,
			greenHours: .542,
			greenDays: .42,
			positiveRuns: 64,
			runs: 175,
			ddtH: 2471,
			checks: [
				{
					period: "2025-10-11 → 2026-09-26",
					label: "research year",
					pf: 1.071,
					n: 3473,
					perDay: 9.923,
					greenHours: .542,
					wr: .549,
					positiveRuns: 64,
					runs: 175
				},
				{
					period: "2024-10-11 → 2025-09-26",
					label: "prior year",
					pf: 1.017,
					n: 3571,
					perDay: 10.203,
					greenHours: .544,
					wr: .575,
					positiveRuns: 58,
					runs: 175
				},
				{
					period: "2024-05-12 → 2024-09-25",
					label: "2024 (never selected on)",
					pf: 1.024,
					n: 1341,
					perDay: 9.86,
					greenHours: .513,
					wr: .565,
					positiveRuns: 24,
					runs: 68
				}
			],
			oot: {
				period: "2024-05-12 → 2024-09-25",
				pf: 1.024,
				n: 1341,
				perDay: 9.86,
				greenHours: .513,
				wr: .565
			},
			period: "2025-10-11 → 2026-09-26",
			source: "complete causal 48h walk-forward runs over each period, 40 symbols, 1h bars, 0.2% round-trip cost (docs/matrix.md, docs/matrix/mom-none-std-ln12.*)"
		}
	}
];
/** Strip what a preset must never carry or change (Live stage, universe size is kept). */
function presetSettings(s) {
	const { live: _live, ...rest } = s;
	return structuredClone(rest);
}
/** Stable identity of a settings + wf pair (for de-duplicating auto presets). */
function presetKey(settings, wf) {
	const norm = (o) => Array.isArray(o) ? o.map(norm) : o && typeof o === "object" ? Object.fromEntries(Object.keys(o).sort().map((k) => [k, norm(o[k])])) : o;
	const json = JSON.stringify(norm({
		settings: presetSettings(settings),
		wf
	}));
	let h = 2166136261;
	for (let i = 0; i < json.length; i++) h = Math.imul(h ^ json.charCodeAt(i), 16777619);
	return (h >>> 0).toString(36);
}
function metricsFromStats(st, spanH, period, source, extra = {}) {
	return {
		pf: st.pf,
		n: st.n,
		perDay: spanH > 0 ? st.n * 24 / spanH : 0,
		wr: st.wr,
		net: st.net,
		greenHours: st.gh,
		ddtH: st.ddt,
		period,
		source,
		...extra
	};
}
/** Insert or replace; an auto preset for the same settings is replaced only by a better (PF) run. Keeps `max`. */
function upsertPreset(list, p, max = 40) {
	const out = [...list];
	const i = out.findIndex((x) => x.id === p.id);
	if (i >= 0) {
		if (p.kind === "auto" && out[i].kind === "auto" && out[i].metrics.pf >= p.metrics.pf) return out;
		out[i] = p;
	} else out.push(p);
	while (out.length > max) {
		const pick = (kind) => out.map((x, k) => [x, k]).filter(([x]) => x.kind === kind).sort((a, b) => a[0].at - b[0].at)[0]?.[1];
		const j = pick("auto") ?? pick("saved");
		if (j === void 0) break;
		out.splice(j, 1);
	}
	return out;
}
/** Whether a simulated run qualifies for an automatic preset. */
function qualifies(st, stable, minPf, minTrades) {
	return stable && st.n >= minTrades && st.pf >= minPf && st.net > 0;
}
//#endregion
export { RESEARCH_PRESETS, metricsFromStats, presetKey, presetSettings, qualifies, upsertPreset };
