# CTS-A-O: Positionsfenster, Low-Range und Ausführungsprüfung

Stand: 11. November 2026. Ausgangspunkt: `819b6621f25393e3fe66da4a0fa0a52c4baee709`.

## Ergebnis und Grenze

Die neue Standardbewertung verwendet vollständige letzte N abgeschlossene Positionen je Konfiguration.
Zeitfenster bestimmen weiterhin die verfügbare Datenhistorie und den Simulationsabschnitt; sie wählen
keine Mitglieder der neuen Bewertungsfenster. Fehlende Historie bleibt unzureichende Evidenz.
Die Umstellung ist kein Nachweis für einen dauerhaft positiven zukünftigen ProfitFactor.

Der eingefrorene Markt-Replay umfasst genau acht Symbole, zwölf Stunden Vorlauf und zwölf Stunden
Handel vom 8. Oktober 2026, 12:00 UTC bis 9. Oktober, 12:00 UTC. Es handelt sich um bereits bekannte,
zwischengespeicherte Binance-Daten; nicht um einen frischen Holdout oder BingX-Ausführungen.
Base qualifizierte 0 von 1.492 ausgewerteten Paaren. Nach Base wurden 0 Konfigurationen bewertet;
der qualifizierte post-Base-PF und der Ausführungs-PF sind nicht verfügbar. Positionen und Orders,
jeweils eröffnet/geschlossen/gehalten: 0/0/0. Daraus folgt kein Profitabilitätsnachweis.
Der separat aufgebaute Kandidatenpool hat 12 Signal-Konfigurationen und 192 exakte
Konfiguration/Symbol/Richtung-Kontexte. Davon sind 0/192 (0 %) vollständig bzw. qualifiziert;
die größte eigene Stichprobe umfasst fünf statt der erforderlichen 40 Main-Positionen.
Diese Kandidatenbereitschaft ersetzt nicht den leeren post-Base-Nenner 0/0; dessen Prozentwert bleibt unverfügbar.

Die früher dokumentierte Kohorte darf nicht als Garantie übernommen werden: Der alte Bericht zeigte
405/1.276 post-Base-Kontexte mit hohem historischem Validierungs-PF, aber anschließend einen
fundierten Modell-Ausführungs-PF von 0,273050873. Historische Validierung und spätere Ausführung
bleiben unterschiedliche Stichproben. Die neue Policy wurde nicht anhand dieses Verlustes passend
optimiert; die Parameter des neuen Replays bleiben gegenüber dem ersten Versuch unverändert.

## Bewertungsvertrag

| Stufe | Standard-N | Geltungsbereich |
| --- | ---: | --- |
| Base | 40; Micro/Minimal 30 | Eigene vollständige Konfigurationszelle; aggregierte eigene Symbol-/Seitenereignisse |
| Main | 40 | Exakte Konfiguration × Symbol × Richtung |
| Real | 12 | Eigene letzte N bereits abgeschlossene Kandidatenbeobachtungen |
| Entry | 12 | Eigene letzte N vor der neuen Entry-Entscheidung |

Range- und exakte Config-Overrides überschreiben diese Werte stufenweise. Native Mainnet-Mindestgrößen
bleiben zusätzlich bestehen. Ein höherer konfigurierter Last-N-Range-Guard bleibt wirksam.
Die Main-/Real-/Entry-Beobachtungen sind Kandidatenmodell-Evidenz; sie ersetzen keine unabhängig
gehaltenen Paper-Positionen oder tatsächlich ausgeführten Venue-Fills.

Nur `exitT < decisionT` zählt. Unbekannte Renditen bleiben im ausgewählten N; ältere unbekannte
Renditen außerhalb N dürfen eine spätere vollständige bekannte Stichprobe nicht dauerhaft vergiften.
Ungültige Eigentumskennungen, Seiten und Zeitreihen können nicht übersprungen werden, um ältere
Gewinne zu qualifizieren. Erhaltene/held-only Tapes können keine neue Entry-Freigabe liefern.

