import type { BlockPolicy } from "../../../shared/cts-lastn/blocks.ts";
import type { ProcessedReplayPolicy } from "./processed-replay.ts";

/** Editing one control must retain every other signed policy and negative-window filter. */
export function processedStageDefaults(value?: Partial<ProcessedReplayPolicy> | null): ProcessedReplayPolicy {
  return { ...value, validationN: Math.round(value?.validationN ?? 12), realN: Math.round(value?.realN ?? 12) };
}

export function editProcessedStageBlock(value: ProcessedReplayPolicy, stage: "validation" | "real",
  block?: BlockPolicy): ProcessedReplayPolicy {
  const blocks = { ...value.blocks };
  if (block) blocks[stage] = block; else delete blocks[stage];
  const { blocks: _old, ...other } = value;
  return Object.keys(blocks).length ? { ...other, blocks } : other;
}
