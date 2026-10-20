// A settings patch file states only what it changes. updateSettings replaces `grid.micro` as a whole, so a patch of
// { grid: { micro: { holdMin: 15 } } } would drop every other Micro field: the patch file's ranges are merged over the
// current range here instead (the Settings page sends whole ranges and keeps its own semantics).
const RANGES = ["micro", "minimal", "short", "general", "long"];

export function mergeGridPatch(cur, patch) {
  const out = { ...(cur ?? {}), ...(patch ?? {}) };
  for (const k of RANGES) {
    const p = patch?.[k];
    const c = cur?.[k];
    if (p && typeof p === "object" && c && typeof c === "object") out[k] = { ...c, ...p };
  }
  return out;
}

/** The settings of a patch file with its grid ranges merged over the current grid. */
export function patchSettings(settings, curGrid) {
  const s = settings ?? {};
  return s.grid ? { ...s, grid: mergeGridPatch(curGrid, s.grid) } : s;
}
