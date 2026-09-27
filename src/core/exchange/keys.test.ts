// Connection keys: the demo connections (VST host) fall back to the x01 keys; x01 (mainnet) only uses its own.
import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { HOSTS, keysFor, signed } from "./bingx.server.ts";

const NAMES = [
  "BINGX_X01_API_KEY",
  "BINGX_X01_SECRET",
  "BINGX_X02_API_KEY",
  "BINGX_X02_SECRET",
  "BINGX_V01_API_KEY",
  "BINGX_V01_SECRET",
  "BINGX_API_KEY",
  "BINGX_SECRET",
];
const saved = Object.fromEntries(NAMES.map((k) => [k, process.env[k]]));
const clear = () => NAMES.forEach((k) => delete process.env[k]);

describe("connection keys", () => {
  afterEach(() => {
    clear();
    for (const [k, v] of Object.entries(saved)) if (v !== undefined) process.env[k] = v;
  });

  it("x02 uses the x01 keys when it has none, its own when present", () => {
    clear();
    process.env.BINGX_X01_API_KEY = "k1";
    process.env.BINGX_X01_SECRET = "s1";
    assert.deepEqual(keysFor("bingx-vst-02"), { apiKey: "k1", secret: "s1", source: "x01" });
    assert.deepEqual(keysFor("bingx-vst-01"), { apiKey: "k1", secret: "s1", source: "x01" });
    process.env.BINGX_X02_API_KEY = "k2";
    process.env.BINGX_X02_SECRET = "s2";
    assert.deepEqual(keysFor("bingx-vst-02"), { apiKey: "k2", secret: "s2", source: "own" });
    // a half-set pair is not used
    delete process.env.BINGX_X02_SECRET;
    assert.equal(keysFor("bingx-vst-02").source, "x01");
  });

  it("x01 (mainnet) never borrows other keys", () => {
    clear();
    process.env.BINGX_X02_API_KEY = "k2";
    process.env.BINGX_X02_SECRET = "s2";
    process.env.BINGX_API_KEY = "g";
    process.env.BINGX_SECRET = "gs";
    assert.deepEqual(keysFor("bingx-x01"), { apiKey: "", secret: "", source: "none" });
  });

  it("the generic pair is the last fallback for the demo connections; none → no request", async () => {
    clear();
    process.env.BINGX_API_KEY = "g";
    process.env.BINGX_SECRET = "gs";
    assert.equal(keysFor("bingx-vst-02").source, "generic");
    clear();
    assert.equal(keysFor("bingx-vst-02").source, "none");
    await assert.rejects(
      signed("testnet", "bingx-vst-02", "GET", "/openApi/swap/v2/user/balance"),
      /no API keys/,
    );
  });

  it("the demo connections sign on the VST host", () => {
    assert.ok(HOSTS.testnet.every((h) => h.includes("open-api-vst.bingx")));
    assert.ok(HOSTS.mainnet.every((h) => !h.includes("vst")));
  });
});
