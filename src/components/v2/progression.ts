/** This statistic describes unweighted Base representatives, not placed or funded execution. */
export function pooledBasePfText(row: { passed?: unknown; passedGp?: unknown; passedGl?: unknown }): string {
  if (typeof row.passed !== "number" || row.passed <= 0) return "–";
  const gp = row.passedGp, gl = row.passedGl;
  if (typeof gp !== "number" || typeof gl !== "number" || !Number.isFinite(gp) || !Number.isFinite(gl) || gp < 0 || gl < 0) return "Basis unavailable";
  return gl > 0 ? (gp / gl).toFixed(2) : gp > 0 ? "No losses" : "–";
}

/** Missing counters stay unknown: discovery must never fall back to the different representative-pass sample. */
export function signalProgressCounts(status?: { discoveryPairs?: unknown; representativePassed?: unknown; configs?: unknown } | null) {
  const count = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
  return { discovery: count(status?.discoveryPairs), representativePassed: count(status?.representativePassed), requested: count(status?.configs) };
}

/** Strict proof windows carry their own source/convention; never infer a measured ratio from score 4. */
export function promotionWindowPfText(window?: { n?: unknown; pf?: unknown; unknown?: unknown; noLoss?: unknown; pfConvention?: unknown } | null): string {
  if (!window) return "Unavailable";
  if (typeof window.unknown === "number" && window.unknown > 0) return "Unknown";
  if (typeof window.n !== "number" || window.n <= 0) return "No closes";
  if (window.pf === null || window.pf === undefined) return "Insufficient";
  if (window.unknown !== 0 || typeof window.pf !== "number" || !Number.isFinite(window.pf)) return "Basis unavailable";
  if (window.noLoss === true && window.pfConvention === "no-loss-score") return "No losses";
  if (window.noLoss === false && window.pfConvention === "ratio") return window.pf.toFixed(2);
  return "Basis unavailable";
}
