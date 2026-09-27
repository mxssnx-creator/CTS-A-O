import { i as __toESM } from "../_runtime.mjs";
import { H as require_react, x as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { C as downloadFile, D as presetAction, E as pfTone, M as usePoll, _ as corePresets, a as Line, c as Pill, n as Empty, r as ErrorNote, s as Panel, t as Confirm, w as fmt } from "./ui-Bl7sOgcb.mjs";
import { a as MultiArcGauge } from "./charts-Dtp2dyjl.mjs";
import { t as PresetSettingsDialog } from "./preset-settings-epLGg2d4.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/presets-Dcmxjdbj.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function summary(p) {
	const s = p.settings ?? {};
	const w = p.wf ?? {};
	const tac = Object.entries(s.tactics ?? {}).filter(([k, v]) => v === true && k !== "cooldownBars").map(([k]) => k);
	const tg = Object.entries(s.toggles ?? {}).filter(([, v]) => v).map(([k]) => k);
	return [
		s.tfMin ? `${s.tfMin}m` : null,
		s.symbols ? `${s.symbols} symbol${s.symbols > 1 ? "s" : ""} by ${{
			volatility1h: "1H volatility",
			volume: "24h volume",
			market: "market",
			gainers: "gainers",
			losers: "losers"
		}[s.symbolRank ?? "volatility1h"]}` : null,
		s.focus?.length ? `${s.focus.length} focus pairs` : "all combos",
		w.mode ? `${w.mode} selection` : null,
		tg.length ? tg.join(" + ") : null,
		tac.length ? `tactics: ${tac.join(", ")}` : "no tactics",
		w.lastN !== void 0 ? `last-N ${w.lastN || "off"}` : null
	].filter(Boolean).join(" · ");
}
function Backtests(props) {
	const [days, setDays] = (0, import_react.useState)(3);
	const running = props.job?.state === "running";
	const mine = props.job && props.job.id === props.p.id;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "v2-panel",
		style: {
			padding: 8,
			display: "grid",
			gap: 8
		},
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			style: {
				display: "flex",
				gap: 8,
				alignItems: "center",
				flexWrap: "wrap"
			},
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					style: {
						fontWeight: 600,
						fontSize: "var(--v-fs-sm)"
					},
					children: "Backtest last"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
					className: "v2-select",
					"aria-label": "Backtest days",
					value: days,
					onChange: (e) => setDays(Number(e.target.value)),
					children: Array.from({ length: 12 }, (_, i) => i + 1).map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
						value: d,
						children: [
							d,
							" day",
							d > 1 ? "s" : ""
						]
					}, d))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "v2-btn",
					disabled: running,
					onClick: () => props.onRun(days),
					children: running && mine ? "Running…" : "Run backtest"
				}),
				mine && running && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "v2-muted",
					style: { fontSize: "var(--v-fs-xs)" },
					children: [
						props.job.stage,
						" ",
						Math.round(props.job.progress * 100),
						"%"
					]
				}),
				mine && props.job.state === "error" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "v2-down",
					style: { fontSize: "var(--v-fs-xs)" },
					children: props.job.error
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "v2-muted",
					style: {
						fontSize: "var(--v-fs-xs)",
						marginLeft: "auto"
					},
					children: [
						"gates: PF ≥ ",
						fmt.pf(props.gates?.minPf),
						" · DDT ≤ ",
						props.gates?.maxDdtH,
						"h"
					]
				})
			]
		}), props.list.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "v2-table-wrap",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
				className: "v2-table",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "run" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
						className: "num",
						children: "days"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
						className: "num",
						children: "PF"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
						className: "num",
						children: "success hours"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
						className: "num",
						children: "DDT"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
						className: "num",
						children: "trades"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
						className: "num",
						children: "WR"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {})
				] }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: props.list.slice(0, 8).map((b) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: fmt.time(b.at) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "v2-muted",
						style: { fontSize: "var(--v-fs-xs)" },
						children: [
							b.tfMin,
							"m · ",
							fmt.time(b.from),
							" → ",
							fmt.time(b.to)
						]
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
						className: "num",
						children: b.days
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
						className: `num ${pfTone(b.pf, b.minPf)}`,
						children: fmt.pf(b.pf)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
						className: "num",
						children: [
							fmt.ratio(b.successHours),
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "v2-muted",
								children: [
									"(",
									b.greenHours,
									"/",
									b.hours,
									")"
								]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
						className: `num ${b.ddtH <= b.maxDdtH ? "" : "v2-down"}`,
						children: fmt.h(b.ddtH)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
						className: "num",
						children: b.n
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
						className: "num",
						children: fmt.ratio(b.wr)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: b.pass ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pill, {
						kind: "ok",
						children: "pass"
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pill, {
						kind: "bad",
						children: "fail"
					}) })
				] }, b.at)) })]
			})
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "v2-muted",
			style: { fontSize: "var(--v-fs-xs)" },
			children: "No backtest yet — results stay listed here."
		})]
	});
}
function PresetCard(props) {
	const { p } = props;
	const m = p.metrics ?? {};
	const pfRing = Math.max(0, Math.min(1, ((m.pf ?? 0) - .5) / 1.5));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "v2-panel",
		style: {
			display: "grid",
			gap: 10,
			padding: 14
		},
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				style: {
					display: "flex",
					gap: 8,
					alignItems: "flex-start",
					justifyContent: "space-between"
				},
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					style: { minWidth: 0 },
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						style: { fontWeight: 700 },
						children: p.label
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "v2-muted",
						style: { fontSize: "var(--v-fs-xs)" },
						children: summary(p)
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					style: {
						display: "flex",
						gap: 6,
						flexWrap: "wrap",
						justifyContent: "flex-end"
					},
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pill, {
						kind: p.kind === "research" ? "acc" : p.kind === "auto" ? "ok" : void 0,
						children: p.kind
					}), props.active && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pill, {
						kind: "ok",
						children: "active"
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				style: {
					display: "flex",
					gap: 14,
					alignItems: "center",
					flexWrap: "wrap"
				},
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MultiArcGauge, {
					size: 112,
					rings: [
						{
							label: "PF",
							value: pfRing,
							color: "var(--v-s1)",
							display: fmt.pf(m.pf)
						},
						{
							label: "green hours",
							value: m.greenHours ?? 0,
							color: "var(--v-s2)",
							display: fmt.ratio(m.greenHours)
						},
						{
							label: "win rate",
							value: m.wr ?? 0,
							color: "var(--v-s3)",
							display: fmt.ratio(m.wr)
						}
					],
					center: fmt.pf(m.pf),
					centerSub: "PF"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "v2-lines",
					style: {
						flex: 1,
						minWidth: 180
					},
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
							k: "profit factor",
							v: fmt.pf(m.pf),
							className: pfTone(m.pf)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
							k: "success ratio (green hours)",
							v: fmt.ratio(m.greenHours)
						}),
						m.greenDays !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
							k: "green days",
							v: fmt.ratio(m.greenDays)
						}),
						m.runs ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
							k: "positive runs",
							v: `${m.positiveRuns}/${m.runs}`
						}) : null,
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
							k: "trades",
							v: `${fmt.num(m.n)} · ${fmt.num(m.perDay, 1)}/day`
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
							k: "win rate",
							v: fmt.ratio(m.wr)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
							k: "net (Σ trade %)",
							v: fmt.pct(m.net, 1)
						}),
						m.ddtH !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
							k: "longest drawdown",
							v: fmt.h(m.ddtH)
						})
					]
				})]
			}),
			m.checks?.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "v2-table-wrap",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
					className: "v2-table",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "period" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "num",
							children: "PF"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "num",
							children: "orders/day"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "num",
							children: "green h"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "num",
							children: "WR"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "num",
							children: "runs +"
						})
					] }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: m.checks.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							style: { fontWeight: 600 },
							children: c.label
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "v2-muted",
							style: { fontSize: "var(--v-fs-xs)" },
							children: c.period
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: `num ${pfTone(c.pf)}`,
							children: fmt.pf(c.pf)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "num",
							children: fmt.num(c.perDay, 1)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "num",
							children: fmt.ratio(c.greenHours)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "num",
							children: fmt.ratio(c.wr)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "num",
							children: c.runs ? `${c.positiveRuns}/${c.runs}` : "–"
						})
					] }, c.label)) })]
				})
			}) : null,
			m.oot && !m.checks?.length && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "v2-panel",
				style: {
					padding: 8,
					background: "var(--v-bg-2, transparent)"
				},
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					style: {
						fontWeight: 600,
						fontSize: "var(--v-fs-sm)"
					},
					children: ["Out of time · ", m.oot.period]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "v2-muted",
					style: { fontSize: "var(--v-fs-xs)" },
					children: [
						"PF ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: pfTone(m.oot.pf),
							children: fmt.pf(m.oot.pf)
						}),
						" · green hours",
						" ",
						fmt.ratio(m.oot.greenHours),
						" · WR ",
						fmt.ratio(m.oot.wr),
						" · ",
						fmt.num(m.oot.n),
						" trades (",
						fmt.num(m.oot.perDay, 1),
						"/day)"
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Backtests, {
				p,
				list: props.backtests,
				job: props.job,
				gates: props.gates,
				onRun: props.onBacktest
			}),
			p.info && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "v2-muted",
				style: {
					margin: 0,
					fontSize: "var(--v-fs-sm)"
				},
				children: p.info
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "v2-muted",
				style: { fontSize: "var(--v-fs-xs)" },
				children: [
					m.period,
					" · ",
					m.source
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				style: {
					display: "flex",
					gap: 8,
					flexWrap: "wrap"
				},
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "v2-btn primary",
						onClick: props.onApply,
						children: "Apply"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "v2-btn",
						onClick: props.onSettings,
						children: "Settings"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "v2-btn",
						onClick: () => downloadFile(`preset-${p.id}.json`, JSON.stringify(p, null, 2)),
						children: "Export"
					}),
					props.onDelete && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "v2-btn",
						onClick: props.onDelete,
						children: "Delete"
					})
				]
			})
		]
	});
}
function PresetsPage() {
	const { data, error, refresh } = usePoll(() => corePresets(), 3e3);
	const [err, setErr] = (0, import_react.useState)(null);
	const [note, setNote] = (0, import_react.useState)(null);
	const [ask, setAsk] = (0, import_react.useState)(null);
	const [edit, setEdit] = (0, import_react.useState)(null);
	const [label, setLabel] = (0, import_react.useState)("");
	const [info, setInfo] = (0, import_react.useState)("");
	const d = data;
	if (!d) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ErrorNote, { error }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Empty, { children: "Loading…" }) });
	const run = async (fn, done) => {
		setErr(null);
		try {
			await fn();
			setNote(done);
			refresh();
			return true;
		} catch (e) {
			setNote(null);
			setErr(e instanceof Error ? e.message : String(e));
			return false;
		}
	};
	const cur = d.current;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PresetSettingsDialog, {
		preset: edit,
		onClose: () => setEdit(null),
		onSaved: (msg) => {
			setNote(msg);
			refresh();
		}
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ErrorNote, { error: err ?? error }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Confirm, {
			open: !!ask,
			title: ask?.kind === "apply" ? `Apply “${ask?.p.label}”?` : `Delete “${ask?.p.label}”?`,
			danger: ask?.kind === "delete",
			confirm: ask?.kind === "apply" ? "Apply" : "Delete",
			body: ask?.kind === "apply" ? "Replaces the engine settings (timeframe, focus, grid, tactics, strategies, selection). The Live stage, sizing, paper balance, costs / fees, the auto-adjuster and loop timing (cycle / tick) stay unchanged. Takes effect on the next compute; a timeframe change re-syncs the market data." : "The saved preset is removed.",
			onCancel: () => setAsk(null),
			onConfirm: () => {
				const a = ask;
				setAsk(null);
				run(() => presetAction({ data: {
					action: a.kind,
					id: a.p.id
				} }), a.kind === "apply" ? `Applied “${a.p.label}” — recomputing` : "Deleted");
			}
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
			title: "Save the current settings as a preset",
			sub: cur ? `latest simulated run: PF ${fmt.pf(cur.pf)} · ${cur.n} trades · green hours ${fmt.ratio(cur.gh)} · WR ${fmt.ratio(cur.wr)} · ${cur.stable ? "stable" : "not stable"}` : "available after the first compute",
			right: note ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pill, {
				kind: "ok",
				children: note
			}) : void 0,
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "v2-grid v2-cols-3",
				style: { alignItems: "end" },
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						style: {
							display: "grid",
							gap: 3
						},
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "v2-muted",
							children: "Name"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: "v2-input",
							value: label,
							maxLength: 80,
							placeholder: "e.g. Momentum 1h, session",
							onChange: (e) => setLabel(e.target.value)
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						style: {
							display: "grid",
							gap: 3
						},
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "v2-muted",
							children: "Info"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: "v2-input",
							value: info,
							maxLength: 400,
							placeholder: "why / what it is for",
							onChange: (e) => setInfo(e.target.value)
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "v2-btn primary",
						disabled: !cur,
						onClick: () => void run(() => presetAction({ data: {
							action: "save",
							label,
							info
						} }), "Saved").then((ok) => {
							if (ok) {
								setLabel("");
								setInfo("");
							}
						}),
						children: "Save preset"
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "v2-muted",
				style: {
					margin: "8px 0 0",
					fontSize: "var(--v-fs-xs)"
				},
				children: "Successful runs (PF ≥ min, enough trades, stable) are also saved automatically as “auto” presets — one per distinct settings, the best run kept."
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
			title: "Research presets",
			sub: "from the complete simulated trading matrix: every settings variant × execution preset over three periods of real 1h BingX data, 0.2% round-trip cost; ranked by the worst period",
			children: d.research.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "v2-grid v2-cols-2",
				children: d.research.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PresetCard, {
					p,
					active: d.active?.id === p.id,
					onApply: () => setAsk({
						kind: "apply",
						p
					}),
					onSettings: () => setEdit(p),
					backtests: d.backtests?.[p.id] ?? [],
					job: d.job,
					gates: d.gates,
					onBacktest: (days) => void run(() => presetAction({ data: {
						action: "backtest",
						id: p.id,
						days
					} }), `Backtest started (${days}d)`)
				}, p.id))
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Empty, { children: "No research presets." })
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
			title: "Saved presets",
			sub: `${d.saved.length} saved · manual and automatic`,
			children: d.saved.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "v2-grid v2-cols-2",
				children: d.saved.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PresetCard, {
					p,
					active: d.active?.id === p.id,
					onApply: () => setAsk({
						kind: "apply",
						p
					}),
					onSettings: () => setEdit(p),
					onDelete: () => setAsk({
						kind: "delete",
						p
					}),
					backtests: d.backtests?.[p.id] ?? [],
					job: d.job,
					gates: d.gates,
					onBacktest: (days) => void run(() => presetAction({ data: {
						action: "backtest",
						id: p.id,
						days
					} }), `Backtest started (${days}d)`)
				}, p.id))
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Empty, { children: "Nothing saved yet — save the current settings above, or wait for a successful run." })
		})
	] })] });
}
var SplitComponent = PresetsPage;
//#endregion
export { SplitComponent as component };
