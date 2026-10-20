// Lossless session evidence storage. Large arrays are retained in checksummed,
// bounded sidecars; readers can hydrate the legacy shape or visit one item at a time.
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, open, readFile, realpath, rename, rm, rmdir, stat, unlink } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';

export const MAX_SESSION_CHUNK_BYTES = 8 * 1024 * 1024;
const BUFFER_BYTES = 64 * 1024;
const TAPE_SCHEMA = 'cts-session-tape-trades-v1';
const VALIDATION_SCHEMA = 'cts-session-validation-v1';
const ARRAY_SCHEMA = 'cts-session-array-v1';
const RESERVED_ARRAY_FIELDS = new Set(['tapeTrades', 'validation', 'arraySidecars', 'tapeTradesSidecar', 'validationSidecar', '__proto__', 'constructor', 'prototype']);
const own = (x, k) => Object.prototype.hasOwnProperty.call(x, k);
const count = (x) => Number.isSafeInteger(x) && x >= 0;
const digest = (x) => createHash('sha256').update(x).digest('hex');
const iterable = (x) => x != null && (typeof x[Symbol.iterator] === 'function' || typeof x[Symbol.asyncIterator] === 'function');

function chunkLimit(n = MAX_SESSION_CHUNK_BYTES) {
  if (!Number.isSafeInteger(n) || n < 1 || n > MAX_SESSION_CHUNK_BYTES)
    throw new Error(`maxChunkBytes must be an integer from 1 to ${MAX_SESSION_CHUNK_BYTES}`);
  return n;
}

function jsonValue(x, key) {
  if (x !== null && (typeof x === 'object' || typeof x === 'bigint') && typeof x.toJSON === 'function') x = x.toJSON(key);
  if (x instanceof Number || x instanceof String || x instanceof Boolean) x = x.valueOf();
  return x;
}
function* jsonString(s) {
  yield '"';
  // Escaping slices independently also preserves surrogate pairs split at a slice.
  for (let i = 0; i < s.length; i += BUFFER_BYTES) yield JSON.stringify(s.slice(i, i + BUFFER_BYTES)).slice(1, -1);
  yield '"';
}
function* jsonTokens(x, stack, prepared = false, key = '') {
  if (!prepared) x = jsonValue(x, key);
  if (x === null) { yield 'null'; return; }
  if (typeof x === 'string') { yield* jsonString(x); return; }
  if (typeof x === 'number' || typeof x === 'boolean') { yield JSON.stringify(x); return; }
  if (typeof x === 'bigint') throw new TypeError('Cannot serialize a BigInt');
  if (typeof x !== 'object') throw new TypeError('Root value is not JSON serializable');
  if (stack.has(x)) throw new TypeError('Cannot serialize circular JSON');
  stack.add(x);
  if (Array.isArray(x)) {
    yield '[';
    for (let i = 0; i < x.length; i++) {
      if (i) yield ',';
      const v = jsonValue(x[i], String(i));
      if (v === undefined || typeof v === 'function' || typeof v === 'symbol') yield 'null';
      else yield* jsonTokens(v, stack, true);
    }
    yield ']';
  } else {
    yield '{';
    let first = true;
    for (const k of Object.keys(x)) {
      const v = jsonValue(x[k], k);
      if (v === undefined || typeof v === 'function' || typeof v === 'symbol') continue;
      if (!first) yield ',';
      first = false;
      yield* jsonString(k);
      yield ':';
      yield* jsonTokens(v, stack, true);
    }
    yield '}';
  }
  stack.delete(x);
}

