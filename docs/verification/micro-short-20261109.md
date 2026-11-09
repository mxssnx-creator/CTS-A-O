# Micro / Short verification checkpoint — 9 November 2026

Source: main at 6d845cfdd1701e3f69d51a4de0e79360e31e1abe.
This checkpoint adds verification evidence, not a new trading preset.

The focused offline run exercised the legacy and first-class Micro indications,
context combinations, Micro/Inverse order identity, Base/execution protection-grid
parity, trailing-only cells, configured costs, DCA leg charges and owned settlement.
It completed 37 passing checks and one expected-failing processed-stage regression.
The synthetic fixtures do not measure market profitability.

The remaining regression is material: conflict-rejected raw candidate wins can
still qualify a configuration whose own processed Last-12 is losing. The persistent
Main → Real adapter remains unfinished in the runtime and walk-forward engine.
A primitive ProcessedSetBook and passing indication calculations do not resolve it.
The expected failure remains enabled in processed-main-conflict.test.ts.

Command:

    node --require ./scripts/lib/core-test-offline-guard.cjs --experimental-strip-types --no-warnings --test src/core/indications/micro.test.ts src/core/indications/micro-family.test.ts src/core/indications/micro-context.test.ts src/core/micro-order-identity.test.ts src/core/sim/micro-cost-trailing-audit.test.ts src/core/sim/processed-main-conflict.test.ts

No market replay, default optimization or exchange orders are claimed for CTS-A-O
in this checkpoint. The CTS-G 12-symbol parameter study is a different engine and
cannot establish CTS-A-O performance. Micro target units also remain engine-specific.
