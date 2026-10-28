import assert from "node:assert/strict";
import { afterEach, beforeEach, mock, test } from "node:test";
import { fakeRt, lane, SimExchange } from "../test-support.ts";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CoreDb } from "./db.server.ts";
import { cachedClient, flushLiveKv, liveUnitPeek, resetLiveBackoff, stepLive, type ExchangeClient } from "./live.server.ts";
import type { CoreRuntime } from "./runtime.server.ts";

process.env.CTS_CORE_LIVE = "1";
let priorBudgetFile: string | undefined;
let fixtureBudgetDir: string | undefined;
beforeEach(() => {
  priorBudgetFile = process.env.CTS_BINGX_RATE_BUDGET_FILE;
  fixtureBudgetDir = mkdtempSync(join(tmpdir(), "cts-account-switch-budget-"));
  process.env.CTS_BINGX_RATE_BUDGET_FILE = join(fixtureBudgetDir, "requests.sqlite");
});
afterEach(() => {
  mock.timers.reset(); resetLiveBackoff();
  if (priorBudgetFile === undefined) delete process.env.CTS_BINGX_RATE_BUDGET_FILE;
  else process.env.CTS_BINGX_RATE_BUDGET_FILE = priorBudgetFile;
  if (fixtureBudgetDir) rmSync(fixtureBudgetDir, { recursive: true, force: true });
  fixtureBudgetDir = undefined;
});

for (const side of [1, -1] as const) for (const native of [false, true])
test(`old account ledger cannot act on new same-side foreign position, side ${side}, native ${native}`, async () => {
  mock.timers.enable({ apis: ["Date"], now: Date.UTC(2026, 9, 14, 12) });
  const { rt } = fakeRt(new CoreDb(":memory:"));
  Object.assign(rt.settings.live, { positionMode: "hedge", laneOrders: native });
  const a = new SimExchange(), b = new SimExchange();
  a.key = "account-a"; b.key = "account-b";
  const sym = "S1-USDT", ps = side === 1 ? "LONG" : "SHORT", key = `${sym}|${ps}`;
  rt.paper.positions = [{ ...lane(`follow|sig-ema-cross-s@m15|account-${side}`, sym, side, 17), entryT: Date.now() - 60_000 }];
  await stepLive(rt as unknown as CoreRuntime, [], rt.generation, a);
  const qty = a.positions.get(key);
  assert.ok(qty && qty > 0);
  b.positions.set(key, qty);
  rt.paper.positions = [];
  mock.timers.tick(20_000);
  const status = await stepLive(rt as unknown as CoreRuntime, [], rt.generation, b);
  assert.equal(b.positions.get(key), qty, JSON.stringify({ b: b.log, status }));
  assert.equal(b.log.length, 0, JSON.stringify({ b: b.log, status }));
  rt.db.db.close();
});

for (const side of [1, -1] as const) for (const native of [false, true])
  test(`restart preserves the original account binding and switch-back, side ${side}, native ${native}`, async () => {
    mock.timers.enable({ apis: ["Date"], now: Date.UTC(2026, 9, 14, 12) });
    const dir = mkdtempSync(join(tmpdir(), "cts-account-binding-"));
    const path = join(dir, "state.json"), journal = join(dir, "ledger.journal");
    let db = new CoreDb(":memory:", { statePath: path }); db.journalPath = journal;
    const a = new SimExchange(), b = new SimExchange(); a.key = "account-a"; b.key = "account-b";
    const sym = "S1-USDT", ps = side === 1 ? "LONG" : "SHORT", key = `${sym}|${ps}`;
    try {
      let { rt } = fakeRt(db); Object.assign(rt.settings.live, { positionMode: "hedge", laneOrders: native });
      const paper = { ...lane(`follow|sig-ema-cross-s@m15|account-${side}`, sym, side, 17), entryT: Date.now() - 60_000 };
      rt.paper.positions = [paper];
      await stepLive(rt as unknown as CoreRuntime, [], rt.generation, a);
      const qty = a.positions.get(key); assert.ok(qty);
      const oldStops = a.orders.map((o) => o.id);
      const binding = db.kvGet("liveOwnershipAccount"); assert.ok(binding, "account binding was checkpointed");
      flushLiveKv(db); db.db.close();
      db = new CoreDb(":memory:", { statePath: path }); db.journalPath = journal; db.replayJournal();
      ({ rt } = fakeRt(db)); Object.assign(rt.settings.live, { positionMode: "hedge", laneOrders: native });
      b.positions.set(key, qty); rt.paper.positions = [];
      mock.timers.tick(20_000);
      const denied = await stepLive(rt as unknown as CoreRuntime, [], rt.generation, b);
      assert.match(denied.reason, /ownership account differs/i);
      assert.equal(b.positions.get(key), qty); assert.equal(b.log.length, 0);
      assert.deepEqual(db.kvGet("liveOwnershipAccount"), binding, "a rejected key cannot overwrite A's binding");
      rt.paper.positions = [paper]; mock.timers.tick(20_000);
      const resumed = await stepLive(rt as unknown as CoreRuntime, [], rt.generation, a);
      assert.doesNotMatch(resumed.reason, /ownership account differs/i);
      assert.equal(a.positions.get(key), qty, "A's held parent remains unchanged");
      assert.ok(oldStops.every((id) => a.orders.some((o) => o.id === id)), "A's original protections remain");
      assert.equal(b.positions.get(key), qty, "B's position remains untouched");
    } finally { flushLiveKv(db); db.db.close(); rmSync(dir, { recursive: true, force: true }); }
  });

