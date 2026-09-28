import { v as Link, x as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { A as tone, E as pfTone, M as usePoll, T as liveState, a as Line, c as Pill, g as coreOverview, n as Empty, r as ErrorNote, s as Panel, v as coreResults, w as fmt } from "./ui-B36Mml8F.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/stages-BZeX14tW.js
var import_jsx_runtime = require_jsx_runtime();
function StagesPage() {
	const { data, error } = usePoll(() => coreOverview(), 5e3);
	const { data: ranked } = usePoll(() => coreResults({ data: {
		stage: 3,
		sort: "rank",
		limit: 40
	} }), 15e3);
	const d = data;
	if (!d) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ErrorNote, { error }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Empty, { children: "Loading…" }) });
	const c = d.counts ?? {};
	const g = d.settings.gates;
	const tg = d.settings.toggles;
	const pipe = d.pipeline;
	const port = pipe?.portfolio;
	const ls = liveState(d.settings.live.enabled, d.live);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ErrorNote, { error }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
			title: "Coordination",
			sub: "each stage only evaluates what passed the previous one — no overload, full coverage in Base",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "v2-funnel",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "v2-stage",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "t",
								children: "1 · Base"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "n",
								children: fmt.num(c.base)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
								"Every indication × bot type with the base protect, plus ",
								d.wf.tapes,
								" independent strategy tapes (normal, trailing, DCA, DCA Active × ",
								d.wf.protects,
								" protect variants). Always computed, whatever the toggles."
							] })
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "v2-stage",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "t",
								children: "2 · Main"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "n",
								children: fmt.num(c.main)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
								"In-sample PF ≥ ",
								g.minPf,
								", DDT ≤ ",
								g.maxDdtH,
								"h/72h, ≥ ",
								g.minTrades,
								" trades; pair must be parameter-robust. Refined on the protect grid."
							] })
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "v2-stage",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "t",
								children: "3 · Real"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "n",
								children: d.paper.selected.length
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
								"Still working in the ",
								d.wf.preH,
								"h pre-historic window (PF ≥ 1.00), last-N",
								" ",
								d.wf.lastN ? d.wf.lastN : "off",
								" gate, Block levels. Executed on paper every hour."
							] })
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "v2-stage",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "t",
								children: "4 · Live"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "n",
								children: ls.on ? "on" : "off"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [!ls.on ? "Disabled in settings" : ls.blocked ? `blocked: ${ls.blocked}` : d.live?.reason ?? "armed", ". Own CTSB tags only; foreign symbols are skipped."] })
						]
					})
				]
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
			title: "Timeframe lanes",
			sub: "1m base, 5m / 15m / 30m derived · m+ = combined (agrees with every higher timeframe) · each lane independent through every stage",
			flush: true,
			children: d.lanes?.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "v2-table-wrap",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
					className: "v2-table",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Lane" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Base evaluated" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Base passed" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Main tapes" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Positions / Orders" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "PF" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Net %" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "WR" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Open pos / orders" })
					] }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: d.lanes.map((l) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							style: { fontWeight: 600 },
							children: l.lane
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: fmt.num(l.base) }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: fmt.num(l.passed) }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: fmt.num(l.tapes) }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { children: [
							fmt.num(l.positions),
							" / ",
							fmt.num(l.n)
						] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: l.n ? pfTone(l.pf) : "",
							children: l.n ? fmt.pf(l.pf) : "–"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: l.n ? tone(l.net) : "",
							children: l.n ? fmt.pct(l.net) : "–"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: l.n ? fmt.ratio(l.wr) : "–" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { children: [
							l.open?.positions ?? 0,
							" / ",
							l.open?.orders ?? 0
						] })
					] }, l.lane)) })]
				})
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Empty, { children: "No compute yet" })
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "v2-grid v2-cols-3",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
					title: "Execution toggles",
					sub: "filters execution only",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "v2-lines",
						children: [
							Object.entries(tg).map(([k, v]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
								k,
								v: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pill, {
									kind: v ? "ok" : void 0,
									children: v ? "on" : "off"
								})
							}, k)),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
								k: "Block",
								v: `+${d.settings.block.ratio}/level · 1–${d.settings.block.maxLevel} · cap ${d.settings.block.maxMult}×`
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
								k: "DCA",
								v: `${d.settings.dca.levels} levels · step ${fmt.frac(d.settings.dca.step)}`
							})
						]
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
					title: "Pipeline run",
					sub: pipe ? fmt.ago(pipe.at) : "",
					children: pipe ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "v2-lines",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
								k: "Universe",
								v: `${pipe.universe.symbols.length} symbols · ${fmt.num(pipe.universe.bars)} bars`
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
								k: "In-sample / OOS split",
								v: fmt.time(pipe.universe.splitT)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
								k: "Base (S1)",
								v: `${pipe.s1} combos · ${fmt.num(pipe.timings.S1)} ms`
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
								k: "Main (S2)",
								v: `${pipe.s2} runs · ${fmt.num(pipe.timings.S2)} ms`
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
								k: "Real eval (S3)",
								v: `${pipe.ranked} configs · ${fmt.num(pipe.timings.S3)} ms`
							})
						]
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Empty, { children: "–" })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
					title: "Validated portfolio",
					sub: "in-sample picked, out-of-sample reported",
					children: port ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "v2-lines",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
								k: "Members",
								v: port.members.length
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
								k: "Hour guard",
								v: port.guardPct ? `${port.guardPct}%` : "off"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
								k: "In-sample PF · net",
								v: `${fmt.pf(port.is.pf)} · ${fmt.pct(port.is.net)}`,
								className: pfTone(port.is.pf, g.minPf)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
								k: "Out-of-sample PF · net",
								v: `${fmt.pf(port.oos.pf)} · ${fmt.pct(port.oos.net)}`,
								className: pfTone(port.oos.pf, g.minPf)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
								k: "OOS green hours",
								v: `${port.oos.greenHours}/${port.oos.hours}`
							})
						]
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Empty, { children: "–" })
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
			title: "Ranked (Main → Real candidates)",
			sub: "last-N chosen in-sample, validated out-of-sample; continuous window evals",
			flush: true,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "v2-table-wrap",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
					className: "v2-table",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "#" }),
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
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "num",
							children: "best N"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "num",
							children: "OOS n"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "num",
							children: "OOS PF"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "num",
							children: "OOS net"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "last-N" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "num",
							children: "eval pass"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "armed" })
					] }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: (ranked?.rows ?? []).map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: r.rank }),
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
							className: `num ${pfTone(r.pf, g.minPf)}`,
							children: fmt.pf(r.pf)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: `num ${tone(r.net)}`,
							children: fmt.pct(r.net)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "num",
							children: r.best_n || "all"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "num",
							children: r.oos_n
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: `num ${pfTone(r.oos_pf, g.minPf)}`,
							children: fmt.pf(r.oos_pf)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: `num ${tone(r.oos_net)}`,
							children: fmt.pct(r.oos_net)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: r.lastn_ok ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pill, {
							kind: "ok",
							children: "pass"
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pill, {
							kind: "bad",
							children: "fail"
						}) }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "num",
							children: fmt.ratio(r.eval_pass)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: r.armed ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pill, {
							kind: "acc",
							children: "armed"
						}) : "" })
					] }, r.id)) })]
				})
			})
		})
	] });
}
var SplitComponent = StagesPage;
//#endregion
export { SplitComponent as component };
