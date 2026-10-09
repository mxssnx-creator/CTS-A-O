// The symbol universe of a session run: the count asked for against the symbols the engine loaded. The engine ranks the
// symbols that have candles when it loads them (the backfill decides which), so a run that loads fewer than it asked is
// not comparable with another run of the same window (8 Oct: DRIFT-USDT and TIA-USDT swapped between two falling runs).
// A desk pins its universe with settings.forceSymbols; the session check then holds every run to the same count, and
// names each pinned symbol that did not load (10 Oct: QNT-USDT and BANK-USDT were missing from one falling run).

/** The check of a run's universe: the loaded symbols (each counted once) against the count asked for. */
export function universeCheck(
  asked: number,
  loaded: readonly string[],
  pinned: readonly string[] = [],
): { ok: boolean; loaded: number; missing: string[]; name: string } {
  const have = new Set(loaded);
  const n = have.size;
  const missing = [...new Set(pinned)].filter((s) => !have.has(s));
  const ok = Number.isFinite(asked) && asked > 0 && n === asked && missing.length === 0;
  const name =
    `universe: ${n} symbols loaded of ${asked} asked` +
    (missing.length ? ` · missing: ${missing.join(", ")}` : "") +
    (ok ? "" : " — not comparable with a run of the same window: pin the list (settings.forceSymbols)");
  return { ok, loaded: n, missing, name };
}
