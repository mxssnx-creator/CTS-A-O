// Main-thread work of the live tick in time-boxed steps. The tick runs every 100 ms; a catch-up that held it for
// seconds (a fresh run's whole feed replayed into the Block / acceptance books: 3.8 s on x02, 7 Oct profile) is
// spread over as many ticks as it needs.

/** feed entries per chunk between two clock reads */
const CHUNK = 200;

/**
 * Advance `advance(t, max)` (true once there) in chunks for at most `budgetMs`. True when it got there; false when the
 * budget ran out first — the next call continues from where this one stopped.
 */
export function catchUp(advance: (t: number, max: number) => boolean, t: number, budgetMs: number): boolean {
  const end = performance.now() + budgetMs;
  for (;;) {
    if (advance(t, CHUNK)) return true;
    if (performance.now() >= end) return false;
  }
}
