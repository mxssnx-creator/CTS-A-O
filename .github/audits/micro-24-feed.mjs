#!/usr/bin/env node
// Genuine public Binance USD-M daily archives. No account, credentials, live orders or synthesized candles.
// node --experimental-strip-types scripts/build-public-eval-feed.mjs [--out runs/micro-24-market-20261020] [--concurrency 4]
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { archiveDates, DAY_MS, parseArchiveCsv, sha256Bytes, validateCoverage, verifyArchiveChecksum } from "../../scripts/lib/public-eval-feed.mjs";

const argv = process.argv.slice(2), arg = (key, fallback) => {
  const i = argv.indexOf(`--${key}`); return i < 0 ? fallback : argv[i + 1];
};
// Scope fixed before outcomes: original twenty plus four additional liquid historical contracts.
const symbols = ["AVAX", "LINK", "LTC", "SUI", "NEAR", "DOT", "ATOM", "APT", "BTC", "ETH", "SOL", "BNB", "DOGE", "ADA", "BCH", "TRX", "ETC", "OP", "ARB", "FIL", "XRP", "UNI", "XLM", "INJ"].map((x) => `${x}-USDT`);
const fromT = Date.parse(arg("from", "2026-10-18T00:00:00Z")), toT = Date.parse(arg("to", "2026-10-20T00:00:00Z"));
if (![fromT, toT].every((t) => Number.isSafeInteger(t) && t % DAY_MS === 0) ||
    toT - fromT < 2 * DAY_MS || toT - fromT > 3 * DAY_MS)
  throw new Error("Use an exact two or three completed UTC-day archive window");
const out = path.resolve(arg("out", "runs/micro-24-market-20261020"));
const concurrency = Number(arg("concurrency", 2));
if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 2) throw new Error("concurrency must be 1..2");
const baseUrl = "https://data.binance.vision/data/futures/um/daily/klines";
const configuration = { schema: "cts-public-binance-um-archive-v1", source: "Binance USD-M public historical daily klines", baseUrl,
  from: new Date(fromT).toISOString(), toExclusive: new Date(toT).toISOString(), symbols, tfs: [1, 5, 15, 30, 60],
  studySymbols: symbols, outcomesUsedForSelection: false, policy: "Preregistered 24-symbol retrospective correctness study; no symbol selection by outcomes; 24h indicator warmup, 12h evaluated prehistory, 12h execution",
  venueParity: "Binance USD-M history, distinct from earlier BingX feeds; not venue-owned execution evidence" };
