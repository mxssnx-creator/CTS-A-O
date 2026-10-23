"""Compare complete per-config histories without extracting the newer ZIP archive.

Usage: python3 scripts/compare-signal-tape-archive.py OLD_DIRECTORY NEW_ZIP CASE OUTPUT
The audit verifies every chunk checksum and exact ordered trade bytes. Global tape
indices may differ after new configs are inserted; actual config identities may not.
"""
import hashlib
import json
from pathlib import Path
import sys
import time
import zipfile

old_dir, archive, case, output = sys.argv[1:]
started = time.monotonic()

def inventory(raw, open_chunk):
    manifest = raw['tapeTradesSidecar']
    rows, current, index, count, digest = {}, None, None, 0, None
    total = 0

    def finish():
        if current is not None:
            assert current not in rows, 'Duplicate config identity'
            rows[current] = (count, digest.hexdigest())

    for chunk in manifest['chunks']:
        chunk_hash, size = hashlib.sha256(), 0
        with open_chunk(chunk['path']) as stream:
            for line in stream:
                chunk_hash.update(line)
                size += len(line)
                if line.startswith(b'["t",'):
                    finish()
                    tag, index, metadata = json.loads(line)
                    current, count = metadata['id'], 0
                    digest = hashlib.sha256(json.dumps(metadata, sort_keys=True, separators=(',', ':')).encode())
                else:
                    tag, row_index, ordinal, data = line.split(b',', 3)
                    assert tag == b'["r"' and int(row_index) == index and int(ordinal) == count
                    digest.update(data)
                    count += 1
                    total += 1
        assert size == chunk['bytes'] and chunk_hash.hexdigest() == chunk['sha256'], 'Corrupt chunk'
    finish()
    assert len(rows) == manifest['tapes'] and total == manifest['rows']
    return rows, total

old_path = Path(old_dir)
old_raw = json.loads((old_path / 'raw.json').read_text())
old, old_closes = inventory(old_raw, lambda p: (old_path / p).open('rb'))
with zipfile.ZipFile(archive) as zipped:
    new_raw = json.loads(zipped.read(f'{case}/raw.json'))
    new, new_closes = inventory(new_raw, lambda p: zipped.open(f'{case}/{p}'))
    new_protocol = json.loads(zipped.read(f'{case}/protocol.json'))
old_protocol = json.loads((old_path / 'protocol.json').read_text())
for key in ['actualSettings', 'actualWf', 'symbols', 'window', 'account']:
    assert old_protocol[key] == new_protocol[key], f'Changed comparison policy: {key}'
assert old_protocol['feed']['sha256'] == new_protocol['feed']['sha256']
missing = [key for key in old if key not in new]
changed = [key for key in old if key in new and old[key] != new[key]]
added = sorted(key for key in new if key not in old)
receipt = {'schema': 'cts-signal-history-additions-v1', 'ok': not missing and not changed,
    'sourceBefore': old_protocol['source']['sha256'], 'sourceAfter': new_protocol['source']['sha256'],
    'feedSha256': new_protocol['feed']['sha256'], 'existingConfigs': len(old), 'existingCloses': old_closes,
    'newConfigs': len(new), 'newCloses': new_closes, 'addedConfigs': len(added),
    'addedCloses': new_closes - old_closes, 'missing': missing, 'changed': changed, 'addedIdentities': added,
    'comparison': 'Exact canonical metadata and ordered original trade bytes for every existing config; independent of tape ordering and chunk boundaries.',
    'elapsedSeconds': time.monotonic() - started}
Path(output).write_text(json.dumps(receipt, indent=2) + '\n')
print(json.dumps({key: value for key, value in receipt.items() if key != 'addedIdentities'}), flush=True)
assert receipt['ok'], 'Original histories changed or disappeared'
