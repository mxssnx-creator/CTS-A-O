import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { publicReplayFeedOptions, verifyPublicReplayFeedDirectory } from "../verify-public-replay-feed.mjs";
import {
  VERIFIED_PUBLIC_ARCHIVE_BASE,
  VERIFIED_PUBLIC_FEED_FROM,
  VERIFIED_PUBLIC_FEED_SYMBOLS,
  VERIFIED_PUBLIC_FEED_TFS,
  VERIFIED_PUBLIC_FEED_TO,
  verifyVerifiedPublicFeed,
} from "./verified-public-feed.mjs";

const FROM = "2026-09-24T00:00:00.000Z";
const TO = "2026-10-17T00:00:00.000Z";
const BASE = "https://data.binance.vision/data/futures/um/daily/klines";
const SYMBOLS = ["BTC", "ETH", "BNB", "SOL", "XRP", "DOGE", "ADA", "AVAX", "LINK", "LTC", "DOT", "ATOM", "APT", "NEAR", "SUI", "TRX", "UNI", "FIL", "ETC", "ARB", "OP", "XLM"].map((x) => `${x}-USDT`);
const TFS = [1, 5, 15, 30, 60];
const DAY = 86_400_000;
const MINUTE = 60_000;
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const coverage = (fromT, toT) => ({ bars: (toT - fromT) / MINUTE, firstT: fromT,
  lastT: toT - MINUTE, endExclusiveT: toT, gaps: 0, duplicates: 0 });

/** These tiny bytes exercise provenance validation; no downloaded or synthesized market candles are used. */
function fixture() {
  const fromT = Date.parse(FROM), toT = Date.parse(TO), archives = new Map(), artifacts = {};
  for (const sym of SYMBOLS) for (let dayT = fromT; dayT < toT; dayT += DAY) {
    const day = new Date(dayT).toISOString().slice(0, 10), exchangeSym = sym.replace("-", "");
    const name = `${exchangeSym}-1m-${day}.zip`, archiveBytes = Buffer.from(name);
    const archiveHash = hash(archiveBytes), checksumBytes = Buffer.from(`${archiveHash}  ${name}\n`);
    const url = `${BASE}/${exchangeSym}/1m/${name}`;
    archives.set(name, { archiveBytes, checksumBytes });
    artifacts[name] = { sym, day, url, checksumUrl: `${url}.CHECKSUM`, status: "verified",
      bytes: archiveBytes.length, sha256: archiveHash, checksumStatus: "verified", checksumSha256: hash(checksumBytes),
      coverage: coverage(dayT, dayT + DAY), verifiedAt: TO, attempts: [{ attempt: 1, status: "verified" }] };
  }
  const feed = Buffer.from("verified public feed fixture");
  const manifest = {
    configuration: { schema: "cts-public-binance-um-archive-v1", source: "Binance USD-M public historical daily klines",
      baseUrl: BASE, from: FROM, toExclusive: TO, symbols: [...SYMBOLS], tfs: [...TFS],
      developmentSymbols: SYMBOLS.slice(0, 20), holdoutSymbols: [...SYMBOLS], outcomesUsedForSelection: false,
      venueParity: "Binance USD-M history, distinct from earlier BingX feeds; not venue-owned execution evidence" },
    status: "complete", createdAt: FROM, updatedAt: TO, artifacts, errors: [],
    feed: { path: "feed.json", bytes: feed.length, sha256: hash(feed), symbols: 22, oneMinuteBars: 728_640,
      symbolCoverage: Object.fromEntries(SYMBOLS.map((sym) => [sym, coverage(fromT, toT)])) },
  };
  const reads = [];
  const options = { manifest, feedSha256: hash(feed), feedBytes: feed.length, readArchive: async (name) => {
    reads.push(name);
    const archive = archives.get(name);
    if (!archive) throw Object.assign(new Error(`Missing archive ${name}`), { code: "ENOENT" });
    return archive;
  } };
  return { options, manifest, archives, reads, first: Object.keys(artifacts)[0] };
}

