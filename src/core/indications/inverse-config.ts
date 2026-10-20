/** A bounded research catalogue; every source/profile/lane keeps its own qualification. */
export const INVERSE_TIMEFRAMES = [1, 5, 15] as const;
export const INVERSE_SOURCES = [
  "trend-ema",
  "trend-adx",
  "trend-st",
  "break-don20",
  "break-atr",
  "act-burst",
  "dir-vwap",
  "move-impulse",
  "rsi-mom-14-20",
  "bb-walk",
  "sar-std",
  "macd-hist",
  "ema-9-21",
  "cci-14-100",
  "obv-20",
  "kelt-20-1.5",
  "ichi-tk-9",
  "hma-16",
  "tactic-trend-s",
] as const;
export const INVERSE_MATH = [
  "zscore",
  "impulse",
  "acceleration",
  "regression",
  "wick",
  "failed-break",
  "consensus",
  "market-residual",
  "market-shock",
  "market-aligned",
] as const;
export const INVERSE_WINDOWS = [20, 40] as const;
export const INVERSE_CONFIG_IDS = [
  ...INVERSE_SOURCES.flatMap((id) => [`inverse-known-${id}`, `inverse-turn-${id}`]),
  ...INVERSE_MATH.flatMap((method) => INVERSE_WINDOWS.map((p) => `inverse-${method}-${p}`)),
];
export const isInverseInd = (id: string) => id.startsWith("inverse-");
