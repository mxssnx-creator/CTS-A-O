// Bot entry triggers. Eight fade-to-magnet bots (semantics of the desk bots, without look-ahead) plus
// "follow", which enters on indication onsets. A bot × indication combo = trigger AND indication agrees.
import type { BotType, Side, Tactics } from "../domain/types.ts";
import type { SeriesCache } from "../indications/cache.ts";
import { tacticKeyFor, withTactics } from "../indications/filters.ts";
import { isInverseInd } from "../indications/inverse-config.ts";
import { indicationState, laneOf } from "../indications/registry.ts";

export interface BotSpec {
  type: BotType;
  label: string;
  magnet: string;
  thesis: string;
}

export const BOTS: readonly BotSpec[] = [
  {
    type: "sandwich",
    label: "Sandwich",
    magnet: "1H VWAP",
    thesis: "Fade a stretch away from the hour VWAP once price turns back.",
  },
  {
    type: "snap",
    label: "Snap",
    magnet: "1H VWAP + RSI",
    thesis: "VWAP fade confirmed by an RSI extreme.",
  },
  {
    type: "pulse",
    label: "Pulse",
    magnet: "1H VWAP (expansion)",
    thesis: "VWAP fade only when this hour's range exceeds the last hour's.",
  },
  { type: "ribbon", label: "Ribbon", magnet: "EMA21", thesis: "Fade a stretch from EMA21." },
  {
    type: "sweep",
    label: "Sweep",
    magnet: "Prior hour extreme",
    thesis: "Wick through the prior hour high/low, then reclaim.",
  },
  {
    type: "clamp",
    label: "Clamp",
    magnet: "Hour open",
    thesis: "Fade a stretch from the hour open.",
  },
  {
    type: "magnet",
    label: "Magnet",
    magnet: "Prior hour VWAP",
    thesis: "First half of the hour: fade back to the prior hour VWAP.",
  },
  {
    type: "pivot",
    label: "Pivot",
    magnet: "Prior hour pivot",
    thesis: "Fade toward the prior hour (H+L+C)/3.",
  },
  {
    type: "follow",
    label: "Follow",
    magnet: "—",
    thesis: "Enter in the indication's direction when its state turns on.",
  },
  {
    type: "revert",
    label: "Revert",
    magnet: "—",
    thesis: "Fade the indication: enter against its direction when its state turns on.",
  },
];

export const BOT_BY_TYPE: ReadonlyMap<BotType, BotSpec> = new Map(BOTS.map((b) => [b.type, b]));

/** Stretch threshold in ATR(14) units. */
export const FADE_ATR = 0.9;
const HOUR = 3_600_000;

function fade(
  k: SeriesCache,
  magnet: Float64Array,
  extra?: (i: number, side: Side) => boolean,
): Int8Array {
  const { c, n } = k.b;
  const a = k.atr(14);
  const out = new Int8Array(n);
  for (let i = 1; i < n; i++) {
    const m = magnet[i];
    const at = a[i];
    if (!Number.isFinite(m) || !Number.isFinite(at) || at <= 0) continue;
    const d = c[i] - m;
    if (d < -FADE_ATR * at && c[i] > c[i - 1]) {
      if (!extra || extra(i, 1)) out[i] = 1;
    } else if (d > FADE_ATR * at && c[i] < c[i - 1]) {
      if (!extra || extra(i, -1)) out[i] = -1;
    }
  }
  return out;
}

export function botTrigger(type: BotType, k: SeriesCache): Int8Array | null {
  if (type === "follow" || type === "revert") return null;
  return k.memo(`bot:${type}`, () => {
    const per = k.period(HOUR);
    const { t, c, h, l, n } = k.b;
    switch (type) {
      case "sandwich":
        return fade(k, per.curVwap);
      case "snap": {
        const r = k.rsi(14);
        return fade(k, per.curVwap, (i, s) => (s === 1 ? r[i] < 35 : r[i] > 65));
      }
      case "pulse":
        return fade(k, per.curVwap, (i) => per.curRange[i] > per.prevRange[i]);
      case "ribbon":
        return fade(k, k.ema(21));
      case "clamp":
        return fade(k, per.curOpen);
      case "magnet":
        return fade(k, per.prevVwap, (i) => (t[i] % HOUR) / 60_000 < 30);
      case "pivot":
        return fade(k, per.prevPivot);
      case "sweep": {
        const out = new Int8Array(n);
        for (let i = 0; i < n; i++) {
          const ph = per.prevHigh[i];
          const pl = per.prevLow[i];
          if (!Number.isFinite(ph)) continue;
          // an outside bar sweeps BOTH prior extremes and reclaims both: no side (the else-if handed every such
          // bar to long, which also made the trigger asymmetric on a mirrored market)
          const up = l[i] < pl && c[i] > pl;
          const dn = h[i] > ph && c[i] < ph;
          out[i] = up === dn ? 0 : up ? 1 : -1;
        }
        return out;
      }
      default:
        return new Int8Array(n);
    }
  });
}

/**
 * The memo keys of one bot × indication combo, built once: a key made by a template literal per call is a new string that
 * the memo's Map hashes again every time (11 % of Base's CPU in the x01 profile). The strings keep their content, so the
 * suffix forgetting (forgetCombo) still matches them.
 */
