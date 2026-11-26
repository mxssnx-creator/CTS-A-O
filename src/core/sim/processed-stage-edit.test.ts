import { test } from "node:test";
import assert from "node:assert/strict";
import { editProcessedStageBlock, processedStageDefaults } from "./processed-stage-edit.ts";

test("editing one processed-stage control preserves the other window, sign and loss policies", () => {
  const block = { long: 10, short: 4, minimal: 1, shortPolarity: "negative" as const, minimalPolarity: "positive" as const };
  const policy = { validationN: 12, realN: 8, blocks: { validation: block, real: { ...block, minimal: 2 } },
    negativeFilter: { windows: [1, 4], mode: "any" as const, maxPf: 1 } };
  const edited = { ...processedStageDefaults(policy), validationN: 4 };
  assert.deepEqual(edited.blocks, policy.blocks);
  assert.deepEqual(edited.negativeFilter, policy.negativeFilter);
  const removed = editProcessedStageBlock(edited, "validation");
  assert.deepEqual(removed.blocks, { real: policy.blocks.real });
  assert.deepEqual(removed.negativeFilter, policy.negativeFilter);
  assert.deepEqual(policy.blocks.validation, block, "editing never mutates the saved input");
  assert.deepEqual(editProcessedStageBlock(removed, "real"), { validationN: 4, realN: 8, negativeFilter: policy.negativeFilter });
});
