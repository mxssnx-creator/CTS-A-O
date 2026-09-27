import { x as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { A as tone, E as pfTone, M as usePoll, b as coreSim, c as Pill, n as Empty, r as ErrorNote, s as Panel, w as fmt } from "./ui-Bl7sOgcb.mjs";
import { c as SERIES, i as HeatGrid, r as EquityChart } from "./charts-Dtp2dyjl.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/compare-7UNs0lGN.js
var import_jsx_runtime = require_jsx_runtime();
var H = 36e5;
function ComparePage() {
	const { data, error } = usePoll(() => coreSim(), 1e4);
	const d = data;
	const p = d?.presets;
	if (!d) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ErrorNote, { error }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Empty, { children: "Loading…" }) });
	if (!p) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Empty, { children: "Preset comparisons appear after the first compute." });
	const names = Object.keys(p.presets);
	const hoursAll = [];
	for (let t = p.startT; t < p.endT; t += H) hoursAll.push(t);
	const series = names.slice(0, 8).map((n, i) => {
		let cum = 0;
		const byT = new Map((p.presets[n].hourly ?? []).map((h) => [h.t, h.net]));
		return {
			name: p.presets[n].label,
			color: SERIES[i],
			points: hoursAll.map((t) => ({
				t: t + H,
				v: cum += byT.get(t) ?? 0
			}))
		};
	});
	const cols = hoursAll.map((t) => fmt.hour(t).slice(6, 8) + "h·" + fmt.hour(t).slice(3, 5));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ErrorNote, { error }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
			title: "Presets on the same tapes",
			sub: `${fmt.hour(p.startT)} → ${fmt.hour(p.endT)} UTC · with / without Block, DCA and Active · same selection, same costs`,
			flush: true,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "v2-table-wrap",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
					className: "v2-table",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "preset" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "toggles" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "num",
							children: "orders"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "num",
							children: "WR"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "num",
							children: "PF"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "num",
							children: "net (Σ trade %)"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "num",
							children: "green h"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "num",
							children: "worst h"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "num",
							children: "MDD (Σ trade %)"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "num",
							children: "DDT"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "by kind" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {})
					] }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: names.map((n) => {
						const x = p.presets[n];
						const s = x.stats;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								style: { fontWeight: 600 },
								children: x.label
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "v2-muted",
								children: Object.entries(x.toggles).filter(([, v]) => v).map(([k]) => k).join(" · ")
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "num",
								children: s.n
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "num",
								children: fmt.ratio(s.wr)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: `num ${pfTone(s.pf)}`,
								children: fmt.pf(s.pf)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: `num ${tone(s.net)}`,
								children: fmt.pct(s.net)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
								className: "num",
								children: [
									s.greenHours,
									"/",
									s.hours
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "num v2-down",
								children: fmt.pct(s.worstHour)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "num",
								children: fmt.num(s.mdd, 2)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "num",
								children: fmt.h(s.ddt)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "v2-muted",
								children: Object.entries(x.byKind).map(([k, v]) => `${k} ${v.n}/${fmt.pf(v.pf)}`).join(" · ")
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: x.stable ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pill, {
								kind: "ok",
								children: "stable"
							}) : null })
						] }, n);
					}) })]
				})
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
			title: "Cumulative net per preset",
			sub: "Σ trade %",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EquityChart, {
				series,
				unit: "%"
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
			title: "Hour × preset",
			sub: "PF per hour (grey = neutral 1.0, empty = no closes)",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeatGrid, {
				rows: names.map((n) => p.presets[n].label),
				cols,
				cell: (label, col) => {
					const name = names.find((n) => p.presets[n].label === label);
					const t = hoursAll[cols.indexOf(col)];
					const h = p.presets[name].hourly.find((x) => x.t === t);
					if (!h) return null;
					return {
						v: h.pf,
						tip: `${label} · ${fmt.hour(t)} · ${h.n} closes · PF ${fmt.pf(h.pf)} · ${fmt.pct(h.net)}`
					};
				}
			})
		})
	] });
}
var SplitComponent = ComparePage;
//#endregion
export { SplitComponent as component };