/** JSON.stringify semantics for JSON data, without constructing a whole-file string. */
export async function writeJsonFile(file, value) {
  file = resolve(file);
  await mkdir(dirname(file), { recursive: true });
  const tmp = join(dirname(file), `.${basename(file)}.${randomUUID()}.tmp`);
  const fh = await open(tmp, 'wx');
  const hash = createHash('sha256');
  let bytes = 0, pending = [], pendingBytes = 0;
  const flush = async () => {
    if (!pendingBytes) return;
    const b = Buffer.from(pending.join(''));
    await fh.writeFile(b);
    hash.update(b); bytes += b.length; pending = []; pendingBytes = 0;
  };
  try {
    for (const token of jsonTokens(value, new Set())) {
      pending.push(token); pendingBytes += Buffer.byteLength(token);
      if (pendingBytes >= BUFFER_BYTES) await flush();
    }
    await flush();
    await fh.close();
    await rename(tmp, file);
    return { bytes, sha256: hash.digest('hex') };
  } catch (error) {
    await fh.close().catch(() => {});
    await rm(tmp, { force: true });
    throw error;
  }
}

async function writeSidecar(file, items, { maxChunkBytes, rowsKey, schema, itemName, tag }) {
  const limit = chunkLimit(maxChunkBytes);
  if (!iterable(items)) throw new TypeError('Sidecar items must be iterable');
  const parent = dirname(resolve(file));
  const dir = `session-${itemName}-${randomUUID()}`;
  const total = { [itemName]: 0, rows: 0, records: 0 }, chunks = [], hash = createHash('sha256');
  let parts = [], bytes = 0, chunkCounts = { [itemName]: 0, rows: 0, records: 0 };
  const flush = async () => {
    if (!bytes) return;
    await mkdir(join(parent, dir), { recursive: true });
    const data = Buffer.from(parts.join(''));
    const path = `${dir}/${String(chunks.length).padStart(6, '0')}.jsonl`;
    const fh = await open(join(parent, path), 'wx');
    try { await fh.writeFile(data); } finally { await fh.close(); }
    chunks.push({ path, bytes: data.length, sha256: digest(data), ...chunkCounts });
    hash.update(data); parts = []; bytes = 0; chunkCounts = { [itemName]: 0, rows: 0, records: 0 };
  };
  const line = async (record, itemDelta, rowDelta) => {
    const s = `${JSON.stringify(record)}\n`, n = Buffer.byteLength(s);
    if (n > limit) throw new Error(`Sidecar record is ${n} bytes, exceeding maxChunkBytes ${limit}`);
    if (bytes + n > limit) await flush();
    parts.push(s); bytes += n;
    for (const v of [total, chunkCounts]) { v[itemName] += itemDelta; v.rows += rowDelta; v.records++; }
  };
  try {
    let i = 0;
    for await (const item of items) {
      if (rowsKey) {
        if (!item || typeof item !== 'object' || Array.isArray(item) || !iterable(item[rowsKey]))
          throw new TypeError(`Sidecar item requires iterable ${rowsKey}`);
        const meta = Object.fromEntries(Object.entries(item).filter(([k]) => k !== rowsKey));
        await line([tag, i, meta], 1, 0);
        let row = 0;
        for await (const x of item[rowsKey]) await line(['r', i, row++, x], 0, 1);
      } else await line(['i', i, item], 1, 1);
      i++;
    }
    await flush();
    return { schema, ...total, chunks, sha256: hash.digest('hex') };
  } catch (error) {
    await rm(join(parent, dir), { recursive: true, force: true });
    throw error;
  }
}

export const writeTapeTradesSidecar = (file, tapes, options = {}) => writeSidecar(file, tapes, {
  ...options, rowsKey: 'trades', schema: TAPE_SCHEMA, itemName: 'tapes', tag: 't',
});
export const writeValidationSidecar = (file, steps, options = {}) => writeSidecar(file, steps, {
  ...options, rowsKey: 'checks', schema: VALIDATION_SCHEMA, itemName: 'steps', tag: 'v',
});

