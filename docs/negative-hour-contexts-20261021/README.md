# Zusätzliche Kontexte aus negativen Stunden
Die Erweiterung ist technisch funktionsfähig. Der neue zeitlich spätere Vergleich ist insgesamt schlechter: PF 0,810 → 0,453. Ein durchgehend positiver Ausführungs-PF ist **nicht erreicht**. Verluste, leere Varianten und alle ursprünglichen Quellen bleiben erhalten.
**Haltedauer beachten:** Die älteren Trainingsgewinner verwendeten maximal60Minuten. Ihre PFs belegen keine Micro15-Profitabilität. Das neue Folgefenster bewertet eigenständig maximal15Minuten. Nur Micro15: Original144 Abschlüsse/PF0; erweitert2.811/PF0,002830.

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

## Zusammenführung mit PR184 und erneut gemessener Stand

Die Historien-Korrekturen aus PR184 sind im gemeinsamen Quellstand enthalten: Ranking nutzt im Offline-Replay den eingefrorenen Zeitstempel, frühere vom Aufrufer verlangte Grenzen bleiben erhalten, der 5m-Change-Ranker bekommt native/aus abgeschlossenen1m-Kerzen aggregierte5m-Historie. Live behält die normale Uhr. Der Launcher kennzeichnet BingX-, Binance- und unbekannte Inputs korrekt. **Erratum:** In den ursprünglichen02c-Protokollen war `feed.provider` noch pauschal als Binance beschriftet, obwohl Feed-SHA, Sammlung und dieser Bericht durchgehend BingX belegten. Die ursprünglichen Protokolle bleiben unverändert; die neue Vorbereitung wurde mit allen drei Herkunftsfällen getestet.

Neuer Source-Manifest-Hash: `7368ba50ac6b77790d156c0d1ed509cc06fb1a6441cd5cdcee0d8712983dabb0`. Beide Markt-Vergleichsarme wurden mit unveränderten Formeln/Gates/Settings/Symbolen erneut vorbereitet und ausgeführt. Fundierte Abschlüsse, Renditen und alle Stundenwerte sind exakt unverändert. Beide vollständigen Stundenreferenzen und sämtliche Eintritts-/Quellprüfungen bestehen erneut. Auch der gesamte Registry-Nachtest (einschließlich unfertiger höherer Balken) wurde auf diesem Stand wiederholt: vollständig, null Verstöße. 334 integrierte Kernfälle und acht Ranking-/Feed-/Herkunftsfälle, Types, Lint und Build bestehen. Der Worker-Hash bleibt gleich, da diese weiteren Änderungen den Replay-Ranker im Server/Launcher betreffen. Siehe `integrated-verification.json` und `integrated-universal-plan.json`; endgültiger GitHub-Status steht am exakten PR191-Head.

Der endgültige integrierte Browserlauf besteht ebenfalls4/4. Ein vorheriger paralleler Launcher endete ohne Abschlussnachweis und wird nicht als Pass gezählt. `integrated-receipts.tar.gz` enthält die neuen Protokolle, vollständigen Prüfbelege und Test-/Fehlversuchslogs. `integrated-candidate-parity.json` prüft zusätzlich **jede** gespeicherte Kandidatenzeile jeder Config sowie jedes Feld jedes finanzierten Abschlusses gegen das ursprüngliche vollständige Archiv: alle identisch. Die identischen großen Datenarrays werden deshalb nicht doppelt gespeichert. `pull-request-review.json` dokumentiert die offenen Branches; historische, divergierte Experimente mit anderen Kosten/Stops/Koordinations-Defaults werden nicht als pauschal geprüft oder gemergt ausgegeben.

In `training-aggregate.json` bezeichnet `pfConvention=no-loss-score` den bisherigen internen Score4 bei positiven Gewinnen und null Verlustsumme. Er ist kein endliches gemessenes Verhältnis; `ratio` bedeutet dagegen wirklich GP/GL. Jede Gesamt- und Stundenzeile ist entsprechend gekennzeichnet.

## Zwei Fehler aus der vollständigen CI1205182

Die vollständige Suite des Zwischenstands1205182 meldete zwei Fehler; `ci-failure-1205182.txt` erhält den Befund. Vier selektive1/15- und1/5/15-Retest/Tactic-IDs blieben im bisherigen Schock-/Erholungs-Testmarkt leer. Ein zusätzlicher kontrollierter Trend mit breiter, gleichmäßiger Intrabar-Range prüft jetzt jede der28 Retest/Tactic-Profil-/Subset-/Mirror-Identitäten mit echten Long- und Short-Onsets. Keine Formel, PF-Grenze oder Markt-Auswahl wurde angepasst; der universelle Richtungstest besteht damit ohne Ausnahmen.

