// The symbol universe of a session run: the count asked for against the symbols the engine loaded. The engine ranks the
// symbols that have candles when it loads them (the backfill decides which), so a run that loads fewer than it asked is
// not comparable with another run of the same window (8 Oct: DRIFT-USDT and TIA-USDT swapped between two falling runs).
// A desk pins its universe with settings.forceSymbols; the session check then holds every run to the same count.

/** The check of a run's universe: the loaded symbols (each counted once) against the count asked for. */
export function universeCheck(asked: number, loaded: readonly string[]): { ok: boolean; loaded: number; name: string } {
  const n = new Set(loaded).size;
  const ok = Number.isFinite(asked) && asked > 0 && n === asked;
  const name =
    `universe: ${n} symbols loaded of ${asked} asked` +
    (ok ? "" : " — not comparable with a run of the same window: pin the list (settings.forceSymbols)");
  return { ok, loaded: n, name };
}
