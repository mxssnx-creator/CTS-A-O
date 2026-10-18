#!/usr/bin/env node
// Frozen unsigned public OHLCV acquisition. This module imports no runtime, account or order APIs.
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const MINUTE = 60_000,
  HOUR = 60 * MINUTE;
export const PUBLIC_CONTRACTS = "https://open-api.bingx.com/openApi/swap/v2/quote/contracts";
export const PUBLIC_KLINES = "https://open-api.bingx.com/openApi/swap/v3/quote/klines";
export const ORIGINAL_SYMBOLS = [
  "AVAX",
  "LINK",
  "LTC",
  "SUI",
  "NEAR",
  "DOT",
  "ATOM",
  "APT",
  "BTC",
  "ETH",
  "SOL",
  "XRP",
  "BNB",
  "DOGE",
  "ADA",
  "BCH",
  "TRX",
  "TON",
  "OP",
  "ARB",
  "FIL",
  "UNI",
].map((s) => `${s}-USDT`);
// Predetermined availability-only correction, chosen before acquisition/scoring of the replacement.
export const DATA_SYMBOLS = ORIGINAL_SYMBOLS.map((s) => (s === "TON-USDT" ? "ETC-USDT" : s));
export const DATA_END = Date.parse("2026-10-17T21:00:00Z");
export const DATA_START = DATA_END - 397 * HOUR;
const hash = (s) => createHash("sha256").update(s).digest("hex");
const atomic = async (path, value) => {
  const bytes = typeof value === "string" ? value : JSON.stringify(value, null, 2) + "\n";
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path + ".tmp", bytes);
  await rename(path + ".tmp", path);
  return { bytes: Buffer.byteLength(bytes), sha256: hash(bytes) };
};

