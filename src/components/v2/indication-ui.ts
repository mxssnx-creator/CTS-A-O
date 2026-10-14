/** Keep the registered first-class indication name visible in every type selector. */
export function indicationKindLabel(kind: string): string {
  return kind === "tactic" ? "Tactic" : kind;
}

/** Registry labels may already name their kind (Tactic does); keep option names concise. */
export function indicationOptionLabel(definition: { kind: string; label: string }): string {
  const kind = indicationKindLabel(definition.kind);
  return definition.label.startsWith(`${kind} ·`) ? definition.label : `${kind} · ${definition.label}`;
}

/** Simulated/paper configs retain their strategy; aggregate live ledger rows cannot recover a missing type. */
export function configStrategyLabel(row: { type?: string; kind?: string }, source: string): string {
  if (source === "live") return row.type === "Signals" ? "Signals · type unavailable" : "Type unavailable";
  if (row.type !== "Signals") return row.type ?? "Type unavailable";
  return row.kind ? `Signals · ${row.kind}` : "Signals · type unavailable";
}
