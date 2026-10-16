#!/usr/bin/env python3
"""Generate a self-contained public CTS-A-O report after the final corrected rerun.

Prepared outside Git. Do not execute before the authorized rerun is complete.
No engine/application imports, account calls, network, packaging or uploads.
Input cohorts and all zero/unknown close slices are preserved. This script does
not select arms, alter policy, optimize defaults or grant live qualification.
"""
from __future__ import annotations

import argparse
import base64
import collections
import csv
import datetime as dt
import gc
import hashlib
import html
import io
import json
import math
import os
from pathlib import Path
import re
import shutil
import stat
import sys

HOUR = 3_600_000
MODEL_NOTIONAL_EPS_USD = 1e-9
REPO = Path('/workspace/scratch/18f0ba5d9c08/CTS-A-O-block')
RUN_DEFAULT = REPO / 'runs/block-relations-20261016'
MATRIX_DEFAULT = Path('/tmp/cts-block-functionality-matrix-20261016.json')
ACCESS_DEFAULT = Path('/tmp/cts-ao-x02-demo-availability-20261016.json')
RELEASE_DEFAULT = Path('/tmp/cts-overall-block-release-status-20261016.json')
CP8_ANCESTOR_CHECKPOINT = 'e6914363380599e1f49a837a3a7a835ff9276faf'
CP8_ANCESTOR_MANIFEST_SHA = '0e3ff350e9cbadcb03c4d3e2e888204e4f3aea543884b813350e64550fb022af'
CP8_ANCESTOR_PARENTS = ['c6ed5e9275a70f1fd995992f11a19cd9b57bf290','fc2ec3b3e9e6fe61b55a95fd1ea8802103c564a8']
CP9_ANCESTOR_CHECKPOINT = 'da5fe49058bc721086d207ac4b34e67cab856b32'
CP9_ANCESTOR_MANIFEST_SHA = '3e8777a46c66646737b43769c32771c9990211293150587418f76d2cc6dbf286'
SAFE_STAGE = REPO.parent / '.library-overall-block-20261016'
COUNT_FIELDS = ('n', 'uniqueEntryOrders', 'ownedCloses', 'zeroAllocations', 'unknownAllocations',
                'unknownReturns', 'unknownSizedPnl', 'unknownReturnTotals', 'wins', 'losses', 'flat',
                'unknownMult', 'unknownVolume')
SENSITIVE = re.compile(r'-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----|(?i:[?&]signature=[a-f0-9]{32,}|["\'](?:api[_-]?key|api[_-]?secret|x-bx-apikey|secret|access[_-]?token|refresh[_-]?token)["\']\s*:\s*["\'][A-Za-z0-9_+/=.-]{16,}["\']|BINGX_[A-Z0-9_]*(?:KEY|SECRET)["\']?\s*[=:]\s*["\']?[A-Za-z0-9_+/=.-]{20,})')


def finite(x):
    return type(x) in (int, float) and math.isfinite(x)


def number(x):
    return x if finite(x) else None


def canonical(x):
    return json.dumps(x, ensure_ascii=False, sort_keys=True, separators=(',', ':'), allow_nan=False)


def sha_file(path):
    sha = hashlib.sha256()
    with path.open('rb') as file:
        while chunk := file.read(1024 * 1024):
            sha.update(chunk)
    return sha.hexdigest()


def fingerprint(path):
    if path.is_symlink() or path.resolve() != path.absolute():
        raise ValueError(f'Symlinked evidence is forbidden: {path}')
    st = path.stat(follow_symlinks=False)
    if not stat.S_ISREG(st.st_mode):
        raise ValueError(f'Evidence is not a regular file: {path}')
    return st.st_dev, st.st_ino, st.st_size, st.st_mtime_ns, st.st_ctime_ns


class Inputs:
    def __init__(self):
        self.rows = {}

    def load(self, path, classification):
        path = Path(path).absolute()
        before = fingerprint(path)
        digest = sha_file(path)
        with path.open('r', encoding='utf-8') as file:
            value = json.load(file, parse_constant=lambda x: (_ for _ in ()).throw(ValueError(f'Nonfinite JSON literal: {x}')))
        if fingerprint(path) != before:
            raise ValueError(f'Input changed during read: {path}')
        self.rows[str(path)] = {'path': str(path), 'bytes': before[2], 'sha256': digest,
                                'classification': classification, '_fingerprint': before}
        return value

    def verify_unchanged(self):
        for row in self.rows.values():
            if fingerprint(Path(row['path'])) != row['_fingerprint']:
                raise ValueError(f'Input changed while reporting: {row["path"]}')

    def manifest(self):
        return [{k: v for k, v in row.items() if k != '_fingerprint'} for _, row in sorted(self.rows.items())]


def kind_from_id(cfg):
    """Identity-only mirror of the frozen pipeline kindOfId; never strategy math."""
    if not isinstance(cfg, str):
        raise ValueError('Close configuration id is missing')
    core = re.sub(r'\|(?:mp|mc|mn|sh|gn|lg)(?=\||$)', '', cfg)
    for suffix, kind in (('|axis', 'axis'), ('|dcaA', 'dca-active'), ('|dca', 'dca')):
        if core.endswith(suffix):
            return kind
    if re.search(r'\|to(?:\||$)', core):
        return 'trailing-only'
    return 'normal' if re.search(r'\|tr0\|', core) else 'trailing'


def close_identity(row):
    kind = kind_from_id(row.get('cfg'))
    if row.get('kind') != kind:
        raise ValueError('Recorded close kind disagrees with canonical configuration identity')
    return row['cfg'], row.get('sym'), row.get('side'), row.get('entryT'), row.get('exitT'), kind


def entry_identity(row):
    return row.get('cfg'), row.get('sym'), row.get('side'), row.get('entryT')


def counts(rows):
    return {name: sum(x.get('allocation') == name for x in rows) for name in ('positive', 'zero', 'unknown')}


def check_cohort(rows, group, funded):
    if any(x.get('allocation') not in {'positive', 'zero', 'unknown'} for x in rows):
        raise ValueError('Unknown allocation classification; retain raw input for review')
    cohort = [x for x in rows if not funded or x['allocation'] != 'zero']
    actual = counts(rows)
    unknown_r = sum(not finite(x.get('unitR')) or (funded and x['allocation'] == 'unknown') for x in cohort)
    unknown_cash = sum(not finite(x.get('sizedPnl')) or x['allocation'] == 'unknown' for x in cohort)
    expected = {'n': len(cohort), 'ownedCloses': actual['positive'], 'zeroAllocations': actual['zero'],
                'unknownAllocations': actual['unknown'], 'unknownReturns': unknown_r, 'unknownSizedPnl': unknown_cash}
    for key, value in expected.items():
        if group.get(key, 0) != value:
            raise ValueError(f'Cohort count mismatch {key}: source {group.get(key)} vs slices {value}')
    if group.get('uniqueEntryOrders') is not None and group['uniqueEntryOrders'] != len({entry_identity(x) for x in cohort}):
        raise ValueError('Primary unique-entry count disagrees with canonical entries')
    for row in cohort:
        if row['allocation'] == 'unknown':
            continue
        if not all(finite(row.get(k)) for k in ('unitNotional','allocatedNotional','volume')) or row['unitNotional'] < 0 or row['allocatedNotional'] < 0 or row['volume'] <= 0 or row['allocatedNotional'] != row['unitNotional'] * row['volume']:
            raise ValueError('Known allocation/volume identity disagrees with source close')
        if finite(row.get('sizedPnl')):
            if not finite(row.get('sizedReturn')) or row['sizedPnl'] != row['sizedReturn'] * row['unitNotional']:
                raise ValueError('Known close cash P&L disagrees with recorded sized return and unit notional')
    # Never repair unknown aggregate evidence by filtering it to a known winning subset.
    if unknown_r == 0 and cohort and group.get('unknownReturnTotals', 0) == 0:
        gp = sum(x['unitR'] for x in cohort if x['unitR'] > 0)
        gl = -sum(x['unitR'] for x in cohort if x['unitR'] < 0)
        for key, value in (('gp', gp), ('gl', gl)):
            if not finite(group.get(key)) or not math.isclose(group[key], value, rel_tol=1e-10, abs_tol=1e-12):
                raise ValueError(f'Gross unit-return sum mismatch: {key}')
    if unknown_cash == 0 and cohort:
        cash_gp = sum(x['sizedPnl'] for x in cohort if x['sizedPnl'] > 0)
        cash_gl = -sum(x['sizedPnl'] for x in cohort if x['sizedPnl'] < 0)
        if finite(cash_gp) and finite(cash_gl):
            for key,value in (('cashGp',cash_gp),('cashGl',cash_gl),('cashNet',cash_gp-cash_gl)):
                if not finite(group.get(key)) or not math.isclose(group[key],value,rel_tol=1e-10,abs_tol=1e-12):
                    raise ValueError(f'Same-slice cash aggregate mismatch: {key}')
            if cash_gl > 0 and (not finite(group.get('cashPfDiagnostic')) or not math.isclose(group['cashPfDiagnostic'],cash_gp/cash_gl,rel_tol=1e-10,abs_tol=1e-12)):
                raise ValueError('Same-slice cash PF diagnostic mismatch')
    elif unknown_cash and any(group.get(k) is not None for k in ('cashGp','cashGl','cashNet','cashPfDiagnostic')):
        raise ValueError('Unknown cash sample cannot expose a known-only numeric aggregate')
    return cohort


def return_view(group, cash=False, funded=True):
    n = group.get('n', 0)
    unknown = group.get('unknownSizedPnl', 0) if cash else sum(group.get(k, 0) for k in ('unknownReturns', 'unknownReturnTotals')) + (group.get('unknownAllocations',0) if funded else 0)
    gp, gl = (group.get('cashGp'), group.get('cashGl')) if cash else (group.get('gp'), group.get('gl'))
    score = group.get('cashPfDiagnostic') if cash else group.get('pf')
    if not n:
        return {'status': 'empty', 'exactPf': None, 'display': 'Empty', 'score': None, 'noLoss': None}
    if unknown or not finite(gp) or not finite(gl) or gp < 0 or gl < 0:
        return {'status': 'unknown', 'exactPf': None, 'display': 'Unavailable', 'score': None, 'noLoss': None}
    if gl > 0:
        value = gp / gl
        if not finite(value):
            return {'status': 'unknown', 'exactPf': None, 'display': 'Unavailable', 'score': None, 'noLoss': None}
        if not cash and (not finite(score) or not math.isclose(value, score, rel_tol=1e-10, abs_tol=1e-12)):
            raise ValueError('Primary return PF disagrees with exact gross sums')
        return {'status': 'measured', 'exactPf': value, 'display': f'{value:.6f}', 'score': score, 'noLoss': False}
    if gp > 0:
        return {'status': 'no-loss', 'exactPf': None, 'display': 'No losses', 'score': score, 'noLoss': True}
    return {'status': 'flat', 'exactPf': None, 'display': 'Flat (no finite ratio)' if cash else 'Flat (score 0)', 'score': score, 'noLoss': False}


