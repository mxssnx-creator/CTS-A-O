# V1: funnel per range (w-latest and w-rally)

Read from each run's session.md (`runs/<window>/session.md`, with the skip counts from `raw.json` → `engine.skipsByRange`, which the report's "Why candidates did not execute, per range" table prints). There was no rerun. Desk V1 (`desks/V1.json`); the windows are as in README.md.

Where each column comes from:
- **Base passed / evaluated pairs:** the run's "Base … per range, passed / evaluated pairs" line (bot × indication pairs).
- **Configs seated at run start:** configEval passed at the run start, the "Seat evaluation (configEval)" table. For Signals it is the units (pair × symbol × direction) active at the start.
- **Configs seated over the run:** the "Seated configs over the run window, by range and type" table (normal + trailing; Wide is Axis). For Signals it is the configs that entered while their unit was active, and the units active over the run.
- **Orders closed and PF incl. open:** one unit per order, with the open orders at the end marked at the last close (README.md).
- **Minimal:** this desk has no Minimal grid (`grid.minimal: false`), so the report has no Minimal row.
- **Skips:** they are counted per range and per first failed gate. The report prints only the gates with a non-zero count. No `gate`, `rangeOff` or `toggle` skip appears in either run. Signal confirmation (`coord.confirm`) is `sig:confirm`. Skips are not split by side.

## w-latest

| range | Base passed / evaluated pairs | configs seated at run start | configs seated over the run | orders closed | PF incl. open |
|---|---:|---:|---:|---:|---:|
| Minimal | off on this desk (no Minimal grid) | – | – | 0 | – |
| Micro | 179 / 5,900 | 3,447 | 3,447 | 87 | 0.37 |
| Short | 721 / 8,176 | 4,580 | 4,580 | 3,826 | 0.39 |
| General | 538 / 8,176 | 1,013 | 1,013 | 363 | 0.61 |
| Long | 548 / 8,176 | 1,000 | 1,000 | 267 | 0.51 |
| Wide | 398 / 19,072 | 266 | 266 (Axis) | 104 | 0.39 |
| Signals | 126 / 126 | 3,138 units | 3,622 configs · 5,595 units | 5,818 | 0.32 |
| Total | – | – | – | 10,465 | 0.34 |

Skipped candidates by first failed gate:

| range | skipped | crowd | lastN | engineSide | symPf | duplicate | sig:confirm | sig:duplicate | sig:signalPf | sig:signalSide | sig:signalCluster | sig:signalGuard |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Micro | 4,453 | 2,716 | 691 | 918 | 122 | 6 | 0 | 0 | 0 | 0 | 0 | 0 |
| Short | 22,279 | 0 | 13,993 | 3,019 | 3,722 | 1,545 | 0 | 0 | 0 | 0 | 0 | 0 |
| General | 3,850 | 0 | 2,553 | 807 | 383 | 107 | 0 | 0 | 0 | 0 | 0 | 0 |
| Long | 3,450 | 0 | 2,312 | 590 | 505 | 43 | 0 | 0 | 0 | 0 | 0 | 0 |
| Wide | 806 | 0 | 366 | 380 | 60 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Signals | 108,291 | 0 | 0 | 0 | 0 | 0 | 30,418 | 24,679 | 16,299 | 15,327 | 21,563 | 5 |
| Total | 143,129 | 2,716 | 19,915 | 5,714 | 4,792 | 1,701 | 30,418 | 24,679 | 16,299 | 15,327 | 21,563 | 5 |

## w-rally

| range | Base passed / evaluated pairs | configs seated at run start | configs seated over the run | orders closed | PF incl. open |
|---|---:|---:|---:|---:|---:|
| Minimal | off on this desk (no Minimal grid) | – | – | 0 | – |
| Micro | 106 / 5,900 | 1,715 | 1,715 | 108 | 0.49 |
| Short | 627 / 8,176 | 2,334 | 2,334 | 1,324 | 2.66 |
| General | 537 / 8,176 | 847 | 847 | 508 | 2.39 |
| Long | 668 / 8,176 | 1,438 | 1,438 | 590 | 3.09 |
| Wide | 269 / 19,072 | 316 | 316 (Axis) | 0 | – |
| Signals | 126 / 126 | 3,215 units | 3,591 configs · 5,250 units | 8,580 | 2.51 |
| Total | – | – | – | 11,110 | 2.55 |

Skipped candidates by first failed gate:

| range | skipped | crowd | lastN | engineSide | symPf | duplicate | sig:confirm | sig:duplicate | sig:signalPf | sig:signalSide | sig:signalCluster | sig:signalGuard |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Micro | 2,528 | 891 | 612 | 988 | 18 | 19 | 0 | 0 | 0 | 0 | 0 | 0 |
| Short | 6,726 | 0 | 4,058 | 1,299 | 675 | 694 | 0 | 0 | 0 | 0 | 0 | 0 |
| General | 2,176 | 0 | 1,442 | 257 | 235 | 242 | 0 | 0 | 0 | 0 | 0 | 0 |
| Long | 3,017 | 0 | 1,924 | 396 | 300 | 397 | 0 | 0 | 0 | 0 | 0 | 0 |
| Wide | 670 | 0 | 345 | 256 | 69 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Signals | 97,329 | 0 | 0 | 0 | 0 | 0 | 36,060 | 29,616 | 14,751 | 7,694 | 9,208 | 0 |
| Total | 112,446 | 891 | 8,381 | 3,196 | 1,297 | 1,352 | 36,060 | 29,616 | 14,751 | 7,694 | 9,208 | 0 |