/** Permit only two unsigned public data routes, with no configurable host, headers or method. */
export async function publicDataGet(url, fetchImpl = fetch) {
  const parsed = new URL(url);
  const paths = new Set([new URL(PUBLIC_CONTRACTS).pathname, new URL(PUBLIC_KLINES).pathname]);
  const keys = new Set(["symbol", "interval", "startTime", "endTime", "limit"]);
  if (
    parsed.origin !== "https://open-api.bingx.com" ||
    !paths.has(parsed.pathname) ||
    parsed.username ||
    parsed.password ||
    parsed.hash ||
    [...parsed.searchParams.keys()].some((k) => !keys.has(k)) ||
    (parsed.pathname === new URL(PUBLIC_CONTRACTS).pathname && parsed.search)
  )
    throw new Error("Only unsigned public contract/OHLCV GET is permitted");
  const response = await fetchImpl(parsed.href, {
    method: "GET",
    headers: { accept: "application/json" },
    credentials: "omit",
    redirect: "error",
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return { text: await response.text(), http: response.status };
}

export function validateContracts(raw, symbols = DATA_SYMBOLS, startT = DATA_START) {
  if (raw?.code !== 0 || !Array.isArray(raw.data))
    throw new Error("Malformed public contracts reply");
  const rows = new Map();
  for (const row of raw.data) {
    if (rows.has(row.symbol)) throw new Error(`Duplicate public contract ${row.symbol}`);
    rows.set(row.symbol, row);
  }
  if (rows.has("TON-USDT"))
    throw new Error(
      "Original TON contract unexpectedly exists; preserve this attempt and reseal the availability decision",
    );
  return symbols.map((symbol) => {
    const row = rows.get(symbol);
    if (
      !row ||
      Number(row.status) !== 1 ||
      String(row.apiStateOpen) !== "true" ||
      !Number.isFinite(Number(row.launchTime)) ||
      Number(row.launchTime) > startT
    )
      throw new Error(`Unavailable or too-new public contract ${symbol}`);
    return {
      symbol,
      contractId: String(row.contractId),
      status: Number(row.status),
      apiStateOpen: true,
      launchTime: Number(row.launchTime),
      displayName: row.displayName ?? null,
    };
  });
}

export function candlesOf(raw, from, to) {
  if (
    !Number.isSafeInteger(from) ||
    !Number.isSafeInteger(to) ||
    from % MINUTE ||
    to % MINUTE ||
    from >= to
  )
    throw new Error("Invalid minute window");
  if (raw?.code !== 0 || !Array.isArray(raw.data))
    throw new Error(`Public OHLCV response code ${raw?.code}: ${raw?.msg}`);
  const map = new Map();
  for (const r of raw.data) {
    if (
      ["time", "open", "high", "low", "close", "volume"].some(
        (k) => r[k] === undefined || r[k] === null || String(r[k]).trim() === "",
      )
    )
      throw new Error("Missing OHLCV value");
    const c = {
      t: Number(r.time),
      o: Number(r.open),
      h: Number(r.high),
      l: Number(r.low),
      c: Number(r.close),
      v: Number(r.volume),
    };
    if (
      !Object.values(c).every(Number.isFinite) ||
      !Number.isSafeInteger(c.t) ||
      c.t % MINUTE ||
      c.t < from ||
      c.t >= to ||
      Math.min(c.o, c.h, c.l, c.c) <= 0 ||
      c.h < Math.max(c.o, c.c) ||
      c.l > Math.min(c.o, c.c) ||
      c.v < 0
    )
      throw new Error(`Invalid OHLCV at ${r.time}`);
    if (map.has(c.t)) throw new Error(`Duplicate candle at ${c.t}`);
    map.set(c.t, c);
  }
  const cs = [...map.values()].sort((a, b) => a.t - b.t);
  if (cs.length !== (to - from) / MINUTE)
    throw new Error(`Expected ${(to - from) / MINUTE} candles, received ${cs.length}`);
  for (let i = 0; i < cs.length; i++)
    if (cs[i].t !== from + i * MINUTE) throw new Error(`Candle gap at ${from + i * MINUTE}`);
  return cs;
}

export function hourlyOf(all) {
  const hourly = [];
  for (let i = 0; i < all.length; i += 60) {
    const rows = all.slice(i, i + 60);
    if (
      rows.length !== 60 ||
      rows[0].t % HOUR ||
      rows.some((c, j) => c.t !== rows[0].t + j * MINUTE)
    )
      throw new Error("Incomplete aligned hourly bucket");
    hourly.push({
      t: rows[0].t,
      o: rows[0].o,
      h: Math.max(...rows.map((c) => c.h)),
      l: Math.min(...rows.map((c) => c.l)),
      c: rows.at(-1).c,
      v: rows.reduce((n, c) => n + c.v, 0),
    });
  }
  return hourly;
}

export async function acquirePublicData(dir, reuseDir) {
  dir = resolve(dir);
  reuseDir = reuseDir ? resolve(reuseDir) : null;
  await mkdir(dir, { recursive: true });
  const prior = {};
  if (reuseDir) {
    for (const name of ["protocol.json", "acquisition-failure.json", "requests.json"]) {
      const bytes = await readFile(join(reuseDir, name));
      await atomic(join(dir, "prior-attempt", name), bytes.toString());
      prior[name] = { bytes: bytes.length, sha256: hash(bytes) };
    }
    const previous = JSON.parse(await readFile(join(reuseDir, "protocol.json"), "utf8"));
    if (
      previous.startT !== DATA_START ||
      previous.endT !== DATA_END ||
      JSON.stringify(previous.symbols) !== JSON.stringify(ORIGINAL_SYMBOLS)
    )
      throw new Error("Reuse archive is not the original frozen failed TON acquisition");
  }
  const contractFile = join(dir, "contracts-raw.json");
  let contractsText, contractsMeta;
  if (existsSync(contractFile)) {
    contractsText = await readFile(contractFile, "utf8");
    contractsMeta = JSON.parse(await readFile(join(dir, "contracts-request.json"), "utf8"));
    if (contractsMeta.sha256 !== hash(contractsText))
      throw new Error("Public contracts evidence hash changed");
  } else {
    const reply = await publicDataGet(PUBLIC_CONTRACTS);
    contractsText = reply.text;
    validateContracts(JSON.parse(contractsText));
    contractsMeta = {
      at: new Date().toISOString(),
      endpoint: PUBLIC_CONTRACTS,
      method: "GET",
      credentials: false,
      requestBody: null,
      http: reply.http,
      ...(await atomic(contractFile, contractsText)),
    };
    await atomic(join(dir, "contracts-request.json"), contractsMeta);
  }
  const available = validateContracts(JSON.parse(contractsText));
  const contract = {
    schema: "cts-public-22-symbol-market-v2",
    endpoint: PUBLIC_KLINES,
    symbols: DATA_SYMBOLS,
    startT: DATA_START,
    endT: DATA_END,
    sourceHours: 397,
    bounds:
      "Completed 1m candle-open timestamps in [startT,endT); source archive only; performance boundaries are frozen separately by the replay protocol.",
    intendedPrimaryReplay: {
      evaluatedPrehistoryHours: 24,
      indicatorWarmupHours: 205,
      development: {
        symbols: DATA_SYMBOLS.slice(0, 20),
        tradeStart: "2026-10-15T21:00:00Z",
        endAt: "2026-10-16T21:00:00Z",
      },
      validation: {
        symbols: DATA_SYMBOLS,
        tradeStart: "2026-10-16T21:00:00Z",
        endAt: "2026-10-17T21:00:00Z",
      },
    },
    acquisition: {
      method: "GET",
      credentials: false,
      requestBody: null,
      interval: "1m",
      limit: 1440,
      minRequestStartIntervalMs: 1100,
      timeoutMs: 15000,
      maxAttempts: 3,
    },
    universeAmendment: {
      originalSymbols: ORIGINAL_SYMBOLS,
      removed: "TON-USDT",
      added: "ETC-USDT",
      position: 17,
      reason:
        "Original acquisition failed with109425; public contracts metadata has no TON-USDT. ETC-USDT is a predetermined liquid-contract fallback selected solely for availability before outcome scoring.",
      contractsSha256: hash(contractsText),
      verifiedContracts: available,
    },
    reuse: {
      directory: reuseDir,
      preservedPriorAttempt: prior,
      rule: "Each reused public page must pass exact OHLCV bounds/continuity validation and its copied byte hash is recorded. No strategy outcomes are read.",
    },
    selection:
      "Fixed original ordered universe with one availability-only correction; first20 is the fixed development subset. No outcome-based symbol replacement.",
    usage:
      "Public market data only; no account, order, runtime or live-promotion API. Freeze configuration/gates/source independently before simulation scoring.",
  };
  const protocolFile = join(dir, "protocol.json");
  if (existsSync(protocolFile)) {
    const { frozenAt: _frozenAt, ...saved } = JSON.parse(await readFile(protocolFile, "utf8"));
    if (JSON.stringify(saved) !== JSON.stringify(contract))
      throw new Error("Existing frozen acquisition protocol differs");
  } else await atomic(protocolFile, { frozenAt: new Date().toISOString(), ...contract });
  console.log(
    JSON.stringify({
      frozen: true,
      dir,
      symbols: DATA_SYMBOLS.length,
      start: new Date(DATA_START).toISOString(),
      end: new Date(DATA_END).toISOString(),
      barsPerSymbol: (DATA_END - DATA_START) / MINUTE,
    }),
  );
  const requestsFile = join(dir, "requests.json"),
    requests = existsSync(requestsFile) ? JSON.parse(await readFile(requestsFile, "utf8")) : [];
  let nextRequestAt = 0;
  const feed = { tickers: [], candles: {} },
    quality = {},
    pages = [];
  try {
    for (const sym of DATA_SYMBOLS) {
      const all = [];
      let page = 0;
      for (let from = DATA_START; from < DATA_END; from += 1440 * MINUTE, page++) {
        const to = Math.min(DATA_END, from + 1440 * MINUTE),
          rawFile = join(dir, "raw-public", sym, `${page}.json`),
          reused = reuseDir ? join(reuseDir, "raw-public", sym, `${page}.json`) : null;
        let text, origin;
        if (existsSync(rawFile)) {
          text = await readFile(rawFile, "utf8");
          origin = "current-cache";
        } else if (reused && existsSync(reused)) {
          text = await readFile(reused, "utf8");
          candlesOf(JSON.parse(text), from, to);
          await atomic(rawFile, text);
          origin = "preserved-prior-public-page";
        } else {
          const url = `${PUBLIC_KLINES}?${new URLSearchParams({ symbol: sym, interval: "1m", startTime: String(from), endTime: String(to - 1), limit: "1440" })}`;
          for (let attempt = 1; attempt <= 3; attempt++) {
            await new Promise((r) => setTimeout(r, Math.max(0, nextRequestAt - Date.now())));
            nextRequestAt = Date.now() + 1100;
            const at = new Date().toISOString();
            try {
              const reply = await publicDataGet(url);
              text = reply.text;
              candlesOf(JSON.parse(text), from, to);
              const meta = await atomic(rawFile, text);
              requests.push({
                sym,
                page,
                from,
                to,
                at,
                attempt,
                url,
                method: "GET",
                credentials: false,
                http: reply.http,
                ...meta,
              });
              await atomic(requestsFile, requests);
              origin = "unsigned-public-GET";
              break;
            } catch (e) {
              requests.push({
                sym,
                page,
                from,
                to,
                at,
                attempt,
                url,
                method: "GET",
                credentials: false,
                error: String(e),
              });
              await atomic(requestsFile, requests);
              if (attempt === 3) throw e;
              await new Promise((r) => setTimeout(r, attempt * 2000));
            }
          }
        }
        all.push(...candlesOf(JSON.parse(text), from, to));
        pages.push({
          sym,
          page,
          from,
          to,
          origin,
          bytes: Buffer.byteLength(text),
          sha256: hash(text),
        });
      }
      if (all.length !== (DATA_END - DATA_START) / MINUTE)
        throw new Error(`Incomplete assembled symbol ${sym}`);
      feed.candles[`${sym}|1`] = all;
      feed.candles[`${sym}|60`] = hourlyOf(all);
      // Cosmetics/ranking provenance uses the day BEFORE development, never either scored trade window.
      const rankEnd = DATA_END - 48 * HOUR,
        pre = all.filter((c) => c.t >= rankEnd - 24 * HOUR && c.t < rankEnd);
      feed.tickers.push({
        sym,
        last: pre.at(-1).c,
        quoteVol: pre.reduce((n, c) => n + c.v * c.c, 0),
        changePct: (pre.at(-1).c / pre[0].o - 1) * 100,
      });
      quality[sym] = {
        bars: all.length,
        hourlyBars: feed.candles[`${sym}|60`].length,
        first: all[0].t,
        last: all.at(-1).t,
        gaps: 0,
        duplicates: 0,
        futureBars: 0,
      };
      console.log(
        `${sym}: ${all.length} completed1m bars, ${quality[sym].hourlyBars} aligned60m bars validated (${Object.keys(quality).length}/${DATA_SYMBOLS.length})`,
      );
    }
    const feedMeta = await atomic(join(dir, "feed.json"), JSON.stringify(feed));
    const subset = new Set(DATA_SYMBOLS.slice(0, 20));
    const twenty = {
      tickers: feed.tickers.filter((x) => subset.has(x.sym)),
      candles: Object.fromEntries(
        Object.entries(feed.candles).filter(([k]) => subset.has(k.split("|")[0])),
      ),
    };
    const subsetMeta = await atomic(join(dir, "feed-20.json"), JSON.stringify(twenty));
    const manifest = {
      schema: "cts-public-22-symbol-market-manifest-v2",
      completedAt: new Date().toISOString(),
      protocolSha256: hash(await readFile(protocolFile)),
      scriptSha256: hash(await readFile(fileURLToPath(import.meta.url))),
      contractsSha256: hash(contractsText),
      feed: { path: "feed.json", ...feedMeta },
      subset20: { path: "feed-20.json", symbols: [...subset], ...subsetMeta },
      symbols: DATA_SYMBOLS,
      quality,
      pages,
      acquisition: {
        endpoint: PUBLIC_KLINES,
        method: "GET",
        credentials: false,
        newRequests: requests.length,
        reusedPages: pages.filter((p) => p.origin === "preserved-prior-public-page").length,
      },
      startT: DATA_START,
      endT: DATA_END,
      strategyScoring: false,
    };
    await atomic(join(dir, "market-manifest.json"), manifest);
    console.log(
      JSON.stringify({
        complete: true,
        dir,
        symbols: DATA_SYMBOLS.length,
        ...feedMeta,
        subset20: subsetMeta,
      }),
    );
    return manifest;
  } catch (e) {
    await atomic(join(dir, "acquisition-failure.json"), {
      at: new Date().toISOString(),
      error: String(e),
      completeSymbols: Object.keys(quality),
      quality,
    });
    throw e;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dir = process.argv[2] ?? "runs/symbols22-397h-corrected-20261017",
    i = process.argv.indexOf("--reuse-dir");
  await acquirePublicData(dir, i < 0 ? null : process.argv[i + 1]);
}