for (const state of ["ledger", "lane-state", "exit-cleanup", "orphan-state", "entry-pending", "submission-sequence"] as const)
  test(`unbound legacy ${state} is never silently assigned to the current API key`, async () => {
    const dir = mkdtempSync(join(tmpdir(), "cts-account-legacy-"));
    const db = new CoreDb(":memory:", { statePath: join(dir, "state.json") });
    const { rt } = fakeRt(db), ex = new SimExchange();
    try {
      rt.testOnlyAllowMemoryLive = false;
      if (state === "ledger") db.run("INSERT INTO live_orders (coid,cfg,sym,side,kind,qty,px,status,msg,at) VALUES (?,?,?,?,?,?,?,?,?,?)",
        "legacy", "control|S1-USDT|1", "S1-USDT", 1, "O", .5, 17, "ok", "", Date.now());
      if (state === "lane-state") db.kvSet("laneOrders", { legacy: { qty: .5 } });
      if (state === "exit-cleanup") db.kvSet("positionExitCleanup", { legacy: { oid: "x" } });
      if (state === "orphan-state") db.kvSet("orphanExitFences", { legacy: { oid: "x" } });
      if (state === "submission-sequence") db.run("INSERT INTO live_submission_sequence (coid,k,kind) VALUES (?,?,?)", "legacy", "S1-USDT|1", "S");
      if (state === "entry-pending") db.kvSet(`entriesPendingExecutions|${rt.settings.live.connId}`, { legacy: { sentQty: 1 } });
      const result = await stepLive(rt as unknown as CoreRuntime, [], rt.generation, ex);
      assert.match(result.reason, /legacy live ownership has no account fingerprint/i);
      assert.equal(ex.sent, 0); assert.equal(db.kvGet("liveOwnershipAccount"), undefined);
    } finally { flushLiveKv(db); db.db.close(); rmSync(dir, { recursive: true, force: true }); }
  });

test("account binding checkpoint failure blocks every venue order", async () => {
  const db = new CoreDb(":memory:", { statePath: "/dev/null/cts-account-state.json" });
  const { rt } = fakeRt(db), ex = new SimExchange();
  try {
    rt.paper.positions = [{ ...lane("follow|sig-ema-cross-s@m15|new", "S1-USDT", 1, 17), entryT: 1 }];
    const status = await stepLive(rt as unknown as CoreRuntime, [], rt.generation, ex);
    assert.match(status.reason, /account checkpoint unavailable/i);
    const repeated = await stepLive(rt as unknown as CoreRuntime, [], rt.generation, ex);
    assert.match(repeated.reason, /account checkpoint unavailable/i, "a failed cached binding cannot authorize the next step");
    assert.equal(ex.sent, 0); assert.equal(ex.positions.size, 0);
  } finally { flushLiveKv(db); db.db.close(); }
});

