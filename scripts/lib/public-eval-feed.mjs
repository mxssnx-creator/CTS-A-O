import { createHash } from "node:crypto";

export const MINUTE_MS = 60_000;
export const DAY_MS = 86_400_000;
export const sha256Bytes = (bytes) => createHash("sha256").update(bytes).digest("hex");

export function archiveDates(fromT, toT) {
  if (!Number.isSafeInteger(fromT) || !Number.isSafeInteger(toT) ||
      fromT % DAY_MS || toT % DAY_MS || toT <= fromT)
    throw new Error("Archive bounds must be increasing UTC day boundaries");
  const out = [];
  for (let t = fromT; t < toT; t += DAY_MS) out.push(new Date(t).toISOString().slice(0, 10));
  return out;
}

/** Binance archives can use millisecond or microsecond integer timestamps. */
function timestamp(value, where, inclusiveClose = false) {
  if (!/^\d+$/.test(value)) throw new Error(`${where}: invalid timestamp`);
  const n = Number(value);
  if (!Number.isSafeInteger(n)) throw new Error(`${where}: unsafe timestamp`);
  if (n < 100_000_000_000_000) return n;
  if (!inclusiveClose && n % 1000) throw new Error(`${where}: fractional-millisecond candle open`);
  // A close timestamp can end in 999 microseconds; flooring preserves the inclusive millisecond close.
  return Math.floor(n / 1000);
}

/** Parse one genuine USD-M daily 1m archive, accepting a single optional CSV header. */
export function parseArchiveCsv(csv, label = "archive") {
  const lines = csv.replace(/^\uFEFF/, "").trim().split(/\r?\n/);
  if (!csv.trim()) throw new Error(`${label}: empty CSV`);
  const bars = [];
  let first = 0;
  if (/^open_time,open,high,low,close,volume,/.test(lines[0])) first = 1;
  for (let i = first; i < lines.length; i++) {
    const fields = lines[i].split(",");
    const where = `${label}: row ${i + 1}`;
    if (fields.length !== 12 || fields.some((v) => !v.trim() || v.includes('"')))
      throw new Error(`${where}: expected 12 numeric columns`);
    const t = timestamp(fields[0], where);
    const closeT = timestamp(fields[6], where, true);
    const nums = fields.map(Number);
    if (!nums.every(Number.isFinite)) throw new Error(`${where}: nonfinite column`);
    const [, o, h, l, c, v] = nums;
    if (t % MINUTE_MS || closeT !== t + MINUTE_MS - 1)
      throw new Error(`${where}: invalid 1m open/close boundary`);
    if ([o, h, l, c].some((x) => x <= 0) || v < 0 ||
        h < Math.max(o, c) || l > Math.min(o, c) || h < l)
      throw new Error(`${where}: invalid OHLCV`);
    if (nums.slice(7).some((x) => x < 0) || !Number.isSafeInteger(nums[8]))
      throw new Error(`${where}: invalid volume/trade metadata`);
    if (bars.length && t <= bars.at(-1).t)
      throw new Error(`${where}: duplicate or unordered candle`);
    bars.push({ t, o, h, l, c, v });
  }
  if (!bars.length) throw new Error(`${label}: no candles`);
  return bars;
}

/** Never fill missing candles or deduplicate contradictory source records. */
export function validateCoverage(bars, fromT, toT, label = "candles") {
  if (!Number.isSafeInteger(fromT) || !Number.isSafeInteger(toT) ||
      fromT % MINUTE_MS || toT % MINUTE_MS || toT <= fromT)
    throw new Error(`${label}: invalid coverage bounds`);
  const expected = (toT - fromT) / MINUTE_MS;
  if (bars.length !== expected) throw new Error(`${label}: short/excess coverage ${bars.length}/${expected}`);
  for (let i = 0; i < bars.length; i++) {
    if (bars[i].t !== fromT + i * MINUTE_MS)
      throw new Error(`${label}: gap, duplicate or out-of-window candle at ${i}`);
  }
  return { bars: bars.length, firstT: bars[0].t, lastT: bars.at(-1).t, endExclusiveT: toT, gaps: 0, duplicates: 0 };
}

export function verifyArchiveChecksum(bytes, checksumText, archiveName) {
  const entries = checksumText.trim().split(/\r?\n/).map((line) => {
    const match = /^([a-fA-F0-9]{64})\s+\*?(.+)$/.exec(line.trim());
    if (!match) throw new Error(`${archiveName}: malformed CHECKSUM`);
    return { hash: match[1].toLowerCase(), name: match[2] };
  });
  const row = entries.find((x) => x.name === archiveName);
  if (!row || entries.filter((x) => x.name === archiveName).length !== 1)
    throw new Error(`${archiveName}: missing/duplicate checksum filename`);
  const actual = sha256Bytes(bytes);
  if (actual !== row.hash) throw new Error(`${archiveName}: SHA256 checksum mismatch`);
  return actual;
}

/** Explicit source inventory; never replace unavailable symbols using performance outcomes. */
export function validateArchiveScope(symbols, fromT, toT) {
  if (!Array.isArray(symbols) || !symbols.length || symbols.length > 200 ||
      symbols.some(s => typeof s !== "string" || !/^[A-Z0-9]+-USDT$/.test(s)) ||
      new Set(symbols).size !== symbols.length) throw new Error("Invalid or duplicate archive symbols");
  const days = archiveDates(fromT, toT);
  if (days.length > 60) throw new Error("Archive scope exceeds 60 days");
  return { symbols: [...symbols], fromT, toT };
}
