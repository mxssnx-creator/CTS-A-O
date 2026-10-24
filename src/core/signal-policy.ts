/** Minimum own net-return PF for every Signal type/range/config from history through admission. */
export const SIGNAL_MIN_PF = 1.5;
/** Operator, 23 Oct: 100 hours of evidence, independently from candle/indicator warmup. */
export const SIGNAL_HISTORY_H = 100;
/** Operator, 24 Oct: evaluate each independent Signal/Exit context on Last-4. */
export const SIGNAL_VALID_LAST_N = 4;