test("an account switch while a book read waits cannot send a market order or venue configuration", async () => {
  const db = new CoreDb(":memory:"), { rt } = fakeRt(db), ex = new SimExchange(); ex.key = "account-a";
  try {
    rt.paper.positions = [{ ...lane("follow|sig-ema-cross-s@m15|old", "S1-USDT", 1, 17), entryT: 1 }];
    await stepLive(rt as unknown as CoreRuntime, [], rt.generation, ex);
    const before = ex.log.length, book = ex.book.bind(ex);
    rt.paper.positions = [];
    ex.book = async () => { const snapshot = await book(); ex.key = "account-b"; return snapshot; };
    await stepLive(rt as unknown as CoreRuntime, [], rt.generation, ex);
    assert.equal(ex.log.length, before, "the A snapshot never authorizes a B-account order");
    assert.ok(ex.positions.has("S1-USDT|LONG"));
  } finally { flushLiveKv(db); db.db.close(); }
});

test("a strong account identity prevents collisions in legacy cache fingerprints", async () => {
  const db = new CoreDb(":memory:"), { rt } = fakeRt(db), a = new SimExchange(), b = new SimExchange();
  try {
    a.fingerprint = () => "same-short-fingerprint"; b.fingerprint = () => "same-short-fingerprint";
    (a as ExchangeClient).accountFingerprint = () => "full-account-a";
    (b as ExchangeClient).accountFingerprint = () => "full-account-b";
    rt.paper.positions = [{ ...lane("follow|sig-ema-cross-s@m15|old", "S1-USDT", 1, 17), entryT: 1 }];
    await stepLive(rt as unknown as CoreRuntime, [], rt.generation, a);
    const qty = a.positions.get("S1-USDT|LONG"); assert.ok(qty);
    b.positions.set("S1-USDT|LONG", qty); rt.paper.positions = [];
    const status = await stepLive(rt as unknown as CoreRuntime, [], rt.generation, b);
    assert.match(status.reason, /ownership account differs/i); assert.equal(b.log.length, 0);
  } finally { flushLiveKv(db); db.db.close(); }
});

test("an account switch while the initial book waits prevents position mode, margin and leverage changes", async () => {
  const db = new CoreDb(":memory:"), { rt } = fakeRt(db), ex = new SimExchange(); ex.key = "account-a";
  const mutations: string[] = [], book = ex.book.bind(ex);
  try {
    rt.paper.positions = [{ ...lane("follow|sig-ema-cross-s@m15|new", "S1-USDT", 1, 17), entryT: 1 }];
    ex.book = async () => { const snapshot = await book(); ex.key = "account-b"; return snapshot; };
    (ex as ExchangeClient).setPositionMode = async () => { mutations.push("positionMode"); };
    ex.setMarginMode = async () => { mutations.push("marginMode"); };
    (ex as ExchangeClient).setLeverage = async () => { mutations.push("leverage"); };
    await stepLive(rt as unknown as CoreRuntime, [], rt.generation, ex);
    assert.deepEqual(mutations, [], "the old book cannot configure a new account");
    assert.equal(ex.log.length, 0);
  } finally { flushLiveKv(db); db.db.close(); }
});

