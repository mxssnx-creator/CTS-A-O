// Lossless immutable calculation histories. Large books keep compressed bytes on disk and a bounded
// working set in RAM. No close, prefix, price, identity or precision is dropped to meet a memory budget.
import {
  closeSync,
  readdirSync,
  readSync,
  writeSync,
  openSync,
  mkdtempSync,
  mkdirSync,
  readlinkSync,
  statfsSync,
  rmSync,
  ftruncateSync,
} from "node:fs";
import { tmpdir, totalmem } from "node:os";
import { isMainThread } from "node:worker_threads";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import * as zlib from "node:zlib";
import { StringDecoder } from "node:string_decoder";
import { serialize, deserialize } from "node:v8";
import { inTapeLayout, tapeBytes, tapeViews, type ConfigTape } from "../sim/walkforward.ts";
import { registerImmutableHistoryGeneration } from "../sim/immutable-history-generation.ts";
import { TAPE_OPEN_TIMES, TAPE_OPEN_VIEW, TAPE_OPEN_OVERRIDE } from "../sim/tape-open-times.ts";

const MiB = 1048576;
/**
 * Decompressed column cache. 64 MiB thrashed on a 6-symbol replay (669 MiB of raw columns): every re-evaluated tape was
 * read, decompressed and checksummed again (~250 s of a 1,230 s profile). The budget follows the machine: 6 % of its
 * memory, between 64 MiB and 1 GiB; CTS_HISTORY_CACHE_MB (1–8192) sets it explicitly. The longer
 * CTS_CORE_HISTORY_CACHE_MB spelling is accepted too, since existing launchers already use it.
 */
export const HISTORY_CACHE_BYTES = historyCacheBytes();
export function historyCacheBytes(env: NodeJS.ProcessEnv = process.env): number {
  const value = env.CTS_HISTORY_CACHE_MB === undefined || env.CTS_HISTORY_CACHE_MB === ""
    ? env.CTS_CORE_HISTORY_CACHE_MB : env.CTS_HISTORY_CACHE_MB;
  if (value !== undefined && value !== "") {
    const mb = Number(value);
    if (Number.isFinite(mb) && mb >= 1 && mb <= 8192) return Math.floor(mb * MiB);
  }
  const main = Math.max(64 * MiB, Math.min(1024 * MiB, Math.floor((totalmem() * 0.06) / MiB) * MiB));
  // every worker thread opens its own stores with this budget: a quarter of the main thread's (at least 64 MiB), so
  // a pool of workers cannot multiply the cache into gigabytes
  return isMainThread ? main : Math.max(64 * MiB, Math.floor(main / 4 / MiB) * MiB);
}
/** Bound automatic in-memory accumulation; this does not limit any historical sample. */
export function historyMemoryBytes(): number {
  const value = Number(process.env.CTS_CORE_HISTORY_MEMORY_MB ?? 256);
  if (!Number.isFinite(value) || value < 1 || value > 4096)
    throw new Error("Invalid history memory budget (1–4096 MiB)");
  return Math.floor(value * MiB);
}
export class HistoryStorageError extends Error {}

const TMPFS_MAGIC = 0x01021994, RAMFS_MAGIC = 0x858458f6;
const memoryFilesystem = (type: number | null) => type === TMPFS_MAGIC || type === RAMFS_MAGIC;
const filesystemType = (path: string): number | null => {
  try { return Number(statfsSync(path).type) >>> 0; } catch { return null; }
};
/** Prefer the existing application-data area only when tmp is RAM-backed and cwd is known to be disk-backed. */
export function chooseHistorySpillRoot(temporary: string, working: string, typeOf: (path: string) => number | null): string {
  const tmpType = typeOf(temporary), workType = typeOf(working);
  return memoryFilesystem(tmpType) && workType !== null && !memoryFilesystem(workType)
    ? join(working, ".cts-core", "history") : temporary;
}
let warnedMemorySpill = false;
/** A dedicated disk-backed root avoids using RAM-backed /tmp for large spilled histories. */
export function historySpillRoot(): string {
  const configured = process.env.CTS_CORE_HISTORY_DIR?.trim();
  const temporary = tmpdir();
  const root = configured ? resolve(configured) : chooseHistorySpillRoot(temporary, process.cwd(), filesystemType);
  if (root !== temporary || configured) {
    try { mkdirSync(root, { recursive: true, mode: 0o700 }); }
    catch (error) {
      if (configured) throw new HistoryStorageError(`Cannot create calculation history root: ${String(error)}`);
      if (!warnedMemorySpill) {
        warnedMemorySpill = true;
        process.emitWarning("History spill storage is RAM-backed; set CTS_CORE_HISTORY_DIR to a writable disk-backed directory.");
      }
      return temporary;
    }
  }
  if (!configured && memoryFilesystem(filesystemType(root)) && !warnedMemorySpill) {
    warnedMemorySpill = true;
    process.emitWarning("History spill storage is RAM-backed; set CTS_CORE_HISTORY_DIR to a writable disk-backed directory.");
  }
  return root;
}

