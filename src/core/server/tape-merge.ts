import type { ConfigTape } from "../sim/walkforward.ts";

/**
 * Restore the Main pair order after worker replies, interning repeated strings without changing any tape identity.
 * Yield within large open/pending arrays as well as between tapes: one busy tape can itself contain many positions.
 * The caller owns the replies until the complete cohort is published.
 */
export function* mergeWorkerTapesGen(
  replies: readonly { tapes: ConfigTape[] }[],
  order: readonly string[],
): Generator<void, ConfigTape[]> {
  const rank = new Map(order.map((key, i) => [key, i]));
  const buckets: ConfigTape[][] = Array.from({ length: order.length + 1 }, () => []);
  const intern = new Map<string, string>();
  const one = (x: string) => {
    const previous = intern.get(x);
    if (previous !== undefined) return previous;
    intern.set(x, x);
    return x;
  };
  let work = 0;
  for (const reply of replies) for (const tape of reply.tapes) {
    tape.bot = one(tape.bot) as typeof tape.bot;
    tape.ind = one(tape.ind);
    tape.kind = one(tape.kind) as typeof tape.kind;
    for (const open of tape.open) {
      if (open.cfg === tape.id) open.cfg = tape.id;
      open.sym = one(open.sym);
      if ((++work & 255) === 0) yield;
    }
    for (const pending of tape.pending) {
      pending.sym = one(pending.sym);
      if ((++work & 255) === 0) yield;
    }
    buckets[rank.get(`${tape.bot}|${tape.ind}`) ?? 0].push(tape);
    if ((++work & 255) === 0) yield;
  }
  const tapes: ConfigTape[] = [];
  for (const bucket of buckets) for (const tape of bucket) {
    tapes.push(tape);
    if ((++work & 255) === 0) yield;
  }
  return tapes;
}
