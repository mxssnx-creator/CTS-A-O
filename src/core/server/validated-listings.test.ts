import { test } from "node:test";
import assert from "node:assert/strict";
import { CoreRuntime } from "./runtime.server.ts";
import { CoreDb } from "./db.server.ts";
import { makeTape } from "../sim/walkforward.ts";
import type { Trade } from "../domain/types.ts";

test("runtime reloads and settings patches cannot re-enable pool seating", () => {
  const db = new CoreDb(":memory:");
  db.kvSet("wf", { seatSet: "pool" });
  const rt = new CoreRuntime(db, {}, { market: "synthetic" });
  try {
    assert.equal(rt.wf.seatSet, "validated", "a legacy saved pool cannot re-seat unvalidated candidates");
    rt.updateSettings({}, { seatSet: "pool" });
    assert.equal(rt.wf.seatSet, "validated", "an explicit runtime patch cannot bypass validated V");
    assert.equal(db.kvGet<{ seatSet?: string }>("wf")?.seatSet, "validated");
  } finally { rt.dispose(); }
});

test("listing PF and quantities contain only Last-N validated sets, excluding unvalidated probe seats", () => {
  const rt = new CoreRuntime(new CoreDb(":memory:"), {}, { market: "synthetic" });
  const t = Date.UTC(2026, 9, 17, 21);
  const ind = "inverse-known-trend-ema@m1";
  const pair = `follow|${ind}`;
  const tape = (win: boolean) => {
    const id = `${pair}|tp${win ? 1 : 2}|sl1|tr0|h60|mn`;
    const trades: Trade[] = Array.from({ length: 100 }, (_, i) => ({
      cfg: id, sym: "BTC-USDT", side: 1, entryT: t - (102 - i) * 60000,
      exitT: t - (101 - i) * 60000, entry: 100, exit: win ? 101 : 99,
      r: win ? .01 : -.01, mult: 1, reason: "time", bars: 1, mfe: 0, mae: 0,
    }));
    return makeTape(id, "follow", ind, {tp:.01,sl:.01,trail:0,hold:60,tag:"mn"}, "normal", ["BTC-USDT"], trades, [], []);
  };
  try {
    const good = tape(true), bad = tape(false);
    rt.tapes = [good, bad];
    rt.wf = {...rt.wf, probe:{perRange:1}, basePassed:new Set([pair]), basePassedRanges:{[pair]:["mn"]}};
    const internal = rt as unknown as {lastSelection: unknown; lastSelectionAt: number; buildListings(): void};
    internal.lastSelection = { eligible:2, picks:[good,bad].map((tp) => ({id:tp.id,score:1,window:{n:100,pf:tp===good?4:0,net:tp===good?100:-100,gp:tp===good?1:0,gl:tp===good?0:1,ddt:0}})) };
    internal.lastSelectionAt = t;
    internal.buildListings();
    const listing = rt.listings!;
    assert.deepEqual(listing.validated.map((r) => r.id), [good.id]);
    assert.equal(listing.candidates.length, 2);
    assert.equal(listing.byGroup.Minimal.calculated, 2);
    assert.equal(listing.byGroup.Minimal.rows.length, 1);
    assert.equal(listing.byGroup.Minimal.gl, 0, "a rejected probe loss never enters validated PF");
    assert.deepEqual(rt.status.listings?.byKind, [{
      kind: "normal", validated: 1, calculated: 2, validationCloses: 100,
      gp: 1, gl: 0, pf: null, noLoss: true,
    }], "Active counts and PF include validated configs only; pool candidates remain separate");
    assert.equal(listing.validation.engineLastN, rt.wf.validLastN);
    assert.equal(listing.validation.rangeLastN, rt.wf.rangeGate!.lastN);
    assert.equal(listing.validation.at, t);
  } finally { rt.dispose(); }
});
