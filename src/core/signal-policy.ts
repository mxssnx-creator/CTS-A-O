/** Minimum own net-return PF for every Signal type/range/config from history through admission. */
export const SIGNAL_MIN_PF = 1.55;
/** Operator, 24 Oct: 150 hours of evidence, independently from candle/indicator warmup. */
export const SIGNAL_HISTORY_H = 150;
/** Default completed-close sample for each independent Signal/Exit validation context. */
export const SIGNAL_VALID_LAST_N = 12;
/** Default completed-position sample for each Signals evaluation stage. */
export const SIGNAL_EVALUATION_LAST_N = 15;
