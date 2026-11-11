# Positionsfenster: überprüfbare Nachweise

Die Archive enthalten den vollständigen Replay und frühere fehlgeschlagene bzw. unterbrochene Versuche.
`test-manifest.json` enthält Dateiprüfsummen und unveränderte Test-Footer. Ein fehlender Footer ist kein Pass.
Gezielte Wiederholungen überlappen mit den drei vollständigen Core-Shards und dürfen nicht als weitere
eindeutige Tests addiert werden. `market-summary.json` hält Kandidatenbereitschaft, post-Base-Validierung
und nachfolgende modellierte Ausführung getrennt. Venue-Ausführung ist nicht nachgewiesen.

Reproduktion der Offline-Korrektheitsprüfungen aus dem Repository:

```sh
CTS_CORE_TEST_WORKERS=2 node scripts/test-core.mjs --test-shard=1/3
CTS_CORE_TEST_WORKERS=2 node scripts/test-core.mjs --test-shard=2/3
CTS_CORE_TEST_WORKERS=2 node scripts/test-core.mjs --test-shard=3/3
CTS_CORE_TEST_WORKERS=2 node scripts/test-core.mjs --slow
CTS_UI_TEST=0 npm test -- --without-core
npm run typecheck
env -u DATABASE_URL npm run build
```

Die Slow-Prüfungen wurden zusätzlich einzeln mit demselben Offline-Runner und positiven Namensfiltern
ausgeführt. Dessen temporärer Wrapper ergänzte nur TAP-Ausgabe und wählte je einen der drei Slow-Fälle.
Die Produktionsgates, Assertions und Berechnungen blieben vollständig erhalten. Historische Contract-Fixtures
mit explizitem `positionWindows: null` reproduzieren das alte Zeitfensterverhalten; dies schaltet die neue
Produkt-Policy nicht ab.

Der Markt-Replay verwendet den bereits untersuchten öffentlichen Binance-Feed aus
`docs/execution-audit-20261030/evidence/feed-8-symbols-24h.json.gz`: genau acht Symbole,
8. Oktober 2026 12:00 UTC bis 9. Oktober 12:00 UTC, zwölf Stunden Vorlauf und zwölf Stunden Handel,
ohne weiteres Warmup. Wiederholungen sind keine unabhängigen Holdouts. Die eingefrorenen Parameter
wurden nicht anhand des beobachteten PF nachjustiert. Leere qualifizierte Kohorten bleiben leer.

GitHub-Veröffentlichung erfolgt über die vorhandene Verbindung. Die entfernten Git-Trees werden gegen
die lokalen Git-Trees geprüft; unterschiedliche Commit-Kennungen durch API-Autorschaft ändern keine Datei.
PR #258 enthält die Publikationskette und die automatischen Checks. Der persistente verarbeitete
Base→Main→Real-Paper-/Venue-Adapter und sein sichtbarer Konflikt-TODO bleiben ausdrücklich offen.
