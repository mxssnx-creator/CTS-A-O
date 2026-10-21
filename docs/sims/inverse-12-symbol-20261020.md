# Inverse – Endstand mit vollständiger Kontextvalidierung

Aktueller 24h-Lauf: **422 simulierte Abschlüsse aus 134 Konfigurationen, Return-PF 181.263 nach 0,15 % modellierten Kosten.** Einschließlich 21 offener Endmarkierungen beträgt PF 4.936. Alle zwölf Symbole wurden berechnet; ausgeführt wurde ausschließlich Trailing-Short auf 1m, auf APT, AVAX und DOT. Für Long liegt in diesem Fenster kein ausgeführter PF vor.

Die letzte Integrationskorrektur prüft alle Gates unabhängig je Konfiguration × Symbol × Richtung: Mindeststichprobe, PF/Netto, LCB, Zeitfenster, Last-N, Range-Last-N, Drawdown, Stundenanteil und Stabilität. Fremde profitable Stichproben können fehlende eigene Nachweise nicht ersetzen. Frühere Ergebnisse der partiellen Prüfung stehen ausdrücklich im Archiv unten und zertifizieren den Endstand nicht.

## Aktuelle eingefrorene Läufe

| Lauf | Base bestanden / geprüft | Tapes | Sets Start → Ende | Abschlüsse | PF | offene Endmarkierungen |
|---|---:|---:|---:|---:|---:|---:|
| inverse-full-context-6h | 53/290 | 14,776 | 26 → 0 | 0 | — | 0 |
| inverse-full-context-24h | 135/290 | 36,096 | 70 → 8 | 422 | 181.263 | 21 |
| inverse-full-context-long-history | 53/290 | 14,664 | 3291 → 3463 | 109 | 5.008 | 521 |

Standard: 24h breite Selektion, 120h Quellhistorie; zusätzliche feste Sensitivität: 336h Selektion und 360h Quelle. Schwellenwerte bleiben erhalten. Dies ändert nicht die Produktionsdefaults. Quellenhistorie und Kandidatenverlauf ändern sich gemeinsam; dies ist kein isolierter Profitvergleich oder unberührter Holdout. Jeder Lauf hat seinen eigenen kausalen Start, seine eigene Base-Auswahl und sein eigenes Simulationsbuch. Überlappende Läufe dürfen nicht addiert werden. Leere Kohorten haben keinen PF.

## Endmarkierungen der aktuellen Läufe

| Lauf | PF Abschlüsse | offene Positionen | Netto der offenen Positionen, Einheits-Prozentpunkte | PF Abschlüsse + offen |
|---|---:|---:|---:|---:|
| Standard 6h | — | 0 | 0 | — |
| Standard 24h | 181,263 | 21 | −44,265 | 4,936 |
| 336h Selektion / 360h Quelle, 6h Lauf | 5,008 | 521 | −303,317 | **0,228** |

**Die längere Historien-Sensitivität scheitert wirtschaftlich einschließlich offener Positionen.** Ihre 109 Abschlüsse (11 Long, 98 Short) allein dürfen nicht als erfolgreiches Gesamtresultat präsentiert werden. Die Produktionsdefaults werden deshalb nicht auf diesen Versuch umgestellt. Dauerhaft viele positive Ausführungen beider Richtungen und echte Live-Profitabilität sind weiter unbewiesen.

## 24h stündlich, Wien

| Stunde | Abschlüsse | PF | Netto, Einheits-Prozentpunkte |
|---|---:|---:|---:|
| 10-16 23:00 | 0 | — | 0.0000 |
| 10-17 00:00 | 0 | — | 0.0000 |
| 10-17 01:00 | 0 | — | 0.0000 |
| 10-17 02:00 | 56 | no-loss* | 13.6090 |
| 10-17 03:00 | 42 | no-loss* | 14.4419 |
| 10-17 04:00 | 70 | no-loss* | 28.8075 |
| 10-17 05:00 | 6 | 20.556 | 2.0992 |
| 10-17 06:00 | 62 | no-loss* | 30.2224 |
| 10-17 07:00 | 64 | no-loss* | 54.1499 |
| 10-17 08:00 | 42 | no-loss* | 16.7392 |
| 10-17 09:00 | 0 | — | 0.0000 |
| 10-17 10:00 | 0 | — | 0.0000 |
| 10-17 11:00 | 30 | no-loss* | 33.7402 |
| 10-17 12:00 | 0 | — | 0.0000 |
| 10-17 13:00 | 0 | — | 0.0000 |
| 10-17 14:00 | 5 | no-loss* | 5.5234 |
| 10-17 15:00 | 10 | 5.568 | 2.3862 |
| 10-17 16:00 | 0 | — | 0.0000 |
| 10-17 17:00 | 10 | no-loss* | 7.9839 |
| 10-17 18:00 | 13 | 4.764 | 2.2944 |
| 10-17 19:00 | 12 | no-loss* | 11.3815 |
| 10-17 20:00 | 0 | — | 0.0000 |
| 10-17 21:00 | 0 | — | 0.0000 |
| 10-17 22:00 | 0 | — | 0.0000 |

