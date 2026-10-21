// The live step's proofs (engine + signal) are rebuilt from the paper book's closes whenever a close lands. Read in one
// piece that held the main thread 0.2–1.2 s at 50–150 k closes (x01: "stall 1.2–1.7 s (Real · live tickers)", the label
// of the step's phase while the proofs were built). They are now rebuilt in slices (warmProofs) that the step awaits;
// the result is the one the single read gave, to the last tie.
import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { CoreRuntime } from "./runtime.server.ts";
import { CoreDb } from "./db.server.ts";
import { liveRecords } from "../live-record.ts";
import { engineProven, signalProven } from "../live-validation.ts";
import { OWN_CLOSE_SQL } from "../relation.ts";
import { trackRuntimes } from "../test-support.ts";

const N = Number(process.env.CTS_STALL_TEST_ROWS ?? 60_000);
const T = trackRuntimes();
after(() => T.disposeAll());

function fill(db: CoreDb, n = N) {
  db.run("BEGIN");
  for (let i = 0; i < n; i++) {
    const sig = i % 5 === 0;
    const cfg = `n|${sig ? "sig-x" + (i % 40) : "ind" + (i % 30)}|c${i % 400}`;
    // exit times repeat inside a config (ties): the proofs' order of ties follows the scan order
    db.run(
      "INSERT OR REPLACE INTO paper_book_trades (cfg,sym,side,entry_t,exit_t,r,vol,reason,mult) VALUES (?,?,?,?,?,?,?,?,?)",
      cfg, `S${i % 70}-USDT`, i % 2 ? 1 : -1, 1e12 + i * 1000, 1e12 + Math.floor(i / 7) * 3_600_000, Math.sin(i * 1.7) * 0.02,
      i % 11 === 0 ? null : 1, i % 97 === 0 ? "dropped" : "exit", i % 13 === 0 && ((sig && i % 40 === 0) || (!sig && i % 30 === 1)) ? null : 1,
    );
  }
  for (let i = 0; i < 4000; i++)
    db.run(
      "INSERT OR REPLACE INTO live_lane_trades (id,exit_t,cfg,sym,side,entry_t,r,reason) VALUES (?,?,?,?,?,?,?,?)",
      `id${i}`, 1e12 + Math.floor(i / 3), `n|${i % 2 ? "sig-x" + (i % 40) : "ind" + (i % 30)}|c${i % 400}`, `S${i % 70}-USDT`, 1, 1e12, 0.01 - (i % 3) * 0.01, "exit",
    );
  db.run("COMMIT");
}
const runtime = () =>
  T.track(
    new CoreRuntime(new CoreDb(":memory:"), { symbols: 1, live: { engineProofN: 25, signalProofN: 25 } } as never, {
      market: "synthetic",
      priceStream: null,
    }),
  );

/** the longest stretch the main thread is not given back while `work` runs */
async function worstSlice(work: () => Promise<void> | void): Promise<number> {
  let worst = 0;
  let last = performance.now();
  let stop = false;
  const tick = () => {
    const now = performance.now();
    worst = Math.max(worst, now - last);
    last = now;
    if (!stop) setImmediate(tick);
  };
  setImmediate(tick);
  await new Promise((r) => setImmediate(r));
  last = performance.now();
  await work();
  stop = true;
  await new Promise((r) => setImmediate(r));
  return worst;
}

/** the former single reads, kept here as the reference */
function reference(rt: CoreRuntime) {
  const db = rt.db;
  const unit = "CASE WHEN mult > 0 AND mult <= 1.7976931348623157e308 THEN r / mult ELSE NULL END AS r";
  const rows = db.all<{ cfg: string; exit_t: number | null; r: number }>(
    `SELECT cfg, exit_t, ${unit} FROM paper_book_trades WHERE reason != 'dropped' AND r IS NOT NULL`,
  );
  const exRows = db
    .all<{ id: string; cfg: string; sym: string | null; side: number | null; exit_t: number; r: number }>(
      `SELECT id, cfg, sym, side, exit_t, r FROM live_lane_trades WHERE exit_t >= ? AND ${OWN_CLOSE_SQL}`,
      0,
    )
    .map((x) => ({ id: x.id, cfg: x.cfg, sym: x.sym ?? "", side: x.side ?? 0, exitT: x.exit_t, r: x.r }));
  const now = Date.now();
  const engine = engineProven(
    liveRecords(rows.filter((x) => x.exit_t !== null).map((x) => ({ cfg: x.cfg, exitT: x.exit_t!, r: x.r }))),
    liveRecords(exRows),
    now, 25, 1.2,
  );
  const sigRows = db.all<{ cfg: string; sym: string; side: number; entry_t: number; exit_t: number | null; r: number }>(
    `SELECT cfg, sym, side, entry_t, exit_t, ${unit} FROM paper_book_trades WHERE reason != 'dropped' AND r IS NOT NULL AND cfg LIKE '%|sig-%'`,
  );
  const signal = signalProven(
    sigRows.filter((x) => x.exit_t !== null).map((x) => ({ id: String(x.entry_t), cfg: x.cfg, sym: x.sym, side: x.side, exitT: x.exit_t!, r: x.r })),
    exRows, now, { n: 25, minPf: 1.2, minEvents: 2 },
  );
  return { engine, signal };
}
const sorted = (s: Set<string>) => [...s].sort();

