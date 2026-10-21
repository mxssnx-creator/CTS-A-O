import assert from "node:assert/strict";
import { afterEach, it } from "node:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { DatabaseSync } from "node:sqlite";
import { RequestBudget, REQUEST_WINDOW_MS, signedRequestsPerSecond, takeSignedRequestSlot } from "./request-budget.server.ts";
import { clearRateLimit, RequestBudgetDeferred, signed } from "./bingx.server.ts";

const root = new URL("./request-budget.server.ts", import.meta.url).href;
const file = () => join(mkdtempSync(join(tmpdir(), "cts-budget-fixture-")), "requests.sqlite");
afterEach(() => { delete process.env.CTS_BINGX_TRADER_RATE_LIMITS; clearRateLimit(); });

it("rolling windows cross second boundaries without doubling the dispatch allowance", () => {
  const b = new RequestBudget(":memory:");
  try {
    for (let i = 0; i < 10; i++) assert.equal(b.take("POST order", 10, 999).until, 0);
    assert.equal(b.take("POST order", 10, 1001).until, 999 + REQUEST_WINDOW_MS);
    assert.equal(b.take("POST order", 10, 999 + REQUEST_WINDOW_MS - 1).until, 999 + REQUEST_WINDOW_MS);
    assert.equal(b.take("POST order", 10, 999 + REQUEST_WINDOW_MS).until, 0);
    assert.equal(b.take("GET book", 5, 1001).until, 0, "different endpoints retain independent capacity");
  } finally { b.close(); }
});

it("separate clients/processes share one atomic budget, with no stored credentials", async () => {
  const path = file(), b = new RequestBudget(path);
  b.take("initialize", 1, Date.now());
  const now = Date.now() + 100;
  const code = `import {RequestBudget} from ${JSON.stringify(root)};
    const b=new RequestBudget(process.argv[1]);let accepted=0;
    for(let i=0;i<30;i++)if(!b.take('POST order',10,Number(process.argv[2])).until)accepted++;
    b.close();process.stdout.write(String(accepted));`;
  try {
    const replies = await Promise.all(Array.from({ length: 4 }, () =>
      promisify(execFile)(process.execPath, ["--experimental-strip-types", "--no-warnings", "--input-type=module", "-e", code, path, String(now)])));
    const total = replies.reduce((n, x) => n + Number(x.stdout), 0);
    assert.ok(total > 0 && total <= 10, `${total} accepted across four processes`);
    assert.equal(b.take("POST order", 10, now).until > now, true);
  } finally { b.close(); }
});

it("a busy/unavailable shared store sends nothing and recovers after the lock releases", () => {
  const path = file(), b = new RequestBudget(path);
  b.take("x", 10, 1000);
  const lock = new DatabaseSync(path);
  try {
    lock.exec("BEGIN IMMEDIATE");
    assert.deepEqual(b.take("x", 10, 1000), { until: 1100, unavailable: true });
    lock.exec("ROLLBACK");
    assert.equal(b.take("x", 10, 1000).until, 0);
  } finally { lock.close(); b.close(); }
});

it("new exposure leaves request capacity for owned stops and reductions", () => {
  const old = process.env.CTS_BINGX_RATE_BUDGET_FILE;
  process.env.CTS_BINGX_RATE_BUDGET_FILE = file();
  const path = "/openApi/swap/v2/trade/order", now = 100_000;
  try {
    const entry = { type: "MARKET", side: "BUY", positionSide: "LONG" };
    for (let i = 0; i < 8; i++) assert.equal(takeSignedRequestSlot("POST", path, entry, now).until, 0);
    assert.ok(takeSignedRequestSlot("POST", path, entry, now).until > now);
    assert.equal(takeSignedRequestSlot("POST", path, { type: "STOP_MARKET" }, now).until, 0);
    assert.equal(takeSignedRequestSlot("POST", path, { type: "MARKET", side: "SELL", positionSide: "LONG" }, now).until, 0);
    assert.ok(takeSignedRequestSlot("POST", path, { type: "STOP_MARKET" }, now).until > now);
  } finally {
    if (old === undefined) delete process.env.CTS_BINGX_RATE_BUDGET_FILE; else process.env.CTS_BINGX_RATE_BUDGET_FILE = old;
  }
});

