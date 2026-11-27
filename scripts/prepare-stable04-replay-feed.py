#!/usr/bin/env python3
"""Rebuild the sealed, public 12-symbol replay feed without network access."""
import base64
import datetime
import gzip
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FIXTURE = ROOT / 'research/fixtures/postbase-20261017'
EXPECTED_FEED = 'e99c7a7b808752717a6443cd09a498238c0836ff6eca7366ac04aaba3d74fadc'
SYMBOLS = [s + '-USDT' for s in ['AVAX', 'DOT', 'ATOM', 'APT', 'BTC', 'ETH', 'BNB', 'DOGE', 'ADA', 'BCH', 'ETC', 'ARB']]


def require(condition, message):
    if not condition:
        raise ValueError(message)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def timestamp(value):
    return int(datetime.datetime.fromisoformat(value.replace('Z', '+00:00')).timestamp() * 1000)


def main(out):
    out.mkdir(parents=True, exist_ok=True)
    manifest = json.loads((FIXTURE / 'manifest.json').read_text())
    require(manifest['schema'] == 'cts-public-cached-feed-fixture-v1', 'fixture schema changed')
    compressed = bytearray()
    for index, part in enumerate(manifest['chunks']):
        require(part['index'] == index and part['path'] == f'feed.json.gz.part-{index:03d}.b64', 'fixture chunk sequence changed')
        text = (FIXTURE / part['path']).read_bytes()
        require(len(text) == part['textBytes'] and sha(text) == part['textSha256'], 'fixture text chunk changed')
        chunk = base64.b64decode(text.rstrip(b'\n'), validate=True)
        require(len(chunk) == part['decodedBytes'] and sha(chunk) == part['decodedSha256'], 'fixture decoded chunk changed')
        compressed.extend(chunk)
    require(len(compressed) == manifest['gzip']['bytes'] and sha(compressed) == manifest['gzip']['sha256'], 'compressed fixture changed')
    raw_bytes = gzip.decompress(compressed)
    require(len(raw_bytes) == manifest['feed']['bytes'] and sha(raw_bytes) == manifest['feed']['sha256'], 'fixture payload changed')
    raw = json.loads(raw_bytes)
    start, end = timestamp('2026-10-15T21:00:00Z'), timestamp('2026-10-16T21:00:00Z')
    evaluation = timestamp('2026-10-14T21:00:00Z')
    candles, tickers = {}, []
    for sym in SYMBOLS:
        minutes = [c for c in raw['candles'][sym + '|1'] if c['t'] < end]
        hourly = [c for c in raw['candles'][sym + '|60'] if c['t'] + 3600000 <= start]
        require(minutes and minutes[-1]['t'] == end - 60000 and all(b['t'] - a['t'] == 60000 for a, b in zip(minutes, minutes[1:])), f'{sym} minute coverage')
        require(hourly and hourly[-1]['t'] == start - 3600000 and all(b['t'] - a['t'] == 3600000 for a, b in zip(hourly, hourly[1:])), f'{sym} hourly coverage')
        require(minutes[0]['t'] <= evaluation - 7 * 24 * 3600000, f'{sym} cadence warmup coverage')
        prior = [c for c in minutes if start - 24 * 3600000 <= c['t'] < start]
        require(len(prior) == 1440 and prior[0]['t'] == start - 24 * 3600000 and prior[-1]['t'] == start - 60000, f'{sym} ticker coverage')
        last, ref = prior[-1]['c'], prior[0]['c']
        require(last > 0 and ref > 0, f'{sym} ticker price')
        tickers.append({'sym': sym, 'last': last, 'quoteVol': sum(c['c'] * c['v'] for c in prior), 'changePct': (last / ref - 1) * 100})
        candles[sym + '|1'], candles[sym + '|60'] = minutes, hourly
    payload = json.dumps({'tickers': tickers, 'candles': candles}, separators=(',', ':'), allow_nan=False).encode()
    require(sha(payload) == EXPECTED_FEED, 'derived causal feed differs from the frozen study')
    (out / 'feed-causal.json').write_bytes(payload)
    print(json.dumps({'sha256': sha(payload), 'symbols': SYMBOLS, 'minuteBars': sum(len(candles[s + '|1']) for s in SYMBOLS), 'hourlyBars': sum(len(candles[s + '|60']) for s in SYMBOLS), 'ranking': 'fixed cohort; pre-start ticker and hourly data only'}))


if __name__ == '__main__':
    if len(sys.argv) != 2:
        raise SystemExit('usage: prepare-stable04-replay-feed.py OUTPUT_DIR')
    main(Path(sys.argv[1]).resolve())
