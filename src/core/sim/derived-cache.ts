/** Reclaimable derived data, never source trades or qualification evidence.
 * FIFO bounds metadata as well as buffers; a miss recomputes from the unchanged source.
 * Weak keys let a released generation disappear even before the bounded queue turns over.
 */
export class DerivedCache<K extends object, V> {
  private values = new WeakMap<K, V>();
  private queue: WeakRef<K>[] = [];
  private head = 0;
  readonly capacity: number;
  constructor(capacity: number) {
    if (!Number.isInteger(capacity) || capacity < 1) throw new Error("Invalid derived-cache capacity");
    this.capacity = capacity;
  }
  get(key: K): V | undefined { return this.values.get(key); }
  set(key: K, value: V): void {
    if (!this.values.has(key)) {
      while (this.queue.length - this.head >= this.capacity) {
        const oldest = this.queue[this.head++].deref();
        if (oldest) this.values.delete(oldest);
      }
      this.queue.push(new WeakRef(key));
      if (this.head >= this.capacity) { this.queue = this.queue.slice(this.head); this.head = 0; }
    }
    this.values.set(key, value);
  }
}