/** PID liveness is meaningful only in the same PID namespace. */
export function historyProcessNamespace(): string | null {
  try { return /^pid:\[(\d+)\]$/.exec(readlinkSync("/proc/self/ns/pid"))?.[1] ?? null; }
  catch { return null; }
}
const historyPrefix = (transfer = false) =>
  `cts-history${transfer ? "-transfer" : ""}-ns${historyProcessNamespace() ?? "unknown"}-${process.pid}-`;
function makeHistoryDirectory(root: string, transfer = false): string {
  try { return mkdtempSync(join(root, historyPrefix(transfer))); }
  catch (error) { throw new HistoryStorageError(`Cannot create calculation history directory: ${String(error)}`); }
}
const STALE_DIRECTORY = /^cts-history(?:-transfer)?-ns(\d+)-(\d+)-/;
const processExists = (pid: number): boolean => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM"; // another user's live process
  }
};
/**
 * Remove spill directories left behind by processes that no longer exist. A run that is killed or crashes never reaches its
 * own cleanup, and each orphan holds the compressed tapes of a whole session (gigabytes). A shared temp root can
 * be visible across PID namespaces: a PID that is absent here may belong to a live process elsewhere. Only a dead
 * PID explicitly tagged with this process's namespace is eligible; legacy or unknown-namespace names stay intact.
 */
export function sweepStaleHistoryDirectories(root: string = historySpillRoot(), alive: (pid: number) => boolean = processExists,
  namespace: string | null = historyProcessNamespace()): number {
  if (!namespace) return 0;
  let entries: import("node:fs").Dirent[];
  try {
    entries = readdirSync(root, { withFileTypes: true });
  } catch {
    return 0;
  }
  let removed = 0;
  for (const entry of entries) {
    const name = entry.name;
    const m = entry.isDirectory() ? STALE_DIRECTORY.exec(name) : null;
    if (!m) continue;
    if (m[1] !== namespace) continue;
    const pid = Number(m[2]);
    if (pid === process.pid || alive(pid)) continue;
    try {
      rmSync(join(root, name), { recursive: true, force: true });
      removed++;
    } catch {
      /* leave what cannot be removed */
    }
  }
  return removed;
}
const sweptRoots = new Set<string>();
const sweepOnce = (root: string) => {
  if (sweptRoots.has(root)) return;
  sweptRoots.add(root);
  try {
    sweepStaleHistoryDirectories(root);
  } catch {
    /* a sweep never blocks a run */
  }
};
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
  | "fromT"
  | "heldOnly"
  | "carried"
