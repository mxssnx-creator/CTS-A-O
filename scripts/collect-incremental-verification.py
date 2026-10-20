#!/usr/bin/env python3
"""Seal the composite verification without rewriting the original failed broad run."""
import gzip
import hashlib
import json
import re
import subprocess
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
assert Path.cwd() == ROOT
logs = {}


def log(name, success=False):
    path = Path('runs') / name
    raw = path.read_bytes()
    value = raw.decode()
    if success:
        assert 'EXIT_CODE=0' in value, f'incomplete or failed command: {path}'
    logs[str(path)] = {'sha256': hashlib.sha256(raw).hexdigest(), 'text': value}
    return value


def counts(value):
    return {name: int(re.findall(rf'^ℹ {name} (\d+)$', value, re.M)[-1])
            for name in ['tests', 'pass', 'fail', 'skipped', 'cancelled']}


def passed(name):
    value = log(name, True)
    result = counts(value)
    assert result['tests'] == result['pass'] and result['fail'] == result['cancelled'] == 0, name
    return result


broad = counts(log('incremental-core-all.log'))
assert broad == {'tests': 2372, 'pass': 2363, 'fail': 7, 'skipped': 2, 'cancelled': 0}, broad
focused = passed('incremental-core-focused-sealed.log')
slow = passed('incremental-core-slow-final.log')
assert slow['tests'] == 2
replacement = passed('incremental-cohort-replacement.log')
for name in ['incremental-final-coherent.log', 'incremental-control-final-ingestion.log',
             'incremental-source-alias-final.log', 'incremental-universe-final.log',
             'incremental-control-generation-resolution.log',
             'incremental-responsiveness-resolution.log', 'incremental-responsiveness-confirmed.log']:
    value = log(name)
    result = counts(value)
    assert result['fail'] == result['cancelled'] == 0 and result['tests'] == result['pass'], name

for name in ['typecheck', 'build', 'lint', 'benchmark']:
    value = log(f'incremental-{name}-sealed.log', True)
    if name == 'lint':
        assert '0 errors, 27 warnings' in value

worker = json.loads(log('incremental-built-worker-sealed.log', True).splitlines()[0])
assert worker['passed'] and len(worker['checks']) == 3
log('incremental-ui-sealed.log', True)
ui = json.loads(Path('runs/incremental-ui.json').read_text())
assert len(ui) == 4 and all(not v['errors'] and not v['overflow'] for v in ui)
report_ui = json.loads(Path('runs/incremental-report-ui.json').read_text())
assert len(report_ui) == 2 and all(not v['errors'] and v['downloadExact'] and v['noOverflow'] for v in report_ui)
for name in ['incremental-core-slow.log', 'incremental-report-ui-fixed.log',
             'incremental-built-worker.log', 'incremental-built-worker-fixed.log',
             'incremental-report-ui-sealed.log']:
    log(name)
log('incremental-report-ui-complete.log', True)
log('incremental-script-lint.log', True)

benchmark = json.loads(Path('runs/realtime-cycle-final-cohort.json').read_text())
assert benchmark['budget']['passed'] and not benchmark['failures'] and benchmark['cycles']['n'] == 60
for path, digest in benchmark['sourceManifest'].items():
    assert hashlib.sha256(Path(path).read_bytes()).hexdigest() == digest, path

