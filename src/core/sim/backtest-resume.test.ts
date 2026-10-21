import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { simulate, simulateFrom, type SimState } from "./backtest.ts";
import { barsFromCandles } from "../market/bars.ts";
import { rng } from "../test-support.ts";
import type { Candle, Protect } from "../domain/types.ts";

const M = 60_000;
const COST = 0.002;

function walk(seed: number, n: number): Candle[] {
  const r = rng(seed);
  let px = 100;
  const out: Candle[] = [];
  for (let i = 0; i < n; i++) {
    const o = px;
    const c = o * (1 + (r() - 0.5) * 0.012);
    const h = Math.max(o, c) * (1 + r() * 0.004);
    const l = Math.min(o, c) * (1 - r() * 0.004);
    out.push({ t: i * 5 * M, o, h, l, c, v: 1 });
    px = c;
  }
  return out;
}
function signals(seed: number, n: number, mixed: boolean): Int8Array {
  const r = rng(seed);
  const s = new Int8Array(n);
  for (let i = 0; i < n; i++) {
    const x = r();
    if (x < 0.06) s[i] = mixed && r() < 0.5 ? -1 : 1;
  }
  return s;
}

const PROTECTS: Record<string, Protect> = {
  normal: { tp: 0.012, sl: 0.01, trail: 0, hold: 30 },
  trailing: { tp: 0.03, sl: 0.01, trail: 0.006, hold: 60, trailStep: 0.8 },
  trailFree: { tp: 0.02, sl: 0.008, trail: 0.004, hold: 80, trailFree: true },
  atr: { tp: 0.02, sl: 0.01, trail: 0.005, hold: 40, atr: { sl: 1.5, tpRatio: 2, trail: 1 } },
};
for (const exitSet of ["static-sl", "adaptive-sl", "trailing", "trailing-only", "breakeven"] as const)
  PROTECTS[`historic-${exitSet}`] = {
    tp: exitSet === "trailing-only" ? 0 : 0.02, sl: 0.01,
    trail: exitSet.startsWith("trailing") ? 0.004 : 0, hold:60,
    exitType:"historic",exitSet,...(exitSet === "trailing-only" ? {trailOnly:true} : {}),
  };

describe("simulateFrom resumes simulate", () => {
  for (const [name, p] of Object.entries(PROTECTS))
    for (const cooldown of [0, 3])
      for (const side of ["long", "mixed"]) {
        it(`${name} cooldown ${cooldown} ${side}: any split equals one run`, () => {
          const n = 600;
          const cs = walk(7 + cooldown, n);
          const sig = signals(11, n, side === "mixed");
          // one direction per run, as the engine runs them
          const sg = side === "mixed" ? sig.map((x) => (x > 0 ? x : 0)) : sig;
          const full = simulate("c", barsFromCandles("X", 5, cs), sg, p, { cost: COST, cooldown });
          assert.ok(full.trades.length >= 8, `fixture trades ${full.trades.length}`);
          for (const k of [1, 2, 37, 120, 299, 300, 301, 450, 598, 599, 600]) {
            const part = simulateFrom(
              "c",
              barsFromCandles("X", 5, cs.slice(0, k)),
              sg.slice(0, k),
              p,
              { cost: COST, cooldown },
            );
            // several extensions in a row (1 bar at a time, then the rest)
            let state: SimState = part.state;
            const trades = [...part.trades];
            let last = part as ReturnType<typeof simulateFrom>;
            for (const m of [Math.min(n, k + 1), Math.min(n, k + 2), n]) {
              if (m < state.i0) continue;
              last = simulateFrom(
                "c",
                barsFromCandles("X", 5, cs.slice(0, m)),
                sg.slice(0, m),
                p,
                { cost: COST, cooldown },
                state,
              );
              trades.push(...last.trades);
              state = last.state;
            }
            assert.deepEqual(trades, [...full.trades], `trades at split ${k}`);
            assert.deepEqual(last.open, full.open, `open at split ${k}`);
            assert.equal(last.pending, full.pending, `pending at split ${k}`);
            assert.deepEqual(last.pendingProtect, full.pendingProtect);
          }
        });
      }

  it("simulate is unchanged by the state plumbing (no state field)", () => {
    const cs = walk(3, 200);
    const r = simulate("c", barsFromCandles("X", 5, cs), signals(5, 200, false), PROTECTS.normal, {
      cost: COST,
    });
    assert.equal("state" in r, false);
  });

  it("refuses a sink run", () => {
    const cs = walk(3, 50);
    assert.throws(() =>
      simulateFrom("c", barsFromCandles("X", 5, cs), signals(5, 50, false), PROTECTS.normal, {
        cost: COST,
        sink: () => undefined,
      }),
    );
  });
});


it("historic legacy resume restores the captured protection and refuses an unproven replacement", () => {
  const p=PROTECTS["historic-trailing"],cs=walk(7,600),sig=signals(11,600,false);
  let part: ReturnType<typeof simulateFrom> | undefined;
  for(let k=2;k<100;k++) {
    const x=simulateFrom("c",barsFromCandles("X",5,cs.slice(0,k)),sig.slice(0,k),p,{cost:COST});
    if(x.state.inPos && x.state.exitProtection){part=x;break}
  }
  assert.ok(part,"an open historic position is captured");
  const legacy=structuredClone(part.state);delete legacy.exitPosition;delete legacy.trailPosition;
  const resumed=simulateFrom("c",barsFromCandles("X",5,cs),sig,p,{cost:COST},legacy);
  const full=simulate("c",barsFromCandles("X",5,cs),sig,p,{cost:COST});
  assert.deepEqual([...part.trades,...resumed.trades],full.trades);assert.deepEqual(resumed.open,full.open);
  delete legacy.exitProtection;
  assert.throws(()=>simulateFrom("c",barsFromCandles("X",5,cs),sig,p,{cost:COST},legacy),/missing its protection state/);
});
