import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { priceChange1h5m, rankUniverse, type Ticker, type fetchKlines } from "./bingx.ts";
import { checkSettings } from "../settings-check.ts";
import { SYMBOL_RANK_CHOICES } from "../config.ts";
import type { Candle } from "../domain/types.ts";

const M = 60_000, CUT = Date.UTC(2026, 9, 21, 12);
const bars = (change: number, cut = CUT): Candle[] => Array.from({length:13}, (_, i) => {
  const c = i === 0 ? 100 : 100 * (1 + change);
  return {t:cut - (65 - i * 5) * M,o:c,h:c,l:c,c,v:1};
});
const ticker = (sym: string, quoteVol = 10e6, changePct = 0): Ticker => ({sym,last:100,quoteVol,changePct});

describe("exchange mean absolute 5m price-distance ranking over one hour", () => {
  it("uses an explicit historical clock independently of today's time and isolates cached intervals", async () => {
    const calls: number[] = [];
    const feed: typeof fetchKlines = async (_sym, _tf, opt) => {
      calls.push(opt!.nowT!); return bars(0.1, opt!.nowT);
    };
    const xs = [ticker("A-USDT")];
    assert.deepEqual(await rankUniverse(xs, 1, "change1h5m", feed, CUT), ["A-USDT"]);
    assert.deepEqual(await rankUniverse(xs, 1, "change1h5m", feed, CUT + 300_000), ["A-USDT"]);
    assert.deepEqual(calls, [CUT, CUT + 300_000]);
  });
  it("averages exactly twelve absolute five-minute percentage distances for both directions", () => {
    assert.ok(Math.abs(priceChange1h5m(bars(0.08),CUT)! - 0.08/12) < 1e-12);
    assert.ok(Math.abs(priceChange1h5m(bars(-0.12),CUT)! - 0.12/12) < 1e-12);
    const roundTrip = bars(0);
    roundTrip[6].c = 110;
    assert.ok(Math.abs(priceChange1h5m(roundTrip,CUT)! - (0.1 + 10/110)/12) < 1e-12, "a flat one-hour net move still retains both five-minute distances");
    const smoothed = bars(0);
    smoothed.at(-1)!.c = 110;
    assert.ok(Math.abs(priceChange1h5m(smoothed,CUT)! - 0.1/12) < 1e-12, "one 10% interval contributes 10% /12 to the hourly average");
  });
  it("ignores forming/future bars and rejects gaps, duplicates, stale or invalid evidence", () => {
    const cs=bars(0.1);
    assert.equal(priceChange1h5m([...cs,{...cs[0],t:CUT,c:1e6}],CUT),priceChange1h5m(cs,CUT));
    for (const bad of [cs.slice(1),[...cs.slice(0,12),cs[11]],cs.map((c,i)=>i===6?{...c,c:NaN}:c),cs.map((c,i)=>i===12?{...c,c:0}:c)])
      assert.equal(priceChange1h5m(bad,CUT),null);
    assert.equal(priceChange1h5m(cs,CUT + M),null);
    assert.equal(priceChange1h5m(cs,CUT + 5*M),null);
  });
  it("ranks absolute hourly moves independently of the 24h ticker change, excludes stable pairs and keeps deterministic ties", async (t) => {
    t.mock.method(Date,"now",()=>CUT + 4*M);
    const changes: Record<string,number> = {"A-USDT":0.03,"B-USDT":-0.09,"C-USDT":0.03};
    const calls: string[]=[];
    const feed: typeof fetchKlines = async (sym,tf,opt) => {
      calls.push(sym); assert.equal(tf,5);
      assert.deepEqual(opt,{startT:CUT-65*M,endT:CUT-1,nowT:CUT,limit:13});
      return bars(changes[sym]);
    };
    const xs=[ticker("A-USDT",10e6,-99),ticker("B-USDT",9e6,0),ticker("C-USDT",11e6,99),ticker("USDC-USDT",1e9,100)];
    assert.deepEqual(await rankUniverse(xs,3,"change1h5m",feed),["B-USDT","C-USDT","A-USDT"]);
    assert.equal(calls.length,3);
    assert.deepEqual(xs.map((x)=>x.sym),["A-USDT","B-USDT","C-USDT","USDC-USDT"],"input is unchanged");
  });
  it("batches at most four reads, shares in-flight and completed requests, and refreshes after the next completed 5m interval", async (t) => {
    let now=CUT+M, active=0, max=0, calls=0;
    t.mock.method(Date,"now",()=>now);
    const feed: typeof fetchKlines = async (_sym,_tf,opt) => {
      calls++; max=Math.max(max,++active);
      await new Promise((r)=>setImmediate(r)); active--;
      return bars(0.01,opt!.nowT);
    };
    const xs=Array.from({length:12},(_,i)=>ticker(`S${i}-USDT`));
    const [a,b]=await Promise.all([rankUniverse(xs,12,"change1h5m",feed),rankUniverse(xs,12,"change1h5m",feed)]);
    assert.deepEqual(a,b); assert.equal(calls,12); assert.ok(max<=4);
    await rankUniverse(xs,12,"change1h5m",feed); assert.equal(calls,12);
    now=CUT+5*M;
    await rankUniverse(xs,12,"change1h5m",feed); assert.equal(calls,24);
  });
  it("never substitutes 24h changes for missing hourly history or calls the venue for volume ranking", async (t) => {
    t.mock.method(Date,"now",()=>CUT);
    let calls=0;
    const feed: typeof fetchKlines = async (sym) => {calls++;return sym==="A-USDT"?bars(0.01):[];};
    const xs=[ticker("A-USDT"),ticker("B-USDT",9e6,1000)];
    await assert.rejects(rankUniverse(xs,2,"change1h5m",feed),/complete history for 1\/2/);
    assert.deepEqual(await rankUniverse(xs,1,"change1h5m",feed),["A-USDT"]);
    assert.deepEqual(await rankUniverse(xs,2,"volume",feed),["A-USDT","B-USDT"]);
    assert.equal(calls,2);
  });
  it("accepts and exposes the option in engine and saved-preset settings", () => {
    assert.doesNotThrow(()=>checkSettings({symbolRank:"change1h5m"}));
    assert.ok(SYMBOL_RANK_CHOICES.some((r)=>r.id==="change1h5m"));
    assert.throws(()=>checkSettings({symbolRank:"change1h5m-unknown" as never}),/ranking/);
  });
});