it("native signing refuses surplus requests before fetch and never creates a delayed send queue", async () => {
  const oldFile = process.env.CTS_BINGX_RATE_BUDGET_FILE;
  const oldKey = process.env.BINGX_X02_API_KEY, oldSecret = process.env.BINGX_X02_SECRET;
  const fetch = globalThis.fetch;
  process.env.CTS_BINGX_RATE_BUDGET_FILE = file();
  process.env.BINGX_X02_API_KEY = "fixture"; process.env.BINGX_X02_SECRET = "fixture";
  let calls = 0;
  globalThis.fetch = (async () => { calls++; return new Response('{"code":0,"data":{}}'); }) as typeof fetch;
  try {
    const replies = await Promise.allSettled(Array.from({ length: 25 }, () => signed("testnet", "bingx-vst-02", "POST", "/openApi/swap/v2/trade/order", { type: "STOP_MARKET" })));
    assert.equal(calls, 10);
    assert.equal(replies.filter((x) => x.status === "fulfilled").length, 10);
    for (const r of replies) if (r.status === "rejected") {
      assert.ok(r.reason instanceof RequestBudgetDeferred);
      assert.equal(r.reason.hold, true);
      assert.match(r.reason.message, /not sent/);
    }
    await new Promise((r) => setTimeout(r, 40));
    assert.equal(calls, 10, "deferred actions require a new, current control step");
  } finally {
    globalThis.fetch = fetch;
    for (const [key, value] of Object.entries({ CTS_BINGX_RATE_BUDGET_FILE: oldFile, BINGX_X02_API_KEY: oldKey, BINGX_X02_SECRET: oldSecret })) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});

it("endpoint limits use conservative documented values and the stricter trader opt-in", () => {
  assert.equal(signedRequestsPerSecond("POST", "/openApi/swap/v2/trade/order"), 10);
  assert.equal(signedRequestsPerSecond("DELETE", "/openApi/swap/v2/trade/order"), 5);
  assert.equal(signedRequestsPerSecond("GET", "/openApi/swap/v2/trade/order"), 5);
  assert.equal(signedRequestsPerSecond("POST", "/openApi/swap/v2/trade/leverage"), 2);
  process.env.CTS_BINGX_TRADER_RATE_LIMITS = "1";
  assert.equal(signedRequestsPerSecond("POST", "/openApi/swap/v2/trade/order"), 1);
  assert.equal(signedRequestsPerSecond("DELETE", "/openApi/swap/v2/trade/order"), 1);
});

it("read host failover consumes the same rolling request budget as primary dispatches", async () => {
  const saved = { CTS_BINGX_RATE_BUDGET_FILE: process.env.CTS_BINGX_RATE_BUDGET_FILE,
    BINGX_X02_API_KEY: process.env.BINGX_X02_API_KEY, BINGX_X02_SECRET: process.env.BINGX_X02_SECRET };
  const originalFetch = globalThis.fetch, originalNow = Date.now;
  process.env.CTS_BINGX_RATE_BUDGET_FILE = file();
  process.env.BINGX_X02_API_KEY = "fixture"; process.env.BINGX_X02_SECRET = "fixture";
  Date.now = () => 100_000;
  let calls = 0;
  globalThis.fetch = (async (input: string | URL) => {
    calls++;
    if (new URL(String(input)).host === "open-api-vst.bingx.com") throw new Error("fixture transport failure");
    return new Response('{"code":0,"data":{}}');
  }) as typeof fetch;
  const read = () => signed("testnet", "bingx-vst-02", "GET", "/openApi/swap/v2/trade/openOrders");
  try {
    await read(); await read();
    assert.equal(calls, 4, "two successful reads each use primary and fallback slots");
    await assert.rejects(read(), RequestBudgetDeferred);
    assert.equal(calls, 5, "the fallback cannot dispatch a sixth request");
    await assert.rejects(read(), RequestBudgetDeferred);
    assert.equal(calls, 5, "a new caller cannot exceed the shared window either");
    Date.now = () => 101_050;
    await read();
    assert.equal(calls, 7, "both hosts recover after the old window expires");
  } finally {
    globalThis.fetch = originalFetch; Date.now = originalNow;
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});
