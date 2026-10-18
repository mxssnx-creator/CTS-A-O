// Offline report microprofile. This extracts source text; it does not invoke the
// renderer, engine, strategy qualification, frozen-session guards or live APIs.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";
import { readSessionDump } from "./lib/session-dump.mjs";
import { sessionUnitNotional, sessionCashPnl } from "./lib/session-owned-returns.mjs";
import { createMinuteBookCache } from "./lib/session-minute-book.mjs";
import { orderKey } from "../src/core/sizing.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i < 0 ? fallback : process.argv[i + 1]; };
// The producer commit is public and merged. An explicit file/ref supports
// archived workspaces; a local-only fallback is always labeled in evidence.
const PUBLIC_BASE = "c62701343668b5b87f2bfd5644eb46ff0f44b4f5";
const LOCAL_BASE = "0297eef541f4ee360e040b55d66786760bab6792";
const BASE = arg("baseline-ref", PUBLIC_BASE);
const EXPECTED_BASE_SHA256 = "c594126151a399a23c30f42e5435c52252dac762307b32b117f8af2ca16f2014";
const sha = (value) => createHash("sha256").update(value).digest("hex");
const json = (value) => JSON.stringify(value, (_, v) => {
  if (typeof v !== "number") return v;
  const bytes = Buffer.allocUnsafe(8); bytes.writeDoubleBE(v);
  return { "$f64": bytes.toString("hex") };
});
const hashValue = (value) => sha(json(value));
const clean = (value) => JSON.parse(JSON.stringify(value, (_, v) => typeof v === "number" && Number.isFinite(v) ? +v.toFixed(6) : v));
let baselineUsed, baselineText;
function source(variant) {
  if (variant !== "old") return readFileSync(join(ROOT, "scripts/core-session.mjs"), "utf8");
  if (baselineText !== undefined) return baselineText;
  if (arg("baseline-file")) {
    const file = resolve(arg("baseline-file")); baselineUsed = { kind: "file", file, localFallback: false };
    return baselineText = readFileSync(file, "utf8");
  }
  const read = (ref) => execFileSync("git", ["show", `${ref}:scripts/core-session.mjs`], { cwd: ROOT, encoding: "utf8", maxBuffer: 2e6, stdio: ["ignore", "pipe", "pipe"] });
  try { baselineText = read(BASE); baselineUsed = { kind: "git-ref", requested: BASE, used: BASE, localFallback: BASE === LOCAL_BASE }; }
  catch (error) {
    if (arg("baseline-ref") !== undefined) throw error;
    baselineText = read(LOCAL_BASE); baselineUsed = { kind: "git-ref", requested: BASE, used: LOCAL_BASE, localFallback: true,
      note: "Public producer ref absent locally. Fetch origin c62701343668b5b87f2bfd5644eb46ff0f44b4f5 or pass --baseline-file/--baseline-ref. Exact producer SHA is checked below." };
  }
  return baselineText;
}