/** Write every row; optional flat arrayFields (e.g. trades) retain allocation indices. */
export async function writeSessionDump(file, raw, options = {}) {
  chunkLimit(options.maxChunkBytes);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new TypeError('Session dump must be an object');
  if (raw.tapeTradesSidecar || raw.validationSidecar || raw.arraySidecars) throw new Error('Hydrate existing sidecars before rewriting a dump');
  const fields = options.arrayFields ?? [];
  if (!Array.isArray(fields) || new Set(fields).size !== fields.length || fields.some((field) => typeof field !== 'string' ||
      RESERVED_ARRAY_FIELDS.has(field)))
    throw new Error('Invalid flat array sidecar field');
  const header = { ...raw };
  const made = [];
  try {
    if (own(raw, 'tapeTrades') || options.tapeTrades !== undefined) {
      header.tapeTradesSidecar = await writeTapeTradesSidecar(file, options.tapeTrades ?? raw.tapeTrades, options);
      made.push(header.tapeTradesSidecar); header.tapeTrades = [];
    }
    if (own(raw, 'validation') || options.validation !== undefined) {
      header.validationSidecar = await writeValidationSidecar(file, options.validation ?? raw.validation, options);
      made.push(header.validationSidecar); header.validation = [];
    }
    if (fields.length) {
      header.arraySidecars = Object.create(null);
      for (const field of fields) {
        if (!own(raw, field)) continue;
        const manifest = await writeSidecar(file, raw[field], {
          ...options, rowsKey: null, schema: ARRAY_SCHEMA, itemName: 'items', tag: 'i',
        });
        made.push(manifest); header.arraySidecars[field] = manifest; header[field] = [];
      }
    }
    const result = await writeJsonFile(file, header);
    return { ...result, tapeTradesSidecar: header.tapeTradesSidecar, validationSidecar: header.validationSidecar, arraySidecars: header.arraySidecars };
  } catch (error) {
    // Only remove directories created by this attempted write; an existing header
    // and its referenced sidecars remain intact after a later serialization error.
    for (const manifest of made) for (const dir of new Set(manifest.chunks.map((x) => x.path.split('/')[0])))
      await rm(join(dirname(resolve(file)), dir), { recursive: true, force: true });
    throw error;
  }
}

function descriptor(manifest, spec) {
  if (!manifest || manifest.schema !== spec.schema || !Array.isArray(manifest.chunks) ||
      !count(manifest[spec.itemName]) || !count(manifest.rows) || !count(manifest.records) || !/^[a-f0-9]{64}$/.test(manifest.sha256 ?? ''))
    throw new Error('Invalid session sidecar manifest');
  for (const x of manifest.chunks) if (!x || !count(x.bytes) || x.bytes < 1 || x.bytes > MAX_SESSION_CHUNK_BYTES ||
      !count(x[spec.itemName]) || !count(x.rows) || !count(x.records) || !/^[a-f0-9]{64}$/.test(x.sha256 ?? ''))
    throw new Error('Invalid sidecar chunk descriptor');
}
async function chunkPath(file, path) {
  if (typeof path !== 'string' || !path || isAbsolute(path) || /^[A-Za-z]:/.test(path) || path.includes('\\') || path.includes('\0') ||
      path.split('/').some((x) => !x || x === '.' || x === '..')) throw new Error('Sidecar path must be a safe relative path');
  const parent = await realpath(dirname(resolve(file))), actual = await realpath(join(parent, path));
  const rel = relative(parent, actual);
  if (!rel || rel === '..' || rel.startsWith('../') || isAbsolute(rel)) throw new Error('Sidecar symlink escapes the dump directory');
  return actual;
}