Der Preset-Backtest deklarierte ein Ende zur vollen Stunde, ließ aber frische und gecachte Minuten danach in die Historien einfließen. Bei einer späten Teilkerze verdrängte das einen vollständigen15m-Historienbalken (1055 statt1056). Jetzt werden Cache-Fähigkeit, Historienabruf und alle Eingabe-Views am deklarierten Ende begrenzt. Der synthetische Loader verwendet denselben Zeitbezug und endet auf der letzten abgeschlossenen Basiskerze. Der reichere Cache bleibt für andere Leser erhalten. Zwei deterministische13-Minuten-Fälle (frisch/gecacht) scheitern beide auf dem unveränderten alten Quellstand und bestehen mit der Korrektur. Normal/Exit-Kohortenparität und die lange Signal-Historie werden erneut geprüft. Keine Verkürzung des Signal-Auswahlfensters und keine Anpassung wirtschaftlicher Formeln nach dem Folgefenster.

## Abschließende Wiederholung auf dem korrigierten Preset-Stand

Wirtschaftlicher Source-Hash: `15bee9d6359df10deefc71f511eba0604f2dacb674c9303add46a08ccc0cb4dc`. Die Zusammenführung des parallel aktualisierten main0ac änderte diese wirtschaftlichen Dateien nicht. Erneut exakt gleiche Kandidaten-/Fundierungs- und Stundenwerte: Original15.607/PF0,810; erweitert37.581/PF0,453. Alle2.298.898 Kandidatenabschlüsse und sämtliche Felder der53.188 finanzierten Abschlüsse stimmen mit dem vollständig erhaltenen ursprünglichen Archiv überein. Keine ausgelassenen/zusätzlichen ursprünglichen Trades; keine unbekannte Fundierung/Rendite.221.268 vollständige stündliche Config-Entscheidungen, alle Eintrittsprüfungen und alle1.972 Quellen-Präfixprüfungen bestehen erneut ohne Abweichung. `final-verification.json`, `final-candidate-parity.json` und `final-receipts.tar.gz` erhalten den Nachweis. Der erste Code-CI-Lauf39553037021 auf e274b11 endete im unten dokumentierten Node24-Abbruch. Maßgeblicher Folge-Lauf:39556680253 auf8a8c364; vollständig erfolgreich einschließlich beider Langläufer. Die neue Uhr-Korrektur beseitigt einen Datenfehler, macht die beobachteten späteren Verluste aber nicht zu Gewinnen.


## Welche Configs gewinnen in den negativen Stunden des neuen Laufs?

`negative-hour-15m-summary.json` und das vollständige `negative-hour-15m-diagnostics.json.gz` werten ausschließlich die finanzierten, abgeschlossenen Modellorders aus. Negative Stunden sind hier rückblickend **pro Arm** definiert: Original13/14/15/20UTC, erweitert13/14/15/18UTC am20.10.2026. Es sind unterschiedliche Stichproben, kein direkter Gewinnervergleich zwischen den Armen. Weder pro Einzelstunde noch über diese Stunden zusammen gibt es eine positive Micro15-Config/Richtung. Die vollständigen negativen und unzureichenden Gruppen bleiben erhalten.

Beispiele positiver Quell-/Range-/Typ-/Richtungsgruppen im erweiterten Arm über dessen negative Stunden:

| Indikation | Range / Typ / Richtung | Abschlüsse | Unterschiedliche Onsets | Netto-Rendite-PF | Max. Hold |
|---|---|---:|---:|---:|---:|
| Inverse1×5×15 Relative Activity Acceleration Selective | General / Trailing / Long |455|10|1,572|240min|
| Inverse1×5×15 Relative Activity Acceleration Selective | General / Normal / Long |185|8|1,702|240min|
| Inverse5×15 Break Close Fast | Minimal / Trailing / Short |442|15|11,609|120min|
| Inverse5×15 Break Close Fast | Minimal / Trailing-only / Short |304|8|8,037|120min|

Diese Gruppen sind **nachträglich** auf Verluststunden ausgewählt. Die hohen PFs sind keine unabhängige Bestätigung, und viele Schutz-Configs teilen dieselben Onsets. Exakte Config-IDs, Richtungen, Stunden, GP/GL, Netto und Onset-Anzahlen stehen vollständig im komprimierten Detail. Ursprüngliche inverse5m-Break-Close-Gruppen sind ebenfalls teilweise positiv, haben aber nur1–3 unterschiedliche Onsets und keine Verlustsumme; deshalb wird dort kein endlicher gemessener PF erfunden. Keine Quelle, Schwelle oder Config wurde anhand dieser neuen Auswertung verändert.