test("Entries mode rejects an account switch before recovering or polling A's pending execution", async () => {
  const previousKey = process.env.BINGX_X02_API_KEY, previousSecret = process.env.BINGX_X02_SECRET;
  const dir = mkdtempSync(join(tmpdir(), "cts-entry-account-")), path = join(dir, "state.json");
  let db = new CoreDb(":memory:", { statePath: path });
  let { rt } = fakeRt(db);
  const calls: Array<{ method: string; path: string }> = [];
  try {
    process.env.BINGX_X02_API_KEY = "entries-account-a"; process.env.BINGX_X02_SECRET = "test-secret";
    rt.settings.live = { ...rt.settings.live, mode: "entries", requireReady: false, syncMs: 0 };
    mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(String(input)); calls.push({ method: init?.method ?? "GET", path: url.pathname });
      const data = url.pathname.endsWith("/user/positions") ? [] :
        url.pathname.endsWith("/trade/openOrders") ? { orders: [] } :
        url.pathname.endsWith("/user/balance") ? { balance: { asset: "USDT", equity: 100, balance: 100, availableMargin: 100 } } :
        url.pathname.endsWith("/trade/order") ? { order: { orderId: "entry-1", clientOrderId: "pending-client", symbol: "S1-USDT",
          positionSide: "LONG", side: "BUY", type: "MARKET", status: "NEW", executedQty: 0 } } : [];
      return new Response(JSON.stringify({ code: 0, data }));
    });
    await stepLive(rt as unknown as CoreRuntime, [], rt.generation);
    const binding = db.kvGet("liveOwnershipAccount"); assert.ok(binding);
    flushLiveKv(db); db.db.close();
    db = new CoreDb(":memory:", { statePath: path }); ({ rt } = fakeRt(db));
    rt.settings.live = { ...rt.settings.live, mode: "entries", requireReady: false, syncMs: 0 };
    const pending = { "pending-client": { oid: "entry-1", cfg: "legacy", sym: "S1-USDT", side: 1, kind: "E",
      sentQty: 1, px: 17, key: "legacy|S1-USDT|1", at: Date.now() - 2_000 } };
    const pendingKey = `entriesPendingExecutions|${rt.settings.live.connId}`;
    db.kvSet(pendingKey, pending);
    const before = calls.length;
    process.env.BINGX_X02_API_KEY = "entries-account-b";
    const denied = await stepLive(rt as unknown as CoreRuntime, [], rt.generation);
    assert.match(denied.reason, /ownership account differs/i);
    assert.equal(calls.length, before, "B cannot poll A's pending order or mutate the venue");
    assert.deepEqual(db.kvGet(pendingKey), pending); assert.deepEqual(db.kvGet("liveOwnershipAccount"), binding);
    process.env.BINGX_X02_API_KEY = "entries-account-a";
    const resumed = await stepLive(rt as unknown as CoreRuntime, [], rt.generation);
    assert.ok(calls.slice(before).some((c) => c.path.endsWith("/trade/order") && c.method === "GET"),
      `returning to A resumes its own pending reconciliation: ${JSON.stringify({ resumed, calls: calls.slice(before), rows:db.all("SELECT * FROM live_orders") })}`);
  } finally {
    mock.restoreAll();
    if (previousKey === undefined) delete process.env.BINGX_X02_API_KEY; else process.env.BINGX_X02_API_KEY = previousKey;
    if (previousSecret === undefined) delete process.env.BINGX_X02_SECRET; else process.env.BINGX_X02_SECRET = previousSecret;
    flushLiveKv(db); db.db.close(); rmSync(dir, { recursive: true, force: true });
  }
});

test("Entries mode cannot dispatch after its account changes during a book await", async () => {
  const previousKey = process.env.BINGX_X02_API_KEY, previousSecret = process.env.BINGX_X02_SECRET;
  const db = new CoreDb(":memory:"), { rt } = fakeRt(db), mutating: string[] = [];
  try {
    process.env.BINGX_X02_API_KEY = "entries-await-a"; process.env.BINGX_X02_SECRET = "test-secret";
    rt.settings.live = { ...rt.settings.live, mode: "entries", requireReady: false, syncMs: 0 };
    mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(String(input)), method = init?.method ?? "GET";
      if (method !== "GET") mutating.push(`${method} ${url.pathname}`);
      if (url.pathname.endsWith("/user/positions")) process.env.BINGX_X02_API_KEY = "entries-await-b";
      const data = url.pathname.endsWith("/user/positions") ? [] :
        url.pathname.endsWith("/trade/openOrders") ? { orders: [] } : [];
      return new Response(JSON.stringify({ code: 0, data }));
    });
    await stepLive(rt as unknown as CoreRuntime, [], rt.generation);
    assert.deepEqual(mutating, [], "no write is dispatched after the credential change");
  } finally {
    mock.restoreAll();
    if (previousKey === undefined) delete process.env.BINGX_X02_API_KEY; else process.env.BINGX_X02_API_KEY = previousKey;
    if (previousSecret === undefined) delete process.env.BINGX_X02_SECRET; else process.env.BINGX_X02_SECRET = previousSecret;
    flushLiveKv(db); db.db.close();
  }
});

