# Live validation by group — tested, off by default (October 2026)

The question: should x01 stop opening new entries in a group of configs that is losing live, and keep the earning
groups trading? The groups are Signals, Minimal, Short, General, Long and Wide (no range tag).

## Why a group check

Every config is already judged on its own last 25 live closes (`live.liveLastN`). With every config on its own seat,
each config closes slowly: after 10.8 h on x01 no config had more than 4 forward closes, so that check judges nothing
for days. A group pools its configs' closes and has hundreds per hour (Long ~450/h).

## What was built

`live.liveGroupLastN` (default **0 = off**):

- Each group's last N closes are pooled over its selected configs (`liveGroupGates` in `src/core/live-validation.ts`).
- The gate only affects new entries. Held positions are never cut, and every config keeps being computed.
- A config's own last N decide once it has them. Before that its group decides (`liveEntryOk`).

Each group's verdict is reported in `status.liveValidation.groups` and in the desk's log line ("live groups …").

## Replay on x01's forward record

`scripts/core-live-group-replay.mjs` replays the forward paper record: closes recorded within 15 min of their exit,
4,452 closes over 4.5 h, PF 1.11 at one unit each. A close counts only if the closes its group had **before its entry**
cleared PF 1.05. That is what the gate sees when it decides.

| window | taken | total PF | Σ r |
|---|---:|---:|---:|
| no gate | 4,452 | **1.11** | +4,684 % |
| group last 50 | 3,714 | 0.93 | −2,987 % |
| group last 100 | 3,738 | 0.98 | −805 % |
| group last 200 | 3,705 | 1.02 | +878 % |
| group last 400 | 3,712 | 0.96 | −1,478 % |
| group whole record (judged from 200) | 3,904 | 0.95 | −1,874 % |
| config last 25 (today's check) | 4,452 | 1.11 | +4,684 % |

Per group, ungated against gated at the last 100:

| group | closes | PF | gated PF |
|---|---:|---:|---:|
| Long | 2,056 | 0.83 | 0.66 |
| General | 1,593 | 1.37 | 1.25 |
| Short | 424 | 1.71 | 1.62 |
| Minimal | 138 | 1.80 | 1.80 |
| Wide | 121 | 0.51 | 0.51 |
| Signals | 120 | 9.98 | 9.98 |

**Every window cut the result.** The trades skipped after a group's losing streak were mostly winners: losses arrive
in clusters (a move takes many stops at once), and the entries after them do better.

Gating the same closes at their **exit** instead looks excellent (Long 0.83 → 2.90). That version uses closes that
were not known at entry, so it is lookahead; the gate cannot do it.

So the group gate stays off. Signals, Short, Minimal and General are positive live; Long and Wide are not.

## Rerun as the record grows

```
cp runs/x01/live-x01/core.sqlite /tmp/x01.sqlite
node --experimental-strip-types --no-warnings scripts/core-live-group-replay.mjs /tmp/x01.sqlite 50,100,200,all,cfg:25
```

A few hours of one market regime is a small sample. If a window keeps the total above the ungated PF over days, set
`live.liveGroupLastN` to it on the desk (settings or patch file; no restart needed).

## The exchange's record judges first (6 Oct 2026)

Until 6 Oct every live gate read the simulated forward closes (the tapes since `liveSince`), and the auto-adjuster read
the paper book: the exchange's own executions only reached the cost model. Operator, 6 Oct: *strategies, adjustments
and coordinations are judged on live exchange results, not on the system simulation.*

- **Attribution** (`src/core/live-record.ts`, wired in `runControl`): the desk merges every lane into one position per
  symbol × side, so each lane is attributed separately. A lane joins at the fill price of the order that grew its
  position in that step, or at the market price when no order was needed. It leaves at the fill of the reduce or close,
  or at the position's own stop price when the exchange closed the position (by hand: the market price). Its return is
  the exchange's price move minus the measured fees (slippage is already in the fill prices). Closed lanes go to
  `live_lane_trades`; open ones persist in `liveLaneOpen` across restarts.
- **Gates**: a config with N exchange closes since `liveSince` is judged on them (`preferExchange`), with fewer on the
  simulated forward closes. A group is judged on its pooled exchange closes once they number N. The status reports
  `onExchange` (configs judged on the exchange) and `exchangeCloses`, and each group's `source`.
- **Auto-adjust**: a set with a full window of exchange closes is judged on them (no cost excess on top), with fewer on
  the paper book. The two are never mixed in one window (`adjustTrades`).
- A defect found on the way: a stop-out in the step after a reduce was taken for the desk's own close, so the lanes
  reopened the same position at market. Only a close empties a side now (`externalCloses`; regression in
  `lanes-lifecycle.test.ts`).
