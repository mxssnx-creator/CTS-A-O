/** Optional lossless timestamp index for stored positions, without loading their mutable objects. */
export const TAPE_OPEN_TIMES = Symbol("tape open entry times");
export type TapeWithOpenTimes = { open: ReadonlyArray<{ entryT: number }>; [TAPE_OPEN_TIMES]?: () => Float64Array };
export function tapeOpenTimes(tape: TapeWithOpenTimes): Float64Array {
  return tape[TAPE_OPEN_TIMES]?.() ?? Float64Array.from(tape.open, (p) => p.entryT);
}
