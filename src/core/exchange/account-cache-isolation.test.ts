import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fetchAccount, fetchBook } from "./bingx.server.ts";

const oldKey = process.env.BINGX_X02_API_KEY, oldSecret = process.env.BINGX_X02_SECRET;
const oldBookFile = process.env.CTS_BINGX_BOOK_FILE;
afterEach(() => {
  mock.restoreAll();
  if (oldKey === undefined) delete process.env.BINGX_X02_API_KEY; else process.env.BINGX_X02_API_KEY = oldKey;
  if (oldSecret === undefined) delete process.env.BINGX_X02_SECRET; else process.env.BINGX_X02_SECRET = oldSecret;
  if (oldBookFile === undefined) delete process.env.CTS_BINGX_BOOK_FILE; else process.env.CTS_BINGX_BOOK_FILE = oldBookFile;
});

test("BingX balance cache never reuses another API key on the same connection", async () => {
  process.env.BINGX_X02_SECRET = "test-secret";
  let reads = 0;
  mock.method(globalThis, "fetch", async (_input: string | URL | Request, init?: RequestInit) => {
    reads++;
    const key = new Headers(init?.headers).get("X-BX-APIKEY");
    const balance = key === "adapter-account-a" ? 100 : 200;
    return new Response(JSON.stringify({ code: 0, data: { balance: { asset: "USDT", balance, equity: balance } } }));
  });
  process.env.BINGX_X02_API_KEY = "adapter-account-a";
  assert.equal((await fetchAccount("testnet", "bingx-vst-02"))?.wallet, 100);
  process.env.BINGX_X02_API_KEY = "adapter-account-b";
  assert.equal((await fetchAccount("testnet", "bingx-vst-02"))?.wallet, 200);
  assert.equal(reads, 2);
  process.env.BINGX_X02_API_KEY = "adapter-account-a";
  assert.equal((await fetchAccount("testnet", "bingx-vst-02"))?.wallet, 100);
  assert.equal(reads, 2, "returning to the same identity reuses only its own snapshot");
});

test("a delayed balance reply cannot populate the old account cache after switching keys", async () => {
  process.env.BINGX_X02_SECRET = "test-secret"; process.env.BINGX_X02_API_KEY = "adapter-await-a";
  let reads = 0;
  mock.method(globalThis, "fetch", async () => {
    if (++reads === 1) process.env.BINGX_X02_API_KEY = "adapter-await-b";
    return new Response(JSON.stringify({ code: 0, data: { balance: { balance: 77, equity: 77 } } }));
  });
  await assert.rejects(fetchAccount("testnet", "bingx-vst-02"), /superseded/);
  process.env.BINGX_X02_API_KEY = "adapter-await-a";
  assert.equal((await fetchAccount("testnet", "bingx-vst-02"))?.wallet, 77);
  assert.equal(reads, 2);
});

test("shared books require the same full account identity and ignore unscoped legacy files", async () => {
  const dir = mkdtempSync(join(tmpdir(), "cts-account-book-"));
  const base = join(dir, "book");
  process.env.CTS_BINGX_BOOK_FILE = base; process.env.BINGX_X02_SECRET = "test-secret";
  const now = Date.now();
  writeFileSync(`${base}.bingx-vst-02`, JSON.stringify({ startedAt: now, book: { positions: [{ symbol: "LEGACY" }], orders: [] } }));
  let reads = 0;
  mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    reads++;
    const path = new URL(String(input)).pathname, key = new Headers(init?.headers).get("X-BX-APIKEY");
    const sym = key === "book-account-a" ? "AAA-USDT" : "BBB-USDT";
    const data = path.endsWith("/user/positions") ? [{ symbol: sym, positionSide: "LONG", positionAmt: 1 }] : { orders: [] };
    return new Response(JSON.stringify({ code: 0, data }));
  });
  try {
    process.env.BINGX_X02_API_KEY = "book-account-a";
    const a = await fetchBook("testnet", "bingx-vst-02", { notBefore: 0, maxAgeMs: 60_000 });
    assert.equal(a.positions[0]?.venueSymbol, "AAA-USDT");
    process.env.BINGX_X02_API_KEY = "book-account-b";
    const b = await fetchBook("testnet", "bingx-vst-02", { notBefore: 0, maxAgeMs: 60_000 });
    assert.equal(b.positions[0]?.venueSymbol, "BBB-USDT");
    assert.equal(reads, 4, "B cannot inherit A's or the legacy shared snapshot");
    process.env.BINGX_X02_API_KEY = "book-account-a";
    const again = await fetchBook("testnet", "bingx-vst-02", { notBefore: 0, maxAgeMs: 60_000 });
    assert.equal(again.positions[0]?.venueSymbol, "AAA-USDT");
    assert.equal(reads, 4, "same-account shared snapshot remains reusable");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("a book read abandoned after a key switch is never published under the first key", async () => {
  process.env.BINGX_X02_SECRET = "test-secret"; process.env.BINGX_X02_API_KEY = "book-await-a";
  let reads = 0;
  mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    reads++;
    const path = new URL(String(input)).pathname;
    if (reads === 1) process.env.BINGX_X02_API_KEY = "book-await-b";
    const data = path.endsWith("/user/positions") ? [{ symbol: "AAA-USDT", positionSide: "LONG", positionAmt: 1 }] : { orders: [] };
    return new Response(JSON.stringify({ code: 0, data }));
  });
  await assert.rejects(fetchBook("testnet", "bingx-vst-02"), /superseded/);
  process.env.BINGX_X02_API_KEY = "book-await-a";
  assert.equal((await fetchBook("testnet", "bingx-vst-02")).positions[0]?.venueSymbol, "AAA-USDT");
  assert.equal(reads, 4);
});