13 positive, 11 flache und 0 negative Stunden auf abgeschlossenen Einheitsrenditen. Offene Endmarkierungen verlieren -44.265 Einheits-Prozentpunkte und werden getrennt ausgewiesen. Diese Zählung belegt keine stündlich grüne Konto-Equity. Viele Konfigurationen handeln dieselben Marktbewegungen; 422 Abschlüsse sind keine 422 unabhängigen Marktereignisse.

## Aktuelle Symbol- und Quellenbelege

| Symbol | Abschlüsse | PF |
|---|---:|---:|
| ADA-USDT | 0 | — |
| APT-USDT | 158 | 240.831 |
| ARB-USDT | 0 | — |
| ATOM-USDT | 0 | — |
| AVAX-USDT | 10 | 10.756 |
| BCH-USDT | 0 | — |
| BNB-USDT | 0 | — |
| BTC-USDT | 0 | — |
| DOGE-USDT | 0 | — |
| DOT-USDT | 254 | 285.952 |
| ETC-USDT | 0 | — |
| ETH-USDT | 0 | — |

| Richtung | Abschlüsse | PF |
|---|---:|---:|
| long | 0 | — |
| short | 422 | 181.263 |

| Variante | Abschlüsse | PF |
|---|---:|---:|
| inverse-known-trend-ema | 0 | — |
| inverse-turn-trend-ema | 0 | — |
| inverse-known-trend-adx | 0 | — |
| inverse-turn-trend-adx | 0 | — |
| inverse-known-trend-st | 0 | — |
| inverse-turn-trend-st | 0 | — |
| inverse-known-break-don20 | 2 | 0.000 |
| inverse-turn-break-don20 | 0 | — |
| inverse-known-break-atr | 6 | no-loss* |
| inverse-turn-break-atr | 62 | no-loss* |
| inverse-known-act-burst | 0 | — |
| inverse-turn-act-burst | 0 | — |
| inverse-known-dir-vwap | 0 | — |
| inverse-turn-dir-vwap | 0 | — |
| inverse-known-move-impulse | 26 | no-loss* |
| inverse-turn-move-impulse | 2 | 0.000 |
| inverse-known-rsi-mom-14-20 | 0 | — |
| inverse-turn-rsi-mom-14-20 | 0 | — |
| inverse-known-bb-walk | 0 | — |
| inverse-turn-bb-walk | 0 | — |
| inverse-known-sar-std | 0 | — |
| inverse-turn-sar-std | 0 | — |
| inverse-known-macd-hist | 30 | 25.964 |
| inverse-turn-macd-hist | 0 | — |
| inverse-known-ema-9-21 | 0 | — |
| inverse-turn-ema-9-21 | 0 | — |
| inverse-known-cci-14-100 | 0 | — |
| inverse-turn-cci-14-100 | 0 | — |
| inverse-known-obv-20 | 0 | — |
| inverse-turn-obv-20 | 0 | — |
| inverse-known-kelt-20-1.5 | 0 | — |
| inverse-turn-kelt-20-1.5 | 0 | — |
| inverse-known-ichi-tk-9 | 0 | — |
| inverse-turn-ichi-tk-9 | 8 | no-loss* |
| inverse-known-hma-16 | 0 | — |
| inverse-turn-hma-16 | 0 | — |
| inverse-known-tactic-trend-s | 132 | no-loss* |
| inverse-turn-tactic-trend-s | 0 | — |
| inverse-zscore-20 | 154 | no-loss* |
| inverse-zscore-40 | 0 | — |
| inverse-impulse-20 | 0 | — |
| inverse-impulse-40 | 0 | — |
| inverse-acceleration-20 | 0 | — |
| inverse-acceleration-40 | 0 | — |
| inverse-regression-20 | 0 | — |
| inverse-regression-40 | 0 | — |
| inverse-wick-20 | 0 | — |
| inverse-wick-40 | 0 | — |
| inverse-failed-break-20 | 0 | — |
| inverse-failed-break-40 | 0 | — |
| inverse-consensus-20 | 0 | — |
| inverse-consensus-40 | 0 | — |
| inverse-market-residual-20 | 0 | — |
| inverse-market-residual-40 | 0 | — |
| inverse-market-shock-20 | 0 | — |
| inverse-market-shock-40 | 0 | — |
| inverse-market-aligned-20 | 0 | — |
| inverse-market-aligned-40 | 0 | — |

