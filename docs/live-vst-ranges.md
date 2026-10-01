# Live check on BingX VST (x02 demo account)

Read on 2026-10-01 between 16:05 and 18:40 UTC. These are demo funds on the VST host; nothing touched mainnet.

## Setup

- Each run was its own desk with its own tracking tag (`CTS_CORE_LIVE_TAG`). The runs did not see each other's orders.
- Every run treated symbols that held other systems' positions as foreign and skipped them. Several other bots were trading on the same account.
- The exchange results come from `scripts/core-live-report.mjs`. It reads the exchange order history by tag and sums the realized profit and fees per position episode. Per-run results are in `docs/live-vst/`.

| tag | run | settings | ran |
|---|---|---|---|
| `CTSV2U_` | Micro only | wide grid off, Micro on, range seats, gates relaxed (min PF 1.05, no validation last-N) | 1.5 h |
| `CTSV2N_` | Minimal only | wide grid off, Minimal on, same relaxed gates | 1.4 h |
| `CTSV2H_` | Short only | wide grid off, Short on, same relaxed gates | 2.6 h |
| `CTSV2D_` | Desk | defaults: wide grid, Short, range gate (last 50 at PF 1.35), horizon fit | 1.1 h, then closed |

## Results

| tag | own orders | positions | won | PF | net USDT | fees (% of opened notional) |
|---|---:|---:|---:|---:|---:|---:|
| `CTSV2U_` Micro | 0 | 0 | – | – | 0.00 | – |
| `CTSV2N_` Minimal | 0 | 0 | – | – | 0.00 | – |
| `CTSV2H_` Short | 3 | 1 | 0 | 0.00 | −4.80 | 0.101 % |
| `CTSV2D_` Desk | 36 | 12 | 5 | 0.76 | −6.27 | 0.100 % |

- **Micro and Minimal never traded live.** With the relaxed gates the simulated run still seated nothing: no Micro cell had a positive window, net and PF over the gate. This matches the offline result (`docs/ranges-validation.md`): after the 0.20 % cost these ranges lose on every indication.
- **Short traded once and lost** (−4.80 USDT). Its simulated run held 1 order in 48 h.
- **The desk opened 12 positions** ($2,400 notional; 16 symbols; 12 positions is the cap). All 12 were closed at market after about 1 h, while their configs hold 16–24 h. The −6.27 USDT is therefore the cost of opening and closing early, not the strategy's result. Over the same three 24 h windows the desk default simulates PF 2.27 (`docs/desk-presets.md`).
- **Execution cost matches the model.** Fees were 0.05 % per side (0.100 % per round trip). The measured entry slippage against the reference price was 0.062 % per side (desk, 12 fills) and 0.010 % (short, 2 fills). Together that is about 0.20–0.22 % per round trip, matching the 0.20 % cost the simulation charges on every close.
- **Account rate limits.** The VST account is shared with other systems, and their request rate kept the account at BingX's limit (code 100410). The desk's live step was paused for about 5 minutes several times; each pause is logged as an event and the step resumes by itself. A desk with an account of its own would not see this.

## Close-out

`scripts/core-live-report.mjs --flatten` closes a tag's own positions. It closes at most the quantity that tag opened (own fills in minus own fills out per symbol × side) and never touches another system's quantity on the same side. It retries the exchange's "network issue" (109500) and waits out a rate-limit ban until the end time the exchange gives. After the run no `CTSV2*` position is open.
