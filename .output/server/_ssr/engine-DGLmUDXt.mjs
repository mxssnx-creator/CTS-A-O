import { i as __toESM } from "../_runtime.mjs";
import { H as require_react, x as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as Line, c as Pill, f as coreControl, i as Kpi, j as usePoll, n as Empty, p as coreEngine, r as ErrorNote, s as Panel, t as Confirm, w as fmt } from "./ui-JN3y5-4V.mjs";
import { a as MultiArcGauge } from "./charts-Dtp2dyjl.mjs";
import { t as PrehistoricPanel } from "./prehistoric-7k86iG1R.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/engine-DGLmUDXt.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function EnginePage() {
	const { data, error, refresh } = usePoll(() => coreEngine(), 3e3);
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [actErr, setActErr] = (0, import_react.useState)(null);
	const [ask, setAsk] = (0, import_react.useState)(null);
	const d = data;
	if (!d) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ErrorNote, { error }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Empty, { children: "Loading…" }) });
	const st = d.status;
	const act = async (action) => {
		setBusy(true);
		try {
			await coreControl({ data: { action } });
			setActErr(null);
		} catch (e) {
			setActErr(e instanceof Error ? e.message : String(e));
		} finally {
			setBusy(false);
			refresh();
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ErrorNote, { error: actErr ?? error }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PrehistoricPanel, {
			status: st,
			minPf: d.settings?.gates?.minPf ?? 1.1,
			maxDdtH: d.settings?.gates?.maxDdtH ?? 20
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
			title: "Runtime",
			sub: "continuous loop · time-sliced compute · watchdog restarts a stale loop",
			right: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "v2-btn",
					disabled: busy,
					onClick: () => act("recompute"),
					children: "Recompute"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "v2-btn",
					disabled: busy,
					onClick: () => setAsk("resync"),
					children: "Resync market"
				}),
				st.state === "stopped" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "v2-btn primary",
					disabled: busy,
					onClick: () => act("start"),
					children: "Start"
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "v2-btn",
					disabled: busy,
					onClick: () => setAsk("stop"),
					children: "Stop"
				})
			] }),
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "v2-grid v2-cols-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MultiArcGauge, {
						size: 170,
						center: `${Math.round(st.progress * 100)}%`,
						centerSub: st.stage || st.state,
						rings: [
							{
								label: `Stage ${st.stage || "–"}`,
								value: st.progress,
								display: `${Math.round(st.progress * 100)}%`
							},
							{
								label: "Cycle vs budget",
								value: Math.min(1, st.lastCycleMs / 2e4),
								display: `${fmt.num(st.lastCycleMs)} ms`
							},
							{
								label: "Heap",
								value: Math.min(1, d.process.heap / 2e9),
								display: fmt.bytes(d.process.heap)
							},
							{
								label: "SQLite",
								value: Math.min(1, d.bytes / 5e8),
								display: fmt.bytes(d.bytes)
							}
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "v2-lines",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
								k: "State",
								v: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pill, {
									kind: st.state === "error" ? "bad" : "ok",
									children: st.state
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
								k: "Label",
								v: st.label || "–"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
								k: "Cycles · computes",
								v: `${st.cycles} · ${st.computes}`
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
								k: "Last compute",
								v: `${fmt.num(st.lastComputeMs)} ms`
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
								k: "Heartbeat",
								v: fmt.ago(st.heartbeat)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
								k: "Next cycle",
								v: fmt.time(st.nextCycleAt)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
								k: "Started",
								v: fmt.time(st.startedAt)
							}),
							st.error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
								k: "Error",
								v: st.error,
								className: "v2-down"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "v2-lines",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
								k: "Source",
								v: st.source
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
								k: "Symbols",
								v: st.symbols.length
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
								k: "Last closed bar",
								v: fmt.time(st.lastBarT)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
								k: "Node",
								v: d.process.node
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
								k: "RSS",
								v: fmt.bytes(d.process.rss)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
								k: "Uptime",
								v: fmt.h(d.process.uptime / 3600)
							})
						]
					})
				]
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Confirm, {
			open: ask !== null,
			title: ask === "stop" ? "Stop the engine?" : "Resync the market?",
			body: ask === "stop" ? "The running compute is abandoned at its next yield. Paper positions stay as they are; nothing is sent to an exchange. Start resumes with a fresh compute." : "All candles are dropped and the universe is backfilled again from BingX (about 15–30 s for 40 symbols), then everything is recomputed.",
			confirm: ask === "stop" ? "Stop" : "Resync",
			danger: ask === "stop",
			onCancel: () => setAsk(null),
			onConfirm: () => {
				const a = ask;
				setAsk(null);
				if (a) act(a);
			}
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "v2-grid v2-cols-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
				title: "Compute phases",
				sub: "total time · longest uninterrupted slice (what can delay requests)",
				flush: true,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "v2-table-wrap",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
						className: "v2-table",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "phase" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "num",
								children: "total"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "num",
								children: "max slice"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {})
						] }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: Object.entries(st.phases ?? {}).map(([k, v]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: k }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
								className: "num",
								children: [fmt.num(v.ms), " ms"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
								className: `num ${v.maxSliceMs > 150 ? "v2-down" : v.maxSliceMs > 60 ? "v2-warn" : "v2-up"}`,
								children: [fmt.num(v.maxSliceMs), " ms"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: v.maxSliceMs > 150 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pill, {
								kind: "bad",
								children: "blocking"
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pill, {
								kind: "ok",
								children: "responsive"
							}) })
						] }, k)) })]
					})
				})
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
				title: "Event loop",
				sub: "delay measured during the last compute",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "v2-lines",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
							k: "p50",
							v: `${fmt.num(st.loop?.p50, 1)} ms`
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
							k: "p99",
							v: `${fmt.num(st.loop?.p99, 1)} ms`,
							className: st.loop?.p99 > 100 ? "v2-down" : "v2-up"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
							k: "max",
							v: `${fmt.num(st.loop?.max, 0)} ms`,
							className: st.loop?.max > 250 ? "v2-down" : st.loop?.max > 100 ? "v2-warn" : "v2-up"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
							k: `Main pairs (Base ${fmt.num(st.basePassed ?? 0)} passed of ${fmt.num(st.baseEvaluated ?? 0)})`,
							v: st.mainPairs
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
							k: "Compute queued",
							v: st.pending ? "yes" : "no"
						})
					]
				})
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
			title: "Self-audit",
			sub: d.audit ? `${d.audit.checks.length} invariants recomputed after the last paper step · ${d.audit.ms} ms · ${new Date(d.audit.at).toLocaleTimeString()}` : "runs after the first paper step",
			right: d.audit ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pill, {
				kind: d.audit.ok ? "ok" : "bad",
				children: d.audit.ok ? "all pass" : "failing"
			}) : null,
			flush: true,
			children: d.audit ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "v2-table-wrap",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
					className: "v2-table",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Check" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Result" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Detail" })
					] }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: d.audit.checks.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: c.name }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: c.ok ? "v2-up" : "v2-down",
							children: c.ok ? "pass" : "FAIL"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "v2-muted",
							style: { fontSize: "var(--v-fs-xs)" },
							children: c.detail
						})
					] }, c.name)) })]
				})
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Empty, { children: "waiting for the first paper step" })
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "v2-grid v2-cols-4",
			children: d.tables.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kpi, {
				label: t.table,
				value: fmt.num(t.rows)
			}, t.table))
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "v2-grid v2-cols-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
				title: "Compute runs",
				flush: true,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "v2-table-wrap",
					style: { maxHeight: 380 },
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "v2-table-wrap",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
							className: "v2-table",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "ended" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "num",
									children: "items"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "num",
									children: "ms"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "note" })
							] }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: d.runs.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: fmt.time(r.ended) }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "num",
									children: fmt.num(r.items)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "num",
									children: fmt.num(r.ms)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "v2-muted",
									children: r.note
								})
							] }, r.id)) })]
						})
					})
				})
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
				title: "Events",
				flush: true,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "v2-table-wrap",
					style: { maxHeight: 380 },
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "v2-table-wrap",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
							className: "v2-table",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "time" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "level" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "message" })
							] }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: d.events.map((e) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: fmt.time(e.at) }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pill, {
									kind: e.level === "error" ? "bad" : e.level === "warn" ? void 0 : "ok",
									children: e.level
								}) }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									style: { whiteSpace: "normal" },
									children: e.msg
								})
							] }, e.id)) })]
						})
					})
				})
			})]
		})
	] });
}
var SplitComponent = EnginePage;
//#endregion
export { SplitComponent as component };
