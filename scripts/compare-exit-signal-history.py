"""Verify that Exit-only grid experiments preserve every independent Signal history."""
import hashlib
import json
import sys
import zipfile
from pathlib import Path


def signal_histories(streams):
    result = {}
    key = sha = None
    closes = 0
    def finish():
        if key is not None:
            assert key not in result, "Duplicate Signal tape identity"
            result[key] = {"sha256": sha.hexdigest(), "closes": closes}
    for stream in streams:
        with stream:
            for line in stream:
                if line.startswith(b'["t",'):
                    finish()
                    meta = json.loads(line)[2]
                    key = meta['id'] if meta['kind'] != 'exit' else None
                    sha = hashlib.sha256()
                    closes = 0
                    if key is not None:
                        sha.update(line.split(b',', 2)[2])
                elif key is not None:
                    assert line.startswith(b'["r",')
                    # The global tape index changes when Exit adds tapes; all other bytes must match.
                    sha.update(line.split(b',', 2)[2])
                    closes += 1
    finish()
    assert result, "No Signal histories found"
    return result


def compare(before, after, archive_path):
    before, after = Path(before), Path(after)
    p = json.loads((before / 'protocol.json').read_text())
    q = json.loads((after / 'protocol.json').read_text())
    for field in ['source', 'window', 'symbols', 'actualWf']:
        # The source checkpoint may differ although every economic file is identical.
        assert (p[field]['sha256'] == q[field]['sha256'] if field == 'source'
                else p[field] == q[field]), field
    a, b = dict(p['actualSettings']), dict(q['actualSettings'])
    a.pop('exitStrategy'); b.pop('exitStrategy')
    assert a == b, 'Only independent Exit settings may change'
    a = signal_histories(path.open('rb') for path in sorted(before.glob('session-tapes-*/*.jsonl')))
    with zipfile.ZipFile(archive_path) as archive:
        protocols = [n for n in archive.namelist() if n.endswith('/protocol.json')]
        assert len(protocols) == 1 and json.loads(archive.read(protocols[0])) == q
        b = signal_histories(archive.open(n) for n in sorted(archive.namelist())
                             if '/session-tapes-' in n and n.endswith('.jsonl'))
    assert a == b, 'Signal histories changed in the Exit-only experiment'
    def proofs(root):
        coverage = json.loads((root / 'coverage.json').read_text())
        assert coverage['ok']
        return {r['label']: {k: r[k] for k in ['start', 'end']}
                for r in coverage['groups'] if r['dimension'] == 'typeRange'
                and not r['label'].startswith('exit')}
    assert proofs(before) == proofs(after), 'Own Signal qualification changed'
    return {'control': before.name, 'expandedExit': after.name, 'ok': True,
            'economicSource': p['source']['sha256'], 'signalConfigs': len(a),
            'identicalSignalCloses': sum(row['closes'] for row in a.values()),
            'changedSignalTapes': 0, 'startAndEndOwnTypeRangeProofsEqual': True,
            'sharedControls': {k: p['actualSettings']['signals'][k] for k in ['sideAccept', 'cluster']},
            'scope': 'History and own qualification parity; shared execution controls remain enabled.'}


if __name__ == '__main__':
    output, *cases = sys.argv[1:]
    assert cases and len(cases) % 3 == 0, 'OUTPUT BEFORE_DIR AFTER_DIR AFTER_ZIP [BEFORE_DIR AFTER_DIR AFTER_ZIP ...]'
    results = [compare(*cases[i:i+3]) for i in range(0, len(cases), 3)]
    Path(output).write_text(json.dumps(results, indent=2) + '\n')
    print(json.dumps(results))