> & Partial<Pick<ConfigTape, "open" | "pending">>;
type PositionRecord = { offset: number; packed: number; bytes: number; digest: string };
export type HistoryRecord = {
  codec: "deflate" | "zstd";
  offset: number;
  packed: number;
  bytes: number;
  digest: string;
  n: number;
  positions?: PositionRecord;
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
type Stored = ConfigTape & { [slot]: { store: TapeHistoryStore; record: HistoryRecord;
  positions?: Partial<Pick<ConfigTape, "open" | "pending">> } };
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
const positionDescriptors = Object.fromEntries((["open", "pending"] as const).map((key) => [key, {
  enumerable: true, configurable: false,
  get(this: Stored) {
    const value = this[slot];
    if (!value.positions || value.positions[key] === undefined) {
      const loaded = value.store.positions(value.record);
      value.positions = { ...loaded, ...value.positions };
    }
    return value.positions[key];
  },
  set(this: Stored, next: ConfigTape[typeof key]) {
    const value = this[slot];
    (value.positions ??= {})[key] = next as never;
  },
}]));
function storedOpenTimes(this: Stored): Float64Array {
  const value = this[slot];
  const open = value.positions?.open ?? value.store.positions(value.record).open;
  return Float64Array.from(open, (p) => p.entryT);
}
function storedOpenView(this: Stored): readonly ConfigTape["open"][number][] {
  const value = this[slot];
  // Preserve a caller's mutable override; otherwise a one-use mark must not pin every spilled position.
  return value.positions?.open ?? value.store.positions(value.record).open;
}
function storedOpenOverride(this: Stored): readonly ConfigTape["open"][number][] | undefined {
  return this[slot].positions?.open;
}
export const historyOf = (tape: ConfigTape): Stored[typeof slot] | undefined =>
  (tape as Stored)[slot];
function metadata(t: ConfigTape, includePositions = true): Metadata {
  return {
    id: t.id,
    bot: t.bot,
    ind: t.ind,
    protect: t.protect,
    kind: t.kind,
    n: t.n,
    syms: t.syms,
    ...(includePositions ? { open: t.open, pending: t.pending } : {}),
    ...(t.fromT === undefined ? {} : { fromT: t.fromT }),
    ...(t.heldOnly === undefined ? {} : { heldOnly: t.heldOnly }),
    ...(t.carried === undefined ? {} : { carried: t.carried }),
  };
}

/** Clone ownership metadata without evaluating enumerable column getters or materializing a stored history. */
export function withHistoryMetadata(tape: ConfigTape, patch: Partial<Omit<Metadata, "n" | "id" | "syms">>): ConfigTape {
  const stored = historyOf(tape);
  return stored
    ? stored.store.restore({ ...metadata(tape), ...patch }, stored.record)
    : { ...tape, ...patch };
}

export class TapeHistoryStore {
  readonly path: string;
  private cacheLimit: number;
  private codec: HistoryRecord["codec"];
  private spillPositions: boolean;
  private resource: Resource;
  private end = 0;
  private cached = new Map<HistoryRecord, Columns>();
  private cachedBytes = 0;
  private last: { record: HistoryRecord; columns: Columns } | null = null;
  private derivedGeneration: object = {};
  readonly stats = {
    tapes: 0,
    rawBytes: 0,
    storedBytes: 0,
    reads: 0,
    hits: 0,
    writeMs: 0,
    maxWriteMs: 0,
    peakCacheBytes: 0,
    positionBytes: 0,
    positionReads: 0,
  };

  constructor(
    options: {
      directory?: string;
      path?: string;
      cacheBytes?: number;
      codec?: HistoryRecord["codec"];
      spillPositions?: boolean;
    } = {},
  ) {
    this.codec =
      options.codec ?? (typeof zlib.zstdCompressSync === "function" ? "zstd" : "deflate");
    this.spillPositions = options.spillPositions !== false;
    if (this.codec === "zstd" && typeof zlib.zstdCompressSync !== "function")
      throw new HistoryStorageError(
        "Zstandard history storage is unavailable on this Node runtime",
      );
    this.cacheLimit = options.cacheBytes ?? HISTORY_CACHE_BYTES;
    if (!Number.isSafeInteger(this.cacheLimit) || this.cacheLimit < 1)
      throw new Error("Invalid history cache budget");
    const root = !options.path ? (options.directory ?? historySpillRoot()) : undefined;
    if (root && !options.directory) sweepOnce(root);
    const directory = options.path
      ? undefined
      : makeHistoryDirectory(root!);
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
    let packed: Buffer, packedPositions: Buffer | undefined, rawPositions: Buffer | undefined;
    try {
      packed =
        this.codec === "zstd"
          ? zlib.zstdCompressSync(raw, { params: { [zlib.constants.ZSTD_c_compressionLevel]: 1 } })
          : zlib.deflateRawSync(raw, { level: 1 });
      if (this.spillPositions && (tape.open.length || tape.pending.length)) {
        rawPositions = serialize({ open: tape.open, pending: tape.pending });
        packedPositions = this.codec === "zstd"
          ? zlib.zstdCompressSync(rawPositions, { params: { [zlib.constants.ZSTD_c_compressionLevel]: 1 } })
          : zlib.deflateRawSync(rawPositions, { level: 1 });
      }
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
      ...(rawPositions && packedPositions ? { positions: {
        offset: this.end + packed.length, packed: packedPositions.length, bytes: rawPositions.length,
        digest: createHash("sha256").update(rawPositions).digest("hex"),
      } } : {}),
    };
    try {
      let offset = this.end;
      for (const part of packedPositions ? [packed, packedPositions] : [packed]) {
        let at = 0;
        while (at < part.length) {
          const n = writeSync(this.resource.fd, part, at, part.length - at, offset + at);
          if (n <= 0) throw new Error("Short history write");
          at += n;
        }
        offset += part.length;
      }
      this.end = offset;
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
    this.stats.storedBytes += packed.length + (packedPositions?.length ?? 0);
    this.stats.positionBytes += packedPositions?.length ?? 0;
    const elapsed = performance.now() - begin;
    this.stats.writeMs += elapsed;
    this.stats.maxWriteMs = Math.max(this.stats.maxWriteMs, elapsed);
    return this.restore(metadata(tape, !record.positions), record);
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
    if (record.positions && (!Number.isSafeInteger(record.positions.offset) || record.positions.offset < 0 ||
      !Number.isSafeInteger(record.positions.packed) || record.positions.packed < 1 ||
      !Number.isSafeInteger(record.positions.bytes) || record.positions.bytes < 1 ||
      !/^[0-9a-f]{64}$/.test(record.positions.digest)))
      throw new HistoryStorageError("Invalid calculation position history record");
    if ((!record.positions && (!Array.isArray(meta.open) || !Array.isArray(meta.pending))) ||
      (meta.open !== undefined && !Array.isArray(meta.open)) ||
      (meta.pending !== undefined && !Array.isArray(meta.pending)))
      throw new HistoryStorageError("Invalid calculation position metadata");
    const tape = { ...meta } as Stored;
    const supplied = meta.open !== undefined || meta.pending !== undefined
      ? { ...(meta.open === undefined ? {} : { open: meta.open }), ...(meta.pending === undefined ? {} : { pending: meta.pending }) }
      : undefined;
    if (record.positions) { delete (tape as Partial<ConfigTape>).open; delete (tape as Partial<ConfigTape>).pending; }
    Object.defineProperty(tape, slot, { value: { store: this, record, positions: supplied }, enumerable: false });
    Object.defineProperties(tape, descriptors);
    if (record.positions) {
      Object.defineProperties(tape, positionDescriptors);
      Object.defineProperty(tape, TAPE_OPEN_TIMES, { value: storedOpenTimes, enumerable: false });
      Object.defineProperty(tape, TAPE_OPEN_VIEW, { value: storedOpenView, enumerable: false });
      Object.defineProperty(tape, TAPE_OPEN_OVERRIDE, { value: storedOpenOverride, enumerable: false });
    }
    registerImmutableHistoryGeneration(tape, () => this.resource.closed ? undefined : this.derivedGeneration);
    return tape;
  }

  positions(record: HistoryRecord): Pick<ConfigTape, "open" | "pending"> {
    this.check();
    const state = record.positions;
    if (!state) throw new HistoryStorageError("Missing calculation position history");
    try {
      const packed = Buffer.allocUnsafe(state.packed);
      let at = 0;
      while (at < packed.length) {
        const n = readSync(this.resource.fd, packed, at, packed.length - at, state.offset + at);
        if (n <= 0) throw new Error("Incomplete position history bytes");
        at += n;
      }
      const raw = record.codec === "zstd"
        ? zlib.zstdDecompressSync(packed, { maxOutputLength: state.bytes })
        : zlib.inflateRawSync(packed, { maxOutputLength: state.bytes });
      if (raw.length !== state.bytes || createHash("sha256").update(raw).digest("hex") !== state.digest)
        throw new Error("Position history checksum mismatch");
      const value = deserialize(raw) as Pick<ConfigTape, "open" | "pending">;
      if (!Array.isArray(value?.open) || !Array.isArray(value?.pending)) throw new Error("Invalid position history");
      this.stats.positionReads++;
      return value;
    } catch (error) {
      throw new HistoryStorageError(`Cannot read complete position history: ${String(error)}`);
    }
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
    this.derivedGeneration = {};
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
    // Buffers can be shared by an entire worker reply, but each tape still owns metadata and potentially many
    // endpoint positions. Count that per tape even when its binary arena has already been admitted.
    const newBuffer = !this.buffers.has(buffer);
    const metadataBytes = 1024 + (tape.open.length + tape.pending.length) * 512;
    const bytes = (newBuffer ? buffer.byteLength : 0) + metadataBytes;
    if (this.residentBytes + bytes <= this.memoryBytes) {
      if (newBuffer) this.buffers.add(buffer);
      this.residentBytes += bytes;
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
    const root = historySpillRoot();
    sweepOnce(root);
    const directory = makeHistoryDirectory(root, true);
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
  return value ? { path: value.store.path, record: value.record,
    meta: metadata(tape, !value.record.positions || value.positions !== undefined) } : null;
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
