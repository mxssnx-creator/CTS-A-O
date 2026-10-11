// The active processings of a desk (10 Oct, signals-only plan P1). The engine stages — the Base combos of the bot × indication
// pairs, the engine strategy tapes, the engine seats and their paper book — run only when an engine strategy type is on: DCA
// and Axis need the engine Base to beat, Block and Normal trade on it. With every engine type off the desk processes its signal
// stages alone; the signal stages never read an engine result (the confirmation pool is the one cross-type read, off there).

/** The strategy switches of a desk (the same keys as the toggles in the settings). */
export interface EngineToggles {
  normal?: boolean;
  trailing?: boolean;
  block?: boolean;
  dca?: boolean;
  dcaActive?: boolean;
  axis?: boolean;
}

/** Whether any engine strategy type executes (DCA Active needs DCA; the engine's kindExecutable reads the same switches). */
export function engineProcessingOn(t: EngineToggles | undefined): boolean {
  if (!t) return false;
  return !!(t.normal || t.trailing || t.block || t.dca || t.axis);
}

/** The signals' own DCA and Axis sets (settings.signals.strategies): they execute in the DCA / Axis presets. */
export interface SignalStrategies {
  dca?: boolean;
  axis?: boolean;
}

/**
 * Whether a compute walks the tapes once per strategy preset (the Engine page's comparison table). The presets are
 * engine strategy types switched on and off, so with none on there is nothing to compare — each walk would only
 * repeat the signal tapes, 18 times (5 GB resident at 26 symbols, 10 Oct) — unless the signals run DCA or Axis sets of
 * their own, which the DCA / Axis presets do execute. CTS_CORE_COMPARE=0 turns it off on a desk.
 */
export function presetCompareOn(
  t: EngineToggles | undefined,
  signals: SignalStrategies | undefined,
  env: { CTS_CORE_COMPARE?: string } = process.env,
): boolean {
  if (env.CTS_CORE_COMPARE === "0") return false;
  return engineProcessingOn(t) || !!(signals?.dca || signals?.axis);
}
