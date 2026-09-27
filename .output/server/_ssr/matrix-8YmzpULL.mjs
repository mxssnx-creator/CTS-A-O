import { i as __toESM } from "../_runtime.mjs";
import { H as require_react, x as require_jsx_runtime, y as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { M as usePoll, h as coreMatrix, l as Seg, n as Empty, r as ErrorNote, s as Panel, v as coreResults, w as fmt } from "./ui-Bl7sOgcb.mjs";
import { i as HeatGrid, t as ArcDiagram } from "./charts-Dtp2dyjl.mjs";
import { s as laneInd, t as INDICATIONS } from "./registry-DAOXOhzn.mjs";
import { t as BOTS } from "./bots-BwclXPEV.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/matrix-8YmzpULL.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function MatrixPage() {
	const { data, error } = usePoll(() => coreMatrix(), 2e4);
	const [metric, setMetric] = (0, import_react.useState)("pf");
	const [lane, setLane] = (0, import_react.useState)("15");
	const laneKey = (i) => laneInd(i, Number(lane.replace("c", "")), lane.endsWith("c") && i !== "none");
	const nav = useNavigate();
	const d = data;
	const rows = (0, import_react.useMemo)(() => d?.rows ?? [], [d]);
	const byKey = (0, import_react.useMemo)(() => new Map(rows.map((r) => [`${r.bot}|${r.ind}`, r])), [rows]);
	const bots = BOTS.map((b) => b.type);
	const inds = ["none", ...INDICATIONS.map((i) => i.id)];
	const links = (0, import_react.useMemo)(() => rows.filter((r) => r.ind !== "none" && r.n >= 8).sort((a, b) => b.score - a.score).slice(0, 60).map((r) => ({
		a: r.bot,
		b: r.ind,
		w: r.n,
		pf: r.pf,
		tip: `${r.bot} × ${r.ind} · n ${r.n} · PF ${fmt.pf(r.pf)} · net ${fmt.pct(r.net)}`
	})), [rows]);
	const usedInds = [...new Set(links.map((l) => l.b))];
	if (!d) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ErrorNote, { error }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Empty, { children: "Loading…" }) });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ErrorNote, { error }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
			title: "Relations",
			sub: "top 60 Base relations by score — arc = bot × indication",
			children: links.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArcDiagram, {
				links,
				left: bots.filter((b) => links.some((l) => l.a === b)),
				right: usedInds
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Empty, { children: "No Base results yet" })
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
			title: "Bot × indication",
			sub: "Base stage, default protect, one timeframe lane (m+ = combined with every higher timeframe) · click a cell to open its best configs",
			right: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				style: {
					display: "flex",
					gap: 8,
					flexWrap: "wrap"
				},
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Seg, {
					label: "Timeframe lane",
					value: lane,
					onChange: setLane,
					options: [
						"1",
						"1c",
						"5",
						"5c",
						"15",
						"15c",
						"30"
					].map((x) => ({
						value: x,
						label: x.endsWith("c") ? `${x.slice(0, -1)}m+` : `${x}m`
					}))
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Seg, {
					label: "Metric",
					value: metric,
					onChange: setMetric,
					options: [
						{
							value: "pf",
							label: "PF"
						},
						{
							value: "is_pf",
							label: "IS PF"
						},
						{
							value: "gh",
							label: "green h"
						}
					]
				})]
			}),
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeatGrid, {
				rows: bots,
				cols: inds,
				neutral: metric === "gh" ? .5 : 1,
				cell: (b, i) => {
					const r = byKey.get(`${b}|${laneKey(i)}`) ?? byKey.get(`${b}|${i}`);
					if (!r) return null;
					return {
						v: r[metric],
						tip: `${b} × ${i} · n ${r.n} · PF ${fmt.pf(r.pf)} · IS PF ${fmt.pf(r.is_pf)} · net ${fmt.pct(r.net)} · green ${fmt.ratio(r.gh)}`
					};
				},
				onPick: (b, i) => {
					coreResults({ data: {
						bot: b,
						ind: laneKey(i),
						sort: "score",
						limit: 1
					} }).then((res) => {
						const id = res.rows?.[0]?.id;
						if (id) nav({
							to: "/v2/config/$id",
							params: { id }
						});
					}).catch(() => void 0);
				}
			})
		})
	] });
}
var SplitComponent = MatrixPage;
//#endregion
export { SplitComponent as component };