describe("live step proofs in slices", () => {
  it("rebuilding after a close: no slice over 100 ms, and the proofs of the single read", async () => {
    const rt = runtime();
    fill(rt.db);
    const ref = reference(rt);
    assert.ok(ref.engine.judged > 0 && ref.signal.judged > 0, "the fixture judges configs");
    // (the least of three rebuilds: a collector pause of the machine in one run is not the code's slice)
    let worst = Infinity;
    for (let k = 0; k < 3; k++) {
      if (k) rt.db.run("UPDATE paper_book_trades SET r = r + 0.0000001 WHERE entry_t = 1000000001000");
      const w = await worstSlice(async () => {
        // what the live step does before it reads the proofs
        await (rt as unknown as { warmProofs?: () => Promise<void> }).warmProofs?.();
        rt.engineProof();
        rt.signalProof();
      });
      worst = Math.min(worst, w);
    }
    const e = rt.engineProof()!, s = rt.signalProof()!;
    assert.deepEqual(sorted(e.proven), sorted(ref.engine.proven));
    assert.equal(e.judged, ref.engine.judged);
    assert.deepEqual(sorted(s.proven), sorted(ref.signal.proven));
    assert.equal(s.judged, ref.signal.judged);
    console.log(`proofs rebuild at ${N} closes: worst slice ${worst.toFixed(0)} ms`);
    assert.ok(worst < 100, `a ${worst.toFixed(0)} ms slice`);
  });

  it("a close landing while the rebuild yields: the proofs follow the book, never an older one", async () => {
    const rt = runtime();
    fill(rt.db, 20_000);
    const warm = (rt as unknown as { warmProofs: () => Promise<void> }).warmProofs.call(rt);
    // a streak of wins for one engine config lands between two slices
    await new Promise((r) => setImmediate(r));
    for (let i = 0; i < 30; i++)
      rt.db.run(
        "INSERT OR REPLACE INTO paper_book_trades (cfg,sym,side,entry_t,exit_t,r,vol,reason,mult) VALUES (?,?,?,?,?,?,?,?,?)",
        "n|ind1|zz", "S1-USDT", 1, 1.7e12 + i, 1.7e12 + 1000 + i, 0.03, 1, "exit", 1,
      );
    await warm;
    await (rt as unknown as { warmProofs: () => Promise<void> }).warmProofs.call(rt);
    assert.ok(rt.engineProof()!.proven.has("n|ind1|zz"), "the new streak is proven");
    assert.deepEqual(sorted(rt.engineProof()!.proven), sorted(reference(rt).engine.proven));
  });

  it("the loop lag is reported per slice: the worst slice of the last 60 s and where it ran", async () => {
    const rt = runtime();
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    await sleep(150);
    rt.livePhase = "lane filter";
    // The monitor reports lateness beyond its 100 ms sample interval. A 120 ms injected stall
    // could legitimately report only70 ms when it begins halfway through that interval. Inject >2 intervals
    // so every timer phase produces at least100 ms delay; keep the same reporting bounds.
    for (const end = performance.now() + 220; performance.now() < end; ) { /* a slice that holds the loop */ }
    await sleep(150);
    const r = rt.status.loop.recent;
    assert.ok(r && r.ms >= 90 && r.ms < 400, JSON.stringify(rt.status.loop));
    assert.match(r.where, /live lane filter/);
  });
});