resolutions = [
    {'name': 'Stable-02 Signal-Quellfunktion: Referenzidentität',
     'resolution': 'Signal-Aliase behalten die originale fn-Referenz. Unveränderte Identitätsassertion und gesamte Stable-02-Suite bestehen erneut.'},
    {'name': 'Overall: ausstehende Einträge nur für Status berechnen',
     'resolution': 'Test beobachtet den tatsächlich verwendeten Generator statt des alten synchronen Adapters. Dieselben Aufrufzahlen bestehen.'},
    {'name': 'Restart wartet auf laufenden Live-Schutzschritt',
     'resolution': 'Fixture wartet auf den tatsächlichen asynchronen onLive-Handshake vor stop. Warte- und Schutzassertionen bleiben erhalten und bestehen.'},
    {'name': 'Watchdog während angefordertem Compare',
     'resolution': 'Generation-Fence und frühe Compare-Wartephase bei angeforderter Forschung. Test fordert Forschung explizit an; nur die Ersatzgeneration darf rechnen.'},
    {'name': 'Stop/start während angefordertem Compare',
     'resolution': 'Gleiche Generation-Fence; normaler Vordergrund wartet weiter nicht auf Hintergrund-Compare. Beide Restart-Tests bestehen.'},
    {'name': 'Fortschreitende Historienpopulation: 12 Symbole / 3 Batches',
     'resolution': 'Jede veränderte/noch unvollständige Population löst vollständige Forschung aus. Unveränderter End-to-End-Test besteht in etwa 3 s statt 400-s-Timeout.'},
    {'name': 'Kalte synthetische Simulation: 331-ms-Slice bei 250-ms-Testgrenze',
     'resolution': 'Originaler Ausreißer bleibt erhalten. Derselbe unveränderte Test bestand zweimal isoliert (55,47 s und 54,58 s Gesamtdauer). Kein Beweis einer universellen kalten 250-/500-ms-Garantie.'},
]
checks = [
    {'name': 'Breiter Core-Lauf, 220 Dateien', 'status': '7 Befunde separat nachgeprüft',
     'scope': '2.363 bestanden / 2.372 Tests; 7 ursprüngliche Fehler und 2 optionale Skips im Rohprotokoll erhalten.'},
    {'name': 'Abschließende gezielte Regression, 15 Dateien', 'status': 'bestanden',
     'scope': f"{focused['pass']}/{focused['tests']}; vollständige neue Source-/Math-/Market-/Tape-, Kontroll-, Schutz- und Real-Worker-Suiten inklusive ursprünglicher funktionaler Fehler."},
    {'name': 'Gesamtabdeckung', 'status': 'zusammengesetzter Nachweis',
     'scope': '220 ursprüngliche Dateien plus neue research-real.worker.test.ts = 221 Dateien; überlappende Teilmengen werden nicht addiert.'},
    {'name': 'Stress / mehrtägiger Hintergrund-Backtest', 'status': 'bestanden',
     'scope': '2/2; Start vor dem letzten Kerzenmarker-Fix (separat 12/12 geprüft). Der unterbrochene erste Stresslauf bleibt separat erhalten.'},
    {'name': 'Kohortenwechsel und exakte Fortsetzung', 'status': 'bestanden',
     'scope': f"{replacement['pass']}/{replacement['tests']}; sofortiges Aufholen, keine doppelte Kerze; beide Richtungen und alle Simulatorfamilien."},
    {'name': 'Strenger kalter Responsiveness-Test', 'status': 'zweimal isoliert bestanden',
     'scope': 'Je 1/1 mit unveränderten Grenzen; ursprünglicher Last-Ausreißer bleibt sichtbar.'},
    {'name': 'TypeScript / Produktionsbuild', 'status': 'bestanden', 'scope': 'Beide Exit 0 auf eingefrorenem Core-Quellstand.'},
    {'name': 'Lint', 'status': 'bestanden', 'scope': '0 Fehler, 27 bestehende Warnungen.'},
    {'name': 'Tatsächlich paketierter Produktionsworker', 'status': 'bestanden',
     'scope': '3/3: exakte Tape-Fortsetzung, vollständiges Real-Ergebnis, Long-/Short-Tickmathematik.'},
    {'name': 'App Desktop / Telefon, Dev / Build', 'status': 'bestanden',
     'scope': '4/4: aktuelle/letzte Zeiten, Forschungsintervall, keine falsche Idle-Latenz, kein Überlauf oder Seitenfehler.'},
    {'name': 'HTML-Bericht Desktop / Telefon', 'status': 'bestanden',
     'scope': '2/2: sechs SVG-Diagramme, Provenienz, kein Seitenüberlauf, eingebetteter Download exakt.'},
    {'name': '20 Symbole / 636 validierte Configs', 'status': 'bestanden',
     'scope': f"60/60 warme Zyklen unter 500 ms; {benchmark['oracle']['exactTapes']} vollständige Tapes / {benchmark['oracle']['exactCloses']} Abschlüsse exakt zum unabhängigen Vollhistorienaufbau."},
]
result = {
    'complete': True,
    'classification': 'Completed composite verification; not one immutable all-green broad invocation, not venue/deployment proof',
    'regressionNote': 'Der breite Lauf war kein vollständig grüner Einzelaufruf: sieben damalige Befunde sind mit ihren Originalfehlern archiviert. Die funktionalen Korrekturen und aktualisierten asynchronen Fixtures bestehen in den abschließenden vollständigen Teilsuiten; der unveränderte kalte Timing-Test bestand zweimal isoliert. Teilmengen überlappen und werden nicht als zusätzliche unabhängige Tests summiert. Kalte synthetische Stressberechnung kann weiterhin längere Hauptthread-Slices haben; das 500-ms-Ziel gilt für die gemessene warme validierte Live-Fortsetzung.',
    'sourceCommit': subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip(),
    'sourceSha256': benchmark['sourceSha256'],
    'slowStartedOnSource': '5bbe522; the later resetRealtime marker change is covered by the final cohort/control suites',
    'created': datetime.now(ZoneInfo('Europe/Vienna')).isoformat(),
    'checks': checks, 'resolutions': resolutions, 'broad': broad, 'focused': focused, 'slow': slow,
    'appUi': ui, 'reportUi': report_ui, 'builtWorker': worker, 'logs': logs,
    'deployment': 'No main merge, deployment, live reload, account mutation or venue orders.',
}
raw = json.dumps(result, separators=(',', ':'), allow_nan=False).encode()
Path('runs/incremental-verification.json').write_bytes(raw)
Path('docs/sims/incremental-core-verification-20261020.json.gz').write_bytes(gzip.compress(raw, mtime=0))
print(json.dumps({'complete': True, 'focused': focused, 'slow': slow, 'logs': len(logs)}))
