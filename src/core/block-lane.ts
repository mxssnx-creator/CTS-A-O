/**
 * Block as its own evaluated lane (option A, 12 Nov 2026): the trades Block raised, measured on their own unit returns,
 * beside the plain trades of the same tape. Derived from the simulated trades that already carry the Block multiple
 * (`mult`, and `coordVol` when a coordination volume is part of it); nothing is re-selected here. Unit return = r / mult,
 * so the multiple is removed exactly once (AGENTS.project.md: unit-return PF is primary).
 */
export interface BlockLaneTrade {
  /** recorded net return including the execution multiple, as the book stores it */
  r: number;
  /** total execution multiple (Block × coordination × type), 1 for a plain entry */
  mult?: number;
  /** coordination part of the multiple (Stable-02 relation volume), divided out with Block */
  coordVol?: number;
  /** Block level at entry */
  level?: number;
}

export interface LaneStats {
  n: number;
  gp: number;
  gl: number;
  /** gross gains / gross losses of unit returns; null with no closes; "no loss" when there are no losses */
  pf: number | null | "no loss";
  net: number;
  /** a lane is judged only with at least this many closes */
  judged: boolean;
}

export interface BlockLane {
  plain: LaneStats;
  raised: LaneStats;
  /** raised lane per Block level (1…maxLevel), same rules */
  byLevel: Record<string, LaneStats>;
  minCloses: number;
}

const unitOf = (t: BlockLaneTrade): number => {
  const m = (t.mult ?? 1) / (t.coordVol && t.coordVol > 0 ? t.coordVol : 1);
  return m > 0 ? t.r / m : NaN;
};

function statsOf(xs: number[], minCloses: number): LaneStats {
  let gp = 0, gl = 0, net = 0;
  for (const r of xs) {
    net += r;
    if (r > 0) gp += r;
    else if (r < 0) gl -= r;
  }
  const n = xs.length;
  const pf = n === 0 ? null : gl > 0 ? gp / gl : gp > 0 ? "no loss" : 1;
  return { n, gp, gl, pf, net, judged: n >= minCloses };
}

/** Block's own lane against its plain trades; trades with a non-finite unit return are left out (counted by the caller). */
export function blockLane(trades: readonly BlockLaneTrade[], opts: { minCloses?: number; maxLevel?: number } = {}): BlockLane {
  const minCloses = opts.minCloses ?? 30;
  const plain: number[] = [], raised: number[] = [];
  const levels: Record<string, number[]> = {};
  for (const t of trades) {
    const u = unitOf(t);
    if (!Number.isFinite(u)) continue;
    const up = (t.mult ?? 1) / (t.coordVol && t.coordVol > 0 ? t.coordVol : 1) > 1 + 1e-9;
    if (!up) { plain.push(u); continue; }
    raised.push(u);
    const lv = String(Math.max(1, Math.round(t.level ?? 1)));
    (levels[lv] ??= []).push(u);
  }
  const byLevel: Record<string, LaneStats> = {};
  for (const [k, xs] of Object.entries(levels).sort((a, b) => Number(a[0]) - Number(b[0]))) byLevel[`level ${k}`] = statsOf(xs, minCloses);
  return { plain: statsOf(plain, minCloses), raised: statsOf(raised, minCloses), byLevel, minCloses };
}
