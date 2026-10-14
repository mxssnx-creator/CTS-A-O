/** Admission belongs to the exact bot/full indication/lane, independently of measured cell passes. */
export function basePairAdmission(row: { bot: string; ind: string }, summary?: { admittedPairKeys?: readonly string[] } | null): boolean | null {
  if (!Array.isArray(summary?.admittedPairKeys)) return null;
  return summary.admittedPairKeys.includes(`${row.bot}|${row.ind}`);
}
