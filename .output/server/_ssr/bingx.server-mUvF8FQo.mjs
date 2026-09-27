import { createHmac } from "node:crypto";
//#region node_modules/.nitro/vite/services/ssr/assets/bingx.server-mUvF8FQo.js
var HOSTS = {
	mainnet: ["https://open-api.bingx.com", "https://open-api.bingx.pro"],
	testnet: ["https://open-api-vst.bingx.com", "https://open-api-vst.bingx.pro"]
};
var TIMEOUT_MS = 1e4;
var env = (k) => (process.env[k] ?? "").trim();
/**
* Keys of a connection. A BingX API key belongs to the account, so the demo connections (VST, on the VST host)
* use the x01 keys when they have none of their own — orders still go to the VST host, never to mainnet.
* x01 (mainnet) only ever uses its own keys.
*/
function keysFor(conn) {
	const pair = (slot) => ({
		apiKey: env(`BINGX_${slot}_API_KEY`),
		secret: env(`BINGX_${slot}_SECRET`)
	});
	const ok = (k) => !!(k.apiKey && k.secret);
	if (conn === "bingx-x01") {
		const own = pair("X01");
		return {
			...own,
			source: ok(own) ? "own" : "none"
		};
	}
	const own = pair(conn === "bingx-vst-02" ? "X02" : "V01");
	if (ok(own)) return {
		...own,
		source: "own"
	};
	const x01 = pair("X01");
	if (ok(x01)) return {
		...x01,
		source: "x01"
	};
	const generic = {
		apiKey: env("BINGX_API_KEY"),
		secret: env("BINGX_SECRET")
	};
	if (ok(generic)) return {
		...generic,
		source: "generic"
	};
	return {
		apiKey: "",
		secret: "",
		source: "none"
	};
}
function signedUrl(base, path, secret, params) {
	const keys = Object.keys(params).sort();
	const canonical = keys.map((k) => `${k}=${params[k]}`).join("&");
	const signature = createHmac("sha256", secret).update(canonical).digest("hex");
	return `${base}${path}?${keys.map((k) => {
		const v = String(params[k]);
		return `${k}=${/[{}"\s,]/.test(v) ? encodeURIComponent(v) : v}`;
	}).join("&")}&signature=${signature}`;
}
async function timedFetch(url, init = {}) {
	const ctl = new AbortController();
	const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
	try {
		return await (await fetch(url, {
			...init,
			signal: ctl.signal
		})).json();
	} finally {
		clearTimeout(timer);
	}
}
/** Signed request; throws with BingX's message on a non-zero code. */
async function signed(network, conn, method, path, params = {}) {
	const { apiKey, secret } = keysFor(conn);
	if (!apiKey || !secret) throw new Error(`no API keys for ${conn}`);
	const body = await timedFetch(signedUrl(HOSTS[network][0], path, secret, {
		...params,
		recvWindow: 5e3,
		timestamp: Date.now()
	}), {
		method,
		headers: { "X-BX-APIKEY": apiKey }
	});
	if (body?.code !== 0) throw new ExchangeRejected(body?.msg || `BingX ${body?.code}`, body?.code);
	return body.data;
}
/** The exchange answered and refused the request (nothing was executed) — unlike a time-out, whose outcome is unknown. */
var ExchangeRejected = class extends Error {
	code;
	constructor(msg, code) {
		super(msg);
		this.name = "ExchangeRejected";
		this.code = code;
	}
};
var n = (v) => {
	const x = typeof v === "number" ? v : Number(v);
	return Number.isFinite(x) ? x : 0;
};
var contracts = null;
async function fetchContracts(network) {
	if (contracts && contracts.network === network && Date.now() - contracts.at < 6e5) return contracts.map;
	const map = /* @__PURE__ */ new Map();
	for (const host of HOSTS[network]) try {
		const body = await timedFetch(`${host}/openApi/swap/v2/quote/contracts`);
		for (const r of body?.data ?? []) {
			const symbol = String(r.symbol ?? "");
			if (!symbol) continue;
			const qtyPrec = n(r.quantityPrecision);
			const step = n(r.size) || 10 ** -Math.max(0, qtyPrec);
			map.set(symbol, {
				symbol,
				qtyPrec,
				step: step > 0 ? step : 1,
				minQty: Math.max(n(r.tradeMinQuantity), n(r.tradeMinVolume), n(r.minQty), step, 0),
				pxPrec: n(r.pricePrecision),
				minUsdt: Math.max(n(r.tradeMinUSDT), n(r.minNotional), 0) || 2
			});
		}
		if (map.size) break;
	} catch {}
	contracts = {
		at: Date.now(),
		network,
		map
	};
	return map;
}
/** Floor to the lot step (never larger than qty). */
function snapQtyDown(qty, spec) {
	if (!(qty > 0)) return 0;
	if (!spec) return qty;
	const q = Math.floor(qty / spec.step + 1e-12) * spec.step;
	return Number(Math.max(0, q).toFixed(Math.max(0, spec.qtyPrec)));
}
/**
* Exchange-valid quantity for a wanted quantity at a price: floored to the lot step, and raised to the smallest
* valid quantity when that is below the exchange minimum (min quantity or min USDT value). `raised` tells the
* caller the order is larger than asked (the effective volume is recorded, and caps still apply).
*/
function snapQtyExchange(qty, px, spec) {
	if (!(qty > 0) || !(px > 0)) return {
		qty: 0,
		raised: false
	};
	if (!spec) return {
		qty,
		raised: false
	};
	const down = snapQtyDown(qty, spec);
	const minNotional = exchangeMinNotional(spec, px);
	if (down >= spec.minQty && down * px >= minNotional - 1e-9) return {
		qty: down,
		raised: false
	};
	const need = Math.max(spec.minQty, minNotional / px);
	const up = Math.ceil(need / spec.step - 1e-9) * spec.step;
	return {
		qty: Number(up.toFixed(Math.max(0, spec.qtyPrec))),
		raised: true
	};
}
function snapPx(px, spec) {
	if (!(px > 0)) return 0;
	return Number(px.toFixed(Math.max(0, Math.min(8, spec?.pxPrec ?? 4))));
}
function exchangeMinNotional(spec, px) {
	return Math.max(spec?.minUsdt ?? 2, (spec?.minQty ?? 0) * Math.max(px, 0));
}
/** Account equity in USDT (swap wallet balance + unrealized P&L); null when the reply carries none. */
async function fetchEquity(network, conn) {
	return parseEquity(await signed(network, conn, "GET", "/openApi/swap/v2/user/balance"));
}
/** Equity from a BingX balance reply: data.balance.equity (object, or one row per asset: the USDT row). */
function parseEquity(raw) {
	const b = raw?.balance ?? raw;
	const rows = Array.isArray(b) ? b : [b];
	const row = rows.find((r) => String(r?.asset ?? "USDT").toUpperCase() === "USDT") ?? rows[0];
	const eq = Number(row?.equity ?? row?.balance);
	return Number.isFinite(eq) && eq > 0 ? eq : null;
}
/** Positions and open orders of the account (all of them — ownership is decided by the planner). */
async function fetchBook(network, conn) {
	const [posRaw, ordRaw] = await Promise.all([signed(network, conn, "GET", "/openApi/swap/v2/user/positions"), signed(network, conn, "GET", "/openApi/swap/v2/trade/openOrders")]);
	const posRows = Array.isArray(posRaw) ? posRaw : posRaw?.positions ?? [];
	const positions = [];
	for (const r of posRows) {
		const venueSymbol = String(r.symbol ?? "");
		const amt = n(r.positionAmt ?? r.availableAmt ?? r.positionQty ?? r.volume);
		const qty = Math.abs(amt);
		if (!venueSymbol || !(qty > 0)) continue;
		const ps = String(r.positionSide ?? "").toUpperCase();
		const side = ps === "SHORT" ? "short" : ps === "LONG" ? "long" : amt < 0 ? "short" : "long";
		positions.push({
			symbol: venueSymbol.replace("-", ""),
			venueSymbol,
			side,
			qty
		});
	}
	return {
		positions,
		orders: (Array.isArray(ordRaw) ? ordRaw : ordRaw?.orders ?? []).filter((r) => r.symbol).map((r) => ({
			id: String(r.orderId ?? r.orderID ?? ""),
			symbol: String(r.symbol).replace("-", ""),
			venueSymbol: String(r.symbol),
			clientOrderId: String(r.clientOrderID ?? r.clientOrderId ?? r.clientOid ?? "").trim() || void 0,
			positionSide: String(r.positionSide ?? "").toUpperCase() === "SHORT" ? "SHORT" : String(r.positionSide ?? "").toUpperCase() === "LONG" ? "LONG" : void 0,
			type: r.type ? String(r.type) : void 0
		}))
	};
}
async function cancelOrder(network, conn, venueSymbol, orderId) {
	try {
		await signed(network, conn, "DELETE", "/openApi/swap/v2/trade/order", {
			symbol: venueSymbol,
			orderId
		});
		return true;
	} catch {
		return false;
	}
}
/** Position mode of the account: hedge (dual side) or one-way. */
async function setPositionMode(network, conn, mode) {
	await signed(network, conn, "POST", "/openApi/swap/v1/positionSide/dual", { dualSidePosition: mode === "hedge" ? "true" : "false" });
}
/** Margin type of one symbol: cross or isolated. */
async function setMarginMode(network, conn, venueSymbol, mode) {
	await signed(network, conn, "POST", "/openApi/swap/v2/trade/marginType", {
		symbol: venueSymbol,
		marginType: mode === "cross" ? "CROSSED" : "ISOLATED"
	});
}
//#endregion
export { ExchangeRejected, HOSTS, cancelOrder, exchangeMinNotional, fetchBook, fetchContracts, fetchEquity, keysFor, setMarginMode, setPositionMode, signed, snapPx, snapQtyDown, snapQtyExchange };
