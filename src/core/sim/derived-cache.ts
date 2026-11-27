/** Reclaimable derived data, never source trades or qualification evidence.
 * FIFO bounds metadata as well as buffers; a miss recomputes from the unchanged source.
 * Weak keys let a released generation disappear even before the bounded queue turns over.
 */
export class DerivedCache<K extends object, V> {
  private values = new WeakMap<K, { value: V; slot: { key: WeakRef<K>; bytes: number; active: boolean } }>();
  private queue: Array<{ key: WeakRef<K>; bytes: number; active: boolean }> = [];
  private head = 0;
  private entries = 0;
  private bytes = 0;
  readonly capacity: number;
  readonly byteCapacity: number;
  constructor(capacity: number, byteCapacity = Infinity) {
    if (!Number.isInteger(capacity) || capacity < 1) throw new Error("Invalid derived-cache capacity");
    if (byteCapacity !== Infinity && (!Number.isSafeInteger(byteCapacity) || byteCapacity < 1))
      throw new Error("Invalid derived-cache byte capacity");
    this.capacity = capacity;
    this.byteCapacity = byteCapacity;
  }
  get(key: K): V | undefined { return this.values.get(key)?.value; }
  get retainedBytes(): number { return this.bytes; }
  private compact(): void {
    if (this.head >= this.capacity || this.queue.length - this.head > 2 * this.capacity) {
      this.queue = this.queue.slice(this.head).filter((slot) => slot.active);
      this.head = 0;
    }
  }
  private evict(): void {
    while (this.head < this.queue.length) {
      const slot = this.queue[this.head++];
      if (!slot.active) continue;
      slot.active = false;
      this.entries--;
      this.bytes -= slot.bytes;
      const key = slot.key.deref();
      if (key && this.values.get(key)?.slot === slot) this.values.delete(key);
      break;
    }
    this.compact();
  }
  delete(key: K): void {
    const old = this.values.get(key);
    if (!old) return;
    this.values.delete(key);
    old.slot.active = false;
    this.entries--;
    this.bytes -= old.slot.bytes;
    this.compact();
  }
  /** `bytes` includes retained typed-array buffers; an oversized value is used by its caller but never cached. */
  set(key: K, value: V, bytes = 0): void {
    if (!Number.isSafeInteger(bytes) || bytes < 0) throw new Error("Invalid derived-cache entry size");
    if (bytes > this.byteCapacity) { this.delete(key); return; }
    const old = this.values.get(key);
    if (old) {
      this.bytes += bytes - old.slot.bytes;
      old.slot.bytes = bytes;
      old.value = value;
    } else {
      while (this.entries >= this.capacity) this.evict();
      const slot = { key: new WeakRef(key), bytes, active: true };
      this.queue.push(slot);
      this.values.set(key, { value, slot });
      this.entries++;
      this.bytes += bytes;
    }
    while (this.bytes > this.byteCapacity) this.evict();
    this.compact();
  }
}

/** Shared budget split between the four index/view caches (1–1024 MiB, default 128 MiB). */
export function derivedCacheBytes(value = typeof process === "undefined" ? undefined : process.env.CTS_CORE_DERIVED_CACHE_MB): number {
  if (value === undefined || value === "") return 128 * 1048576;
  const mb = Number(value);
  if (!Number.isSafeInteger(mb) || mb < 1 || mb > 1024) throw new Error("Invalid derived-cache budget (1–1024 MiB)");
  return mb * 1048576;
}
