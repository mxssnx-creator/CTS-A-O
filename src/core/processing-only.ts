/** Entry-time ownership is fixed: earlier stages learn from their own closes but do not own funded exposure. */
export type ProcessingOwnership = {
  blockPredecessor?: true;
  processedStage?: "postBase" | "validated" | "active";
};

export function isProcessingOnly(p: ProcessingOwnership): boolean {
  return p.blockPredecessor === true || (p.processedStage !== undefined && p.processedStage !== "active");
}
