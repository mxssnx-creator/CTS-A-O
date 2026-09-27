import { i as __toESM } from "../_runtime.mjs";
import { H as require_react, x as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { A as tone, C as downloadFile, E as pfTone, M as usePoll, a as Line, b as coreSim, c as Pill, i as Kpi, k as toCsv, n as Empty, r as ErrorNote, s as Panel, w as fmt } from "./ui-Bl7sOgcb.mjs";
import { l as SignedBars, r as EquityChart, s as RadialHours } from "./charts-Dtp2dyjl.mjs";
import { p as STRATEGY_PRESETS } from "./config-D_G1clvp.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/hourly-J8SRr1Xt.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var H = 36e5;
function HourlyPage() {
	const { data, error } = usePoll(() => coreSim(), 8e3);
	const [preset, setPreset] = (0, import_react.useState)("current");
	const d = data;
	const sim = d?.sim;
	const presets = d?.presets?.presets ?? {};
	const view = preset === "current" ? sim : presets[preset];
	const hours = (0, import_react.useMemo)(() => view?.hourly ?? [], [view]);
	const steps = (0, import_react.useMemo)(() => new Map((sim?.steps ?? []).map((s) => [s.t, s])), [sim]);
	const isPreset = preset !== "current";
	const startT = (isPreset ? view?.startT ?? d?.presets?.startT : sim?.startT) ?? 0;
	const endT = (isPreset ? view?.endT ?? d?.presets?.endT : sim?.endT) ?? 0;
	const lines = (0, import_react.useMemo)(() => {
		const byT = new Map(hours.map((h) => [h.t, h]));
		const out = [];
		let cum = 0;
		for (let t = startT; t < endT; t += H) {
			const h = byT.get(t);
			cum += h?.net ?? 0;
			const st = steps.get(t);
			out.push({
				t,
				n: h?.n ?? 0,
				pf: h?.pf ?? 0,
				net: h?.net ?? 0,
				cum,
				main: st?.main ?? 0,
				real: st?.real ?? 0,
				taken: st?.taken ?? 0,
				skipped: st?.skipped ?? 0
			});
		}
		return out;
	}, [
		hours,
		startT,
		endT,
		steps
	]);
	if (!d) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ErrorNote, { error }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Empty, { children: "Loading…" }) });
	if (!sim) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Empty, { children: "The first simulated run appears after the first compute." });
	const s = view?.stats;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ErrorNote, { error }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
			title: "Simulated run",
			sub: `${fmt.hour(startT)} → ${fmt.hour(endT)} UTC · each hour picks configs from the prior ${sim.opts.preH}h (and the long window), then trades the hour`,
			right: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
				className: "v2-select",
				value: preset,
				onChange: (e) => setPreset(e.target.value),
				"aria-label": "Preset",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
					value: "current",
					children: "current settings"
				}), Object.keys(presets).map((k) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
					value: k,
					children: STRATEGY_PRESETS[k]?.label ?? k
				}, k))]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: "v2-btn",
				onClick: () => downloadFile(`cts-hourly-${preset}.csv`, toCsv(lines), "text/csv"),
				children: "CSV"
			})] }),
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "v2-grid v2-cols-6",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kpi, {
						label: "PF",
						value: fmt.pf(s?.pf),
						className: pfTone(s?.pf),
						sub: view?.stable ? "stable" : "not stable"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kpi, {
						label: "Net (Σ trade %)",
						value: fmt.pct(s?.net),
						className: tone(s?.net)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kpi, {
						label: view?.positions !== void 0 ? "Positions / Orders" : "Orders",
						value: view?.positions !== void 0 ? `${fmt.num(view.positions)} / ${fmt.num(s?.n)}` : fmt.num(s?.n),
						sub: `${fmt.num(s?.tph, 1)} orders per active hour`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kpi, {
						label: "Green hours",
						value: s ? `${s.greenHours}/${s.hours}` : "–",
						sub: fmt.ratio(s?.gh)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kpi, {
						label: "Worst hour",
						value: fmt.pct(s?.worstHour),
						className: "v2-down"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kpi, {
						label: "DDT",
						value: fmt.h(s?.ddt),
						sub: `MDD ${fmt.num(s?.mdd, 2)} Σ trade %`
					})
				]
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "v2-grid v2-cols-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
				title: "Hours",
				sub: "radial: profit outward",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RadialHours, {
					hours,
					size: 240
				})
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
				title: "Cumulative",
				sub: "Σ trade %",
				className: "v2-span-2",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EquityChart, {
					series: [{
						name: "net %",
						points: lines.map((l) => ({
							t: l.t + H,
							v: l.cum
						}))
					}],
					unit: "%"
				})
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
			title: "Net per hour",
			sub: "Σ trade %",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SignedBars, {
				unit: "%",
				data: lines.map((l) => ({
					k: fmt.hour(l.t).slice(6),
					v: l.net,
					tip: `${fmt.hour(l.t)} · ${l.n} closes · PF ${fmt.pf(l.pf)} · ${fmt.pct(l.net)} · cum ${fmt.pct(l.cum)}`
				}))
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "v2-grid v2-cols-3",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
					title: "By sub-strategy",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "v2-lines",
						children: Object.entries(view?.byKind ?? {}).map(([k, v]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
							k,
							v: `n ${v.n} · PF ${fmt.pf(v.pf)} · ${fmt.pct(v.net)}`,
							className: pfTone(v.pf)
						}, k))
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
					title: "Skipped entries",
					sub: "Real-stage rules",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "v2-lines",
						children: Object.entries(view?.skips ?? {}).map(([k, v]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
							k,
							v: fmt.num(v)
						}, k))
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
					title: "8h blocks",
					sub: "stability",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "v2-lines",
						children: (view?.blocks ?? []).map((b) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
							k: fmt.hour(b.t),
							v: `n ${b.n} · PF ${fmt.pf(b.pf)} · ${fmt.pct(b.net)}`,
							className: b.n ? pfTone(b.pf) : "v2-muted"
						}, b.t))
					})
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
			title: "Hour by hour",
			sub: "line for line",
			flush: true,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "v2-table-wrap",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
					className: "v2-table",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "hour (UTC)" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "num",
							children: "closes"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "num",
							children: "PF"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "num",
							children: "net"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "num",
							children: "cum"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "num",
							children: "Main"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "num",
							children: "Real"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "num",
							children: "entries"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "num",
							children: "skipped"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {})
					] }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: lines.map((l) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: fmt.hour(l.t) }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "num",
							children: l.n
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: `num ${l.n ? pfTone(l.pf) : ""}`,
							children: l.n ? fmt.pf(l.pf) : "–"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: `num ${tone(l.net)}`,
							children: l.n ? fmt.pct(l.net) : "–"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: `num ${tone(l.cum)}`,
							children: fmt.pct(l.cum)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "num",
							children: preset === "current" ? l.main : "–"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "num",
							children: preset === "current" ? l.real : "–"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "num",
							children: preset === "current" ? l.taken : "–"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "num",
							children: preset === "current" ? l.skipped : "–"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: l.n ? l.net > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pill, {
							kind: "ok",
							children: "green"
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pill, {
							kind: "bad",
							children: "red"
						}) : null })
					] }, l.t)) })]
				})
			})
		})
	] });
}
var SplitComponent = HourlyPage;
//#endregion
export { SplitComponent as component };