def group_columns(prefix, group, funded=True):
    names={'pf':'source_engine_return_score','exactPf':'source_exact_return_pf'}
    result = {prefix + names.get(k,k): group.get(k, 0) if k in COUNT_FIELDS else v for k, v in group.items()}
    for key in COUNT_FIELDS:
        result.setdefault(prefix + key, group.get(key, 0))
    view, cash = return_view(group,funded=funded), return_view(group,cash=True,funded=funded)
    result.update({prefix + 'return_pf_status': view['status'], prefix + 'measured_return_pf': view['exactPf'],
                   prefix + 'engine_return_score': view['score'], prefix + 'return_pf_display': view['display'],
                   prefix + 'cash_pf_status_diagnostic': cash['status'], prefix + 'measured_cash_pf_diagnostic': cash['exactPf']})
    return result


def scalar_columns(prefix, value):
    return {prefix + k: v if not isinstance(v, (dict, list)) else canonical(v) for k, v in value.items()}


def activity(rows, mult_key='mult', legs_key='blockLegs', volume_key='volume'):
    mults = [x[mult_key] for x in rows if finite(x.get(mult_key)) and x[mult_key] > 0]
    volumes = [x[volume_key] for x in rows if finite(x.get(volume_key)) and x[volume_key] > 0]
    levels = collections.Counter(str(x.get('level')) if finite(x.get('level')) else 'unrecorded' for x in rows)
    source_counts, source_weights = collections.Counter(), collections.Counter()
    missing_legs = 0
    for row in rows:
        legs = row.get(legs_key)
        if not isinstance(legs, dict) or any(not finite(x) or x < 0 for x in legs.values()):
            missing_legs += 1
            continue
        for source, weight in legs.items():
            if weight > 0:
                source_counts[source] += 1
                source_weights[source] += weight
    return {'records': len(rows), 'externallyRaisedRecords': sum(x > 1 for x in mults),
            'unknownExternalMult': len(rows) - len(mults), 'maxExternalMult': max(mults, default=None),
            'unknownActualVolume': len(rows) - len(volumes), 'maxActualVolume': max(volumes, default=None),
            'unrecordedCoordinationMult': sum(not finite(x.get('coordinationMult')) for x in rows),
            'unrecordedSourceLegRows': missing_legs, 'positiveSourceLegRecordCounts': dict(source_counts),
            'positiveSourceLegWeightSums': dict(source_weights), 'recordedLevelHistogram': dict(levels)}


def endpoint_activity(evidence):
    allocations = evidence.get('endpoints', {}).get('allocations', [])
    indexed = {}
    for row in allocations:
        key = entry_identity(row)
        if key in indexed:
            raise ValueError('Duplicate endpoint allocation identity')
        indexed[key] = row
    planned = evidence.get('endpoints', {}).get('planned', [])
    enriched = []
    seen_planned=set()
    for row in planned:
        identity=entry_identity(row)
        if identity in seen_planned:
            raise ValueError('Duplicate planned endpoint identity')
        seen_planned.add(identity)
        allocation = indexed.get(identity, {})
        amount = allocation.get('allocatedNotional')
        enriched.append(dict(row) | {'volume': allocation.get('volume'),
                        'coordinationMult':row.get('coordVol'),
                        'allocation': 'positive' if finite(amount) and amount > MODEL_NOTIONAL_EPS_USD else 'zero' if finite(amount) and 0 <= amount <= MODEL_NOTIONAL_EPS_USD else 'unknown'})
    if set(indexed)-seen_planned:
        raise ValueError('Endpoint allocation without a matching planned mark')
    return {'virtual': activity(enriched, legs_key='legs'),
            'funded': activity([x for x in enriched if x['allocation'] == 'positive'], legs_key='legs'),
            'zero': sum(x['allocation'] == 'zero' for x in enriched),
            'unknown': sum(x['allocation'] == 'unknown' for x in enriched)}


def neutralization(rows, baseline):
    current = {close_identity(x): x for x in rows}
    off = {close_identity(x): x for x in baseline}
    common = set(current) & set(off)
    allocated, cash, units, unknown = [], [], 0, 0
    for key in common:
        a, b = current[key], off[key]
        if all(finite(x.get(k)) for x in (a, b) for k in ('allocatedNotional', 'sizedPnl')):
            allocated.append(abs(a['allocatedNotional'] - b['allocatedNotional']))
            cash.append(abs(a['sizedPnl'] - b['sizedPnl']))
        else:
            unknown += 1
        if finite(a.get('unitNotional')) and finite(b.get('unitNotional')) and abs(a['unitNotional'] - b['unitNotional']) > 1e-12:
            units += 1
    return {'matchedVirtualCloseSlices': len(common), 'sameCanonicalSettledSet': set(current) == set(off) if current or off else None,
            'unknownMatchedAllocationOrCash': unknown,
            'maxAbsAllocatedTotalUsdDifferenceVsOff': max(allocated, default=None),
            'maxAbsSizedPnlUsdDifferenceVsOff': max(cash, default=None),
            'differentUnitNotionalRowsVsOff': units,
            'neutralizedWithin1eMinus9Usd': bool(common) and set(current) == set(off) and unknown == 0 and
                max(allocated, default=math.inf) <= 1e-9 and max(cash, default=math.inf) <= 1e-9}


def validate_capture_and_policy(comparison,protocol):
    fold_ids={x['id'] for x in protocol['folds']};arm_ids={x['id'] for x in protocol['arms']}
    results=comparison.get('results',[])
    if len(results)!=len(fold_ids) or {x.get('fold') for x in results}!=fold_ids:
        raise ValueError('Comparison capture inventory is incomplete or duplicated')
    capture={}
    for fold in results:
        engine=fold.get('engine',{})
        if fold.get('complete') is not True or engine.get('exitCode')!=0 or engine.get('signal') is not None or engine.get('timedOut') is not False:
            raise ValueError('Native fold capture is incomplete or failed')
        ars=fold.get('arms',[])
        if len(ars)!=len(arm_ids) or {x.get('arm') for x in ars}!=arm_ids:
            raise ValueError('Per-fold arm capture inventory is incomplete or duplicated')
        for arm in ars:
            render=arm.get('render',{})
            if arm.get('complete') is not True or render.get('exitCode') not in (0,1) or render.get('signal') is not None or render.get('timedOut') is not False:
                raise ValueError('Native arm report capture did not finish')
            if arm.get('allNativeChecksPassed') is not (len(arm.get('failedChecks',[]))==0):
                raise ValueError('Native check status disagrees with failed-check inventory')
            capture[(fold['fold'],arm['arm'])]=arm
    if comparison.get('allNativeChecksPassed') is not all(x.get('allNativeChecksPassed') is True for x in capture.values()):
        raise ValueError('Top native-check summary disagrees with completed captures')
    performance=comparison.get('performance',{})
    if performance.get('policy')!=protocol.get('performancePolicy'):
        raise ValueError('Retrospective policy differs from frozen protocol')
    policy_rows={(x['fold'],x['arm']):x for x in performance.get('rows',[])}
    expected={(fid,aid) for fid in fold_ids for aid in arm_ids if aid!='off'}
    if len(policy_rows)!=len(performance.get('rows',[])) or set(policy_rows)!=expected:
        raise ValueError('Policy must retain exactly18 candidate fold/arm rows')
    for row in policy_rows.values():
        checks=row.get('checks',[])
        failed=[x for x in checks if x.get('ok') is not True]
        if not checks or row.get('failedChecks')!=failed or row.get('retrospectivePolicyPassed') is not (len(failed)==0):
            raise ValueError('Per-arm policy status disagrees with explicit checks')
    summaries=performance.get('arms',[])
    if len(summaries)!=len(arm_ids)-1 or {x.get('arm') for x in summaries}!=arm_ids-{'off'}:
        raise ValueError('Policy arm summaries must retain exactly9 candidates')
    derived=[]
    for summary in summaries:
        aid=summary['arm'];passes=all(policy_rows[(fid,aid)].get('retrospectivePolicyPassed') is True for fid in fold_ids)
        if summary.get('folds')!=len(fold_ids) or summary.get('passesEveryDeclaredFold') is not passes:
            raise ValueError('Policy headline summary disagrees with current per-fold evidence')
        derived.append({'arm':aid,'folds':len(fold_ids),'passesEveryDeclaredFold':passes})
    return capture,policy_rows,derived


def validate_settings(evidence,frozen,protocol,arm,fold):
    expected=dict(protocol['actualSettings']['block'])
    expected.update({k:arm[k] for k in ('mode','ratio','maxMult','steps')})
    expected.pop('sharedRatio',None)
    if 'sharedRatio' in arm:
        expected['sharedRatio']=arm['sharedRatio']
    actual=evidence.get('settings',{})
    toggles=dict(protocol['actualSettings']['toggles'])|{'block':arm['block'],'blockActive':arm['active']}
    if actual.get('block')!=expected or actual.get('toggles')!=toggles or actual.get('cost')!=protocol['actualSettings']['cost']:
        raise ValueError('Per-arm Block, toggle or cost settings differ from frozen protocol')
    allocation=actual.get('allocation',{});book=protocol.get('book',{})
    for actual_key,protocol_key in (('balance','balance'),('leverage','leverage'),('pct','pct'),('sizingMode','sizing')):
        if allocation.get(actual_key)!=book.get(protocol_key):
            raise ValueError('Per-arm capital/sizing settings differ from frozen protocol')
    if frozen.get('arm')!=arm or frozen.get('fold')!=fold['id'] or frozen.get('schema')!=protocol.get('schema') or frozen.get('symbols')!=protocol.get('symbols') or frozen.get('actualSettingsVerifiedBeforeCompute') is not True or frozen.get('liveOrders') is not False or frozen.get('prospectiveEvidence') is not False:
        raise ValueError('Nested frozen capture identity/settings verification mismatch')
    if not isinstance(frozen.get('nativeDigest'),str) or frozen.get('nativeDigest')!=frozen.get('replayDigest'):
        raise ValueError('Native baseline replay digest does not match captured baseline')


