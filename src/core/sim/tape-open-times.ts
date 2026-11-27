/** Optional lossless timestamp index for stored positions, without loading their mutable objects. */
export const TAPE_OPEN_TIMES = Symbol("tape open entry times");
export type TapeWithOpenTimes = { open: ReadonlyArray<{ entryT: number }>; [TAPE_OPEN_TIMES]?: () => Float64Array };
export function tapeOpenTimes(tape: TapeWithOpenTimes): Float64Array {
  return tape[TAPE_OPEN_TIMES]?.() ?? Float64Array.from(tape.open, (p) => p.entryT);
}

/** Read-only positions for replay marking. A stored tape may provide them without retaining a mutable copy. */
export const TAPE_OPEN_VIEW = Symbol("tape open read-only view");
/** Stored tapes expose a separately owned mutable override if a caller materializes or replaces it. */
export const TAPE_OPEN_OVERRIDE = Symbol("tape open mutable override");
export type TapeWithOpenView<T> = { open: readonly T[]; [TAPE_OPEN_VIEW]?: () => readonly T[];
  [TAPE_OPEN_OVERRIDE]?: () => readonly T[] | undefined };
export function tapeOpenView<T>(tape: TapeWithOpenView<T>): readonly T[] {
  return tape[TAPE_OPEN_VIEW]?.() ?? tape.open;
}
export function storedTapeOpen<T>(tape: TapeWithOpenView<T>): boolean {
  return typeof tape[TAPE_OPEN_OVERRIDE] === "function";
}
export function tapeOpenOverride<T>(tape: TapeWithOpenView<T>): readonly T[] | undefined {
  return tape[TAPE_OPEN_OVERRIDE]?.();
}
