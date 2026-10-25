# Signals and Trailing regression verification — 25 October 2026

The original positive 12-hour result is reproduced exactly. No Signal/Trailing economic regression was found against the 24 October 150-hour own-grid study. Tighter stop experiments were never production defaults; original stops, fees and qualification gates remain unchanged.

Source under test: `df96f8cbbf93d5d1c678e0d9bc594d8e0193c161`; economic source fingerprint `3d99231e34678de8c3213faaa19a81204d3dd415376b369201cddfe910d11d40`. Earlier source fingerprint `619ba50f37a7c1e9c8a10ee5167a37baf44306b48b32df7a198f0b10c3cf781e`. Identical actual settings, WF options, symbols, feed and window. Offline funded model; no new venue orders or live profitability claim.

12 symbols; 150h historical evaluation; Last-4 Signals/Exit; 1m prices; 16 October 23:00–17 October 11:00 Europe/Vienna. DCA/Block disabled in this frozen comparison.

| Group | Configs | Positions opened / closed / held | Orders opened / settled / held | Earlier PF | Current PF | Configs with Last-4 context |
|---|---:|---:|---:|---:|---:|---:|
| type: exit | 122 | 7 / 1 / 6 | 35 / 7 / 28 | 0.486516 | 0.486516 | 98.36% |
| strategyRange: Exit | 122 | 7 / 1 / 6 | 35 / 7 / 28 | 0.486516 | 0.486516 | 98.36% |
| type: normal | 33,813 | 8 / 5 / 3 | 42 / 39 / 3 | 3.428739 | 3.428739 | 79.07% |
| strategyRange: Signals | 159,993 | 12 / 6 / 6 | 401 / 332 / 69 | 3.058940 | 3.058940 | 78.46% |
| type: trailing | 106,290 | 10 / 4 / 6 | 299 / 239 / 60 | 2.549281 | 2.549281 | 78.22% |
| type: trailing-only | 19,890 | 7 / 4 / 3 | 60 / 54 / 6 | 6.846530 | 6.846530 | 78.73% |

Group position counts overlap; do not sum them. Whole account: **14 positions opened / 6 closed / 8 held; 436 orders opened / 339 settled / 97 held**. Settled unit PF **2.907107**; cash-weighted diagnostic PF **2.703943**. Ending equity **$10.010962** from $10, peak minute-marked loss drawdown **0.292961%**, maximum equity drawdown duration **6.933h**.

## Why the displayed figures can differ

The progress log reports PF **1.07 including 97 open endpoint marks** (436 records). Settled funded PF **2.907107** uses 339 completed orders. These have different populations. Conventional Return PF is neutral at **1**; values between 0 and 1 are losing. The new **PF edge = PF − 1** display is neutral at zero and retains unavailable/no-loss states. Qualification thresholds still use conventional PF.

Signals uses its own configured candidate grid, ranked by its own historical contexts, plus independent Exit. Ordinary processing uses enabled ordinary strategy ranges plus Exit and excludes Signals. This routing is now explicit in Settings for classic and coordinated Signals.

## Completeness and correctness

- All **160,115 configs**, **118 sources**, **884 source/lane identities**, **12,609,576 historical closes**, and **122/122 Exit configs** processed; zero missing configured cells.
- Last-4: **125,652/160,115 configs (78.48%)** have a ready context; exact contexts **1,193,674/3,842,760 (31.06%)**. Readiness is not qualification: endpoint **7,221 configs / 9,822 contexts** pass all gates.
- All **68 native checks**, **49,955,880 independent scalar comparisons**, **29 frozen-study comparison checks** pass.
- Every stored field of **339 funded closes**, **97 held orders**, and their allocations matches the archived original exactly; matching hashes are in `exact-orders.json`.
- Every hourly gate, group summary, configuration execution context and admission decision matches the original. No missing/unknown allocations or tape-return mismatches.

## Hourly settled outcomes

| Vienna hour start | Settled orders | Unit return PF | Positions opened / closed / held | Orders opened / settled / held |
|---|---:|---:|---:|---:|
| 16 Oct 23:00 | 26 | 1.671636 | 9 / 1 / 8 | 223 / 26 / 197 |
| 17 Oct 00:00 | 90 | 0.258596 | 0 / 0 / 8 | 14 / 90 / 121 |
| 17 Oct 01:00 | 14 | 0.932339 | 0 / 1 / 7 | 18 / 14 / 125 |
| 17 Oct 02:00 | 16 | 6.001968 | 1 / 0 / 8 | 18 / 16 / 127 |
| 17 Oct 03:00 | 22 | 0.001349 | 0 / 0 / 8 | 4 / 22 / 109 |
| 17 Oct 04:00 | 4 | 0.340098 | 0 / 0 / 8 | 4 / 4 / 109 |
| 17 Oct 05:00 | 8 | 0.096185 | 4 / 0 / 12 | 43 / 8 / 144 |
| 17 Oct 06:00 | 119 | 14.061163 | 0 / 2 / 10 | 112 / 119 / 137 |
| 17 Oct 07:00 | 32 | 11.491601 | 0 / 1 / 9 | 0 / 32 / 105 |
| 17 Oct 08:00 | 5 | No losses | 0 / 1 / 8 | 0 / 5 / 100 |
| 17 Oct 09:00 | 3 | No losses | 0 / 0 / 8 | 0 / 3 / 97 |
| 17 Oct 10:00 | 0 | – | 0 / 0 / 8 | 0 / 0 / 97 |

Six positive, five negative and one empty settled unit-return hours. Cash-weighted hours are eight positive, three negative and one flat. Exit PF **0.486516** and 15m PF **0.423** remain losing; 1m has no executed orders. These are preserved, not tuned away on this reused window.

## Runtime and verification

Computation **565.316s** (earlier **600.663s**); native/report wall **600.361s** (earlier **638.379s**); child peak RSS **4090.27 MiB** (earlier **4092.84 MiB**). Independent audit **93.113s**, peak RSS **674.62 MB**. These are separate runs on a shared host, not a controlled speedup claim. No history, precision, config or gate was removed.

268 focused core tests and 15 accounting/comparison tests pass locally; types, production build and scoped lint pass. CI quality at this exact code head passes **721 script/browser tests + 84 app/component tests**, with 8 template skips. Desktop/phone rendering and settings save pass. Local browser setup failed because Chromium was absent and downloads returned invalid archives; successful CI browser evidence is separate. Full CI passes **4,298 tests**, zero failures/cancellations, eight template skips; two ordinary slow exclusions pass in the separate slow job. Exact-Signal and endpoint workflows also pass. See `verification.json`.

Reproduce:

```sh
node --experimental-strip-types --no-warnings scripts/prepare-signals-last4.mjs runs/NEW_REGRESSION 150
python3 scripts/run-signals-native-case.py runs/NEW_REGRESSION last4
node scripts/compare-signal-regression.mjs docs/signals-own-grid-150h-20261024/receipts/last4 runs/NEW_REGRESSION/last4 comparison.json
```

No production trading settings were changed, no experiment was promoted, and no live connection was reloaded during this verification.

[Full raw evidence archive](https://chatgpt.com/library?file_id=libfile_f41ae4bc461881919a6ca64ff42214dd&account_id=personal). Archive integrity is recorded in `archive.json`.

Code merged via PR199 as `ecf384a25f6ccaf967cd69817d27b962c29c42a3`; previous main is backed up as `backup/main-before-ready-20261025`. No live deployment/reload was performed.
