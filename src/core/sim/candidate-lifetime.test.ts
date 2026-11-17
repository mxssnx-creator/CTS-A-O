import { it } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

it("releasing processed Real candidates preserves every settled order, deduplicated feed and step diagnostic", () => {
  const root = fileURLToPath(new URL("../../../", import.meta.url));
  const script = fileURLToPath(new URL("../../../scripts/perf/candidate-lifetime-bench.ts", import.meta.url));
  const r = JSON.parse(execFileSync(process.execPath, [
    "--expose-gc", "--experimental-strip-types", "--no-warnings", script, root, "--small",
  ], { cwd: root, encoding: "utf8", maxBuffer: 1024 * 1024 }));
  // Every config/symbol/direction has thirty causal warm-up closes before the measured window.
  // Snapshot includes the merged fixture's explicitly frozen history and Exit-option inputs. Candidate counts,
  // settled trades, feed and step sequence remain pinned below; the result hash also includes current diagnostic
  // attribution fields, so it follows the intentionally expanded result schema.
  // Three Signal configs repeat across four disjoint hours, with one duplicate per config/hour: 60 candidates,
  // 48 feed entries, including candidates whose positions span entry windows; 42 are taken. Every output
  // field/row is hashed, including the accepted markers, skips, PF and gross sums.
  assert.equal(r.input.candidates, 60);
  assert.equal(r.settled, 42);
  assert.equal(r.feed, 48);
  assert.equal(r.inactive, 0);
  // 16 Nov 2026 (Stable-04): the echoed options also gained the Wide-admission and Signal-cadence fields; counts, settled, feed and steps are unchanged.
  // 16 Nov 2026: the echoed options gained `continuous: true, decisionMin: 1` (continuous evaluation). Every other field of the
  // result - trades, feed, steps, diagnostics - hashes exactly as before (checked field by field against the previous code).
  // 17 Nov 2026: the bench pins independent variants with onePerPairEvent off; the echoed option is the only change
  // (candidates, settled, feed and the step hash are unchanged).
  assert.equal(r.fullResultSha256, "086f8f1e84b0c293451d9c39ee97087486ff8fb5a55fd918a03a3042ff104fae");
  assert.equal(r.stepProgressSha256, "9b11bef4ae499a18825a4df9d13223436fe392839fbdbd07240611de0404a59a");
  assert.deepEqual(r.heap.map((x: { step: number }) => x.step), [1, 2, 3, 4]);
});
