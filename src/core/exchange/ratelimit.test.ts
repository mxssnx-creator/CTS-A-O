// BingX rate-limit bans: nothing is sent while banned, and with CTS_BINGX_BAN_FILE a ban one process receives
// pauses every process on the account (desks of a live test share one key).
import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { clearRateLimit, noteRateLimit, rateLimitedUntil, signed } from "./bingx.server.ts";

describe("rate-limit bans", () => {
  afterEach(() => {
    delete process.env.CTS_BINGX_BAN_FILE;
    clearRateLimit();
  });

  it("a ban pauses until its end plus this process's jitter; a local refusal does not extend it", () => {
    const now = Date.now();
    const end = now + 120_000;
    const until = noteRateLimit(`code:100410 rule triggered, unblocked after ${end}`, now);
    assert.ok(until >= end + 5_000 && until <= end + 60_000);
    assert.equal(rateLimitedUntil(now), until);
    // the refusal message of a call made during the ban leaves the pause as it is
    assert.equal(noteRateLimit(`frequency limit pause (not sent), unblocked after ${until} [GET /x]`, now), until);
    assert.equal(rateLimitedUntil(until + 1), 0);
  });

  it("nothing reaches the exchange while banned", async () => {
    process.env.BINGX_X02_API_KEY = "k";
    process.env.BINGX_X02_SECRET = "s";
    try {
      noteRateLimit(`unblocked after ${Date.now() + 60_000}`);
      const orig = globalThis.fetch;
      let calls = 0;
      globalThis.fetch = (async () => {
        calls++;
        throw new Error("sent");
      }) as typeof fetch;
      try {
        await assert.rejects(signed("testnet", "bingx-vst-02", "GET", "/openApi/swap/v2/trade/openOrders"), /not sent/);
      } finally {
        globalThis.fetch = orig;
      }
      assert.equal(calls, 0);
    } finally {
      delete process.env.BINGX_X02_API_KEY;
      delete process.env.BINGX_X02_SECRET;
    }
  });

  it("with a shared ban file, a ban of one process pauses the others", () => {
    const f = join(mkdtempSync(join(tmpdir(), "cts-ban-")), "ban");
    process.env.CTS_BINGX_BAN_FILE = f;
    const now = Date.now();
    const end = now + 90_000;
    noteRateLimit(`unblocked after ${end}`, now);
    assert.equal(Number(readFileSync(f, "utf8")), end, "the exchange's end is shared, without jitter");
    // another process wrote a later ban: this one pauses until then (plus its jitter) once it re-reads the file
    clearRateLimit();
    writeFileSync(f, String(end + 60_000));
    const until = rateLimitedUntil(now + 2_000);
    assert.ok(until >= end + 65_000 && until <= end + 120_000);
    // an earlier ban never overwrites a later one
    noteRateLimit(`unblocked after ${now + 30_000}`, now + 2_000);
    assert.equal(Number(readFileSync(f, "utf8")), end + 60_000);
  });
});