`no-loss*` ist der bestehende Sentinel 4 und kein exakt gemessener endlicher PF. Der Gesamt-PF 181,263 enthält gemessene positive und negative Renditen und ist kein Sentinel.

## Aktuelle Verifikation und offene Grenzen

Implementierung `4878badf253309aaa77df4b50261192fd5da42ae` integriert die vollständige Validierung aus Remote-Basis `fb62831ba73656d2289aaacf6eaf7e97523da89e`. 91/91 gezielte Tests einschließlich acht neuer Inverse-Prüfungen bestehen. Aktueller Typecheck, Produktionsbuild und Lint bestehen. Entwicklung und aktueller Produktionsbuild sind auf Desktop und Telefon geprüft: 4/4 mit sichtbarer Inverse-Auswahl und funktionierender Focus-Erweiterung, ohne Seitenfehler oder Überlauf.

SimExchange öffnet, schützt, aktualisiert und schließt alle 24 Positionen auf zwölf Symbolen in beiden Richtungen. DCA, DCA Active, Axis, trailing-only und botfreier Exit sind separat durch Funktionstests belegt. Der wirtschaftliche Replay bewertet Normal/Trailing und liefert nur für tatsächlich ausgeführte Trailing-Shorts Belege. Echte Börsen-Fills, finanzierte Mindestmengen/Margin, Konto-Equity-Drawdown und reale Live-Profitabilität sind nicht geprüft. Kein laufender Server, echtes Konto oder Deployment wurde geändert. Vorhandener Focus und unabhängige Live-Promotion-Tore bleiben erhalten.

Reproduktion mit Node `--experimental-strip-types --no-warnings`: `scripts/audit-inverse.mjs --feed /path/to/public-feed22-verified.json.gz --hours 24 --out runs/current`. Historien-Sensitivität: `--selection-hours 336 --source-hours 360`. Maschinenlesbare Protokolle, Quellen-/Feed-Hashes und aktuelle sowie archivierte Ergebnisse im benachbarten `.json.gz`; vollständige Ausführungen in `-executions.json.gz`.

## Archiv: supersedierter Stand vor vollständiger Kontextvalidierung

**Die nachfolgenden Zahlen und Prüfhinweise gehören nur zum früheren Stand. Sie zertifizieren den aktuellen Code nicht.** Alle ursprünglichen Nachweise und Verluste bleiben erhalten.

# Inverse – 12-Symbol-Prüfung, 20. Oktober 2026

**24h: 368 simulierte Abschlüsse, Return-PF 3.153 nach 0,15 % modellierten Kosten.** 16 positive, 3 flache und 5 negative Stunden. Einschließlich 153 offener Endmarkierungen beträgt PF 1.784. Die Long-Seite verliert (PF 0,545); ein durchgängig positiver PF je Richtung/Stunde und reale Live-Profitabilität sind nicht belegt.

## Implementierung

`Inverse` ist ein eigener Indikationstyp. Die Richtung wird vor dem Einstieg invertiert; vergangene Renditen werden nicht nachträglich negiert. 19 bestehende Quellen besitzen je eine direkte Gegenvariante und eine bestätigte Umkehrvariante. Zehn Mathematik-/Marktmethoden laufen mit je 20 und 40 Balken: Z-Score, Impuls, Beschleunigung, lineare Regression, Docht, Fehlausbruch, Konsens, Marktresiduum, Marktschock und marktgerichtete Rückkehr.

58 Quellen ergeben 290 unabhängige/gekoppelte 1-/5-/15-Minuten-Paare. Gekoppelte Spuren verwenden nur abgeschlossene höhere Balken bis 15 Minuten. Follow handelt die bereits invertierte Richtung; Revert kann sie nicht erneut umdrehen. Datenlücken/ungültige Balken setzen Indikatorzustand und 80-Balken-Aufwärmung zurück. Marktmethoden benötigen mehrere Symbole. Gemeinsame mathematische Serien und Marktinformationen werden pro Cache wiederverwendet.

