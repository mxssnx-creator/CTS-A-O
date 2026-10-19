import { bothSides, mergeSideTrades, simulate } from "../../src/core/sim/backtest.ts";

/** Match Base/runCombo's independent direction slots while retaining the research signal and protect. */
export function researchSeriesTrades(cfg, bars, signal, protect, cost) {
  return mergeSideTrades(
    bothSides(signal, (sideSignal) => simulate(cfg, bars, sideSignal, protect, { cost }).trades),
  );
}