def validate_release_status(value,checkpoint,access,inputs):
    if value.get('schema')!='cts-overall-block-release-status-v1' or value.get('sourceCheckpoint')!=checkpoint:
        raise ValueError('Release status must identify the exact final source checkpoint')
    required={'scripts-broad','platform','lint','production-build','production-ui','full-core-regular','full-core-slow','x02-vst-venue'}
    checks=value.get('checks',[])
    if len(checks)!=len(required) or {x.get('id') for x in checks}!=required:
        raise ValueError('Release status must retain every pending/completed/blocked verification stage')
    for check in checks:
        status=check.get('status')
        if status not in {'pending','running','passed','failed','blocked','not-run'}:
            raise ValueError('Unrecognized release verification status')
        for key in ('passed','failed','skipped','warnings'):
            n=check.get(key)
            if n is not None and (type(n) is not int or n<0):
                raise ValueError('Release verification counts must be nonnegative integers or unavailable')
        if status in {'pending','running','blocked','not-run'} and any(check.get(k) is not None for k in ('passed','failed','skipped')):
            raise ValueError('Pending/blocked verification cannot be presented as a completed numeric test run')
        if status=='passed' and check.get('failed')!=0:
            raise ValueError('Passed verification requires explicit zero failures')
        if status=='passed' and check['id'] in {'full-core-regular','full-core-slow'} and (type(check.get('passed')) is not int or check['passed']<=0 or type(check.get('skipped')) is not int):
            raise ValueError('Passed core verification requires actual dynamic pass/skip counts, never assumed suite totals')
        if status in {'passed','failed'} and not check.get('evidence'):
            raise ValueError('Completed release verification needs an explicit evidence reference')
        for evidence in check.get('evidence',[]):
            path=Path(evidence['path']).absolute()
            before=fingerprint(path)
            digest=sha_file(path)
            if evidence.get('sha256')!=digest or fingerprint(path)!=before:
                raise ValueError('Release evidence hash changed or mismatched')
            inputs.rows[str(path)]={'path':str(path),'bytes':before[2],'sha256':digest,
                'classification':'sanitized-release-verification-reference','_fingerprint':before}
        if check['id']=='x02-vst-venue' and access['namedConnection'].get('actualAuthenticatedAccountVerified') is not True and status!='blocked':
            raise ValueError('Unauthenticated X02 venue stage must remain explicitly blocked')


def validate_source_ancestry(reference,inputs,integration_ids,integration_paths):
    def manifest_ref(value):
        if not isinstance(value,dict) or set(value)!={'path','sha256','checkpoint'} or not isinstance(value.get('path'),str) or not Path(value['path']).is_absolute() or not isinstance(value.get('sha256'),str) or not re.fullmatch(r'[a-f0-9]{64}',value['sha256']) or not isinstance(value.get('checkpoint'),str) or not re.fullmatch(r'[a-f0-9]{40}',value['checkpoint']):
            raise ValueError('Ancestry references require exact absolute path, SHA256 and checkpoint fields')
        return dict(value)

    def read_manifest(ref,required_paths):
        path=Path(ref['path']).absolute()
        if fingerprint(path)[2]>1_000_000:
            raise ValueError('Ancestry manifest exceeds the source-free metadata size limit')
        value=inputs.load(path,'historical-source-ancestry-manifest; not current study proof')
        if inputs.rows[str(path)]['sha256']!=ref['sha256'] or value.get('checkpoint')!=ref['checkpoint'] or not isinstance(value.get('tree'),str) or not re.fullmatch(r'[a-f0-9]{40}',value['tree']):
            raise ValueError('Ancestry manifest hash/checkpoint/tree metadata mismatch')
        files=value.get('files')
        if not isinstance(files,dict) or any(not isinstance(name,str) or Path(name).is_absolute() or '..' in Path(name).parts or not isinstance(sha,str) or not re.fullmatch(r'[a-f0-9]{64}',sha) for name,sha in files.items()) or any(name not in files for name in required_paths):
            raise ValueError('Ancestry source-file bindings are malformed or omit mandatory paths')
        return value

    history=reference.get('integratedAncestry')
    if not isinstance(history,dict) or set(history)!={'cp8Manifest','sourceParents'}:
        raise ValueError('Final v3 requires the CP8 base and ordered sourceParents chain')
    base=manifest_ref(history['cp8Manifest'])
    if base['checkpoint']!=CP8_ANCESTOR_CHECKPOINT or base['sha256']!=CP8_ANCESTOR_MANIFEST_SHA:
        raise ValueError('Ancestry must retain the exact historical CP8 integrated-main manifest')
    cp8=read_manifest(base,[name for name in integration_paths if name!='src/core/server/pool.server.ts'])
    if cp8.get('schema')!='cts-overall-block-final-integrated-source-v1' or cp8.get('parents')!=CP8_ANCESTOR_PARENTS or cp8.get('economicIdentityAssumed') is not False or cp8.get('integrationChanges')!=integration_ids[:5]:
        raise ValueError('Historical CP8 ordered CP7/main merge ancestry or retained contracts disagree')
    chain=history['sourceParents']
    if not isinstance(chain,list) or not chain or len(chain)>64:
        raise ValueError('Final v3 requires a bounded nonempty oldest-to-newest sourceParents chain')
    chain=[manifest_ref(value) for value in chain]
    if chain[0]['checkpoint']!=CP9_ANCESTOR_CHECKPOINT or chain[0]['sha256']!=CP9_ANCESTOR_MANIFEST_SHA:
        raise ValueError('The first source parent must be the exact immutable CP9 v2 manifest')
    current=reference.get('checkpoint')
    if not isinstance(current,str) or not re.fullmatch(r'[a-f0-9]{40}',current) or current==base['checkpoint'] or not isinstance(reference.get('tree'),str) or not re.fullmatch(r'[a-f0-9]{40}',reference['tree']):
        raise ValueError('Final source checkpoint/tree metadata is invalid')
    seen={base['checkpoint'],current};previous=base['checkpoint'];verified=[];manifests=[cp8]
    for index,ref in enumerate(chain):
        if ref['checkpoint'] in seen:
            raise ValueError('Source ancestry contains a repeated/cyclic checkpoint or final self-reference')
        seen.add(ref['checkpoint']);ancestor=read_manifest(ref,integration_paths)
        schema='cts-overall-block-final-integrated-source-v2' if index==0 else 'cts-overall-block-final-integrated-source-v3'
        ancestry=ancestor.get('integratedAncestry');ids=ancestor.get('integrationChanges')
        expected_keys={'cp8Manifest'} if index==0 else {'cp8Manifest','sourceParents'}
        if ancestor.get('schema')!=schema or ancestor.get('parents')!=[previous] or ancestor.get('economicIdentityAssumed') is not False or not isinstance(ancestry,dict) or set(ancestry)!=expected_keys or ancestry.get('cp8Manifest')!=base or ancestry.get('sourceParents',[])!=chain[:index] or not isinstance(ids,list) or len(ids)<7 or ids!=integration_ids[:len(ids)] or (index==0 and len(ids)!=7):
            raise ValueError('Ancestor schema, actual parent, base, chain prefix or integration prefix disagrees')
        verified.append(dict(ref)|{'schema':schema,'tree':ancestor['tree'],'parents':ancestor['parents'],
            'baseReference':ancestry['cp8Manifest'],'declaredSourceParents':ancestry.get('sourceParents',[]),'integrationChanges':ids})
        previous=ref['checkpoint'];manifests.append(ancestor)
    if reference.get('parents')!=[previous]:
        raise ValueError('Final source must have the actual last source-chain checkpoint as its single direct parent')
    focused=[];focus_seen=set()
    for ancestor in manifests:
        proofs=ancestor.get('focusedEvidence')
        if not isinstance(proofs,list):
            raise ValueError('Historical focused references must remain explicit source-free metadata')
        for proof in proofs:
            if not isinstance(proof,dict) or not isinstance(proof.get('path'),str) or not Path(proof['path']).is_absolute() or not isinstance(proof.get('sha256'),str) or not re.fullmatch(r'[a-f0-9]{64}',proof['sha256']):
                raise ValueError('Malformed historical focused evidence reference')
            key=(proof['path'],proof['sha256'])
            if key not in focus_seen:
                focused.append({'path':proof['path'],'sha256':proof['sha256'],'sourceCheckpoint':ancestor['checkpoint']});focus_seen.add(key)
    return ({'cp8Manifest':base|{'schema':cp8['schema'],'tree':cp8['tree'],'parents':cp8['parents']},
             'sourceParents':verified,'checkpointChainVerified':True,'treeShaUniquenessRequired':False},focused)


