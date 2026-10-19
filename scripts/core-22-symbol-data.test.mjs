import test from "node:test";
import assert from "node:assert/strict";
import {
  candlesOf,
  hourlyOf,
  publicDataGet,
  validateContracts,
  DATA_SYMBOLS,
  DATA_START,
  MINUTE,
  PUBLIC_CONTRACTS,
  PUBLIC_KLINES,
} from "./core-22-symbol-data.mjs";
const bar = (time, patch = {}) => ({
  time,
  open: "2",
  high: "3",
  low: "1",
  close: "2.5",
  volume: "4",
  ...patch,
});

test("public acquisition permits only unsigned public GET routes", async () => {
  const requests = [],
    mock = async (url, opt) => {
      requests.push({ url, opt });
      return { ok: true, status: 200, text: async () => '{"code":0}' };
    };
  assert.deepEqual(await publicDataGet(PUBLIC_CONTRACTS, mock), { text: '{"code":0}', http: 200 });
  await publicDataGet(
    PUBLIC_KLINES + "?symbol=ETC-USDT&interval=1m&startTime=0&endTime=1&limit=1440",
    mock,
  );
  assert.equal(requests.length, 2);
  for (const { opt } of requests) {
    assert.equal(opt.method, "GET");
    assert.equal(opt.credentials, "omit");
    assert.equal(opt.redirect, "error");
    assert.deepEqual(opt.headers, { accept: "application/json" });
    assert.equal(opt.body, undefined);
  }
  for (const url of [
    "https://open-api.bingx.com/openApi/swap/v2/trade/order",
    "https://open-api-vst.bingx.com/openApi/swap/v2/quote/contracts",
    PUBLIC_KLINES + "?signature=x",
    PUBLIC_CONTRACTS + "?apiKey=x",
    "https://user:pass@open-api.bingx.com/openApi/swap/v2/quote/contracts",
  ])
    await assert.rejects(publicDataGet(url, mock), /Only unsigned/);
  assert.equal(requests.length, 2);
});

test("public acquisition rejects HTTP failures before parsing", async () => {
  await assert.rejects(
    publicDataGet(PUBLIC_CONTRACTS, async () => ({ ok: false, status: 403 })),
    /HTTP403|HTTP 403/,
  );
});

test("frozen universe correction depends on availability, launch history and exact symbol", () => {
  assert.equal(DATA_SYMBOLS.length, 22);
  assert.equal(new Set(DATA_SYMBOLS).size, 22);
  assert.equal(DATA_SYMBOLS[17], "ETC-USDT");
  const raw = {
    code: 0,
    data: DATA_SYMBOLS.map((symbol) => ({
      symbol,
      status: 1,
      apiStateOpen: "true",
      launchTime: DATA_START - 1,
      contractId: symbol,
    })),
  };
  assert.equal(validateContracts(raw).length, 22);
  for (const patch of [
    { status: 0 },
    { apiStateOpen: "false" },
    { launchTime: DATA_START + 1 },
    { launchTime: undefined },
  ]) {
    const bad = structuredClone(raw);
    Object.assign(bad.data[17], patch);
    assert.throws(() => validateContracts(bad), /Unavailable or too-new/);
  }
  const absent = structuredClone(raw);
  absent.data.splice(17, 1);
  assert.throws(() => validateContracts(absent), /ETC-USDT/);
  const ton = structuredClone(raw);
  ton.data.push({ symbol: "TON-USDT" });
  assert.throws(() => validateContracts(ton), /unexpectedly exists/);
  const duplicate = structuredClone(raw);
  duplicate.data.push(raw.data[0]);
  assert.throws(() => validateContracts(duplicate), /Duplicate/);
});

test("OHLCV accepts complete reverse-ordered public pages without filling", () => {
  const rows = candlesOf({ code: 0, data: [bar(MINUTE), bar(0)] }, 0, 2 * MINUTE);
  assert.deepEqual(
    rows.map((x) => x.t),
    [0, MINUTE],
  );
  assert.equal(rows[0].v, 4);
});

test("OHLCV rejects gaps, duplicates, bad values and future boundaries", () => {
  for (const data of [
    [bar(0)],
    [bar(0), bar(0)],
    [bar(0), bar(2 * MINUTE)],
    [bar(0), bar(MINUTE, { close: "" })],
    [bar(0), bar(MINUTE, { high: "2" })],
    [bar(0), bar(MINUTE, { volume: "-1" })],
    [bar(0), bar(MINUTE + 1)],
  ])
    assert.throws(() => candlesOf({ code: 0, data }, 0, 2 * MINUTE));
  assert.throws(() => candlesOf({ code: 109425, msg: "not exist" }, 0, MINUTE), /109425/);
});

test("ranking hours require all60 contiguous aligned completed minutes", () => {
  const all = candlesOf(
    { code: 0, data: Array.from({ length: 60 }, (_, i) => bar(i * MINUTE)) },
    0,
    60 * MINUTE,
  );
  assert.deepEqual(hourlyOf(all), [{ t: 0, o: 2, h: 3, l: 1, c: 2.5, v: 240 }]);
  assert.throws(() => hourlyOf(all.slice(1)), /Incomplete/);
  assert.throws(() => hourlyOf(all.map((c) => ({ ...c, t: c.t + MINUTE }))), /Incomplete/);
  const gap = structuredClone(all);
  gap[20].t += MINUTE;
  assert.throws(() => hourlyOf(gap), /Incomplete/);
});