PF bleibt Bruttogewinn geteilt durch Bruttoverlust, neutral bei 1. Verluste werden nicht entfernt oder
nach oben korrigiert. Echte verlustfreie Stichproben haben eine gesonderte Konvention; der interne
Gate-Score 4 ist kein gemessener endlicher Markt-PF. Drawdown-Dauer und Stabilitätsblöcke verwenden
Positionen. LCB, Nettoertrag, eigene PF-Floors, Drawdown-Verhältnis und Kosten bleiben unabhängige Gates.

Das Ranking, kontinuierliche Evals, Signal-Aktivierung, Optimizer, Entry und native Prüfung verwenden
dieselbe Policy. Kosten-/Policy-Änderungen invalidieren alte Kandidatenmessungen; bereits gehaltene
Positionen und ihre Schutzwerte bleiben erhalten. Die einmalige Migration sichert Settings, Presets
und alte Messungen, bevor sie überholte Ergebnisse als nicht verfügbar kennzeichnet.

## Settings und Low-Range

- Globale, Range- und exakte Config-N sowie maximale Drawdown-Länge in Positionen.
- Automatischer PF-Floor in 0,1-Prozent-Distanzstufen mit konfigurierbarem Maximum und expliziten
  Schritt-/SL-Ratio-Overrides; die bestehenden Range-Floors werden nicht unterschritten.
- Maker-/Taker-Rollen für Entry und Exit, Gebühren, Slippage als Verhältnis oder absoluter Wert,
  Auto/Manuell. Auto ist Standard; fehlende oder veraltete Venue-Profile werden als Fallback behandelt.
  Ein expliziter manueller Gesamtkostenwert wird nicht durch einen Hintergrundrefresh überschrieben.
- Unabhängige Low-Range-Koordination `lr`, eigener nativer Ordertyp `Z`, eigene Statistik-Zuordnung,
  unabhängige SL-/Trailing-Caps und eigene maximale Haltezeiten.
- Low-Range-Auto-Hold testet 5/15/30/60 Minuten als getrennte Config-Identitäten. Andere Ranges können
  ebenfalls getrennte Hold-Kandidaten verwenden. Diese Werte sind Kandidaten, keine behaupteten Optima.
- Die ursprünglichen 650 Low-Range-Indikationen bleiben unverändert; 650 getrennte Inverse-Identitäten
  und 54 Band-Reclaim-/Squeeze-Break-/RSI2-Reclaim-Varianten ergänzen sie: insgesamt 1.354.
  Die neue Schutzgrid-Ausführung bleibt bis zu eigener Freigabe opt-in.

Die neuen Berechnungen verwenden ausschließlich abgeschlossene frühere Bars. Lücken und ungültige
OHLC-Werte erzwingen neues Warmup. Batch- und inkrementelle Berechnung sowie beide Richtungen
werden separat geprüft. Beim Trend-Reclaim wurde eine widersprüchliche Bedingung behoben: Der
Trendfilter verwendet jetzt eine unabhängige vorherige Preisbewegung statt der gerade zurückeroberten Bandmitte.

## Reproduzierbarer Markt-Replay

`node --require ./scripts/lib/core-test-offline-guard.cjs --experimental-strip-types --no-warnings scripts/verify-position-policy.mjs docs/execution-audit-20261030/evidence/feed-8-symbols-24h.json.gz FRESH_OUTPUT_DIRECTORY`

Der Runner fordert genau 8 × 1.440 zusammenhängende Minutenbars, ohne verstecktes Warmup. Protokoll,
vollständige Settings, Quelldatei-Fingerprints, Desk und ungefilterte Ergebnisse werden gespeichert.
Ein bereits verwendetes Protokollverzeichnis wird abgelehnt. Die Quelldatei-Prüfsumme ist
`bd4b66e09c65b990082ccc56dfd2624fd18815d01767a315dc002dfa0f6f02b0`.

Alle 1.354 Low-Range-Identitäten auf m1, sechs gewöhnliche Follow/Revert-Identitäten auf m1 und zwei
Signalquellen bilden den festgelegten Testfokus. Physische Lanes: 1/5 Minuten. Deshalb besitzt dieser
Replay keine vollständige Ausführungsabdeckung der höheren Short/General/Long-Mindest-Lanes.
Das vollständige Katalog-, Range- und Strategie-Verhalten wird zusätzlich in Funktionstests geprüft.