interface EntryKeys {
  combo: string;
  /** `${bot}:${ind}` */
  bi: string;
  every: string;
  /** the indication's base for the tactics key (its "@x<n>" suffix cut) */
  base: string;
  /** by tactics key: `tac:${key}:${bi}`, `tac:${key}:${bi}:every`, `run:${key}:${bi}` */
  tac: Map<string, { tac: string; every: string; run: string }>;
}
const ENTRY_KEYS = new Map<string, Map<string, EntryKeys>>();
function entryKeys(bot: BotType, ind: string): EntryKeys {
  let byInd = ENTRY_KEYS.get(bot);
  if (!byInd) ENTRY_KEYS.set(bot, (byInd = new Map()));
  let e = byInd.get(ind);
  if (!e) {
    if (byInd.size > 200_000) byInd.clear();
    e = {
      combo: `combo:${bot}:${ind}`,
      bi: `${bot}:${ind}`,
      every: `${bot}:${ind}:every`,
      base: laneOf(ind).base.replace(/@x\d+$/, ""),
      tac: new Map(),
    };
    byInd.set(ind, e);
  }
  return e;
}
function tacKeys(e: EntryKeys, key: string) {
  let t = e.tac.get(key);
  if (!t) e.tac.set(key, (t = { tac: `tac:${key}:${e.bi}`, every: `tac:${key}:${e.every}`, run: `run:${key}:${e.bi}` }));
  return t;
}

/** Final entry signal for a bot × indication combo. Returns null when the combo is not defined. */
export function comboSignal(bot: BotType, ind: string, k: SeriesCache): Int8Array | null {
  return k.memo(entryKeys(bot, ind).combo, () => {
    // An Inverse source already reverses its input before entry. Never reverse it again via a Bot/preset.
    if (isInverseInd(laneOf(ind).base) && bot !== "follow" && bot !== "exit") return new Int8Array(k.b.n);
    const st = indicationState(ind, k);
    if (bot === "follow" || bot === "revert" || bot === "exit") {
      if (!st) return null;
      // Historic Exit has a stable direction-onset source. It carries no Bot trigger and does not inherit
      // the selected Bot's filters or the range-engine's remove-only tactics.
      const dir = bot === "revert" ? -1 : 1;
      const frame = k.streamMath?.frame<{ value: Int8Array }, number>(
        `combo:${bot}:${ind}`,
        k.b.n,
        ["value"],
        () => 0,
        ["value"],
      );
      const out = frame?.cols.value ?? new Int8Array(k.b.n);
      for (let i = Math.max(1, frame?.from ?? 1); i < st.length; i++)
        if (st[i] !== 0 && st[i] !== st[i - 1]) out[i] = st[i] * dir;
      frame?.commit(0);
      return out;
    }
    const trig = botTrigger(bot, k)!;
    if (!st) return trig;
    const out = new Int8Array(trig.length);
    for (let i = 0; i < trig.length; i++) if (trig[i] !== 0 && st[i] === trig[i]) out[i] = trig[i];
    return out;
  });
}

/** Entry signal of a combo after the engine-wide tactics (session, volatility, trend strength). */
export function entrySignal(
  bot: BotType,
  ind: string,
  k: SeriesCache,
  tactics?: Tactics | null,
): Int8Array | null {
  // Inverse already defines the traded direction. A saved/manual Revert pair cannot undo it.
  if (bot === "revert" && isInverseInd(laneOf(ind).base)) return new Int8Array(k.b.n);
  // (a low-ADX indication, its combined "@x4" form too, skips the trend-strength tactic: it would remove every entry,
  // LOW_ADX_INDS)
  const e = entryKeys(bot, ind);
  const key = tacticKeyFor(tactics, e.base);
  if (bot === "exit") return comboSignal(bot, ind, k);
  if (key && tactics?.onRun && (bot === "follow" || bot === "revert")) return runEntries(bot, ind, k, key);
  const sig = comboSignal(bot, ind, k);
  if (!sig) return null;
  return key ? withTactics(sig, k, key, e.bi, tacKeys(e, key).tac) : sig;
}

/**
 * tactics.onRun: one follow / revert entry per state run, on the run's first bar the tactics keep (the onset rule
 * tests the tactics on the onset bar alone). Memoized per symbol cache.
 */
function runEntries(bot: "follow" | "revert", ind: string, k: SeriesCache, key: string): Int8Array | null {
  const e = entryKeys(bot, ind);
  const keys = tacKeys(e, key);
  return k.memo(keys.run, () => {
    const st = indicationState(ind, k);
    if (!st) return null;
    const dir = bot === "follow" ? 1 : -1;
    const n = st.length;
    // every bar of every run as a candidate, then the tactics
    const every = new Int8Array(n);
    for (let i = 1; i < n; i++) if (st[i] !== 0) every[i] = st[i] * dir;
    const kept = withTactics(every, k, key, e.every, keys.every);
    const out = new Int8Array(n);
    let taken = false;
    for (let i = 1; i < n; i++) {
      // a new run starts where the state changes
      if (st[i] !== st[i - 1]) taken = false;
      if (!taken && kept[i] !== 0) {
        out[i] = kept[i];
        taken = true;
      }
    }
    return out;
  });
}
