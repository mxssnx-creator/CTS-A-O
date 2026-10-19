import { test } from "node:test";
import assert from "node:assert/strict";
import { archiveDates, parseArchiveCsv, sha256Bytes, validateCoverage, verifyArchiveChecksum } from "./lib/public-eval-feed.mjs";

const from = Date.parse("2026-10-16T00:00:00Z");
const row = (t, extra = {}) => {
  const x = { o: 10, h: 12, l: 9, c: 11, v: 0, ...extra };
  return [t, x.o, x.h, x.l, x.c, x.v, t + 59_999, 0, 0, 0, 0, 0].join(",");
};
const header = "open_time,open,high,low,close,volume,close_time,quote_volume,count,taker_buy_volume,taker_buy_quote_volume,ignore";

test("daily archive parsing accepts official header, milliseconds/microseconds and genuine zero volume", () => {
  const ms = parseArchiveCsv(`${header}\r\n${row(from)}\r\n${row(from + 60_000)}\r\n`);
  const micros = row(from).split(",");
  micros[0] = String(from * 1000);
  micros[6] = String((from + 60_000) * 1000 - 1);
  assert.deepEqual(parseArchiveCsv(micros.join(",")), [ms[0]]);
  micros[0] = String(from * 1000 + 1);
  assert.throws(() => parseArchiveCsv(micros.join(",")), /fractional-millisecond candle open/);
  assert.equal(ms[0].v, 0);
  assert.deepEqual(validateCoverage(ms, from, from + 120_000), {
    bars: 2, firstT: from, lastT: from + 60_000, endExclusiveT: from + 120_000, gaps: 0, duplicates: 0,
  });
});

test("bad OHLCV, malformed rows, duplicate timestamps and invalid close boundaries fail closed", () => {
  for (const csv of [row(from, { h: 10 }), row(from, { l: 12 }), row(from, { v: -1 }),
    row(from, { c: NaN }), `${row(from)}\n${row(from)}`, `${row(from)}\n${header}`,
    row(from).replace(String(from + 59_999), String(from + 60_000)), row(from).split(",").slice(0, 11).join(",")])
    assert.throws(() => parseArchiveCsv(csv));
});

test("full daily coverage rejects gaps, extra/short data and wrong day without filling candles", () => {
  const bars = parseArchiveCsv(Array.from({ length: 1440 }, (_, i) => row(from + i * 60_000)).join("\n"));
  assert.equal(validateCoverage(bars, from, from + 86_400_000).bars, 1440);
  assert.throws(() => validateCoverage(bars.slice(1), from, from + 86_400_000));
  assert.throws(() => validateCoverage(bars, from + 60_000, from + 86_460_000));
  assert.throws(() => validateCoverage([...bars.slice(0, 50), bars[49], ...bars.slice(51)], from, from + 86_400_000));
  assert.throws(() => validateCoverage([...bars, bars.at(-1)], from, from + 86_400_000));
});

test("official checksum must match archive bytes and exact filename", () => {
  const bytes = Buffer.from("real archive bytes"), name = "BTCUSDT-1m-2026-10-16.zip";
  const hash = sha256Bytes(bytes);
  assert.equal(verifyArchiveChecksum(bytes, `${hash}  ${name}\n`, name), hash);
  assert.throws(() => verifyArchiveChecksum(Buffer.from("changed"), `${hash}  ${name}`, name));
  assert.throws(() => verifyArchiveChecksum(bytes, `${hash}  OTHER.zip`, name));
  assert.throws(() => verifyArchiveChecksum(bytes, `${hash}  ${name}\n${hash}  ${name}`, name));
});

test("UTC archive days use inclusive-exclusive bounds", () => {
  assert.equal(archiveDates(Date.parse("2026-09-26T00:00Z"), Date.parse("2026-10-17T00:00Z")).length, 21);
  assert.deepEqual(archiveDates(from, from + 86_400_000), ["2026-10-16"]);
  assert.throws(() => archiveDates(from + 60_000, from + 86_400_000));
});
