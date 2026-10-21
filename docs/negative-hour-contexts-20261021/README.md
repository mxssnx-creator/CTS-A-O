# Zusätzliche Kontexte aus negativen Stunden
Die Erweiterung ist technisch funktionsfähig. Der neue zeitlich spätere Vergleich ist insgesamt schlechter: PF 0,810 → 0,453. Ein durchgehend positiver Ausführungs-PF ist **nicht erreicht**. Verluste, leere Varianten und alle ursprünglichen Quellen bleiben erhalten.
## Gefundene Gewinner im Training
Auswertung des älteren v4-Laufs: 257.095 finanzierte Modellabschlüsse, keine unbekannten oder Null-Zuteilungen. Drei negative Gesamtstunden am 19.10.2026 (12, 13 und 20 UTC). In ihnen waren 202 Quell-/Typ-/Range-/Richtungs-Stundengruppen und 4.852 Config-/Richtungs-Stundengruppen positiv. Dies ist rückblickendes Training unter einem älteren Quellstand, keine unabhängige Vorhersage. Vollständige Gruppen und exakte Configs: `training-negative-hours.json.gz`; aggregierte, über Stunden deduplizierte Onsets: `training-aggregate.json`.
| Ursprüngliche Quelle | Typ/Range/Richtung | Abschlüsse in negativen Stunden | PF | Einmalige Symbol-Onsets |
|---|---|---:|---:|---:|
| Inverse Micro 5 Activity Acceleration fast | Normal / Micro / Long | 219 | 3,21 | 12 |
| Inverse Micro 5 Break Close selective | Normal / Micro / Short | 142 | 4,57 | 7 |
| gleiche Quelle | Trailing / Micro / Short | 438 | 2,96 | 6 |
| Inverse Micro 5 Break Retest fast | Trailing / Micro / Long | 494 | 1,39 | 8 |
Viele Abschlüsse gehören zu unterschiedlichen Schutz-Configs desselben Onsets. Sie sind keine entsprechend große Zahl unabhängiger Marktbewegungen. Die Trailing-only-Variante von Break Retest lag nur bei PF 1,055; das unterschreitet die unveränderte moderne Mindestgrenze von 1,1.
## Additive Umsetzung
Vier unabhängige Kinder: Break Close + adaptive Tactic, Break Retest + Trend-Tactic, Activity Acceleration + relativer Marktresidual, Break Retest + Markt-Momentum. Je zwei Profile, sieben 1/5/15-Minuten-Teilmengen und eigene Inverse: **112 zusätzliche IDs**, insgesamt 1.972 registrierte Quellen. Die 434 ursprünglichen Micro-Formeln bleiben bitgenau erhalten (1.302 ursprüngliche Quell-/Symbolfälle gegen separat erfassten Vorher-Hash). Keine Änderung an Signal-336h-Historie, PF-/Last-N-Grenzen, Renditen oder Kosten. Micro wurde im Vergleich mit maximal 15 Minuten getestet.
Neue Quellen durchlaufen normale Base-, Schutz-Config-, Range-, Typ- und Richtungsprüfungen. Sie übernehmen keine Zulassung vom Elternsignal. Die exakte frühere Werkseinstellung wächst einmalig von 1.079 auf 1.191 Focus-Einträge; eigene, umsortierte, ausgeschaltete Auswahlen und deaktivierte Typen bleiben erhalten. Getestete ursprüngliche/reine und erweiterte Fokusse: 84 bzw. 196 IDs.
Der erste, vor finanzieller Bewertung dokumentierte Funktionsentwurf für Retest verlangte zwei gleichzeitige Onsets und blieb im festen synthetischen Beispiel leer. V2 nutzt deshalb einen Tactic-Trendzustand als Kontext. `plan-v1-initial.json` bleibt erhalten. Nach Sichtung des Folgeergebnisses wurden keine Formeln oder Grenzen nachjustiert.
## Zeitlicher Vergleich und alle Stunden
Primärer Binance-Versuch: 24 Archive vom 20.10. fehlten (HTTP404); öffentlicher REST-Probezugriff HTTP451. Dieser Versuch bleibt unvollständig. Der **vor Abruf separat registrierte BingX-Zusatztest** verwendet durchgehend eigene öffentliche BingX-Kerzen für alle 24 festen Symbole, keine Mischung mit Binance: 19.10. 00 UTC bis 21.10. 00 UTC. Davon 24h nur Indikator-Warmup, 12h bewertete Vorgeschichte und 20.10. 12–24 UTC Ausführung. Marktfenster, normale Ranges, Gates, Kosten (0,15% einmal), Sizing und Konto sind zwischen den Armen gleich. General/Long bleiben konfiguriert; Long besteht in diesem kurzen Fenster nicht. Native Kerzen sind keine Bestätigung eigener Venue-Fills.
| Arm | Base-Paare bewertet / bestanden | Configs am Start bewertet / bestanden | finanzierte Abschlüsse | PF | positive / negative Stunden |
|---|---:|---:|---:|---:|---:|
| Ursprünglich | 168 / 33 | 4650 / 299 | 15607 | 0.810 | 8 / 4 |
| Ursprünglich + Kontexte | 392 / 57 | 13789 / 2356 | 37581 | 0.453 | 8 / 4 |

