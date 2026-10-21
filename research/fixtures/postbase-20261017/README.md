# Frozen public 22-symbol OHLCV feed

This fixture supplies the already-acquired public candle cache to an isolated
benchmark runner without making market-data requests. It contains numerical
OHLCV facts from BingX's unsigned public quote route, not account records,
credentials, private ledgers or strategy results. It adds no separate data
license grant; provider attribution and the exact public request route remain
in `manifest.json`. No private download or storage URL is needed.

Source: `GET https://open-api.bingx.com/openApi/swap/v3/quote/klines`, interval
`1m`, without authentication or a request body. The verified source archive
covers 22 symbols, 397 hours from 2026-10-01 08:00 through 2026-10-17 21:00
UTC: 524,040 completed 1m candles and 8,734 aligned 1h candles. The source
window does not define or expand a replay's evaluated PF window. Full request,
availability-only TON-to-ETC amendment and acquisition provenance are retained
in [`the tracked acquisition record`](../../../docs/simulations/symbols22-data-20261017/README.md).

| Form | Bytes | SHA-256 |
|---|---:|---|
| Original `feed.json` | 39,528,851 | `02ad14fd7d7ba3e89dee99026962a2ec66d8145d6beb36b17ab42a89a7d2004e` |
| Concatenated decoded `feed.json.gz` | 7,546,998 | `1373d0a7fab7528d0528573385e19dfecf6f4ab353194231c639103af29aadcd` |

`manifest.json` uses schema `cts-public-cached-feed-fixture-v1`. Its `chunks`
array defines the exact order of 20 files, `feed.json.gz.part-000.b64` through
`feed.json.gz.part-019.b64`. Each file contains one ASCII base64 line followed
by LF. Decode each line separately, then concatenate the decoded compressed
bytes; do not concatenate the base64 strings. Each decoded part is at most
390,000 bytes and each text part at most 520,001 bytes. Per-part text and
decoded byte counts and SHA-256 values are recorded. The gzip stream uses
mtime zero and no original filename for reproducible metadata.

The following decoder reads at most one part plus 64KiB decompression blocks.
Run it from the repository root with Python 3; it makes no network requests:

```python
import base64, gzip, hashlib, json
from pathlib import Path

fixture = Path("research/fixtures/postbase-20261017")
output = Path("runs/postbase-ci-feed")
output.mkdir(parents=True, exist_ok=True)
manifest = json.loads((fixture / "manifest.json").read_text())
assert manifest["schema"] == "cts-public-cached-feed-fixture-v1"
gzip_path, feed_path = output / "feed.json.gz", output / "feed.json"
digest, size = hashlib.sha256(), 0
with gzip_path.open("xb") as target:
    for index, part in enumerate(manifest["chunks"]):
        assert part["index"] == index
        assert part["path"] == f"feed.json.gz.part-{index:03d}.b64"
        text = (fixture / part["path"]).read_bytes()
        assert len(text) == part["textBytes"]
        assert hashlib.sha256(text).hexdigest() == part["textSha256"]
        assert text.endswith(b"\n") and b"\n" not in text[:-1]
        chunk = base64.b64decode(text[:-1], validate=True)
        assert len(chunk) == part["decodedBytes"] <= 390000
        assert hashlib.sha256(chunk).hexdigest() == part["decodedSha256"]
        target.write(chunk)
        digest.update(chunk)
        size += len(chunk)
assert size == manifest["gzip"]["bytes"]
assert digest.hexdigest() == manifest["gzip"]["sha256"]
digest, size = hashlib.sha256(), 0
with gzip.open(gzip_path, "rb") as source, feed_path.open("xb") as target:
    while chunk := source.read(65536):
        target.write(chunk)
        digest.update(chunk)
        size += len(chunk)
assert size == manifest["feed"]["bytes"]
assert digest.hexdigest() == manifest["feed"]["sha256"]
print(feed_path, size, digest.hexdigest())
```

Creation streamed the source in 64KiB blocks. Validation independently decoded
every tracked part, checked all text/decoded hashes and the concatenated gzip
hash, then decompressed that reconstructed stream and matched the exact source
feed hash and size. The deterministic first-20 subset can be derived by the
frozen study launcher; no duplicate uncompressed feed is committed here.
This is data-transport evidence, not a strategy score or profitability claim.
