import { i as __toESM } from "../_runtime.mjs";
import { H as require_react, x as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { C as downloadFile, M as usePoll, O as saveCoreSettings, c as Pill, n as Empty, r as ErrorNote, s as Panel, t as Confirm, u as Switch, x as coreStatus, y as coreSettings } from "./ui-Bl7sOgcb.mjs";
import { n as SIGNAL_COUNT_CHOICES, r as SIGNAL_SOURCES, t as DEFAULT_SIGNALS } from "./signal-config-B9M82AI0.mjs";
import { c as GATE_PRESETS, d as MIN_PF_CHOICES, p as STRATEGY_PRESETS, u as MAX_DDT_CHOICES } from "./config-D_G1clvp.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/settings-BI-veIjx.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var INDICATION_KINDS = [
	"trend",
	"break",
	"active",
	"direction",
	"move",
	"rsi",
	"bollinger",
	"sar",
	"macd",
	"ema",
	"osc",
	"volume",
	"channel",
	"ichimoku",
	"smooth"
];
var BLOCK_SOURCE_HELP = [
	["config", "the config set's own closed positions"],
	["overall", "every executed position"],
	["symbol", "positions on the same symbol"],
	["direction", "positions on the same side (long / short)"],
	["indication", "positions of the same indication type"],
	["type", "positions of the same strategy type (Normal, Trailing, DCA, Axis)"]
];
/** Block sources and how their levels combine (shared = strongest source, additive = sum). */
function BlockSources(props) {
	const src = props.block.sources ?? {};
	const on = (k) => k === "config" ? src.config !== false : !!src[k];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "v2-lines",
		style: {
			gap: 6,
			marginTop: 8
		},
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
			label: "Type",
			hint: "shared: strongest source's level · additive: levels add up (capped by max multiple)",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
				className: "v2-select",
				"aria-label": "Block type",
				value: props.block.mode ?? "shared",
				onChange: (e) => props.set(["block", "mode"], e.target.value),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
					value: "shared",
					children: "Shared"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
					value: "additive",
					children: "Additive"
				})]
			})
		}), BLOCK_SOURCE_HELP.map(([k, help]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			style: {
				display: "flex",
				gap: 10,
				alignItems: "center"
			},
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
				label: `Block source ${k}`,
				checked: on(k),
				onChange: (v) => props.set([
					"block",
					"sources",
					k
				], v)
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				style: {
					fontWeight: 600,
					textTransform: "capitalize"
				},
				children: k
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "v2-muted",
				style: { fontSize: "var(--v-fs-xs)" },
				children: help
			})] })]
		}, k))]
	});
}
/**
* Signals processing: proven sources in a short and a medium range, the best N active (by Base, per symbol),
* each with its own 15 Normal + 15 Trailing configs run independently per symbol and direction, and the last-N
* guard that disables a config while its recent results average below zero.
*/
function SignalsSettings(props) {
	const g = {
		...DEFAULT_SIGNALS,
		...props.signals ?? {}
	};
	const guard = {
		...DEFAULT_SIGNALS.guard,
		...g.guard ?? {}
	};
	const cluster = {
		...DEFAULT_SIGNALS.cluster,
		...g.cluster ?? {}
	};
	const ranges = {
		...DEFAULT_SIGNALS.ranges,
		...g.ranges ?? {}
	};
	const normal = {
		...DEFAULT_SIGNALS.normal,
		...g.normal ?? {}
	};
	const trailing = {
		...DEFAULT_SIGNALS.trailing,
		...g.trailing ?? {}
	};
	const lanes = g.lanes?.length ? g.lanes : DEFAULT_SIGNALS.lanes;
	const src = g.sources ?? {};
	const set = (path, v) => props.set(["signals", ...path], v);
	const nConfigs = normal.tp.length * normal.slOfTp.length + trailing.tp.length * trailing.trailOfTp.length;
	const st = props.status;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "v2-lines",
		style: { gap: 10 },
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				style: {
					display: "flex",
					gap: 10,
					alignItems: "center",
					flexWrap: "wrap"
				},
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
						label: "Signals processing",
						checked: !!g.enabled,
						onChange: (v) => set(["enabled"], v)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						style: { fontWeight: 600 },
						children: g.enabled ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "v2-up",
							children: "Signals on"
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "v2-muted",
							children: "Signals off"
						})
					}),
					st?.enabled ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "v2-muted",
						style: { fontSize: "var(--v-fs-xs)" },
						children: [
							st.combos,
							" scored · ",
							st.active,
							" active · ",
							st.configs,
							" configs",
							st.trades !== void 0 ? ` · ${st.trades} orders` : "",
							st.disabled ? ` · ${st.disabled} guarded` : ""
						]
					}) : null
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "v2-grid v2-cols-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Active signals",
						hint: "best by Base result per symbol · 10–200",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
							className: "v2-select",
							"aria-label": "Active signals",
							value: g.count,
							onChange: (e) => set(["count"], Number(e.target.value)),
							children: SIGNAL_COUNT_CHOICES.map((n) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: n,
								children: n
							}, n))
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Hold (h)",
						hint: "max hold per signal order",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
							value: g.holdH,
							min: .5,
							max: 96,
							step: .5,
							onChange: (v) => set(["holdH"], v)
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Ranking",
						hint: "drawdown: net ÷ max drawdown, with a minimum of positive 4-hour blocks",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
							className: "v2-select",
							"aria-label": "Signal ranking",
							value: g.rank ?? "drawdown",
							onChange: (e) => set(["rank"], e.target.value),
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "drawdown",
									children: "By drawdown (recovery)"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "lowdd",
									children: "Lowest drawdown (net ÷ drawdown²)"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "net",
									children: "By net result"
								})
							]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Validate on latest hours",
						hint: "a signal trades only while it was also positive over its latest hours",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
							label: "Validate signals on their latest hours",
							checked: g.validate !== false,
							onChange: (v) => set(["validate"], v)
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Stable sources only",
						hint: "a source pauses while its own taken signal orders of the latest days lost (judged at every entry)",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
							label: "Source stability gate",
							checked: g.sourceGate?.enabled === true,
							onChange: (v) => set(["sourceGate", "enabled"], v)
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Stability: days",
						hint: "latest days of taken orders judged · 1–14",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
							value: g.sourceGate?.days ?? 2,
							min: 1,
							max: 14,
							onChange: (v) => set(["sourceGate", "days"], v)
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Stability: positive days (%)",
						hint: "share of its traded days that must be positive",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
							pct: true,
							step: 5,
							min: 0,
							max: 1,
							value: g.sourceGate?.minShare ?? .5,
							onChange: (v) => set(["sourceGate", "minShare"], v)
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Stability: min orders",
						hint: "fewer taken orders than this: not judged yet",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
							value: g.sourceGate?.minTrades ?? 5,
							min: 1,
							max: 100,
							onChange: (v) => set(["sourceGate", "minTrades"], v)
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Validation window (h)",
						hint: "latest hours judged at every step · 2–72",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
							value: g.validateH ?? 24,
							min: 2,
							max: 72,
							onChange: (v) => set(["validateH"], v)
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Min positive 4-h blocks (%)",
						hint: "drawdown ranking only",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
							pct: true,
							step: 5,
							min: 0,
							max: 1,
							value: g.minBlockShare ?? .6,
							onChange: (v) => set(["minBlockShare"], v)
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Min Base trades",
						hint: "per signal and symbol to be ranked",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
							value: g.minTrades,
							min: 1,
							max: 100,
							onChange: (v) => set(["minTrades"], v)
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Guard: last N",
						hint: "a config × symbol × direction pauses while its last N average < 0",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								gap: 8,
								alignItems: "center"
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
								label: "Signal guard",
								checked: guard.enabled,
								onChange: (v) => set(["guard", "enabled"], v)
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
								value: guard.lastN,
								min: 2,
								max: 50,
								onChange: (v) => set(["guard", "lastN"], v)
							})]
						})
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "v2-grid v2-cols-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Ranges",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							style: {
								display: "flex",
								gap: 14,
								alignItems: "center"
							},
							children: ["short", "medium"].map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								style: {
									display: "inline-flex",
									gap: 6,
									alignItems: "center"
								},
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
									label: `Range ${r}`,
									checked: !!ranges[r],
									disabled: !!ranges[r] && !ranges[r === "short" ? "medium" : "short"],
									onChange: (v) => set(["ranges", r], v)
								}), r]
							}, r))
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Timeframe lanes",
						hint: "of the engine's lanes",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							style: {
								display: "flex",
								gap: 12,
								alignItems: "center",
								flexWrap: "wrap"
							},
							children: [
								1,
								5,
								15,
								30
							].map((tf) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								style: {
									display: "inline-flex",
									gap: 6,
									alignItems: "center"
								},
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
										label: `Signal lane ${tf}m`,
										checked: lanes.includes(tf),
										disabled: lanes.length === 1 && lanes.includes(tf),
										onChange: (v) => set(["lanes"], [
											1,
											5,
											15,
											30
										].filter((x) => x === tf ? v : lanes.includes(x)))
									}),
									tf,
									"m"
								]
							}, tf))
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Orders / symbol",
						hint: "signal orders' own cap · 0 = no limit",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
							value: g.perSymbol ?? 0,
							min: 0,
							max: 1e3,
							onChange: (v) => set(["perSymbol"], v)
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Open orders",
						hint: "signal orders' own cap · 0 = no limit",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
							value: g.maxOpen ?? 0,
							min: 0,
							max: 1e5,
							onChange: (v) => set(["maxOpen"], v)
						})
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "v2-grid v2-cols-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Loss-cluster guard",
						hint: "pause signal executions while many signals just lost together (all keep being computed)",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
							label: "Signal loss-cluster guard",
							checked: cluster.enabled,
							onChange: (v) => set(["cluster", "enabled"], v)
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Cluster window (min)",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
							value: cluster.windowMin,
							min: 5,
							max: 720,
							onChange: (v) => set(["cluster", "windowMin"], v)
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Min losing closes",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
							value: cluster.minLosses,
							min: 1,
							max: 1e3,
							onChange: (v) => set(["cluster", "minLosses"], v)
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Min loss share (%)",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
							pct: true,
							step: 5,
							min: .3,
							max: 1,
							value: cluster.lossShare,
							onChange: (v) => set(["cluster", "lossShare"], v)
						})
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "v2-grid v2-cols-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: `Normal: targets (%) × stop ratios → ${normal.tp.length * normal.slOfTp.length} configs`,
					hint: "targets at the 15m reference, scaled per lane · stop = target × ratio",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "v2-grid v2-cols-2",
						style: { gap: 6 },
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(List, {
							pct: true,
							value: normal.tp,
							onChange: (v) => set(["normal", "tp"], v)
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(List, {
							value: normal.slOfTp,
							onChange: (v) => set(["normal", "slOfTp"], v)
						})]
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: `Trailing: targets (%) × trail shares → ${trailing.tp.length * trailing.trailOfTp.length} configs`,
					hint: "trail = target × share · stop = target × stop ratio (wider)",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "v2-grid v2-cols-3",
						style: { gap: 6 },
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(List, {
								pct: true,
								value: trailing.tp,
								onChange: (v) => set(["trailing", "tp"], v)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(List, {
								value: trailing.trailOfTp,
								onChange: (v) => set(["trailing", "trailOfTp"], v)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
								value: trailing.slOfTp,
								step: .25,
								min: .2,
								max: 5,
								onChange: (v) => set(["trailing", "slOfTp"], v)
							})
						]
					})
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "v2-muted",
				style: { fontSize: "var(--v-fs-xs)" },
				children: [nConfigs, " configs per signal, each run on its own per symbol and direction."]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				style: {
					fontWeight: 600,
					marginBottom: 6
				},
				children: "Sources"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "v2-grid v2-cols-4",
				style: { gap: 6 },
				children: SIGNAL_SOURCES.map((x) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					style: {
						display: "flex",
						gap: 8,
						alignItems: "center"
					},
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
						label: `Signal source ${x.label}`,
						checked: src[x.name] !== false,
						onChange: (v) => set(["sources", x.name], v)
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: x.label })]
				}, x.name))
			})] })
		]
	});
}
var TF_HELP = {
	1: "base data · every lane is derived from the 1m candles",
	5: "5 × 1m",
	15: "15 × 1m",
	30: "30 × 1m"
};
/**
* Timeframe lanes: all processed at once, each independent and combined (kept only where every higher enabled
* timeframe agrees). 1m is the base and always on; the days are each lane's history.
*/
function Timeframes(props) {
	const on = new Set(props.tfs ?? [
		1,
		5,
		15,
		30
	]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "v2-lines",
		style: { gap: 8 },
		children: [
			1,
			5,
			15,
			30
		].map((tf) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			style: {
				display: "flex",
				gap: 10,
				alignItems: "center",
				flexWrap: "wrap"
			},
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
					label: `Timeframe ${tf}m`,
					checked: on.has(tf),
					disabled: tf === 1,
					onChange: (v) => props.set(["tfs"], [
						1,
						5,
						15,
						30
					].filter((x) => x === tf ? v : on.has(x)))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					style: {
						minWidth: 150,
						flex: 1
					},
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						style: { fontWeight: 600 },
						children: [
							tf,
							"m",
							" ",
							on.has(tf) ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "v2-up",
								children: "· processed"
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "v2-muted",
								children: "· off"
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "v2-muted",
						style: { fontSize: "var(--v-fs-xs)" },
						children: [
							TF_HELP[tf],
							" · independent",
							tf < 30 ? " + combined" : ""
						]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					style: { width: 110 },
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
						value: props.tfDays?.[String(tf)] ?? 3,
						min: 1,
						max: 45,
						onChange: (v) => props.set(["tfDays", String(tf)], v)
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "v2-muted",
					style: { fontSize: "var(--v-fs-xs)" },
					children: "days"
				})
			]
		}, tf))
	});
}
function Field(props) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
		style: {
			display: "grid",
			gap: 3,
			fontSize: "var(--v-fs-sm)"
		},
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				style: {
					color: "var(--v-text-2)",
					fontWeight: 600
				},
				children: props.label
			}),
			props.children,
			props.hint && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "v2-muted",
				style: { fontSize: "var(--v-fs-xs)" },
				children: props.hint
			})
		]
	});
}
function Num(props) {
	const toText = (v) => String(props.pct ? +(v * 100).toFixed(4) : v);
	const [text, setText] = (0, import_react.useState)(toText(props.value));
	const [focus, setFocus] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		if (!focus) setText(toText(props.value));
	}, [
		props.value,
		props.pct,
		focus
	]);
	const typed = Number(text);
	const val = props.pct ? typed / 100 : typed;
	const eps = 1e-12;
	const bad = text.trim() === "" || !Number.isFinite(typed) || props.min !== void 0 && val < props.min - eps || props.max !== void 0 && val > props.max + eps;
	const scale = (x) => x === void 0 ? void 0 : props.pct ? +(x * 100).toFixed(6) : x;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
		className: "v2-input",
		type: "number",
		inputMode: "decimal",
		step: props.step ?? (props.pct ? .01 : 1),
		min: scale(props.min),
		max: scale(props.max),
		value: text,
		"aria-invalid": bad,
		style: bad ? { borderColor: "var(--v-down)" } : void 0,
		onFocus: () => setFocus(true),
		onBlur: () => {
			setFocus(false);
			if (bad) setText(toText(props.value));
		},
		onChange: (e) => {
			setText(e.target.value);
			const v = Number(e.target.value);
			if (e.target.value.trim() === "" || !Number.isFinite(v)) return;
			const x = props.pct ? v / 100 : v;
			if (props.min !== void 0 && x < props.min - 1e-12) return;
			if (props.max !== void 0 && x > props.max + 1e-12) return;
			props.onChange(x);
		}
	});
}
function List(props) {
	const toText = (xs) => xs.map((v) => props.pct ? +(v * 100).toFixed(4) : v).join(", ");
	const [text, setText] = (0, import_react.useState)(toText(props.value));
	const [focus, setFocus] = (0, import_react.useState)(false);
	const parse = (t) => t.split(/[,\s]+/).filter(Boolean).map(Number).filter((x) => Number.isFinite(x));
	(0, import_react.useEffect)(() => {
		if (!focus) setText(toText(props.value));
	}, [
		props.value,
		props.pct,
		focus
	]);
	const bad = parse(text).length === 0;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
		className: "v2-input",
		value: text,
		"aria-invalid": bad,
		style: bad ? { borderColor: "var(--v-down)" } : void 0,
		onFocus: () => setFocus(true),
		onChange: (e) => setText(e.target.value),
		onBlur: () => {
			setFocus(false);
			const xs = parse(text);
			if (xs.length) props.onChange(xs.map((x) => props.pct ? x / 100 : x));
			setText(toText(xs.length ? xs.map((x) => props.pct ? x / 100 : x) : props.value));
		}
	});
}
/** how the universe is chosen (settings.symbolRank; default 1H volatility) */
var SYMBOL_RANK = {
	volatility1h: "1H volatility",
	volume: "24h quote volume",
	market: "market majors",
	gainers: "24h gainers",
	losers: "24h losers"
};
var TOGGLE_HELP = {
	normal: "the base sets (Normal and Trailing); off = the unadjusted base never executes — only Block-raised entries, and DCA / Axis keep running on it",
	trailing: "trailing-stop variants; off = no trailing anywhere (base, Block, signals), still computed",
	block: "adds +ratio volume per passing last-n window (1..max)",
	blockActive: "Active: Block raises volume only from its min level (a sustained streak); below it an entry is the plain base — executed with Normal on, skipped with Normal off",
	dca: "adds legs at deeper levels, target re-anchored to the average",
	dcaActive: "Active: skip the base leg, trade only the higher-level (better-priced) fill",
	axis: "Axis: mean-reversion ladder toward the axis (EMA centre), rungs at ATR spacing"
};
/** Free text while typing; parsed into pairs on blur (typing commas / spaces is never eaten). */
function FocusText(props) {
	const [text, setText] = (0, import_react.useState)(props.value.join(", "));
	const [focus, setFocus] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		if (!focus) setText(props.value.join(", "));
	}, [props.value, focus]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
		className: "v2-input",
		rows: 4,
		value: text,
		onFocus: () => setFocus(true),
		onChange: (e) => setText(e.target.value),
		onBlur: () => {
			setFocus(false);
			props.onChange(text.split(/[,\s]+/).map((x) => x.trim()).filter(Boolean));
		}
	});
}
var TACTIC_HELP = {
	session: "EU/US session only — signals on bars opening 07:00–20:59 UTC",
	volRegime: "volatility regime — ATR% in the upper half of its last ~2 weeks",
	trendStrength: "trend strength — ADX(14) ≥ 20",
	cooldown: "pacing — after an exit the config waits N bars before re-entering the symbol"
};
function SettingsPage() {
	const [s, setS] = (0, import_react.useState)(null);
	const [wf, setWf] = (0, import_react.useState)(null);
	const [error, setError] = (0, import_react.useState)(null);
	const [saved, setSaved] = (0, import_react.useState)(null);
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [base, setBase] = (0, import_react.useState)("");
	const [ask, setAsk] = (0, import_react.useState)(null);
	const [savedAt, setSavedAt] = (0, import_react.useState)(null);
	const fileRef = (0, import_react.useRef)(null);
	const { data: st } = usePoll(() => coreStatus(), 2500);
	const status = st;
	const load = () => coreSettings().then((d) => {
		setS(d.settings);
		setWf(d.wf);
		setBase(JSON.stringify({
			settings: d.settings,
			wf: d.wf
		}));
	}).catch((e) => setError(String(e?.message ?? e)));
	(0, import_react.useEffect)(() => {
		load();
	}, []);
	if (!s || !wf) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ErrorNote, { error }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Empty, { children: "Loading…" }) });
	const dirty = base !== "" && JSON.stringify({
		settings: s,
		wf
	}) !== base;
	const applied = !!savedAt && !!status && status.appliedSettingsAt >= status.settingsAt && (status.settingsAt > savedAt.settingsAt || status.lastComputeAt > savedAt.lastComputeAt) && !status.pending;
	const applyState = !savedAt ? null : applied ? `applied in compute #${status.computes}` : status?.state === "computing" ? `applying… ${status.stage} ${Math.round((status.progress ?? 0) * 100)}%` : "applying…";
	const set = (path, v) => {
		setS((prev) => {
			const next = structuredClone(prev);
			let o = next;
			for (const k of path.slice(0, -1)) o = o[k] ??= {};
			o[path[path.length - 1]] = v;
			return next;
		});
		setSaved(null);
	};
	const setW = (k, v) => {
		setWf((p) => ({
			...p,
			[k]: v
		}));
		setSaved(null);
	};
	const save = async () => {
		setBusy(true);
		setError(null);
		try {
			const b = base ? JSON.parse(base) : {
				settings: {},
				wf: {}
			};
			const diff = (cur, old) => Object.fromEntries(Object.keys(cur).filter((k) => JSON.stringify(cur[k]) !== JSON.stringify(old?.[k])).map((k) => [k, cur[k]]));
			const pre = await coreStatus().catch(() => status);
			await saveCoreSettings({ data: {
				settings: diff(s, b.settings),
				wf: diff(wf, b.wf)
			} });
			setSavedAt({
				settingsAt: pre?.settingsAt ?? 0,
				lastComputeAt: pre?.lastComputeAt ?? 0
			});
			setSaved("Saved");
			await load();
		} catch (e) {
			setError(e instanceof Error ? e.message : String(e));
		} finally {
			setBusy(false);
		}
	};
	const importFile = (f) => f.text().then((t) => {
		try {
			const j = JSON.parse(t);
			const merge = (a, b) => {
				if (!b || typeof b !== "object" || Array.isArray(b)) return b ?? a;
				const out = { ...a ?? {} };
				for (const k of Object.keys(b)) out[k] = a && typeof a[k] === "object" && !Array.isArray(a[k]) ? merge(a[k], b[k]) : b[k];
				return out;
			};
			const wantLive = j.settings?.live?.enabled === true && !s.live.enabled;
			if (j.settings?.live && j.settings.live.enabled === true) delete j.settings.live.enabled;
			const toMainnet = j.settings?.live?.connId === "bingx-x01" && s.live.connId !== "bingx-x01" && s.live.enabled;
			if (toMainnet) delete j.settings.live.connId;
			if (j.settings) setS((cur) => merge(cur, j.settings));
			if (j.wf) setWf((cur) => ({
				...cur,
				...j.wf
			}));
			setSaved("Imported — press Save to apply");
			if (toMainnet) setAsk("mainnet");
			else if (wantLive) setAsk("live");
		} catch {
			setError("Not a settings JSON");
		}
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ErrorNote, { error }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Confirm, {
			open: ask !== null,
			title: ask === "live" ? `Enable the Live stage on ${s.live.connId}?` : ask === "mainnet" ? "Switch the Live connection to bingx-x01 (mainnet)?" : "Discard unsaved changes?",
			danger: ask === "live" || ask === "mainnet",
			confirm: ask === "live" ? "Enable Live" : ask === "mainnet" ? "Switch to mainnet" : "Discard",
			body: ask === "mainnet" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "v2-down",
				style: { fontWeight: 600 },
				children: "Live is on — after Save, orders go to the MAINNET account with real money."
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
				"Up to ",
				s.live.maxPositions > 0 ? s.live.maxPositions : "unlimited",
				" positions of $",
				s.live.notionalUsd,
				" each. Takes effect after Save."
			] })] }) : ask === "live" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [s.live.connId === "bingx-x01" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "v2-down",
				style: { fontWeight: 600 },
				children: "This is the MAINNET account — real money."
			}) : null, /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
				"Orders are only sent when the host also has CTS_CORE_LIVE=1 and API keys, and only while the rolling simulated run holds PF ≥ ",
				s.gates.minPf,
				" and is stable. Up to",
				" ",
				s.live.maxPositions > 0 ? s.live.maxPositions : "unlimited",
				" positions of $",
				s.live.notionalUsd,
				" each. Takes effect after Save."
			] })] }) : "Your edits on this page are lost and the saved settings are loaded again.",
			onCancel: () => setAsk(null),
			onConfirm: () => {
				if (ask === "live") set(["live", "enabled"], true);
				else if (ask === "mainnet") set(["live", "connId"], "bingx-x01");
				else load();
				setAsk(null);
			}
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
			title: "Settings",
			sub: "stored in the in-memory SQLite (kv) and applied on the next compute",
			right: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
				dirty && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pill, {
					kind: "acc",
					children: "unsaved changes"
				}),
				!dirty && saved && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Pill, {
					kind: applied ? "ok" : void 0,
					children: [
						saved,
						" · ",
						applyState
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "v2-btn",
					onClick: () => fileRef.current?.click(),
					children: "Import"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					ref: fileRef,
					type: "file",
					accept: "application/json",
					hidden: true,
					onChange: (e) => {
						const f = e.target.files?.[0];
						if (f) importFile(f);
						e.target.value = "";
					}
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "v2-btn",
					onClick: () => downloadFile("cts-core-settings.json", JSON.stringify({
						settings: s,
						wf
					}, null, 2)),
					children: "Export"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "v2-btn",
					disabled: !dirty,
					onClick: () => setAsk("reset"),
					children: "Discard"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "v2-btn primary",
					disabled: busy || !dirty,
					onClick: save,
					children: busy ? "Saving…" : "Save"
				})
			] }),
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "v2-grid v2-cols-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Symbols",
						hint: `top by ${SYMBOL_RANK[s.symbolRank ?? "volatility1h"] ?? s.symbolRank}`,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
							value: s.symbols,
							min: 1,
							max: 120,
							onChange: (v) => set(["symbols"], v)
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Base data",
						hint: "1m candles; covers the longest lane history",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "v2-input",
							style: {
								display: "flex",
								alignItems: "center"
							},
							children: [Math.max(...(s.tfs ?? [1]).map((tf) => s.tfDays?.[String(tf)] ?? 0)), " days of 1m"]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Cycle (ms)",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
							value: s.cycleMs,
							step: 50,
							min: 100,
							onChange: (v) => set(["cycleMs"], v)
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Tick (ms)",
						hint: "open positions marked to market + live step",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
							value: s.tickMs ?? 100,
							step: 50,
							min: 50,
							onChange: (v) => set(["tickMs"], v)
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Position cost (round trip, %)",
						hint: "= 2 × (taker + slippage) · set the components below, or directly",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
							pct: true,
							value: s.cost,
							onChange: (v) => set(["cost"], v)
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Order sizing",
						hint: "fixed % of equity compounds with the balance",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
							className: "v2-select",
							"aria-label": "Order sizing",
							value: s.sizing?.mode ?? "equityPct",
							onChange: (e) => set(["sizing", "mode"], e.target.value),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "equityPct",
								children: "% of equity per order"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "fixed",
								children: "Fixed notional"
							})]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "% of equity per order",
						hint: "per order unit; Block volume multiplies it (≤ 8×)",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
							pct: true,
							step: .1,
							min: .001,
							max: .25,
							value: s.sizing?.pct ?? .02,
							onChange: (v) => set(["sizing", "pct"], v)
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Paper balance ($)",
						hint: "starting equity of the paper book",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
							value: s.paperBalance ?? 1e3,
							min: 1,
							onChange: (v) => set(["paperBalance"], v)
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Paper notional ($)",
						hint: "fixed sizing only",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
							value: s.paperNotional,
							onChange: (v) => set(["paperNotional"], v)
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Main config sets",
						hint: "validated pairs given strategy sets · 0 = every validated",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
							value: s.mainTop,
							min: 0,
							onChange: (v) => set(["mainTop"], v)
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Main refine top",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
							value: s.refineTop,
							onChange: (v) => set(["refineTop"], v)
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Evaluated top",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
							value: s.evalTop,
							onChange: (v) => set(["evalTop"], v)
						})
					})
				]
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
			title: "Timeframes",
			sub: "every lane is processed: independent, and combined where it agrees with every higher enabled timeframe",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Timeframes, {
				tfs: s.tfs,
				tfDays: s.tfDays,
				set
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
			title: "Signals",
			sub: "proven signal sources · the best N active · 15 Normal + 15 Trailing configs each, per symbol and direction",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SignalsSettings, {
				signals: s.signals,
				set,
				status: status?.signals
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "v2-grid v2-cols-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
				title: "Gates",
				sub: "PF neutral = 1.00 · default min 1.10",
				right: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
					className: "v2-select",
					"aria-label": "Gate preset",
					onChange: (e) => e.target.value && set(["gates"], { ...GATE_PRESETS[e.target.value] }),
					defaultValue: "",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
						value: "",
						children: "preset…"
					}), Object.keys(GATE_PRESETS).map((k) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
						value: k,
						children: k
					}, k))]
				}),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "v2-grid v2-cols-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Min PF",
							hint: "1.05 – 1.50",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
								className: "v2-select",
								value: MIN_PF_CHOICES.reduce((a, b) => Math.abs(b - s.gates.minPf) < Math.abs(a - s.gates.minPf) ? b : a),
								onChange: (e) => set(["gates", "minPf"], Number(e.target.value)),
								children: MIN_PF_CHOICES.map((v) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: v,
									children: v.toFixed(2)
								}, v))
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Max DDT (hours)",
							hint: "longest drawdown time, 2 – 20 h",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
								className: "v2-select",
								value: MAX_DDT_CHOICES.reduce((a, b) => Math.abs(b - s.gates.maxDdtH) < Math.abs(a - s.gates.maxDdtH) ? b : a),
								onChange: (e) => set(["gates", "maxDdtH"], Number(e.target.value)),
								children: MAX_DDT_CHOICES.map((v) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
									value: v,
									children: [v, " h"]
								}, v))
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Min trades",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
								value: s.gates.minTrades,
								onChange: (v) => set(["gates", "minTrades"], v)
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Eval quorum (0–1)",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
								step: .05,
								value: s.gates.quorum,
								onChange: (v) => set(["gates", "quorum"], v)
							})
						})
					]
				})
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
				title: "Strategies",
				sub: "execution toggles — Base always computes every sub-strategy",
				right: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
					className: "v2-select",
					"aria-label": "Strategy preset",
					onChange: (e) => e.target.value && set(["toggles"], { ...STRATEGY_PRESETS[e.target.value].toggles }),
					defaultValue: "",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
						value: "",
						children: "preset…"
					}), Object.entries(STRATEGY_PRESETS).map(([k, v]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
						value: k,
						children: v.label
					}, k))]
				}),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "v2-lines",
					style: { gap: 8 },
					children: Object.keys(TOGGLE_HELP).map((k) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							gap: 10,
							alignItems: "center"
						},
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
							label: k,
							checked: k === "axis" ? s.toggles[k] !== false : !!s.toggles[k],
							onChange: (v) => set(["toggles", k], v)
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							style: { fontWeight: 600 },
							children: k
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "v2-muted",
							style: { fontSize: "var(--v-fs-xs)" },
							children: TOGGLE_HELP[k]
						})] })]
					}, k))
				})
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "v2-grid v2-cols-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
				title: "Position cost",
				sub: "as charged on the exchange, per side — the engine deducts 2 × (taker + slippage) on every closed position",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "v2-grid v2-cols-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Taker fee (%)",
							hint: "BingX standard 0.05",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
								pct: true,
								step: .001,
								value: s.fees?.taker ?? 5e-4,
								onChange: (v) => {
									set(["fees", "taker"], v);
									set(["cost"], +(2 * (v + (s.fees?.slippage ?? 5e-4))).toFixed(5));
								}
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Maker fee (%)",
							hint: "limit fills (reference)",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
								pct: true,
								step: .001,
								value: s.fees?.maker ?? 2e-4,
								onChange: (v) => set(["fees", "maker"], v)
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Slippage (%)",
							hint: "per side, market orders",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
								pct: true,
								step: .001,
								value: s.fees?.slippage ?? 5e-4,
								onChange: (v) => {
									set(["fees", "slippage"], v);
									set(["cost"], +(2 * ((s.fees?.taker ?? 5e-4) + v)).toFixed(5));
								}
							})
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "v2-muted",
					style: {
						fontSize: "var(--v-fs-xs)",
						marginTop: 6
					},
					children: [
						"Round trip deducted per position: ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", { children: [((s.cost ?? 0) * 100).toFixed(3), " %"] }),
						". With auto-cost on, it is raised to the measured live cost once 40+ fills were measured."
					]
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
				title: "Auto-adjust (live feedback)",
				sub: "per strategy config set: the last N positions, re-scored with the measured live cost",
				right: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
					label: "Auto-adjust enabled",
					checked: !!s.adjust?.enabled,
					onChange: (v) => set(["adjust", "enabled"], v)
				}),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "v2-grid v2-cols-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Positions (last N)",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
								value: s.adjust?.window ?? 15,
								min: 5,
								max: 100,
								onChange: (v) => set(["adjust", "window"], v)
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Adjust below PF",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
								step: .05,
								value: s.adjust?.triggerPf ?? 1,
								onChange: (v) => set(["adjust", "triggerPf"], v)
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Step back at PF",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
								step: .05,
								value: s.adjust?.recoverPf ?? 1.2,
								onChange: (v) => set(["adjust", "recoverPf"], v)
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Min SL step (%)",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
								pct: true,
								step: .01,
								value: s.adjust?.slStep ?? .002,
								onChange: (v) => set(["adjust", "slStep"], v)
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Min SL max (%)",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
								pct: true,
								step: .1,
								value: s.adjust?.slMax ?? .03,
								onChange: (v) => set(["adjust", "slMax"], v)
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Pause at caps (h)",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
								value: s.adjust?.pauseH ?? 12,
								min: 0,
								max: 168,
								onChange: (v) => set(["adjust", "pauseH"], v)
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Min trail step (%)",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
								pct: true,
								step: .01,
								value: s.adjust?.trailStep ?? .001,
								onChange: (v) => set(["adjust", "trailStep"], v)
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Min trail max (%)",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
								pct: true,
								step: .1,
								value: s.adjust?.trailMax ?? .02,
								onChange: (v) => set(["adjust", "trailMax"], v)
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Auto-cost",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
								label: "Auto-cost",
								checked: !!s.adjust?.autoCost,
								onChange: (v) => set(["adjust", "autoCost"], v)
							})
						})
					]
				})
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "v2-grid v2-cols-2",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
					title: "Tactics",
					sub: "entry filters for every combo (Base → Live); each only removes entries — switch off to compute plain signals",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "v2-lines",
						style: { gap: 8 },
						children: Object.keys(TACTIC_HELP).map((k) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								gap: 10,
								alignItems: "center"
							},
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
									label: k,
									checked: !!s.tactics?.[k],
									onChange: (v) => set(["tactics", k], v)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									style: { flex: 1 },
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										style: { fontWeight: 600 },
										children: k
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "v2-muted",
										style: { fontSize: "var(--v-fs-xs)" },
										children: TACTIC_HELP[k]
									})]
								}),
								k === "cooldown" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									style: { width: 90 },
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
										value: s.tactics?.cooldownBars ?? 4,
										min: 0,
										max: 96,
										onChange: (v) => set(["tactics", "cooldownBars"], v)
									})
								})
							]
						}, k))
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
					title: "Indication types",
					sub: "switched-off types are not computed anywhere (Base → Live)",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "v2-grid v2-cols-3",
						style: { gap: 8 },
						children: INDICATION_KINDS.map((k) => {
							const on = !(s.disabledKinds ?? []).includes(k);
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								style: {
									display: "flex",
									gap: 8,
									alignItems: "center"
								},
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
									label: `indication type ${k}`,
									checked: on,
									onChange: (v) => set(["disabledKinds"], v ? (s.disabledKinds ?? []).filter((x) => x !== k) : [...s.disabledKinds ?? [], k])
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									style: { fontWeight: 600 },
									children: k
								})]
							}, k);
						})
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
					title: "Focus",
					sub: "restrict Base to these bot|indication pairs (empty = every combo)",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Pairs",
						hint: "comma separated, e.g. follow|rsi-mom-14-25 — presets fill this",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FocusText, {
							value: s.focus ?? [],
							onChange: (v) => set(["focus"], v)
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "v2-muted",
						style: {
							fontSize: "var(--v-fs-xs)",
							marginTop: 6
						},
						children: (s.focus ?? []).length ? `${s.focus.length} pairs` : "all combos"
					})]
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "v2-grid v2-cols-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
					title: "Block",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "v2-grid v2-cols-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Ratio per level",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
									step: .05,
									value: s.block.ratio,
									onChange: (v) => set(["block", "ratio"], v)
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Max level (last-n 1..N)",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
									value: s.block.maxLevel,
									min: 1,
									max: 12,
									onChange: (v) => set(["block", "maxLevel"], v)
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Active min level",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
									value: s.block.minActiveLevel,
									min: 1,
									onChange: (v) => set(["block", "minActiveLevel"], v)
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Max multiple",
								hint: "the Block stack is capped at 8×",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
									step: .1,
									min: 1,
									max: 8,
									value: s.block.maxMult,
									onChange: (v) => set(["block", "maxMult"], v)
								})
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BlockSources, {
						block: s.block,
						set
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
					title: "Axis",
					sub: "ladder toward the axis price",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "v2-grid v2-cols-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Legs (incl. base)",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
									value: s.axis?.levels ?? 3,
									min: 1,
									max: 8,
									onChange: (v) => set(["axis", "levels"], v)
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Spacing (ATR)",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
									step: .1,
									value: s.axis?.spacing ?? .7,
									onChange: (v) => set(["axis", "spacing"], v)
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Rung size (× normal)",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
									step: .1,
									value: s.axis?.ratio ?? 1,
									onChange: (v) => set(["axis", "ratio"], v)
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Axis EMA",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
									value: s.axis?.center ?? 50,
									onChange: (v) => set(["axis", "center"], v)
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Min displacement (ATR)",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
									step: .05,
									value: s.axis?.minDisp ?? .35,
									onChange: (v) => set(["axis", "minDisp"], v)
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Max displacement (ATR)",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
									step: .1,
									value: s.axis?.maxDisp ?? 2.6,
									onChange: (v) => set(["axis", "maxDisp"], v)
								})
							})
						]
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
					title: "DCA",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "v2-grid v2-cols-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Levels",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
								value: s.dca.levels,
								min: 1,
								max: 6,
								onChange: (v) => set(["dca", "levels"], v)
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Step (%)",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
								pct: true,
								value: s.dca.step,
								onChange: (v) => set(["dca", "step"], v)
							})
						})]
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
					title: "Protect grid",
					sub: "every combination is its own independent tape",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "v2-grid",
						style: { gap: 8 },
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "TP (%)",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(List, {
									pct: true,
									value: s.grid.tp,
									onChange: (v) => set(["grid", "tp"], v)
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "SL × TP (max ratio 2–2.5)",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(List, {
									value: s.grid.slOfTp,
									onChange: (v) => set(["grid", "slOfTp"], v)
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Trail share of TP (0 = off)",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(List, {
									value: s.grid.trailOfTp,
									onChange: (v) => set(["grid", "trailOfTp"], v)
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "v2-grid v2-cols-3",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
										label: "Min trail (%)",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
											pct: true,
											value: s.grid.minTrail,
											onChange: (v) => set(["grid", "minTrail"], v)
										})
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
										label: "Min SL (%)",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
											pct: true,
											value: s.grid.minSl,
											onChange: (v) => set(["grid", "minSl"], v)
										})
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
										label: "Hold (h)",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(List, {
											value: s.grid.holdH,
											onChange: (v) => set(["grid", "holdH"], v)
										})
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "v2-grid v2-cols-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
									label: "Trail step (× activation)",
									hint: "stop distance once active; 1 = plain trail (best after selection), 0.5 locks in half the move",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
										step: .05,
										min: .1,
										max: 1,
										value: s.grid.trailStep ?? 1,
										onChange: (v) => set(["grid", "trailStep"], v)
									})
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									style: {
										display: "flex",
										gap: 10,
										alignItems: "center"
									},
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
										label: "Trail runs free",
										checked: !!s.grid.trailFree,
										onChange: (v) => set(["grid", "trailFree"], v)
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										style: { fontWeight: 600 },
										children: "Trail runs free"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "v2-muted",
										style: { fontSize: "var(--v-fs-xs)" },
										children: "drop the target once the trail is active"
									})] })]
								})]
							})
						]
					})
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "v2-grid v2-cols-2",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
					title: "Real stage (walk-forward)",
					sub: "pre-historic window, last-N and book limits",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "v2-grid v2-cols-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Pre-calc (h)",
								hint: "configs must still work here",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
									value: wf.preH,
									onChange: (v) => setW("preH", v)
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Long window (h)",
								hint: "Main robustness window",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
									value: wf.longH,
									onChange: (v) => setW("longH", v)
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Sim run (h)",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
									value: wf.simH,
									onChange: (v) => setW("simH", v)
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Re-evaluate every (min)",
								hint: "≥ 1 min; never finer than one bar (BingX has no sub-minute history)",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
									value: Math.round((wf.stepH ?? 1) * 60),
									min: 1,
									max: 2880,
									onChange: (v) => setW("stepH", Math.max(1, v) / 60)
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Real seats / family",
								hint: "0 = no limit",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
									value: wf.portfolio,
									min: 0,
									onChange: (v) => setW("portfolio", v)
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Last-N (0 = off)",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
									value: wf.lastN,
									onChange: (v) => setW("lastN", v)
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Last-N min PF",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
									step: .05,
									value: wf.lastNMinPf,
									onChange: (v) => setW("lastNMinPf", v)
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Robust share",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
									step: .05,
									value: wf.robustFrac,
									onChange: (v) => setW("robustFrac", v)
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Max orders / symbol",
								hint: "0 = no limit",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
									value: wf.maxPerSymbol,
									min: 0,
									onChange: (v) => setW("maxPerSymbol", v)
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Max orders / side",
								hint: "0 = no limit",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
									value: wf.maxPerSide,
									min: 0,
									onChange: (v) => setW("maxPerSide", v)
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Max positions",
								hint: "symbol × direction; orders on an open one add no position · 0 = no limit",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
									value: wf.maxPositions ?? 0,
									min: 0,
									onChange: (v) => setW("maxPositions", v)
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Max open orders",
								hint: "0 = no limit",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
									value: wf.maxOpen,
									min: 0,
									onChange: (v) => setW("maxOpen", v)
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Hour guard (%)",
								hint: "0 = off",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
									step: .1,
									value: wf.guardPct,
									onChange: (v) => setW("guardPct", v)
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Selection",
								hint: "fixed = focus pairs trade continuously",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
									className: "v2-select",
									value: wf.mode,
									onChange: (e) => setW("mode", e.target.value),
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: "durable",
											children: "durable winners"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: "hourly",
											children: "re-rank hourly"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: "fixed",
											children: "fixed set"
										})
									]
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Rank by",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
									className: "v2-select",
									value: wf.rank,
									onChange: (e) => setW("rank", e.target.value),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "lcb",
										children: "confidence bound"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "score",
										children: "composite score"
									})]
								})
							})
						]
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
					title: "Coordination",
					sub: "portfolio-level tactics on every order · realized results before each entry only",
					children: (() => {
						const c = {
							enabled: true,
							hourLock: 0,
							cooldown: "off",
							conflict: false,
							confirm: true,
							...wf.coord ?? {}
						};
						const setC = (k, v) => setW("coord", {
							...c,
							[k]: v
						});
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "v2-grid v2-cols-3",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
									label: "Coordination",
									hint: "switches every tactic below",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
										label: "Coordination tactics",
										checked: c.enabled,
										onChange: (v) => setC("enabled", v)
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
									label: "Signal confirmation",
									hint: "a signal enters only while an engine position agrees (symbol + direction)",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
										label: "Signal confirmation",
										checked: c.confirm,
										onChange: (v) => setC("confirm", v)
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
									label: "No opposite entries",
									hint: "skip an entry against an open position on the symbol",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
										label: "No opposite entries",
										checked: c.conflict,
										onChange: (v) => setC("conflict", v)
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
									label: "Hour profit lock (Σ %)",
									hint: "no new entries once the hour made this · 0 = off",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
										step: .5,
										min: 0,
										max: 100,
										value: c.hourLock,
										onChange: (v) => setC("hourLock", v)
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
									label: "After a losing hour",
									hint: "pause entries for the next hour",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
										className: "v2-select",
										"aria-label": "After a losing hour",
										value: c.cooldown,
										onChange: (e) => setC("cooldown", e.target.value),
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
												value: "off",
												children: "keep trading"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
												value: "signals",
												children: "pause signals"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
												value: "all",
												children: "pause all entries"
											})
										]
									})
								})
							]
						});
					})()
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
					title: "Live stage",
					sub: "off by default · also requires CTS_CORE_LIVE=1 on the host",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "v2-grid v2-cols-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Enabled",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
									label: "Live enabled",
									checked: !!s.live.enabled,
									onChange: (v) => v ? setAsk("live") : set(["live", "enabled"], false)
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Connection",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
									className: "v2-select",
									value: s.live.connId,
									onChange: (e) => e.target.value === "bingx-x01" && s.live.enabled ? setAsk("mainnet") : set(["live", "connId"], e.target.value),
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: "bingx-vst-02",
											children: "bingx-vst-02 (testnet)"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: "bingx-vst-01",
											children: "bingx-vst-01 (testnet)"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: "bingx-x01",
											children: "bingx-x01 (mainnet)"
										})
									]
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Notional per entry ($)",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
									value: s.live.notionalUsd,
									onChange: (v) => set(["live", "notionalUsd"], v)
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Max positions",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
									value: s.live.maxPositions,
									min: 0,
									onChange: (v) => set(["live", "maxPositions"], v)
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Margin",
								hint: "per symbol, applied before its first order",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
									className: "v2-select",
									value: s.live.marginMode ?? "cross",
									onChange: (e) => set(["live", "marginMode"], e.target.value),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "cross",
										children: "Cross margin"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "isolated",
										children: "Isolated margin"
									})]
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Position mode",
								hint: "hedge: long + short side by side · one-way: one net position per symbol",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
									className: "v2-select",
									value: s.live.positionMode ?? "hedge",
									onChange: (e) => set(["live", "positionMode"], e.target.value),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "hedge",
										children: "Hedge mode"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "oneway",
										children: "One-way mode"
									})]
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Mode",
								hint: "overall = control orders: one position per symbol + direction",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
									className: "v2-select",
									value: s.live.mode ?? "overall",
									onChange: (e) => set(["live", "mode"], e.target.value),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "overall",
										children: "overall (control orders)"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "entries",
										children: "entries (one per signal)"
									})]
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Control ratio",
								hint: "control volume per lane volume unit",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
									step: .1,
									value: s.live.ratio ?? 1,
									onChange: (v) => set(["live", "ratio"], v)
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Max $ per position",
								hint: "cap per symbol + direction",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
									value: s.live.maxNotionalUsd ?? 30,
									onChange: (v) => set(["live", "maxNotionalUsd"], v)
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Rebalance beyond (%)",
								hint: "adjust only when the target moves more than this",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
									pct: true,
									step: 1,
									value: s.live.rebalancePct ?? .25,
									onChange: (v) => set(["live", "rebalancePct"], v)
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Require simulated readiness",
								hint: "only trade while the rolling simulated run holds PF ≥ min and is stable (turn off for a testnet)",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
									label: "Require simulated readiness",
									checked: s.live.requireReady !== false,
									onChange: (v) => set(["live", "requireReady"], v)
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Minimum stop (%)",
								hint: "exchange stops are never closer than this",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
									pct: true,
									step: .1,
									value: s.live.minStopPct ?? .01,
									onChange: (v) => set(["live", "minStopPct"], v)
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Exchange sync (ms)",
								hint: "positions / orders re-read over REST at most this often (own orders re-read at once); decisions run every tick",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
									step: 250,
									min: 250,
									value: s.live.syncMs ?? 1e3,
									onChange: (v) => set(["live", "syncMs"], v)
								})
							})
						]
					})
				})
			]
		})
	] });
}
//#endregion
export { List as a, SignalsSettings as c, INDICATION_KINDS as i, Timeframes as l, Field as n, Num as o, FocusText as r, SettingsPage as s, BlockSources as t };
