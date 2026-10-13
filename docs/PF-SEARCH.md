
## 21. Base-stage calcs corrected; after-Base and after-validation PF per range (13 Oct, ~18:40Z)

Operator: "PF before stage Base under 1 is normal — good values after validations at Base; make sure calcs and
processings are completely correct; count of passed matters, and continuous stability." Found and fixed (commit
63ef6c5, each with a test that fails on the previous commit):

- **Pooled PF of no-loss sets.** `profitFactor` returns the `PF_NO_LOSS` sentinel (4) when the gross loss is 0, and the
  pooling reconstructed gross sums from (pf, net), giving every no-loss set a phantom loss of net / 3. Pooling now uses
  the gross loss itself when the set knows it (`grossOfStat`; `cellStats` and the seat evaluation carry gp / gl). Affects
  the "PF of passed" column at Base and validation; rare at Base (0 of 673 D1 survivor rows at exactly 4).
- **Passed count under `grid.allSets`.** The measurement pairs were counted as passed (350/920 for 219 real passes).
  They are `baseBuilt` now, never `basePassed`.
- **"Cells held back by the Base gate" under allSets.** 22,800 were lane-floor cells (General / Long on 1 m and 5 m
  lanes) mislabelled `baseRange` because the builder tested the gate before the lane floor. Precedence fixed; the tapes
  built are unchanged.
- **Eval basis.** eval-gate scores every order at one unit (`r / mult`) and says so; with Block off (its setting) the
  figures are unchanged, so every D1 figure in sections 19–20 stands.
- **Continuity.** `status.baseHistory` keeps the passed count of the last 48 computes per range; the events table is the
  long record (x01: 362 computes today, Minimal 44 → 46 / 794 drifting with new bars, the other ranges flat; orders per
  compute 16,485–16,804, armed 4–5).

**12-symbol session after the fixes (6 h + 6 h, defaults, `checks: 62/62 ok`), per range — Base PF of the validated
pairs (pooled, corrected) → validation PF of the validated sets → executed PF (unit):**

| range | Base PF | pairs validated | validation PF | sets validated | orders PF | orders |
|---|---:|---:|---:|---:|---:|---:|
| Wide | 1.38 | 14 of 154 | 3.91 | 1 of 320 | 0.10 | 20 |
| Micro | 1.44 | 12 of 640 | 2.60 | 244 of 3404 | 0.35 | 815 |
| Minimal | 1.39 | 44 of 794 | 1.93 | 678 of 9530 | 0.41 | 2309 |
| Short | 1.42 | 25 of 89 | 1.45 | 90 of 4816 | 1.32 | 199 |
| General | 1.42 | 35 of 89 | 1.49 | 984 of 9138 | 0.63 | 2290 |
| Long | 1.54 | 37 of 89 | 1.58 | 2249 of 14256 | 0.87 | 4858 |
| Signals | 0.81 | 126 of 126 | – | 136 units active | 0.98 | 65 |

After Base and after validation every engine range is above 1.38; the executed book is below 1 in every range but
Short. The loss is at execution (section 20: entries taken at the configs' equity peaks, crowding), not in the
calculations. D1 per type × range (16 h and 48 h holds, unit basis): every Normal and Trailing cell of every range has
orders in every window; none holds PF ≥ 1 across the five windows (best Micro Normal 0.78 pooled). DCA, DCA Active and
Axis build Wide cells only (`dcaProtectGrid`); the session default runs Axis off, x01 runs it on.

**allSets on this host:** 12 symbols reached 7.4 GB and aborted three times at the lightest memory level beside the
desk (5.2 GB). Eval-only; not queued again here. **Stability rule:** heavy evals one at a time, never beside the desk
above ~6 GB (today's 8 desk fallback steps all coincided with evals or the allSets session).