for (const changedAt of ["positionMode", "marginMode", "leverage"] as const)
  test(`an account change during ${changedAt} cannot dispatch later mutations or orders`, async () => {
    const db = new CoreDb(":memory:"), { rt } = fakeRt(db), ex = new SimExchange(); ex.key = "account-a";
    const mutations: string[] = [];
    try {
      rt.settings.live = { ...rt.settings.live, marginMode: "isolated" };
      rt.paper.positions = [{ ...lane("follow|sig-ema-cross-s@m15|new", "S1-USDT", 1, 17), entryT: 1 }];
      (ex as ExchangeClient).setPositionMode = async () => { mutations.push("positionMode"); if (changedAt === "positionMode") ex.key = "account-b"; };
      ex.setMarginMode = async () => { mutations.push("marginMode"); if (changedAt === "marginMode") ex.key = "account-b"; };
      ex.marginMode = async () => "cross";
      (ex as ExchangeClient).leverage = async () => ({ long: 1, short: 1, maxLong: 75, maxShort: 75 });
      (ex as ExchangeClient).setLeverage = async () => { mutations.push("leverage"); if (changedAt === "leverage") ex.key = "account-b"; };
      await stepLive(rt as unknown as CoreRuntime, [], rt.generation, ex);
      const i = mutations.indexOf(changedAt); assert.ok(i >= 0, `${changedAt} was reached`);
      assert.equal(mutations.length, i + 1, "no later account mutation follows the identity change");
      assert.equal(ex.log.length, 0, "no parent or exit order reaches the changed account");
      assert.equal(db.get<{ n: number }>("SELECT COUNT(*) AS n FROM live_orders")?.n, 0);
    } finally { flushLiveKv(db); db.db.close(); }
  });

for (const contents of ["{malformed", "[]", "null", "1", '"string"'])
  test(`unreadable or invalid state root ${contents} cannot be rebound`, async () => {
    const dir = mkdtempSync(join(tmpdir(), "cts-invalid-account-")), path = join(dir, "state.json");
    writeFileSync(path, contents);
    const db = new CoreDb(":memory:", { statePath: path }), { rt } = fakeRt(db), ex = new SimExchange();
    try {
      assert.ok(db.lastStateError, "state import must surface its failure");
      rt.paper.positions = [lane("new", "S1-USDT", 1, 17)];
      const status = await stepLive(rt as unknown as CoreRuntime, [], rt.generation, ex);
      assert.match(status.reason, /checkpoint unavailable/i);
      assert.equal(ex.log.length, 0);
      assert.equal(db.kvGet("liveOwnershipAccount"), undefined);
    } finally { db.db.close(); rmSync(dir, { recursive: true, force: true }); }
  });

test("production-like runtime without a state store holds before dispatch even with an injected client", async () => {
  const db = new CoreDb(":memory:"), { rt } = fakeRt(db), ex = new SimExchange();
  try {
    rt.testOnlyAllowMemoryLive = false;
    rt.paper.positions = [lane("new", "S1-USDT", 1, 17)];
    const status = await stepLive(rt as unknown as CoreRuntime, [], rt.generation, ex);
    assert.match(status.reason, /no durable state file/i);
    assert.equal(ex.log.length, 0); assert.equal(db.kvGet("liveOwnershipAccount"), undefined);
  } finally { db.db.close(); }
});

for (const disabled of ["settings", "environment", "credentials"] as const)
  test(`Entries ${disabled} unavailable cannot recover account-specific state`, async () => {
    const oldKey = process.env.BINGX_X02_API_KEY, oldSecret = process.env.BINGX_X02_SECRET, armed = process.env.CTS_CORE_LIVE;
    const db = new CoreDb(":memory:"), { rt } = fakeRt(db);
    try {
      rt.settings.live = { ...rt.settings.live, mode: "entries", syncMs: 0 };
      process.env.BINGX_X02_API_KEY = "old-key"; process.env.BINGX_X02_SECRET = "old-secret";
      if (disabled === "settings") rt.settings.live.enabled = false;
      if (disabled === "environment") process.env.CTS_CORE_LIVE = "0";
      if (disabled === "credentials") { delete process.env.BINGX_X02_API_KEY; delete process.env.BINGX_X02_SECRET; }
      const key = `entriesPendingExecutions|${rt.settings.live.connId}`;
      const pending = { "old-entry": { oid: "old-id", cfg: "c", sym: "S1-USDT", side: 1, kind: "E",
        sentQty: 1, px: 17, key: "c|S1-USDT|1", at: 1, knownQty: 0.5 } };
      db.kvSet(key, pending);
      await stepLive(rt as unknown as CoreRuntime, [], rt.generation);
      assert.deepEqual(db.kvGet(key), pending);
      assert.equal(db.get("SELECT 1 FROM live_orders WHERE coid='old-entry'"), undefined,
        "an unauthenticated run cannot adopt the pending fill");
      assert.equal(db.kvGet("liveOwnershipAccount"), undefined);
    } finally {
      if (oldKey === undefined) delete process.env.BINGX_X02_API_KEY; else process.env.BINGX_X02_API_KEY = oldKey;
      if (oldSecret === undefined) delete process.env.BINGX_X02_SECRET; else process.env.BINGX_X02_SECRET = oldSecret;
      if (armed === undefined) delete process.env.CTS_CORE_LIVE; else process.env.CTS_CORE_LIVE = armed;
      db.db.close();
    }
  });