Identität, Range, Ziel, Schutzkonfiguration, Symbol und Richtung bleiben durch die vorhandenen Base-/Konfigurations-/Last-N-/Ausführungstore erhalten. Inverse hat mindestens PF 1,1 oder den strengeren konfigurierten Range-Grenzwert. Einstellungen zeigen den Typ und können die 58 Follow-Basen zur bestehenden Focus-Auswahl hinzufügen. Bestehender enger Focus wird nicht automatisch erweitert.

## Protokoll und Kohorten

Zwölf Symbole: ADA-USDT, APT-USDT, ARB-USDT, ATOM-USDT, AVAX-USDT, BCH-USDT, BNB-USDT, BTC-USDT, DOGE-USDT, DOT-USDT, ETC-USDT, ETH-USDT. Abgeschlossene, öffentliche OHLCV aus dem restaurierten PR-164-Archiv; letzter Datenzeitpunkt 17. Oktober. Die Formeln wurden vor dem ersten Lauf festgelegt. Alle Läufe bleiben retrospektive Studien desselben bekannten Archivs, kein unberührter Alpha-Holdout.

120 Stunden Quellhistorie versorgen Aufwärmung und Last-N. Base/Selektion verwenden getrennt 24 Stunden; die kürzere WF-Prüfung bleibt bei sechs Stunden. Bestehende PF-, Stichproben-, Drawdown- und exakten Kontextprüfungen bleiben aktiv. Base-Zahlen zählen Paare, nicht alle Schutz-Zellen. Die wirtschaftlichen Läufe bauen Normal-/Trailing-Tapes; andere Strategien sind separat durch Funktionstests belegt. Standard-Inverse verwendet gemäß bestehender Micro-Regel nicht die exklusiven Micro-Zellen.

| Lauf (UTC) | Base bestanden / geprüft | aufgebaute Tapes | Konfig.-Pässe Start → Ende | Abschlüsse | Return-PF | positive / flache / negative Stunden |
|---|---:|---:|---:|---:|---:|---:|
| 10-17 03:00 → 10-17 09:00 | 131/290 | 33,352 | 717 → 689 | 144 | 4.715 | 4 / 2 / 0 |
| 10-17 09:00 → 10-17 15:00 | 84/290 | 20,768 | 677 → 136 | 36 | 17.671 | 3 / 2 / 1 |
| 10-17 15:00 → 10-17 21:00 | 53/290 | 14,776 | 86 → 293 | 92 | 7.209 | 3 / 2 / 1 |
| 10-16 21:00 → 10-17 21:00 | 135/290 | 36,096 | 912 → 301 | 368 | 3.153 | 16 / 3 / 5 |

Der 24h-Lauf überlappt die drei 6h-Fenster; seine Abschlüsse dürfen nicht zu diesen addiert werden. Alle Einträge und Endmarkierungen bestehen zum Aufnahmezeitpunkt die exakten Base-/Konfigurations-/Symbol-/Richtungstore. Nach Formatierung wurden sämtliche Abschlüsse und wirtschaftlichen Kennzahlen des letzten 6h-Laufs exakt reproduziert.

## 24 Stunden, stündlich (Wien)

| Stunde | Abschlüsse | PF | Netto, Prozentpunkte je Einheit |
|---|---:|---:|---:|
| 10-16 23:00 | 0 | — | 0.0000 |
| 10-17 00:00 | 0 | — | 0.0000 |
| 10-17 01:00 | 0 | — | 0.0000 |
| 10-17 02:00 | 6 | no-loss* | 4.3090 |
| 10-17 03:00 | 1 | no-loss* | 0.0116 |
| 10-17 04:00 | 35 | 2.774 | 5.2051 |
| 10-17 05:00 | 13 | 17.486 | 7.8673 |
| 10-17 06:00 | 1 | 0.000 | -0.1172 |
| 10-17 07:00 | 20 | 1.031 | 0.0790 |
| 10-17 08:00 | 81 | 23.017 | 42.9335 |
| 10-17 09:00 | 22 | 8.652 | 25.2500 |
| 10-17 10:00 | 1 | no-loss* | 1.4500 |
| 10-17 11:00 | 16 | 1.791 | 3.0621 |
| 10-17 12:00 | 39 | 11.061 | 3.5790 |
| 10-17 13:00 | 7 | 0.029 | -0.5640 |
| 10-17 14:00 | 53 | 2.238 | 27.4410 |
| 10-17 15:00 | 3 | 0.000 | -10.3000 |
| 10-17 16:00 | 18 | no-loss* | 8.7945 |
| 10-17 17:00 | 5 | 0.000 | -2.8801 |
| 10-17 18:00 | 6 | 0.587 | -2.6700 |
| 10-17 19:00 | 2 | no-loss* | 2.0000 |
| 10-17 20:00 | 19 | 44.884 | 12.5148 |
| 10-17 21:00 | 13 | 2.120 | 5.9700 |
| 10-17 22:00 | 7 | no-loss* | 2.8617 |

