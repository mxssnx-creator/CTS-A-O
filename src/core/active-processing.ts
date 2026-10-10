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
