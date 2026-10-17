# Systemwide Block ratio comparison — 17 October 2026

## Matched replay

Two offline runs used the same cached nine-symbol feed, six-hour evaluation
history, six-hour simulated window, strategies, symbol set, costs, sizing and
replay gates. The only setting changed was the Overall Block ratio: the first
run used the stored 0.5 default; the second used 0.2. Both were replay-only;
no saved or live settings changed. The run used a 100% green-hour selection
floor and began the causal simulated post-Base execution check at the trading
window start. These gates affect config admission, not the execution window.

- [Full 0.5-ratio session report](systemwide-block-ratio-050-6h-session-20261017.md)
- [Full 0.2-ratio session report](systemwide-block-ratio-020-6h-session-20261017.md)

## Results

| Overall Block ratio | Base pairs passed | Virtual closes | Funded orders | Return PF | Sized cash PF | Net cash | Max equity DD | Green hours |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.5 | 53 / 665 | 4,531 | 3,711 | 2.83 | 0.66 | −$0.21 | 7.72% | 5 / 6 |
| 0.2 | 53 / 665 | 4,531 | 3,759 | 2.86 | 0.74 | −$0.14 | 6.64% | 5 / 6 |

The lower ratio improved this one sample's funded count, normalized return
PF, sized cash PF and drawdown. Sizing still lost money overall, and the
02:00 UTC hour remained negative. The virtual close pool and Base
qualification were unchanged, but the funded-order cohort changed (zero
allocations fell from 820 to 772). Return PF is therefore sample-sensitive
here, as well as the sized cash PF. This replay does not establish that 0.2
is a profitable or generally superior live default.

## Hourly execution detail

PF is computed from the same funded settled closes within each UTC exit hour.
Return PF is on per-order net returns; cash PF is after realized order sizing.
“∞” means positive gross profit with no losing close. Net values are rounded
to cents, so a displayed `$0.00` can be a small positive or negative amount.

| UTC hour | Ratio 0.5 orders | Return PF | Cash PF | Net | Ratio 0.2 orders | Return PF | Cash PF | Net |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 22:00 | 408 | 4.89 | 7.70 | +$0.03 | 408 | 4.89 | 7.70 | +$0.03 |
| 23:00 | 156 | 3.24 | 28.12 | $0.00 | 156 | 3.24 | 28.12 | $0.00 |
| 00:00 | 610 | 4.98 | 6.03 | +$0.02 | 610 | 4.98 | 6.03 | +$0.02 |
| 01:00 | 552 | 2.68 | 3.16 | +$0.01 | 552 | 2.68 | 3.16 | +$0.01 |
| 02:00 | 1,797 | 2.45 | 0.36 | −$0.38 | 1,845 | 2.48 | 0.43 | −$0.31 |
| 03:00 | 188 | ∞ | ∞ | +$0.11 | 188 | ∞ | ∞ | +$0.11 |

Most of the difference was concentrated in 02:00. Although its unit Return PF
was above 2, the cash PF was below 1 because losses carried larger realized
notional than gains. That is why the primary return PF alone does not validate
the volume-weighted account outcome. Five hours were positive and one was
negative in both variants; neither achieved positive net in every hour.

These results are a short, reused offline sample. The wide/micro/minimal range,
strategy, lane, config-validation, stage-funnel and consistency details are in
the full session reports. No live venue orders or promotions were made.