for (const side of [1, -1] as const)
  test(`an account change during Overall market acknowledgement holds original pending parent, side ${side}`, async () => {
    const db = new CoreDb(":memory:"), { rt } = fakeRt(db), ex = new SimExchange(); ex.key = "account-a";
    try {
      rt.paper.positions = [lane("new", "S1-USDT", side, 17)];
      const send = ex.order.bind(ex);
      ex.order = async (p) => { const reply = await send(p); if (p.type === "MARKET") ex.key = "account-b"; return reply; };
      await stepLive(rt as unknown as CoreRuntime, [], rt.generation, ex);
      const rows = db.all<{ kind: string; qty: number; status: string }>("SELECT kind,qty,status FROM live_orders");
      assert.equal(ex.log.filter((x) => x.type === "MARKET").length, 1);
      assert.equal(ex.log.filter((x) => x.type !== "MARKET").length, 0, "no stop or target reaches B");
      assert.ok(rows.some((r) => r.kind === "O" && r.qty === 0 && r.status === "pending"), JSON.stringify(rows));
      assert.equal(db.get("SELECT 1 FROM live_fills"), undefined, "A's abandoned receipt is not attributed to B");
      const writes = ex.log.length;
      await stepLive(rt as unknown as CoreRuntime, [], rt.generation, ex);
      assert.equal(ex.log.length, writes, "B cannot act on A's pending parent");
      ex.key = "account-a";
      const resumed = await stepLive(rt as unknown as CoreRuntime, [], rt.generation, ex);
      assert.doesNotMatch(resumed.reason, /ownership account differs/i);
    } finally { db.db.close(); }
  });

for (const invalid of [null, [], {}, "a", 1])
  test(`present invalid account binding ${JSON.stringify(invalid)} is never rebound`, async () => {
    const db = new CoreDb(":memory:"), { rt } = fakeRt(db), ex = new SimExchange();
    try {
      db.kvSet("liveOwnershipAccount", invalid);
      rt.paper.positions = [lane("new", "S1-USDT", 1, 17)];
      const status = await stepLive(rt as unknown as CoreRuntime, [], rt.generation, ex);
      assert.match(status.reason, /differs or is invalid/);
      assert.equal(ex.log.length, 0);
      assert.deepEqual(db.kvGet("liveOwnershipAccount"), invalid);
    } finally { db.db.close(); }
  });

test("a denied account switch cannot show or size from the old account balance", async () => {
  const db = new CoreDb(":memory:"), { rt } = fakeRt(db), ex = new SimExchange().withEquity(100);
  try {
    ex.key = "account-a"; rt.settings.sizing = { mode: "equityPct", pct: 0.1 };
    await stepLive(rt as unknown as CoreRuntime, [], rt.generation, ex);
    assert.equal(liveUnitPeek(rt as unknown as CoreRuntime).wallet, 100);
    ex.key = "account-b";
    assert.equal(liveUnitPeek(rt as unknown as CoreRuntime).wallet, null, "preview immediately forgets stale account scope");
    const denied = await stepLive(rt as unknown as CoreRuntime, [], rt.generation, ex);
    assert.match(denied.reason, /ownership account differs/i);
    assert.equal(denied.account, undefined, "a rejected B must not display A's wallet");
    assert.equal(liveUnitPeek(rt as unknown as CoreRuntime).from, "unknown");
  } finally { db.db.close(); }
});

