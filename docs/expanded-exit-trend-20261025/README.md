# Expanded Exit direction-filter comparison

Source commit: `ccc952e8e25d6a92f0d985d1a5a284611bfe8502`. Economic source SHA-256: `39c138751c6e36ce08993078d2bded69597ce713abee6e369ecabb596ed9c0f8`.

[All six completed runs](https://github.com/mxssnx-creator/CTS-A-O/actions/runs/40197322560) passed native, scalar history, exact execution and per-entry admission checks. Each used 12 symbols, 150 hours of fitting history, 12 hours of trading, 1/5/15-minute source lanes and minute prices. The existing causal 1-hour or 3-hour EMA direction filter was applied consistently to Signal histories, Exit fitting, validation and execution. PF, sample, drawdown and Last-4 requirements were preserved.

All six Expanded Exit results remained **below neutral PF 1**. The 1-hour filter scored **0.7943 / 0.0500 / 0.0809** across earlier/original/later windows; the 3-hour filter scored **0.5031 / 0.0458 / 0.0975**. None is promoted. Some Signals subgroups and whole-account windows were positive, but those results do not establish positive Exit performance or stability across windows.

The comparison is retrospective: these reused windows were already available during diagnosis. It is not a fresh out-of-sample or live-profitability claim. Full raw archives remain in the linked workflow. [Detailed results](RESULTS.md) retain all losses, open holdings, type counts, risk distances and hourly outcomes.
