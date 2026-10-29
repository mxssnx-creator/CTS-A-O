/** Pure stage settings, shared by the engine, API and Settings page without importing simulation code. */
export const SECONDARY_WINDOWS = [1, 5, 10, 15, 20, 25] as const;
export const NEGATIVE_WINDOWS = [1, 2, 5, 10] as const;
export type SecondaryMode = "static" | "multiple" | "auto";
export interface MinimalStagePolicy {
  enabled: boolean;
  n: number;
  /** A signed net-return condition in addition to the positive long/short PF gates. */
  polarity: "positive" | "negative";
}
export interface DualStagePolicy {
  primaryN: number;
  secondaryN: number;
  secondaryMode: SecondaryMode;
  secondaryWindows: number[];
  /** The short window never exceeds this fraction of the long window; maximum0.5. */
  maxShortRatio?: number;
  minimal?: MinimalStagePolicy;
}
export interface StageChainSettings {
  enabled: boolean;
  base: DualStagePolicy;
  main: DualStagePolicy;
  /** Negative Main tails request a separately simulated inverse set; never negate a settled return. */
  negativeMain: { enabled: boolean; windows: number[]; combination?: "mean" | "all" };
  realN: number;
}
export type DualStagePolicyPatch = Partial<Omit<DualStagePolicy, "minimal">> & { minimal?: Partial<MinimalStagePolicy> };
export type StageChainPatch = Partial<Omit<StageChainSettings, "base" | "main" | "negativeMain">> & {
  base?: DualStagePolicyPatch;
  main?: DualStagePolicyPatch;
  negativeMain?: Partial<StageChainSettings["negativeMain"]>;
};
const dual = (): DualStagePolicy => ({ primaryN: 50, secondaryN: 15, maxShortRatio: .5,
  secondaryMode: "static", secondaryWindows: [...SECONDARY_WINDOWS] });
/** Activation requires the stage execution adapter; historical source and account ownership stay separate. */
export const DEFAULT_STAGE_CHAIN: StageChainSettings = {
  enabled: false, base: { ...dual(), minimal: { enabled: false, n: 1, polarity: "positive" } },
  main: dual(), negativeMain: { enabled: true, windows: [5, 10], combination: "all" }, realN: 15,
};
const integer = (v: unknown, lo: number, hi: number): v is number =>
  typeof v === "number" && Number.isSafeInteger(v) && v >= lo && v <= hi;
export function shortWindowLimit(p: Pick<DualStagePolicy, "primaryN" | "maxShortRatio">): number {
  const ratio = p.maxShortRatio ?? .5;
  if (!integer(p.primaryN, 9, 500) || !Number.isFinite(ratio) || ratio <= 0 || ratio > .5)
    throw new TypeError("short/long Last-N ratio must be positive and at most50%");
  return Math.min(25, Math.floor(p.primaryN * ratio));
}
export function secondaryWindowsFor(p: DualStagePolicy): number[] {
  const limit = shortWindowLimit(p);
  return p.secondaryWindows.filter((n) => n <= limit);
}
export function checkDualStagePolicy(p: DualStagePolicy): void {
  if (!p || !integer(p.primaryN, 9, 500) || !integer(p.secondaryN, 1, 25) ||
      !["static", "multiple", "auto"].includes(p.secondaryMode) || !Array.isArray(p.secondaryWindows) ||
      !p.secondaryWindows.length || !p.secondaryWindows.every((n) => integer(n, 1, 25)) ||
      new Set(p.secondaryWindows).size !== p.secondaryWindows.length)
    throw new TypeError("invalid long/short Last-N window policy");
  const limit = shortWindowLimit(p);
  if (p.secondaryN > limit || p.secondaryMode === "multiple" && p.secondaryWindows.some((n) => n > limit))
    throw new TypeError(`short Last-N cannot exceed${limit} for this long window and ratio`);
  if (p.minimal !== undefined && (!p.minimal || typeof p.minimal.enabled !== "boolean" || !integer(p.minimal.n, 1, 3) ||
      !["positive", "negative"].includes(p.minimal.polarity)))
    throw new TypeError("minimal Last-N must be1–3 with positive or negative net-return polarity");
}
export function checkStageChainSettings(s: StageChainSettings): void {
  if (!s || typeof s.enabled !== "boolean" || !integer(s.realN, 1, 500) || !s.negativeMain ||
      typeof s.negativeMain.enabled !== "boolean" || !Array.isArray(s.negativeMain.windows) ||
      !s.negativeMain.windows.length || !s.negativeMain.windows.every((n) => (NEGATIVE_WINDOWS as readonly number[]).includes(n)) ||
      new Set(s.negativeMain.windows).size !== s.negativeMain.windows.length ||
      s.negativeMain.combination !== undefined && !["mean", "all"].includes(s.negativeMain.combination))
    throw new TypeError("invalid stage-chain settings");
  checkDualStagePolicy(s.base); checkDualStagePolicy(s.main);
  if (s.main.minimal?.enabled) throw new TypeError("minimal signed window belongs to Base");
}

