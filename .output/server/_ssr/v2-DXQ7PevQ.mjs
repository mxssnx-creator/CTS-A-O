import { i as __toESM } from "../_runtime.mjs";
import { H as require_react, d as useRouterState, m as Outlet, v as Link, x as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { M as usePoll, T as liveState, c as Pill, l as Seg, w as fmt, x as coreStatus } from "./ui-B36Mml8F.mjs";
import { a as SlidersHorizontal, c as Layers, d as ChartColumn, f as ChartLine, i as Store, l as Gauge, m as Activity, o as Settings2, p as Bookmark, r as Table2, s as Menu, t as Wallet, u as Cpu } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/v2-DXQ7PevQ.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var NAV = [
	{
		group: "Desk",
		items: [{
			to: "/v2",
			label: "Overview",
			icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Gauge, { size: 15 }),
			exact: true
		}]
	},
	{
		group: "Stages",
		items: [
			{
				to: "/v2/stages",
				label: "Base → Live",
				icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Layers, { size: 15 })
			},
			{
				to: "/v2/results",
				label: "Configs",
				icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Table2, { size: 15 })
			},
			{
				to: "/v2/matrix",
				label: "Bot × Indication",
				icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartColumn, { size: 15 })
			}
		]
	},
	{
		group: "Simulation",
		items: [
			{
				to: "/v2/hourly",
				label: "Hour by hour",
				icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartLine, { size: 15 })
			},
			{
				to: "/v2/compare",
				label: "Compare presets",
				icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SlidersHorizontal, { size: 15 })
			},
			{
				to: "/v2/presets",
				label: "Presets",
				icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bookmark, { size: 15 })
			}
		]
	},
	{
		group: "Execution",
		items: [{
			to: "/v2/trading",
			label: "Paper & Live",
			icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Wallet, { size: 15 })
		}, {
			to: "/v2/market",
			label: "Market",
			icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Store, { size: 15 })
		}]
	},
	{
		group: "System",
		items: [{
			to: "/v2/engine",
			label: "Engine",
			icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Cpu, { size: 15 })
		}, {
			to: "/v2/settings",
			label: "Settings",
			icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Settings2, { size: 15 })
		}]
	}
];
function readPref(k, allowed, d) {
	try {
		const v = localStorage.getItem(k);
		return v && allowed.includes(v) ? v : d;
	} catch {
		return d;
	}
}
function writePref(k, v) {
	try {
		localStorage.setItem(k, v);
	} catch {}
}
function V2Shell() {
	const [design, setDesign] = (0, import_react.useState)("graphite");
	const [density, setDensity] = (0, import_react.useState)("comfortable");
	const [open, setOpen] = (0, import_react.useState)(false);
	const [ready, setReady] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => setReady(true), []);
	(0, import_react.useEffect)(() => {
		setDesign(readPref("cts-v2-design", [
			"studio",
			"graphite",
			"terminal",
			"aurora"
		], "graphite"));
		setDensity(readPref("cts-v2-density", ["comfortable", "compact"], "comfortable"));
	}, []);
	const path = useRouterState({ select: (s) => s.location.pathname });
	(0, import_react.useEffect)(() => setOpen(false), [path]);
	const { data, error } = usePoll(() => coreStatus(), 3e3);
	const st = data;
	const title = NAV.flatMap((g) => g.items).find((i) => i.exact ? path === i.to || path === `${i.to}/` : path.startsWith(i.to))?.label ?? "Core v2";
	const stateKind = st?.state === "error" ? "bad" : st?.state === "running" || st?.state === "computing" ? "ok" : void 0;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "v2",
		"data-design": design,
		"data-density": density,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "v2-shell",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("nav", {
					className: "v2-nav",
					"data-open": open,
					"aria-label": "Core v2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "v2-brand",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Activity, {
							size: 18,
							color: "var(--v-accent)"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							"CTS-A-O",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "v2 · honest walk-forward" })
						] })]
					}), NAV.map((g) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "v2-nav-group",
						children: g.group
					}), g.items.map((i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
						to: i.to,
						activeOptions: { exact: !!i.exact },
						children: [i.icon, i.label]
					}, i.to))] }, g.group))]
				}),
				open && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "v2-nav-backdrop",
					onClick: () => setOpen(false),
					"aria-hidden": true
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "v2-main",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
						className: "v2-top",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "v2-btn v2-mobile-toggle",
								"aria-label": "Menu",
								"aria-expanded": open,
								disabled: !ready,
								onClick: () => setOpen((o) => !o),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Menu, { size: 15 })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: title }),
							error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pill, {
								kind: "bad",
								children: "server unreachable"
							}),
							st && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Pill, {
									kind: stateKind,
									children: [st.state, st.state === "computing" || st.state === "backfill" ? ` · ${st.stage} ${Math.round(st.progress * 100)}%` : ""]
								}),
								st.pending && st.state !== "computing" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pill, {
									kind: "acc",
									children: "compute queued"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pill, { children: st.source }),
								st.live && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Pill, {
									kind: "bad",
									children: ["live ", liveState(st.live, st.liveStatus).label]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "v2-muted",
									style: { fontSize: "var(--v-fs-xs)" },
									children: [
										"bar ",
										fmt.time(st.lastBarT),
										" · ",
										st.symbols,
										" sym"
									]
								})
							] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
								className: "v2-select",
								"aria-label": "Design",
								value: design,
								onChange: (e) => {
									const v = e.target.value;
									setDesign(v);
									writePref("cts-v2-design", v);
								},
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "studio",
										children: "Studio · light"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "graphite",
										children: "Graphite · dark"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "terminal",
										children: "Terminal · mono"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "aurora",
										children: "Aurora · deep"
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Seg, {
								label: "Density",
								value: density,
								options: [{
									value: "comfortable",
									label: "Aa"
								}, {
									value: "compact",
									label: "compact"
								}],
								onChange: (v) => {
									setDensity(v);
									writePref("cts-v2-density", v);
								}
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
						className: "v2-content",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {})
					})]
				})
			]
		})
	});
}
var SplitComponent = V2Shell;
//#endregion
export { SplitComponent as component };
