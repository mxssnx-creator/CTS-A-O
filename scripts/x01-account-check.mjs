#!/usr/bin/env node
// Read-only check of the x01 account (BingX mainnet): equity, margin, and the counts of open positions and open orders.
// No order, no cancel, no write. Prints no key.
//
//   node --experimental-strip-types --no-warnings scripts/x01-account-check.mjs [--keys-file <credentials.txt>]
//
// Keys: BINGX_X01_API_KEY / BINGX_X01_SECRET in the environment, or --keys-file, a text file with the two values after the
// labels "API Key" and "Secret Key" (read in this process only).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const i = process.argv.indexOf("--keys-file");
if (i > 0 && process.argv[i + 1]) {
  const lines = readFileSync(process.argv[i + 1], "utf8").split("\n").map((l) => l.trim());
  const after = (label) => {
    const at = lines.findIndex((l) => l.toLowerCase().startsWith(label));
    for (let j = at + 1; j < lines.length && at >= 0; j++) if (/^[A-Za-z0-9]{40,}$/.test(lines[j])) return lines[j];
    return "";
  };
  process.env.BINGX_X01_API_KEY = after("api key");
  process.env.BINGX_X01_SECRET = after("secret key");
}
if (!process.env.BINGX_X01_API_KEY || !process.env.BINGX_X01_SECRET) {
  console.log("no keys: set BINGX_X01_API_KEY / BINGX_X01_SECRET or pass --keys-file");
  process.exit(2);
}

const { fetchAccount, fetchBook } = await import(`${root}/src/core/exchange/bingx.server.ts`);
const acc = await fetchAccount("mainnet", "bingx-x01");
console.log(
  "account:",
  acc
    ? JSON.stringify({ equity: acc.equity, wallet: acc.wallet, unrealized: acc.unrealized, usedMargin: acc.usedMargin, availableMargin: acc.availableMargin })
    : "no reply (keys refused or the exchange is unreachable)",
);
const book = await fetchBook("mainnet", "bingx-x01");
const pos = book?.positions ?? [];
const ord = book?.openOrders ?? book?.orders ?? [];
console.log("open positions:", pos.length, " open orders:", ord.length);
const tag = (x) => String(x.clientOrderId ?? x.clientId ?? x.cid ?? "").startsWith("CTSV2X_");
console.log("orders with the CTSV2X_ tag:", ord.filter(tag).length);
console.log("position symbols:", new Set(pos.map((p) => p.sym ?? p.symbol)).size);
