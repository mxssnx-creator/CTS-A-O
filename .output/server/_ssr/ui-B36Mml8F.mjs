import { i as __toESM } from "../_runtime.mjs";
import { H as require_react, x as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as TSS_SERVER_FUNCTION, r as getServerFnById, t as createServerFn } from "./ssr.mjs";
import { n as checkSettings } from "./settings-check-Bcofhpy4.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/ui-B36Mml8F.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
/** Server-function payloads must be serializable; this also strips typed arrays and undefined. */
/** Base-stage rows: stage 1, plus the Base-protect variant of pairs refined in Main (stored as stage ≥ 2). */
/** Light status for the header (polled often). */
var coreStatus = createServerFn({ method: "GET" }).handler(createSsrRpc("eb7aec91bc180eef0ec4436cae28e2ecb4953d45f3b32e18476e82ea68ffd427"));
var coreOverview = createServerFn({ method: "GET" }).handler(createSsrRpc("32d99862dc108331f6ed91e05656d7f5818b34bb848fe1e329bbbcd7b240bbdf"));
/** Per timeframe lane: Base evaluated / passed, Main tapes, simulated trades (n, PF, net), open paper positions. */
var coreResults = createServerFn({ method: "GET" }).validator((d) => {
	if (d?.lane !== void 0 && d.lane !== "" && !/^(1|5|15|30)c?$/.test(d.lane)) throw new Error("lane: 1, 5, 15 or 30, optionally combined (c)");
	return d ?? {};
}).handler(createSsrRpc("7474d478cfbef3775c443f51a80c413ac2aa553145604fe15144bd68b85b107d"));
/** Bot × indication matrix from the Base stage (best stage-1 result per pair). */
var coreMatrix = createServerFn({ method: "GET" }).handler(createSsrRpc("9d243d5d274c25d3ab7a59e28a37885e4fa4588c25dde9730ccbe561b8e78e1a"));
var coreConfig = createServerFn({ method: "GET" }).validator((d) => {
	if (!d?.id) throw new Error("id required");
	return d;
}).handler(createSsrRpc("51209c6f7a6ee36c665fd2316278688b46b2a5ab9a4ad8cb8345e22c6d01a156"));
var coreSim = createServerFn({ method: "GET" }).handler(createSsrRpc("189517c95f4b7ef12db13945ff1ccb1fdee09cf26dd5486a82cff17d70579451"));
/** latest paper closes listed on the Trading page */
var coreTrading = createServerFn({ method: "GET" }).handler(createSsrRpc("ae76160d672121092847c837d3f2c2772b3e68f39dc3541ac32117230ed8baf2"));
/**
* The Overall control positions the current paper book asks for (shown even while Live is off): the same sizing
* as the live step (unit from the last equity read, else the paper balance; position mode; exchange minimum).
*/
var coreMarket = createServerFn({ method: "GET" }).handler(createSsrRpc("14875743c503a48bd4dddbc331bd72052883a9c9bfac81a4344991265f037327"));
var coreEngine = createServerFn({ method: "GET" }).handler(createSsrRpc("7f495d939966c14ab587b59207c7621b93af3f6b7659297e4bfa4a5ad3d49ac8"));
var coreSettings = createServerFn({ method: "GET" }).handler(createSsrRpc("b64d3fb997da74665ad1595b54ca2964e608c581687ca75bbf44e3184e712bd3"));
var saveCoreSettings = createServerFn({ method: "POST" }).validator((d) => {
	if (!d || typeof d !== "object") throw new Error("invalid");
	checkSettings(d.settings ?? {});
	return d;
}).handler(createSsrRpc("a63309d43925369161614e5f8884c831dc9aa0328ae152fc0321ab640ece2695"));
/** Research presets (fixed, measured) + presets saved from the engine, with their results. */
var corePresets = createServerFn({ method: "GET" }).handler(createSsrRpc("da8c934705c19ef0981360deb820bd099ccd19f8d0065a3ece23b603ab8d475c"));
var presetAction = createServerFn({ method: "POST" }).validator((d) => {
	if (!d || ![
		"save",
		"apply",
		"delete",
		"backtest",
		"update"
	].includes(d.action)) throw new Error("bad action");
	if (d.action === "update") {
		if (!d.settings || typeof d.settings !== "object") throw new Error("settings required");
		if ("live" in d.settings) throw new Error("a preset never carries the Live stage");
		checkSettings(d.settings);
	}
	if (d.action === "backtest" && (typeof d.days !== "number" || !Number.isInteger(d.days) || d.days < 1 || d.days > 12)) throw new Error("days: 1–12");
	if (d.action !== "save" && (typeof d.id !== "string" || d.id.length > 120)) throw new Error("preset id required");
	if (d.label !== void 0 && (typeof d.label !== "string" || d.label.length > 80)) throw new Error("label: up to 80 characters");
	if (d.info !== void 0 && (typeof d.info !== "string" || d.info.length > 400)) throw new Error("info: up to 400 characters");
	return d;
}).handler(createSsrRpc("498484c8cfd025a3da3efd6da82d7f9f5dcb0eff0eb697aff3cf16fbfb1c8329"));
var coreControl = createServerFn({ method: "POST" }).validator((d) => {
	if (![
		"start",
		"stop",
		"recompute",
		"resync"
	].includes(d?.action)) throw new Error("bad action");
	return d;
}).handler(createSsrRpc("f71eacfb6360cc1cb25f4528304995eb4f1d9eab184b9b470101f3829e75b782"));
/**
* Poll a server function; data is replaced in place (no reload, no scroll jump).
* - never more than one request in flight (a slow server is not flooded)
* - responses from an older dependency set are dropped (no stale overwrite after a filter change)
* - pauses while the tab is hidden; backs off on errors
*/
function usePoll(fn, ms, deps = []) {
	const [data, setData] = (0, import_react.useState)(null);
	const [error, setError] = (0, import_react.useState)(null);
	const [loading, setLoading] = (0, import_react.useState)(true);
	const fnRef = (0, import_react.useRef)(fn);
	fnRef.current = fn;
	const epoch = (0, import_react.useRef)(0);
	const inFlight = (0, import_react.useRef)(false);
	const fails = (0, import_react.useRef)(0);
	const seq = (0, import_react.useRef)(0);
	const applied = (0, import_react.useRef)(0);
	const run = (0, import_react.useCallback)(async (force = false) => {
		if (inFlight.current && !force) return;
		const my = epoch.current;
		const n = ++seq.current;
		inFlight.current = true;
		try {
			const d = await fnRef.current();
			if (my !== epoch.current || n < applied.current) return;
			applied.current = n;
			fails.current = 0;
			setData(d);
			setError(null);
		} catch (e) {
			if (my !== epoch.current || n < applied.current) return;
			fails.current++;
			setError(e instanceof Error ? e.message : String(e));
		} finally {
			if (my === epoch.current && n === seq.current) {
				inFlight.current = false;
				setLoading(false);
			}
		}
	}, []);
	(0, import_react.useEffect)(() => {
		epoch.current++;
		inFlight.current = false;
		setLoading(true);
		run(true);
		let timer;
		const tick = () => {
			const wait = ms * Math.min(8, 2 ** fails.current);
			timer = setTimeout(() => {
				if (typeof document === "undefined" || document.visibilityState === "visible") run();
				tick();
			}, wait);
		};
		tick();
		const onVis = () => document.visibilityState === "visible" && void run();
		document.addEventListener("visibilitychange", onVis);
		return () => {
			epoch.current++;
			clearTimeout(timer);
			document.removeEventListener("visibilitychange", onVis);
		};
	}, [
		ms,
		run,
		...deps
	]);
	return {
		data,
		error,
		refresh: () => void run(true),
		loading
	};
}
/** Debounced copy of a value (typing in filters does not fire a request per key). */
function useDebounced(value, ms = 300) {
	const [v, setV] = (0, import_react.useState)(value);
	(0, import_react.useEffect)(() => {
		const id = setTimeout(() => setV(value), ms);
		return () => clearTimeout(id);
	}, [value, ms]);
	return v;
}
/** Accessible confirm dialog. Escape / backdrop cancel. Focus moves in ONCE when it opens — onto Cancel for a
*  dangerous action, onto the confirm button otherwise — and is never pulled back on re-renders. */
function Confirm(props) {
	const btn = (0, import_react.useRef)(null);
	const cancelBtn = (0, import_react.useRef)(null);
	const cancelRef = (0, import_react.useRef)(props.onCancel);
	cancelRef.current = props.onCancel;
	const { open, danger } = props;
	(0, import_react.useEffect)(() => {
		if (!open) return;
		(danger ? cancelBtn : btn).current?.focus();
		const onKey = (e) => e.key === "Escape" && cancelRef.current();
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [open, danger]);
	if (!props.open) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "v2-dialog-backdrop",
		onClick: props.onCancel,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "v2-dialog",
			role: "dialog",
			"aria-modal": "true",
			"aria-labelledby": "v2-dialog-title",
			onClick: (e) => e.stopPropagation(),
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					id: "v2-dialog-title",
					children: props.title
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "v2-dialog-body",
					children: props.body
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "v2-dialog-actions",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						ref: cancelBtn,
						type: "button",
						className: "v2-btn",
						onClick: props.onCancel,
						children: "Cancel"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						ref: btn,
						type: "button",
						className: `v2-btn ${props.danger ? "danger" : "primary"}`,
						onClick: props.onConfirm,
						children: props.confirm
					})]
				})
			]
		})
	});
}
var fmt = {
	pf: (x) => typeof x === "number" && Number.isFinite(x) ? x.toFixed(2) : "–",
	pct: (x, d = 2) => typeof x === "number" && Number.isFinite(x) ? `${x >= 0 ? "+" : ""}${x.toFixed(d)}%` : "–",
	ratio: (x) => typeof x === "number" && Number.isFinite(x) ? `${Math.round(x * 100)}%` : "–",
	num: (x, d = 0) => typeof x === "number" && Number.isFinite(x) ? x.toLocaleString("en-US", {
		maximumFractionDigits: d,
		minimumFractionDigits: d
	}) : "–",
	usd: (x) => typeof x === "number" && Number.isFinite(x) ? `${x >= 0 ? "" : "−"}$${Math.abs(x).toFixed(2)}` : "–",
	h: (x) => typeof x === "number" && Number.isFinite(x) ? `${x.toFixed(1)}h` : "–",
	frac: (x) => typeof x === "number" && Number.isFinite(x) ? `${(x * 100).toFixed(2)}%` : "–",
	time: (t) => typeof t === "number" && t > 0 ? new Date(t).toISOString().slice(5, 16).replace("T", " ") : "–",
	hour: (t) => typeof t === "number" && t > 0 ? new Date(t).toISOString().slice(5, 13).replace("T", " ") + ":00" : "–",
	ago: (t) => {
		if (typeof t !== "number" || !t) return "–";
		const s = Math.max(0, Math.round((Date.now() - t) / 1e3));
		return s < 60 ? `${s}s ago` : s < 3600 ? `${Math.round(s / 60)}m ago` : `${(s / 3600).toFixed(1)}h ago`;
	},
	bytes: (x) => typeof x === "number" ? x > 1e6 ? `${(x / 1e6).toFixed(1)} MB` : `${(x / 1e3).toFixed(0)} kB` : "–"
};
var tone = (x, neutral = 0) => typeof x === "number" ? x > neutral ? "v2-up" : x < neutral ? "v2-down" : "" : "";
var pfTone = (x, min = 1.1) => typeof x === "number" ? x >= min ? "v2-up" : x >= 1 ? "v2-warn" : "v2-down" : "";
/**
* One representation of the Live stage everywhere: "on" when enabled in settings, plus the live step's reason
* ("blocked: …") while the step is not armed; "off" when disabled in settings.
*/
function liveState(enabled, status) {
	if (!enabled) return {
		on: false,
		label: "off",
		blocked: null
	};
	const blocked = status && status.enabled === false ? status.reason || "not armed" : null;
	return {
		on: true,
		label: blocked ? `on · blocked: ${blocked}` : "on",
		blocked
	};
}
function Panel(props) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: `v2-panel ${props.className ?? ""}`,
		children: [props.title !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
			className: "v2-panel-h",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: props.title }), props.sub && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: props.sub })] }), props.right && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "v2-right",
				children: props.right
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: `v2-panel-b ${props.flush ? "flush" : ""}`,
			children: props.children
		})]
	});
}
function Kpi(props) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "v2-panel v2-kpi",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "l",
				children: props.label
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: `v ${props.className ?? ""}`,
				children: props.value
			}),
			props.sub !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "s",
				children: props.sub
			})
		]
	});
}
function Pill(props) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: `v2-pill ${props.kind ?? ""}`,
		children: props.children
	});
}
function Seg(props) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "v2-seg",
		role: "group",
		"aria-label": props.label,
		children: props.options.map((o) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			type: "button",
			"aria-pressed": o.value === props.value,
			onClick: () => props.onChange(o.value),
			children: o.label
		}, String(o.value)))
	});
}
function Switch(props) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		role: "switch",
		"aria-label": props.label,
		"aria-checked": props.checked,
		disabled: props.disabled,
		className: "v2-switch",
		style: props.disabled ? {
			opacity: .6,
			cursor: "not-allowed"
		} : void 0,
		onClick: () => !props.disabled && props.onChange(!props.checked)
	});
}
function Line(props) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "v2-line",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: props.k }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: props.className,
			children: props.v
		})]
	});
}
function Empty(props) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "v2-empty",
		children: props.children
	});
}
function ErrorNote(props) {
	if (!props.error) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "v2-panel",
		style: {
			padding: 10,
			borderColor: "var(--v-down)"
		},
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
			className: "v2-down",
			children: ["Server: ", props.error]
		})
	});
}
function downloadFile(name, text, type = "application/json") {
	const blob = new Blob([text], { type });
	const a = document.createElement("a");
	a.href = URL.createObjectURL(blob);
	a.download = name;
	a.click();
	setTimeout(() => URL.revokeObjectURL(a.href), 1e3);
}
function toCsv(rows) {
	if (!rows.length) return "";
	const keys = Object.keys(rows[0]);
	const esc = (v) => {
		const s = v === null || v === void 0 ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
		return /[",\n]/.test(s) ? `"${s.replace(/"/g, "\"\"")}"` : s;
	};
	return [keys.join(","), ...rows.map((r) => keys.map((k) => esc(r[k])).join(","))].join("\n");
}
/** Large modal (settings editors). Escape closes; focus moves in once; the body scrolls. */
function Modal(props) {
	const box = (0, import_react.useRef)(null);
	const closeRef = (0, import_react.useRef)(props.onClose);
	closeRef.current = props.onClose;
	(0, import_react.useEffect)(() => {
		if (!props.open) return;
		box.current?.focus();
		const onKey = (e) => e.key === "Escape" && closeRef.current();
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [props.open]);
	if (!props.open) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "v2-dialog-backdrop",
		onClick: props.onClose,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			ref: box,
			tabIndex: -1,
			className: "v2-dialog",
			role: "dialog",
			"aria-modal": "true",
			"aria-labelledby": "v2-modal-title",
			style: {
				width: "min(960px, calc(100vw - 24px))",
				maxWidth: "none",
				maxHeight: "90vh",
				display: "flex",
				flexDirection: "column"
			},
			onClick: (e) => e.stopPropagation(),
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
					id: "v2-modal-title",
					style: {
						display: "flex",
						alignItems: "center",
						gap: 8
					},
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						style: { flex: 1 },
						children: props.title
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "v2-btn",
						"aria-label": "Close",
						onClick: props.onClose,
						children: "✕"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					style: {
						overflow: "auto",
						flex: 1,
						minHeight: 0,
						paddingRight: 4
					},
					children: props.children
				}),
				props.footer && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "v2-dialog-actions",
					children: props.footer
				})
			]
		})
	});
}
//#endregion
export { tone as A, downloadFile as C, presetAction as D, pfTone as E, usePoll as M, saveCoreSettings as O, coreTrading as S, liveState as T, corePresets as _, Line as a, coreSim as b, Pill as c, coreConfig as d, coreControl as f, coreOverview as g, coreMatrix as h, Kpi as i, useDebounced as j, toCsv as k, Seg as l, coreMarket as m, Empty as n, Modal as o, coreEngine as p, ErrorNote as r, Panel as s, Confirm as t, Switch as u, coreResults as v, fmt as w, coreStatus as x, coreSettings as y };
