// Progress of a runtime job (backfill batch → compute → paper step): the stage names the UI shows, each stage's
// fraction, and the overall fraction across the job. Pure helpers (the runtime and its tests use them).

/** Stages of a job in order, with their share of the overall bar (lo, hi). */
export const JOB_STAGES: ReadonlyArray<readonly [stage: string, lo: number, hi: number]> = [
  ["backfill", 0, 0.1],
  ["Base", 0.1, 0.45],
  ["Main", 0.45, 0.5],
  ["Tapes", 0.5, 0.72],
  ["Signals", 0.72, 0.8],
  ["Real", 0.8, 0.9],
  ["Compare", 0.9, 0.95],
  ["Paper", 0.95, 1],
];

/** The stage a finished job rests on (state running, 100 %): the realtime loop (tick, live control) on the new book. */
export const DONE_STAGE = "Realtime";

const clamp01 = (x: number) => (Number.isFinite(x) ? Math.min(1, Math.max(0, x)) : 0);

/**
 * Overall fraction of the job: the stage's span scaled by its own fraction, never below `prev` (a job's bar only
 * moves forward). A job without a backfill batch (a compute on new bars) spreads over the whole bar instead of
 * starting at the backfill's 10 %. Stages outside the job (or the done stage) keep `prev` / reach 1.
 */
export function overallOf(stage: string, fraction: number, prev: number, withBackfill: boolean): number {
  if (stage === DONE_STAGE) return 1;
  const row = JOB_STAGES.find((x) => x[0] === stage);
  if (!row) return clamp01(prev);
  const [, lo, hi] = row;
  let x = lo + (hi - lo) * clamp01(fraction);
  if (!withBackfill) {
    const b = JOB_STAGES[0][2];
    x = stage === "backfill" ? 0 : (x - b) / (1 - b);
  }
  return Math.max(clamp01(prev), clamp01(x));
}

/** One pipeline progress report (runPipeline) in the runtime's stage names, as a 0..1 fraction of that stage. */
export function pipelineStage(p: { stage: string; done: number; total: number; label: string }): {
  stage: string;
  fraction: number;
  label: string;
} {
  const f = p.total > 0 ? clamp01(p.done / p.total) : 0;
  switch (p.stage) {
    case "S1":
      return { stage: "Base", fraction: f, label: p.label };
    // Main is two passes (refine the leaders on the protect grid, then evaluate the chosen configs): one stage bar,
    // the refine pass its first 60 % and the evaluation the rest — S3 restarting at 0 moved the bar backwards
    case "S2":
      return { stage: "Main", fraction: 0.6 * f, label: `refine ${p.label}` };
    case "S3":
      return { stage: "Main", fraction: 0.6 + 0.4 * f, label: `evaluate ${p.label}` };
    // the final ranking closes Main (it reported "Real 100 %" before the Real simulation started at 0 %)
    case "S4":
    case "S5":
      return { stage: "Main", fraction: 1, label: `ranked · ${p.label}` };
    default:
      return { stage: p.stage, fraction: f, label: p.label };
  }
}

/**
 * Fraction of a sliced step whose total is not known up front (paper step, audit): its slices so far against the
 * slices the same step took last time, held below 1 until it finishes; without a previous run a slow approach.
 */
export function estimatedFraction(slices: number, expected: number): number {
  if (slices <= 0) return 0;
  if (expected > 0) return Math.min(0.99, slices / expected);
  return Math.min(0.9, slices / (slices + 200));
}

/** The backfill line: the symbol just loaded, the batch of this run (#/#) and the symbols loaded of the universe. */
export function backfillLabel(sym: string, batch: number, batches: number, loaded: number, total: number): string {
  const B = Math.max(batch, batches);
  const T = Math.max(loaded, total);
  return `${sym ? `${sym} · ` : ""}batch ${batch}/${B} · symbols ${loaded}/${T}`;
}

/** Batches a progressive start takes for `missing` symbols in batches of `size`, after `done` batches. */
export function batchesOf(done: number, missing: number, size: number): number {
  return done + Math.ceil(Math.max(0, missing) / Math.max(1, size));
}

/** A runtime that shows a progress bar now: loading market data or computing (its paper step included). */
export const isBusy = (state: string | undefined) => state === "computing" || state === "backfill";

const pct = (x: number | undefined) => `${Math.round(clamp01(x ?? 0) * 100)}%`;

/**
 * The progress line for a status / event: "Tapes 40% · job 62%" while busy (the stage's own fraction and the
 * whole job's), "" otherwise — a finished compute never keeps showing its last stage's fraction.
 */
export function progressText(x: { state?: string; stage?: string; progress?: number; overall?: number }): string {
  if (!isBusy(x.state)) return "";
  const stage = `${x.stage || x.state} ${pct(x.progress)}`;
  return typeof x.overall === "number" ? `${stage} · job ${pct(x.overall)}` : stage;
}

/**
 * Elapsed time of the running compute and an estimate of what is left from the last compute's length (null when
 * not computing or nothing to estimate from).
 */
export function computeEta(
  x: { state?: string; computeStartedAt?: number; lastComputeMs?: number },
  now: number,
): { elapsedMs: number; leftMs: number | null } | null {
  if (x.state !== "computing" || !x.computeStartedAt) return null;
  const elapsedMs = Math.max(0, now - x.computeStartedAt);
  const last = x.lastComputeMs ?? 0;
  return { elapsedMs, leftMs: last > 0 ? Math.max(0, last - elapsedMs) : null };
}

/** "1:05" / "1:02:05" */
export function clockOf(ms: number): string {
  const t = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const ss = String(s).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

/**
 * The prehistoric start's bar (0–100): symbols ready plus the running job's share of the batch being computed, out
 * of the universe; 100 once complete. The share is the job's overall fraction — the stage's own fraction restarted
 * at 0 on every stage and moved the bar backwards — and only while computing (a backfill is not computing yet).
 */
export function prehistPct(
  p: { ready: number; loaded: number; total: number; complete: boolean },
  st: { state?: string; overall?: number; progress?: number },
): number {
  if (p.complete) return 100;
  const total = Math.max(1, p.total, p.loaded);
  const share = st.state === "computing" ? clamp01(st.overall ?? st.progress ?? 0) : 0;
  const x = (Math.min(p.ready, total) + share * Math.max(0, p.loaded - p.ready)) / total;
  return Math.min(100, Math.max(0, Math.round(x * 100)));
}
