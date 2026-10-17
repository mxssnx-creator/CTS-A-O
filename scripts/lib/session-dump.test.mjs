import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { iterateSessionTapeTrades, readSessionDump, verifySessionDumpSidecars, writeJsonFile, writeSessionDump, writeTapeTradesSidecar } from "./session-dump.mjs";

const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
// Hash the ordered legacy unit-return rows, independently of sidecar record/chunk framing.
function unitRowHash(tapes) {
  const h = createHash("sha256");
  for (const [tapeIndex, tape] of tapes.entries()) {
    h.update(JSON.stringify(["config", tapeIndex, tape.id]) + "\n");
    for (const [rowIndex, row] of tape.trades.entries()) h.update(JSON.stringify([tapeIndex, rowIndex, row]) + "\n");
  }
  return h.digest("hex");
}
function workspace(t) {
  const dir = mkdtempSync(join(tmpdir(), "cts-session-dump-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return { dir, file: join(dir, "raw.json") };
}
function rawSample() {
  return {
    version: 2,
    notes: "Config α · 中文 · 🚀\nquoted \"text\" and \\ slash",
    settings: { gates: { minPf: 1.1 }, cost: 0.0015 },
    trades: [{ cfg: "normal α", sym: "BTC-USDT", side: 1, r: 0.00001 }],
    tapeTrades: [
      { id: "empty-first", trades: [] },
      { id: "normal α", trades: Array.from({ length: 25 }, (_, i) => ["币🚀-USDT", i % 2 ? -1 : 1, i * 60_000, i * 60_000 + 30_000, (i - 12) / 100_000]) },
      { id: "empty-middle", trades: [] },
      { id: "trailing-only", trades: [["ETH-USDT", -1, 0, 60_000, -0.00000000003]] },
      { id: "empty-last", trades: [] },
    ],
    openEnd: [],
  };
}

async function storedFixture(t) {
  const { dir, file } = workspace(t);
  await writeSessionDump(file, rawSample(), { maxChunkBytes: 256 });
  const manifest = JSON.parse(readFileSync(file, "utf8"));
  return { dir, file, manifest, sidecar: manifest.tapeTradesSidecar };
}
function saveManifest(file, manifest) {
  writeFileSync(file, JSON.stringify(manifest));
}
function replaceChunk(fixture, index, change) {
  const chunk = fixture.sidecar.chunks[index];
  const path = join(dirname(fixture.file), chunk.path);
  const data = Buffer.from(change(readFileSync(path, "utf8")), "utf8");
  writeFileSync(path, data);
  chunk.bytes = data.length;
  chunk.sha256 = hash(data);
  const whole = createHash("sha256");
  for (const part of fixture.sidecar.chunks) whole.update(readFileSync(join(dirname(fixture.file), part.path)));
  fixture.sidecar.sha256 = whole.digest("hex");
  saveManifest(fixture.file, fixture.manifest);
}

test("chunked dump round-trips exact config ordering, empty tapes, split tapes, and UTF-8 rows", async (t) => {
  const { file } = workspace(t);
  const raw = rawSample();
  const original = structuredClone(raw);
  await writeSessionDump(file, raw, { maxChunkBytes: 256 });
  const loaded = await readSessionDump(file);
  assert.deepEqual(loaded, original);
  assert.equal(unitRowHash(loaded.tapeTrades), unitRowHash(original.tapeTrades), "ordered unit-return row SHA is identical to legacy evidence");
  assert.notEqual(unitRowHash([...loaded.tapeTrades].reverse()), unitRowHash(original.tapeTrades), "row hash must detect a changed config order");
  assert.deepEqual(raw, original, "writing must not mutate the caller's report data");
  const stored = JSON.parse(readFileSync(file, "utf8"));
  assert.ok(stored.tapeTradesSidecar, "raw file records sidecar provenance");
  assert.ok(!stored.tapeTrades?.length, "the large per-config arrays are moved out of the manifest");
  const sidecar = stored.tapeTradesSidecar;
  assert.equal(sidecar.schema, "cts-session-tape-trades-v1");
  assert.equal(sidecar.tapes, original.tapeTrades.length);
  assert.equal(sidecar.rows, 26);
  assert.ok(sidecar.chunks.length > 2, "a single large tape must split across bounded chunks");
  for (const chunk of sidecar.chunks) {
    const bytes = readFileSync(join(dirname(file), chunk.path));
    assert.equal(chunk.bytes, bytes.length);
    assert.equal(statSync(join(dirname(file), chunk.path)).size, chunk.bytes);
    assert.ok(chunk.bytes <= 256, "the bound counts UTF-8 bytes, not JS string length");
    assert.equal(chunk.sha256, hash(bytes));
    assert.equal(chunk.records, bytes.toString("utf8").trimEnd().split("\n").length);
  }
  assert.equal(sidecar.sha256, hash(Buffer.concat(sidecar.chunks.map((chunk) => readFileSync(join(dirname(file), chunk.path))))));
});

test("duplicate config IDs and additional tape metadata retain their exact ordering", async (t) => {
  const { file } = workspace(t);
  const raw = { tapeTrades: [
    { id: "same", source: { lane: 1 }, trades: [["BTC-USDT", 1, 1, 2, 0.1]] },
    { id: "same", source: { lane: 5 }, trades: [] },
    { id: "same", source: { lane: 30 }, trades: [["ETH-USDT", -1, 3, 4, -0.2]] },
  ] };
  await writeSessionDump(file, raw, { maxChunkBytes: 256 });
  assert.deepEqual(await readSessionDump(file), raw);
});

test("legacy flat dumps, absent tapeTrades, and empty tapeTrades remain readable losslessly", async (t) => {
  const { file } = workspace(t);
  for (const raw of [rawSample(), { version: 1, trades: [] }, { version: 2, tapeTrades: [] }]) {
    writeFileSync(file, JSON.stringify(raw));
    assert.deepEqual(await readSessionDump(file), raw);
  }
});

test("the streamed generic JSON writer preserves normal JSON serialization and escaped data", async (t) => {
  const { file } = workspace(t);
  const value = {
    text: "a\nb\t\"\\中文🚀\u0000",
    absent: undefined,
    values: [null, true, false, 0, -1e-12, undefined, NaN, Infinity],
    nested: { a: [1, { b: "end" }], empty: {}, array: [] },
    rows: Array.from({ length: 10_000 }, (_, i) => ({ id: i, value: `row ${i} α` })),
  };
  await writeJsonFile(file, value);
  assert.deepEqual(JSON.parse(readFileSync(file, "utf8")), JSON.parse(JSON.stringify(value)));
});

test("streamed JSON retains special own keys and excludes inherited properties", async (t) => {
  const { file } = workspace(t);
  const value = JSON.parse('{"__proto__":{"keep":"own data"},"constructor":"own constructor","toString":"own string","nested":{"__proto__":17}}');
  Object.setPrototypeOf(value.nested, { inheritedSecret: "must not be serialized" });
  const nullPrototype = Object.create(null);
  nullPrototype.__proto__ = "ordinary key on null-prototype data";
  nullPrototype.constructor = "ordinary constructor key";
  value.nullPrototype = nullPrototype;
  value.date = new Date("2026-10-17T00:00:00Z");
  value.custom = { toJSON(key) { return { transformedFor: key }; } };
  await writeJsonFile(file, value);
  assert.deepEqual(JSON.parse(readFileSync(file, "utf8")), JSON.parse(JSON.stringify(value)));
});

test("flat array sidecars reject reserved storage and prototype fields on both write and read", async (t) => {
  const { file } = workspace(t);
  for (const field of ["tapeTrades", "validation", "arraySidecars", "tapeTradesSidecar", "validationSidecar", "__proto__", "constructor", "prototype"]) {
    const raw = JSON.parse(`{${JSON.stringify(field)}:[1]}`);
    await assert.rejects(() => writeSessionDump(file, raw, { arrayFields: [field] }), /field|sidecar/i);
    writeFileSync(file, JSON.stringify({ tapeTrades: [{ id: "verified-history", trades: [] }], arraySidecars: { [field]: {} } }));
    await assert.rejects(() => readSessionDump(file), /reserved|field/i);
  }
});

test("nonfinite and missing row entries normalize exactly as legacy JSON.stringify", async (t) => {
  const { file } = workspace(t);
  const raw = { tapeTrades: [{ id: "nonfinite", trades: [
    ["BTC-USDT", 1, 0, 1, NaN],
    ["ETH-USDT", -1, 1, 2, Infinity],
    ["SOL-USDT", 1, 2, 3, -Infinity],
    ["XRP-USDT", -1, 3, 4, undefined],
    ["DOGE-USDT", 1, 4, 5, -0],
    ["MIN-USDT", 1, 5, 6, Number.MIN_VALUE],
    ["MAX-USDT", -1, 6, 7, Number.MAX_VALUE],
    ["ROUND-USDT", 1, 7, 8, 1 + Number.EPSILON],
    ["TINY-USDT", -1, 8, 9, -1.0000000000000002e-300],
  ] }] };
  await writeSessionDump(file, raw, { maxChunkBytes: 256 });
  const loaded = await readSessionDump(file);
  assert.deepEqual(loaded, JSON.parse(JSON.stringify(raw)));
  assert.equal(unitRowHash(loaded.tapeTrades), unitRowHash(raw.tapeTrades), "legacy JSON normalization and adverse double-precision unit returns have identical ordered row SHA");
});

test("a failed generic serialization retains the prior file and removes its temporary file", async (t) => {
  const { dir, file } = workspace(t);
  writeFileSync(file, '{"previous":"valid"}');
  await assert.rejects(async () => writeJsonFile(file, { impossible: 1n }), /BigInt/i);
  assert.equal(readFileSync(file, "utf8"), '{"previous":"valid"}');
  assert.deepEqual(readdirSync(dir), ["raw.json"]);
});

test("a later sidecar failure preserves the prior dump and cleans earlier staged sidecars", async (t) => {
  const { dir, file } = workspace(t);
  writeFileSync(file, '{"previous":"valid"}');
  const raw = {
    tapeTrades: [{ id: "safe", trades: [["BTC-USDT", 1, 0, 1, 0.01]] }],
    validation: [{ t: 0, real: [], checks: [["x".repeat(1_000), 1, 25, 1.2]] }],
  };
  await assert.rejects(async () => writeSessionDump(file, raw, { maxChunkBytes: 256 }), /chunk|record|bytes|exceed/i);
  assert.equal(readFileSync(file, "utf8"), '{"previous":"valid"}');
  assert.deepEqual(readdirSync(dir), ["raw.json"], "failure must not leak an unreachable evidence directory");
});

test("dump writes with absent or empty tape arrays retain the exact original JSON shape", async (t) => {
  const { file } = workspace(t);
  for (const raw of [{ version: 1, trades: [] }, { version: 2, tapeTrades: [] }]) {
    await writeSessionDump(file, raw, { maxChunkBytes: 256 });
    assert.deepEqual(await readSessionDump(file), raw);
  }
});

test("the async tape iterator reconstructs each complete tape, including empty tapes", async (t) => {
  const f = await storedFixture(t);
  const tapes = [];
  for await (const tape of iterateSessionTapeTrades(f.file)) tapes.push(tape);
  assert.deepEqual(tapes, rawSample().tapeTrades);
});

test("a metadata-only read leaves the sidecar manifest without loading chunk files", async (t) => {
  const f = await storedFixture(t);
  rmSync(join(f.dir, f.sidecar.chunks[0].path));
  assert.deepEqual(await readSessionDump(f.file, { loadTapeTrades: false }), f.manifest);
  await assert.rejects(async () => readSessionDump(f.file), /ENOENT|missing|chunk|sidecar/i);
});

test("the bounded verifier checks complete sidecar counts without hydrating or changing trade order", async (t) => {
  const { file } = workspace(t);
  const raw = { ...rawSample(),
    validation: [{ t: 1, real: [], checks: Array.from({ length: 10 }, (_, i) => [`config-${i}`, 1, 25, 1.2]) }, { t: 2, real: [], checks: [] }],
    trades: [{ closeIndex: 2 }, { closeIndex: 0 }, { closeIndex: 1 }],
  };
  await writeSessionDump(file, raw, { maxChunkBytes: 256, arrayFields: ["trades"] });
  const headerBytes = readFileSync(file, "utf8"), header = JSON.parse(headerBytes);
  const verified = await verifySessionDumpSidecars(file);
  assert.deepEqual(Object.keys(verified).sort(), ["tapeTrades", "trades", "validation"]);
  assert.equal(verified.tapeTrades.tapes, 5);
  assert.equal(verified.tapeTrades.rows, 26);
  assert.equal(verified.tapeTrades.records, 31);
  assert.equal(verified.validation.steps, 2);
  assert.equal(verified.validation.rows, 10);
  assert.equal(verified.trades.items, 3);
  assert.equal(verified.trades.rows, 3);
  for (const result of Object.values(verified)) assert.equal(result.bytes, result.chunks.reduce((n, chunk) => n + chunk.bytes, 0));
  assert.deepEqual(Object.keys(await verifySessionDumpSidecars(file, { fields: ["validation"] })), ["validation"]);
  assert.deepEqual(await readSessionDump(file, { loadSidecars: false, verifyUnloaded: true }), header);
  assert.deepEqual(await readSessionDump(file), raw);
  assert.deepEqual(await readSessionDump(file), raw, "verification and repeated hydration never append duplicate rows");
  assert.deepEqual((await readSessionDump(file)).trades.map((row) => row.closeIndex), [2, 0, 1]);
  assert.equal(readFileSync(file, "utf8"), headerBytes, "read verification does not rewrite the evidence header");
});

test("projected reads can verify unloaded validation and reject its corrupted physical evidence", async (t) => {
  const { file, dir } = workspace(t);
  const raw = { ...rawSample(), validation: [{ t: 1, real: [], checks: [["config", 1, 25, 1.2]] }] };
  await writeSessionDump(file, raw, { maxChunkBytes: 256 });
  const header = JSON.parse(readFileSync(file, "utf8"));
  const chunk = join(dir, header.validationSidecar.chunks[0].path);
  writeFileSync(chunk, readFileSync(chunk, "utf8") + "\n");
  const projection = { loadTapeTrades: false, loadValidation: false };
  assert.deepEqual(await readSessionDump(file, projection), header, "unverified projection explicitly keeps unloaded manifests");
  await assert.rejects(async () => readSessionDump(file, { ...projection, verifyUnloaded: ["validation"] }), /sidecar|chunk|bytes|sha/i);
  await assert.rejects(async () => readSessionDump(file, { ...projection, verifyUnloaded: true }), /sidecar|chunk|bytes|sha/i);
  await assert.rejects(async () => verifySessionDumpSidecars(file, { fields: ["validation"] }), /sidecar|chunk|bytes|sha/i);
});

test("the sidecar writer accepts an iterable without requiring an expanded tape array", async (t) => {
  const { file } = workspace(t);
  const original = rawSample();
  let yielded = 0;
  function* tapes() {
    for (const tape of original.tapeTrades) {
      yielded++;
      yield tape;
    }
  }
  const manifest = await writeTapeTradesSidecar(file, tapes(), { maxChunkBytes: 256 });
  assert.equal(yielded, original.tapeTrades.length);
  saveManifest(file, { tapeTrades: [], tapeTradesSidecar: manifest });
  assert.deepEqual(await readSessionDump(file), { tapeTrades: original.tapeTrades });
});

test("validation history splits checks losslessly and preserves empty steps and metadata", async (t) => {
  const { file } = workspace(t);
  const raw = { validation: [
    { t: 0, real: [], checks: [] },
    { t: 60_000, real: ["config-α"], checks: Array.from({ length: 30 }, (_, i) => [`config-α-${i}`, i % 2, 25 + i, 1.2 + i / 100, 0.2, 0.1]) },
    { t: 120_000, real: ["config-β"], checks: [], note: "empty checks retain this step" },
  ] };
  await writeSessionDump(file, raw, { maxChunkBytes: 256 });
  assert.deepEqual(await readSessionDump(file), raw);
  const stored = JSON.parse(readFileSync(file, "utf8"));
  const sidecar = stored.validationSidecar;
  assert.deepEqual(stored.validation, []);
  assert.equal(sidecar.schema, "cts-session-validation-v1");
  assert.equal(sidecar.steps, 3);
  assert.equal(sidecar.rows, 30);
  assert.ok(sidecar.chunks.length > 2);
  for (const chunk of sidecar.chunks) assert.ok(chunk.bytes <= 256);
  rmSync(join(dirname(file), sidecar.chunks[0].path));
  assert.deepEqual(await readSessionDump(file, { loadValidation: false }), stored);
  await assert.rejects(async () => readSessionDump(file), /ENOENT|missing|chunk|sidecar/i);
});

test("flat executed trade sidecars retain exact closeIndex and settlement ordering", async (t) => {
  const { file } = workspace(t);
  const raw = { trades: [
    { cfg: "same", sym: "BTC-USDT", closeIndex: 0, exitT: 10, r: 0.01 },
    { cfg: "same", sym: "BTC-USDT", closeIndex: 2, exitT: 20, r: -0.02 },
    { cfg: "same", sym: "BTC-USDT", closeIndex: 1, exitT: 20, r: 0.03 },
  ], notes: "equal exit timestamps must not reorder settlement slices" };
  await writeSessionDump(file, raw, { maxChunkBytes: 256, arrayFields: ["trades"] });
  assert.deepEqual(await readSessionDump(file), raw);
  const stored = JSON.parse(readFileSync(file, "utf8"));
  assert.deepEqual(stored.trades, []);
  assert.equal(stored.arraySidecars.trades.schema, "cts-session-array-v1");
  assert.equal(stored.arraySidecars.trades.items, 3);
});

for (const field of ["sha256", "bytes", "records", "tapes", "rows"]) {
  test(`reader rejects altered chunk ${field}`, async (t) => {
    const f = await storedFixture(t);
    const chunk = f.sidecar.chunks[0];
    chunk[field] = field === "sha256" ? "0".repeat(64) : chunk[field] + 1;
    saveManifest(f.file, f.manifest);
    await assert.rejects(async () => readSessionDump(f.file), /checksum|sha|bytes|size|count|records|tapes|rows|manifest/i);
  });
}

for (const field of ["records", "tapes", "rows"]) {
  test(`reader rejects altered total ${field}`, async (t) => {
    const f = await storedFixture(t);
    f.sidecar[field]++;
    saveManifest(f.file, f.manifest);
    await assert.rejects(async () => readSessionDump(f.file), /count|records|tapes|rows|manifest/i);
  });
}

test("reader rejects modified sidecar bytes even when their length is unchanged", async (t) => {
  const f = await storedFixture(t);
  const path = join(f.dir, f.sidecar.chunks[0].path);
  const before = readFileSync(path, "utf8");
  const after = before.replace("empty-first", "empty-firsX");
  assert.notEqual(after, before);
  assert.equal(Buffer.byteLength(after), Buffer.byteLength(before));
  writeFileSync(path, after);
  await assert.rejects(async () => readSessionDump(f.file), /checksum|sha/i);
});

test("reader enforces config ordinals even when changed content has a valid checksum", async (t) => {
  const f = await storedFixture(t);
  replaceChunk(f, 0, (text) => {
    const records = text.trimEnd().split("\n").map((line) => JSON.parse(line));
    assert.equal(records[0][0], "t");
    records[0][1] = 7;
    return records.map((record) => JSON.stringify(record)).join("\n") + "\n";
  });
  await assert.rejects(async () => readSessionDump(f.file), /order|ordinal|tape|config/i);
});

test("reader enforces each tape's row offsets even when changed content has valid checksums", async (t) => {
  const f = await storedFixture(t);
  const index = f.sidecar.chunks.findIndex((chunk) => readFileSync(join(f.dir, chunk.path), "utf8").includes('["r",'));
  assert.ok(index >= 0);
  replaceChunk(f, index, (text) => {
    const records = text.trimEnd().split("\n").map((line) => JSON.parse(line));
    const row = records.find((record) => record[0] === "r");
    row[2] = 99;
    return records.map((record) => JSON.stringify(record)).join("\n") + "\n";
  });
  await assert.rejects(async () => readSessionDump(f.file), /order|offset|ordinal|row/i);
});

test("reader validates the ordered whole-sidecar checksum", async (t) => {
  const f = await storedFixture(t);
  f.sidecar.sha256 = "f".repeat(64);
  saveManifest(f.file, f.manifest);
  await assert.rejects(async () => readSessionDump(f.file), /checksum|sha/i);
});

test("reader rejects reversed chunk order rather than silently reordering tape rows", async (t) => {
  const f = await storedFixture(t);
  f.sidecar.chunks.reverse();
  f.sidecar.sha256 = hash(Buffer.concat(f.sidecar.chunks.map((chunk) => readFileSync(join(f.dir, chunk.path)))));
  saveManifest(f.file, f.manifest);
  await assert.rejects(async () => readSessionDump(f.file), /order|ordinal|tape|row|config/i);
});

for (const path of ["/tmp/foreign.jsonl", "../foreign.jsonl", "parts/../foreign.jsonl", "parts\\foreign.jsonl", "C:\\foreign.jsonl"]) {
  test(`reader rejects unsafe sidecar path ${JSON.stringify(path)}`, async (t) => {
    const f = await storedFixture(t);
    f.sidecar.chunks[0].path = path;
    saveManifest(f.file, f.manifest);
    await assert.rejects(async () => readSessionDump(f.file), /path|relative|traversal|unsafe|sidecar/i);
  });
}

test("reader rejects a relative symlink escaping the dump directory", async (t) => {
  const f = await storedFixture(t);
  const outside = workspace(t);
  const chunk = f.sidecar.chunks[0];
  const external = join(outside.dir, "external.jsonl");
  writeFileSync(external, readFileSync(join(f.dir, chunk.path)));
  symlinkSync(external, join(f.dir, "escape.jsonl"));
  chunk.path = "escape.jsonl";
  saveManifest(f.file, f.manifest);
  await assert.rejects(async () => readSessionDump(f.file), /path|escape|outside|symlink|sidecar/i);
});

for (const maxChunkBytes of [0, -1, 1.5, 8 * 1024 * 1024 + 1]) {
  test(`writer rejects invalid chunk byte limit ${maxChunkBytes}`, async (t) => {
    const { file } = workspace(t);
    await assert.rejects(async () => writeSessionDump(file, rawSample(), { maxChunkBytes }), /chunk|bytes|limit|integer/i);
  });
}

test("writer rejects a single row larger than the chunk bound", async (t) => {
  const { file } = workspace(t);
  const raw = { tapeTrades: [{ id: "one", trades: [["🚀".repeat(100), 1, 0, 1, 0.1]] }] };
  await assert.rejects(async () => writeSessionDump(file, raw, { maxChunkBytes: 256 }), /chunk|line|record|size|bytes|large|exceed/i);
});