/** Partial patches validate their own values; dependencies are checked again against fully merged settings. */
export function checkStageSettingsPatch(p: StageChainPatch): void {
  const object = (x: unknown, name: string): void => {
    if (!x || typeof x !== "object" || Array.isArray(x)) throw new TypeError(`${name}: object required`);
  };
  object(p, "stage windows");
  if (p.enabled !== undefined && typeof p.enabled !== "boolean") throw new TypeError("stages.enabled: boolean required");
  if (p.realN !== undefined && !integer(p.realN, 1, 500)) throw new TypeError("Real Last-N:1–500 whole closes");
  for (const stage of ["base", "main"] as const) {
    const x = p[stage]; if (x === undefined) continue;
    object(x, `${stage} windows`);
    if (x.primaryN !== undefined && !integer(x.primaryN, 9, 500)) throw new TypeError(`${stage} long Last-N:9–500 whole closes`);
    if (x.secondaryN !== undefined && !integer(x.secondaryN, 1, 25)) throw new TypeError(`${stage} short Last-N:1–25 whole closes`);
    if (x.secondaryMode !== undefined && !["static", "multiple", "auto"].includes(x.secondaryMode)) throw new TypeError(`${stage} secondaryMode invalid`);
    if (x.maxShortRatio !== undefined && (typeof x.maxShortRatio !== "number" || !Number.isFinite(x.maxShortRatio) || x.maxShortRatio <= 0 || x.maxShortRatio > .5))
      throw new TypeError(`${stage} short/long ratio must be positive and at most50%`);
    if (x.secondaryWindows !== undefined && (!Array.isArray(x.secondaryWindows) || !x.secondaryWindows.length ||
        !x.secondaryWindows.every((n) => integer(n, 1, 25)) || new Set(x.secondaryWindows).size !== x.secondaryWindows.length))
      throw new TypeError(`${stage} secondary windows: unique whole counts1–25`);
    if (x.minimal !== undefined) {
      object(x.minimal, `${stage} minimal window`);
      if (x.minimal.enabled !== undefined && typeof x.minimal.enabled !== "boolean") throw new TypeError("minimal.enabled: boolean required");
      if (x.minimal.n !== undefined && !integer(x.minimal.n, 1, 3)) throw new TypeError("minimal Last-N:1–3 whole closes");
      if (x.minimal.polarity !== undefined && !["positive", "negative"].includes(x.minimal.polarity)) throw new TypeError("minimal polarity: positive or negative");
    }
  }
  if (p.negativeMain !== undefined) {
    const x = p.negativeMain; object(x, "negative Main windows");
    if (x.enabled !== undefined && typeof x.enabled !== "boolean") throw new TypeError("negativeMain.enabled: boolean required");
    if (x.combination !== undefined && !["mean", "all"].includes(x.combination)) throw new TypeError("negative Main combination: mean or all");
    if (x.windows !== undefined && (!Array.isArray(x.windows) || !x.windows.length ||
        !x.windows.every((n) => (NEGATIVE_WINDOWS as readonly number[]).includes(n)) || new Set(x.windows).size !== x.windows.length))
      throw new TypeError("negative Main windows: unique counts1/2/5/10");
  }
}
/** Lists replace; leaf patches preserve the other stage's policy and signed minimal condition. */
export function mergeStageSettings(base: StageChainSettings | undefined, patch?: StageChainPatch): StageChainSettings {
  if (patch !== undefined) checkStageSettingsPatch(patch);
  const source = base ?? DEFAULT_STAGE_CHAIN;
  const policy = (old: DualStagePolicy, p?: DualStagePolicyPatch): DualStagePolicy => {
    const { minimal: patchMinimal, ...rest } = p ?? {};
    const minimal: MinimalStagePolicy | undefined = patchMinimal || old.minimal
      ? { enabled: false, n: 1, polarity: "positive", ...old.minimal, ...patchMinimal } : undefined;
    return { ...old, ...rest, secondaryWindows: [...(rest.secondaryWindows ?? old.secondaryWindows)], ...(minimal ? { minimal } : {}) };
  };
  return { ...source, ...patch, base: policy(source.base, patch?.base), main: policy(source.main, patch?.main),
    negativeMain: { ...source.negativeMain, ...patch?.negativeMain,
      windows: [...(patch?.negativeMain?.windows ?? source.negativeMain.windows)] } };
}
