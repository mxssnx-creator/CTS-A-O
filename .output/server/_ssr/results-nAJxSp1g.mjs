import { i as __toESM } from "../_runtime.mjs";
import { H as require_react, v as Link, x as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { A as useDebounced, C as downloadFile, O as toCsv, T as pfTone, c as Pill, j as usePoll, k as tone, l as Seg, n as Empty, r as ErrorNote, s as Panel, v as coreResults, w as fmt } from "./ui-JN3y5-4V.mjs";
import { t as INDICATIONS } from "./registry-B_QwiKPx.mjs";
import { t as BOTS } from "./bots-CUhvQaYR.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/results-nAJxSp1g.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function ResultsPage() {
	const [stage, setStage] = (0, import_react.useState)(1);
	const [bot, setBot] = (0, import_react.useState)("");
	const [ind, setInd] = (0, import_react.useState)("");
	const [lane, setLane] = (0, import_react.useState)("");
	const [sort, setSort] = (0, import_react.useState)("score");
	const [q, setQ] = (0, import_react.useState)("");
	const dq = useDebounced(q, 300);
	const { data, error, loading } = usePoll(() => coreResults({ data: {
		stage,
		bot: bot || void 0,
		ind: ind || void 0,
		lane: lane || void 0,
		sort,
		q: dq || void 0,
		limit: 400
	} }), 1e4, [
		stage,
		bot,
		ind,
		lane,
		sort,
		dq
	]);
	const rows = data?.rows ?? [];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ErrorNote, { error }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
			title: "Configs",
			sub: `${loading ? "loading… · " : ""}${fmt.num(data?.total)} rows · every indication × bot × protect, calculated independently`,
			right: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: "v2-btn",
				onClick: () => downloadFile(`cts-configs-stage${stage}.csv`, toCsv(rows), "text/csv"),
				children: "CSV"
			}),
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				style: {
					display: "flex",
					gap: 8,
					flexWrap: "wrap",
					alignItems: "center"
				},
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Seg, {
						label: "Stage",
						value: stage,
						onChange: setStage,
						options: [
							{
								value: 1,
								label: "Base"
							},
							{
								value: 2,
								label: "Main"
							},
							{
								value: 3,
								label: "Evaluated"
							}
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
						className: "v2-select",
						value: bot,
						onChange: (e) => setBot(e.target.value),
						"aria-label": "Bot",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "",
							children: "all bots"
						}), BOTS.map((b) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: b.type,
							children: b.label
						}, b.type))]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
						className: "v2-select",
						value: ind,
						onChange: (e) => setInd(e.target.value),
						"aria-label": "Indication",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "",
								children: "all indications"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "none",
								children: "none"
							}),
							INDICATIONS.map((i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
								value: i.id,
								children: [
									i.kind,
									" · ",
									i.label
								]
							}, i.id))
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
						className: "v2-select",
						value: lane,
						onChange: (e) => setLane(e.target.value),
						"aria-label": "Timeframe lane",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "",
							children: "all timeframes"
						}), [
							"1",
							"1c",
							"5",
							"5c",
							"15",
							"15c",
							"30"
						].map((x) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: x,
							children: x.endsWith("c") ? `${x.slice(0, -1)}m combined` : `${x}m`
						}, x))]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
						className: "v2-select",
						value: sort,
						onChange: (e) => setSort(e.target.value),
						"aria-label": "Sort",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "score",
								children: "score"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "pf",
								children: "PF"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "net",
								children: "net"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "n",
								children: "orders"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "gh",
								children: "green hours"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "oos",
								children: "OOS PF"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "rank",
								children: "rank"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						className: "v2-input",
						placeholder: "filter id…",
						value: q,
						onChange: (e) => setQ(e.target.value)
					})
				]
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
			flush: true,
			children: rows.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Empty, { children: "No rows yet — Base runs after the first backfill." }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
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
							children: "WR"
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
							children: "MDD"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "num",
							children: "DDT"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "num",
							children: "green h"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "num",
							children: "/h"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "num",
							children: "IS PF"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "num",
							children: "score"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "num",
							children: "OOS PF"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {})
					] }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: rows.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
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
							className: "num",
							children: fmt.ratio(r.wr)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: `num ${pfTone(r.pf)}`,
							children: fmt.pf(r.pf)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: `num ${tone(r.net)}`,
							children: fmt.pct(r.net)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
							className: "num",
							children: [fmt.num(r.mdd, 2), "%"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "num",
							children: fmt.h(r.ddt)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "num",
							children: fmt.ratio(r.gh)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "num",
							children: fmt.num(r.tph, 1)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: `num ${pfTone(r.is_pf)}`,
							children: fmt.pf(r.is_pf)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "num",
							children: fmt.num(r.score, 1)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: `num ${pfTone(r.oos_pf)}`,
							children: fmt.pf(r.oos_pf)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: r.armed ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pill, {
							kind: "acc",
							children: "armed"
						}) : null })
					] }, r.id)) })]
				})
			})
		})
	] });
}
var SplitComponent = ResultsPage;
//#endregion
export { SplitComponent as component };
