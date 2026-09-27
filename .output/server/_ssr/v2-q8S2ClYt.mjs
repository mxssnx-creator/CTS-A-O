import { i as __toESM } from "../_runtime.mjs";
import { H as require_react, v as Link, x as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { A as tone, E as pfTone, M as usePoll, T as liveState, _ as corePresets, a as Line, c as Pill, g as coreOverview, i as Kpi, n as Empty, r as ErrorNote, s as Panel, w as fmt } from "./ui-Bl7sOgcb.mjs";
import { a as MultiArcGauge, l as SignedBars, n as ArcShare, r as EquityChart, s as RadialHours } from "./charts-Dtp2dyjl.mjs";
import { t as PrehistoricPanel } from "./prehistoric-Cu1sesL6.mjs";
import { t as PresetSettingsDialog } from "./preset-settings-epLGg2d4.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/v2-q8S2ClYt.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
/** Top bar: the applied preset and a button showing its settings (or the engine's when none is applied). */
function PresetBar() {
	const { data } = usePoll(() => corePresets(), 1e4);
	const [open, setOpen] = (0, import_react.useState)(null);
	const [note, setNote] = (0, import_react.useState)(null);
	const d = data;
	const all = d ? [...d.research ?? [], ...d.saved ?? []] : [];
	const active = d?.active ? all.find((p) => p.id === d.active.id) : null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "v2-panel",
		style: {
			padding: "8px 12px",
			display: "flex",
			gap: 10,
			alignItems: "center",
			flexWrap: "wrap"
		},
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "v2-muted",
				style: { fontSize: "var(--v-fs-sm)" },
				children: "Preset"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
				style: {
					minWidth: 0,
					overflow: "hidden",
					textOverflow: "ellipsis"
				},
				children: active ? active.label : d?.active ? `${d.active.label} (removed)` : "none applied — engine settings"
			}),
			note && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pill, {
				kind: "ok",
				children: note
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				style: {
					marginLeft: "auto",
					display: "flex",
					gap: 8
				},
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "v2-btn primary",
					disabled: !d,
					onClick: () => setOpen(active ?? {
						id: "engine",
						kind: "engine",
						label: "Current engine settings",
						settings: {},
						wf: {}
					}),
					children: "Preset settings"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/v2/presets",
					className: "v2-btn",
					children: "All presets"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PresetSettingsDialog, {
				preset: open,
				readOnly: open?.kind === "engine",
				onClose: () => setOpen(null),
				onSaved: setNote
			})
		]
	});
}
function OverviewPage() {
	const { data, error } = usePoll(() => coreOverview(), 4e3);
	const d = data;
	if (!d) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ErrorNote, { error }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Empty, { children: "Starting the engine…" }) });
	const sim = d.sim;
	const s = sim?.stats;
	const minPf = d.settings.gates.minPf;
	const hours = sim?.hourly ?? [];
	let cum = 0;
	const curve = hours.map((h) => ({
		t: h.t + 36e5,
		v: cum += h.net
	}));
	const simDays = sim ? (sim.endT - sim.startT) / 864e5 : 1;
	const c = d.counts ?? {};
	const selected = d.paper.selected ?? [];
	const sigSel = selected.filter((id) => (id.split("|")[1] ?? "").includes("sig-")).length;
	const realSel = selected.length - sigSel;
	const baseEval = Number(d.status?.baseEvaluated ?? 0);
	const basePassed = Number(d.status?.basePassed ?? 0);
	const ls = liveState(d.settings.live.enabled, d.live);
	const byKind = Object.entries(sim?.byKind ?? {}).map(([label, v]) => ({
		label,
		value: v.n
	}));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PresetBar, {}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ErrorNote, { error }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PrehistoricPanel, {
			status: d.status,
			minPf,
			maxDdtH: d.settings.gates.maxDdtH
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "v2-grid v2-cols-6",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kpi, {
					label: "Sim PF",
					value: fmt.pf(s?.pf),
					className: pfTone(s?.pf, minPf),
					sub: `min ${minPf} · neutral 1.00`
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kpi, {
					label: "Sim net (Σ trade %)",
					value: fmt.pct(s?.net),
					className: tone(s?.net),
					sub: `${d.wf.simH}h run · ${d.wf.preH}h pre-calc`
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kpi, {
					label: "Positions / Orders",
					value: `${fmt.num(d.sim?.positions)} / ${fmt.num(s?.n)}`,
					sub: `${fmt.num((s?.n ?? 0) / Math.max(simDays, .01))} orders/day · open ${d.paper.book?.positions ?? 0} / ${d.paper.book?.orders ?? 0}`
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kpi, {
					label: "Green hours",
					value: s ? `${s.greenHours}/${s.hours}` : "–",
					sub: fmt.ratio(s?.gh),
					className: s && s.gh >= .6 ? "v2-up" : ""
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kpi, {
					label: "DDT · MDD",
					value: fmt.h(s?.ddt),
					sub: `MDD ${fmt.num(s?.mdd, 2)} Σ trade % · worst h ${fmt.pct(s?.worstHour)}`
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kpi, {
					label: "Paper P&L",
					value: fmt.usd(d.paper.equity),
					className: tone(d.paper.equity),
					sub: `balance ${fmt.usd(d.paper.balance)} · ${d.paper.positions} open orders · ${realSel} Real${sigSel || d.status?.signals?.enabled ? ` · ${sigSel} signal` : ""} configs`
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "v2-grid v2-cols-3",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
					title: "Health arcs",
					sub: "each ring against its own target",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MultiArcGauge, {
						size: 190,
						center: fmt.pf(s?.pf),
						centerSub: "sim PF",
						rings: [
							{
								label: `PF vs 2.0`,
								value: (s?.pf ?? 0) / 2,
								display: fmt.pf(s?.pf)
							},
							{
								label: "Green hours",
								value: s?.gh ?? 0,
								display: fmt.ratio(s?.gh)
							},
							{
								label: "Win rate",
								value: s?.wr ?? 0,
								display: fmt.ratio(s?.wr)
							},
							{
								label: "Base passing",
								value: baseEval ? basePassed / baseEval : 0,
								display: `${basePassed}/${baseEval}`
							},
							{
								label: "DDT headroom",
								value: s ? Math.max(0, 1 - s.ddt / Math.max(1, d.settings.gates.maxDdtH)) : 0,
								display: fmt.h(s?.ddt)
							}
						]
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
					title: "Hours",
					sub: "net per hour, outward = profit",
					children: hours.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RadialHours, {
						hours,
						size: 230
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Empty, { children: "No simulated hours yet" })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
					title: "Orders by sub-strategy",
					sub: "executed in the simulated run",
					children: [byKind.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArcShare, {
						parts: byKind,
						center: String(s?.n ?? 0)
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Empty, { children: "–" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "v2-lines",
						style: { marginTop: 10 },
						children: Object.entries(sim?.skips ?? {}).map(([k, v]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
							k: `skipped · ${k}`,
							v: fmt.num(v)
						}, k))
					})]
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "v2-grid v2-cols-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
				title: "Cumulative net (simulated run, Σ trade %)",
				sub: sim ? `${fmt.hour(sim.startT)} → ${fmt.hour(sim.endT)} UTC · ${sim.stable ? "stable" : "not stable"}` : "",
				right: sim && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pill, {
					kind: sim.stable ? "ok" : "bad",
					children: sim.stable ? "stable" : "unstable"
				}),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EquityChart, {
					series: [{
						name: "net %",
						points: curve
					}],
					unit: "%"
				})
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
				title: "Net per hour",
				sub: "Σ trade %",
				right: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/v2/hourly",
					className: "v2-btn",
					children: "Hour by hour →"
				}),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SignedBars, {
					unit: "%",
					data: hours.map((h) => ({
						k: fmt.hour(h.t).slice(6),
						v: h.net,
						tip: `${fmt.hour(h.t)} · ${h.n} closes · PF ${fmt.pf(h.pf)} · ${fmt.pct(h.net)}`
					}))
				})
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "v2-grid v2-cols-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
				title: "Stages",
				sub: "Base → Main → Real → Live",
				right: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/v2/stages",
					className: "v2-btn",
					children: "Open"
				}),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "v2-funnel",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "v2-stage",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "t",
									children: "Base"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "n",
									children: fmt.num(c.base)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
									"combos computed · ",
									d.wf.tapes,
									" strategy tapes"
								] })
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "v2-stage",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "t",
									children: "Main"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "n",
									children: fmt.num(c.main)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
									"refined · ",
									c.evaluated ?? 0,
									" evaluated"
								] })
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "v2-stage",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "t",
									children: "Real"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "n",
									children: realSel
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
									d.paper.eligible,
									" eligible this hour",
									sigSel || d.status?.signals?.enabled ? ` · ${sigSel} signal configs (${d.status?.signals?.configs ?? 0} built)` : ""
								] })
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "v2-stage",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "t",
									children: "Live"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "n",
									children: ls.on ? "on" : "off"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: !ls.on ? "disabled in settings" : ls.blocked ? `blocked: ${ls.blocked}` : d.live?.reason ?? "armed" })
							]
						})
					]
				})
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
				title: "Top configs in the run",
				sub: "by net",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "v2-table-wrap",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
						className: "v2-table",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "config" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "num",
								children: "n"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "num",
								children: "PF"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "num",
								children: "net"
							})
						] }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: (sim?.byConfig ?? []).map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								to: "/v2/config/$id",
								params: { id: r.id },
								className: "v2-mono",
								children: r.id
							}) }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "num",
								children: r.n
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: `num ${pfTone(r.pf, minPf)}`,
								children: fmt.pf(r.pf)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: `num ${tone(r.net)}`,
								children: fmt.pct(r.net)
							})
						] }, r.id)) })]
					})
				})
			})]
		})
	] });
}
var SplitComponent = OverviewPage;
//#endregion
export { SplitComponent as component };
