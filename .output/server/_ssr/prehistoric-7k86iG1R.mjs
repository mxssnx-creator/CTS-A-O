import { x as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { T as pfTone, c as Pill, w as fmt } from "./ui-JN3y5-4V.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/prehistoric-7k86iG1R.js
var import_jsx_runtime = require_jsx_runtime();
var STATE_COLOR = {
	ready: "var(--v-up)",
	computing: "var(--v-accent)",
	loading: "var(--v-warn, #d4a017)",
	queued: "var(--v-text-3)",
	skipped: "var(--v-down)"
};
function PrehistoricPanel(props) {
	const st = props.status;
	const p = st?.prehistoric;
	if (!p) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "v2-panel",
		style: { padding: 12 },
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			style: { fontWeight: 700 },
			children: "Prehistoric calculation"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "v2-muted",
			style: { fontSize: "var(--v-fs-sm)" },
			children: st?.state === "backfill" ? `loading market data · ${st.label ?? ""}` : "starting — the first batch of symbols is being loaded"
		})]
	});
	const total = Math.max(1, p.total);
	const running = st.state === "computing" || st.state === "backfill";
	const pct = Math.min(100, Math.round((p.ready + (running && !p.complete ? st.progress * Math.max(0, p.loaded - p.ready) : 0)) / total * 100));
	const s = p.stats;
	const syms = Object.entries(p.symbols).sort((a, b) => (b[1].n ?? 0) - (a[1].n ?? 0));
	const c = p.counts;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "v2-panel",
		style: {
			padding: 12,
			display: "grid",
			gap: 10
		},
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				style: {
					display: "flex",
					gap: 8,
					alignItems: "center",
					flexWrap: "wrap"
				},
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Prehistoric calculation" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "v2-muted",
						style: { fontSize: "var(--v-fs-sm)" },
						children: [
							p.hours,
							" h pre-calc · ",
							p.simH,
							" h simulated run · complete computation per batch, realtime starts as each batch is ready"
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						style: { marginLeft: "auto" },
						children: p.complete ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pill, {
							kind: "ok",
							children: "complete · realtime running"
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Pill, {
							kind: "acc",
							children: [
								st.stage,
								" ",
								Math.round((st.progress ?? 0) * 100),
								"%"
							]
						})
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					style: {
						display: "flex",
						justifyContent: "space-between",
						fontSize: "var(--v-fs-sm)"
					},
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
						"Symbols processed",
						" ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", { children: [
							p.ready,
							"/",
							p.total
						] }),
						" ",
						"· loaded ",
						p.loaded
					] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [pct, "%"] })]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					role: "progressbar",
					"aria-valuenow": pct,
					"aria-valuemin": 0,
					"aria-valuemax": 100,
					"aria-label": "Prehistoric progress",
					style: {
						height: 10,
						borderRadius: 6,
						background: "var(--v-bg-2, rgba(127,127,127,.18))",
						overflow: "hidden",
						marginTop: 4
					},
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: {
						width: `${pct}%`,
						height: "100%",
						background: p.complete ? "var(--v-up)" : "var(--v-accent)",
						transition: "width .4s"
					} })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "v2-muted",
					style: {
						fontSize: "var(--v-fs-xs)",
						marginTop: 4
					},
					children: running ? `${st.stage}: ${st.label || "…"}` : p.complete ? `completed ${fmt.ago(p.readyAt)}` : "next batch queued"
				})
			] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "v2-grid v2-cols-6",
				style: { gap: 8 },
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						k: "PF",
						v: fmt.pf(s?.pf),
						cls: pfTone(s?.pf, props.minPf),
						sub: `min ${props.minPf}`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						k: "DDT",
						v: fmt.h(s?.ddtH),
						cls: s && s.ddtH > props.maxDdtH ? "v2-down" : "",
						sub: `max ${props.maxDdtH} h`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						k: "Avg open",
						v: fmt.num(s?.avgOpen, 1),
						sub: `peak ${s?.maxOpen ?? 0} processing`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						k: "Trades",
						v: fmt.num(s?.n),
						sub: `WR ${fmt.ratio(s?.wr)}`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						k: "Green hours",
						v: fmt.ratio(s?.greenHours),
						sub: `net ${fmt.pct(s?.net, 1)}`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						k: "Symbols trading",
						v: `${s?.perSymbol?.length ?? 0}`,
						sub: `of ${p.ready} ready`
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "v2-grid v2-cols-6",
				style: { gap: 8 },
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						k: "Base evaluated",
						v: fmt.num(st.baseEvaluated ?? c.base),
						sub: "config sets"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						k: "Base passed",
						v: fmt.num(st.basePassed),
						sub: `PF ≥ ${props.minPf}`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						k: "Main pairs",
						v: fmt.num(c.main),
						sub: "promoted"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						k: "Sets (tapes)",
						v: fmt.num(c.sets),
						sub: "protect × strategy"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						k: "Real",
						v: fmt.num(c.real),
						sub: "selected now"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						k: "Evals · armed",
						v: `${c.evals} · ${c.armed}`,
						sub: "continuous evals"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("summary", {
				style: {
					cursor: "pointer",
					fontSize: "var(--v-fs-sm)"
				},
				children: [
					"Per symbol (",
					syms.length,
					")"
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				style: {
					display: "flex",
					flexWrap: "wrap",
					gap: 6,
					marginTop: 8
				},
				children: syms.map(([sym, v]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "v2-pill",
					title: `${v.state}${v.bars ? ` · ${v.bars} bars` : ""}${v.n ? ` · ${v.n} trades · PF ${fmt.pf(v.pf)}` : ""}`,
					style: { borderColor: STATE_COLOR[v.state] ?? "var(--v-border)" },
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: {
							width: 7,
							height: 7,
							borderRadius: 4,
							background: STATE_COLOR[v.state] ?? "gray",
							display: "inline-block",
							marginRight: 5
						} }),
						sym.replace("-USDT", ""),
						v.n ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: pfTone(v.pf, props.minPf),
							style: { marginLeft: 5 },
							children: [
								fmt.pf(v.pf),
								"·",
								v.n
							]
						}) : null
					]
				}, sym))
			})] })
		]
	});
}
function Stat(props) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "v2-panel",
		style: { padding: "6px 8px" },
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "v2-muted",
				style: { fontSize: "var(--v-fs-xs)" },
				children: props.k
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: props.cls,
				style: {
					fontWeight: 700,
					fontSize: "var(--v-fs-lg, 1.1em)"
				},
				children: props.v
			}),
			props.sub && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "v2-muted",
				style: { fontSize: "var(--v-fs-xs)" },
				children: props.sub
			})
		]
	});
}
//#endregion
export { PrehistoricPanel as t };
