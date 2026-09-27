//#region node_modules/.nitro/vite/services/ssr/assets/sizing-DzKTMogO.js
var DEFAULT_SIZING = {
	mode: "equityPct",
	pct: .02
};
function sizingSettings(s) {
	const mode = s?.mode === "fixed" ? "fixed" : "equityPct";
	const pct = Number(s?.pct);
	return {
		mode,
		pct: Number.isFinite(pct) ? Math.min(.25, Math.max(.001, pct)) : DEFAULT_SIZING.pct
	};
}
/** Unit notional of an order entered at `equity` (fixed mode: `fixedNotional`). */
var unitNotional = (s, equity, fixedNotional) => s.mode === "fixed" ? fixedNotional : Math.max(0, s.pct * equity);
var orderKey = (x) => `${x.cfg}|${x.sym}|${x.entryT}`;
/**
* Size a book causally: in time order, each entry takes its unit from the realized equity at that moment (orders
* that exited at or before it count), each exit adds r × unit. Open orders get their unit the same way.
*/
function sizeBook(trades, open, opt) {
	const ev = [];
	trades.forEach((x, i) => {
		ev.push({
			t: x.entryT,
			kind: 1,
			i,
			open: false
		});
		ev.push({
			t: x.exitT,
			kind: 0,
			i,
			open: false
		});
	});
	open.forEach((x, i) => ev.push({
		t: x.entryT,
		kind: 1,
		i,
		open: true
	}));
	ev.sort((a, b) => a.t - b.t || a.kind - b.kind || Number(a.open) - Number(b.open) || a.i - b.i);
	const units = /* @__PURE__ */ new Map();
	const unitOf = new Array(trades.length).fill(0);
	let pnl = 0;
	for (const e of ev) if (e.kind === 1) {
		const u = unitNotional(opt.sizing, opt.balance + pnl, opt.fixedNotional);
		if (e.open) units.set(orderKey(open[e.i]), u);
		else {
			unitOf[e.i] = u;
			units.set(orderKey(trades[e.i]), u);
		}
	} else pnl += trades[e.i].r * unitOf[e.i];
	return {
		units,
		realized: opt.balance + pnl,
		pnl
	};
}
//#endregion
export { unitNotional as a, sizingSettings as i, orderKey as n, sizeBook as r, DEFAULT_SIZING as t };