test("a changing full account fingerprint cannot poison the old account's book cache", async () => {
  const ex = new SimExchange(); ex.key = "account-a";
  let reads = 0;
  const plain: ExchangeClient = { hasKeys: () => true, fingerprint: () => "same-short",
    accountFingerprint: () => ex.key, book: async () => { reads++; if (reads === 1) ex.key = "account-b"; return { positions: [], orders: [] }; },
    contracts: () => ex.contracts(), order: (p) => ex.order(p), cancel: (sym, oid) => ex.cancel(sym, oid) };
  const cached = cachedClient(plain, 60_000);
  await assert.rejects(cached.book(), /superseded/);
  ex.key = "account-a";
  await cached.book();
  assert.equal(reads, 2, "the superseded result was not cached under A");
});

test("Entries discards a pending execution receipt if the account changes during its poll", async () => {
  const previousKey = process.env.BINGX_X02_API_KEY, previousSecret = process.env.BINGX_X02_SECRET;
  const dir = mkdtempSync(join(tmpdir(), "cts-entry-poll-account-")), path = join(dir, "state.json");
  let db = new CoreDb(":memory:", { statePath: path });
  let { rt } = fakeRt(db);
  try {
    process.env.BINGX_X02_API_KEY = "entries-poll-a"; process.env.BINGX_X02_SECRET = "test-secret";
    rt.settings.live = { ...rt.settings.live, mode: "entries", requireReady: false, syncMs: 0 };
    let poll = false, posts = 0;
    mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(String(input)), method = init?.method ?? "GET";
      if (method !== "GET") posts++;
      let data: unknown = [];
      if (url.pathname.endsWith("/trade/openOrders")) data = { orders: [] };
      else if (url.pathname.endsWith("/user/balance")) data = { balance: { asset: "USDT", equity: 100, balance: 100, availableMargin: 100 } };
      else if (url.pathname.endsWith("/trade/order") && method === "GET") {
        poll = true; process.env.BINGX_X02_API_KEY = "entries-poll-b";
        data = { order: { orderId: "entry-1", clientOrderId: "pending-client", symbol: "S1-USDT",
          positionSide: "LONG", side: "BUY", type: "MARKET", status: "FILLED", executedQty: 1, avgPrice: 17 } };
      }
      return new Response(JSON.stringify({ code: 0, data }));
    });
    await stepLive(rt as unknown as CoreRuntime, [], rt.generation);
    flushLiveKv(db); db.db.close();
    db = new CoreDb(":memory:", { statePath: path }); ({ rt } = fakeRt(db));
    rt.settings.live = { ...rt.settings.live, mode: "entries", requireReady: false, syncMs: 0 };
    const pendingKey = `entriesPendingExecutions|${rt.settings.live.connId}`;
    const pending = { "pending-client": { oid: "entry-1", cfg: "a", sym: "S1-USDT", side: 1, kind: "E",
      sentQty: 1, px: 17, key: "a|S1-USDT|1", at: Date.now() - 2_000 } };
    db.kvSet(pendingKey, pending);
    await stepLive(rt as unknown as CoreRuntime, [], rt.generation);
    assert.equal(poll, true, "the pending request reached its delayed status poll");
    assert.deepEqual(db.kvGet(pendingKey), pending, "A's reservation remains unchanged");
    assert.equal(db.get("SELECT 1 FROM live_orders WHERE coid='pending-client'"), undefined);
    assert.equal(db.get("SELECT 1 FROM live_fills"), undefined);
    assert.equal(posts, 0, "the stale receipt cannot dispatch a stop or close on B");
  } finally {
    mock.restoreAll();
    if (previousKey === undefined) delete process.env.BINGX_X02_API_KEY; else process.env.BINGX_X02_API_KEY = previousKey;
    if (previousSecret === undefined) delete process.env.BINGX_X02_SECRET; else process.env.BINGX_X02_SECRET = previousSecret;
    flushLiveKv(db); db.db.close(); rmSync(dir, { recursive: true, force: true });
  }
});

