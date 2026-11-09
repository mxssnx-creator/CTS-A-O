import { BINGX_HOSTS, type fetchHistory, type fetchKlines, type fetchTickers } from "./bingx.ts";
import type { ConnId } from "../exchange/bingx.server.ts";

export function connectionMarket(conn: ConnId) {
  if (!["bingx-x01", "bingx-vst-01", "bingx-vst-02"].includes(conn)) throw new Error("Unknown market connection");
  const demo = conn !== "bingx-x01";
  return { rest: demo ? BINGX_HOSTS.testnet : BINGX_HOSTS.mainnet,
    stream: demo ? "wss://vst-open-api-ws.bingx.com/swap-market" : "wss://open-api-swap.bingx.com/swap-market" };
}

type Feed = { tickers: typeof fetchTickers; history: typeof fetchHistory; klines: typeof fetchKlines };

/** Shared cache keys include the selected host, so live and demo never share candles. */
export function bindConnectionFeed(source: Feed, conn: ConnId): Feed {
  const host = connectionMarket(conn).rest;
  const checked = (requested?: string) => {
    if (requested && requested !== host) throw new Error("Market connection network mismatch");
    return host;
  };
  return {
    tickers: requested => source.tickers(checked(requested)),
    history: (sym, tf, bars, opt = {}) => source.history(sym, tf, bars, { ...opt, host: checked(opt.host) }),
    klines: (sym, tf, opt = {}) => source.klines(sym, tf, { ...opt, host: checked(opt.host) }),
  };
}
