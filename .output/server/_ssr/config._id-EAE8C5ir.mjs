import { x as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { A as tone, C as downloadFile, E as pfTone, M as usePoll, c as Pill, d as coreConfig, i as Kpi, k as toCsv, n as Empty, r as ErrorNote, s as Panel, w as fmt, y as coreSettings } from "./ui-B36Mml8F.mjs";
import { o as NCurve, r as EquityChart } from "./charts-Dtp2dyjl.mjs";
import { n as Route } from "./router-Hj5VSLhr.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/config._id-EAE8C5ir.js
var import_jsx_runtime = require_jsx_runtime();
function ConfigPage(props) {
	const { data, error } = usePoll(() => coreConfig({ data: { id: props.id } }), 15e3, [props.id]);
	const { data: cs } = usePoll(() => coreSettings(), 6e4);
	const cost = cs?.settings?.cost;
	const d = data;
	if (!d) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ErrorNote, { error }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Empty, { children: "Loading…" }) });
	const r = d.row;
	const trades = d.trades ?? [];
	let cum = 0;
	const curve = trades.map((t) => ({
		t: t.exit_t,
		v: cum += t.r * 100
	}));
	const ln = d.lastn ?? [];
	const isRows = ln.filter((x) => x.part === "is").sort((a, b) => a.n - b.n);
	const oosRows = ln.filter((x) => x.part === "oos").sort((a, b) => a.n - b.n);
	const latestAt = d.evals?.[0]?.at;
	const seenWin = /* @__PURE__ */ new Set();
	const evals = (d.evals ?? []).filter((e) => e.at === latestAt && !seenWin.has(e.win) && seenWin.add(e.win));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ErrorNote, { error }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
			title: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "v2-mono",
				children: props.id
			}),
			right: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: "v2-btn",
				onClick: () => downloadFile(`${props.id.replace(/\|/g, "_")}.csv`, toCsv(trades), "text/csv"),
				children: "Trades CSV"
			}),
			children: r ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "v2-grid v2-cols-6",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kpi, {
						label: "Orders",
						value: r.n,
						sub: `WR ${fmt.ratio(r.wr)}`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kpi, {
						label: "PF",
						value: fmt.pf(r.pf),
						className: pfTone(r.pf),
						sub: `IS ${fmt.pf(r.is_pf)}`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kpi, {
						label: "Net",
						value: fmt.pct(r.net),
						className: tone(r.net),
						sub: `IS ${fmt.pct(r.is_net)}`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kpi, {
						label: "DDT",
						value: fmt.h(r.ddt),
						sub: `MDD ${fmt.num(r.mdd, 2)}%`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kpi, {
						label: "Best last-N",
						value: r.best_n ?? "–",
						sub: r.lastn_ok ? "OOS pass" : r.lastn_ok === 0 ? "OOS fail" : "not evaluated",
						className: r.lastn_ok ? "v2-up" : ""
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kpi, {
						label: "OOS PF",
						value: fmt.pf(r.oos_pf),
						className: pfTone(r.oos_pf),
						sub: `n ${r.oos_n ?? "–"} · ${fmt.pct(r.oos_net)}`
					})
				]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Empty, { children: "Config not in the current run (rankings refresh each compute)." })
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "v2-grid v2-cols-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
				title: "Last-N gate",
				sub: "PF of taken trades per N (0 = ungated) · dashed = neutral 1.0",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NCurve, {
					neutral: 1,
					best: r?.best_n ?? void 0,
					series: [{
						name: "in-sample",
						points: isRows.map((x) => ({
							n: x.n,
							v: Math.min(x.pf, 4)
						}))
					}, {
						name: "out-of-sample",
						points: oosRows.map((x) => ({
							n: x.n,
							v: Math.min(x.pf, 4)
						}))
					}]
				})
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
				title: "Continuous independent evals",
				sub: latestAt ? fmt.time(latestAt) : "",
				flush: true,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "v2-table-wrap",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
						className: "v2-table",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "window" }),
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
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "num",
								children: "DDT"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "num",
								children: "WR"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "pass" })
						] }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: evals.map((e) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: e.win }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "num",
								children: e.n
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: `num ${pfTone(e.pf)}`,
								children: fmt.pf(e.pf)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: `num ${tone(e.net)}`,
								children: fmt.pct(e.net)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "num",
								children: fmt.h(e.ddt)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "num",
								children: fmt.ratio(e.wr)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: e.pass ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pill, {
								kind: "ok",
								children: "pass"
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pill, { children: "–" }) })
						] }, e.win)) })]
					})
				})
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
			title: "Cumulative net",
			sub: "shaded: time under a previous peak (DDT)",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EquityChart, {
				series: [{
					name: "net %",
					points: curve
				}],
				unit: "%"
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
			title: "Trade tape",
			sub: `${trades.length} closes · ${cost === void 0 ? "the" : `${fmt.num(cost * 100, 2)}%`} round-trip cost included`,
			flush: true,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "v2-table-wrap",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
					className: "v2-table",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "symbol" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "side" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "entry" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "exit" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "num",
							children: "entry px"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "num",
							children: "exit px"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "num",
							children: "net"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "reason" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "num",
							children: "bars"
						})
					] }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: [...trades].reverse().slice(0, 500).map((t, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: t.sym }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: t.side > 0 ? "long" : "short" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: fmt.time(t.entry_t) }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: fmt.time(t.exit_t) }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "num",
							children: fmt.num(t.entry, 4)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "num",
							children: fmt.num(t.exit, 4)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: `num ${tone(t.r)}`,
							children: fmt.pct(t.r * 100)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: t.reason }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "num",
							children: t.bars
						})
					] }, i)) })]
				})
			})
		})
	] });
}
var SplitComponent = function ConfigRoute() {
	const { id } = Route.useParams();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ConfigPage, { id });
};
//#endregion
export { SplitComponent as component };
