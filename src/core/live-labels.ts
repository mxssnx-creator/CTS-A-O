// One wording of the live sizing and of the age of a reading for every page (Overview, Trading, Settings): what a
// position's size is made of in the configured mode, and how old a number is. Pure: the pages and the tests use it.

export interface SizeLabelInput {
  notionalUsd?: number;
  ratio?: number;
  maxNotionalUsd?: number;
  maxPositionX?: number;
  positionSize?: "lanes" | "min" | "risk";
  riskPerPositionPct?: number;
  laneOrders?: boolean;
}

const num = (x: number, d = 2) => (Number.isFinite(x) ? String(+x.toFixed(d)) : "–");

/**
 * The size of one exchange position in the live settings' own terms. `sizingMode` is settings.sizing.mode: minQty
 * makes one unit the venue minimum of the symbol, equityPct a share of the account equity, fixed the notional.
 */
export function sizeText(live: SizeLabelInput, sizingMode: string | undefined): string {
  const ratio = live.ratio ?? 1;
  const unit =
    sizingMode === "minQty"
      ? "venue minimum"
      : sizingMode === "equityPct"
        ? "equity share"
        : `$${num(live.notionalUsd ?? 0)}`;
  const body =
    live.positionSize === "risk" && live.laneOrders !== true
      ? `risk B × ${num((live.riskPerPositionPct ?? 0.01) * 100, 3)}% × ${num(ratio, 3)} at the stop (B = min(wallet, equity))`
      : live.laneOrders === true
        ? `${unit} per lane × ${num(ratio, 3)}`
        : live.positionSize === "min"
          ? `${unit} × ${num(ratio, 3)} per position`
          : `${unit} × lane volume × ${num(ratio, 3)}`;
  return `${body} · ${capText(live)}`;
}

/** The per-position cap: min(maxNotionalUsd, maxPositionX × B). */
export function capText(live: SizeLabelInput): string {
  const fixed = live.maxNotionalUsd === 0 ? null : `$${num(live.maxNotionalUsd ?? (live.notionalUsd ?? 6) * 5)}`;
  const x = live.maxPositionX && live.maxPositionX > 0 ? `${num(live.maxPositionX)}× B` : null;
  if (fixed && x) return `cap min(${fixed}, ${x})`;
  if (fixed) return `cap ${fixed}`;
  if (x) return `cap ${x}`;
  return "no per-position cap";
}

/** A reading older than this is stale (the live step reads the account every step; ~1 min with the account cache). */
export const STALE_MS = 120_000;

/** How old a reading is, and whether it is stale; null when it was never read. */
export function ageOf(at: unknown, now: number, staleMs = STALE_MS): { ms: number; text: string; stale: boolean } | null {
  if (typeof at !== "number" || !Number.isFinite(at) || at <= 0) return null;
  const ms = Math.max(0, now - at);
  const s = Math.round(ms / 1000);
  const text = s < 60 ? `${s}s ago` : s < 3600 ? `${Math.round(s / 60)}m ago` : `${(s / 3600).toFixed(1)}h ago`;
  return { ms, text, stale: ms > staleMs };
}