describe("verified public feed provenance", () => {
  it("declares the exact public source, dates, canonical symbols and supported timeframes", () => {
    assert.equal(VERIFIED_PUBLIC_FEED_FROM, FROM);
    assert.equal(VERIFIED_PUBLIC_FEED_TO, TO);
    assert.equal(VERIFIED_PUBLIC_ARCHIVE_BASE, BASE);
    assert.deepEqual([...VERIFIED_PUBLIC_FEED_SYMBOLS], SYMBOLS);
    assert.deepEqual([...VERIFIED_PUBLIC_FEED_TFS], TFS);
  });

  it("verifies every official archive and checksum without changing supplied metadata", async () => {
    const f = fixture(), before = JSON.stringify(f.manifest);
    assert.equal(f.archives.size, 506);
    const evidence = await verifyVerifiedPublicFeed(f.options);
    assert.deepEqual(evidence, { schema: "cts-verified-public-feed-v1", sha256: f.options.feedSha256,
      collector: "binance-usdm-public-archives", from: FROM, to: TO, symbols: SYMBOLS, tfs: TFS,
      verifiedArchives: 506, checksumsVerified: true, gaps: 0, duplicates: 0 });
    assert.equal(f.reads.length, 506);
    assert.equal(new Set(f.reads).size, 506, "no archive may stand in for another source day");
    assert.deepEqual([...f.reads].sort(), [...f.archives.keys()].sort());
    assert.equal(JSON.stringify(f.manifest), before);
  });

  const metadataMutations = [
    ["unsupported configuration schema", (f) => { f.manifest.configuration.schema = "other"; }],
    ["unofficial archive provider", (f) => { f.manifest.configuration.baseUrl = "https://example.invalid/archives"; }],
    ["former shortened history scope", (f) => { f.manifest.configuration.from = "2026-09-26T00:00:00.000Z"; }],
    ["changed end boundary", (f) => { f.manifest.configuration.toExclusive = "2026-10-18T00:00:00.000Z"; }],
    ["missing canonical symbol", (f) => { f.manifest.configuration.symbols.pop(); }],
    ["duplicate canonical symbol", (f) => { f.manifest.configuration.symbols[21] = SYMBOLS[0]; }],
    ["changed development cohort", (f) => { f.manifest.configuration.developmentSymbols[0] = SYMBOLS[21]; }],
    ["changed holdout cohort", (f) => { f.manifest.configuration.holdoutSymbols.pop(); }],
    ["outcomes used for selection", (f) => { f.manifest.configuration.outcomesUsedForSelection = true; }],
    ["missing required timeframe", (f) => { f.manifest.configuration.tfs.pop(); }],
    ["incomplete manifest", (f) => { f.manifest.status = "incomplete"; }],
    ["missing official archive", (f) => { delete f.manifest.artifacts[f.first]; }],
    ["extra archive outside frozen scope", (f) => { f.manifest.artifacts["EXTRA-1m-2026-09-24.zip"] = { ...f.manifest.artifacts[f.first] }; }],
    ["changed archive symbol", (f) => { f.manifest.artifacts[f.first].sym = SYMBOLS[1]; }],
    ["changed archive day", (f) => { f.manifest.artifacts[f.first].day = "2026-09-25"; }],
    ["unofficial archive URL", (f) => { f.manifest.artifacts[f.first].url = "https://example.invalid/source.zip"; }],
    ["unofficial checksum URL", (f) => { f.manifest.artifacts[f.first].checksumUrl += "?alternative=1"; }],
    ["unverified archive", (f) => { f.manifest.artifacts[f.first].status = "pending"; }],
    ["missing official checksum marked 404", (f) => { f.manifest.artifacts[f.first].checksumStatus = "not-provided-404"; }],
    ["wrong archive hash", (f) => { f.manifest.artifacts[f.first].sha256 = "0".repeat(64); }],
    ["malformed archive hash", (f) => { f.manifest.artifacts[f.first].sha256 = "not-a-hash"; }],
    ["wrong archive byte count", (f) => { f.manifest.artifacts[f.first].bytes++; }],
    ["wrong checksum-file hash", (f) => { f.manifest.artifacts[f.first].checksumSha256 = "0".repeat(64); }],
    ["missing checksum-file hash", (f) => { delete f.manifest.artifacts[f.first].checksumSha256; }],
    ["short daily coverage", (f) => { f.manifest.artifacts[f.first].coverage.bars = 1439; }],
    ["shifted daily start", (f) => { f.manifest.artifacts[f.first].coverage.firstT += MINUTE; }],
    ["shifted daily end", (f) => { f.manifest.artifacts[f.first].coverage.endExclusiveT += MINUTE; }],
    ["daily source gap", (f) => { f.manifest.artifacts[f.first].coverage.gaps = 1; }],
    ["duplicate daily candle", (f) => { f.manifest.artifacts[f.first].coverage.duplicates = 1; }],
    ["unexpected feed path", (f) => { f.manifest.feed.path = "other-feed.json"; }],
    ["feed digest differs from actual bytes", (f) => { f.options.feedSha256 = "0".repeat(64); }],
    ["feed byte count differs from actual bytes", (f) => { f.options.feedBytes++; }],
    ["wrong feed symbol count", (f) => { f.manifest.feed.symbols = 21; }],
    ["wrong total one-minute coverage", (f) => { f.manifest.feed.oneMinuteBars--; }],
    ["missing feed symbol coverage", (f) => { delete f.manifest.feed.symbolCoverage[SYMBOLS[0]]; }],
    ["extra feed symbol coverage", (f) => { f.manifest.feed.symbolCoverage["EXTRA-USDT"] = { ...f.manifest.feed.symbolCoverage[SYMBOLS[0]] }; }],
    ["short feed symbol coverage", (f) => { f.manifest.feed.symbolCoverage[SYMBOLS[0]].bars = 33_119; }],
    ["shifted feed final candle", (f) => { f.manifest.feed.symbolCoverage[SYMBOLS[0]].lastT -= MINUTE; }],
    ["feed symbol gap", (f) => { f.manifest.feed.symbolCoverage[SYMBOLS[0]].gaps = 1; }],
    ["malformed manifest", (f) => { f.options.manifest = null; }],
    ["malformed artifacts", (f) => { f.manifest.artifacts = []; }],
    ["malformed daily coverage", (f) => { f.manifest.artifacts[f.first].coverage = null; }],
    ["malformed feed metadata", (f) => { f.manifest.feed = null; }],
    ["nonfinite observed byte count", (f) => { f.options.feedBytes = NaN; }],
  ];
  for (const [name, mutate] of metadataMutations) it(`rejects ${name}`, async () => {
    const f = fixture();
    mutate(f);
    await assert.rejects(() => verifyVerifiedPublicFeed(f.options));
  });

  it("rejects archive bytes changed after the manifest was recorded", async () => {
    const f = fixture();
    f.archives.get(f.first).archiveBytes = Buffer.from("changed source bytes");
    await assert.rejects(() => verifyVerifiedPublicFeed(f.options));
  });

  for (const [name, contents] of [
    ["incorrect checksum filename", (f) => `${f.manifest.artifacts[f.first].sha256}  OTHER-1m-2026-09-24.zip\n`],
    ["incorrect checksum digest", (f) => `${"0".repeat(64)}  ${f.first}\n`],
    ["duplicated official filename", (f) => `${f.archives.get(f.first).checksumBytes}${f.archives.get(f.first).checksumBytes}`],
    ["malformed checksum", () => "invalid official checksum\n"],
  ]) it(`rejects ${name} even when the checksum-file hash was updated`, async () => {
    const f = fixture(), checksumBytes = Buffer.from(contents(f));
    f.archives.get(f.first).checksumBytes = checksumBytes;
    f.manifest.artifacts[f.first].checksumSha256 = hash(checksumBytes);
    await assert.rejects(() => verifyVerifiedPublicFeed(f.options));
  });

  it("rejects a missing archive from the reader instead of accepting manifest-only evidence", async () => {
    const f = fixture();
    f.archives.delete(f.first);
    await assert.rejects(() => verifyVerifiedPublicFeed(f.options), /Missing archive/);
    assert.ok(f.reads.includes(f.first));
  });

  it("rejects missing checksum bytes returned by the reader", async () => {
    const f = fixture();
    delete f.archives.get(f.first).checksumBytes;
    await assert.rejects(() => verifyVerifiedPublicFeed(f.options));
  });

  it("parses only complete, unique supported directory/output options", () => {
    assert.deepEqual(publicReplayFeedOptions(["--dir", "public-source", "--out", "evidence.json"]),
      { dir: "public-source", out: "evidence.json" });
    assert.deepEqual(publicReplayFeedOptions(["--out", "evidence.json", "--dir", "public-source"]),
      { dir: "public-source", out: "evidence.json" });
    for (const args of [[], ["--dir"], ["--dir", "source"], ["--out", "evidence.json"],
      ["--dir", "--out", "evidence.json"], ["--dir", "source", "--out", ""],
      ["--dir", "source", "--out", "a", "--out", "b"],
      ["--dir", "source", "--dir", "source", "--out", "evidence.json"],
      ["--feed", "feed.json", "--out", "evidence.json"]])
      assert.throws(() => publicReplayFeedOptions(args), /Supply --dir/);
  });

  it("hashes actual feed stream bytes and rejects a same-length change before archive reads", async () => {
    const f = fixture(), dir = mkdtempSync(join(tmpdir(), "cts-public-feed-stream-"));
    try {
      writeFileSync(join(dir, "manifest.json"), JSON.stringify(f.manifest));
      const changed = Buffer.from("verified public feed fixture");
      changed[0] ^= 1;
      assert.equal(changed.length, f.manifest.feed.bytes);
      writeFileSync(join(dir, "feed.json"), changed);
      await assert.rejects(() => verifyPublicReplayFeedDirectory(dir), /actual feed stream hash\/bytes differ/);
      assert.equal(existsSync(join(dir, "archives")), false, "no archive files are needed to detect a changed feed");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
