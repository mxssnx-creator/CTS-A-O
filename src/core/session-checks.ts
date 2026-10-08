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