async function* readSidecar(file, manifest, spec) {
  descriptor(manifest, spec);
  const hash = createHash('sha256'), total = { [spec.itemName]: 0, rows: 0, records: 0 };
  const paths = new Set();
  let current, currentIndex = -1, rowOffset = 0;
  for (const chunk of manifest.chunks) {
    if (paths.has(chunk.path)) throw new Error('Duplicate sidecar chunk path');
    paths.add(chunk.path);
    const path = await chunkPath(file, chunk.path), info = await stat(path);
    if (!info.isFile() || info.size !== chunk.bytes || info.size > MAX_SESSION_CHUNK_BYTES) throw new Error('Sidecar chunk byte size mismatch');
    const bytes = await readFile(path);
    if (bytes.length !== chunk.bytes || digest(bytes) !== chunk.sha256) throw new Error('Sidecar chunk SHA256/bytes mismatch');
    hash.update(bytes);
    const text = bytes.toString('utf8');
    if (!text.endsWith('\n')) throw new Error('Incomplete sidecar record');
    const actual = { [spec.itemName]: 0, rows: 0, records: 0 };
    for (const line of text.slice(0, -1).split('\n')) {
      const rec = JSON.parse(line);
      if (!Array.isArray(rec)) throw new Error('Invalid sidecar record');
      actual.records++; total.records++;
      if (spec.rowsKey && rec[0] === spec.tag) {
        if (rec.length !== 3 || rec[1] !== currentIndex + 1 || !rec[2] || typeof rec[2] !== 'object' || Array.isArray(rec[2]) || own(rec[2], spec.rowsKey))
          throw new Error('Invalid sidecar item ordinal or metadata');
        if (current !== undefined) yield current;
        currentIndex = rec[1]; rowOffset = 0;
        current = { ...rec[2], [spec.rowsKey]: [] };
        actual[spec.itemName]++; total[spec.itemName]++;
      } else if (spec.rowsKey && rec[0] === 'r') {
        if (rec.length !== 4 || !current || rec[1] !== currentIndex || rec[2] !== rowOffset++) throw new Error('Invalid sidecar row ordinal');
        current[spec.rowsKey].push(rec[3]); actual.rows++; total.rows++;
      } else if (!spec.rowsKey && rec[0] === 'i') {
        if (rec.length !== 3 || rec[1] !== total[spec.itemName]) throw new Error('Invalid flat sidecar item ordinal');
        actual[spec.itemName]++; total[spec.itemName]++; actual.rows++; total.rows++;
        yield rec[2];
      } else throw new Error('Unexpected sidecar record type');
    }
    for (const k of [spec.itemName, 'rows', 'records']) if (actual[k] !== chunk[k]) throw new Error(`Sidecar chunk ${k} count mismatch`);
  }
  for (const k of [spec.itemName, 'rows', 'records']) if (total[k] !== manifest[k]) throw new Error(`Sidecar total ${k} count mismatch`);
  if (hash.digest('hex') !== manifest.sha256) throw new Error('Sidecar ordered payload SHA256 mismatch');
  if (current !== undefined) yield current;
}

const tapeSpec = { schema: TAPE_SCHEMA, itemName: 'tapes', rowsKey: 'trades', tag: 't' };
const validationSpec = { schema: VALIDATION_SCHEMA, itemName: 'steps', rowsKey: 'checks', tag: 'v' };
const arraySpec = { schema: ARRAY_SCHEMA, itemName: 'items', rowsKey: null };
async function headerOf(file) {
  const raw = JSON.parse(await readFile(file, 'utf8'));
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Invalid session dump object');
  if (raw.arraySidecars !== undefined && (!raw.arraySidecars || typeof raw.arraySidecars !== 'object' || Array.isArray(raw.arraySidecars) ||
      Object.keys(raw.arraySidecars).some((field) => RESERVED_ARRAY_FIELDS.has(field))))
    throw new Error('Invalid or reserved flat array sidecar field');
  return raw;
}

