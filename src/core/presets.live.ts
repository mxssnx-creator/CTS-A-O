// Saved live coordinations: the settings a live desk ran with, kept as presets for later use (hand-maintained; the
// measured desk presets in presets.desk.ts are generated). A preset never carries the Live stage — the live part of a
// coordination (limits, margin floor, control mode, the mainnet readiness waiver, launch flags) is in
// docs/live-coordination.md together with the desk files.
import type { Preset } from "./presets.ts";
import { GENERAL_RANGE, LONG_RANGE, MICRO_RANGE, MINIMAL_RANGE, SHORT_RANGE } from "./minimal-coord.ts";

export const LIVE_COORD_PRESETS: Preset[] = [
  {
    id: "live-all-independent",
    label: "Live · all configs independent (Base PF 1.05)",
    info:
      "Every indication, strategy type (normal, trailing, block, block Active, DCA, DCA Active, axis) and range " +
      "(micro, minimal, short, general, long) on; Base validation at min PF 1.05 decides what trades, each config set on " +
      "its own validation; no position caps, no coordination between configs; signals validate on their own last 10 " +
      "closes; 25 symbols with XRP, SOL and BCH forced. Run on x01 and the VST twin on 2026-10-02 (twin paper: " +
      "PF 1.11 over 32 closes in 3.8 h, Short PF 2.50, Long 0.79, General 0.14). Live part: docs/live-coordination.md.",
    kind: "research",
    at: Date.UTC(2026, 9, 2, 23, 0),
    settings: {
      symbols: 25,
      forceSymbols: ["XRP-USDT", "SOL-USDT", "BCH-USDT"],
      gates: { minPf: 1.05 },
      disabledKinds: [],
      toggles: {
        normal: true,
        trailing: true,
        block: true,
        blockActive: true,
        dca: true,
        dcaActive: true,
        axis: true,
      },
      grid: {
        micro: MICRO_RANGE,
        minimal: MINIMAL_RANGE,
        short: SHORT_RANGE,
        general: GENERAL_RANGE,
        long: LONG_RANGE,
      },
      signals: { maxPositions: 0, maxOpen: 0, perSymbol: 0 },
    },
    wf: {
      maxPositions: 0,
      maxOpen: 0,
      maxPerSymbol: 0,
      maxPerSide: 0,
      coord: { enabled: false, hourLock: 0, cooldown: "off", conflict: false, confirm: false },
      signalValidLastN: 10,
    },
    metrics: {
      pf: 1.11,
      n: 32,
      perDay: 200,
      wr: 0.594,
      net: 30.7,
      greenHours: 0.5,
      period: "2026-10-02 19:10 → 22:53 UTC (3.8 h)",
      source: "live paper book of the VST twin (live prices), 12 symbols, before the switch to 25",
    },
  },
];
