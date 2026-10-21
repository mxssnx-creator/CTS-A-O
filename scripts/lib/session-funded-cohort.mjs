// Saved simulation tapes describe virtual closes. Primary execution PF needs the report's actual funded subset.
import assert from "node:assert/strict";
import { resolve, dirname } from "node:path";
import { readSessionDump } from "./session-dump.mjs";
import { BOOK_NOTIONAL_EPS_USD } from "./book-notional.mjs";

export function fundedSessionCohort(raw, book) {
  assert.equal(book.window.startT, raw.window.startT, "Funding window start differs");
  assert.equal(book.window.endT, raw.window.endT, "Funding window end differs");
  if (raw.study?.protocolSha256)
    assert.equal(book.study?.protocolSha256, raw.study.protocolSha256, "Funding protocol differs");
  const rows = raw.trades;
  let funded,
    zero = 0,
    basis;
  if (Array.isArray(book.sizedOrders)) {
    assert.equal(book.sizedOrders.length, rows.length, "Incomplete per-close funding evidence");
    const byIndex = new Map(book.sizedOrders.map((x) => [x.closeIndex, x]));
    assert.equal(byIndex.size, rows.length, "Duplicate allocation close index");
    funded = rows.filter((x, i) => {
      const a = byIndex.get(i);
      assert.ok(a, `Missing allocation ${i}`);
      for (const k of ["cfg", "sym", "side", "entryT", "exitT"])
        assert.equal(a[k], x[k], `Funding identity ${i}: ${k}`);
      assert.ok(
        typeof a.unitNotional === "number" &&
          Number.isFinite(a.unitNotional) &&
          a.unitNotional >= 0,
        `Unknown funding ${i}`,
      );
      assert.ok(
        typeof a.volume === "number" && Number.isFinite(a.volume) && a.volume > 0,
        `Unknown funding volume ${i}`,
      );
      assert.equal(a.volume, x.vol ?? 1, `Funding volume differs ${i}`);
      assert.ok(
        typeof a.allocatedNotional === "number" &&
          Number.isFinite(a.allocatedNotional) &&
          a.allocatedNotional >= 0,
        `Unknown allocated notional ${i}`,
      );
      assert.ok(
        Math.abs(a.allocatedNotional - a.unitNotional * a.volume) <=
          1e-10 * Math.max(1, a.allocatedNotional),
        `Funding product differs ${i}`,
      );
      if (a.allocatedNotional > BOOK_NOTIONAL_EPS_USD) return true;
      zero++;
      return false;
    });
    basis = "Exact per-close native report allocation";
  } else {
    // Older reports did not retain allocations without --signal-progress. A recorded all-funded
    // sample proves membership only when there are no zero/unknown exclusions at all.
    assert.equal(
      book.total?.orders,
      rows.length,
      "Missing per-close allocation evidence for an excluded cohort",
    );
    assert.equal(book.total?.fundedOrders, rows.length, "Missing funded membership evidence");
    assert.equal(book.total?.zeroAllocatedOrders, 0, "Zero allocations require per-close evidence");
    assert.equal(book.total?.unknownAllocations, 0, "Unknown allocation cannot become funded");
    funded = rows;
    basis =
      "Archived report explicitly records every virtual close funded, zero unknown/zero exclusions";
  }
  assert.equal(book.total?.orders, funded.length, "Funded count differs from primary report");
  assert.equal(
    book.total?.fundedOrders,
    funded.length,
    "Funded membership differs from primary report",
  );
  assert.equal(book.total?.zeroAllocatedOrders, zero, "Zero allocation count differs");
  assert.equal(book.total?.unknownAllocations, 0, "Unknown ownership cannot certify execution PF");
  return {
    trades: funded,
    virtualTrades: rows,
    funding: {
      basis,
      virtualCloses: rows.length,
      fundedCloses: funded.length,
      zeroAllocatedCloses: zero,
      unknownAllocations: 0,
    },
  };
}

export async function readFundedSession(
  file,
  reportFile = resolve(dirname(file), "report/data.json"),
) {
  const raw = await readSessionDump(file, { fields: ["trades"] });
  const book = await readSessionDump(reportFile, { fields: ["sizedOrders"] });
  return { raw, book, ...fundedSessionCohort(raw, book) };
}