Die meisten Low-Range-Base-Samples sind unvollständig. Gates wurden nicht gesenkt, schwache Configs
nicht nachträglich entfernt und keine Gewinne aus Geschwisterkonfigurationen übernommen, um daraus
positive Ausführung zu erzeugen. Der leere qualifizierte Marktpfad bleibt sichtbar.

Der letzte vollständige Replay ist `attempt-7` auf wirtschaftlichem Code
`2c6b543a2ac3ccf292c8a45daec384f8a68f20af`, Quellenfingerprint
`49ee14a0a01d640c4022bde2ad8a5e714f854aff0ffacc7242449ce0a9d12cdf`.
Die späteren Änderungen betreffen Test-Startbedingungen, CI und Nachweise, nicht die Handelsrechnung.
Kalte Berechnung: 44.145 ms; gemessener maximaler RSS: 380 MB; Loop-Maximum unter paralleler
Prüflast: 1.344 ms, letzter schlechtester Base-Slice: 1.152 ms. Der warme 500-ms-Zielwert ist damit
nicht nachgewiesen. Wiederholungen desselben bekannten Feeds sind keine unabhängigen Marktstudien.

## Prüfung und bekannte offene Punkte

Die [Testmanifest-Datei](position-count-policy-20261111-evidence/test-manifest.json) unterscheidet beobachtet erfolgreiche Befehle, fehlgeschlagene
Erstläufe und unterbrochene Läufe. Überlappende Teilprüfungen werden nicht als eindeutige Gesamtsumme addiert.
Historische Zeitfenster-Contract-Fixtures setzen `positionWindows: null` ausdrücklich; die neue
Produkt-Policy bleibt standardmäßig aktiv und hat eigene vollständige Count-/Scope-/Chronologie-Tests.
Große Ablaufmatrizen verwenden repräsentative Quellen; vollständige Indikations- und Lane-Abdeckung
wird separat beibehalten. Diese Trennung ist kein Markt-Profitabilitätsnachweis.

Ein reproduzierter asynchroner Datenbankfehler ist behoben: Ein ausstehender Live-KV-Flush versuchte
nach dem Schließen eines SQLite-Handles zu schreiben. Explizites Flushen entfernt jetzt den Timer;
ein verzögerter Flush erkennt einen geschlossenen Handle. Native Stops, Targets, Teilfüllungen,
Kapazitäten und Neustart werden separat geprüft.

Der vollständige kalte Katalogtest bleibt mit allen Veröffentlichungs-, Lane-, Detailtrade- und
Atomizitätsprüfungen im expliziten Slow-Job und bestand in 268,6 s. Ein früherer 400-s-Timeout
unter paralleler Gesamtlast bleibt im Logarchiv erhalten. Dieser Test misst keine warme Tick-Latenz.
Der Worker-Heartbeat-Test trennt nun die erstmalige Thread-Initialisierung vom unveränderten
500-ms-Inaktivitätslimit und den harten Fristen. Der korrigierte Worker-/Pool-Lauf besteht alle 16 Prüfungen.
Die echte Preset-Backtest-Prüfung einschließlich eines zweiten Warteschlangenlaufs ist erfolgreich.
Der separate tatsächliche Abbruch-/Einstellungswechsel-Stresstest bestand ebenfalls, mit unveränderten
abschließenden Publikations-, Schutz-, Koordinations- und Volumenassertionen (860,8 s gesamter Cold-Lauf).

Lokale Script-Prüfungen: 799 bestanden, 8 Browserfälle ausdrücklich übersprungen; App-/Komponenten:
87 bestanden. Typprüfung und Produktions-/Core-Worker-Build sind erfolgreich; Scoped-Lint:
0 Fehler, 15 Warnungen. Überlappende gezielte Testläufe sind im Manifest separat vermerkt.

| Vollständiger Core-Teil | Beobachtetes Ergebnis |
| --- | --- |
| Shard 1/3 | 1.621 bestanden, 0 fehlgeschlagen |
| Shard 2/3 | 1.438 bestanden, 0 fehlgeschlagen |
| Shard 3/3 vor Bootstrap-Fixture-Korrektur | 1.843 bestanden, 1 Bootstrap-Zeitfehler, 3 Slow-Fälle separat, 1 sichtbarer Processed-Main-TODO |
| Korrigierter Worker-/Pool-Fokus | 16 bestanden, einschließlich der zuvor fehlgeschlagenen Prüfung |

