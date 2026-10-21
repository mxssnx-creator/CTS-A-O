import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import {
  MICRO_CONTEXT_METHODS,
  MICRO_CONFIG_IDS,
  microFamilySpecs,
  inverseMicroSpecs,
  microAnchorTf,
  microFrame,
} from "./micro-family.ts";
import { tacticState } from "./tactic.ts";
import { barsFromCandles, resample, syntheticCandles, headBars } from "../market/bars.ts";
import { makeUniverse } from "../pipeline/pipeline.ts";
import { DEFAULT_SETTINGS } from "../config.ts";
import { PRE_CONTEXT_FOCUS_21OCT } from "./context-default-focus.ts";
const end = Date.UTC(2026, 9, 1);
const bars = ["A", "B", "C"].flatMap((sym) => {
  const c = syntheticCandles(sym, 1, 2700, end, 17);
  return [1, 5, 15].map((tf) => ({
    ...barsFromCandles(`${sym}-USDT`, tf, resample(c, 1, tf)),
    lanes: [1, 5, 15],
  }));
});
const child = (id: string) => MICRO_CONTEXT_METHODS.some((m) => id.includes(`-${m}-`));
const agree = (a: number, b: number) => (a !== 0 && a === b ? a : 0);

test("112 context identities join the ordinary factory focus without changing any original source state", () => {
  assert.equal(MICRO_CONFIG_IDS.filter(child).length, 56);
  assert.equal(PRE_CONTEXT_FOCUS_21OCT.length, 1079);
  assert.equal(DEFAULT_SETTINGS.focus.length, 1191);
  assert.ok(PRE_CONTEXT_FOCUS_21OCT.every((id) => DEFAULT_SETTINGS.focus.includes(id)));
  const u = makeUniverse(bars),
    h = createHash("sha256");
  let cases = 0;
  for (const spec of microFamilySpecs().filter((s) => !child(s.id)))
    for (const k of u.caches)
      if (k.b.tfMin === microAnchorTf(spec.id)) {
        h.update(spec.id + "|" + k.b.sym);
        h.update(spec.fn(k));
        cases++;
      }
  // Generated independently from the complete pre-change module at procedure checkpoint41c9689.
  assert.equal(cases, 1302);
  assert.equal(h.digest("hex"), "f922d86a5aebf8dfb55d0c4c7d322920a38b08727f880508ff19fcd6ee6d2ccf");
});

test("every child requires a nonzero causal parent/context agreement and both directions actually fire", () => {
  const u = makeUniverse(bars),
    counts = new Map(MICRO_CONTEXT_METHODS.map((m) => [m, [0, 0]]));
  for (const k of u.caches)
    for (const profile of ["fast", "selective"] as const) {
      const f = microFrame(k, profile),
        range = profile === "fast" ? "short" : "medium";
      const adaptive = tacticState(k, "adaptive", range),
        trend = tacticState(k, "trend", range);
      for (let i = 0; i < k.b.n; i++) {
        assert.equal(
          f.states["break-close-tactic"][i],
          agree(f.states["break-close"][i], adaptive[i]),
        );
        assert.equal(
          f.states["break-retest-tactic"][i],
          agree(f.states["break-retest"][i], trend[i]),
        );
        for (const m of MICRO_CONTEXT_METHODS) {
          const s = f.states[m][i];
          assert.ok(s === -1 || s === 0 || s === 1);
          if (s) counts.get(m)![s > 0 ? 0 : 1]++;
        }
        if (f.states["activity-acceleration-relative"][i])
          assert.equal(
            f.states["activity-acceleration-relative"][i],
            f.states["activity-acceleration"][i],
          );
        if (f.states["break-retest-market"][i])
          assert.equal(f.states["break-retest-market"][i], f.states["break-retest"][i]);
      }
    }
  for (const [method, [long, short]] of counts)
    assert.ok(long > 0 && short > 0, `${method}: non-vacuous long/short coverage`);
  // Relative and market children have no evidence in a single-symbol universe.
  for (const k of makeUniverse(bars.filter((b) => b.sym === "A-USDT")).caches) {
    const f = microFrame(k, "fast");
    assert.ok(f.states["activity-acceleration-relative"].every((s) => s === 0));
    assert.ok(f.states["break-retest-market"].every((s) => s === 0));
  }
});

test("all context subsets and inverses retain closed-prefix causality, including unfinished higher bars", () => {
  const u = makeUniverse(bars),
    full = new Map<string, Int8Array>();
  const specs = [...microFamilySpecs(), ...inverseMicroSpecs()].filter((s) => child(s.id));
  assert.equal(specs.length, 112);
  for (const spec of specs)
    for (const k of u.caches)
      if (k.b.tfMin === microAnchorTf(spec.id)) full.set(spec.id + "|" + k.b.sym, spec.fn(k));
  for (const minutes of [7, 17, 37]) {
    const prefix = makeUniverse(bars.map((b) => headBars(b, end - 6 * 3600000 + minutes * 60000)));
    for (const spec of specs)
      for (const k of prefix.caches)
        if (k.b.tfMin === microAnchorTf(spec.id)) {
          const got = spec.fn(k),
            expected = full.get(spec.id + "|" + k.b.sym)!;
          assert.deepEqual(got, expected.slice(0, got.length), `${spec.id}/${k.b.sym}/${minutes}`);
        }
  }
  const mirrors = new Map(inverseMicroSpecs().map((s) => [s.id, s]));
  for (const s of microFamilySpecs().filter((s) => child(s.id)))
    for (const k of u.caches)
      if (k.b.tfMin === microAnchorTf(s.id))
        assert.deepEqual(
          mirrors.get(`inverse-${s.id}`)!.fn(k),
          Int8Array.from(s.fn(k), (v) => -v),
        );
});
