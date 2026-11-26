import assert from "node:assert/strict";
import { test } from "node:test";
import { sanitizeWf } from "./runtime.server.ts";
import { NativeProcessedStageAdapter } from "./processed-stage-adapter.ts";
import { ProcessedReplay } from "../sim/processed-replay.ts";

const signed = { long: 10, short: 4, minimal: 1,
  shortPolarity: "negative" as const, minimalPolarity: "positive" as const };

test("signed stage policies are validated consistently before settings are saved or used", () => {
  const good = { validationN: 4, realN: 4, blocks: { validation: signed, real: { ...signed, minimalPolarity: "negative" as const } },
    negativeFilter: { windows: [4, 1], mode: "any" as const, maxPf: 1 } };
  const policy = sanitizeWf({ processedStages: good }).processedStages!;
  assert.deepEqual(policy.negativeFilter?.windows, [1, 4]);
  assert.doesNotThrow(() => new ProcessedReplay(policy, .0015));
  assert.doesNotThrow(() => new NativeProcessedStageAdapter(policy, .0015));
  const invalid = [
    { validationN: 4, realN: 4, blocks: { exec: signed } },
    { validationN: 4, realN: 4, blocks: { validation: { ...signed, minimalPolarity: "either" } } },
    { validationN: 4, realN: 4, negativeFilter: { windows: [0], mode: "any" } },
    { validationN: 4, realN: 4, extraStage: { short: 4 } },
  ];
  for (const value of invalid) {
    assert.throws(() => sanitizeWf({ processedStages: value } as never));
    assert.throws(() => new ProcessedReplay(value as never, .0015));
    assert.throws(() => new NativeProcessedStageAdapter(value as never, .0015));
  }
});
