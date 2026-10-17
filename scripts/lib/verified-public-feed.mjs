// Pure verification of the collector's exact public-source manifest and independently supplied file bytes.
import { archiveDates, DAY_MS, sha256Bytes, verifyArchiveChecksum } from "./public-eval-feed.mjs";

export const VERIFIED_PUBLIC_FEED_FROM = "2026-09-24T00:00:00.000Z";
export const VERIFIED_PUBLIC_FEED_TO = "2026-10-17T00:00:00.000Z";
export const VERIFIED_PUBLIC_ARCHIVE_BASE = "https://data.binance.vision/data/futures/um/daily/klines";
export const VERIFIED_PUBLIC_FEED_SYMBOLS = Object.freeze([
  "BTC", "ETH", "BNB", "SOL", "XRP", "DOGE", "ADA", "AVAX", "LINK", "LTC", "DOT",
  "ATOM", "APT", "NEAR", "SUI", "TRX", "UNI", "FIL", "ETC", "ARB", "OP", "XLM",
].map((x) => `${x}-USDT`));
export const VERIFIED_PUBLIC_FEED_TFS = Object.freeze([1, 5, 15, 30, 60]);
const FROM = Date.parse(VERIFIED_PUBLIC_FEED_FROM), TO = Date.parse(VERIFIED_PUBLIC_FEED_TO);
const DAYS = archiveDates(FROM, TO), PER_SYMBOL = (TO - FROM) / 60_000;
const HASH = /^[a-f0-9]{64}$/;
const check = (ok, message) => { if (!ok) throw new Error(`Verified public feed: ${message}`); };
const exactSet = (actual, expected) => Array.isArray(actual) && actual.length === expected.length &&
  new Set(actual).size === actual.length && expected.every((x) => actual.includes(x));
const exactKeys = (actual, expected) => actual && typeof actual === "object" && !Array.isArray(actual) && exactSet(Object.keys(actual), expected);
const coverage = (actual, fromT, toT, label) => {
  check(actual && actual.bars === (toT - fromT) / 60_000 && actual.firstT === fromT &&
    actual.lastT === toT - 60_000 && actual.endExclusiveT === toT && actual.gaps === 0 && actual.duplicates === 0,
  `${label} must record complete exact UTC minute coverage without gaps or duplicates`);
};

/** readArchive(name) supplies actual archive/checksum bytes; this helper has no filesystem or network access. */
export async function verifyVerifiedPublicFeed({ manifest, feedSha256, feedBytes, readArchive }) {
  check(manifest?.status === "complete", "collector manifest is incomplete");
  const c = manifest.configuration;
  check(c?.schema === "cts-public-binance-um-archive-v1" && c.source === "Binance USD-M public historical daily klines" &&
    c.baseUrl === VERIFIED_PUBLIC_ARCHIVE_BASE, "collector/provider scope is not the official Binance USD-M archive source");
  check(c.from === VERIFIED_PUBLIC_FEED_FROM && c.toExclusive === VERIFIED_PUBLIC_FEED_TO,
    "collection must cover Sep 24 through Oct 17 exclusively for the full native history");
  check(exactSet(c.symbols, VERIFIED_PUBLIC_FEED_SYMBOLS) && exactSet(c.developmentSymbols, VERIFIED_PUBLIC_FEED_SYMBOLS.slice(0, 20)) &&
    exactSet(c.holdoutSymbols, VERIFIED_PUBLIC_FEED_SYMBOLS) && c.outcomesUsedForSelection === false,
  "collector must retain the exact 20 development and 22 total/holdout symbol sets without using outcomes");
  check(exactSet(c.tfs, VERIFIED_PUBLIC_FEED_TFS), "collector timeframes differ");
  const feed = manifest.feed;
  check(HASH.test(feedSha256 ?? "") && feed?.sha256 === feedSha256 && feed.path === "feed.json" &&
    Number.isSafeInteger(feedBytes) && feedBytes > 0 && feed.bytes === feedBytes, "actual feed stream hash/bytes differ from the completed manifest");
  check(feed.symbols === VERIFIED_PUBLIC_FEED_SYMBOLS.length && feed.oneMinuteBars === PER_SYMBOL * VERIFIED_PUBLIC_FEED_SYMBOLS.length,
    "collector total minute/symbol counts differ");
  check(exactKeys(feed.symbolCoverage, VERIFIED_PUBLIC_FEED_SYMBOLS), "per-symbol coverage inventory differs");
  for (const sym of VERIFIED_PUBLIC_FEED_SYMBOLS) coverage(feed.symbolCoverage[sym], FROM, TO, sym);
  const expected = VERIFIED_PUBLIC_FEED_SYMBOLS.flatMap((sym) => DAYS.map((day) => ({ sym, day,
    name: `${sym.replace("-", "")}-1m-${day}.zip` })));
  check(exactKeys(manifest.artifacts, expected.map((x) => x.name)), "expected exactly 506 official daily archives");
  check(typeof readArchive === "function", "actual archive/checksum byte reader is required");
  for (const { sym, day, name } of expected) {
    const row = manifest.artifacts[name], url = `${VERIFIED_PUBLIC_ARCHIVE_BASE}/${sym.replace("-", "")}/1m/${name}`;
    check(row?.status === "verified" && row.checksumStatus === "verified", `${name}: official checksum verification is required`);
    check(row.sym === sym && row.day === day && row.url === url && row.checksumUrl === `${url}.CHECKSUM`, `${name}: official archive identity/URL differs`);
    check(HASH.test(row.sha256 ?? "") && HASH.test(row.checksumSha256 ?? ""), `${name}: archive/checksum hashes are missing or malformed`);
    const dayT = Date.parse(`${day}T00:00:00Z`);
    coverage(row.coverage, dayT, dayT + DAY_MS, name);
    let actual;
    try { actual = await readArchive(name); }
    catch (error) { throw new Error(`Verified public feed: ${name}: source bytes unavailable: ${error.message}`); }
    const { archiveBytes, checksumBytes } = actual ?? {};
    check(archiveBytes instanceof Uint8Array && checksumBytes instanceof Uint8Array, `${name}: actual archive/checksum bytes are required`);
    check(Number.isSafeInteger(row.bytes) && row.bytes > 0 && row.bytes === archiveBytes.byteLength && sha256Bytes(archiveBytes) === row.sha256,
      `${name}: actual archive hash/bytes differ`);
    check(sha256Bytes(checksumBytes) === row.checksumSha256, `${name}: actual checksum file hash differs`);
    check(verifyArchiveChecksum(archiveBytes, Buffer.from(checksumBytes).toString("utf8"), name) === row.sha256,
      `${name}: official archive checksum disagrees`);
  }
  return { schema: "cts-verified-public-feed-v1", sha256: feedSha256, collector: "binance-usdm-public-archives",
    from: VERIFIED_PUBLIC_FEED_FROM, to: VERIFIED_PUBLIC_FEED_TO, symbols: [...VERIFIED_PUBLIC_FEED_SYMBOLS],
    tfs: [...VERIFIED_PUBLIC_FEED_TFS], verifiedArchives: expected.length, checksumsVerified: true, gaps: 0, duplicates: 0 };
}