def validate_direction_history_repair(reference,study_freeze,path,inputs):
    production=('src/core/sim/walkforward.ts','src/core/server/runtime.server.ts','src/core/audit.ts')
    integration_scope=production+('src/core/server/live.server.ts','src/core/domain/types.ts','src/core/sim/block.ts','package-lock.json','src/core/server/pool.server.ts')
    changes={
        'independent-candidate-direction-history':'The retained CP7 repair gives sideGateN its own causal all-candidate direction history, separate from accepted-order Block learning.',
        'sparse-cumulative-fill-fee-provenance':'Sparse same-cumulative-quantity and same-price polls retain an already measured commission, including confirmed zero; changed quantity or price without a new commission remains unknown.',
        'opt-in-causal-block-source-trace':'Opt-in causal Block source traces retain admission and source diagnostics; trace metadata does not qualify a strategy or change default trading behavior.',
        'conservative-six-decimal-block-recording':'Six-decimal recorded Block additions never round above the requested addition.',
        'merged-main-PR139-history':'Main PR139 history is retained through the hashed CP8 two-parent merge ancestry and verified single-parent checkpoint chain. Historical focused contracts remain distinct from final broad, UI, core and venue stages.',
        'backtest-rerun-eligibility':'A finished backtest ID can be queued again while genuinely running IDs retain concurrency exclusion.',
        'scoped-backtest-cancellation':'Runtime disposal cancels its scoped backtest worker calls and fallback, prevents late result publication and clears queued work; unrelated pool clients remain separate.',
        'preset-edit-result-invalidation':'Editing preset inputs invalidates its previously completed result; a later backtest recomputes for the edited preset.',
    }
    declared=reference.get('integrationChanges')
    if reference.get('schema')!='cts-overall-block-final-integrated-source-v3' or reference.get('checkpoint')!=study_freeze.get('checkpoint') or reference.get('economicIdentityAssumed') is not False or declared!=list(changes):
        raise ValueError('Final integrated-source narrative requires the exact source-bound CP10 v3 ordered contract manifest without an economic-identity assumption')
    ancestry,historical=validate_source_ancestry(reference,inputs,list(changes),integration_scope)
    expected=reference.get('files',{})
    sealed={x.get('path'):x.get('sha256') for x in study_freeze.get('files',[]) if isinstance(x,dict)}
    if not isinstance(expected,dict) or any(not isinstance(name,str) or Path(name).is_absolute() or '..' in Path(name).parts or not isinstance(sha,str) or not re.fullmatch(r'[a-f0-9]{64}',sha) for name,sha in expected.items()) or any(name not in expected or sealed.get(name)!=expected[name] for name in integration_scope) or any(name in sealed and sealed[name]!=sha for name,sha in expected.items()):
        raise ValueError('Production direction-history narrative is not bound to the final study seal; supply the final repair manifest and rerun evidence')
    focused=[]
    old_proofs={(proof['path'],proof['sha256']) for proof in historical}
    proofs=reference.get('focusedEvidence')
    if not isinstance(proofs,list) or not proofs:
        raise ValueError('Final integrated-source narrative requires explicit focused evidence references')
    for proof in proofs:
        if not isinstance(proof,dict) or not isinstance(proof.get('path'),str) or not isinstance(proof.get('sha256'),str) or not re.fullmatch(r'[a-f0-9]{64}',proof['sha256']):
            raise ValueError('Malformed final integration focused evidence reference')
        if (proof['path'],proof['sha256']) in old_proofs or proof['sha256'] in {row['sha256'] for row in historical}:
            continue
        evidence=Path(proof['path']).absolute()
        if evidence.parent!=Path('/tmp') or evidence.suffix not in {'.json','.log','.sha256'}:
            raise ValueError('Focused integration evidence must reference a sanitized local metadata/log/hash file')
        before=fingerprint(evidence)
        digest=sha_file(evidence)
        if digest!=proof['sha256'] or fingerprint(evidence)!=before:
            raise ValueError('Focused integration evidence changed or mismatched its final manifest')
        inputs.rows[str(evidence)]={'path':str(evidence),'bytes':before[2],'sha256':digest,
            'classification':'source-free-focused-contract-reference; not final full-suite or venue proof','_fingerprint':before}
        focused.append({'path':str(evidence),'bytes':before[2],'sha256':digest})
    if not focused or not any(Path(proof['path']).suffix=='.json' for proof in focused):
        raise ValueError('Fresh hashed CP10 preset-edit proof is required; ancestor focused references are insufficient')
    return {'changeClass':'final-source-integration-and-lifecycle-repair','reference':str(path),
        'manifestSchema':reference['schema'],
        'productionFileSha256':{name:expected[name] for name in production},'boundToStudySourceSeal':True,
        'sealedIntegrationFileSha256':{name:expected[name] for name in integration_scope},
        'sourceCheckpoint':reference['checkpoint'],'tree':reference['tree'],'parents':reference['parents'],
        'integratedAncestry':ancestry,
        'historicalFocusedEvidence':historical,'historicalFocusedEvidenceScope':'Ancestor checkpoint contracts only; not final CP10 study or suite proof; overlapping scopes are not additive',
        'currentStudyEvidence':reference.get('studyEvidence'),
        'integrationChanges':[{'id':name,'contract':changes[name]} for name in declared],
        'focusedEvidence':focused,'focusedEvidenceEstablishesFinalSuiteOrVenuePass':False,
        'candidateDirectionHistory':'independent all-candidate history for sideGateN',
        'blockLearningHistory':'settled accepted orders only',
        'priorEconomicIdentityAssumed':False}


def validate_study_boundaries(protocol,comparison,freeze,rows,audit,proof,run,inputs,audit_path,proof_path):
    for value,checkpoint_key in ((audit,'checkpoint'),(proof,'sourceCheckpoint')):
        if value.get(checkpoint_key)!=freeze.get('checkpoint') or value.get('sourceSha256')!=freeze.get('sourceSha256') or value.get('protocolSha256')!=freeze.get('protocolSha256'):
            raise ValueError('Study boundary metadata does not match the final source/protocol')
    if audit.get('schema')!='cts-block-independent-cp10-final-review-v1' or audit.get('passed') is not True or audit.get('findings') or audit.get('releaseBlockers') or audit.get('noPromotion') is not True or proof.get('schema')!='cts-block-cp10-parameter-source-and-summary-proof-v1':
        raise ValueError('Final narrative requires the reviewed independent accounting and parameter boundary proofs')
    artifacts={row.get('path'):row.get('sha256') for row in audit.get('artifacts',[]) if isinstance(row,dict)}
    for name in ('protocol.json','source-freeze.json','comparison.json'):
        reference=inputs.rows.get(str((run/name).absolute()))
        if reference is None or artifacts.get(name)!=reference['sha256']:
            raise ValueError('Boundary audit is not bound to the actual protocol/freeze/comparison bytes')
    captures=[arm for fold in comparison['results'] for arm in fold['arms']]
    failures=collections.Counter(check.get('name') for arm in captures for check in arm.get('failedChecks',[]) if check.get('ok') is not True)
    signal_name='execution: signals executed orders'
    signal_missing=sum(any(check.get('name')==signal_name and check.get('actual')==0 and check.get('expected')==1 and check.get('ok') is False for check in arm.get('failedChecks',[])) for arm in captures)
    if len(captures)!=len(rows) or signal_missing!=len(captures) or dict(failures)!=audit.get('nativeFailedCheckOccurrences'):
        raise ValueError('Signal activity boundary differs from the reviewed native capture checks')
    assessment=audit.get('prespecifiedPolicyAssessment',{})
    reasons=assessment.get('observedReasons') if isinstance(assessment,dict) else None
    if not isinstance(assessment,dict) or assessment.get('noLivePromotion') is not True or audit.get('passingProfiles')!=[] or assessment.get('passingProfiles')!=[] or not isinstance(reasons,list) or not reasons or any(not isinstance(reason,str) or not reason.strip() for reason in reasons):
        raise ValueError('Independent range-qualification limitation is not established by the current audit')
    range_failures={}
    for kind in ('mc','mn','sh'):
        counts={}
        for field,name in (('coverage',f'coverage: range {kind} has config sets'),('execution',f'execution: range {kind} executed orders')):
            count=failures.get(name)
            audited=audit['nativeFailedCheckOccurrences'].get(name)
            if type(count) is not int or type(audited) is not int or count!=audited or not 0<count<=len(captures):
                raise ValueError('Independent range-qualification inference lacks audited coverage/activity failures')
            counts[field]=count
        range_failures[kind]=counts
    qualification={'classification':'inference from audited native checks and policy assessment',
        'statement':'This study does not establish independent Micro, Minimum and Short range qualification systemwide.',
        'basis':'Required config-coverage and execution-activity checks failed for each named range in at least one audited capture, and no profile passed the prespecified policy across both folds. This does not establish that every configuration loses; the minimum sample rule applies to each full arm per fold, not separately to each range.',
        'captureCount':len(captures),'rangeFailures':range_failures,'auditedObservedReasons':reasons,
        'auditNoLivePromotion':assessment['noLivePromotion'],'auditPassingProfiles':audit['passingProfiles'],'assessmentPassingProfiles':assessment['passingProfiles']}
    book=protocol.get('book',{})
    if book.get('sizing')!='equityPct' or any(not finite(book.get(key)) or book[key]<=0 for key in ('balance','pct','leverage')):
        raise ValueError('Modeled account narrative requires the actual positive equity-percentage book parameters')
    live=protocol.get('actualSettings',{}).get('live',{})
    if any(finite(live.get(key)) and live[key]>0 for key in ('maxPositionX','maxExposureX')):
        raise ValueError('Positive selected live caps contradict the reviewed x01 fallback-cap boundary')
    cap_shapes=[{key:row['risk'].get('caps',{}).get(key) for key in ('on','maxPositionX','maxExposureX','source')} for row in rows]
    caps=cap_shapes[0] if cap_shapes else {}
    if not cap_shapes or any(shape!=caps for shape in cap_shapes) or caps.get('on') is not True or any(not finite(caps.get(key)) or caps[key]<=0 for key in ('maxPositionX','maxExposureX')) or caps.get('source')!='x01 defaults (no live caps in the settings)':
        raise ValueError('Per-arm cap limits/source do not support the x01 fallback-cap narrative')
    wf=protocol.get('actualWf',{})
    side=wf.get('sideGateN');trace=wf.get('blockTrace')
    effective_side=0 if side is None else side
    effective_trace=False if trace is None else trace
    context=proof.get('directionAndTraceContext',{});audited_context=audit.get('frozenFeatureContext',{})
    if effective_side!=0 or type(effective_trace) is not bool or effective_trace is not False or context.get('effectiveSideGateN')!=effective_side or context.get('effectiveBlockTrace') is not effective_trace or context.get('actualWfSha256')!=protocol.get('actualWfSha256') or audited_context.get('sideGateN')!=effective_side or audited_context.get('blockTrace') is not effective_trace:
        raise ValueError('Frozen feature context does not support inactive direction-gate/trace disclosure')
    minute=audit.get('recomputedMinuteMethod',{})
    if minute.get('rawNativeRiskScalarsIndependentlyReproduced') is not True or 'Minute-close modeling, not wick/tick liquidation execution' not in str(minute.get('limitation','')):
        raise ValueError('Minute-close risk limitation is not supported by the current independent audit')
    return {'classification':'modeled-Engine-cohort; Signal execution not established',
        'auditSchema':audit['schema'],'parameterProofSchema':proof['schema'],
        'auditReference':str(audit_path),'auditSha256':inputs.rows[str(Path(audit_path).absolute())]['sha256'],
        'parameterProofReference':str(proof_path),'parameterProofSha256':inputs.rows[str(Path(proof_path).absolute())]['sha256'],
        'modelAccount':{'balance':book['balance'],'sizingMode':book['sizing'],'equityPct':book['pct'],'leverage':book['leverage'],'source':'frozen protocol.book; not actual venue funding','selectedLiveCapsPositive':False,'caps':caps},
        'signalActivity':{'captureCount':len(captures),'failedCaptureCount':signal_missing,'nativeCheck':signal_name,'established':False},
        'independentMicroMinimumShortQualificationEstablished':False,'qualificationInference':qualification,
        'risk':{'method':'minute-close marked model','excludes':['wick/tick extremes','liquidation execution','measured venue fees/funding'],'auditLimitation':minute['limitation']},
        'frozenFeatures':{'sideGateN':effective_side,'blockTrace':effective_trace,'enabledPathsPerformanceEstablished':False,'focusedSoftwareTestsAreSeparate':True}}


def utc(value):
    return dt.datetime.fromtimestamp(value / 1000, dt.timezone.utc).isoformat().replace('+00:00', 'Z') if finite(value) else ''


