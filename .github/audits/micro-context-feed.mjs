// Separately preregistered public provider supplement. No credentials or exchange writes.
import fs from "node:fs";
import { gzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { fetchKlines } from "../../src/core/market/bingx.ts";
import { resample } from "../../src/core/market/bars.ts";
import { takeSignedRequestSlot } from "../../src/core/exchange/request-budget.server.ts";
import { validateCoverage } from "../../scripts/lib/public-eval-feed.mjs";

const out = process.argv[2],
  planPath = "docs/negative-hour-contexts-20261021/provider-supplement-plan.json";
if (!out || fs.existsSync(`${out}/manifest.json`)) throw new Error("Pass a fresh output directory");
const planBytes = fs.readFileSync(planPath),
  plan = JSON.parse(planBytes),
  { fromT, toTExclusive: toT } = plan.source;
const symbols = [
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
  "BNB",
  "DOGE",
  "ADA",
  "BCH",
  "TRX",
  "ETC",
  "OP",
  "ARB",
  "FIL",
  "XRP",
  "UNI",
  "XLM",
  "INJ",
].map((s) => `${s}-USDT`);
const sha = (x) => createHash("sha256").update(x).digest("hex");
const manifest = {
  planSha256: sha(planBytes),
  plan: planPath,
  source: plan.source,
  startedAt: new Date().toISOString(),
  status: "collecting",
  attempts: [],
  coverage: {},
};
fs.mkdirSync(out, { recursive: true });
const save = () => fs.writeFileSync(`${out}/manifest.json`, JSON.stringify(manifest, null, 2));
save();
const realFetch = globalThis.fetch;
// Budget each actual dispatch, including retries. SDK uses a single public host and never signs this request.
globalThis.fetch = async (input, init) => {
  const url = new URL(String(input));
  if (url.origin !== plan.source.host || url.pathname !== plan.source.endpoint)
    throw new Error("Unregistered provider dispatch");
  const slot = takeSignedRequestSlot("GET", url.pathname, {});
  if (slot.until) throw new Error(`Shared request budget deferred until ${slot.until}`);
  const receipt = { url: url.href, dispatchedAt: Date.now() };
  manifest.attempts.push(receipt);
  save();
  try {
    const response = await realFetch(input, init),
      bytes = Buffer.from(await response.clone().arrayBuffer());
    receipt.httpStatus = response.status;
    receipt.bytes = bytes.length;
    receipt.sha256 = sha(bytes);
    receipt.file = `response-${manifest.attempts.length}.json.gz`;
    fs.writeFileSync(`${out}/${receipt.file}`, gzipSync(bytes));
    save();
    return response;
  } catch (e) {
    receipt.error = String(e);
    save();
    throw e;
  }
};
try {
  const candles = {},
    tickers = [];
  for (const sym of symbols) {
    const rows = [];
    for (let startT = fromT; startT < toT; startT += 1440 * 60000) {
      const endT = Math.min(toT, startT + 1440 * 60000) - 1;
      let page;
      for (let attempt = 1; attempt <= plan.source.maxAttemptsPerPage; attempt++) {
        try {
          page = await fetchKlines(sym, 1, { startT, endT, limit: 1440, nowT: toT, gapMs: 600 });
          validateCoverage(page, startT, endT + 1, sym);
          break;
        } catch (e) {
          manifest.lastError = { sym, startT, attempt, error: String(e) };
          save();
          if (attempt === plan.source.maxAttemptsPerPage) throw e;
          await new Promise((r) => setTimeout(r, 1100));
        }
      }
      rows.push(...page);
    }
    manifest.coverage[sym] = validateCoverage(rows, fromT, toT, sym);
    for (const tf of [1, 5, 15, 30, 60])
      candles[`${sym}|${tf}`] = tf === 1 ? rows : resample(rows, 1, tf);
    tickers.push({
      sym,
      last: rows.at(-1).c,
      quoteVol: rows.slice(-1440).reduce((s, c) => s + c.v * c.c, 0),
      changePct: (rows.at(-1).c / rows.at(-1440).c - 1) * 100,
    });
    save();
    console.log(`${sym}: ${rows.length} native 1m bars verified`);
  }
  const bytes = gzipSync(
    Buffer.from(
      JSON.stringify({
        tickers,
        candles,
        source: { ...plan.source, planSha256: manifest.planSha256 },
      }),
    ),
  );
  fs.writeFileSync(`${out}/feed.json.gz`, bytes);
  manifest.feed = {
    path: "feed.json.gz",
    bytes: bytes.length,
    sha256: sha(bytes),
    symbols: symbols.length,
  };
  manifest.status = "complete";
} catch (e) {
  manifest.status = "incomplete";
  manifest.error = String(e);
  process.exitCode = 1;
} finally {
  globalThis.fetch = realFetch;
  manifest.finishedAt = new Date().toISOString();
  save();
}
