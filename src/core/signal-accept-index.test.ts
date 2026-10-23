import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";
import { acceptKey, SignalAcceptIndex, type AcceptTape } from "./signals.ts";

const H = 3_600_000;
type Columns = { t: Float64Array; gp: Float64Array; gl: Float64Array; cn: Int32Array };
function columns(index: SignalAcceptIndex) {
  return (index as unknown as { groups: Map<string, Columns> }).groups;
}
function digest(index: SignalAcceptIndex) {
  const hash = createHash("sha256");
  for (const [key, group] of [...columns(index)].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) {
    hash.update(key);
    for (const col of [group.t, group.gp, group.gl, group.cn])
      hash.update(Buffer.from(col.buffer, col.byteOffset, col.byteLength));
  }
  return hash.digest("hex");
}
function tape(id = "config-a", kind = "normal"): AcceptTape {
  return { id, ind: "sig-ema-cross-fast-s@m5", kind, syms: ["A-USDT", "B-USDT"], n: 12,
    symI: new Uint16Array([0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1]),
    side: new Int8Array([1, -1, 1, -1, 1, -1, 1, -1, 1, -1, 1, -1]),
    exitT: new Float64Array([H, H, H, H, 2 * H, 2 * H, 2 * H, 2 * H, 3 * H, 3 * H, 3 * H, 3 * H]),
    entryT: new Float64Array([0, 0, 0, 0, 0, 0, 0, 0, H, H, H, H]),
    r: new Float64Array([.01, -.01, .02, -.02, -.005, .005, -.01, .01, .004, -.004, .008, -.008]),
  };
}
/** Empty duplicate identities force the existing generic path without adding any return samples. */
function generic(tapes: AcceptTape[]) {
  return new SignalAcceptIndex([...tapes, ...tapes.map((tp) => ({ ...tp, n: 0 }))]);
}
function reordered(tp: AcceptTape, order: number[]): AcceptTape {
  const field = (name: "symI" | "side" | "exitT" | "entryT" | "r") => order.map((i) => tp[name]![i]);
  return { ...tp, n: order.length, symI: field("symI"), side: field("side"), exitT: field("exitT"),
    entryT: tp.entryT ? field("entryT") : undefined, r: field("r") };
}