def csv_bytes(rows):
    fields = list(dict.fromkeys(key for row in rows for key in row))
    file = io.StringIO(newline='')
    writer = csv.DictWriter(file, fieldnames=fields, lineterminator='\n')
    writer.writeheader()
    for row in rows:
        safe = {}
        for key in fields:
            value = row.get(key)
            if isinstance(value, (list, dict)):
                value = canonical(value)
            if isinstance(value, str) and value.startswith(('=', '+', '-', '@', '\t', '\r')):
                value = "'" + value
            safe[key] = value
        writer.writerow(safe)
    return file.getvalue().encode('utf-8')


def table(headers, rows, classes=''):
    return '<div class="table-wrap"><table class="' + classes + '"><thead><tr>' + ''.join('<th>' + html.escape(str(x)) + '</th>' for x in headers) + '</tr></thead><tbody>' + ''.join('<tr>' + ''.join('<td>' + x + '</td>' for x in row) + '</tr>' for row in rows) + '</tbody></table></div>'


def text(value):
    return html.escape(str(value)) if value is not None else '<span class="muted">Unavailable</span>'


def numeric(value, places=6, percentage=False):
    if not finite(value):
        return '<span class="muted">Unavailable</span>'
    shown = value * 100 if percentage else value
    return f'<span title="{html.escape(repr(value))}">{shown:.{places}f}{"%" if percentage else ""}</span>'


def pf_html(group, cash=False):
    view = return_view(group, cash)
    style = 'bad' if view['status'] == 'measured' and view['exactPf'] < 1 else 'muted' if view['status'] in {'empty', 'unknown'} else ''
    return f'<span class="{style}" title="{html.escape(canonical(view))}">{view["display"]}</span>'