Der dritte Gesamtlauf wird nicht nachträglich als fehlerfrei umetikettiert. Seine einzige gescheiterte
Prüfung wurde gezielt korrigiert und erneut erfolgreich ausgeführt. Der Architektur-TODO bleibt offen.

Der persistente Base→Main→Real-Paper-/Venue-Adapter und die unabhängige Schutz-Resimulation der
verarbeiteten Stufen sind noch nicht vollständig integriert. Der sichtbare Processed-Main-TODO bleibt
bestehen. Kein x01/x02-Konto wurde gestartet, keine echte Order versendet und kein Deployment vorgenommen.
Der Code wird über [PR #258](https://github.com/mxssnx-creator/CTS-A-O/pull/258) veröffentlicht;
vollständige Git-Tree-Prüfsummen sichern die Übereinstimmung mit den lokalen Quellen.

Lokales Chromium blieb durch eingeschränkte Sockets blockiert. Die tatsächliche Browserprüfung wurde
deshalb auf dem GitHub-Runner abgeschlossen: geladene Settings auf Desktop und Mobil in Dev und
Produktionsbuild, keine Console-/Page-Fehler, kein horizontaler Überlauf und keine Baseline-Divergenz.
Alle vier zusätzlichen Funktionstests bestehen: sämtliche berechneten Seiten und Settings-Speichern
auf Desktop und Telefon. Die vier Bilder wurden zusätzlich visuell geprüft. Quelle:
[Run 43057168755](https://github.com/mxssnx-creator/CTS-A-O/actions/runs/43057168755),
Commit `7a7badefd8dc37c7d3ab21ae7956881a2337b7af`.
Ein früherer grüner Smoke-Lauf zeigte lediglich den Startbildschirm; er zählt ausdrücklich nicht als
geladener UI-Nachweis. Der Workflow fordert nun die tatsächliche Positionsfenster-Settings-Überschrift
und verwirft eine abweichende Build-Baseline.
Ein ständig hoher zukünftiger Ausführungs-PF und ein harter 500-ms-Live-Zeitnachweis sind nicht belegt.

Die gehostete Policy-Prüfung besteht 465 Core- und 53 Runner-/Berichtsprüfungen; die bestehende
Integritätsprüfung 74 Core- und 29 Transport-/Render-Prüfungen. Diese gezielten Prüfungen überlappen
mit den lokalen Inventaren. [Browserbilder und Verdicts](position-count-policy-20261111-evidence/loaded-browser-render.zip)
und die [CI-Zusammenfassung](position-count-policy-20261111-evidence/ci-summary.json) bleiben zusammen mit den Rohlogs erhalten.

Rohdaten, Protokolle und Sidecars aller Replay-Versuche liegen im
[Replay-Archiv](position-count-policy-20261111-evidence/market-replays.tar.gz), auch frühere und
fehlgeschlagene Anläufe im [Logarchiv](position-count-policy-20261111-evidence/verification-logs.tar.gz).
Die [Marktzusammenfassung](position-count-policy-20261111-evidence/market-summary.json) hält
Base, Kandidaten, post-Base und Ausführung ausdrücklich getrennt.

## Primärquellen der zusätzlichen Forschungsvarianten

- Bollinger: https://www.bollingerbands.com/bollinger-band-rules
- Connors/TradingMarkets, 2-Period RSI: https://tradingmarkets.com/recent/how-to-trade-with-the-2-period-rsi-u-part-1-1581007
- Bailey et al., Probability of Backtest Overfitting: https://scholarworks.wmich.edu/math_pubs/42/
- BingX, Account/Commission API: https://github.com/BingX-API/api-ai-skills/blob/main/skills/swap-account/api-reference.md

Die implementierten Varianten sind eigene Anpassungen dieser Ideen. Die Quellen beweisen keinen
profitablen Einsatz in den hier geprüften Märkten oder Konfigurationen.
