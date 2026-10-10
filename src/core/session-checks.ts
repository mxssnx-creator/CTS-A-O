// The execution check of a session (scripts/core-session.mjs): a strategy type, a range or the signals that executed no
// order passes only when every candidate of its family was refused by a named gate. A refusal record alone is not
// enough: a candidate that never reaches the decision (a warm-up candidate, a confirmation candidate) is not refused by a
// gate, so the refusals must cover every candidate that reached the decision (walkforward candidatesByKind / ByRange).

/** The check of one family: passes when it executed an order, or when all its candidates were refused by named gates. */
export function executionCheck(
  family: string,
  executed: number,
  refusals: Record<string, number> | null | undefined,
  candidates: number | null | undefined,
): { ok: boolean; named: boolean; name: string } {
  const refused = Object.values(refusals ?? {}).reduce((a, v) => a + (v > 0 ? v : 0), 0);
  const total = Number.isFinite(candidates) ? (candidates as number) : 0;
  const named = executed === 0 && total > 0 && refused === total;
  const text = Object.entries(refusals ?? {})
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([w, v]) => `${w} ${v}`)
    .join(" · ");
  const name =
    `execution: ${family} executed orders` +
    (named ? ` — every one of ${total} candidates refused by a named gate (${text})` : "");
  return { ok: executed > 0 || named, named, name };
}

/**
 * The memory check of a session (10 Oct): the reported compute ran at the full level, so no memory fallback removed a
 * range. A run with no memory record fails: a run that cannot show its level cannot show it stayed at the full level.
 */
export function memoryCheck(mem: { computeLevel?: number; fallback?: number } | null | undefined): {
  ok: boolean;
  name: string;
  level: number | null;
} {
  if (!mem) {
    return { ok: false, name: "memory: no memory record in the run (the compute level cannot be shown)", level: null };
  }
  const level = mem.computeLevel ?? mem.fallback ?? 0;
  return {
    ok: level === 0,
    name: "memory: the reported compute ran at the full level (no memory fallback)",
    level,
  };
}

/**
 * A signal pair passes Base (10 Oct): with the signal Base gate off (the default, baseGate false) every signal pair passes,
 * otherwise a pair must pass the sets gates. The runtime and the session's coverage both call this, so the report and the
 * run count the same pairs.
 */
export function signalPairPassesBase(baseGate: boolean | undefined, passesSetsGates: boolean): boolean {
  return baseGate === false || passesSetsGates;
}

/**
 * The gates a signal pair's Base record must pass (10 Oct, T1): the sets gates, with the signal minimum PF (baseMinPf) in
 * place of the sets floor. The sample and drawdown rules stay the sets' own (DEFAULT_GATES: 12 closes, drawdown ratio at most
 * 1). An unset or non-positive minimum leaves the sets gates as they are.
 */
export function signalBaseGates<G extends { minPf: number }>(baseMinPf: number | undefined, setsGates: G): G {
  return baseMinPf === undefined || !(baseMinPf > 0) ? setsGates : { ...setsGates, minPf: baseMinPf };
}
