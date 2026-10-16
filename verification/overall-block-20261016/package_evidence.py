#!/usr/bin/env python3
"""Prepare a public CTS-A-O evidence ZIP only after explicit comparator review.

Initially prepared before arm outcomes; historical-role annotations identify
the separate capture/audit owning each checkpoint. It is outside Git and is not a source
backup. Default invocation refuses to package anything.
--inventory is metadata-only; --package requires --evidence-ready comparator-finished.
No upload, network request, credentials, or application imports are performed.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import stat
import sys
import zipfile


REPO = Path('/workspace/scratch/18f0ba5d9c08/CTS-A-O-block')
RUN_NAMES = (
    'block-relations-20261016',
    'block-relations-20261016-attempt-01-superseded-before-outcomes',
    'block-relations-20261016-attempt-02-superseded-before-outcomes',
    'block-relations-20261016-attempt-03-captured-before-reporting-fix',
    'block-relations-20261016-attempt-04-before-pool-fix',
    'block-relations-20261016-attempt-05-memory-degraded',
    'block-relations-20261016-attempt-06-before-direction-history-fix',
    'block-relations-20261016-attempt-07-before-backtest-lifecycle-fix',
    'block-relations-20261016-attempt-08-before-preset-edit-invalidation',
)
RUN_ROLES = {
    RUN_NAMES[0]: 'current-final-study; full fold/arm artifact completeness required',
    RUN_NAMES[1]: 'historical superseded before outcomes; incomplete artifacts retained',
    RUN_NAMES[2]: 'historical superseded before outcomes; incomplete artifacts retained',
    RUN_NAMES[3]: 'historical completed capture before reporting correction; appended errata retained',
    RUN_NAMES[4]: 'historical completed CP5 capture before worker-pool correction',
    RUN_NAMES[5]: 'historical incomplete CP6 attempt; memory guard degraded fold2 and fold2 arms are absent; no completed-study claim',
    RUN_NAMES[6]: 'historical completed CP6 study before production direction-history correction; CP8-source validity and observed CP6/CP8 economic identity are established only by separate fresh CP8 capture/audit; no CP9 validity claim',
    RUN_NAMES[7]: 'historical completed CP8 modeled study before backtest lifecycle correction; CP8 slow core failed; fresh CP9 capture/audit and full verification are required and economic identity is not assumed',
    RUN_NAMES[8]: 'historical completed CP9 modeled study before preset-edit result invalidation; CP9 full core was interrupted; fresh CP10 capture/audit and full verification are required and economic identity is not assumed',
}
HISTORICAL_CORE_ROOTS = (
    (Path('/tmp/cts-overall-block-full-core-attempt-01-pre-CP6-20261016'),
     'historical interrupted incomplete CP5 core verification; no completed-suite claim'),
    (Path('/tmp/cts-overall-block-full-core-attempt-02-cp6-complete-failed-20261016'),
     'historical completed failed CP6 regular core verification; actual counts/stacks/source/memory evidence retained; no passing-suite claim'),
    (Path('/tmp/cts-overall-block-full-core-attempt-03-cp8-complete-failed-20261016'),
     'historical completed CP8 core attempt; regular passed and slow failed; actual counts/stacks/source/memory evidence retained; no completed passing-suite or CP9 verification claim'),
    (Path('/tmp/cts-overall-block-full-core-attempt-04-cp9-interrupted-20261016'),
     'historical interrupted CP9 core attempt; original actual failures/partial counts/source/memory evidence retained; not a completed passing suite or CP10 verification'),
)
HISTORICAL_FIXTURE_ROOTS = (
    (Path('/tmp/cts-cp7-toggle-fixtures-original-20261016'),
     'historical original CP6 toggle fixtures and failure evidence; source bodies excluded and file hashes projected separately'),
)
TMP_PATTERNS = (
    'cts-block-*20261016*.json',
    'cts-block-*20261016*.md',
    'cts-block-*.log',
    'cts-block-*.sha256',
    'cts-block-native-import-failure-note.json',
    'cts-ao-access-refresh-20261016.json',
    'cts-ao-x02-demo-availability-20261016.json',
    'cts-ao-exit-integrity-audit-20261016.json',
    'cts-ao-block*.log',
    'cts-ao-independent-exits.log',
    'cts-overall-block-*.log',
    'cts-overall-block-*.json',
    'cts-overall-block-full-core-*.sha256',
    'cts-invariants-*-20261016.log',
    'cts-invariants-*-20261016.json',
    'cts-invariants-*-20261016.json.sha256',
    'cts-prehist-cases-*.json',
    'cts-prehist-cases-*.log',
    'cts-prehist-cases-*.sha256',
    'cts-sidegate-*.json',
    'cts-sidegate-*.log',
    'cts-sidegate-*.sha256',
    'cts-block-coverage-schema-correction-20cases.json',
    'cts-prehist-unit-fixture-freeze-20261016.json',
    'cts-prehist-unit-fixture-freeze-20261016.json.sha256',
    'cts-cp7-*.json',
    'cts-cp7-*.log',
    'cts-cp7-*.sha256',
    'cts-cp8-*.json',
    'cts-cp8-*.log',
    'cts-cp8-*.sha256',
    'cts-cp9-*.json',
    'cts-cp9-*.log',
    'cts-cp9-*.sha256',
    'cts-cp10-*.json',
    'cts-cp10-*.log',
    'cts-cp10-*.sha256',
    'cts-main-sparse-fee-*.json',
    'cts-main-sparse-fee-*.log',
    'cts-main-sparse-fee-*.sha256',
)
DIAGNOSTIC_VERSIONS = {
    'cts-block-slice-acceptance-diagnosis-20261016-initial-incomplete.json':
        'historical initial incomplete Block-slice diagnosis; corrected version and erratum retained separately',
    'cts-block-slice-acceptance-diagnosis-20261016.json':
        'corrected Block-slice diagnosis including appended correction/erratum; no completed-suite claim',
}
ACCESS_REQUIRED = (
    'cts-ao-access-refresh-20261016.json',
    'cts-ao-x02-demo-availability-20261016.json',
)
EXTENSIONS = {'.json', '.jsonl', '.ndjson', '.log', '.txt', '.md', '.html', '.csv', '.tsv', '.sha256'}
DENIED_PARTS = {
    '.git', 'node_modules', 'engine-source', 'source', 'src', 'scripts',
    '.cts-core', '.ssh', '.grok', 'screenshots', 'screenshot', 'private',
    'qa', 'qa-private', 'ui-private', '.output', '.tanstack', '__pycache__',
}
DENIED_NAME = re.compile(r'(?:private|screenshot|credential|secret|account-record|account-snapshot|\.env(?:\.|$))', re.I)
SENSITIVE = (
    re.compile(rb'-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----'),
    re.compile(rb'(?i)["\'](?:api[_-]?key|api[_-]?secret|x-bx-apikey|secret|access[_-]?token|refresh[_-]?token)["\']\s*:\s*["\'][A-Za-z0-9_+/=.-]{16,}["\']'),
    re.compile(rb'(?i)(?:BINGX_[A-Z0-9_]*(?:KEY|SECRET)|Authorization)["\']?\s*[=:]\s*["\']?(?:Bearer\s+)?[A-Za-z0-9_+/=.-]{20,}'),
    re.compile(rb'(?i)(?:[?&]signature=)[a-f0-9]{32,}'),
)
LIMIT = 50_000_000
CHUNK = 1024 * 1024
ZIP_DATE = (1980, 1, 1, 0, 0, 0)
STAGING = REPO.parent / '.library-overall-block-20261016'


def canonical(value):
    return (json.dumps(value, indent=2, sort_keys=True, ensure_ascii=False, allow_nan=False) + '\n').encode('utf-8')


def digest(data):
    return hashlib.sha256(data).hexdigest()


def fingerprint(path):
    st = path.stat(follow_symlinks=False)
    if not stat.S_ISREG(st.st_mode) or path.is_symlink():
        raise ValueError(f'Not a regular nonsymlink evidence file: {path}')
    return (st.st_dev, st.st_ino, st.st_size, st.st_mtime_ns, st.st_ctime_ns)


def safe_relative(value):
    path = PurePosixPath(value)
    if path.is_absolute() or '..' in path.parts or not path.parts:
        raise ValueError(f'Unsafe archive name: {value}')
    return str(path)


def excluded_reason(path, relative):
    parts = {p.lower() for p in PurePosixPath(relative).parts}
    if parts & DENIED_PARTS:
        return 'private/QA/source/dependency directory excluded'
    if DENIED_NAME.search(path.name):
        return 'private/credential/screenshot filename excluded'
    if path.name in {'package.json','package-lock.json','tsconfig.json','jsconfig.json','eslint.config.json'}:
        return 'repository/dependency configuration body excluded; verification manifests retain hashes instead'
    if path.suffix.lower() not in EXTENSIONS:
        return 'not an allowlisted evidence extension (includes all code, DBs, images and archives)'
    if path.name.startswith('cts-overall-block-checkpoint'):
        return 'Git source-bearing checkpoint: sanitized hash/tree metadata only'
    if path.name.startswith('cts-overall-block-package'):
        return 'collector/previous packaging outputs excluded'
    return None


def select_files(args):
    selected, omitted = {}, []

    def add(path, logical, classification):
        path = Path(path)
        logical = safe_relative(logical)
        if path.is_symlink() or path.resolve() != path.absolute():
            raise ValueError(f'Symlink evidence is forbidden: {path}')
        reason = excluded_reason(path, logical)
        if reason:
            omitted.append({'source': str(path), 'logicalPath': logical, 'reason': reason})
            return
        fp = fingerprint(path)
        if logical in selected and selected[logical]['source'] != str(path):
            raise ValueError(f'Duplicate logical name: {logical}')
        selected[logical] = {'source': str(path), 'logicalPath': logical,
                             'classification': classification, 'bytes': fp[2], 'fingerprint': fp}

    for name in RUN_NAMES:
        root = REPO / 'runs' / name
        if not root.is_dir() or root.is_symlink():
            raise ValueError(f'Required public protocol root missing or symlinked: {root}')
        for current, dirs, files in os.walk(root, followlinks=False):
            dirs.sort()
            for dirname in list(dirs):
                d = Path(current) / dirname
                if d.is_symlink():
                    raise ValueError(f'Symlink under public evidence root: {d}')
                if dirname.lower() in DENIED_PARTS or DENIED_NAME.search(dirname):
                    dirs.remove(dirname)
                    omitted.append({'source': str(d), 'reason': 'private/QA/source directory excluded without traversal'})
            for filename in sorted(files):
                p = Path(current) / filename
                add(p, f'research/{name}/{p.relative_to(root).as_posix()}',
                    'public-frozen-feed-and-offline-model-evidence; '+RUN_ROLES[name])
    historical_roots=[(p,role,'core-attempts') for p,role in HISTORICAL_CORE_ROOTS]
    historical_roots.extend((p,role,'fixture-attempts') for p,role in HISTORICAL_FIXTURE_ROOTS)
    for root,role,category in historical_roots:
        if not root.is_dir() or root.is_symlink() or root.resolve() != root.absolute():
            raise ValueError(f'Required historical verification root missing or symlinked: {root}')
        for current, dirs, files in os.walk(root, followlinks=False):
            dirs.sort()
            for dirname in list(dirs):
                d = Path(current) / dirname
                if d.is_symlink():
                    raise ValueError(f'Symlink under historical verification root: {d}')
                if dirname.lower() in DENIED_PARTS or DENIED_NAME.search(dirname):
                    dirs.remove(dirname)
                    omitted.append({'source':str(d),'reason':'private/QA/source directory excluded without traversal'})
            for filename in sorted(files):
                p=Path(current)/filename
                add(p,f'verification/{category}/{root.name}/{p.relative_to(root).as_posix()}',role)
    temporary = set()
    for pattern in TMP_PATTERNS:
        temporary.update(p for p in Path('/tmp').glob(pattern) if p.is_file() or p.is_symlink())
    temporary.update(p for p in REPO.parent.glob('cts-ao-block*-20261016.log') if p.is_file() or p.is_symlink())
    out_paths = set()
    if args.out:
        output = Path(args.out).resolve()
        out_paths = {output, Path(str(output) + '.sha256'), Path(str(output) + '.manifest.json')}
    for p in sorted(temporary):
        if p.resolve() in out_paths:
            continue
        role=DIAGNOSTIC_VERSIONS.get(p.name,'sanitized-local-verification-or-access-metadata')
        if p.name.startswith('cts-overall-block-full-core-cp7-20261016'):
            role='historical unlaunched CP7 runner preparation; not an actual test run or passing-suite claim'
        elif p.name.startswith('cts-overall-block-full-core-'):
            role='core verification artifact; actual launch/status/source/counts come from its metadata; no assumed passing-suite claim'
        add(p, f'verification/{p.name}', role)
    reports = list(args.report)
    if args.report_dir:
        directory = Path(args.report_dir).absolute()
        expected_names = {'index.html','comparison.csv','hourly.csv','all-close-slices.csv','report-data.json','report-manifest.json'}
        if directory.is_symlink() or directory.resolve() != directory or not directory.is_dir():
            raise ValueError('Report directory must be an existing nonsymlink generated-report directory')
        if {p.name for p in directory.iterdir()} != expected_names:
            raise ValueError('Generated report directory must contain exactly the six declared public report files')
        reports.extend(str(directory/name) for name in sorted(expected_names))
    for supplied in reports:
        p = Path(supplied).absolute()
        if p.suffix.lower() not in {'.html', '.md', '.json', '.csv'}:
            raise ValueError(f'Report must be HTML/MD/JSON/CSV: {p}')
        if not any(p.is_relative_to(base) for base in (Path('/tmp'), STAGING, REPO / 'runs' / RUN_NAMES[0])):
            raise ValueError(f'Report must be an explicit public summary in /tmp, approved staging, or the public current run: {p}')
        if any(part.lower() in DENIED_PARTS or DENIED_NAME.search(part) for part in p.parts):
            raise ValueError(f'Report source cannot be in a private/QA/source directory: {p}')
        if p.name in {'package.json', 'package-lock.json', 'tsconfig.json'}:
            raise ValueError(f'Repository configuration is not a public evidence report: {p}')
        add(p, f'reports/{p.name}', 'operator-reviewed-public-evidence-summary')
    for name in ACCESS_REQUIRED:
        if f'verification/{name}' not in selected:
            raise ValueError(f'Required sanitized access metadata missing: {name}')
    for name in DIAGNOSTIC_VERSIONS:
        if f'verification/{name}' not in selected or f'verification/{name}.sha256' not in selected:
            raise ValueError(f'Required original/corrected diagnosis and hash missing: {name}')
    for relative in args.require:
        logical = safe_relative('research/block-relations-20261016/' + safe_relative(relative))
        if logical not in selected:
            raise ValueError(f'Required arm/comparison artifact missing: {logical}')
    return [selected[k] for k in sorted(selected)], sorted(omitted, key=lambda x: x['source'])


def expected_artifacts(protocol):
    """Names only; completeness never depends on a PF or outcome value."""
    required = {'comparison.json', 'progress.json', 'protocol.json', 'source-freeze.json'}
    folds, arms = protocol.get('folds'), protocol.get('arms')
    if not isinstance(folds, list) or not folds or not isinstance(arms, list) or not arms:
        raise ValueError('Frozen protocol must contain fold/arm identity lists')
    for fold in folds:
        fid = safe_relative(fold['id'])
        if '/' in fid:
            raise ValueError('Fold id must be a single directory component')
        required.update(f'{fid}/{name}' for name in ('feed.json', 'command.json', 'engine.log', 'native-raw.json'))
        for arm in arms:
            aid = safe_relative(arm['id'])
            if '/' in aid:
                raise ValueError('Arm id must be a single directory component')
            required.update(f'{fid}/{aid}/{name}' for name in (
                'raw.json', 'session.json', 'session.md', 'book.log',
                'book/data.json', 'book/index.html', 'evidence.json'))
    return sorted(required)


def inspect_stream(path, expected):
    if fingerprint(path) != expected:
        raise ValueError(f'Evidence changed after inventory: {path}')
    sha, count, tail = hashlib.sha256(), 0, b''
    with path.open('rb') as file:
        while chunk := file.read(CHUNK):
            sha.update(chunk)
            count += len(chunk)
            scan = tail + chunk
            if any(pattern.search(scan) for pattern in SENSITIVE):
                raise ValueError(f'Possible credential material; packaging stopped without dumping value: {path}')
            tail = scan[-65536:]
    if fingerprint(path) != expected or count != expected[2]:
        raise ValueError(f'Evidence changed during hashing: {path}')
    return sha.hexdigest()


def zip_info(name):
    info = zipfile.ZipInfo(safe_relative(name), ZIP_DATE)
    info.compress_type = zipfile.ZIP_DEFLATED
    info.create_system = 3
    info.external_attr = (stat.S_IFREG | 0o644) << 16
    info._compresslevel = 9
    return info


def checkpoint_metadata():
    result, fingerprints = [], []
    for p in sorted(Path('/tmp').glob('cts-overall-block-checkpoint*.json')):
        if p.is_symlink():
            raise ValueError(f'Symlink checkpoint forbidden: {p}')
        before = fingerprint(p)
        value = json.loads(p.read_bytes())
        entry = {'sourceName': p.name, 'sourceContainerBytes': before[2],
                 'classification': 'source-free-tree-and-content-hash-metadata-only',
                 'metadata': {k: value[k] for k in ('parent', 'baseTree', 'tree')
                              if isinstance(value.get(k), str) and re.fullmatch(r'[a-f0-9]{40,64}', value[k])}, 'files': []}
        if 'additionalParents' in value:
            parents=value['additionalParents']
            if not isinstance(parents,list) or any(not isinstance(parent,str) or not re.fullmatch(r'(?:[a-f0-9]{40}|[a-f0-9]{64})',parent) for parent in parents):
                raise ValueError(f'Malformed additional checkpoint parents: {p}')
            entry['metadata']['additionalParents']=list(parents)
        for row in value.get('files', []):
            if not isinstance(row, dict):
                raise ValueError(f'Malformed source checkpoint: {p}')
            item = {k: row[k] for k in ('path', 'mode', 'type', 'sha') if isinstance(row.get(k), str)}
            if 'path' in item:
                item['path'] = safe_relative(item['path'])
            if isinstance(row.get('content'), str):
                raw = row['content'].encode('utf-8')
                item.update({'storedContentTextBytes': len(raw), 'storedContentTextSha256': digest(raw)})
            entry['files'].append(item)
        entry['files'].sort(key=lambda x: x.get('path', ''))
        if fingerprint(p) != before:
            raise ValueError(f'Checkpoint changed during metadata extraction: {p}')
        fingerprints.append((p, before))
        result.append(entry)
    return (canonical({'schema': 'cts-source-free-checkpoint-metadata-v1', 'checkpoints': result,
                       'limits': 'Stored content text fingerprints only; no Git source bodies or source backups included.'}), fingerprints)


def fixture_source_metadata():
    result,fingerprints=[],[]
    source_extensions={'.ts','.tsx','.js','.jsx','.mjs','.cjs','.py','.sh'}
    for root,role in HISTORICAL_FIXTURE_ROOTS:
        for p in sorted(root.rglob('*')):
            if p.is_symlink():
                raise ValueError(f'Symlink fixture source forbidden: {p}')
            if not p.is_file() or p.suffix.lower() not in source_extensions:
                continue
            relative=p.relative_to(root).as_posix()
            if DENIED_NAME.search(p.name) or set(PurePosixPath(relative).parts)&DENIED_PARTS:
                raise ValueError(f'Unexpected private/source subdirectory in original fixture snapshot: {p}')
            before=fingerprint(p)
            sha=hashlib.sha256()
            with p.open('rb') as file:
                while chunk:=file.read(CHUNK):
                    sha.update(chunk)
            if fingerprint(p)!=before:
                raise ValueError(f'Fixture source changed during metadata projection: {p}')
            result.append({'snapshotRoot':str(root),'relativePath':relative,'bytes':before[2],
                'sha256':sha.hexdigest(),'classification':role,'sourceBodyIncluded':False})
            fingerprints.append((p,before))
    return (canonical({'schema':'cts-original-fixture-source-free-metadata-v1','files':result,
        'limits':'Original test source bodies stay outside the archive; only exact paths, byte counts and SHA256 identify them.'}),fingerprints)


def package(args, items, omitted):
    if args.evidence_ready != 'comparator-finished':
        raise ValueError('--package requires explicit --evidence-ready comparator-finished after authorized outcome review')
    if not re.fullmatch(r'[a-f0-9]{40}', args.source_checkpoint or '') or not re.fullmatch(r'[a-f0-9]{64}', args.freeze_sha256 or ''):
        raise ValueError('Packaging requires explicit final --source-checkpoint and --freeze-sha256; stale defaults are forbidden')
    if not args.out:
        raise ValueError('--out is required for packaging')
    output = Path(args.out).absolute()
    if output.is_symlink() or output.resolve() != output:
        raise ValueError('Output and its parents cannot be symlinks')
    if output.suffix.lower() != '.zip' or not any(output.is_relative_to(base) for base in (Path('/tmp'), STAGING)):
        raise ValueError('Output must be a .zip in /tmp or the approved non-Git evidence staging directory')
    if output.exists() or any(Path(str(output) + suffix).exists() for suffix in ('.sha256', '.manifest.json')):
        raise ValueError('Refusing to overwrite an existing archive')
    freeze_path = REPO / 'runs' / RUN_NAMES[0] / 'source-freeze.json'
    protocol_path = freeze_path.with_name('protocol.json')
    freeze_bytes = freeze_path.read_bytes()
    if digest(freeze_bytes) != args.freeze_sha256:
        raise ValueError('Source freeze changed; stop and disclose/review a new frozen checkpoint')
    freeze = json.loads(freeze_bytes)
    if freeze.get('checkpoint') != args.source_checkpoint:
        raise ValueError('Source-freeze checkpoint disagrees with explicit expected checkpoint')
    protocol_bytes = protocol_path.read_bytes()
    protocol_sha = digest(protocol_bytes)
    if freeze.get('protocolSha256') != protocol_sha:
        raise ValueError('Frozen protocol SHA256 does not match protocol.json')
    expected = sorted(set(expected_artifacts(json.loads(protocol_bytes))) | set(args.require))
    available = {row['logicalPath'] for row in items}
    missing = [name for name in expected if f'research/{RUN_NAMES[0]}/{name}' not in available]
    if missing and not args.incomplete_reason:
        raise ValueError('Missing expected comparison/arm artifacts; preserve incomplete evidence only with explicit --incomplete-reason: ' + ', '.join(missing))
    for row in items:
        row['sha256'] = inspect_stream(Path(row['source']), row['fingerprint'])
    physical, logical, feed_locations = {}, [], {}
    current_prefix = f'research/{RUN_NAMES[0]}/'
    for row in sorted(items, key=lambda x: (not x['logicalPath'].startswith(current_prefix), x['logicalPath'])):
        if Path(row['source']).name == 'feed.json':
            feed_locations.setdefault(row['sha256'], row['logicalPath'])
    for row in items:
        is_feed = Path(row['source']).name == 'feed.json'
        location = feed_locations[row['sha256']] if is_feed else row['logicalPath']
        logical.append({k: row[k] for k in ('logicalPath', 'source', 'classification', 'bytes', 'sha256')} |
                       {'archivePath': location, 'publicFeedEvidence': is_feed,
                        'deduplicatedFeedReference': is_feed and location != row['logicalPath']})
        if location not in physical or row['logicalPath'] == location:
            physical[location] = row
    checkpoint_bytes, checkpoint_fingerprints = checkpoint_metadata()
    fixture_bytes,fixture_fingerprints=fixture_source_metadata()
    generated = {'verification/source-checkpoint-metadata.json': checkpoint_bytes,
                 'verification/original-fixture-source-metadata.json':fixture_bytes}
    generated['README.txt'] = (
        'CTS-A-O public Overall/Block evidence archive, 2026-10-16\n\n'
        'Contains frozen public feeds, protocols and superseded-attempt notes; offline/model arm evidence; '
        'sanitized verification/access metadata; and reviewed summary reports if supplied.\n'
        'Public feed bytes are stored once per SHA256; current-protocol feed paths are preferred and retained. '
        'MANIFEST.json maps every original research feed path to its exact archived feed bytes. '
        'To replay a superseded protocol, materialize its referenced feed at the original logical path.\n'
        'No Git code, source-bearing checkpoint bodies, dependencies, private account records, QA databases '
        'or screenshots are included. Source-freeze file fingerprints and sanitized checkpoint metadata '
        'identify source separately.\n'
        'Offline modeled results are not venue execution, live profitability or deployment evidence. '
        'Losses, insufficient/unknown samples, failed/superseded attempts and access blockers must remain visible. '
        'Return PF is primary; separately labeled sized/cash diagnostics use different weighting. '
        'The collector does not score outcomes, certify profitability or contact any account.\n'
        'ZIP timestamps/order/permissions are fixed; inputs must remain unchanged while packaging. '
        'MANIFEST.json hashes every included input and generated payload except its own self-referential bytes. '
        'The companion .sha256 file hashes the complete archive.\n'
    ).encode('utf-8')
    payloads = [{'archivePath': name, 'bytes': row['bytes'], 'sha256': row['sha256']}
                for name, row in sorted(physical.items())]
    payloads.extend({'archivePath': name, 'bytes': len(data), 'sha256': digest(data)} for name, data in sorted(generated.items()))
    manifest = {
        'schema': 'cts-overall-block-public-evidence-archive-v1',
        'preparedDate': '2026-10-16', 'sourceCheckpoint': args.source_checkpoint,
        'sourceFreezeSha256': args.freeze_sha256, 'frozenSourceSetSha256': freeze.get('sourceSha256'),
        'frozenProtocolSha256': protocol_sha, 'sourceCheckout': str(REPO),
        'sourceAuthority': 'source-freeze.json fingerprints + exact checkpoint; repository code is stored separately in Git',
        'scope': 'CTS-A-O public market/model evidence and sanitized local verification/access only',
        'researchProtocolRoots': list(RUN_NAMES),
        'researchProtocolRootRoles': dict(RUN_ROLES),
        'historicalCoreVerificationRoots': [{'source':str(p),'role':role} for p,role in HISTORICAL_CORE_ROOTS],
        'historicalFixtureVerificationRoots': [{'source':str(p),'role':role} for p,role in HISTORICAL_FIXTURE_ROOTS],
        'preservedDiagnosticVersions': dict(DIAGNOSTIC_VERSIONS),
        'classification': 'public-market-data/offline-research/local-verification; no authenticated account evidence',
        'completeComparatorReviewAffirmedByCaller': True,
        'requiredArtifacts': expected, 'missingExpectedArtifacts': missing,
        'completeness': 'incomplete' if missing else 'all-expected-artifacts-present',
        'incompleteReason': args.incomplete_reason or None, 'inputs': logical,
        'payloads': sorted(payloads, key=lambda x: x['archivePath']), 'excluded': omitted,
        'inputFiles': len(logical), 'physicalInputFiles': len(physical),
        'inputBytes': sum(x['bytes'] for x in logical),
        'physicalPayloadBytes': sum(x['bytes'] for x in payloads),
        'deduplicatedFeedBytes': sum(x['bytes'] for x in logical) - sum(x['bytes'] for x in physical.values()),
        'limits': ['No account calls, orders, live reload, deploy or profitability qualification performed by collector',
                   'Source bodies and private/QA state are excluded; hashes do not reconstruct those files',
                   'Primary return-PF evidence must retain matching cost, sample, period, ownership and unit-return provenance',
                   'Superseded attempts are historical/failure evidence, not additional independent positive trials',
                   'Interrupted CP5 core and prior broad snapshots remain historical; they never establish final current-checkpoint completion',
                   'Completed failed CP6 core attempt02 is distinct from interrupted CP5 attempt01 and cannot establish final current-checkpoint verification',
                   'Memory-degraded historical attempt05 retains missing fold2 arms explicitly; full20 checks apply only to the final current root',
                   'CP6 attempt06 predates a production direction-history correction; observed CP6/CP8 economic identity relies only on the separate fresh CP8 capture/audit and never establishes CP9 validity',
                   'Completed CP8 core attempt03 passed regular checks but failed slow checks; historical CP8 study attempt07 does not establish final CP9 results or full verification',
                   'Interrupted CP9 core attempt04 and historical CP9 study attempt08 do not establish final CP10 results or full verification',
                   'Original CP6 toggle-test fixture code is represented only by exact file hashes/bytes; failure stacks and source-free freeze notes remain separate evidence',
                   'MANIFEST.json self-hash is omitted; complete ZIP SHA256 is emitted separately'],
    }
    generated['MANIFEST.json'] = canonical(manifest)
    if any(pattern.search(data) for data in generated.values() for pattern in SENSITIVE):
        raise ValueError('Possible credential material in generated metadata; packaging stopped without dumping value')
    output.parent.mkdir(parents=True, exist_ok=True)
    partial = output.with_name(output.name + '.partial')
    owned_partial = None
    owned_sidecars = []
    finalized = False

    def unlink_owned(path, identity):
        try:
            st = path.stat(follow_symlinks=False)
            if (st.st_dev, st.st_ino) == identity:
                path.unlink()
        except FileNotFoundError:
            pass

    def write_exclusive(path, data):
        fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o644)
        st = os.fstat(fd)
        owned_sidecars.append((path, (st.st_dev, st.st_ino)))
        with os.fdopen(fd, 'wb') as file:
            file.write(data)
            file.flush()
            os.fsync(file.fileno())

    try:
        fd = os.open(partial, os.O_RDWR | os.O_CREAT | os.O_EXCL, 0o600)
        st = os.fstat(fd)
        owned_partial = (st.st_dev, st.st_ino)
        with os.fdopen(fd, 'w+b') as archive_file:
            with zipfile.ZipFile(archive_file, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9, allowZip64=True) as archive:
                for name in sorted(set(physical) | set(generated)):
                    if name in generated:
                        archive.writestr(zip_info(name), generated[name], compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
                        continue
                    row = physical[name]
                    path = Path(row['source'])
                    if fingerprint(path) != row['fingerprint']:
                        raise ValueError(f'Evidence changed before archive copy: {path}')
                    sha, count = hashlib.sha256(), 0
                    with path.open('rb') as source, archive.open(zip_info(name), 'w', force_zip64=True) as target:
                        while chunk := source.read(CHUNK):
                            target.write(chunk)
                            sha.update(chunk)
                            count += len(chunk)
                    if fingerprint(path) != row['fingerprint'] or sha.hexdigest() != row['sha256'] or count != row['bytes']:
                        raise ValueError(f'Evidence changed during archive copy: {path}')
            archive_file.flush()
            os.fsync(archive_file.fileno())
        with zipfile.ZipFile(partial) as archive:
            if archive.testzip() is not None:
                raise ValueError('Archive CRC verification failed')
        final_items, final_omitted = select_files(args)
        if [(r['logicalPath'], r['fingerprint']) for r in final_items] != [(r['logicalPath'], r['fingerprint']) for r in items] or final_omitted != omitted:
            raise ValueError('Input file set or metadata changed during packaging; retry only after evidence is frozen')
        if any(fingerprint(path) != before for path, before in checkpoint_fingerprints):
            raise ValueError('Excluded source checkpoint changed after sanitized metadata extraction')
        if any(fingerprint(path)!=before for path,before in fixture_fingerprints):
            raise ValueError('Excluded original fixture source changed after hash metadata projection')
        archive_sha = hashlib.sha256()
        with partial.open('rb') as source:
            while chunk := source.read(CHUNK):
                archive_sha.update(chunk)
        write_exclusive(Path(str(output) + '.manifest.json'), generated['MANIFEST.json'])
        write_exclusive(Path(str(output) + '.sha256'), f'{archive_sha.hexdigest()}  {output.name}\n'.encode('utf-8'))
        # Atomic no-replace publication: a concurrent destination is never overwritten.
        os.link(partial, output)
        finalized = True
        unlink_owned(partial, owned_partial)
    except BaseException:
        if owned_partial is not None:
            unlink_owned(partial, owned_partial)
        if not finalized:
            for path, identity in owned_sidecars:
                unlink_owned(path, identity)
        raise
    return {'archive': str(output), 'bytes': output.stat().st_size, 'sha256': archive_sha.hexdigest(),
            'manifest': str(output) + '.manifest.json', 'inputFiles': len(logical),
            'deduplicatedFeedBytes': manifest['deduplicatedFeedBytes'],
            'helperUploadRequiredOver50MB': output.stat().st_size > LIMIT,
            'uploadPerformed': False}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument('--inventory', action='store_true', help='Filenames/size metadata only; does not hash/read outcomes or create ZIP')
    mode.add_argument('--package', action='store_true', help='Only after comparator completion and operator review')
    parser.add_argument('--evidence-ready', default='')
    parser.add_argument('--source-checkpoint', help='Exact final source checkpoint, explicitly bound after corrected rerun')
    parser.add_argument('--freeze-sha256', help='Exact final source-freeze.json SHA256; no pre-fix default is accepted')
    parser.add_argument('--out')
    parser.add_argument('--require', action='append', default=[], help='Required completed artifact path relative to current run root; repeat per arm/comparison')
    parser.add_argument('--report', action='append', default=[], help='Explicit public summary file; no source/docs/private state')
    parser.add_argument('--report-dir', help='Complete six-file generated HTML/CSV/data/manifest directory; no arbitrary directory copies')
    parser.add_argument('--incomplete-reason', default='', help='Explicit reviewed failure/incomplete-scope reason; missing artifacts stay listed and unavailable')
    args = parser.parse_args()
    items, omitted = select_files(args)
    if args.inventory:
        result = {'schema': 'cts-overall-block-metadata-only-inventory-v1',
                  'sourceCheckpoint': args.source_checkpoint,
                  'files': [{k: row[k] for k in ('logicalPath', 'source', 'classification', 'bytes')} for row in items],
                  'inputBytes': sum(row['bytes'] for row in items), 'excluded': omitted,
                  'outcomeContentsRead': False, 'archiveCreated': False,
                  'sizeLimitBytes': LIMIT,
                  'limits': 'Compression/feed dedup are not measured by metadata-only inventory; future arm results can grow. Recheck final ZIP bytes for >50MB helper upload.'}
    else:
        result = package(args, items, omitted)
    print(json.dumps(result, indent=2, sort_keys=True))


if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError, json.JSONDecodeError, zipfile.BadZipFile) as error:
        print(f'Collector stopped: {error}', file=sys.stderr)
        raise SystemExit(2)
