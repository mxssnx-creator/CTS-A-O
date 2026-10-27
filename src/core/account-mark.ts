/** Ownership and mark counts are evidence only when an account read supplied an explicit zero. */
export type AccountMarkEvidence = {
  ownershipUnknown?: { n?: unknown; pendingKeys?: unknown };
  markUnknown?: { own?: unknown; foreign?: unknown };
};

const knownZero = (value: unknown): boolean => typeof value === "number" && value === 0;

export function hasCompleteOwnership(account?: AccountMarkEvidence | null): boolean {
  return knownZero(account?.ownershipUnknown?.n) && knownZero(account?.ownershipUnknown?.pendingKeys);
}

export function hasCompleteAccountMark(account: AccountMarkEvidence | null | undefined, side: "own" | "foreign"): boolean {
  return hasCompleteOwnership(account) && knownZero(account?.markUnknown?.[side]);
}