describe("exact Signal acceptance prefix fast path", () => {
  it("lazily reconstructs exact causal windows, partial-close counts and forked updates without expanding every context", () => {
    const a = tape("long|config%with|separators"), b = tape("b", "trailing");
    const lazy = new SignalAcceptIndex([a, b], true), eager = new SignalAcceptIndex([a, b]);
    assert.equal(columns(lazy).size, 0, "registered tapes do not allocate expanded prefixes");
    for (const key of columns(eager).keys())
      for (const time of [H - 1, H, H + 1, 2 * H, 3 * H, 4 * H])
        for (const hours of [1 / 60, .5, 1, 2, 6])
          assert.deepEqual(lazy.stats(key, time, hours), eager.stats(key, time, hours));
    const next = lazy.fork(), changed = { ...a, r: new Float64Array(a.n).fill(-.02) };
    for (const _ of next.fill([changed]));
    const rebuilt = new SignalAcceptIndex([changed, b]);
    for (const key of columns(eager).keys()) {
      assert.deepEqual(next.stats(key, 4 * H, 6), rebuilt.stats(key, 4 * H, 6));
      assert.deepEqual(lazy.stats(key, 4 * H, 6), eager.stats(key, 4 * H, 6), "old generation is unchanged");
    }
    const unordered = reordered(a, [8, 9, 10, 11, 0, 1, 2, 3, 4, 5, 6, 7]);
    for (const _ of next.fill([unordered]));
    for (const key of columns(eager).keys())
      assert.deepEqual(next.stats(key, 4 * H, 6), eager.stats(key, 4 * H, 6), "generic refresh replaces lazy source");
  });

  it("evicts derived groups without losing evidence or changing a reconstructed result", () => {
    const tapes = Array.from({ length: 4200 }, (_, i) => tape(`cfg-${i}`));
    const lazy = new SignalAcceptIndex(tapes, true);
    for (const tp of tapes) lazy.stats(acceptKey(tp.ind, tp.syms[0], 1, tp.kind, tp.id), 3 * H, 6);
    const state = lazy as unknown as { cached: Map<string, unknown>; cachedBytes: number };
    assert.ok(state.cached.size <= 4096);
    assert.ok(state.cachedBytes <= 32 * 1024 * 1024);
    const first = acceptKey(tapes[0].ind, tapes[0].syms[0], 1, tapes[0].kind, tapes[0].id);
    assert.equal(state.cached.has(first), false, "oldest derived group was released");
    assert.deepEqual(lazy.stats(first, 3 * H, 6), { n: 2, pf: 2.8 });
  });

  it("matches every generic prefix byte and causal window with both directions, repeated onsets and partial closes", () => {
    const normal = tape();
    const trailing = tape("config-b", "trailing");
    const tapes = [normal, trailing, { ...tape("empty"), n: 0 }, { ...tape("retained"), heldOnly: true }];
    const direct = new SignalAcceptIndex(tapes), reference = generic(tapes);
    assert.equal(digest(direct), digest(reference));
    assert.equal(columns(direct).size, 8, "empty and retained exit-only configs create no qualification groups");
    for (const key of columns(direct).keys())
      for (const t of [H - 1, H, 2 * H, 3 * H, 4 * H])
        for (const hours of [.5, 1, 2, 6])
          assert.deepEqual(direct.stats(key, t, hours), reference.stats(key, t, hours));
    const own = acceptKey(normal.ind, "A-USDT", 1, normal.kind, normal.id);
    assert.deepEqual(direct.stats(own, 3 * H, 6), { n: 2, pf: 2.8 });
    assert.deepEqual([...columns(direct).get(own)!.cn], [0, 1, 1, 2], "partial closes all affect PF but an onset counts once");
  });

  it("falls back for duplicate exact configs and merges their interleaved closes with stable onset de-duplication", () => {
    const original = tape();
    const first = reordered(original, [0, 1, 2, 3, 8, 9, 10, 11]);
    const second = reordered(original, [4, 5, 6, 7]);
    const merged = new SignalAcceptIndex([first, second]);
    assert.equal(digest(merged), digest(generic([original])));
    const own = acceptKey(original.ind, "A-USDT", 1, original.kind, original.id);
    assert.deepEqual(merged.stats(own, 3 * H, 6), { n: 2, pf: 2.8 });
  });

  it("retains generic sorting for unordered exact tapes and pooled diagnostics", () => {
    const original = tape();
    const unordered = reordered(original, [8, 9, 10, 11, 0, 1, 2, 3, 4, 5, 6, 7]);
    assert.equal(digest(new SignalAcceptIndex([unordered])), digest(generic([original])));
    const pooled = { ...unordered, id: undefined };
    const direct = new SignalAcceptIndex([pooled]);
    assert.equal(digest(direct), digest(generic([pooled])));
    const own = acceptKey(pooled.ind, "A-USDT", 1, pooled.kind);
    assert.deepEqual(direct.stats(own, 3 * H, 6), { n: 2, pf: 2.8 });
  });

  it("counts every close without onset evidence and leaves unit returns independent of execution volumes", () => {
    const { entryT: _entry, ...bare } = tape();
    const weighted = { ...bare, vol: new Float64Array(12).fill(100), mult: new Float64Array(12).fill(10) };
    const direct = new SignalAcceptIndex([weighted]);
    assert.equal(digest(direct), digest(generic([weighted])));
    const own = acceptKey(bare.ind, "A-USDT", 1, bare.kind, bare.id);
    assert.deepEqual(direct.stats(own, 3 * H, 6), { n: 3, pf: 2.8 }, "the tape already supplies canonical unit net returns");
  });

  it("retains duplicate-symbol alias aggregation and excludes retained duplicates from eligibility", () => {
    const original = tape();
    const aliased = { ...original, syms: ["A-USDT", "A-USDT"] };
    assert.equal(digest(new SignalAcceptIndex([aliased])), digest(generic([aliased])));
    const lazy = new SignalAcceptIndex([aliased], true), reference = generic([aliased]);
    assert.equal(columns(lazy).size, 0, "multi-lane symbol dictionaries keep lazy bounded processing");
    for (const key of columns(reference).keys())
      for (const time of [H, H + 1, 2 * H, 3 * H, 4 * H])
        for (const hours of [1 / 60, 1, 2, 6])
          assert.deepEqual(lazy.stats(key, time, hours), reference.stats(key, time, hours));
    assert.equal(digest(new SignalAcceptIndex([original, { ...original, heldOnly: true }])), digest(generic([original])));
  });
});
