"""Extend the existing frozen public feed to 600h; never read credentials or account endpoints."""
import concurrent.futures, gzip, hashlib, json, pathlib, time, urllib.parse, urllib.request

source = pathlib.Path("research/runs/signals-12sym-20261020")
target = pathlib.Path("research/runs/strategy-defaults-20261020/data600")
target.mkdir(parents=True, exist_ok=True)
old = json.loads((source / "data-protocol.json").read_text())
end = old["endT"]
start = end - 600 * 3_600_000
protocol = {**old, "startT": start, "warmupHours": 240,
            "classification": "Frozen BingX public history extended backwards to 600h; no account access or venue execution"}
(target / "data-protocol.json").write_text(json.dumps(protocol, indent=2))

def acquire(symbol):
    final = target / (symbol + ".json.gz")
    if final.exists():
        try:
            with gzip.open(final) as stream:
                rows = json.load(stream)
            assert len(rows) == 36_000
            assert all(r["t"] == start + i * 60_000 for i, r in enumerate(rows))
            return symbol, len(rows)
        except (OSError, EOFError, ValueError, AssertionError):
            final.rename(final.with_name(final.name + ".invalid-" + str(time.time_ns())))
    original = json.load(gzip.open(source / (symbol + ".json.gz")))
    rows = {r["t"]: r for r in original}
    edge = old["startT"] - 1
    while edge >= start:
        query = urllib.parse.urlencode({"symbol": symbol, "interval": "1m", "limit": 1440, "endTime": edge})
        for attempt in range(4):
            try:
                body = json.load(urllib.request.urlopen(protocol["endpoint"] + "?" + query, timeout=30))
                if body.get("code") != 0:
                    raise RuntimeError(str(body.get("code")) + ": " + str(body.get("msg", "")))
                batch = body["data"]
                break
            except Exception:
                if attempt == 3:
                    raise
                time.sleep(2 ** attempt)
        assert batch, "Empty backward page"
        first = min(int(r["time"]) for r in batch)
        assert first <= edge, "Non-decreasing history cursor"
        for r in batch:
            stamp = int(r["time"])
            if start <= stamp < old["startT"]:
                rows[stamp] = {"t": stamp, **{k: float(r[v]) for k, v in
                    [("o", "open"), ("h", "high"), ("l", "low"), ("c", "close"), ("v", "volume")]}}
        edge = first - 1
        time.sleep(.15)
    result = [rows[t] for t in sorted(rows)]
    assert len(result) == 36_000 and result[0]["t"] == start and result[-1]["t"] == end - 60_000
    assert all(r["t"] == start + i * 60_000 for i, r in enumerate(result))
    assert result[-len(original):] == original, "Existing frozen data changed"
    temporary = final.with_suffix(".tmp")
    with gzip.open(temporary, "wt") as stream:
        json.dump(result, stream, separators=(",", ":"))
    with gzip.open(temporary) as stream:
        assert json.load(stream) == result
    temporary.replace(final)
    return symbol, len(result)

with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
    for symbol, count in executor.map(acquire, old["symbols"]):
        print(symbol, count, flush=True)
manifest = {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in target.glob("*.json.gz")}
(target / "data-manifest.json").write_text(json.dumps(manifest, indent=2))