| UTC-Stunde am 20.10. | Original: Abschlüsse / PF | Erweitert: Abschlüsse / PF |
|---|---:|---:|
| 12:00 | 803 / 3.011 | 1780 / 2.804 |
| 13:00 | 1375 / 0.769 | 2457 / 0.198 |
| 14:00 | 2286 / 0.001 | 8604 / 0.043 |
| 15:00 | 648 / 0.103 | 4185 / 0.205 |
| 16:00 | 420 / 27.158 | 3331 / 41.336 |
| 17:00 | 1044 / 3.387 | 3049 / 1.394 |
| 18:00 | 1548 / 7.813 | 4091 / 0.759 |
| 19:00 | 3784 / 7.229 | 6001 / 2.152 |
| 20:00 | 760 / 0.985 | 1116 / 1.378 |
| 21:00 | 813 / 2.636 | 813 / 2.636 |
| 22:00 | 1238 / 1.814 | 1266 / 1.818 |
| 23:00 | 888 / 3.353 | 888 / 3.353 |

Die 15.607 ursprünglichen Abschlüsse sind exakt dieselben, ohne Auslassungen, Zusätze oder Renditeabweichungen. Die 21.974 zusätzlichen Abschlüsse allein erreichen PF 0,344. Activity Acceleration Relative: 16.936 bei PF 0,563; Break Retest Market: 5.038 bei PF 0,0083. Die beiden Tactic-Kinder erzeugen keine finanzierten Abschlüsse in diesem Fenster. Die 2.667 zusätzlichen Micro-Abschlüsse erreichen nur PF 0,003. Keine dieser Leer-/Verlustgruppen wird als bestandenes Profitabilitätsergebnis dargestellt. Endpunkt-Marktwerte bleiben von abgeschlossenen Renditen getrennt.
Positiver Teilbefund im Folgefenster: inverse 1/5/15 Activity Acceleration Relative selective, General, Long erzielt Normal PF 2,478 bei 412 Abschlüssen, Trailing PF 2,058 bei 1.051 und Trailing-only PF 1,726 bei 566. Das sind nachträgliche Diagnosen innerhalb des vollständig ausgewiesenen negativen Gesamtarms; sie wurden nicht nachträglich als einziges erfolgreiches Portfolio ausgewählt oder in eine neue Holdout-Auswahl umgedeutet.
## Korrektheit und Wirksamkeit
Alle 53.188 finanzierten Modellabschlüsse passen exakt zu ihren gespeicherten Quellabschlüssen; kein unbekannter Return und kein Eintritt, der die unabhängig nachgerechnete eigene Richtungsbewertung/Last-N-Prüfung verfehlt. Größte Abweichung der aus Float32-Preisen rückgerechneten Kosten: 1,18e−7; kein zweiter Kostenabzug. Die vollständige Stundenreferenz prüft 221.268 Config-Entscheidungen über alle zwölf Stunden einschließlich nie bestandener Configs: keine Abweichung, keine unerklärten Übergänge. `validLastN=15` und Range-Last-N 75/PF1,35 bleiben aktiv; das separat konfigurierbare Quellen-Last-N steht wie zuvor auf 0.
Der Registry-Nachtest umfasst alle 1.972 Quellen, 38.402 zulässigen Bot/Lane-Paare, 638.960 synthetische Identitätszellen und je 5.916 positive/negative eigene Stundenentscheidungen. Auf 20 nativen Symbolen mit 96h Geschichte stimmen alle sechs Stunden-Präfixe und drei unvollständigen höheren Balken (7/17/37 Minuten) mit den kausalen Gesamtzuständen überein: beide Läufe vollständig, null Verstöße. Das ist Korrektheits-, keine profitable Portfolio-Evidenz.
Lokal bestanden: 27 unabhängige Skript-/Stunden-/Funding-Tests, 21 gezielte und 168 Integrationsfälle, vier echte Browser-Funktionsfälle auf Desktop/Telefon, Typecheck, Build von App und Worker, geänderte Lint-Dateien ohne Fehler (vier vorherige Runtime-Warnungen). Worker-SHA256: `01e384633aeed37f363d2c1f130d5086a29e2d85003558a2c638da0b0d135280`. Die anfängliche CI-UI-Race sah nach Sichtbarkeit bei Hydration kurz keinen Save-Knopf; die unmittelbare Zählabfrage wurde durch eine weiter erforderliche Locator-Zustandsprüfung ersetzt. Lokaler erster Browserstart hatte kein ausführbares Binary, der alte Single-Process-Wrapper schloss beim Context-Wechsel; der dritte Lauf mit intaktem Mehrprozess-Browser bestand. Alle Versuche werden erhalten. Maßgeblicher kompletter GitHub-Status: [PR191](https://github.com/mxssnx-creator/CTS-A-O/pull/191), nicht eine Behauptung vollständiger CI-Erfolge zum Berichtszeitpunkt.
Rechenmessung (24 Symbole × 48h, 1/5/15m): 868 ursprüngliche Micro/Inverse-Varianten kalt 1,79s und warm 18,27ms/Pass; 980 mit Ergänzungen kalt 2,04s und warm 19,28ms. Prozessmaximum zusammen 344,5MiB; keine getrennte Peak-Speicher-Differenz ableitbar. Vollständige Modellläufe brauchten 64,4 bzw. 113,9s; verschiedene Config-Anzahlen und parallele Korrektheitsarbeit erlauben keine isolierte Laufzeitkausalität. Dies ist keine Aussage zu Live-Latenz.
## Reproduktion
Autoritativer Source-Manifest-Hash: `02c34224ab02d7e9a70a9480c7756d4eb25ddfc0da2f33b6cee99ba38da9cb5a`, veröffentlicht im Quellstand von PR191. Die vor dem Commit eingefrorenen Protokolle nennen den damaligen HEAD41c9689; ihre einzelnen Datei-Hashes enthalten bereits die vollständige Erweiterung und wurden vor jedem Lauf geprüft. Vollständiger Quellstand ist über den Git-Verlauf wiederherstellbar. Feed-SHA256: `f79fa937c5649168cfc0dd9fad80324c6d08cecdc8cc9429fbc13ef00964fc03`.
`result.json` enthält Stunden, Fundierungsnachweise, Range-/Stufen-Zählungen, positive Einzelgruppen und alle Registry-Ergebnisse. Das Evidence-Archiv mit Dateimanifest enthält beide vollständigen Rohberichte samt geprüften All-Candidate-Tapes, Stundenentscheidungen, Order-/Zuteilungs-Sidecars, Originaldatenantworten, eingefrorenen Protokollen und fehlgeschlagenen Versuchen. Base-Paar-Zahlen sind ausdrücklich keine vollständigen Schutz-Config-Pass-Zahlen.

Archiv prüfen und entpacken: `sha256sum validation-evidence.tar.xz` mit `validation-evidence-manifest.json` vergleichen, danach `tar -xJf validation-evidence.tar.xz`. Alle 133 Dateien wurden einzeln gegen das Manifest geprüft (null fehlend/abweichend).
