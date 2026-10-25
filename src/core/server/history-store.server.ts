// Lossless immutable calculation histories. Large books keep compressed bytes on disk and a bounded
// working set in RAM. No close, prefix, price, identity or precision is dropped to meet a memory budget.
import {
  closeSync,
  readSync,
  writeSync,
  openSync,
  mkdtempSync,
  rmSync,
  ftruncateSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import * as zlib from "node:zlib";
import { StringDecoder } from "node:string_decoder";
import { inTapeLayout, tapeBytes, tapeViews, type ConfigTape } from "../sim/walkforward.ts";

const MiB = 1048576;
export const HISTORY_CACHE_BYTES = 64 * MiB;
/** Bound automatic in-memory accumulation; this does not limit any historical sample. */
export function historyMemoryBytes(): number {
  const value = Number(process.env.CTS_CORE_HISTORY_MEMORY_MB ?? 256);
  if (!Number.isFinite(value) || value < 1 || value > 4096)
    throw new Error("Invalid history memory budget (1–4096 MiB)");
  return Math.floor(value * MiB);
}
export class HistoryStorageError extends Error {}
type Columns = ReturnType<typeof tapeViews>;
type Metadata = Pick<
  ConfigTape,
  | "id"
  | "bot"
  | "ind"
  | "protect"
  | "kind"
  | "n"
  | "syms"
  | "open"
  | "pending"
  | "fromT"
  | "heldOnly"
  | "carried"
>;
export type HistoryRecord = {
  codec: "deflate" | "zstd";
  offset: number;
  packed: number;
  bytes: number;
  digest: string;
  n: number;
};
type Resource = { fd: number; directory?: string; closed: boolean };
const resources = new Set<Resource>();
function closeResource(resource: Resource) {
  if (!resource.closed) {
    resource.closed = true;
    try {
      closeSync(resource.fd);
    } catch {
      /* cleanup is idempotent */
    }
  }
  if (resource.directory) rmSync(resource.directory, { recursive: true, force: true });
  resources.delete(resource);
}
const finalizer = new FinalizationRegistry<Resource>((resource) => {
  try {
    closeResource(resource);
  } catch {
    /* OS cleanup can be retried at process exit */
  }
});
process.once("exit", () => {
  for (const r of resources) {
    try {
      closeResource(r);
    } catch {
      /* exiting */
    }
  }
});
const slot = Symbol("immutable tape history");
type Stored = ConfigTape & { [slot]: { store: TapeHistoryStore; record: HistoryRecord } };
const columns = [
  "exitT",
  "entryT",
  "r",
  "gp",
  "gl",
  "rs",
  "r2",
  "entry",
  "exit",
  "vol",
  "symI",
  "bars",
  "side",
  "reason",
  "level",
] as const;
const descriptors = Object.fromEntries(
  columns.map((key) => [
    key,
    {
      enumerable: true,
      configurable: false,
      get(this: Stored) {
        const s = this[slot];
        return s.store.columns(s.record)[key];
      },
    },
  ]),
);
export const historyOf = (tape: ConfigTape): Stored[typeof slot] | undefined =>
  (tape as Stored)[slot];
function metadata(t: ConfigTape): Metadata {
  return {
    id: t.id,
    bot: t.bot,
    ind: t.ind,
    protect: t.protect,
    kind: t.kind,
    n: t.n,
    syms: t.syms,
    open: t.open,
    pending: t.pending,
    ...(t.fromT === undefined ? {} : { fromT: t.fromT }),
    ...(t.heldOnly === undefined ? {} : { heldOnly: t.heldOnly }),
    ...(t.carried === undefined ? {} : { carried: t.carried }),
  };
}

export class TapeHistoryStore {
  readonly path: string;
  private cacheLimit: number;
  private codec: HistoryRecord["codec"];
  private resource: Resource;
  private end = 0;
  private cached = new Map<HistoryRecord, Columns>();
  private cachedBytes = 0;
  private last: { record: HistoryRecord; columns: Columns } | null = null;
  readonly stats = {
    tapes: 0,
    rawBytes: 0,
    storedBytes: 0,
    reads: 0,
    hits: 0,
    writeMs: 0,
    maxWriteMs: 0,
    peakCacheBytes: 0,
  };

  constructor(
    options: {
      directory?: string;
      path?: string;
      cacheBytes?: number;
      codec?: HistoryRecord["codec"];
    } = {},
  ) {
    this.codec =
      options.codec ?? (typeof zlib.zstdCompressSync === "function" ? "zstd" : "deflate");
    if (this.codec === "zstd" && typeof zlib.zstdCompressSync !== "function")
      throw new HistoryStorageError(
        "Zstandard history storage is unavailable on this Node runtime",
      );
    this.cacheLimit = options.cacheBytes ?? HISTORY_CACHE_BYTES;
    if (!Number.isSafeInteger(this.cacheLimit) || this.cacheLimit < 1)
      throw new Error("Invalid history cache budget");
    const directory = options.path
      ? undefined
      : mkdtempSync(join(options.directory ?? tmpdir(), `cts-history-${process.pid}-`));
    this.path = options.path ?? join(directory!, "columns.bin");
    try {
      this.resource = {
        fd: openSync(this.path, options.path ? "r" : "w+", 0o600),
        directory,
        closed: false,
      };
    } catch (error) {
      if (directory) rmSync(directory, { recursive: true, force: true });
      throw new HistoryStorageError(`Cannot create calculation history: ${String(error)}`);
    }
    resources.add(this.resource);
    finalizer.register(this, this.resource, this);
  }

  private check() {
    if (this.resource.closed) throw new HistoryStorageError("Calculation history has been closed");
  }

  append(tape: ConfigTape): ConfigTape {
    this.check();
    if (!this.resource.directory) throw new HistoryStorageError("Read-only calculation history");
    if (!inTapeLayout(tape))
      throw new HistoryStorageError("Calculation history requires canonical tape columns");
    const layout = tapeViews(tape.exitT.buffer, tape.exitT.byteOffset, tape.n);
    for (const key of columns)
      if (
        tape[key].buffer !== layout[key].buffer ||
        tape[key].byteOffset !== layout[key].byteOffset ||
        tape[key].length !== layout[key].length
      )
        throw new HistoryStorageError(`Noncanonical calculation history column: ${key}`);
    const begin = performance.now(),
      bytes = tapeBytes(tape.n);
    const raw = Buffer.from(tape.exitT.buffer, tape.exitT.byteOffset, bytes);
    let packed: Buffer;
    try {
      packed =
        this.codec === "zstd"
          ? zlib.zstdCompressSync(raw, { params: { [zlib.constants.ZSTD_c_compressionLevel]: 1 } })
          : zlib.deflateRawSync(raw, { level: 1 });
    } catch (error) {
      throw new HistoryStorageError(`Cannot encode calculation history: ${String(error)}`);
    }
    const record = {
      codec: this.codec,
      offset: this.end,
      packed: packed.length,
      bytes,
      digest: createHash("sha256").update(raw).digest("hex"),
      n: tape.n,
    };
    try {
      let at = 0;
      while (at < packed.length) {
        const n = writeSync(this.resource.fd, packed, at, packed.length - at, this.end + at);
        if (n <= 0) throw new Error("Short history write");
        at += n;
      }
      this.end += packed.length;
    } catch (error) {
      try {
        ftruncateSync(this.resource.fd, this.end);
      } catch {
        /* original failure remains primary */
      }
      throw new HistoryStorageError(`Cannot preserve calculation history: ${String(error)}`);
    }
    this.stats.tapes++;
    this.stats.rawBytes += bytes;
    this.stats.storedBytes += packed.length;
    const elapsed = performance.now() - begin;
    this.stats.writeMs += elapsed;
    this.stats.maxWriteMs = Math.max(this.stats.maxWriteMs, elapsed);
    return this.restore(metadata(tape), record);
  }

  restore(meta: Metadata, record: HistoryRecord): ConfigTape {
    if (
      !["deflate", "zstd"].includes(record.codec) ||
      !Number.isSafeInteger(record.offset) ||
      record.offset < 0 ||
      !Number.isSafeInteger(record.packed) ||
      record.packed < 1 ||
      !Number.isSafeInteger(meta.n) ||
      meta.n < 0 ||
      record.n !== meta.n ||
      record.bytes !== tapeBytes(meta.n) ||
      !/^[0-9a-f]{64}$/.test(record.digest)
    )
      throw new HistoryStorageError("Invalid calculation history record");
    const tape = { ...meta } as Stored;
    Object.defineProperty(tape, slot, { value: { store: this, record }, enumerable: false });
    Object.defineProperties(tape, descriptors);
    return tape;
  }

  columns(record: HistoryRecord): Columns {
    this.check();
    if (this.last?.record === record) {
      this.stats.hits++;
      return this.last.columns;
    }
    let view = this.cached.get(record);
    if (view) {
      this.cached.delete(record);
      this.cached.set(record, view);
      this.stats.hits++;
    } else {
      try {
        const packed = Buffer.allocUnsafe(record.packed);
        let at = 0;
        while (at < packed.length) {
          const n = readSync(this.resource.fd, packed, at, packed.length - at, record.offset + at);
          if (n <= 0) throw new Error("Incomplete history bytes");
          at += n;
        }
        const raw =
          record.codec === "zstd"
            ? zlib.zstdDecompressSync(packed, { maxOutputLength: record.bytes })
            : zlib.inflateRawSync(packed, { maxOutputLength: record.bytes });
        if (
          raw.length !== record.bytes ||
          createHash("sha256").update(raw).digest("hex") !== record.digest
        )
          throw new Error("History checksum mismatch");
        const buffer = new ArrayBuffer(record.bytes);
        new Uint8Array(buffer).set(raw);
        view = tapeViews(buffer, 0, record.n);
        this.stats.reads++;
        while (this.cachedBytes + record.bytes > this.cacheLimit && this.cached.size) {
          const oldest = this.cached.keys().next().value!;
          this.cached.delete(oldest);
          this.cachedBytes -= oldest.bytes;
        }
        // One oversized tape remains accessible as the current working item, never an unbounded cache.
        if (record.bytes <= this.cacheLimit) {
          this.cached.set(record, view);
          this.cachedBytes += record.bytes;
        }
        this.stats.peakCacheBytes = Math.max(this.stats.peakCacheBytes, this.cachedBytes);
      } catch (error) {
        throw new HistoryStorageError(`Cannot read complete calculation history: ${String(error)}`);
      }
    }
    this.last = { record, columns: view };
    return view;
  }

  clearCache() {
    this.cached.clear();
    this.cachedBytes = 0;
    this.last = null;
  }
  setCacheLimit(bytes: number) {
    if (!Number.isSafeInteger(bytes) || bytes < 1)
      throw new HistoryStorageError("Invalid history cache budget");
    this.clearCache();
    this.cacheLimit = bytes;
  }
  close() {
    this.clearCache();
    finalizer.unregister(this);
    closeResource(this.resource);
  }
}

/** One compute's ownership boundary. Count entire worker arenas, not just the selected typed-array slices. */
export class BoundedHistory {
  private buffers = new WeakSet<ArrayBufferLike>();
  private residentBytes = 0;
  store: TapeHistoryStore | null = null;
  readonly memoryBytes: number;
  constructor(memoryBytes = historyMemoryBytes()) {
    this.memoryBytes = memoryBytes;
  }
  retain = (tape: ConfigTape): ConfigTape => {
    if (historyOf(tape)) return tape;
    const buffer = tape.exitT.buffer;
    if (this.buffers.has(buffer)) return tape;
    if (this.residentBytes + buffer.byteLength <= this.memoryBytes) {
      this.buffers.add(buffer);
      this.residentBytes += buffer.byteLength;
      return tape;
    }
    return (this.store ??= new TapeHistoryStore()).append(tape);
  };
  close() {
    this.store?.close();
  }
}

/** A small message names an immutable, checksummed manifest; column buffers are never cloned wholesale. */
export class HistoryTransfer {
  readonly path: string;
  private resource: Resource;
  private owners = new Set<TapeHistoryStore>();
  private copy: TapeHistoryStore | null = null;
  constructor() {
    const directory = mkdtempSync(join(tmpdir(), `cts-history-transfer-${process.pid}-`));
    this.path = join(directory, "manifest.jsonl");
    try {
      this.resource = { fd: openSync(this.path, "wx", 0o600), directory, closed: false };
    } catch (error) {
      rmSync(directory, { recursive: true, force: true });
      throw new HistoryStorageError(`Cannot create history manifest: ${String(error)}`);
    }
    resources.add(this.resource);
    finalizer.register(this, this.resource, this);
  }
  *prepare(tapes: readonly ConfigTape[]): Generator<number, HistoryTransfer> {
    const digest = createHash("sha256");
    let count = 0,
      slice = performance.now();
    const write = (line: unknown, hash = true) => {
      const bytes = Buffer.from(JSON.stringify(line) + "\n");
      let at = 0;
      while (at < bytes.length) {
        const n = writeSync(this.resource.fd, bytes, at, bytes.length - at);
        if (n <= 0) throw new HistoryStorageError("Short history manifest write");
        at += n;
      }
      if (hash) digest.update(bytes);
    };
    try {
      write({ version: 1, count: tapes.length });
      for (const tape of tapes) {
        const saved = historyOf(tape) ? tape : (this.copy ??= new TapeHistoryStore()).append(tape);
        const owner = historyOf(saved)!;
        this.owners.add(owner.store);
        write(describeStoredTape(saved));
        count++;
        if (performance.now() - slice > 8) {
          yield count;
          slice = performance.now();
        }
      }
      write({ end: count, digest: digest.digest("hex") }, false);
      return this;
    } catch (error) {
      throw new HistoryStorageError(`Cannot preserve history manifest: ${String(error)}`);
    }
  }
  close() {
    this.copy?.close();
    this.owners.clear();
    finalizer.unregister(this);
    closeResource(this.resource);
  }
}

export function* transferHistoriesGen(
  tapes: readonly ConfigTape[],
): Generator<number, HistoryTransfer> {
  const transfer = new HistoryTransfer();
  let complete = false;
  try {
    const result = yield* transfer.prepare(tapes);
    complete = true;
    return result;
  } finally {
    if (!complete) transfer.close();
  }
}

/** Worker-only streaming read. A truncated manifest cannot become a smaller, apparently successful cohort. */
export function readHistoryManifest(path: string) {
  const stores = new Map<string, TapeHistoryStore>(),
    tapes: ConfigTape[] = [];
  const fd = openSync(path, "r"),
    buffer = Buffer.allocUnsafe(64 * 1024),
    decoder = new StringDecoder("utf8"),
    digest = createHash("sha256");
  let rest = "",
    expected = -1,
    ended = false;
  const line = (text: string) => {
    if (ended) throw new HistoryStorageError("Unexpected data after history manifest end");
    const row = JSON.parse(text);
    if (expected < 0) {
      if (row.version !== 1 || !Number.isSafeInteger(row.count) || row.count < 0)
        throw new HistoryStorageError("Invalid history manifest header");
      expected = row.count;
    } else if (row.end !== undefined) {
      if (row.end !== expected || tapes.length !== expected || row.digest !== digest.digest("hex"))
        throw new HistoryStorageError("Incomplete history manifest");
      ended = true;
      return;
    } else {
      if (tapes.length >= expected)
        throw new HistoryStorageError("Unexpected extra calculation history");
      let store = stores.get(row.path);
      if (!store) {
        // One shared book normally has one or two owners. The whole reader keeps at most 64 MiB of columns.
        const budget = Math.max(1, Math.floor(HISTORY_CACHE_BYTES / (stores.size + 1)));
        for (const previous of stores.values()) previous.setCacheLimit(budget);
        store = new TapeHistoryStore({ path: row.path, cacheBytes: budget });
        stores.set(row.path, store);
      }
      tapes.push(store.restore(row.meta, row.record));
    }
    digest.update(text + "\n");
  };
  try {
    for (;;) {
      const n = readSync(fd, buffer, 0, buffer.length, null);
      rest += n ? decoder.write(buffer.subarray(0, n)) : decoder.end();
      let start = 0,
        next;
      while ((next = rest.indexOf("\n", start)) >= 0) {
        line(rest.slice(start, next));
        start = next + 1;
      }
      rest = rest.slice(start);
      if (rest.length > 32 * MiB)
        throw new HistoryStorageError("Calculation history manifest row is too large");
      if (!n) break;
    }
    if (rest || !ended) throw new HistoryStorageError("Incomplete history manifest");
    return {
      tapes,
      close: () => {
        for (const store of stores.values()) store.close();
      },
    };
  } catch (error) {
    for (const store of stores.values()) store.close();
    throw new HistoryStorageError(`Cannot read complete history manifest: ${String(error)}`);
  } finally {
    closeSync(fd);
  }
}

/** Each worker opens a read-only handle; parent owners must stay retained until the worker settles. */
export type StoredTapeDescriptor = { path: string; record: HistoryRecord; meta: Metadata };
export function describeStoredTape(tape: ConfigTape): StoredTapeDescriptor | null {
  const value = historyOf(tape);
  return value ? { path: value.store.path, record: value.record, meta: metadata(tape) } : null;
}
export function restoreStoredTapes(rows: readonly StoredTapeDescriptor[]) {
  const stores = new Map<string, TapeHistoryStore>();
  try {
    const tapes = rows.map((row) => {
      let store = stores.get(row.path);
      if (!store) stores.set(row.path, (store = new TapeHistoryStore({ path: row.path })));
      return store.restore(row.meta, row.record);
    });
    return {
      tapes,
      close: () => {
        for (const store of stores.values()) store.close();
      },
    };
  } catch (error) {
    for (const store of stores.values()) store.close();
    throw error;
  }
}