/** Iteration preserves duplicate config IDs, empty items and exact global order. */
export async function* iterateSessionArray(file, field) {
  const raw = await headerOf(file);
  const manifest = field === 'tapeTrades' ? raw.tapeTradesSidecar : field === 'validation' ? raw.validationSidecar : raw.arraySidecars?.[field];
  if (!manifest) { for (const x of raw[field] ?? []) yield x; return; }
  const spec = field === 'tapeTrades' ? tapeSpec : field === 'validation' ? validationSpec : arraySpec;
  yield* readSidecar(file, manifest, spec);
}
export const iterateSessionTapeTrades = (file) => iterateSessionArray(file, 'tapeTrades');
export const iterateSessionValidation = (file) => iterateSessionArray(file, 'validation');

/** Exhaust every selected sidecar without retaining its complete array. */
export async function verifySessionDumpSidecars(file, options = {}) {
  const raw = await headerOf(file), verified = {};
  const manifests = [
    ['tapeTrades', raw.tapeTradesSidecar, tapeSpec],
    ['validation', raw.validationSidecar, validationSpec],
    ...Object.entries(raw.arraySidecars ?? {}).map(([field, manifest]) => [field, manifest, arraySpec]),
  ];
  for (const [field, manifest, spec] of manifests) {
    if (!manifest || (options.fields && !options.fields.includes(field))) continue;
    for await (const _ of readSidecar(file, manifest, spec)) { /* validation requires full exhaustion */ }
    verified[field] = { ...manifest, bytes: manifest.chunks.reduce((n, x) => n + x.bytes, 0) };
  }
  return verified;
}

/** Remove an owned temporary dump and its referenced chunks, retaining unrelated files. */
export async function removeSessionDump(file) {
  const raw = await headerOf(file), paths = new Set();
  for (const [manifest, spec] of [
    [raw.tapeTradesSidecar, tapeSpec], [raw.validationSidecar, validationSpec],
    ...Object.values(raw.arraySidecars ?? {}).map((m) => [m, arraySpec]),
  ]) {
    if (!manifest) continue;
    descriptor(manifest, spec);
    for (const chunk of manifest.chunks) paths.add(await chunkPath(file, chunk.path));
  }
  // Validate every path before removing the first file.
  for (const path of paths) await unlink(path);
  for (const dir of new Set([...paths].map(dirname))) await rmdir(dir).catch((error) => {
    if (!['ENOTEMPTY', 'ENOENT'].includes(error.code)) throw error;
  });
  await unlink(file);
}

/** Default hydration returns the legacy flat shape. Projection retains unloaded manifests. */
export async function readSessionDump(file, options = {}) {
  const raw = await headerOf(file);
  const want = (field) => options.loadSidecars !== false && (!options.fields || options.fields.includes(field)) &&
    !(field === 'tapeTrades' && options.loadTapeTrades === false) && !(field === 'validation' && options.loadValidation === false);
  const verifyUnloaded = (field) => options.verifyUnloaded === true || (Array.isArray(options.verifyUnloaded) && options.verifyUnloaded.includes(field));
  for (const [field, key, spec] of [['tapeTrades', 'tapeTradesSidecar', tapeSpec], ['validation', 'validationSidecar', validationSpec]]) {
    if (!raw[key]) continue;
    if (!want(field)) {
      if (verifyUnloaded(field)) for await (const _ of readSidecar(file, raw[key], spec)) { /* verify only */ }
      continue;
    }
    const values = [];
    for await (const item of readSidecar(file, raw[key], spec)) values.push(item);
    raw[field] = values; delete raw[key];
  }
  if (raw.arraySidecars) {
    for (const [field, manifest] of Object.entries(raw.arraySidecars)) {
      if (!want(field)) {
        if (verifyUnloaded(field)) for await (const _ of readSidecar(file, manifest, arraySpec)) { /* verify only */ }
        continue;
      }
      const values = [];
      for await (const item of readSidecar(file, manifest, arraySpec)) values.push(item);
      raw[field] = values; delete raw.arraySidecars[field];
    }
    if (!Object.keys(raw.arraySidecars).length) delete raw.arraySidecars;
  }
  return raw;
}
