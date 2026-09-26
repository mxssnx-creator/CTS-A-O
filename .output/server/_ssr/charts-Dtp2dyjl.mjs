import { i as __toESM } from "../_runtime.mjs";
import { H as require_react, x as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/charts-Dtp2dyjl.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var SERIES = [
	"var(--v-s1)",
	"var(--v-s2)",
	"var(--v-s3)",
	"var(--v-s4)",
	"var(--v-s5)",
	"var(--v-s6)",
	"var(--v-s7)",
	"var(--v-s8)"
];
/** Diverging fill around a neutral value (PF 1 → grey). */
function divergeFill(v, neutral = 1, span = 1) {
	if (!Number.isFinite(v)) return "var(--v-grid)";
	const d = Math.max(-1, Math.min(1, (v - neutral) / span));
	const pct = Math.round(Math.abs(d) * 85 + 10);
	return `color-mix(in srgb, ${d >= 0 ? "var(--v-up)" : "var(--v-down)"} ${pct}%, var(--v-grid))`;
}
function useTip() {
	const [tip, setTip] = (0, import_react.useState)(null);
	return {
		el: tip ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "v2-tip",
			style: {
				left: Math.min(tip.x + 12, (typeof window !== "undefined" ? window.innerWidth : 1200) - 220),
				top: tip.y + 12
			},
			children: tip.c
		}) : null,
		show: (e, c) => setTip({
			x: e.clientX,
			y: e.clientY,
			c
		}),
		hide: () => setTip(null)
	};
}
var arcPath = (cx, cy, r, a0, a1) => {
	const p = (a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
	const [x0, y0] = p(a0);
	const [x1, y1] = p(a1);
	return `M ${x0} ${y0} A ${r} ${r} 0 ${Math.abs(a1 - a0) > Math.PI ? 1 : 0} ${a1 > a0 ? 1 : 0} ${x1} ${y1}`;
};
/** Concentric multi-arc gauge (270° sweep). */
function MultiArcGauge(props) {
	const size = props.size ?? 200;
	const c = size / 2;
	const stroke = Math.max(6, Math.min(12, size / 18));
	const gap = stroke + 4;
	const a0 = Math.PI * .75;
	const sweep = Math.PI * 1.5;
	const tip = useTip();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		style: {
			display: "flex",
			gap: 14,
			alignItems: "center",
			flexWrap: "wrap"
		},
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
				className: "v2-chart",
				viewBox: `0 0 ${size} ${size}`,
				style: {
					width: size,
					maxWidth: "100%"
				},
				role: "img",
				"aria-label": props.rings.map((r) => `${r.label} ${r.display}`).join(", "),
				children: [
					props.rings.map((r, i) => {
						const rad = c - stroke / 2 - 2 - i * gap;
						if (rad <= stroke) return null;
						const v = Math.max(0, Math.min(1, r.value));
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("g", {
							onMouseMove: (e) => tip.show(e, /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: r.label }),
								" ",
								r.display
							] })),
							onMouseLeave: tip.hide,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
								d: arcPath(c, c, rad, a0, a0 + sweep),
								stroke: "var(--v-grid)",
								strokeWidth: stroke,
								fill: "none",
								strokeLinecap: "round"
							}), v > .002 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
								d: arcPath(c, c, rad, a0, a0 + sweep * v),
								stroke: r.color ?? SERIES[i % SERIES.length],
								strokeWidth: stroke,
								fill: "none",
								strokeLinecap: "round"
							})]
						}, r.label);
					}),
					props.center && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
						x: c,
						y: c + 2,
						textAnchor: "middle",
						style: {
							fontSize: size / 7,
							fontWeight: 700,
							fill: "var(--v-text)"
						},
						children: props.center
					}),
					props.centerSub && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
						x: c,
						y: c + size / 9,
						textAnchor: "middle",
						children: props.centerSub
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "v2-lines",
				style: {
					minWidth: 150,
					flex: 1
				},
				children: props.rings.map((r, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "v2-line",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { style: {
						display: "inline-block",
						width: 9,
						height: 9,
						borderRadius: 3,
						marginRight: 6,
						background: r.color ?? SERIES[i % SERIES.length]
					} }), r.label] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						style: { fontWeight: 600 },
						children: r.display
					})]
				}, r.label))
			}),
			tip.el
		]
	});
}
/** Radial hour bars: each hour is an arc wedge; profit grows outward (up), loss inward (down). */
function RadialHours(props) {
	const size = props.size ?? 260;
	const c = size / 2;
	const r0 = size * .28;
	const rMax = size * .2;
	const hs = props.hours;
	const maxAbs = Math.max(.01, ...hs.map((h) => Math.abs(h.net)));
	const tip = useTip();
	const n = Math.max(hs.length, 1);
	const green = hs.filter((h) => h.net > 0).length;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		className: "v2-chart",
		viewBox: `0 0 ${size} ${size}`,
		style: {
			width: size,
			maxWidth: "100%",
			margin: "0 auto"
		},
		role: "img",
		"aria-label": `${props.label ?? "Hourly net"}: ${green} of ${hs.length} hours positive`,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
				cx: c,
				cy: c,
				r: r0,
				fill: "none",
				stroke: "var(--v-border-strong)",
				strokeWidth: 1
			}),
			hs.map((h, i) => {
				const a0 = -Math.PI / 2 + i / n * Math.PI * 2 + .01;
				const a1 = -Math.PI / 2 + (i + 1) / n * Math.PI * 2 - .01;
				const len = Math.abs(h.net) / maxAbs * rMax;
				const r1 = h.net >= 0 ? r0 + Math.max(1.5, len) : r0 - Math.max(1.5, Math.min(len * .5, r0 * .3));
				const inner = Math.min(r0, r1);
				const outer = Math.max(r0, r1);
				const p = (r, a) => `${c + r * Math.cos(a)} ${c + r * Math.sin(a)}`;
				const d = `M ${p(inner, a0)} L ${p(outer, a0)} A ${outer} ${outer} 0 0 1 ${p(outer, a1)} L ${p(inner, a1)} A ${inner} ${inner} 0 0 0 ${p(inner, a0)} Z`;
				return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
					d,
					style: { fill: h.net >= 0 ? "var(--v-up)" : "var(--v-down)" },
					opacity: h.n ? .9 : .25,
					onMouseMove: (e) => tip.show(e, /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
						new Date(h.t).toISOString().slice(5, 13).replace("T", " "),
						":00 · ",
						h.n,
						" closes · PF ",
						h.pf.toFixed(2),
						" · net ",
						h.net >= 0 ? "+" : "",
						h.net.toFixed(2),
						"%"
					] })),
					onMouseLeave: tip.hide
				}, h.t);
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
				x: c,
				y: c - 2,
				textAnchor: "middle",
				style: {
					fontSize: size / 9,
					fontWeight: 700,
					fill: "var(--v-text)"
				},
				children: hs.length ? `${Math.round(green / hs.length * 100)}%` : "–"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("text", {
				x: c,
				y: c + size / 14,
				textAnchor: "middle",
				children: [
					"green hours ",
					green,
					"/",
					hs.length
				]
			})
		]
	}), tip.el] });
}
/** Time-series line with shaded drawdown-time spans and a crosshair tooltip. */
function EquityChart(props) {
	const W = 720;
	const H = props.height ?? 220;
	const pad = {
		l: 44,
		r: 10,
		t: 10,
		b: 22
	};
	const all = props.series.flatMap((s) => s.points);
	const ref = (0, import_react.useRef)(null);
	const [hx, setHx] = (0, import_react.useState)(null);
	const dom = (0, import_react.useMemo)(() => {
		if (!all.length) return null;
		let t0 = Infinity, t1 = -Infinity, v0 = 0, v1 = 0;
		for (const p of all) {
			t0 = Math.min(t0, p.t);
			t1 = Math.max(t1, p.t);
			v0 = Math.min(v0, p.v);
			v1 = Math.max(v1, p.v);
		}
		if (t1 === t0) t1 = t0 + 1;
		if (v1 === v0) v1 = v0 + 1;
		const padV = (v1 - v0) * .08;
		return {
			t0,
			t1,
			v0: v0 - padV,
			v1: v1 + padV
		};
	}, [all]);
	if (!dom) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "v2-empty",
		children: "No closes yet"
	});
	const x = (t) => pad.l + (t - dom.t0) / (dom.t1 - dom.t0) * (W - pad.l - pad.r);
	const y = (v) => pad.t + (1 - (v - dom.v0) / (dom.v1 - dom.v0)) * (H - pad.t - pad.b);
	const ticks = 4;
	const yt = Array.from({ length: 5 }, (_, i) => dom.v0 + (dom.v1 - dom.v0) * i / ticks);
	const xt = Array.from({ length: 5 }, (_, i) => dom.t0 + (dom.t1 - dom.t0) * i / 4);
	const onMove = (e) => {
		const r = ref.current?.getBoundingClientRect();
		if (!r) return;
		const px = (e.clientX - r.left) / r.width * W;
		setHx(dom.t0 + (px - pad.l) / (W - pad.l - pad.r) * (dom.t1 - dom.t0));
	};
	const near = hx === null ? null : props.series.map((s) => {
		let best = s.points[0];
		for (const p of s.points) if (Math.abs(p.t - hx) < Math.abs(best.t - hx)) best = p;
		return {
			s,
			p: best
		};
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		style: { position: "relative" },
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
				ref,
				className: "v2-chart",
				viewBox: `0 0 ${W} ${H}`,
				onMouseMove: onMove,
				onMouseLeave: () => setHx(null),
				role: "img",
				"aria-label": "Cumulative net curve",
				children: [
					(props.ddSpans ?? []).map(([a, b], i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
						x: x(a),
						y: pad.t,
						width: Math.max(1, x(b) - x(a)),
						height: H - pad.t - pad.b,
						style: { fill: "color-mix(in srgb, var(--v-down) 10%, transparent)" }
					}, i)),
					yt.map((v, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("g", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
						x1: pad.l,
						x2: W - pad.r,
						y1: y(v),
						y2: y(v),
						stroke: "var(--v-grid)"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("text", {
						x: pad.l - 6,
						y: y(v) + 3,
						textAnchor: "end",
						children: [v.toFixed(Math.abs(dom.v1 - dom.v0) < 5 ? 1 : 0), props.unit ?? ""]
					})] }, i)),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
						x1: pad.l,
						x2: W - pad.r,
						y1: y(0),
						y2: y(0),
						stroke: "var(--v-border-strong)"
					}),
					xt.map((t, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("text", {
						x: x(t),
						y: H - 6,
						textAnchor: i === 0 ? "start" : i === 4 ? "end" : "middle",
						children: [new Date(t).toISOString().slice(5, 13).replace("T", " "), "h"]
					}, i)),
					props.series.map((s, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("polyline", {
						fill: "none",
						stroke: s.color ?? SERIES[i % SERIES.length],
						strokeWidth: 2,
						strokeLinejoin: "round",
						points: s.points.map((p) => `${x(p.t)},${y(p.v)}`).join(" ")
					}, s.name)),
					near && hx !== null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
						x1: x(near[0].p.t),
						x2: x(near[0].p.t),
						y1: pad.t,
						y2: H - pad.b,
						stroke: "var(--v-border-strong)",
						strokeDasharray: "3 3"
					}), near.map(({ s, p }, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
						cx: x(p.t),
						cy: y(p.v),
						r: 4,
						fill: s.color ?? SERIES[i % SERIES.length],
						stroke: "var(--v-surface)",
						strokeWidth: 2
					}, s.name))] })
				]
			}),
			near && hx !== null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "v2-tip",
				style: {
					position: "absolute",
					left: `${Math.min(80, x(near[0].p.t) / W * 100)}%`,
					top: 4
				},
				children: [new Date(near[0].p.t).toISOString().slice(5, 16).replace("T", " "), near.map(({ s, p }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					s.name,
					": ",
					p.v >= 0 ? "+" : "",
					p.v.toFixed(2),
					props.unit ?? ""
				] }, s.name))]
			}),
			props.series.length > 1 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "v2-legend",
				style: { marginTop: 6 },
				children: props.series.map((s, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { style: { background: s.color ?? SERIES[i % SERIES.length] } }), s.name] }, s.name))
			})
		]
	});
}
/** Signed bars per bucket (e.g. hour): positive up, negative down from a zero baseline. */
function SignedBars(props) {
	const W = 720;
	const H = props.height ?? 150;
	const pad = {
		l: 40,
		r: 6,
		t: 8,
		b: 16
	};
	const tip = useTip();
	const max = Math.max(.01, ...props.data.map((d) => Math.abs(d.v)));
	const n = Math.max(1, props.data.length);
	const bw = (W - pad.l - pad.r) / n;
	const y0 = pad.t + (H - pad.t - pad.b) / 2;
	const sc = (H - pad.t - pad.b) / 2 / max;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		className: "v2-chart",
		viewBox: `0 0 ${W} ${H}`,
		role: "img",
		"aria-label": "Signed bars",
		children: [
			[
				max,
				max / 2,
				0,
				-max / 2,
				-max
			].map((v, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("g", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
				x1: pad.l,
				x2: W - pad.r,
				y1: y0 - v * sc,
				y2: y0 - v * sc,
				stroke: v === 0 ? "var(--v-border-strong)" : "var(--v-grid)"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("text", {
				x: pad.l - 5,
				y: y0 - v * sc + 3,
				textAnchor: "end",
				children: [v.toFixed(max < 5 ? 1 : 0), props.unit ?? ""]
			})] }, i)),
			props.data.map((d, i) => {
				const h = Math.max(1, Math.abs(d.v) * sc);
				return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
					x: pad.l + i * bw + Math.min(2, bw * .15),
					width: Math.max(1, bw - Math.min(4, bw * .3)),
					y: d.v >= 0 ? y0 - h : y0,
					height: h,
					rx: Math.min(3, bw / 4),
					style: { fill: d.v >= 0 ? "var(--v-up)" : "var(--v-down)" },
					onMouseMove: (e) => tip.show(e, d.tip ?? `${d.k}: ${d.v.toFixed(2)}${props.unit ?? ""}`),
					onMouseLeave: tip.hide
				}, i);
			}),
			props.data.length > 0 && [.../* @__PURE__ */ new Set([
				0,
				Math.floor(n / 2),
				n - 1
			])].map((i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
				x: pad.l + i * bw + bw / 2,
				y: H - 3,
				textAnchor: "middle",
				children: props.data[i]?.k
			}, `t${i}`))
		]
	}), tip.el] });
}
/** Arc diagram: bots and indications on one baseline, arcs weighted by trade count and colored by PF. */
function ArcDiagram(props) {
	const W = 760;
	const H = 340;
	const base = 256;
	const nodes = [...props.left, ...props.right];
	const gapMid = 30;
	const step = 690 / Math.max(1, nodes.length - 1);
	const pos = /* @__PURE__ */ new Map();
	nodes.forEach((n, i) => pos.set(n, 20 + i * step + (i >= props.left.length ? gapMid : 0)));
	const maxW = Math.max(1, ...props.links.map((l) => l.w));
	const tip = useTip();
	const [hover, setHover] = (0, import_react.useState)(null);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
			className: "v2-chart",
			viewBox: `0 0 ${W} ${H}`,
			role: "img",
			"aria-label": "Bot to indication relations",
			children: [props.links.map((l, i) => {
				const x0 = pos.get(l.a);
				const x1 = pos.get(l.b);
				if (x0 === void 0 || x1 === void 0) return null;
				const r = Math.abs(x1 - x0) / 2;
				const on = !hover || hover === l.a || hover === l.b;
				return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
					d: `M ${x0} ${base} A ${r} ${Math.min(r, 246)} 0 0 1 ${x1} ${base}`,
					fill: "none",
					style: { stroke: divergeFill(l.pf, 1, .6) },
					strokeWidth: 1 + l.w / maxW * 5,
					opacity: on ? .85 : .08,
					onMouseMove: (e) => tip.show(e, l.tip ?? `${l.a} × ${l.b} · PF ${l.pf.toFixed(2)} · n ${l.w}`),
					onMouseLeave: tip.hide
				}, i);
			}), nodes.map((n, i) => {
				const x = pos.get(n);
				const isBot = i < props.left.length;
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("g", {
					onMouseEnter: () => setHover(n),
					onMouseLeave: () => setHover(null),
					style: { cursor: "default" },
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
						cx: x,
						cy: base,
						r: isBot ? 5 : 3.5,
						fill: isBot ? "var(--v-accent)" : "var(--v-text-3)",
						stroke: "var(--v-surface)",
						strokeWidth: 2
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
						x,
						y: 268,
						textAnchor: "end",
						transform: `rotate(-50 ${x} 268)`,
						style: {
							fill: isBot ? "var(--v-text)" : "var(--v-text-3)",
							fontWeight: isBot ? 600 : 400
						},
						children: n
					})]
				}, n);
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "v2-legend",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { style: { background: divergeFill(.4, 1, .6) } }), "PF < 1"] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { style: { background: "var(--v-grid)" } }), "PF ≈ 1"] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { style: { background: divergeFill(1.6, 1, .6) } }), "PF > 1"] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "v2-muted",
					children: "width = trade count · hover a node to isolate"
				})
			]
		}),
		tip.el
	] });
}
/** Heat grid (rows × cols), diverging around a neutral value. */
function HeatGrid(props) {
	const tip = useTip();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		style: { overflowX: "auto" },
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
			className: "v2-table",
			style: { width: "auto" },
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {}), props.cols.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
				style: {
					writingMode: "vertical-rl",
					transform: "rotate(180deg)",
					height: 96,
					padding: "4px 0",
					textTransform: "none"
				},
				children: c
			}, c))] }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: props.rows.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
				style: { fontWeight: 600 },
				children: r
			}), props.cols.map((c) => {
				const x = props.cell(r, c);
				return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
					style: { padding: 1 },
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						onClick: () => x && props.onPick?.(r, c),
						onMouseMove: (e) => x && tip.show(e, x.tip),
						onMouseLeave: tip.hide,
						style: {
							width: 16,
							height: 16,
							borderRadius: 3,
							background: x ? divergeFill(x.v, props.neutral ?? 1, .6) : "transparent",
							border: x ? "none" : "1px dashed var(--v-grid)",
							cursor: x && props.onPick ? "pointer" : "default"
						}
					})
				}, c);
			})] }, r)) })]
		}), tip.el]
	});
}
function Sparkline(props) {
	const w = props.width ?? 110;
	const h = props.height ?? 24;
	const v = props.values;
	if (v.length < 2) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: "v2-muted",
		children: "–"
	});
	const lo = Math.min(...v);
	const hi = Math.max(...v);
	const up = v[v.length - 1] >= v[0];
	const pts = v.map((x, i) => `${i / (v.length - 1) * w},${h - 2 - (x - lo) / (hi - lo || 1) * (h - 4)}`).join(" ");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", {
		width: w,
		height: h,
		viewBox: `0 0 ${w} ${h}`,
		"aria-hidden": true,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("polyline", {
			points: pts,
			fill: "none",
			stroke: up ? "var(--v-up)" : "var(--v-down)",
			strokeWidth: 1.5
		})
	});
}
/** Line of a metric per N (e.g. PF in-sample vs out-of-sample per last-N). */
function NCurve(props) {
	const W = 520;
	const H = 180;
	const pad = {
		l: 36,
		r: 8,
		t: 8,
		b: 20
	};
	const all = props.series.flatMap((s) => s.points);
	if (!all.length) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "v2-empty",
		children: "No last-N rows"
	});
	const ns = [...new Set(all.map((p) => p.n))].sort((a, b) => a - b);
	const v0 = Math.min(0, ...all.map((p) => p.v));
	const v1 = Math.max(props.neutral ?? 1, ...all.map((p) => p.v)) * 1.08;
	const x = (n) => pad.l + ns.indexOf(n) / Math.max(1, ns.length - 1) * (W - pad.l - pad.r);
	const y = (v) => pad.t + (1 - (v - v0) / (v1 - v0 || 1)) * (H - pad.t - pad.b);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		className: "v2-chart",
		viewBox: `0 0 ${W} ${H}`,
		role: "img",
		"aria-label": "Metric per last-N",
		children: [
			props.neutral !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
				x1: pad.l,
				x2: W - pad.r,
				y1: y(props.neutral),
				y2: y(props.neutral),
				stroke: "var(--v-border-strong)",
				strokeDasharray: "4 3"
			}),
			props.best !== void 0 && ns.includes(props.best) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
				x1: x(props.best),
				x2: x(props.best),
				y1: pad.t,
				y2: H - pad.b,
				stroke: "var(--v-accent)",
				strokeDasharray: "2 3"
			}),
			[
				v0,
				(v0 + v1) / 2,
				v1
			].map((v, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
				x: pad.l - 5,
				y: y(v) + 3,
				textAnchor: "end",
				children: v.toFixed(1)
			}, i)),
			ns.map((n) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
				x: x(n),
				y: 175,
				textAnchor: "middle",
				children: n === 0 ? "all" : n
			}, n)),
			props.series.map((s, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("g", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("polyline", {
				fill: "none",
				stroke: SERIES[i],
				strokeWidth: 2,
				points: s.points.map((p) => `${x(p.n)},${y(p.v)}`).join(" ")
			}), s.points.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
				cx: x(p.n),
				cy: y(p.v),
				r: 3.5,
				fill: SERIES[i],
				stroke: "var(--v-surface)",
				strokeWidth: 1.5,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("title", { children: [
					s.name,
					" N ",
					p.n,
					": ",
					p.v.toFixed(2)
				] })
			}, p.n))] }, s.name))
		]
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "v2-legend",
		children: props.series.map((s, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { style: { background: SERIES[i] } }), s.name] }, s.name))
	})] });
}
/** Segmented arc (share of a whole) — e.g. orders by sub-strategy. */
function ArcShare(props) {
	const size = props.size ?? 150;
	const c = size / 2;
	const r = c - 10;
	const total = props.parts.reduce((a, p) => a + Math.max(0, p.value), 0);
	let a = -Math.PI / 2;
	const tip = useTip();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		style: {
			display: "flex",
			gap: 12,
			alignItems: "center",
			flexWrap: "wrap"
		},
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
				className: "v2-chart",
				viewBox: `0 0 ${size} ${size}`,
				style: { width: size },
				role: "img",
				"aria-label": props.parts.map((p) => `${p.label} ${p.value}`).join(", "),
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
						cx: c,
						cy: c,
						r,
						fill: "none",
						stroke: "var(--v-grid)",
						strokeWidth: 12
					}),
					total > 0 && props.parts.map((p, i) => {
						const sw = Math.max(0, p.value) / total * Math.PI * 2;
						const a0 = a + .03;
						const a1 = a + sw - .03;
						a += sw;
						if (a1 <= a0) return null;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
							d: arcPath(c, c, r, a0, a1),
							stroke: SERIES[i % SERIES.length],
							strokeWidth: 12,
							fill: "none",
							strokeLinecap: "round",
							onMouseMove: (e) => tip.show(e, `${p.label}: ${p.value} (${Math.round(p.value / total * 100)}%)`),
							onMouseLeave: tip.hide
						}, p.label);
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
						x: c,
						y: c + 5,
						textAnchor: "middle",
						style: {
							fontSize: size / 7,
							fontWeight: 700,
							fill: "var(--v-text)"
						},
						children: props.center ?? total
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "v2-legend",
				style: {
					flexDirection: "column",
					gap: 4
				},
				children: props.parts.map((p, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { style: { background: SERIES[i % SERIES.length] } }),
					p.label,
					" · ",
					p.value
				] }, p.label))
			}),
			tip.el
		]
	});
}
//#endregion
export { MultiArcGauge as a, SERIES as c, HeatGrid as i, SignedBars as l, ArcShare as n, NCurve as o, EquityChart as r, RadialHours as s, ArcDiagram as t, Sparkline as u };