function between(text, start, end) {
  const a = text.indexOf(start), b = text.indexOf(end, a);
  assert(a >= 0 && b > a, `Missing unique extraction markers: ${start} / ${end}`);
  assert.equal(text.indexOf(start, a + start.length), -1, `Ambiguous marker: ${start}`);
  return text.slice(a, b);
}
function extract(text) {
  const price = between(text, "const closeAt = new Map();", "// trades by entry (for the open set)");
  const book = between(text, "// every order the equity carries:", "  const closed = trades.filter");
  const tail = ["  hh.ddNowH = (hEnd - peakT) / H;", "  hh.maxDdPct = maxDdPct;", "  hours.push(hh);"].map((line) => {
    assert(text.includes(line), `Missing unchanged hourly statement: ${line}`); return line;
  }).join("\n");
  // Only minute-derived fields are returned. Closed-hour PF/statistics and the
  // remaining report are outside this extraction and are separately source-hashed.
  return `${price}\n${book}\n${tail}\n}\nreturn {hours,curve,realized,peak,maxDd,maxDdPct,peakT,eqDdtMax,mtmMissing,ruinT,marginOver,eqLast};`;
}
function unchangedEvidence(old, current) {
  const parts = [
    ["hourly closed/PF statistics", "  const closed = trades.filter", "/**\n * Closed-trade statistics of a group"],
    ["report rounding", "const round = (v, d = 6)", "const data = clean({"],
  ];
  return Object.fromEntries(parts.map(([label, start, end]) => {
    const a = between(old, start, end), b = between(current, start, end);
    assert.equal(a, b, `Unexpected change outside minute slice: ${label}`);
    return [label, { identical: true, sha256: sha(a) }];
  }));
}
function producerEvidence(artifacts, window, oldSource) {
  const file = join(artifacts, window, "artifact/source-proof.json"), bytes = readFileSync(file);
  const proof = JSON.parse(bytes), reporter = proof.commonReporter?.find((entry) => entry.path === "scripts/core-session.mjs");
  assert(reporter, `${window}: original reporter source proof is required`);
  assert.equal(reporter.sha256, EXPECTED_BASE_SHA256, `${window}: unexpected study producer`);
  assert.equal(sha(oldSource), reporter.sha256, `${window}: extracted old source was not the recorded producer`);
  const dependencies = Object.fromEntries(["scripts/lib/session-dump.mjs", "scripts/lib/session-owned-returns.mjs", "scripts/lib/book-notional.mjs", "src/core/sizing.ts", "src/core/metrics/stats.ts"].map((path) => {
    const recorded = proof.commonReporter?.find((entry) => entry.path === path)?.sha256 ?? proof.economicFiles?.find((entry) => entry.path === path)?.correctedSha256;
    assert(recorded, `${window}: missing producer dependency proof: ${path}`);
    const actual = sha(readFileSync(join(ROOT, path)));
    assert.equal(actual, recorded, `${window}: profile dependency differs from producer: ${path}`);
    return [path, actual];
  }));
  return { file: resolve(file), sha256: sha(bytes), producerReporterSha256: reporter.sha256, exactOldSourceMatch: true, dependencies };
}
function inputEvidence(file, header, fields) {
  const bytes = readFileSync(file);
  return { file: resolve(file), bytes: bytes.length, sha256: sha(bytes),
    hydratedAndIntegrityVerifiedFields: fields,
    sidecars: Object.fromEntries(fields.filter((f) => header.arraySidecars?.[f]).map((f) => [f, header.arraySidecars[f]])),
    tapeAndValidationSidecarsRead: false };
}
function allocationMap(raw, data) {
  const units = new Map();
  const add = (orders, allocations, index) => {
    assert.equal(orders.length, allocations.length, `${index}: complete allocation rows required`);
    orders.forEach((x, i) => {
      const a = allocations[i], key = orderKey(x);
      assert.equal(a[index], i); assert.equal(a.key, key);
      assert.equal(a.cfg, x.cfg); assert.equal(a.sym, x.sym); assert.equal(a.side, x.side); assert.equal(a.entryT, x.entryT);
      if (a.unitNotional !== null) {
        assert(Number.isFinite(a.unitNotional) && a.unitNotional >= 0);
        if (units.has(key)) assert.equal(units.get(key), a.unitNotional, "Conflicting recorded allocation");
        units.set(key, a.unitNotional);
      }
    });
  };
  add(raw.trades, data.sizedOrders, "closeIndex");
  add(raw.openEnd, data.sizedOpenOrders, "openIndex");
  return units;
}
function projection(out, raw) {
  const H = 3_600_000, balance0 = raw.settings.book.balance;
  return {
    curve: out.curve,
    hours: out.hours.map((h) => ({ t: h.t, partial: h.partial, minutes: h.minutes,
      equity: h.eqEnd, eqMin: h.eqMin, eqMax: h.eqMax, ddEndPct: h.ddEndPct,
      ddMaxHourPct: h.ddMaxPct, maxDdPctSoFar: h.maxDdPct, marginMax: h.marginMax,
      marginEnd: h.marginEnd, posOpenEnd: h.openPosEnd, ordersOpenEnd: h.openEnd,
      ddtNowH: Math.max(0, h.ddNowH) })),
    total: { eqMin: Math.min(balance0, ...out.hours.map((h) => h.eqMin)), ruinT: out.ruinT,
      equityMaxDd: out.maxDd, equityMaxDdPct: out.maxDdPct, equityDdtMaxH: out.eqDdtMax / H,
      marginMax: Math.max(0, ...out.hours.map((h) => h.marginMax)), equityEnd: out.eqLast,
      feasible: out.marginOver.minutes === 0, marginOver: out.marginOver,
      openEndMtm: out.hours.at(-1)?.openAtEnd?.mtm ?? 0 },
  };
}
function recordedProjection(data, p) {
  return { curve: data.curve,
    hours: data.hours.map((h) => Object.fromEntries(Object.keys(p.hours[0]).map((k) => [k, h[k]]))),
    total: Object.fromEntries(Object.keys(p.total).map((k) => [k, k === "openEndMtm" ? data.total.openEnd.mtm : data.total[k]])) };
}

