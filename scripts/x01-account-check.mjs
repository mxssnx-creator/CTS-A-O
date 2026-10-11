#!/usr/bin/env node
// Read-only pre-flight for the x01 (BingX mainnet) account: which key slot resolves, the USDT balance snapshot
// (equity, wallet, available margin) and the open positions on the account. Places no orders, changes nothing.
// Run it before starting the x01 Signals eval to confirm the mainnet key authenticates and the account looks sane.
//
//   docs/live-coordination maps BINGX_API_KEY -> BINGX_X01_API_KEY; do the same here, or set BINGX_X01_API_KEY.
//   BINGX_X01_API_KEY="$BINGX_API_KEY" BINGX_X01_SECRET="$BINGX_API_SECRET" \
//     node --experimental-strip-types --no-warnings scripts/x01-account-check.mjs
const { keysFor, fetchAccount, fetchBook } = await import("../src/core/exchange/bingx.server.ts");

const CONN = "bingx-x01";
const NETWORK = "mainnet";

const keys = keysFor(CONN);
process.stdout.write(`x01 account check — connection ${CONN} (${NETWORK})\n`);
process.stdout.write(`  key source: ${keys.source}\n`);
if (keys.source === "none") {
  process.stderr.write(
    "  no mainnet key for bingx-x01: set BINGX_X01_API_KEY / BINGX_X01_SECRET (the launcher maps BINGX_API_KEY into them)\n",
  );
  process.exit(2);
}
process.stdout.write(`  api key: …${keys.apiKey.slice(-4)} (${keys.apiKey.length} chars)\n`);

try {
  const acct = await fetchAccount(NETWORK, CONN);
  if (!acct) {
    process.stderr.write("  balance: reply carried no USDT balance row (key valid but empty, or wrong account)\n");
  } else {
    const f = (v) => (v === null || v === undefined ? "n/a" : Number(v).toFixed(4));
    process.stdout.write(
      `  balance USDT: wallet ${f(acct.wallet)}, equity ${f(acct.equity)}, available margin ${f(acct.availableMargin)}, ` +
        `unrealized ${f(acct.unrealized)}, used margin ${f(acct.usedMargin)}\n`,
    );
  }

  const book = await fetchBook(NETWORK, CONN);
  // the book's positions are normalised ({ symbol, side, qty }); a raw reply carries positionAmt / amount
  const positions = (book.positions ?? []).filter((p) => Math.abs(Number(p.qty ?? p.positionAmt ?? p.amount ?? 0)) > 0);
  process.stdout.write(`  open positions: ${positions.length}\n`);
  for (const p of positions.slice(0, 50)) {
    process.stdout.write(`    ${JSON.stringify(p)}\n`);
  }
  process.stdout.write("  OK: mainnet key authenticates and the account is readable.\n");
} catch (e) {
  process.stderr.write(`  account read failed: ${e instanceof Error ? e.message : e}\n`);
  process.exit(1);
}