def render_html(payload, exports):
    rows, hours = payload['rows'], payload['hours']
    comparison_rows = []
    for row in rows:
        f, v, risk, sides = row['funded'], row['virtual'], row['risk'], row['sides']
        comparison_rows.append([text(row['fold']), text(row['arm']), text(f.get('n', 0)), text(v.get('n', 0)),
            text(f.get('zeroAllocations', 0)), text(f.get('unknownAllocations', 0)), text(f.get('unknownReturns', 0)),
            pf_html(f), pf_html(f, True), numeric(f.get('cashNet')),
            text(sides['long'].get('n', 0)), pf_html(sides['long']), text(sides['short'].get('n', 0)), pf_html(sides['short']),
            numeric(risk.get('equityMaxDrawdownUsd')), numeric(risk.get('equityMaxDrawdownFraction'), percentage=True),
            numeric(risk.get('equityDdtMaxH')), numeric(row['book'].get('balanceEnd')), numeric(row['book'].get('equityEnd')),
            text(row['activity']['funded']['externallyRaisedRecords']), text(row['activity']['virtual']['externallyRaisedRecords']),
            text(row['policyStatus']), text(', '.join(row['failedPolicyChecks']) or 'None recorded')])
    hourly_rows = []
    for row in hours:
        f, v, b = row['funded'], row['virtual'], row['book']
        hourly_rows.append([text(row['fold']), text(row['arm']), text(utc(row['startT'])), text(f.get('n', 0)),
            text(v.get('n', 0)), text(f.get('zeroAllocations', 0)), text(f.get('unknownAllocations', 0)),
            text(f.get('unknownReturns', 0)), pf_html(f), pf_html(f, True), numeric(f.get('cashNet')),
            numeric(b.get('balance')), numeric(b.get('equity')), numeric(b.get('ddMaxHourPct'), percentage=True),
            numeric(b.get('maxDdPctSoFar'), percentage=True), numeric(b.get('marginMax'))])
    activity_rows = []
    for row in rows:
        a, n, stack, caps = row['activity'], row['neutralization'], row['risk'].get('stack', {}), row['risk'].get('caps', {})
        activity_rows.append([text(row['fold']), text(row['arm']), text(row['blockSettings'].get('mode')),
            text(row['blockSettings'].get('historySource')), text(row['armSettings'].get('active')),
            text(a['funded']['externallyRaisedRecords']), text(a['virtual']['externallyRaisedRecords']),
            text(a['funded']['maxExternalMult']), text(a['funded']['maxActualVolume']),
            text(a['funded']['unrecordedCoordinationMult']), text(a['funded']['unrecordedSourceLegRows']),
            text(canonical(a['funded']['positiveSourceLegRecordCounts'])), text(canonical(a['funded']['positiveSourceLegWeightSums'])),
            text(stack.get('knownCapSatisfied')), text(caps.get('capped')), text(caps.get('scaled')),
            text(n['matchedVirtualCloseSlices']), numeric(n['maxAbsAllocatedTotalUsdDifferenceVsOff'], 12),
            numeric(n['maxAbsSizedPnlUsdDifferenceVsOff'], 12), text(n['differentUnitNotionalRowsVsOff']),
            text(n['neutralizedWithin1eMinus9Usd'] if n['matchedVirtualCloseSlices'] else None)])
    matrix = payload['functionality']
    functionality_rows = [[text(r.get('stage')), text(r.get('behavior')), text('; '.join(r.get('tests', []))),
                           text(', '.join(r.get('evidence', []))), text(r.get('limit'))] for r in matrix['rows']]
    baseline = [r for r in rows if r['arm'] == 'off']
    baseline_rows = [[text(r['fold']), text(utc(r['window']['startT']) + ' to ' + utc(r['window']['endT'])),
                     text(r['funded'].get('n', 0)), pf_html(r['funded']),
                     text(r['sides']['long'].get('n', 0)), pf_html(r['sides']['long']),
                     text(r['sides']['short'].get('n', 0)), pf_html(r['sides']['short']),
                     numeric(r['risk'].get('equityMaxDrawdownFraction'), percentage=True)] for r in baseline]
    passes = sum(x.get('passesEveryDeclaredFold') is True for x in payload['performanceArms'])
    downloads = ''.join(f'<button type="button" data-download="{html.escape(name)}">Download {html.escape(name)}</button>' for name in exports)
    encoded = canonical({name: base64.b64encode(data).decode('ascii') for name, data in exports.items()})
    access = payload['access']
    access_status = 'Blocked / unverified' if access['namedConnection'].get('actualAuthenticatedAccountVerified') is not True else 'Authenticated identity verified; execution status requires separate evidence'
    boundary=payload['studyBoundaries'];account=boundary['modelAccount'];caps=account['caps'];signal=boundary['signalActivity']
    account_note=(f"Modeled initial balance ${account['balance']:,.2f}; each unit uses {account['equityPct']*100:g}% of realized equity at entry, before caps, with {account['leverage']:g}× leverage for margin. "
                  f"x01 fallback caps: {caps['maxPositionX']:g}× equity per symbol/side and {caps['maxExposureX']:g}× gross exposure. The selected study settings contained no positive live caps. These are modeled funds and fallback limits, not verified venue funding or account limits.")
    sources = ''.join('<li><code>' + html.escape(r['path']) + '</code> — ' + str(r['bytes']) + ' bytes; SHA256 <code>' + r['sha256'] + '</code></li>' for r in payload['inputs'])
    evidence_runs = ''.join('<li><strong>' + html.escape(key) + '</strong>: <code>' + html.escape(canonical(value)) + '</code></li>' for key, value in matrix.get('evidence', {}).items())
    archive_links = ''.join('<li>' + (f'<a href="{html.escape(x["href"], quote=True)}">{html.escape(x["path"])}</a>' if x.get('href') else '<code>' + html.escape(x['path']) + '</code>') + '</li>' for x in payload['archivePaths'])
    release_rows=[[text(x['id']),text(x['status']),text(x.get('passed')),text(x.get('failed')),text(x.get('skipped')),
                   text(x.get('warnings')),text('; '.join(e.get('path','') for e in x.get('evidence',[]))),text(x.get('note'))]
                  for x in payload['releaseStatus']['checks']]
    return ('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
        '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'; img-src data:; font-src \'none\'; connect-src \'none\'">'
        '<title>CTS-A-O — ' + ('provisional ' if payload['provisional'] else '') + 'frozen Overall and Block comparison</title><style>'
        ':root{color-scheme:light;--ink:#152333;--muted:#526474;--line:#cbd5df;--navy:#122d46;--paper:#f3f6f9;--bad:#a31d25}*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:14px/1.5 system-ui,sans-serif}header{background:var(--navy);color:white;padding:32px clamp(16px,4vw,56px)}main{max-width:1800px;margin:auto;padding:24px clamp(12px,3vw,48px)}h1{font-size:clamp(25px,4vw,38px);margin:0 0 8px}h2{font-size:21px;margin:30px 0 10px}p{max-width:1100px}a{color:#125985}code{font:12px/1.5 ui-monospace,monospace;overflow-wrap:anywhere}.badge{border:1px solid #7f9aaf;border-radius:4px;padding:3px 8px;display:inline-block;margin:6px 6px 0 0}.notice{border-left:5px solid #b24a16;background:#fff6e9;padding:14px 18px}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px}.card{padding:16px;background:white;border:1px solid var(--line)}.card b{display:block;font-size:25px}.table-wrap{overflow:auto;border:1px solid var(--line);background:white;margin:12px 0}table{border-collapse:collapse;width:100%;font-size:12px}th,td{padding:9px 10px;border-bottom:1px solid #e2e8ee;text-align:left;vertical-align:top}th{position:sticky;top:0;background:#e9eff5;white-space:nowrap;color:#172f43}td{font-variant-numeric:tabular-nums}tbody tr:nth-child(even){background:#f7f9fb}.bad{color:var(--bad);font-weight:700}.muted{color:var(--muted)}button{background:var(--navy);border:0;border-radius:4px;color:white;padding:10px 14px;margin:4px 8px 4px 0;cursor:pointer}details{background:white;border:1px solid var(--line);padding:12px 16px;margin:16px 0}summary{cursor:pointer;font-weight:650}li{margin:5px 0}footer{color:var(--muted);padding:20px 0;font-size:12px}@media print{body{background:white}header{background:white;color:black;padding:12px}main{padding:0}.table-wrap{overflow:visible}table{font-size:8px}th{position:static}button{display:none}details{break-inside:avoid}}</style></head><body>'
        '<header><h1>CTS-A-O · Overall and Block</h1><p>' + html.escape(payload['releaseSnapshotLabel']) + '</p>'
        '<span class="badge">Return PF primary</span><span class="badge">Cash PF diagnostic</span><span class="badge">Modeled Engine cohort</span>'
        '<p>Signal execution not established. No venue execution proof.</p></header><main>'
        '<div class="notice"><strong>' + html.escape(payload['releaseSnapshotLabel']) + '.</strong><br><strong>' + str(passes) + ' Block arms meet the full frozen retrospective policy across both declared folds.</strong> '
        'No live promotion or continuous profitability is established. X02 VST execution tests remain blocked by unavailable authenticated access. '
        'Losses, empty samples and unavailable evidence remain in every table/export.</div>'
        '<p>Two reused six-hour historical windows, with ten declared arms per window. Repeated arms share opportunities; they are not twenty independent market trials. Settings and policy stayed frozen.</p>'
        '<div class="cards"><div class="card"><b>' + str(len(rows)) + '</b>Declared fold × arm rows</div><div class="card"><b>' + str(len(hours)) + '</b>Hourly rows, including empty</div><div class="card"><b>' + str(payload['closeSliceCount']) + '</b>Virtual settled slices retained in CSV</div><div class="card"><b>' + html.escape(access_status) + '</b>X02 VST access</div></div>'
        '<h2>Baseline and direction</h2><p><strong>Modeled account:</strong> ' + html.escape(account_note) + '</p>'
        '<p><strong>Signal activity:</strong> The Signal execution activity check failed in ' + str(signal['failedCaptureCount']) + '/' + str(signal['captureCount']) + ' captures. '
        'The displayed funded closes are a modeled Engine cohort. <strong>Inference:</strong> ' + html.escape(boundary['qualificationInference']['statement']) + '</p>'
        '<p>Off is the baseline. Long and short PF use their own modeled funded settled slices; a winning short sample does not qualify a losing long sample. '
        'Minute-close drawdown excludes wick/tick extremes and liquidation execution.</p>'
        + table(['Fold','UTC window','Modeled Engine funded slices','Return PF','Long slices','Long PF','Short slices','Short PF','Exact modeled minute-close DD'], baseline_rows)
        + '<h2>All twenty comparisons</h2><p>Primary sample = positive-owned modeled funded settled slices plus retained unknown ownership. '
        'Known zero allocations are retained in the virtual/zero columns and all-close CSV, outside primary PF. '
        'Unusable primary returns include unknown ownership as well as missing unit-return basis. '
        'Actual owned entry orders and primary-sample unique entries are separate CSV columns. '
        'A no-loss engine score is a convention (normally 4), shown as “No losses”; empty and unknown are unavailable. '
        'Finite ratios, including genuine 0, are shown directly from unrounded gross returns.</p>'
        + table(['Fold','Arm','Modeled Engine funded n','Virtual n','Zero allocation','Unknown ownership','Unusable primary returns','Return PF','Cash PF diagnostic','Settled cash net USD','Long n','Long PF','Short n','Short PF','Exact DD USD','Exact DD %','Exact DDT h','Balance end USD','Marked equity end USD','Externally raised funded','Externally raised virtual','Frozen policy','Failed policy checks'], comparison_rows)
        + '<p>Return sums are fractions in CSV; unit drawdown is already percentage points. Cash diagnostics are USD on the matching funded settled slices. '
        'Balance/equity endpoints come from native report summaries; exact DD and DDT come from provenance-bound unrounded minute-close marked equity, '
        'including open marks. Minute-close drawdown excludes wick/tick extremes and liquidation execution; venue fees and funding were not measured. Hourly/five-minute curves cannot reconstruct those exact extrema.</p>'
        + '<h2>Hourly detail</h2><p>Close buckets are (start, end] in UTC. Exact hour-end closes belong to the preceding hour. '
        'Return and cash PF below use the matching funded hourly evidence. Equity, margin and hourly DD columns are rounded native display fields, '
        'shown separately from exact full-window risk.</p>'
        + table(['Fold','Arm','Hour start UTC','Funded n','Virtual n','Zero','Unknown ownership','Unusable primary returns','Return PF','Cash PF diagnostic','Cash net USD','Balance USD','Marked equity USD','Hourly DD % (rounded)','DD so far % (rounded)','Margin max USD (rounded)'], hourly_rows)
        + '<h2>External stack activity and allocation caps</h2><p>External mult records Block × coordination; actual volume also includes intrinsic ladder semantics. '
        'Recorded levels are not universally Block levels for Axis/DCA. Missing source legs or coordination multipliers stay unrecorded. '
        'Overall source-leg counts overlap parent orders and cannot be added to close counts. '
        'Neutralization is measured from matching canonical settled identities, total allocated USD and sized P&L; cap counters alone are insufficient. '
        'Empty matches provide no neutralization evidence. The displayed USD comparison tolerance is 1e-9.</p>'
        '<p><strong>Feature scope:</strong> The frozen study has sideGateN=0 and blockTrace=false. Enabled direction-history and trace paths have separate focused software tests; their enabled performance was not tested here.</p>'
        + table(['Fold','Arm','Mode','History source','Active','Externally raised funded','Externally raised virtual','Max external mult','Max actual volume','Unrecorded coordination mult','Unrecorded source legs','Positive source-leg record counts','Source-leg weight sums','Known external cap satisfied','Native zero/capped','Native scaled','Matched virtual slices vs Off','Max allocated-total USD difference','Max cash-P&L USD difference','Different unit notionals','Allocation neutralized within tolerance'], activity_rows)
        + '<p>Endpoint marks are excluded from settled PF. Their virtual/funded/unknown counts and external-stack activity are retained in comparison.csv and report-data.json; marked equity includes their native effect.</p>'
        + '<h2>Complete CSV exports</h2><p>Downloads are embedded in this HTML and work without network access. The same CSV files are also written beside the report. '
        'All-close slices preserve every source row, including losses, zero funding and unknown allocation/return/cash evidence. '
        'They retain canonical identity, original allocation fields, explicit unit return, sized return, external mult, actual volume, source legs, costs/provenance and primary-sample membership. '
        'No endpoint mark is relabeled as a settled close.</p>' + downloads
        + '<h2>Functionality verification matrix</h2><p>Sixteen reviewed areas. Matrix review checkpoint <code>' + html.escape(str(matrix.get('gitHead'))) + '</code>; '
        'review time ' + html.escape(str(matrix.get('createdAt'))) + '. Evidence runs below are separate offline bundles; their counts are not one monolithic release suite.</p>'
        + table(['Area','Verified behavior','Named offline tests','Evidence bundle','Remaining boundary'], functionality_rows)
        + '<details><summary>Offline functionality evidence and limits</summary><ul>' + evidence_runs + '</ul><ul>'
        + ''.join('<li>' + html.escape(str(x)) + '</li>' for x in matrix.get('releaseLimitations', [])) + '</ul></details>'
        + '<h2>Release verification status</h2><p>Completed research capture, offline functionality bundles, broad checks, UI verification, full core tests and venue execution are separate stages. '
        'Research activity and coverage failures remain unresolved when offline software checks pass. Pending, running, blocked and unavailable stages remain explicit. Snapshot time: ' + html.escape(str(payload['releaseStatus'].get('at'))) + '.</p>'
        + table(['Stage','Status','Passed','Failed','Skipped','Warnings','Evidence reference','Scope / note'],release_rows)
        + '<h2>X02 VST availability</h2><p><strong>' + html.escape(access_status) + '</strong>. Static configuration identifies <code>'
        + html.escape(str(access['namedConnection'].get('canonicalId'))) + '</code> on the explicit VST/testnet host. '
        'A configured demo identity does not authenticate the running account or establish current asset balance, positions, order acceptance or fills. '
        'Access check time: ' + html.escape(str(access.get('checkedAt'))) + '.</p><ul>'
        + ''.join('<li>' + html.escape(str(x)) + '</li>' for x in access.get('blockers', [])) + '</ul>'
        + '<h2>Frozen provenance and interpretation</h2><p>Source checkpoint <code>' + html.escape(payload['sourceCheckpoint']) + '</code><br>Source-set SHA256 <code>'
        + html.escape(payload['sourceSha256']) + '</code><br>Protocol SHA256 <code>' + html.escape(payload['protocolSha256']) + '</code><br>Source-freeze SHA256 <code>'
        + html.escape(payload['sourceFreezeSha256']) + '</code></p><p>Modeled cost, capital and arm settings remain the frozen protocol values. '
        'The final CP10 integration and retained earlier source contracts are source-bound through <code>' + html.escape(payload['productionRepair']['reference']) + '</code>. '
        'The accounting audit and parameter-scope proof are source-bound through <code>' + html.escape(boundary['auditReference']) + '</code> and <code>' + html.escape(boundary['parameterProofReference']) + '</code>. '
        'Historical checkpoint focused references establish ancestor contracts; fresh CP10 focused references cover preset-edit invalidation. Final broad, UI, full-core and venue stages retain their actual separate status above. '
        'Neither this report nor a retrospective policy pass authorizes venue trading. Live/account results, fees, slippage, funding, stops and restart recovery require their own authenticated evidence. '
        'These two short historical windows provide no guarantee of continuous or future positive PF.</p>'
        + '<details><summary>Final integrated source contracts</summary><ul>'
        + ''.join('<li><code>' + html.escape(change['id']) + '</code>: ' + html.escape(change['contract']) + '</li>' for change in payload['productionRepair']['integrationChanges'])
        + '</ul><p>The final checkpoint has the last verified source-chain checkpoint as its single direct parent. The chain preserves the hashed CP8 ordered CP7/main merge ancestry. Eight relevant final source/dependency-file hashes match the study seal; fresh focused references are hash-verified. '
        'Economic results from earlier captures were not assumed identical. Earlier captures, original fixtures and corrections remain separately identified in the archive.</p></details>'
        + '<details><summary>Archive artifact paths</summary><p>Paths stay plain text unless an explicit extracted archive root was supplied and the file exists there.</p><ul>' + archive_links + '</ul></details>'
        + '<details><summary>Input hashes and bytes</summary><ul>' + sources + '</ul></details>'
        + '<footer>Public frozen-market/model evidence only. No screenshots, source code, credentials, private account records or QA databases are embedded. '
        'Generated report data and CSV hashes are recorded in report-manifest.json.</footer>'
        + '<script type="application/json" id="csv-downloads">' + encoded.replace('<', '\\u003c') + '</script><script>'
        'const files=JSON.parse(document.getElementById("csv-downloads").textContent);document.querySelectorAll("[data-download]").forEach(b=>b.addEventListener("click",()=>{const name=b.dataset.download;const bytes=Uint8Array.from(atob(files[name]),c=>c.charCodeAt(0));const u=URL.createObjectURL(new Blob([bytes],{type:"text/csv;charset=utf-8"}));const a=document.createElement("a");a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),30000)}));'
        '</script></main></body></html>').encode('utf-8')