function secondaryProof({ raw, data, sized, inBook, oldText, text, directPrice }) {
  assert.equal(data.settings.caps.maxPositionX, 0); assert.equal(data.settings.caps.maxExposureX, 0);
  const sizingSource = between(text, "function sizeCapped(closed, open, o)", "const unit = (x) =>");
  assert.equal(sizingSource, between(oldText, "function sizeCapped(closed, open, o)", "const unit = (x) =>"));
  const startT = raw.window.startT, endT = raw.window.endT, M = 60000, passes = [];
  const section = (s) => between(s, "function equityPass(unitFn, allocations) {", "\nconst bookCapped = equityPass(");
  const oldSection = section(oldText), current = section(text);
  const closedPart = (s) => between(s, "  const owned = ownedReturns(trades, allocations);", "  let rl = 0;");
  assert.equal(closedPart(oldSection), closedPart(current), "Secondary PF/closed-account arithmetic changed");
  const returnPart = (s) => s.slice(s.indexOf("  return { n: owned.n"));
  assert.equal(returnPart(oldSection), returnPart(current), "Secondary return/metric mapping changed");
  const cacheLine = current.split("\n").find((line) => line.includes("const minuteBook = createMinuteBookCache"));
  assert(cacheLine); assert(!oldSection.includes("createMinuteBookCache"));
  for (const pass of ["capped", "uncapped"]) {
    // These artifacts have zero position/exposure caps. The unchanged source
    // therefore calls the same sizeCapped algorithm with identical arguments.
    // Keep a separate snapshot and unary unitFn for the uncapped invocation.
    const allocations = pass === "capped" ? sized.units : new Map(sized.units);
    const legacyUnit = (x) => sessionUnitNotional(x, allocations, orderKey);
    const cache = createMinuteBookCache(inBook, { keyOf: orderKey, unitOf: legacyUnit, priceOf: directPrice });
    for (const x of inBook) assert(Object.is(cache.order(x).unit, legacyUnit(x)));
    const slices = [];
    for (const [i, t] of [startT + M, startT + Math.floor((endT - startT) / (2 * M)) * M, endT].entries()) {
      const op = inBook.filter((x) => x.entryT <= t && x.exitT > t), variants = [];
      for (const variant of ["old", "new"]) {
        const counts = { priceLookups: 0, unitCallbacks: 0, keyCallbacks: 0 };
        const keyOf = (x) => { counts.keyCallbacks++; return orderKey(x); };
        const unitFn = (x) => { counts.unitCallbacks++; return sessionUnitNotional(x, allocations, keyOf); };
        const px = (sym, at) => { counts.priceLookups++; return directPrice(sym, at); };
        const minuteBook = createMinuteBookCache(inBook, { keyOf, unitOf: unitFn, priceOf: px });
        for (const k of Object.keys(counts)) counts[k] = 0;
        const part = between(variant === "old" ? oldSection : current, "    let mtm = 0;", "    const eq = balance0 + rl + mtm;");
        const fn = new Function("op", "t", "px", "unitFn", "minuteBook", "cost", "leverage", `${part};return {mtm,margin};`);
        const wall = performance.now(), cpu = process.cpuUsage(), result = fn(op, t, px, unitFn, minuteBook, raw.settings.cost, raw.settings.book.leverage);
        variants.push({ variant, wallMs: performance.now() - wall, cpu: process.cpuUsage(cpu), counts, hash: hashValue(result), result });
      }
      assert.equal(variants[0].hash, variants[1].hash, `${pass}/${t}: secondary SLICE parity`);
      slices.push({ label: ["start", "middle", "end"][i], t, openOrders: op.length, exactIeee754Parity: true, variants });
    }
    const counts = { priceLookups: 0, unitCallbacks: 0, keyCallbacks: 0, realizedPnlCallbacks: 0 };
    const keyOf = (x) => { counts.keyCallbacks++; return orderKey(x); };
    const unitFn = (x) => { counts.unitCallbacks++; return sessionUnitNotional(x, allocations, keyOf); };
    const px = (sym, t) => { counts.priceLookups++; return directPrice(sym, t); };
    const cashPnl = (x, map, key) => { counts.realizedPnlCallbacks++; return sessionCashPnl(x, map, key); };
    const loop = between(current, "  let rl = 0;", "  return { n: owned.n");
    const measured = loop.replace("    eqEnd = eq;", "    eqEnd = eq; if ((t-startT)%(5*M)===0) curve.push({t,bal:balance0+rl,eq,ddPct:pk>0?(pk-eq)/pk:0,margin});");
    assert.notEqual(loop, measured);
    const fn = new Function("inBook", "trades", "startT", "endT", "balance0", "cost", "leverage", "unitFn", "allocations", "orderKey", "sessionCashPnl", "px", "createMinuteBookCache", `const M=60000;${cacheLine}\nconst curve=[{t:startT,bal:balance0,eq:balance0,ddPct:0,margin:0}];${measured};return {curve,metrics:{equityEnd:eqEnd,equityMaxDd:mdd,equityMaxDdPct:mddPct,marginMax:mg,eqMin,marginOverMinutes:over}};`);
    globalThis.gc?.();
    const wall = performance.now(), cpu = process.cpuUsage(), rssBefore = process.memoryUsage().rss;
    const result = fn(inBook, raw.trades, startT, endT, raw.settings.book.balance, raw.settings.cost, raw.settings.book.leverage, unitFn, allocations, keyOf, cashPnl, px, createMinuteBookCache);
    const measuredLoop = { wallMs: performance.now() - wall, cpu: process.cpuUsage(cpu), rssBefore, rssAfter: process.memoryUsage().rss };
    const recorded = pass === "uncapped" ? data.total.uncapped : { ...data.total, marginOverMinutes: data.total.marginOver.minutes };
    const recordedMetrics = Object.fromEntries(Object.keys(result.metrics).map((k) => [k, recorded[k]]));
    assert.deepEqual(clean(result.metrics), recordedMetrics, `${pass}: secondary full minute metrics vs recorded report`);
    const recordedCurve = data.curve.map(({ t, bal, eq, ddPct, margin }) => ({ t, bal, eq, ddPct, margin }));
    assert.deepEqual(clean(result.curve), recordedCurve, `${pass}: secondary sampled full curve vs recorded zero-cap primary curve`);
    passes.push({ pass, separateAllocationSnapshot: pass === "uncapped", unaryUnitFnRespected: true,
      metricsComparisonBasis: pass === "uncapped" ? "Actual original secondary uncapped risk metrics in total.uncapped" : "Original PRIMARY headline risk metrics under zero caps; original secondary capped metrics are not separately stored",
      sampledCurveComparisonBasis: "Original PRIMARY recorded sampled curve under zero-cap allocation identity. The original secondary pass did not emit its own recorded curve; its v=unit*volume arithmetic can differ in floating bits.",
      allOrderUnitsObjectIsEqual: inBook.length, slices, fullNewOnly: { ...measuredLoop, counts,
        curveSha256: hashValue(result.curve), metricsSha256: hashValue(result.metrics),
        roundedCurveSha256: hashValue(clean(result.curve)), recordedCurveSha256: hashValue(recordedCurve),
        exactRecordedRoundedParity: true, metrics: clean(result.metrics) } });
  }
  return { basis: "Separate unary unitFn and per-pass caches; recorded caps are both zero, so identical unchanged sizing arguments imply equal allocation values. Uncapped rows are not separately recorded.",
    zeroCaps: { maxPositionX: 0, maxExposureX: 0 }, sizingSourceSha256: sha(sizingSource),
    unchangedClosedStatsSha256: sha(closedPart(current)), unchangedMetricMappingSha256: sha(returnPart(current)), passes };
}

