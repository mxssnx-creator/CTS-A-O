/** Keep the registered first-class indication name visible in every type selector. */
export function indicationKindLabel(kind: string): string {
  return kind === "tactic" ? "Tactic" : kind === "signal-coordination" ? "Signals Coordination" : kind;
}

/** Registry labels may already name their kind (Tactic does); keep option names concise. */
export function indicationOptionLabel(definition: { kind: string; label: string }): string {
  const kind = indicationKindLabel(definition.kind);
  return definition.label.startsWith(`${kind} ·`) ? definition.label : `${kind} · ${definition.label}`;
}

/** Simulated/paper configs retain their strategy; aggregate live ledger rows cannot recover a missing type. */
export function configStrategyLabel(row: { type?: string; kind?: string }, source: string): string {
  if (source === "live") return row.type === "Signals Coordination"
    ? "Signals Coordination · type unavailable"
    : row.type === "Signals" ? "Signals · type unavailable" : "Type unavailable";
  if (row.type === "Signals Coordination")
    return row.kind ? `Signals Coordination · ${row.kind}` : "Signals Coordination · type unavailable";
  if (row.type !== "Signals") return row.type ?? "Type unavailable";
  return row.kind ? `Signals · ${row.kind}` : "Signals · type unavailable";
}

/** Empty Focus means all indications; an explicit Focus gets the ten Follow Tactic bases additively. */
export function includeTacticInFocus(focus: readonly string[], ids: readonly string[]): string[] {
  return focus.length ? [...new Set([...focus, ...ids.map((id) => `follow|${id}`)])] : [];
}

/** A lane-specific entry represents its variant but does not enable every selected lane. */
export function tacticFocusCoverage(focus: readonly string[], ids: readonly string[], pinned: readonly string[] = []) {
  if (!focus.length) return { all: true, covered: ids.length, full: ids.length, total: ids.length };
  const effective = [...focus, ...pinned];
  const set = new Set(effective);
  const bases = ids.map((id) => `follow|${id}`);
  return {
    all: false,
    covered: ids.filter((id) => effective.some((pair) => { const ind = pair.split("|")[1]; return ind === id || ind?.startsWith(`${id}@m`); })).length,
    full: bases.filter((base) => set.has(base)).length,
    total: ids.length,
  };
}