`micro15-cost-decomposition.json` erklärt die Micro-Stichprobe auf identischen Abschlüssen: Original144/0 positive Nettoabschlüsse; erweitert2.811/102. Die gesamten Micro15-PFs sind0 bzw.0,002830, vor der unverändert einmal berücksichtigten Kostenpauschale diagnostisch0 bzw.0,007847. In den negativen Stunden verliert Micro sogar vor Kosten: Original144 Abschlüsse auf3 unterschiedlichen Onsets; erweitert2.607 auf18. Das belegt eine starke Wiederholung verlierender Signale über verwandte Configs. Die Eintrittsprüfungen zeigen gleichzeitig, dass diese Orders zu ihrem damaligen Eintritt die eigene historische Qualifikation bestanden. Historischer PF ist damit kein garantierter PF der späteren Abschlüsse. Die Produktions-Kostenannahme bleibt0,0015; sie wird weder angepasst noch als alleinige Ursache ausgegeben.

Die neue Diagnose prüft Fundierungsidentität,15-Minuten-Hold, endliche explizite Einheitsrenditen, exakte Stundenmitgliedschaft und Summenerhaltung in allen vier Gruppierungen. Die Zusammenfassung enthält auch Null-Gewinnerzahlen. Diagnose-Skripte und Logs liegen mit den eingefrorenen Rohdatenbezügen im finalen Receipt-Archiv.

## Node24-Abbruch und begrenzter Test-Workaround

Auf e274b11 bestanden Types/Lint/Build und3.130 Kernfälle. Der Prozess von `pool-cancel.test.ts` brach anschließend mit `jit_page_->allocations_.erase(addr) == 1` in V8 ab. Der Originalausschnitt ist in `ci-node24-failure-e274.txt` erhalten. Dies entspricht dem gemeldeten Runtime-Problem [nodejs/node#66366](https://github.com/nodejs/node/issues/66366). Der Kern-Testprozess verwendet auf Node24 nun den V8-CLI-Schalter `--no-wasm-code-gc`; begrenzte Compiler-Wrapper bleiben bis zum Ende des jeweiligen Testprozesses bestehen. Keine Tests werden übersprungen oder neu versucht, und kein produktiver Worker-/Gate-/Renditeparameter wird geändert. Der reale Runner-Spawn besteht4/4 und zugehörige Abbruch-/Ownership-/Prioritäts-/Speicher-/Modulkopie-Fälle22/22. Der vollständige Folge-Lauf39556680253 ist erfolgreich abgeschlossen:690 Scriptfälle bestanden/8 übersprungen,83 Appfälle bestanden,3.132 Kernfälle bestanden/2 Langläufer im Standardlauf übersprungen und anschließend beide separat bestanden. Types, Lint ohne Fehler, App-/Worker-Build und die unabhängige Signal-Prüfung39556680375 bestehen. Die Skip-Zahlen werden erhalten, nicht als getestete Fälle gezählt.

## Quellstand und Wiederherstellbarkeit der letzten Wiederholung

Die letzten eingefrorenen Protokolle nennen den lokalen Checkpoint269acdd. Dessen identischer veröffentlichter Git-Baum ist über Remote-Commit58fda5fb011f378a436defda76dc4c0560fbe510 mit Baum2ed391971c52ed9ffa6942f734be59ce5b46407b erhalten. Der spätere main0ac-Merge und der Node24-Test-Workaround ändern den wirtschaftlichen Source-Hash15bee nicht. Der finale Code-Head8a8c364 enthält Baum102f8521873def2020d8a34436b198f980d60475. Der Bericht trennt diese Git-Checkpoint-Identität von den einzeln geprüften wirtschaftlichen Datei-Hashes und von den unveränderten Markt-/Settings-/Trade-Daten.


PR191 wurde nach diesen Prüfungen als `e287e234b4b99022db0f1e04e0d38ace1695d225` in main zusammengeführt. Der Merge-Baum ist exakt der geprüfte Baum102f8521873def2020d8a34436b198f980d60475. Dieser abschließende Nachtrag ändert ausschließlich Berichte, Nachweise und den Operations-Handoff. Keine Live-Ausführung/kein Reload wurde durchgeführt; die negative wirtschaftliche Bewertung wird durch die erfolgreiche technische Prüfung nicht aufgehoben.