test("Entries cached status is not reused when the API key changes inside syncMs", async () => {
  const oldKey = process.env.BINGX_X02_API_KEY, oldSecret = process.env.BINGX_X02_SECRET;
  const keyA = `entries-cache-a-${Date.now()}`, keyB = `entries-cache-b-${Date.now()}`;
  const db = new CoreDb(":memory:"), { rt } = fakeRt(db);
  try {
    process.env.BINGX_X02_API_KEY = keyA; process.env.BINGX_X02_SECRET = "test-secret";
    rt.settings.live = { ...rt.settings.live, mode: "entries", syncMs: 60_000, requireReady: false };
    let balanceReads = 0;
    mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
      const path = new URL(String(input)).pathname;
      let data: unknown = [];
      if (path.endsWith("/trade/openOrders")) data = { orders: [] };
      else if (path.endsWith("/swap/v2/user/balance")) {
        balanceReads++;
        const balance = process.env.BINGX_X02_API_KEY === keyA ? 100 : 200;
        data = { balance: { asset: "USDT", equity: balance, balance, availableMargin: balance } };
      }
      return new Response(JSON.stringify({ code: 0, data }));
    });
    const first = await stepLive(rt as unknown as CoreRuntime, [], rt.generation);
    assert.equal(first.account?.wallet, 100);
    process.env.BINGX_X02_API_KEY = keyB;
    const second = await stepLive(rt as unknown as CoreRuntime, [], rt.generation);
    assert.match(second.reason, /ownership account differs/i, JSON.stringify({ second, balanceReads }));
    assert.equal(second.account, undefined, "B cannot receive A's cached status or wallet");
    assert.equal(balanceReads, 1, "the bound-account guard runs before an account-B balance read");
  } finally {
    mock.restoreAll();
    if (oldKey === undefined) delete process.env.BINGX_X02_API_KEY; else process.env.BINGX_X02_API_KEY = oldKey;
    if (oldSecret === undefined) delete process.env.BINGX_X02_SECRET; else process.env.BINGX_X02_SECRET = oldSecret;
    db.db.close();
  }
});

for (const key of ["liveLaneOpen", "laneOrders", "laneQuantityCaps", "positionExitCleanup", "orphanExitFences", "controlSuppressed", "entriesPendingExecutions|bingx-vst-02", "controlStatus"])
  test(`unbound legacy ${key}:null is not proof of empty ownership`, async () => {
    const db = new CoreDb(":memory:"), { rt } = fakeRt(db), ex = new SimExchange();
    try {
      rt.testOnlyAllowMemoryLive = false;
      db.kvSet(key, null);
      rt.paper.positions = [lane("new", "S1-USDT", 1, 17)];
      const status = await stepLive(rt as unknown as CoreRuntime, [], rt.generation, ex);
      assert.match(status.reason, /legacy live ownership has no account fingerprint/i);
      assert.equal(ex.log.length, 0); assert.equal(db.kvGet("liveOwnershipAccount"), undefined);
    } finally { db.db.close(); }
  });

test("unbound legacy successful open action remains ownership evidence even when held is empty", async () => {
  const db = new CoreDb(":memory:"), { rt } = fakeRt(db), ex = new SimExchange();
  try {
    rt.testOnlyAllowMemoryLive = false;
    db.kvSet("controlStatus", { held: [], actions: [{ kind: "open", ok: true, sym: "S1-USDT" }] });
    rt.paper.positions = [lane("new", "S1-USDT", 1, 17)];
    const status = await stepLive(rt as unknown as CoreRuntime, [], rt.generation, ex);
    assert.match(status.reason, /legacy live ownership has no account fingerprint/i);
    assert.equal(ex.log.length, 0); assert.equal(db.kvGet("liveOwnershipAccount"), undefined);
  } finally { db.db.close(); }
});

for (const status of [{}, { placed: 1 }, { held: [] }, { actions: [] }, { held: [], actions: [], steps: 1 }, { held: "bad", actions: [] }])
  test(`unbound partial control status ${JSON.stringify(status)} holds account binding`, async () => {
    const db = new CoreDb(":memory:"), { rt } = fakeRt(db), ex = new SimExchange();
    try {
      rt.testOnlyAllowMemoryLive = false;
      db.kvSet("controlStatus", status); rt.paper.positions = [lane("new", "S1-USDT", 1, 17)];
      const result = await stepLive(rt as unknown as CoreRuntime, [], rt.generation, ex);
      assert.match(result.reason, /legacy live ownership has no account fingerprint/i);
      assert.equal(ex.log.length, 0); assert.equal(db.kvGet("liveOwnershipAccount"), undefined);
    } finally { db.db.close(); }
  });
