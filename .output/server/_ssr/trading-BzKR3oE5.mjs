import { v as Link, x as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { A as tone, M as usePoll, S as coreTrading, T as liveState, a as Line, c as Pill, i as Kpi, m as coreMarket, n as Empty, r as ErrorNote, s as Panel, w as fmt } from "./ui-Bl7sOgcb.mjs";
import { u as Sparkline } from "./charts-Dtp2dyjl.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/trading-BzKR3oE5.js
var import_jsx_runtime = require_jsx_runtime();
function TradingPage() {
	const { data, error } = usePoll(() => coreTrading(), 5e3);
	const d = data;
	if (!d) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ErrorNote, { error }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Empty, { children: "Loading…" }) });
	const trades = d.trades;
	const pnl = Number(d.realized ?? 0);
	const live = d.live;
	const ls = liveState(d.liveSettings?.enabled, live);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ErrorNote, { error }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "v2-grid v2-cols-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kpi, {
					label: "Paper P&L",
					value: fmt.usd(d.equity),
					className: tone(d.equity),
					sub: `balance ${fmt.usd(d.balance)} from ${fmt.usd(d.startBalance)} · ${d.sizing?.mode === "fixed" ? "fixed notional" : `${fmt.num((d.sizing?.pct ?? .02) * 100, 1)}% of equity per order`}`
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kpi, {
					label: "Open positions / orders",
					value: `${d.book?.positions ?? 0} / ${d.book?.orders ?? d.positions.length}`,
					sub: `long ${d.book?.long ?? 0} · short ${d.book?.short ?? 0} · ${d.selected.length} Real configs`
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kpi, {
					label: "Closed positions / orders",
					value: `${d.closed?.positions ?? 0} / ${d.closed?.orders ?? trades.length}`,
					sub: fmt.usd(pnl),
					className: tone(pnl)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kpi, {
					label: "Live",
					value: ls.on ? "on" : "off",
					sub: !ls.on ? "disabled in settings" : ls.blocked ? `blocked: ${ls.blocked}` : live?.reason ?? "armed",
					className: ls.on ? ls.blocked ? "v2-warn" : "v2-up" : ""
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "v2-grid v2-cols-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
				title: "Open paper orders",
				sub: `${d.book?.orders ?? 0} orders (lane partials) in ${d.book?.positions ?? 0} positions (symbol × direction)`,
				flush: true,
				children: d.positions.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "v2-table-wrap",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
						className: "v2-table",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "symbol" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "side" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "config" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "entry" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "num",
								children: "px"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "num",
								children: "stop"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "num",
								children: "target"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "num",
								children: "MTM"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "num",
								children: "vol ×"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "num",
								children: "MTM $"
							})
						] }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: d.positions.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: p.sym }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: p.side > 0 ? "long" : "short" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								to: "/v2/config/$id",
								params: { id: p.cfg },
								className: "v2-mono",
								children: p.cfg
							}) }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: fmt.time(p.entry_t) }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "num",
								children: fmt.num(p.entry, 4)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "num",
								children: fmt.num(p.stop, 4)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "num",
								children: fmt.num(p.target, 4)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: `num ${tone(p.mtm)}`,
								children: fmt.pct(p.mtm * 100)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
								className: "num",
								children: [fmt.num(p.vol ?? 1, 2), p.level ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "v2-muted",
									children: [" · L", p.level]
								}) : null]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: `num ${tone(p.mtm)}`,
								children: fmt.usd(p.mtm * (p.vol ?? 1) * (p.unit ?? 0))
							})
						] }, `${p.cfg}|${p.sym}|${p.entry_t}`)) })]
					})
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Empty, { children: "No open paper positions" })
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
				title: "Due now (Live intents)",
				sub: "signals on the newest closed bar from Real configs",
				flush: true,
				children: [d.pending.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "v2-table-wrap",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
						className: "v2-table",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "symbol" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "side" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "config" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "num",
								children: "TP"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "num",
								children: "SL"
							})
						] }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: d.pending.map((p, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: p.sym }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: p.side > 0 ? "long" : "short" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "v2-mono",
								children: p.cfg
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "num",
								children: fmt.frac(p.protect.tp)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "num",
								children: fmt.frac(p.protect.sl)
							})
						] }, i)) })]
					})
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Empty, { children: "Nothing due on the latest bar" }), live && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "v2-lines",
					style: { padding: 10 },
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
							k: "Live status",
							v: live.reason
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
							k: "Placed last cycle",
							v: live.placed
						}),
						(live.skipped ?? []).slice(0, 6).map((s, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
							k: `skip ${s.sym}`,
							v: s.why
						}, i)),
						live.error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
							k: "Error",
							v: live.error,
							className: "v2-down"
						})
					]
				})]
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
			title: "Paper closes",
			sub: `latest ${d.tradesShown ?? trades.length} · closed P&L above covers every close`,
			flush: true,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "v2-table-wrap",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
					className: "v2-table",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "exit" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "symbol" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "side" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "config" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "num",
							children: "entry"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "num",
							children: "exit"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "num",
							children: "net"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "num",
							children: "pnl"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "reason" })
					] }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: trades.map((t, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: fmt.time(t.exit_t) }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: t.sym }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: t.side > 0 ? "long" : "short" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "v2-mono",
							children: t.cfg
						}),
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
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: `num ${tone(t.pnl)}`,
							children: fmt.usd(t.pnl)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: t.reason })
					] }, i)) })]
				})
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
			title: "Position cost and auto-adjust",
			sub: `model ${(d.cost?.model * 100).toFixed(3)} % round trip (taker ${(d.cost?.fees?.taker * 100).toFixed(3)} % + slippage ${(d.cost?.fees?.slippage * 100).toFixed(3)} % per side) · measured live: ${d.liveCost ? `${(d.liveCost.rt * 100).toFixed(3)} % from ${d.liveCost.fills} fills (fee ${(d.liveCost.fee * 100).toFixed(3)} %, slippage ${(d.liveCost.slip * 100).toFixed(3)} % per side)` : "not enough live fills yet (40 needed)"}`,
			flush: true,
			children: (d.adjust ?? []).length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "v2-table-wrap",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
					className: "v2-table",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "strategy config set" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "num",
							children: "last N PF"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "num",
							children: "level"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "num",
							children: "min SL"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "num",
							children: "min trail"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "state" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "last change" })
					] }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: d.adjust.map((a) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							style: { fontWeight: 600 },
							children: a.set
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
							className: "num",
							children: [
								fmt.pf(a.pf),
								" ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "v2-muted",
									children: [
										"(",
										a.n,
										")"
									]
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "num",
							children: a.level
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "num",
							children: fmt.frac(a.minSl)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "num",
							children: fmt.frac(a.minTrail)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: a.pausedUntil > Date.now() ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Pill, {
							kind: "bad",
							children: ["paused until ", fmt.time(a.pausedUntil)]
						}) : a.level > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pill, {
							kind: "acc",
							children: "adjusted"
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pill, { children: "base" }) }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "v2-muted",
							children: a.note
						})
					] }, a.set)) })]
				})
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Empty, { children: [
				"No set has ",
				d.adjustWindow ?? 15,
				" closed positions yet — the adjuster judges each set after its last N positions."
			] })
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
			title: "Control orders · Overall",
			sub: `${d.liveSettings?.connId ?? ""} keys: ${{
				own: "own",
				x01: "x01 keys (VST host)",
				generic: "generic BINGX_API_KEY",
				none: "none — add BINGX_X01_API_KEY / BINGX_X01_SECRET"
			}[d.liveKeys] ?? "?"} · one position per symbol + direction, sized from every lane holding it · ${(d.liveSettings?.mode ?? "overall") === "overall" ? "Live mode: overall" : "Live mode: entries (preview only)"} · $${d.liveSettings?.notionalUsd} × lane volume × ${d.liveSettings?.ratio ?? 1}, cap $${d.liveSettings?.maxNotionalUsd ?? (d.liveSettings?.notionalUsd ?? 6) * 5}, adjust beyond ±${Math.round((d.liveSettings?.rebalancePct ?? .25) * 100)}%`,
			right: d.control ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pill, {
				kind: d.control.reconnected ? "bad" : d.control.unchanged ? void 0 : "acc",
				children: d.control.reconnected ? "connection changed" : d.control.unchanged ? "in sync" : "adjusted"
			}) : void 0,
			flush: true,
			children: [
				d.control && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "v2-muted",
					style: {
						padding: "8px 12px",
						fontSize: "var(--v-fs-xs)",
						fontFamily: "var(--v-mono, monospace)",
						display: "flex",
						flexWrap: "wrap",
						gap: "4px 14px"
					},
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["conn #", d.control.connHash] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["targets #", d.control.targetsHash] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["book #", d.control.bookHash] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["plan #", d.control.planHash] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
							"steps ",
							d.control.steps,
							" · changes ",
							d.control.changes,
							d.control.suppressed ? ` · ${d.control.suppressed} lane order(s) held back after a position was closed outside CTS-A-O` : ""
						] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: fmt.ago(d.control.at) })
					]
				}),
				(d.controlPreview?.targets ?? []).length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "v2-table-wrap",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
						className: "v2-table",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "symbol" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "direction" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "num",
								children: "lanes"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "num",
								children: "volume"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "num",
								children: "target $"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "num",
								children: "target qty"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "num",
								children: "held qty"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "num",
								children: "stop"
							})
						] }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: d.controlPreview.targets.map((t) => {
							const held = (d.control?.held)?.find((h) => h.key === t.key)?.qty;
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									style: { fontWeight: 600 },
									children: t.sym
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: t.side === 1 ? "v2-up" : "v2-down",
									children: t.side === 1 ? "long" : "short"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "num",
									children: t.lanes
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "num",
									children: fmt.num(t.vol, 2)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "num",
									children: fmt.num(t.notional, 2)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "num",
									children: fmt.num(t.qty, 4)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "num",
									children: held === void 0 ? "–" : fmt.num(held, 4)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "num",
									children: fmt.frac(t.stopDist)
								})
							] }, t.key);
						}) })]
					})
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Empty, { children: "No control positions — no lane holds a paper position right now." }),
				d.controlPreview?.unit !== void 0 && (d.controlPreview?.targets ?? []).length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "v2-muted",
					style: {
						padding: "8px 12px",
						fontSize: "var(--v-fs-xs)"
					},
					children: [
						"one lane unit $",
						fmt.num(d.controlPreview.unit, 2),
						" ·",
						" ",
						d.controlPreview.unitFrom === "equity" ? "from the account equity" : d.controlPreview.unitFrom === "fixed" ? "fixed notional" : "from the paper balance (no equity read yet — live sizes from the account)"
					]
				}),
				(d.control?.actions ?? []).length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "v2-muted",
					style: {
						padding: "8px 12px",
						fontSize: "var(--v-fs-xs)"
					},
					children: [
						"last actions:",
						" ",
						d.control.actions.map((a) => `${a.kind} ${a.key} ${fmt.num(a.qty, 4)}${a.ok ? "" : ` ✗ ${a.msg}`}`).join(" · ")
					]
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
			title: "Live orders",
			sub: "own CTSB tickets only",
			flush: true,
			children: d.liveOrders.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "v2-table-wrap",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
					className: "v2-table",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "time" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "coid" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "symbol" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "kind" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "num",
							children: "qty"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "num",
							children: "px"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "status" })
					] }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: d.liveOrders.map((o) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: fmt.time(o.at) }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "v2-mono",
							children: o.coid
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: o.sym }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: o.kind }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "num",
							children: o.qty
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "num",
							children: fmt.num(o.px, 4)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: o.status === "ok" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pill, {
							kind: "ok",
							children: "ok"
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pill, {
							kind: "bad",
							children: o.status
						}) })
					] }, o.coid)) })]
				})
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Empty, { children: "No live orders — the Live stage is off unless enabled in Settings and CTS_CORE_LIVE=1 on the host." })
		})
	] });
}
function MarketPage() {
	const { data, error } = usePoll(() => coreMarket(), 15e3);
	const d = data;
	if (!d) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ErrorNote, { error }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Empty, { children: "Loading…" }) });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ErrorNote, { error }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
		title: "Universe",
		sub: `${d.symbols.length} symbols · ${d.tfMin}m bars · source ${d.source} · chosen by the Symbols ranking in Settings (default 1H volatility) · listed by 24h quote volume`,
		flush: true,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "v2-table-wrap",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
				className: "v2-table",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "symbol" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
						className: "num",
						children: "last"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
						className: "num",
						children: "24h"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
						className: "num",
						children: "24h quote vol"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
						className: "num",
						children: "bars"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "from" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "to" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "last 24h" })
				] }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: d.symbols.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
						style: { fontWeight: 600 },
						children: s.sym
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
						className: "num",
						children: fmt.num(s.last, 4)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
						className: `num ${tone(s.change_pct)}`,
						children: fmt.pct(s.change_pct)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
						className: "num",
						children: [fmt.num(s.quote_vol / 1e6, 1), "M"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
						className: "num",
						children: s.bars
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: fmt.time(s.first_t) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: fmt.time(s.last_t) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkline, { values: d.spark[s.sym] ?? [] }) })
				] }, s.sym)) })]
			})
		})
	})] });
}
//#endregion
export { TradingPage as n, MarketPage as t };