Netto ist die Summe modellierter Einheitsrenditen; keine Kontorendite und kein Dollar-Gewinn. Offene Positionen sind von den Abschlüssen getrennt. Der historische No-Loss-Sentinel 4 ist kein exakt gemessener endlicher PF; Tabellen kennzeichnen solche Stichproben mit `no-loss*`. Leere Stichproben haben keinen PF.

## 24h nach Richtung und Symbol

| Richtung | Abschlüsse | PF |
|---|---:|---:|
| long | 54 | 0.545 |
| short | 314 | 13.469 |

| Symbol | Abschlüsse | PF |
|---|---:|---:|
| ADA-USDT | 8 | 6.275 |
| APT-USDT | 4 | 22.606 |
| ARB-USDT | 45 | 97.699 |
| ATOM-USDT | 15 | 1.464 |
| AVAX-USDT | 7 | 0.202 |
| BCH-USDT | 59 | 0.247 |
| BNB-USDT | 4 | no-loss* |
| BTC-USDT | 0 | — |
| DOGE-USDT | 113 | 23.746 |
| DOT-USDT | 111 | 8.303 |
| ETC-USDT | 2 | no-loss* |
| ETH-USDT | 0 | — |

## Alle 58 Varianten im 24h-Lauf

| Variante | Abschlüsse | PF |
|---|---:|---:|
| inverse-known-trend-ema | 1 | 0.000 |
| inverse-turn-trend-ema | 0 | — |
| inverse-known-trend-adx | 4 | no-loss* |
| inverse-turn-trend-adx | 0 | — |
| inverse-known-trend-st | 0 | — |
| inverse-turn-trend-st | 0 | — |
| inverse-known-break-don20 | 3 | 0.200 |
| inverse-turn-break-don20 | 0 | — |
| inverse-known-break-atr | 2 | no-loss* |
| inverse-turn-break-atr | 0 | — |
| inverse-known-act-burst | 25 | no-loss* |
| inverse-turn-act-burst | 0 | — |
| inverse-known-dir-vwap | 0 | — |
| inverse-turn-dir-vwap | 0 | — |
| inverse-known-move-impulse | 3 | 21.263 |
| inverse-turn-move-impulse | 0 | — |
| inverse-known-rsi-mom-14-20 | 256 | 20.396 |
| inverse-turn-rsi-mom-14-20 | 0 | — |
| inverse-known-bb-walk | 1 | no-loss* |
| inverse-turn-bb-walk | 0 | — |
| inverse-known-sar-std | 0 | — |
| inverse-turn-sar-std | 0 | — |
| inverse-known-macd-hist | 6 | 2.361 |
| inverse-turn-macd-hist | 0 | — |
| inverse-known-ema-9-21 | 0 | — |
| inverse-turn-ema-9-21 | 0 | — |
| inverse-known-cci-14-100 | 0 | — |
| inverse-turn-cci-14-100 | 0 | — |
| inverse-known-obv-20 | 1 | no-loss* |
| inverse-turn-obv-20 | 0 | — |
| inverse-known-kelt-20-1.5 | 2 | 0.014 |
| inverse-turn-kelt-20-1.5 | 0 | — |
| inverse-known-ichi-tk-9 | 20 | 38.210 |
| inverse-turn-ichi-tk-9 | 0 | — |
| inverse-known-hma-16 | 0 | — |
| inverse-turn-hma-16 | 0 | — |
| inverse-known-tactic-trend-s | 1 | no-loss* |
| inverse-turn-tactic-trend-s | 1 | no-loss* |
| inverse-zscore-20 | 5 | no-loss* |
| inverse-zscore-40 | 0 | — |
| inverse-impulse-20 | 0 | — |
| inverse-impulse-40 | 0 | — |
| inverse-acceleration-20 | 0 | — |
| inverse-acceleration-40 | 0 | — |
| inverse-regression-20 | 22 | 0.109 |
| inverse-regression-40 | 0 | — |
| inverse-wick-20 | 0 | — |
| inverse-wick-40 | 0 | — |
| inverse-failed-break-20 | 0 | — |
| inverse-failed-break-40 | 0 | — |
| inverse-consensus-20 | 0 | — |
| inverse-consensus-40 | 0 | — |
| inverse-market-residual-20 | 5 | no-loss* |
| inverse-market-residual-40 | 2 | no-loss* |
| inverse-market-shock-20 | 0 | — |
| inverse-market-shock-40 | 8 | 1.088 |
| inverse-market-aligned-20 | 0 | — |
| inverse-market-aligned-40 | 0 | — |