async function child() {
  const window = arg("window"), base = resolve(arg("artifacts"));
  const evidence = join(base, window, "artifact/evidence"), rawFile = join(evidence, "raw.json"), dataFile = join(evidence, "html/data.json");
  const started = performance.now(), cpuStarted = process.cpuUsage();
  const rawHeader = JSON.parse(readFileSync(rawFile, "utf8")), dataHeader = JSON.parse(readFileSync(dataFile, "utf8"));
  const inputs = { raw: inputEvidence(rawFile, rawHeader, ["trades"]), report: inputEvidence(dataFile, dataHeader, ["sizedOrders", "sizedOpenOrders"]) };
  const raw = await readSessionDump(rawFile, { fields: ["trades"], verifyUnloaded: false });
  const data = await readSessionDump(dataFile, { fields: ["sizedOrders", "sizedOpenOrders"], verifyUnloaded: false });
  const sized = { units: allocationMap(raw, data) };
  for (let i = 1; i < raw.trades.length; i++) assert(raw.trades[i].exitT >= raw.trades[i - 1].exitT, "Recorded trades must retain exit order");
  const oldText = source("old"), text = source("new"), body = extract(text), oldBody = extract(oldText);
  const producer = producerEvidence(base, window, oldText);
  const startT = raw.window.startT, endT = raw.window.endT, M = 60000;
  const openEnd = raw.openEnd.filter((x) => x.entryT >= startT && x.entryT <= endT);
  const inBook = [...raw.trades, ...openEnd.map((o) => ({ ...o, exitT: Infinity, openAtEnd: true }))].sort((a, b) => a.entryT - b.entryT);
  const priceSource = between(text, "const closeAt = new Map();", "// trades by entry (for the open set)");
  assert.equal(priceSource, between(oldText, "const closeAt = new Map();", "// trades by entry (for the open set)"));
  const directPrice = new Function("raw", `const M=60000;${priceSource};return px;`)(raw);
  const legacyUnit = (x) => sessionUnitNotional(x, sized.units, orderKey);
  const checkedCache = createMinuteBookCache(inBook, { keyOf: orderKey, unitOf: (x, key) => sessionUnitNotional(x, sized.units, () => key), priceOf: directPrice });
  for (const x of inBook) {
    const c = checkedCache.order(x);
    assert.equal(c.key, orderKey(x)); assert(Object.is(c.unit, legacyUnit(x)));
    assert(Object.is(c.volume, x.vol ?? 1)); assert.equal(c.positionKey, `${x.sym}|${x.side}`);
    assert(Object.isFrozen(c));
  }
  let checkedPrices = 0;
  for (let t = startT + M; t <= endT; t += M) for (const sym of raw.symbols) {
    assert(Object.is(checkedCache.price(sym, t), directPrice(sym, t)), `${sym}/${t}: price mismatch`); checkedPrices++;
  }
  const cheapParity = { allOrderRecords: inBook.length, allSymbols: raw.symbols.length, allMinutePrices: checkedPrices,
    exactObjectIsParity: true, immutableRecords: true };
  const slices = [];
  const times = [startT + M, startT + Math.floor((endT - startT) / (2 * M)) * M, endT];
  for (const [i, t] of times.entries()) {
    // Use the original inBook insertion order and the exact minute's full open
    // set. These are three representative minute slices, not a full baseline.
    const open = inBook.filter((x) => x.entryT <= t && x.exitT > t), variants = [];
    for (const variant of ["old", "new"]) {
      const counts = { priceLookups: 0, unitCallbacks: 0, keyCallbacks: 0 };
      const key = (x) => { counts.keyCallbacks++; return orderKey(x); };
      const unit = (x) => { counts.unitCallbacks++; return sessionUnitNotional(x, sized.units, key); };
      const px = (sym, at) => { counts.priceLookups++; return directPrice(sym, at); };
      const cache = createMinuteBookCache(inBook, { keyOf: key, unitOf: (x, k) => { counts.unitCallbacks++; return sessionUnitNotional(x, sized.units, () => k); }, priceOf: px });
      // Cache setup is outside SLICE timing, mirroring one preparation for the
      // whole report. Full-new-loop timing below includes its actual setup.
      for (const k of Object.keys(counts)) counts[k] = 0;
      const minuteSource = between(variant === "old" ? oldBody : body, "    let mtm = 0;", "    const eq = balance0 + realized + mtm;");
      const fn = new Function("open", "t", "px", "unit", "minuteBook", "cost", "leverage", `let mtmMissing=0;${minuteSource};return {mtm,margin,mtmMissing,positions:[...posKeys],oaeN,oaeMtm,openAtEndPositions:[...oaePos]};`);
      const cpu = process.cpuUsage(), wall = performance.now(), result = fn(open, t, px, unit, cache, raw.settings.cost, raw.settings.book.leverage);
      variants.push({ variant, wallMs: performance.now() - wall, cpu: process.cpuUsage(cpu), rssAfter: process.memoryUsage().rss, counts, hash: hashValue(result), result });
    }
    assert.equal(variants[0].hash, variants[1].hash, `${window}/${t}: old/new SLICE outputs differ`);
    slices.push({ label: ["start", "middle", "end"][i], t, openOrders: open.length, exactIeee754Parity: true, variants });
  }
  let fullNewOnly, primaryReuse = null;
  if (process.argv.includes("--reuse-primary")) {
    const previousFile = resolve(arg("result")), previous = JSON.parse(readFileSync(previousFile));
    assert.equal(previous.inputs.raw.sha256, inputs.raw.sha256); assert.equal(previous.inputs.report.sha256, inputs.report.sha256);
    assert.equal(previous.source.extractedSha256, sha(body));
    assert.equal(previous.source.helperSha256, sha(readFileSync(join(ROOT, "scripts/lib/session-minute-book.mjs"))));
    assert.equal(previous.fullNewOnly.exactRecordedRoundedParity, true);
    fullNewOnly = previous.fullNewOnly;
    primaryReuse = { originalSource: previous.source, identicalExtractedBodyAndInputs: true, originalProcess: previous.process };
  } else {
    const counts = { priceLookups: 0, unitCallbacks: 0, keyCallbacks: 0, realizedPnlCallbacks: 0 };
  const keyOf = (x) => { counts.keyCallbacks++; return orderKey(x); };
  const unitOf = (x, map, key) => { counts.unitCallbacks++; return sessionUnitNotional(x, map, key); };
  const unit = (x) => unitOf(x, sized.units, keyOf);
  const pnl = (x) => { counts.realizedPnlCallbacks++; return sessionCashPnl(x, sized.units, keyOf); };
  const measuredBody = body.replace("const px = (sym, t) => {", "const px = (sym, t) => { counts.priceLookups++;");
  assert.notEqual(body, measuredBody);
  const fn = new Function("raw", "trades", "openEnd", "startT", "endT", "balance0", "cost", "leverage", "unit", "pnl", "orderKey", "sized", "sessionUnitNotional", "createMinuteBookCache", "counts", `const H=3600000,M=60000;\n${measuredBody}`);
  globalThis.gc?.();
  const rssBefore = process.memoryUsage().rss, cpuLoop = process.cpuUsage(), wallLoop = performance.now();
  const out = fn(raw, raw.trades, openEnd, startT, endT, raw.settings.book.balance, raw.settings.cost, raw.settings.book.leverage,
    unit, pnl, keyOf, sized, unitOf, createMinuteBookCache, counts);
  const loop = { wallMs: performance.now() - wallLoop, cpu: process.cpuUsage(cpuLoop), rssBefore, rssAfter: process.memoryUsage().rss, processPeakRssKb: process.resourceUsage().maxRSS };
  const p = projection(out, raw), rounded = clean(p), recorded = recordedProjection(data, p);
  assert.deepEqual(rounded, recorded, `${window}/new: minute-derived fields must match original report at its six-decimal precision`);
    fullNewOnly = { counts, loop,
      hashes: { allMinuteOutputs: hashValue(out), curve: hashValue(out.curve), hourly: hashValue(out.hours), account: hashValue(Object.fromEntries(Object.entries(out).filter(([k]) => !["hours", "curve"].includes(k)))), roundedProjection: hashValue(rounded), recordedProjection: hashValue(recorded) },
      exactRecordedRoundedParity: true, metrics: rounded.total };
  }
  const secondary = secondaryProof({raw,data,sized,inBook,oldText,text,directPrice});
  const result = { window, source: { base: BASE, baselineUsed, oldFullSha256: sha(oldText), fullSha256: sha(text), extractedSha256: sha(body), helperSha256: sha(readFileSync(join(ROOT, "scripts/lib/session-minute-book.mjs"))), producer },
    inputs, cheapParity, slices, fullNewOnly, primaryReuse, secondary,
    rows: { trades: raw.trades.length, openEnd: raw.openEnd.length, allocations: sized.units.size, hours: data.hours.length, curve: data.curve.length },
    process: { wallMs: performance.now() - started, cpu: process.cpuUsage(cpuStarted), peakRssKb: process.resourceUsage().maxRSS } };
  writeFileSync(resolve(arg("result")), `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify({ window, cheapParity, sliceParity: slices.every((s) => s.exactIeee754Parity), fullNewMs: fullNewOnly.loop.wallMs, exactRecordedRoundedParity: true }));
}

if (process.argv.includes("--child")) await child();
else {
  const out = resolve(arg("out", "runs/perf-minute-cache")), artifacts = resolve(arg("artifacts", "../cts-ao-trailing/runs/exact-signal-study-ci-v3"));
  mkdirSync(out, { recursive: true });
  const old = source("old"), current = source("new");
  const producers = Object.fromEntries(["selection22", "final22"].map((window) => [window, producerEvidence(artifacts, window, old)]));
  const unchanged = unchangedEvidence(old, current), results = [];
  for (const window of ["selection22", "final22"]) {
    const resultFile = join(out, `${window}.json`);
    const run = spawnSync(process.execPath, ["--expose-gc", "--experimental-strip-types", fileURLToPath(import.meta.url), "--child", "--window", window, "--artifacts", artifacts, "--result", resultFile, ...(process.argv.includes("--reuse-primary") ? ["--reuse-primary"] : []), ...(arg("baseline-ref") ? ["--baseline-ref", arg("baseline-ref")] : []), ...(arg("baseline-file") ? ["--baseline-file", resolve(arg("baseline-file"))] : [])],
      { cwd: ROOT, encoding: "utf8", timeout: 240_000, maxBuffer: 1e6 });
    writeFileSync(join(out, `${window}.log`), `${run.stdout ?? ""}${run.stderr ?? ""}`);
    if (run.error) throw run.error;
    assert.equal(run.status, 0, `${window}: ${run.stderr}`);
    const result = JSON.parse(readFileSync(resultFile)); results.push(result);
    console.log(`${window}: ${(result.fullNewOnly.loop.wallMs / 1000).toFixed(3)}s NEW full loop; 3 old/new minute SLICE checks passed`);
  }
  const summary = { schema: "cts-minute-book-cache-profile-v2", createdAt: new Date().toISOString(), base: BASE, baselineUsed, unchangedSource: unchanged, producers,
    scope: "Three passes (headline, secondary capped, secondary uncapped): representative actual minute SLICE comparisons (start/middle/end) plus exhaustive cached-order and all-symbol/all-minute price parity. NEW full minute curve compared with original report at its six-decimal precision. No old full-loop parity or full-loop/end-to-end speedup claim. No engine, trading, renderer or frozen-session guard invocation.",
    counters: "priceLookups counts direct px binary-search calls, unitCallbacks counts sessionUnitNotional, keyCallbacks counts orderKey. SLICE timing excludes one-time cache setup and includes callback counters; full-new timing includes actual cache setup. Repeated callback instrumentation can affect microprofile timing.",
    limitations: "Three representative minute slices do not establish full IEEE754 old/new curve parity. Full NEW curve/account/hourly parity is against recorded six-decimal original report. Closed PF/group statistics are unchanged source, not rerun. Whole-process RSS includes input loading and sidecar checks. Tape/validation chunks remain unopened. This does not change strategy outcome evidence.",
    priorAttempts: ["../perf-minute-cache-attempt1-240s/failure.json", "../perf-minute-cache-attempt2-stopped/stopped-by-steering.json"], results };
  writeFileSync(join(out, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
  console.log(JSON.stringify(results.map((r) => ({ window: r.window, cheapParity: r.cheapParity, fullNewMs: r.fullNewOnly.loop.wallMs, parity: r.fullNewOnly.exactRecordedRoundedParity })), null, 2));
}
