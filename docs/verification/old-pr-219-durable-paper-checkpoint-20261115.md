# Old PR #219 follow-up — durable paper-stage checkpoint, 15 November 2026

## Reproduced gap

Current `main` after PR #266 contains the opt-in native processed paper adapter from PR #265. Its checkpoint is
written to SQLite as `processedNativePaperV1`, but that key was absent from `DURABLE_KEYS`. `kvSet` therefore neither
scheduled nor included it in the atomic restart-state file. A process loss before the next SQLite snapshot could lose
an admitted parent, despite the publication text describing the checkpoint as persistent.

## Current-target correction

- `processedNativePaperV1` is now an explicit restart-durable key.
- The adapter uses a synchronous atomic state checkpoint before a newly admitted paper parent can continue.
- A missing state store, or a configured store that cannot write or rename its checkpoint, makes the processed policy unavailable. The
  process does not fall back to a clean book or continue new admission on an in-memory-only parent.
- A policy whose durable write failed remains fenced for the process. Existing held paper/native protection remains
  managed by the pre-existing ownership paths.
- Restart recovery reads the exact open parent immediately, without waiting for the periodic SQLite snapshot.

This repairs paper-parent durability only. It is not a venue-own-stage ledger, does not correlate venue partial fills,
does not establish an Active-to-Live fill proof, and does not measure venue PF or forward profitability. Those parts of
old draft #219 remain open.