RSI-Gegenhandel lieferte in diesem Fenster 256 Abschlüsse mit PF 20,396, Ichimoku 20 mit PF 38,210. Die Regressionsvariante lieferte 22 mit PF 0,109. Diese Auswertung erfolgt nach dem Lauf und ändert weder vorherige Auswahl noch erfasste Verluste. Kleine/no-loss-Stichproben sind kein belastbarer Grund für eine Live-Promotion.

## Performance und Prüfung

Alle 58 Varianten auf 36 Serien (12 Symbole × 1/5/15m, 120h) berechnen 6,347,520 Zustandswerte in 803.8 ms. Wiederholte Cache-Abfrage: 1.183 ms je vollständigem Durchlauf. Maximaler Prozess-RSS 382.4 MiB einschließlich geladenem Feed; keine inkrementelle Speicherangabe.

Der vollständige 24h-Historienlauf benötigte 342.0 s (Base 11.9, Tape-Aufbau 323.9, Walk-forward 6.2) bei 1811.3 MiB maximalem Prozess-RSS. Das ist keine Zusage einer Live-Zykluslatenz.

Acht neue Tests bestehen: Identitäten, Gegenrichtung, Kausalität, Datenlücken, Marktberechnungen, echte Worker/Serialisierung, zusätzliche Strategie-Tapes und Adapter-Lebenszyklus. Der Adaptertest öffnet 24 Positionen (12 Symbole × Long/Short), aktualisiert Schutzstops ohne Mengenänderung und schließt alle wieder. SimExchange verwendet ausdrücklich deklarierte synthetische Nachweise; dies sind keine realen Börsen-Fills. Weitere Integrationsprüfungen 57/57, Symmetrie-/Seiten-/UI-Helfer 17/17, UI-Funktion 4/4 und gezielte Desktop-/Telefon-Prüfung von Entwicklung und Produktionsbuild 4/4 bestehen. Testgruppen überlappen. Typecheck, Produktionsbuild und Lint bestehen.

Der erste UI-Lauf erfasste einen gemeinsamen Vite-Cache-Konflikt. Nach isoliertem Abhängigkeitscache bestand der vollständige erneute Lauf; die ursprünglichen Fehlerprotokolle bleiben lokal erhalten. Zielansichten wurden visuell geprüft.

## Reproduktion und Status

Implementierung: `5bfc6ca20029d6a66d40664fac53e5a1e5cd767d`, auf dem exakt gleichen Basistree wie `e9a432f58d0214f39f45df0a3ba2f3e8937e821b` (`codex/integrate-open-work-20261020`). Maschinenlesbare Protokolle, Source-/Feed-Hashes, Stunden-, Varianten-, Symbol- und Strategieergebnisse stehen in `inverse-12-symbol-20261020.json.gz`; vollständige modellierte Abschlüsse im danebenliegenden Gzip.

```sh
node --experimental-strip-types --no-warnings scripts/audit-inverse.mjs \
  --feed /path/to/public-feed22-verified.json.gz --hours 24 --out runs/inverse-24h
node --experimental-strip-types --no-warnings scripts/perf/inverse-indications.mjs \
  --feed /path/to/public-feed22-verified.json.gz
```

Keine laufende Instanz, echten Konten, Bestände, Live-Verbindungen oder Deployments wurden geändert. Kapitalbedarf, Margin, Mindestmengen und Equity-Drawdown sind in dieser Einheitsrendite-Studie nicht nachgewiesen. Live-Promotion bleibt an ihre bestehenden unabhängigen Modell- und Eigentumsnachweise gebunden.
