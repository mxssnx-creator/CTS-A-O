// The Base combos dealt to the workers. A worker builds each indication's series once per message, so the combos of one
// indication go to the same part: the combos are sorted by indication and cut into contiguous parts of equal size. (The
// round-robin deal put every indication into every part: each part rebuilt every series.) Results are rebuilt in the
// combo order by the caller, so the partition changes the cost only.
export function partitionByIndication<T extends { ind: string }>(items: readonly T[], parts: number): T[][] {
  const out: T[][] = Array.from({ length: Math.max(1, parts) }, () => []);
  if (!items.length) return out;
  const sorted = [...items].sort((a, b) => (a.ind < b.ind ? -1 : a.ind > b.ind ? 1 : 0));
  const per = Math.ceil(sorted.length / out.length);
  sorted.forEach((x, i) => out[Math.floor(i / per)].push(x));
  return out;
}
