import { i as __toESM } from "../_runtime.mjs";
import { H as require_react, x as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { D as presetAction, c as Pill, o as Modal, r as ErrorNote, u as Switch, y as coreSettings } from "./ui-B36Mml8F.mjs";
import { d as MIN_PF_CHOICES, m as SYMBOL_RANK_CHOICES, u as MAX_DDT_CHOICES } from "./config-Bd1vYY8w.mjs";
import { a as List, c as SignalsSettings, i as INDICATION_KINDS, l as Timeframes, n as Field, o as Num, r as FocusText, t as BlockSources } from "./settings-YejMZ0E2.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/preset-settings-B19U45hs.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var STRATS = [
	["normal", "Normal"],
	["trailing", "Trailing"],
	["axis", "Axis"],
	["block", "Block"],
	["blockActive", "Block Active"],
	["dca", "DCA"],
	["dcaActive", "DCA Active"]
];
var TACTICS = [
	["session", "EU/US session"],
	["volRegime", "Volatility regime"],
	["trendStrength", "Trend strength (ADX ≥ 20)"],
	["cooldown", "Cooldown"]
];
function Section(props) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		style: {
			borderTop: "1px solid var(--v-border)",
			padding: "12px 0",
			display: "grid",
			gap: 10
		},
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			style: { fontWeight: 700 },
			children: props.title
		}), props.sub && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "v2-muted",
			style: { fontSize: "var(--v-fs-xs)" },
			children: props.sub
		})] }), props.children]
	});
}
var nearest = (xs, v) => xs.reduce((a, b) => Math.abs(b - v) < Math.abs(a - v) ? b : a);
/**
* Engine-level settings a preset never carries (the server strips them, see PRESET_EXCLUDED in core/presets.ts):
* they are neither shown nor edited here and stay unchanged when a preset is applied.
*/
var NOT_IN_PRESET = [
	"live",
	"sizing",
	"paperBalance",
	"cost",
	"fees",
	"cycleMs",
	"tickMs",
	"adjust"
];
/** Effective settings of a preset: the engine's current values under the preset's own ones. */
function effective(engine, p) {
	const ps = p.settings ?? {};
	const merged = structuredClone(engine);
	for (const [k, v] of Object.entries(ps)) merged[k] = v && typeof v === "object" && !Array.isArray(v) ? {
		...engine[k] ?? {},
		...v
	} : v;
	merged.symbols ??= 1;
	merged.symbolRank ??= "volatility1h";
	for (const k of NOT_IN_PRESET) delete merged[k];
	return merged;
}
function PresetSettingsDialog(props) {
	const p = props.preset;
	const [s, setS] = (0, import_react.useState)(null);
	const [sym0, setSym0] = (0, import_react.useState)(null);
	const [wf, setWf] = (0, import_react.useState)(null);
	const [label, setLabel] = (0, import_react.useState)("");
	const [err, setErr] = (0, import_react.useState)(null);
	const [busy, setBusy] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		if (!p) return;
		setErr(null);
		setLabel(p.kind === "research" ? `${p.label} (edited)` : p.label);
		coreSettings().then((d) => {
			const e = effective(d.settings, p);
			setS(e);
			setSym0({
				symbols: e.symbols,
				symbolRank: e.symbolRank
			});
			setWf({
				...d.wf,
				...p.wf ?? {}
			});
		}).catch((e) => setErr(String(e?.message ?? e)));
	}, [p]);
	const set = (path, v) => setS((prev) => {
		const next = structuredClone(prev);
		let o = next;
		for (const k of path.slice(0, -1)) o = o[k] ??= {};
		o[path[path.length - 1]] = v;
		return next;
	});
	const setW = (k, v) => setWf((x) => ({
		...x,
		[k]: v
	}));
	const save = async (apply) => {
		setBusy(true);
		setErr(null);
		try {
			const ps = p.settings ?? {};
			const settings = {
				tfs: s.tfs,
				tfDays: s.tfDays,
				gates: s.gates,
				toggles: s.toggles,
				tactics: s.tactics,
				disabledKinds: s.disabledKinds ?? [],
				focus: s.focus ?? [],
				grid: s.grid,
				block: s.block,
				dca: s.dca,
				axis: s.axis,
				signals: s.signals
			};
			if (ps.symbols !== void 0 || s.symbols !== sym0?.symbols) settings.symbols = s.symbols;
			if (ps.symbolRank !== void 0 || s.symbolRank !== sym0?.symbolRank) settings.symbolRank = s.symbolRank;
			const w = {
				mode: wf.mode,
				lastN: wf.lastN,
				lastNMinPf: wf.lastNMinPf,
				portfolio: wf.portfolio,
				maxPerSymbol: wf.maxPerSymbol,
				maxPerSide: wf.maxPerSide,
				maxPositions: wf.maxPositions,
				maxOpen: wf.maxOpen,
				preH: wf.preH,
				longH: wf.longH
			};
			const r = await presetAction({ data: {
				action: "update",
				id: p.id,
				settings,
				wf: w,
				label
			} });
			if (apply) await presetAction({ data: {
				action: "apply",
				id: r.preset.id
			} });
			props.onSaved?.(apply ? `Saved and applied “${r.preset.label}”` : p.kind === "research" ? `Saved as your preset “${r.preset.label}”` : `Saved “${r.preset.label}”`);
			props.onClose();
		} catch (e) {
			setErr(e instanceof Error ? e.message : String(e));
		} finally {
			setBusy(false);
		}
	};
	const ro = !!props.readOnly;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Modal, {
		open: !!p,
		onClose: props.onClose,
		title: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
			"Preset settings · ",
			p?.label,
			" ",
			p && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pill, {
				kind: p.kind === "research" ? "acc" : void 0,
				children: p.kind
			})
		] }),
		footer: ro ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			type: "button",
			className: "v2-btn",
			onClick: props.onClose,
			children: "Close"
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: "v2-btn",
				onClick: props.onClose,
				children: "Cancel"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: "v2-btn",
				disabled: busy || !s,
				onClick: () => void save(false),
				children: p?.kind === "research" ? "Save as my preset" : "Save to preset"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: "v2-btn primary",
				disabled: busy || !s,
				onClick: () => void save(true),
				children: "Save & apply"
			})
		] }),
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ErrorNote, { error: err }), !s || !wf ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "v2-muted",
			children: "Loading…"
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("fieldset", {
			disabled: ro,
			style: {
				border: 0,
				padding: 0,
				margin: 0,
				display: "grid"
			},
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "v2-muted",
					style: {
						margin: "0 0 8px",
						fontSize: "var(--v-fs-sm)"
					},
					children: ro ? "No preset is applied — these are the engine's current settings (read-only here; change them in Settings or apply a preset)." : null
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					hidden: ro,
					className: "v2-muted",
					style: {
						margin: "0 0 8px",
						fontSize: "var(--v-fs-sm)"
					},
					children: [
						"Changes belong to this preset only",
						p.kind === "research" ? " (saved as your own copy — the research preset stays as measured)" : "",
						"; the engine changes when the preset is applied. A preset never carries the Live stage, sizing, paper balance, costs / fees, the auto-adjuster or the loop timing (cycle / tick) — those stay as set in Settings."
					]
				}),
				!ro && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Name",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						className: "v2-input",
						value: label,
						maxLength: 80,
						onChange: (e) => setLabel(e.target.value)
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
					title: "Symbols",
					sub: "how many coins and which ones",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "v2-grid v2-cols-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: `Count: ${s.symbols}`,
							hint: "1 – 50",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "range",
								min: 1,
								max: 50,
								step: 1,
								value: Math.min(50, Math.max(1, s.symbols)),
								"aria-label": "Symbol count",
								onChange: (e) => set(["symbols"], Number(e.target.value))
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Order type",
							hint: "ranking that picks the symbols",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
								className: "v2-select",
								value: s.symbolRank,
								onChange: (e) => set(["symbolRank"], e.target.value),
								children: SYMBOL_RANK_CHOICES.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: r.id,
									children: r.label
								}, r.id))
							})
						})]
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
					title: "Timeframes",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Timeframes, {
						tfs: s.tfs,
						tfDays: s.tfDays,
						set
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
					title: "Signals",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SignalsSettings, {
						signals: s.signals,
						set
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
					title: "Gates",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "v2-grid v2-cols-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Min PF",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
								className: "v2-select",
								value: nearest(MIN_PF_CHOICES, s.gates.minPf),
								onChange: (e) => set(["gates", "minPf"], Number(e.target.value)),
								children: MIN_PF_CHOICES.map((v) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: v,
									children: v.toFixed(2)
								}, v))
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Max DDT",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
								className: "v2-select",
								value: nearest(MAX_DDT_CHOICES, s.gates.maxDdtH),
								onChange: (e) => set(["gates", "maxDdtH"], Number(e.target.value)),
								children: MAX_DDT_CHOICES.map((v) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
									value: v,
									children: [v, " h"]
								}, v))
							})
						})]
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
					title: "Strategies",
					sub: "executed sub-strategies (Base always computes all)",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "v2-grid v2-cols-4",
						style: { gap: 8 },
						children: STRATS.map(([k, l]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							style: {
								display: "flex",
								gap: 8,
								alignItems: "center"
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
								label: l,
								checked: k === "axis" ? s.toggles?.[k] !== false : !!s.toggles?.[k],
								onChange: (v) => set(["toggles", k], v)
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: l })]
						}, k))
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, {
					title: "Tactics",
					sub: "entry filters; each only removes entries",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "v2-grid v2-cols-4",
						style: { gap: 8 },
						children: TACTICS.map(([k, l]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							style: {
								display: "flex",
								gap: 8,
								alignItems: "center"
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
								label: l,
								checked: !!s.tactics?.[k],
								onChange: (v) => set(["tactics", k], v)
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: l })]
						}, k))
					}), s.tactics?.cooldown && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Cooldown bars",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
							value: s.tactics.cooldownBars ?? 4,
							min: 0,
							max: 96,
							onChange: (v) => set(["tactics", "cooldownBars"], v)
						})
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, {
					title: "Indication types",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "v2-grid v2-cols-4",
						style: { gap: 8 },
						children: INDICATION_KINDS.map((k) => {
							const on = !(s.disabledKinds ?? []).includes(k);
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								style: {
									display: "flex",
									gap: 8,
									alignItems: "center"
								},
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
									label: `type ${k}`,
									checked: on,
									onChange: (v) => set(["disabledKinds"], v ? (s.disabledKinds ?? []).filter((x) => x !== k) : [...s.disabledKinds ?? [], k])
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: k })]
							}, k);
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Focus pairs",
						hint: "bot|indication, comma separated — empty = every combo",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FocusText, {
							value: s.focus ?? [],
							onChange: (v) => set(["focus"], v)
						})
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
					title: "Protect grid",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "v2-grid v2-cols-3",
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
								label: "SL × TP",
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
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Hold (h)",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(List, {
									value: s.grid.holdH,
									onChange: (v) => set(["grid", "holdH"], v)
								})
							}),
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
							})
						]
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, {
					title: "Block · DCA · Axis",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "v2-grid v2-cols-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Block ratio",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
									step: .05,
									value: s.block.ratio,
									onChange: (v) => set(["block", "ratio"], v)
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Block max level",
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
								label: "Block max multiple",
								hint: "capped at 8×",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
									step: .1,
									min: 1,
									max: 8,
									value: s.block.maxMult,
									onChange: (v) => set(["block", "maxMult"], v)
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "DCA levels",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
									value: s.dca.levels,
									min: 1,
									max: 6,
									onChange: (v) => set(["dca", "levels"], v)
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "DCA step (%)",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
									pct: true,
									value: s.dca.step,
									onChange: (v) => set(["dca", "step"], v)
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Axis legs",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
									value: s.axis?.levels ?? 3,
									min: 1,
									max: 8,
									onChange: (v) => set(["axis", "levels"], v)
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Axis spacing (ATR)",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
									step: .1,
									value: s.axis?.spacing ?? .7,
									onChange: (v) => set(["axis", "spacing"], v)
								})
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BlockSources, {
						block: s.block,
						set
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
					title: "Real stage",
					sub: "selection, last-N and book limits",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "v2-grid v2-cols-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Selection",
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
								label: "Last-N (0 = off)",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
									value: wf.lastN,
									min: 0,
									max: 200,
									onChange: (v) => setW("lastN", v)
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Real seats / family",
								hint: "0 = no limit",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
									value: wf.portfolio,
									min: 0,
									max: 1e4,
									onChange: (v) => setW("portfolio", v)
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Max positions (0 = no limit)",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
									value: wf.maxPositions ?? 0,
									min: 0,
									max: 1e4,
									onChange: (v) => setW("maxPositions", v)
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Max orders / symbol",
								hint: "0 = no limit",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Num, {
									value: wf.maxPerSymbol,
									min: 0,
									max: 1e3,
									onChange: (v) => setW("maxPerSymbol", v)
								})
							})
						]
					})
				})
			]
		})]
	});
}
//#endregion
export { PresetSettingsDialog as t };
