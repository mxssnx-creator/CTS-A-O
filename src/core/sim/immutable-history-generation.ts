// Browser-safe provenance for immutable stored histories. No binary columns or Node resources
// are retained here; a live owner can invalidate derived evidence without decompressing it.
const generations = new WeakMap<object, () => object | undefined>();

export function registerImmutableHistoryGeneration(tape: object, current: () => object | undefined): void {
  if (generations.has(tape)) throw new Error("Immutable history generation already registered");
  generations.set(tape, current);
}

export function immutableHistoryGeneration(tape: object): object | undefined {
  return generations.get(tape)?.();
}