fs.mkdirSync(path.join(out, "archives"), { recursive: true });
const manifestPath = path.join(out, "manifest.json");
const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, "utf8")) : {
  configuration, createdAt: new Date().toISOString(), artifacts: {}, errors: [], status: "collecting",
};
if (JSON.stringify(manifest.configuration) !== JSON.stringify(configuration)) throw new Error("Existing manifest has a different frozen source scope");
const save = () => {
  manifest.updatedAt = new Date().toISOString();
  fs.writeFileSync(`${manifestPath}.tmp`, JSON.stringify(manifest, null, 2) + "\n");
  fs.renameSync(`${manifestPath}.tmp`, manifestPath);
};
save();
let finished = 0;
// Retain only the already validated source candles, avoiding a second Python startup/CSV parse for every archive.
const barsByArchive = new Map();
const days = archiveDates(fromT, toT), jobs = symbols.flatMap((sym) => days.map((day) => ({ sym, day })));
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function request(url, optional = false) {
  const res = await fetch(url, { signal: AbortSignal.timeout(25_000), headers: { accept: "application/octet-stream" } });
  if (optional && res.status === 404) return null;
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  const bytes = Buffer.from(await res.arrayBuffer());
  if (!bytes.length) throw new Error(`Empty response: ${url}`);
  return bytes;
}
function csvOf(bytes, archiveName) {
  // zipfile validates the entry CRC and supports the official stored/deflated archives without another dependency.
  return execFileSync("python3", ["-c", "import sys,zipfile,io\nz=zipfile.ZipFile(io.BytesIO(sys.stdin.buffer.read()))\nn=z.namelist()\nassert len(n)==1 and n[0]==sys.argv[1], 'Unexpected archive members'\nsys.stdout.buffer.write(z.read(n[0]))", archiveName.replace(/\.zip$/, ".csv")],
    { input: bytes, encoding: "utf8", maxBuffer: 4 * 1024 * 1024 });
}
async function collect({ sym, day }) {
  const exchangeSym = sym.replace("-", ""), name = `${exchangeSym}-1m-${day}.zip`;
  const file = path.join(out, "archives", name), checksumFile = `${file}.CHECKSUM`;
  const url = `${baseUrl}/${exchangeSym}/1m/${name}`;
  const old = manifest.artifacts[name];
  const item = manifest.artifacts[name] = { ...old, sym, day, url, checksumUrl: `${url}.CHECKSUM`, status: "pending", attempts: old?.attempts ?? [] };
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const bytes = fs.existsSync(file) ? fs.readFileSync(file) : await request(url);
      if (!fs.existsSync(file)) { fs.writeFileSync(`${file}.partial`, bytes); fs.renameSync(`${file}.partial`, file); }
      let checksum = fs.existsSync(checksumFile) ? fs.readFileSync(checksumFile) : null;
      if (!checksum && item.checksumStatus !== "not-provided-404") checksum = await request(`${url}.CHECKSUM`, true);
      if (checksum && !fs.existsSync(checksumFile)) fs.writeFileSync(checksumFile, checksum);
      const hash = checksum ? verifyArchiveChecksum(bytes, checksum.toString("utf8"), name) : sha256Bytes(bytes);
      const bars = parseArchiveCsv(csvOf(bytes, name), name), dayT = Date.parse(`${day}T00:00:00Z`);
      const coverage = validateCoverage(bars, dayT, dayT + DAY_MS, name);
      barsByArchive.set(name, bars);
      Object.assign(item, { status: "verified", bytes: bytes.length, sha256: hash, checksumStatus: checksum ? "verified" : "not-provided-404",
        ...(checksum ? { checksumSha256: sha256Bytes(checksum) } : {}), coverage, verifiedAt: new Date().toISOString() });
      item.attempts.push({ at: new Date().toISOString(), attempt, status: "verified" });
      finished++;
      save();
      if (finished % 24 === 0 || finished === jobs.length) process.stdout.write(`archives ${finished}/${jobs.length} verified\n`);
      return;
    } catch (error) {
      const failure = { at: new Date().toISOString(), attempt, status: "error", error: String(error) };
      for (const [key, sourceFile] of [["archiveEvidence", file], ["checksumEvidence", checksumFile]]) {
        if (fs.existsSync(sourceFile)) {
          const sourceBytes = fs.readFileSync(sourceFile);
          failure[key] = { path: path.relative(out, sourceFile), bytes: sourceBytes.length, sha256: sha256Bytes(sourceBytes) };
        }
      }
      item.attempts.push(failure); manifest.errors.push({ archive: name, ...failure }); item.status = "error"; save();
      process.stderr.write(`${name}: attempt ${attempt}/3: ${String(error).slice(0, 200)}\n`);
      // Preserve bad source bytes before retrying rather than repeatedly using corrupt cached files.
      if (/checksum mismatch|Unexpected archive|BadZipFile|invalid |nonfinite|coverage|duplicate|unordered|expected 12|malformed CHECKSUM|missing\/duplicate checksum/.test(String(error))) {
        const suffix = `.invalid-${Date.now()}-${attempt}`;
        if (fs.existsSync(file)) {
          fs.renameSync(file, `${file}${suffix}`);
          failure.archiveEvidence.path = path.relative(out, `${file}${suffix}`);
        }
        if (fs.existsSync(checksumFile)) {
          fs.renameSync(checksumFile, `${checksumFile}${suffix}`);
          failure.checksumEvidence.path = path.relative(out, `${checksumFile}${suffix}`);
        }
        save();
      }
      if (attempt < 3) await pause(1000 * attempt);
    }
  }
}
let index = 0;
await Promise.all(Array.from({ length: concurrency }, async () => {
  for (;;) { const i = index++; if (i >= jobs.length) return; await collect(jobs[i]); await pause(250); }
}));
const failed = Object.values(manifest.artifacts).filter((x) => x.status !== "verified");
if (failed.length) { manifest.status = "incomplete"; save(); throw new Error(`${failed.length}/${jobs.length} archives unverified; checkpoints retained; rerun to resume`); }
const { resample } = await import("../../src/core/market/bars.ts");
const candles = {}, tickers = [], symbolCoverage = {};
for (const sym of symbols) {
  const exchangeSym = sym.replace("-", ""), all = [];
  for (const day of days) {
    const name = `${exchangeSym}-1m-${day}.zip`, bytes = fs.readFileSync(path.join(out, "archives", name));
    if (sha256Bytes(bytes) !== manifest.artifacts[name].sha256) throw new Error(`${name}: archive changed during build`);
    const bars = barsByArchive.get(name);
    if (!bars) throw new Error(`${name}: verified source candles missing`);
    all.push(...bars);
    barsByArchive.delete(name);
  }
  symbolCoverage[sym] = validateCoverage(all, fromT, toT, sym);
  for (const tf of configuration.tfs) candles[`${sym}|${tf}`] = tf === 1 ? all : resample(all, 1, tf);
  // A fixed forced-symbol replay must not use these endpoint summaries for retrospective universe selection.
  const tail = all.slice(-1440), last = all.at(-1), ref = tail[0];
  tickers.push({ sym, last: last.c, quoteVol: tail.reduce((sum, c) => sum + c.c * c.v, 0), changePct: (last.c / ref.c - 1) * 100 });
}
const feed = { tickers, candles, source: { ...configuration, manifest: "manifest.json", symbolCoverage,
  sourceArchives: Object.entries(manifest.artifacts).map(([name, x]) => ({ name, sha256: x.sha256, checksumStatus: x.checksumStatus })) } };
const bytes = Buffer.from(JSON.stringify(feed)), feedFile = path.join(out, "feed.json");
fs.writeFileSync(`${feedFile}.partial`, bytes); fs.renameSync(`${feedFile}.partial`, feedFile);
manifest.status = "complete"; manifest.feed = { path: "feed.json", bytes: bytes.length, sha256: sha256Bytes(bytes),
  symbols: symbols.length, oneMinuteBars: symbols.length * (toT - fromT) / 60_000, symbolCoverage };
save();
process.stdout.write(JSON.stringify({ status: manifest.status, ...manifest.feed, source: configuration.source }, null, 2) + "\n");