def generate(args):
    if not args.generate_after_final_rerun:
        raise ValueError('Preparation only: pass --generate-after-final-rerun after the corrected rerun and authorized audit')
    run, output = Path(args.run).absolute(), Path(args.out).absolute()
    if output.resolve() != output or not any(output.is_relative_to(base) for base in (Path('/tmp'), SAFE_STAGE)):
        raise ValueError('Report output must be an unsymlinked directory under /tmp or approved non-Git staging')
    if output.exists():
        raise ValueError('Refusing to overwrite existing report directory')
    if 'attempt-' in run.name:
        raise ValueError('Final report refuses a superseded attempt root; preserve it as historical evidence')
    if not re.fullmatch(r'[a-f0-9]{40}', args.source_checkpoint) or not re.fullmatch(r'[a-f0-9]{64}', args.freeze_sha256):
        raise ValueError('Explicit exact final checkpoint and source-freeze SHA256 are required')
    inputs = Inputs()
    protocol = inputs.load(run/'protocol.json', 'frozen-public-model-protocol')
    freeze = inputs.load(run/'source-freeze.json', 'source-hash-metadata-only')
    comparison = inputs.load(run/'comparison.json', 'frozen-public-model-comparison')
    repair_reference=inputs.load(args.direction_history_freeze,'source-free-production-direction-history-repair-freeze')
    audit_path=Path(args.independent_audit).absolute()
    proof_path=Path(args.parameter_proof).absolute()
    study_refs=repair_reference.get('studyEvidence')
    if not isinstance(study_refs,dict) or set(study_refs)!={'independentAudit','parameterProof'}:
        raise ValueError('Final v3 manifest requires explicit fresh CP10 audit and parameter-proof references')
    for key,path,expected_sha in (('independentAudit',audit_path,args.independent_audit_sha256),('parameterProof',proof_path,args.parameter_proof_sha256)):
        ref=study_refs[key]
        if not isinstance(ref,dict) or not isinstance(ref.get('path'),str) or not Path(ref['path']).is_absolute() or Path(ref['path'])!=path or ref.get('sha256')!=expected_sha or not re.fullmatch(r'[a-f0-9]{64}',expected_sha):
            raise ValueError('Explicit fresh-study CLI references must exactly match final v3 manifest studyEvidence; old defaults are forbidden')
    audit=inputs.load(audit_path,'source-free-independent-accounting-and-study-boundary-audit')
    parameter_proof=inputs.load(proof_path,'source-free-frozen-parameter-and-summary-proof')
    for path,expected_sha in ((audit_path,args.independent_audit_sha256),(proof_path,args.parameter_proof_sha256)):
        if not re.fullmatch(r'[a-f0-9]{64}',expected_sha) or inputs.rows[str(path)]['sha256']!=expected_sha:
            raise ValueError('Explicit reviewed boundary audit/parameter proof SHA256 mismatch')
    if sha_file(run/'source-freeze.json') != args.freeze_sha256 or freeze.get('checkpoint') != args.source_checkpoint:
        raise ValueError('Final source checkpoint/freeze mismatch')
    protocol_sha = sha_file(run/'protocol.json')
    if freeze.get('protocolSha256') != protocol_sha or comparison.get('protocolSha256') != protocol_sha or comparison.get('sourceSha256') != freeze.get('sourceSha256') or comparison.get('sourceCheckpoint') != args.source_checkpoint:
        raise ValueError('Protocol, source-freeze and comparison provenance disagree')
    production_repair=validate_direction_history_repair(repair_reference,freeze,args.direction_history_freeze,inputs)
    if (run/'heavy.lock').exists():
        raise ValueError('Comparison is still running; hold report generation')
    folds, arms = protocol.get('folds', []), protocol.get('arms', [])
    if len(folds) != 2 or len(arms) != 10 or len({x['id'] for x in folds}) != 2 or len({x['id'] for x in arms}) != 10:
        raise ValueError('This report requires the frozen two-fold/ten-arm study')
    if not arms or arms[0].get('id') != 'off':
        raise ValueError('Expected Off baseline first in frozen protocol')
    performance = comparison.get('performance', {})
    captures,policy_rows,performance_arms=validate_capture_and_policy(comparison,protocol)
    matrix = inputs.load(args.matrix, 'sanitized-offline-functionality-matrix')
    access = inputs.load(args.access, 'sanitized-x02-access-status')
    release=inputs.load(args.release_status,'sanitized-release-verification-status')
    if len(matrix.get('rows', [])) != 16:
        raise ValueError('Functionality matrix must retain all sixteen areas')
    if access.get('namedConnection', {}).get('canonicalId') != 'bingx-vst-02' or access['namedConnection'].get('network') != 'testnet':
        raise ValueError('X02 evidence does not explicitly identify the VST/testnet connection')
    validate_release_status(release,args.source_checkpoint,access,inputs)
    rows, flat_rows, hours, flat_hours, closes, archive_paths = [], [], [], [], [], []
    seen_rows = set()
    common_allocation=None
    for fold in folds:
        baseline = None
        baseline_funded=None
        for arm in arms:
            fid, aid = fold['id'], arm['id']
            for value in (fid, aid):
                if not re.fullmatch(r'[a-zA-Z0-9_-]+', value):
                    raise ValueError('Unsafe frozen fold/arm identity')
            evidence_path = run/fid/aid/'evidence.json'
            e = inputs.load(evidence_path, 'public-funded-and-virtual-model-evidence')
            if e.get('fold') != fid or e.get('arm') != aid or e.get('protocolSha256') != protocol_sha or e.get('sourceSha256') != freeze.get('sourceSha256'):
                raise ValueError('Per-arm evidence provenance mismatch')
            frozen = e.get('provenance', {}).get('frozenBlockComparison', {})
            if frozen.get('sourceCheckpoint') != args.source_checkpoint:
                raise ValueError('Per-arm capture source checkpoint mismatch')
            validate_settings(e,frozen,protocol,arm,fold)
            allocation=e.get('settings',{}).get('allocation',{})
            if common_allocation is None:
                common_allocation=dict(allocation)
            elif allocation!=common_allocation:
                raise ValueError('Capital/sizing/cap settings differ across frozen arms/folds')
            window=e['window']
            risk = e.get('risk', {})
            exact = risk.get('exactMinuteEvidence')
            if not isinstance(exact, dict) or any(exact.get(k) != v for k, v in {'schema':'cts-block-native-minute-risk-v1','window':window,'fold':fid,'arm':aid,'protocolSha256':protocol_sha,'sourceSha256':freeze.get('sourceSha256')}.items()):
                raise ValueError('Missing or mismatched exact minute-risk provenance')
            for key, exact_key in (('equityMaxDrawdownUsd','equityMaxDd'),('equityMaxDrawdownFraction','equityMaxDdPct'),('equityDdtMaxH','equityDdtMaxH')):
                if not finite(risk.get(key)) or risk[key] < 0 or risk[key] != exact.get(exact_key):
                    raise ValueError('Exact risk values disagree; do not reconstruct from sampled curves')
            slices = e.get('slices', [])
            identities = [close_identity(x) for x in slices]
            if len(set(identities)) != len(identities):
                raise ValueError('Duplicate canonical modeled close identity')
            if window.get('startT') != fold.get('tradeStartT') or window.get('endT') != fold.get('endT'):
                raise ValueError('Per-arm trading window mismatch')
            for close in slices:
                if not finite(close.get('entryT')) or not finite(close.get('exitT')) or not window['startT'] <= close['entryT'] < window['endT'] or not window['startT'] < close['exitT'] <= window['endT'] or close['exitT'] < close['entryT'] or close.get('markedOpen') or close.get('reason') in ('open','end'):
                    raise ValueError('Endpoint/prewindow/invalid close entered settled evidence')
            funded, virtual = e.get('total', {}), e.get('virtual', {})
            primary = check_cohort(slices, funded, True)
            check_cohort(slices, virtual, False)
            sides = {}
            for label, side in (('long',1),('short',-1)):
                found = [x for x in e.get('bySide', []) if x.get('key') == side]
                if len(found) != 1:
                    raise ValueError('Both explicit side rows, including empty sides, are required')
                sides[label] = dict(found[0]['funded'])
                check_cohort([x for x in slices if x.get('side') == side], sides[label], True)
            if any(x.get('side') not in (-1,1) for x in slices):
                raise ValueError('Unknown direction retained in raw evidence; side partition cannot be certified')
            if aid == 'off':
                baseline = [dict(x) for x in slices]
                baseline_funded=dict(funded)
            policy = policy_rows.get((fid,aid))
            if aid != 'off' and policy is None:
                raise ValueError('Missing candidate retrospective-policy row')
            if policy is not None and (policy.get('fullArm')!=funded or policy.get('off')!=baseline_funded or policy.get('risk')!=risk or policy.get('equityDrawdownFraction')!=risk.get('equityMaxDrawdownFraction')):
                raise ValueError('Policy full-arm/risk/baseline values differ from current per-arm evidence')
            if captures[(fid,aid)].get('failedChecks')!=e.get('book',{}).get('failedChecks',[]):
                raise ValueError('Capture native-check inventory differs from current arm evidence')
            failed = [x.get('name','unknown') for x in (policy or {}).get('failedChecks', [])]
            activity_data = {'virtual':activity(slices), 'funded':activity([x for x in slices if x['allocation']=='positive']), 'endpoints':endpoint_activity(e)}
            row = {'fold':fid,'arm':aid,'window':dict(window),'funded':dict(funded),'virtual':dict(virtual),
                   'sides':sides,'risk':risk,'book':{k:v for k,v in e.get('book',{}).items() if k not in {'hours','checks','failedChecks'}},
                   'armSettings':dict(arm),'blockSettings':dict(e.get('settings',{}).get('block',{})),
                   'activity':activity_data,'neutralization':neutralization(slices,baseline or []),
                   'policyStatus':'Baseline diagnostic' if aid=='off' else 'Passed' if policy.get('retrospectivePolicyPassed') is True else 'Failed / unavailable',
                   'failedPolicyChecks':failed,'nativeFailedChecks':e.get('book',{}).get('failedChecks',[]),
                   'primaryOwnedEntryOrders':len({entry_identity(x) for x in slices if x['allocation']=='positive'}),
                   'primarySampleUniqueEntries':len({entry_identity(x) for x in primary}),
                   'configInventoryIdentities':len(e.get('provenance',{}).get('configInventory',[])),
                   'requestedSignalInventoryIdentities':len(e.get('provenance',{}).get('requestedSignalInventory',[]))}
            if (fid,aid) in seen_rows:
                raise ValueError('Duplicate fold/arm report row')
            seen_rows.add((fid,aid)); rows.append(row)
            flat = {'fold':fid,'arm':aid,'window_start_utc':utc(window['startT']),'window_end_utc':utc(window['endT']),
                    'unit_return_sum_scale':'fraction','unit_drawdown_scale':'percentage-points','cash_scale':'USD diagnostic',
                    'source_checkpoint':args.source_checkpoint,'source_sha256':freeze['sourceSha256'],'protocol_sha256':protocol_sha,
                    'primary_owned_entry_orders':row['primaryOwnedEntryOrders'],'primary_sample_unique_entries':row['primarySampleUniqueEntries'],
                    'policy_status':row['policyStatus'],'failed_policy_checks':failed,
                    'native_failed_check_count':len(row['nativeFailedChecks']),
                    'config_inventory_identities':row['configInventoryIdentities'],
                    'requested_signal_inventory_identities':row['requestedSignalInventoryIdentities']}
            for prefix, group in (('funded_',funded),('virtual_',virtual),('long_funded_',sides['long']),('short_funded_',sides['short'])):
                flat.update(group_columns(prefix,group,funded=prefix!='virtual_'))
            flat.update(scalar_columns('risk_',risk));flat.update(scalar_columns('book_',row['book']))
            for section in ('funded','virtual'):
                flat.update(scalar_columns(f'activity_{section}_',activity_data[section]))
            flat.update(scalar_columns('endpoint_',activity_data['endpoints']))
            flat.update(scalar_columns('neutralization_',row['neutralization']))
            flat_rows.append(flat)
            for close in slices:
                exported = {'fold':fid,'arm':aid,'source_checkpoint':args.source_checkpoint,'source_sha256':freeze['sourceSha256'],
                            'protocol_sha256':protocol_sha,'classification':'modeled-virtual-settled-close-slice',
                            'unit_return_scale':'fraction','cash_scale':'USD diagnostic','cost_fraction':e.get('settings',{}).get('cost')}
                exported.update(close)
                exported.update({'canonical_close_identity':list(close_identity(close)),
                    'entry_utc':utc(close.get('entryT')),'exit_utc':utc(close.get('exitT')),
                    'positive_owned':close['allocation']=='positive','primary_sample_included':close['allocation']!='zero',
                    'unit_return_known':finite(close.get('unitR')),
                    'primary_return_usable':finite(close.get('unitR')) and close['allocation']=='positive',
                    'cash_pnl_known':finite(close.get('sizedPnl')) and close['allocation']!='unknown'})
                closes.append(exported)
            hourly=e.get('hourly',[])
            expected_hours=math.ceil((window['endT']-window['startT'])/HOUR)
            if len(hourly)!=expected_hours:
                raise ValueError('Hourly rows must retain every declared hour, including empty')
            book_hours={x['t']:x for x in e.get('book',{}).get('hours',[])}
            if len(book_hours)!=len(e.get('book',{}).get('hours',[])):
                raise ValueError('Duplicate native hourly display row')
            for index,hour in enumerate(hourly):
                start=window['startT']+index*HOUR;end=min(start+HOUR,window['endT'])
                if hour.get('startT')!=start or hour.get('endT')!=end or start not in book_hours:
                    raise ValueError('Hourly close buckets/native account hours do not match')
                hs=[x for x in slices if start<x['exitT']<=end]
                check_cohort(hs,hour['funded'],True);check_cohort(hs,hour['virtual'],False)
                hr={'fold':fid,'arm':aid,'startT':start,'endT':end,'funded':dict(hour['funded']),'virtual':dict(hour['virtual']),'book':dict(book_hours[start])}
                hours.append(hr)
                fh={'fold':fid,'arm':aid,'hour_index':index,'start_utc':utc(start),'end_utc':utc(end),
                    'unit_return_sum_scale':'fraction','unit_drawdown_scale':'percentage-points','cash_scale':'USD diagnostic',
                    'source_checkpoint':args.source_checkpoint,'source_sha256':freeze['sourceSha256'],'protocol_sha256':protocol_sha,
                    'return_bucket':'close-time (start,end]',
                    'book_value_precision':'native rounded hourly display fields',
                    'positive_owned_long_slices':sum(x['side']==1 and x['allocation']=='positive' for x in hs),
                    'positive_owned_short_slices':sum(x['side']==-1 and x['allocation']=='positive' for x in hs)}
                fh.update(group_columns('funded_',hour['funded']));fh.update(group_columns('virtual_',hour['virtual'],funded=False))
                fh.update(scalar_columns('book_display_',book_hours[start]));flat_hours.append(fh)
            relative=f'research/{run.name}/{fid}/{aid}/book/index.html'
            linked={'path':relative}
            if args.extracted_root:
                target=Path(args.extracted_root).absolute()/relative
                if target.is_file() and not target.is_symlink() and target.resolve().is_relative_to(Path(args.extracted_root).resolve()):
                    linked['href']=os.path.relpath(target,output).replace(os.sep,'/')
            archive_paths.append(linked)
            del e,slices,primary,hourly
            gc.collect()
        del baseline,baseline_funded
        gc.collect()
    if len(rows)!=20 or len(hours)!=120:
        raise ValueError('Final inventory must contain exactly20comparison and120hourly rows')
    inputs.verify_unchanged()
    study_boundaries=validate_study_boundaries(protocol,comparison,freeze,rows,audit,parameter_proof,run,inputs,audit_path,proof_path)
    exports={'comparison.csv':csv_bytes(flat_rows),'hourly.csv':csv_bytes(flat_hours),'all-close-slices.csv':csv_bytes(closes)}
    unfinished=[x['id'] for x in release['checks'] if x['id']!='x02-vst-venue' and x['status'] in {'pending','running','not-run'}]
    provisional=args.provisional or bool(unfinished)
    offline_problems=[x['id'] for x in release['checks'] if x['id']!='x02-vst-venue' and x['status'] in {'failed','blocked'}]
    if offline_problems:
        snapshot_label=('Provisional report' if provisional else 'Corrected research report')+' · offline verification has failures or blockers'
    elif provisional:
        snapshot_label='Provisional report · corrected research complete · offline verification pending'
    elif access['namedConnection'].get('actualAuthenticatedAccountVerified') is not True:
        snapshot_label='Corrected research report · offline checks complete · X02 venue blocked'
    else:
        snapshot_label='Corrected research report · verification status retained below'
    payload={'schema':'cts-overall-block-standalone-report-v1','sourceCheckpoint':args.source_checkpoint,
             'sourceSha256':freeze['sourceSha256'],'protocolSha256':protocol_sha,'sourceFreezeSha256':args.freeze_sha256,
             'classification':'public-frozen-model-evidence; not venue execution','rows':rows,'hours':hours,
             'closeSliceCount':len(closes),'performanceArms':performance_arms,
             'policy':performance.get('policy',{}),'functionality':matrix,'access':access,
             'releaseStatus':release,
             'productionRepair':production_repair,
             'studyBoundaries':study_boundaries,
             'provisional':provisional,'unfinishedOfflineStages':unfinished,'failedOrBlockedOfflineStages':offline_problems,'releaseSnapshotLabel':snapshot_label,
             'archivePaths':archive_paths,'inputs':inputs.manifest(),
             'limits':['No arm selection or strategy/default tuning','Funded primary and virtual/cash diagnostics retain distinct samples',
                       'Unknowns remain in affected samples; no known-only positive subset replaces them',
                       'No continuous/future/live profitability guarantee or deployment proof']}
    generated=dict(exports)
    generated['index.html']=render_html(payload,exports)
    generated['report-data.json']=(json.dumps(payload,indent=2,ensure_ascii=False,allow_nan=False)+'\n').encode('utf-8')
    if any(SENSITIVE.search(data.decode('utf-8')) for data in generated.values()):
        raise ValueError('Possible private credential material; report generation stopped without dumping value')
    generated['report-manifest.json']=(json.dumps({'schema':'cts-overall-block-report-manifest-v1',
        'sourceCheckpoint':args.source_checkpoint,'sourceSha256':freeze['sourceSha256'],'protocolSha256':protocol_sha,
        'sourceFreezeSha256':args.freeze_sha256,'generatorSha256':sha_file(Path(__file__)),
        'comparisonRows':len(rows),'hourlyRows':len(hours),'closeSlices':len(closes),'inputs':inputs.manifest(),
        'provisional':provisional,'releaseSnapshotLabel':snapshot_label,
        'productionRepair':production_repair,
        'studyBoundaries':study_boundaries,
        'outputs':[{'path':name,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()} for name,data in sorted(generated.items())],
        'limits':'Report manifest omits its own self-referential hash; no code, screenshots, private account records or QA DB included.'},
        indent=2,ensure_ascii=False,allow_nan=False)+'\n').encode('utf-8')
    inputs.verify_unchanged()
    output.parent.mkdir(parents=True,exist_ok=True)
    output.mkdir(exist_ok=False)
    try:
        for name,data in generated.items():
            with (output/name).open('xb') as file:
                file.write(data)
        inputs.verify_unchanged()
    except BaseException:
        shutil.rmtree(output)
        raise
    return {'directory':str(output),'comparisonRows':len(rows),'hourlyRows':len(hours),'closeSlices':len(closes),
            'provisional':provisional,'releaseSnapshotLabel':snapshot_label,
            'sourceCheckpoint':args.source_checkpoint,'files':[{'name':name,'bytes':len(data)} for name,data in sorted(generated.items())],
            'archiveCreated':False,'uploadPerformed':False}


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--generate-after-final-rerun',action='store_true')
    parser.add_argument('--provisional',action='store_true',help='Force visible provisional labeling for preflight even if all offline verification evidence has completed')
    parser.add_argument('--run',default=str(RUN_DEFAULT))
    parser.add_argument('--out',required=True)
    parser.add_argument('--source-checkpoint',required=True)
    parser.add_argument('--freeze-sha256',required=True)
    parser.add_argument('--matrix',default=str(MATRIX_DEFAULT))
    parser.add_argument('--access',default=str(ACCESS_DEFAULT))
    parser.add_argument('--release-status',default=str(RELEASE_DEFAULT),help='Explicit source-bound per-stage pending/complete/blocked verification evidence')
    parser.add_argument('--direction-history-freeze',required=True,help='Strict final CP10 integrated-source v3 manifest; ordered verified single-parent ancestry, relevant hashes and fresh study references are required')
    parser.add_argument('--independent-audit',required=True,help='Explicit fresh CP10 independent audit; exact path/hash must match final v3 manifest studyEvidence')
    parser.add_argument('--independent-audit-sha256',required=True)
    parser.add_argument('--parameter-proof',required=True,help='Explicit fresh CP10 parameter proof; exact path/hash must match final v3 manifest studyEvidence')
    parser.add_argument('--parameter-proof-sha256',required=True)
    parser.add_argument('--extracted-root',help='Optional actual extracted archive root; otherwise archive paths remain plain text')
    args=parser.parse_args()
    print(json.dumps(generate(args),indent=2))


if __name__=='__main__':
    try:
        main()
    except (ValueError,OSError,KeyError,TypeError) as error:
        print(f'Report generator stopped: {error}',file=sys.stderr)
        raise SystemExit(2)
