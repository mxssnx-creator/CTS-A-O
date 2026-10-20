import assert from "node:assert/strict";
import { afterEach, it, mock } from "node:test";
import { cachedClient, type ExchangeClient } from "./live.server.ts";

const settle = async () => { for (let i = 0; i < 30; i++) await Promise.resolve(); };
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => { resolve = r; });
  return { promise, resolve };
};
const emptyBook = () => ({ positions: [], orders: [] });
let serial = 0;
const client = (patch: Partial<ExchangeClient> = {}): ExchangeClient => {
  const id = `api-batch-fixture-${++serial}`;
  return {
    fingerprint: () => id,
    hasKeys: () => true,
    book: async () => emptyBook(),
    contracts: async () => new Map(),
    order: async () => ({}),
    cancel: async () => true,
    ...patch,
  };
};
afterEach(() => mock.timers.reset());

it("concurrent callers share one connection read and 100ms checks retain the 1s REST policy", async () => {
  mock.timers.enable({ apis: ["Date"], now: 10_000 });
  const first = deferred<ReturnType<typeof emptyBook>>();
  let calls = 0;
  const raw = client({ book: async () => { calls++; return calls === 1 ? first.promise : emptyBook(); } });
  const a = cachedClient(raw, 1000), b = cachedClient(raw, 1000);
  const pending = Array.from({ length: 50 }, (_, i) => (i % 2 ? a : b).book());
  await settle();
  assert.equal(calls, 1, "simultaneous cache misses are one REST read");
  first.resolve(emptyBook());
  await Promise.all(pending);
  for (let i = 1; i < 10; i++) {
    mock.timers.tick(100);
    await Promise.all([a.book(), b.book()]);
  }
  assert.equal(calls, 1, "ten progress checks do not become ten venue polls");
  mock.timers.tick(100);
  await Promise.all([a.book(), b.book()]);
  assert.equal(calls, 2, "expired cache refreshes once");
});

it("an order during the first read fences its old snapshot, including same-millisecond changes", async () => {
  mock.timers.enable({ apis: ["Date"], now: 20_000 });
  const old = deferred<ReturnType<typeof emptyBook>>(), fresh = deferred<ReturnType<typeof emptyBook>>();
  let calls = 0, active = 0, maxActive = 0;
  const raw = client({ book: async () => {
    calls++; active++; maxActive = Math.max(maxActive, active);
    try { return await (calls === 1 ? old.promise : fresh.promise); } finally { active--; }
  } });
  const a = cachedClient(raw, 1000), b = cachedClient(raw, 1000);
  let returned = 0;
  const p = a.book().then((x) => { returned++; return x; });
  await settle();
  await b.order({ symbol: "X" });
  const q = b.book().then((x) => { returned++; return x; });
  old.resolve(emptyBook());
  await settle();
  assert.equal(returned, 0, "pre-order response neither returns nor cleans the cache");
  assert.equal(calls, 2, "one post-order read replaces it");
  fresh.resolve(emptyBook());
  const results = await Promise.all([p, q]);
  assert.equal(results[0], results[1]);
  assert.equal(maxActive, 1, "reads remain serialized across wrappers");
  await a.book();
  assert.equal(calls, 2);
  await b.cancel("X", "1");
  await a.book();
  assert.equal(calls, 3, "a cancel also invalidates the book");
});

it("a stricter freshness request waits for then replaces a looser shared read", async () => {
  const old = deferred<ReturnType<typeof emptyBook>>();
  const ages: number[] = [];
  const c = cachedClient(client({ book: async (fresh) => {
    ages.push(fresh!.maxAgeMs!);
    return ages.length === 1 ? old.promise : emptyBook();
  } }), 1000);
  const loose = c.book();
  await settle();
  const strict = c.book({ maxAgeMs: 0, notBefore: Date.now() });
  await settle();
  assert.deepEqual(ages, [1000], "no parallel duplicate read");
  old.resolve(emptyBook());
  await Promise.all([loose, strict]);
  assert.deepEqual(ages, [1000, 0], "strict caller cannot inherit looser shared-file freshness");
});

it("account and contract batches share reads and rejected batches allow a later retry", async () => {
  const ready = deferred<void>();
  let accounts = 0, contracts = 0;
  const raw = client({
    account: async () => { accounts++; await ready.promise; throw new Error("account offline"); },
    contracts: async () => { contracts++; await ready.promise; throw new Error("contracts offline"); },
  });
  const a = cachedClient(raw, 1000), b = cachedClient(raw, 1000);
  const pending = Array.from({ length: 20 }, () => [a.account!(), b.account!(), a.contracts(), b.contracts()]).flat();
  await settle();
  assert.equal(accounts, 1); assert.equal(contracts, 1);
  ready.resolve();
  const failures = await Promise.allSettled(pending);
  assert.ok(failures.every((x) => x.status === "rejected"));
  await assert.rejects(a.account!(), /offline/);
  await assert.rejects(a.contracts(), /offline/);
  assert.equal(accounts, 2); assert.equal(contracts, 2);
});
