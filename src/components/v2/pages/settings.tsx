import { useEffect, useRef, useState, type ReactNode } from "react";
import { coreSettings, coreStatus, saveCoreSettings } from "@/core/api";
import { GATE_PRESETS, MAX_DDT_CHOICES, MIN_PF_CHOICES, STRATEGY_PRESETS } from "@/core/config";
import { INDICATION_KINDS, type AxisRange } from "@/core/domain/types";
import { DEFAULT_SIGNALS, SIGNAL_COUNT_CHOICES, SIGNAL_SOURCES } from "@/core/signal-config";
import { Confirm, downloadFile, Empty, ErrorNote, Panel, Pill, Switch, usePoll } from "../ui";

const AXIS_RANGES: AxisRange[] = ["atr", "linear", "geo", "fib", "volume"];

type Any = any;

const BLOCK_SOURCE_HELP: Array<[string, string]> = [
  ["config", "the config set's own closed positions"],
  ["overall", "every executed position"],
  ["symbol", "positions on the same symbol"],
  ["direction", "positions on the same side (long / short)"],
  ["indication", "positions of the same indication type"],
  ["type", "positions of the same strategy type (Normal, Trailing, DCA, Axis)"],
];

/** Block sources and how their levels combine (shared = strongest source, additive = sum). */
export function BlockSources(props: {
  block: { sources?: Record<string, boolean | undefined>; mode?: string };
  set: (path: string[], v: unknown) => void;
}) {
  const src = props.block.sources ?? {};
  const on = (k: string) => (k === "config" ? src.config !== false : !!src[k]);
  return (
    <div className="v2-lines" style={{ gap: 6, marginTop: 8 }}>
      <Field
        label="Type"
        hint="shared: strongest source's level · additive: levels add up (capped by max multiple)"
      >
        <select
          className="v2-select"
          aria-label="Block type"
          value={props.block.mode ?? "shared"}
          onChange={(e) => props.set(["block", "mode"], e.target.value)}
        >
          <option value="shared">Shared</option>
          <option value="additive">Additive</option>
        </select>
      </Field>
      {BLOCK_SOURCE_HELP.map(([k, help]) => (
        <div key={k} style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Switch
            label={`Block source ${k}`}
            checked={on(k)}
            onChange={(v) => props.set(["block", "sources", k], v)}
          />
          <div>
            <div style={{ fontWeight: 600, textTransform: "capitalize" }}>{k}</div>
            <div className="v2-muted" style={{ fontSize: "var(--v-fs-xs)" }}>
              {help}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Signals processing: proven sources in a short and a medium range, the best N active (by Base, per symbol),
 * each with its own 15 Normal + 15 Trailing configs run independently per symbol and direction, and the last-N
 * guard that disables a config while its recent results average below zero.
 */
export function SignalsSettings(props: {
  signals: Any;
  set: (path: string[], v: unknown) => void;
  status?: Any;
}) {
  const g = { ...DEFAULT_SIGNALS, ...(props.signals ?? {}) } as Any;
  const guard = { ...DEFAULT_SIGNALS.guard, ...(g.guard ?? {}) };
  const cluster = { ...DEFAULT_SIGNALS.cluster, ...(g.cluster ?? {}) };
  const ranges = { ...DEFAULT_SIGNALS.ranges, ...(g.ranges ?? {}) };
  const normal = { ...DEFAULT_SIGNALS.normal, ...(g.normal ?? {}) };
  const trailing = { ...DEFAULT_SIGNALS.trailing, ...(g.trailing ?? {}) };
  const atr = { ...DEFAULT_SIGNALS.atr, ...(g.atr ?? {}) };
  const exits: string = g.exits ?? DEFAULT_SIGNALS.exits;
  const lanes: number[] = g.lanes?.length ? g.lanes : DEFAULT_SIGNALS.lanes;
  const src: Record<string, boolean> = g.sources ?? {};
  const set = (path: string[], v: unknown) => props.set(["signals", ...path], v);
  const nPct =
    normal.tp.length * normal.slOfTp.length + trailing.tp.length * trailing.trailOfTp.length;
  const nAtr = atr.sl.length * atr.tpRatio.length * (1 + atr.trail.length);
  const nConfigs = (exits !== "atr" ? nPct : 0) + (exits !== "pct" ? nAtr : 0);
  const st = props.status;
  return (
    <div className="v2-lines" style={{ gap: 10 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <Switch
          label="Signals processing"
          checked={!!g.enabled}
          onChange={(v) => set(["enabled"], v)}
        />
        <div style={{ fontWeight: 600 }}>
          {g.enabled ? (
            <span className="v2-up">Signals on</span>
          ) : (
            <span className="v2-muted">Signals off</span>
          )}
        </div>
        {st?.enabled ? (
          <span className="v2-muted" style={{ fontSize: "var(--v-fs-xs)" }}>
            {st.combos} scored · {st.active} active · {st.configs} configs
            {st.trades !== undefined ? ` · ${st.trades} orders` : ""}
            {st.disabled ? ` · ${st.disabled} guarded` : ""}
          </span>
        ) : null}
      </div>
      <div className="v2-grid v2-cols-4">
        <Field label="Active signals" hint="best by Base result per symbol · 10–200">
          <select
            className="v2-select"
            aria-label="Active signals"
            value={g.count}
            onChange={(e) => set(["count"], Number(e.target.value))}
          >
            {SIGNAL_COUNT_CHOICES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Hold (h)" hint="max hold per signal order">
          <Num value={g.holdH} min={0.5} max={96} step={0.5} onChange={(v) => set(["holdH"], v)} />
        </Field>
        <Field
          label="Ranking"
          hint="drawdown: net ÷ max drawdown, with a minimum of positive 4-hour blocks"
        >
          <select
            className="v2-select"
            aria-label="Signal ranking"
            value={g.rank ?? "drawdown"}
            onChange={(e) => set(["rank"], e.target.value)}
          >
            <option value="drawdown">By drawdown (recovery)</option>
            <option value="lowdd">Lowest drawdown (net ÷ drawdown²)</option>
            <option value="net">By net result</option>
          </select>
        </Field>
        <Field
          label="Validate on latest hours"
          hint="a signal trades only while it was also positive over its latest hours"
        >
          <Switch
            label="Validate signals on their latest hours"
            checked={g.validate !== false}
            onChange={(v) => set(["validate"], v)}
          />
        </Field>
        <Field
          label="Stable sources only"
          hint="a source pauses while its own taken signal orders of the latest days lost (judged at every entry)"
        >
          <Switch
            label="Source stability gate"
            checked={g.sourceGate?.enabled === true}
            onChange={(v) => set(["sourceGate", "enabled"], v)}
          />
        </Field>
        <Field label="Stability: days" hint="latest days of taken orders judged · 1–14">
          <Num
            value={g.sourceGate?.days ?? 2}
            min={1}
            max={14}
            onChange={(v) => set(["sourceGate", "days"], v)}
          />
        </Field>
        <Field
          label="Stability: positive days (%)"
          hint="share of its traded days that must be positive"
        >
          <Num
            pct
            step={5}
            min={0}
            max={1}
            value={g.sourceGate?.minShare ?? 0.5}
            onChange={(v) => set(["sourceGate", "minShare"], v)}
          />
        </Field>
        <Field label="Stability: min orders" hint="fewer taken orders than this: not judged yet">
          <Num
            value={g.sourceGate?.minTrades ?? 5}
            min={1}
            max={100}
            onChange={(v) => set(["sourceGate", "minTrades"], v)}
          />
        </Field>
        <Field
          label="Signal stop floor (%)"
          hint="no signal config's stop closer than this (every lane, % and ATR exits)"
        >
          <Num
            pct
            step={0.05}
            min={0}
            max={0.1}
            value={g.minSl ?? 0.005}
            onChange={(v) => set(["minSl"], v)}
          />
        </Field>
        <Field
          label="Signal trailing floor (%)"
          hint="no signal config's trailing distance closer than this"
        >
          <Num
            pct
            step={0.05}
            min={0}
            max={0.1}
            value={g.minTrail ?? 0.005}
            onChange={(v) => set(["minTrail"], v)}
          />
        </Field>
        <Field label="Validation window (h)" hint="latest hours judged at every step · 2–72">
          <Num value={g.validateH ?? 24} min={2} max={72} onChange={(v) => set(["validateH"], v)} />
        </Field>
        <Field label="Min positive 4-h blocks (%)" hint="drawdown ranking only">
          <Num
            pct
            step={5}
            min={0}
            max={1}
            value={g.minBlockShare ?? 0.6}
            onChange={(v) => set(["minBlockShare"], v)}
          />
        </Field>
        <Field label="Min Base trades" hint="per signal and symbol to be ranked">
          <Num value={g.minTrades} min={1} max={100} onChange={(v) => set(["minTrades"], v)} />
        </Field>
        <Field
          label="Guard: last N"
          hint="a config × symbol × direction pauses while its last N average < 0"
        >
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Switch
              label="Signal guard"
              checked={guard.enabled}
              onChange={(v) => set(["guard", "enabled"], v)}
            />
            <Num
              value={guard.lastN}
              min={2}
              max={50}
              onChange={(v) => set(["guard", "lastN"], v)}
            />
          </div>
        </Field>
      </div>
      <div className="v2-grid v2-cols-4">
        <Field label="Ranges">
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            {(["short", "medium"] as const).map((r) => (
              <span key={r} style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                <Switch
                  label={`Range ${r}`}
                  checked={!!ranges[r]}
                  disabled={!!ranges[r] && !ranges[r === "short" ? "medium" : "short"]}
                  onChange={(v) => set(["ranges", r], v)}
                />
                {r}
              </span>
            ))}
          </div>
        </Field>
        <Field label="Timeframe lanes" hint="of the engine's lanes">
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            {[1, 5, 15, 30].map((tf) => (
              <span key={tf} style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                <Switch
                  label={`Signal lane ${tf}m`}
                  checked={lanes.includes(tf)}
                  disabled={lanes.length === 1 && lanes.includes(tf)}
                  onChange={(v) =>
                    set(
                      ["lanes"],
                      [1, 5, 15, 30].filter((x) => (x === tf ? v : lanes.includes(x))),
                    )
                  }
                />
                {tf}m
              </span>
            ))}
          </div>
        </Field>
        <Field label="Orders / symbol" hint="signal orders' own cap · 0 = no limit">
          <Num
            value={g.perSymbol ?? 0}
            min={0}
            max={1000}
            onChange={(v) => set(["perSymbol"], v)}
          />
        </Field>
        <Field label="Open orders" hint="signal orders' own cap · 0 = no limit">
          <Num value={g.maxOpen ?? 0} min={0} max={100000} onChange={(v) => set(["maxOpen"], v)} />
        </Field>
        <Field
          label="Volatility floor"
          hint="signals only while ATR ÷ price is at least this (fraction, 0.003 = 0.3 %) · 0 = off"
        >
          <Num
            value={g.filter?.volFloor ?? 0}
            min={0}
            max={0.02}
            step={0.001}
            onChange={(v) => set(["filter", "volFloor"], v)}
          />
        </Field>
        <Field
          label="Trend filter (h)"
          hint="signals only in the direction of the EMA over this many hours · 0 = off (mixed in tests)"
        >
          <Num
            value={g.filter?.trendH ?? 0}
            min={0}
            max={48}
            onChange={(v) => set(["filter", "trendH"], v)}
          />
        </Field>
        <Field label="Strategy sets" hint="besides Normal + Trailing, each signal runs these sets">
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
              <Switch
                label="Signal DCA sets"
                checked={g.strategies?.dca === true}
                onChange={(v) => set(["strategies", "dca"], v)}
              />
              DCA
            </span>
            <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
              <Switch
                label="Signal Axis sets"
                checked={g.strategies?.axis === true}
                onChange={(v) => set(["strategies", "axis"], v)}
              />
              Axis
            </span>
          </div>
        </Field>
      </div>
      <div className="v2-grid v2-cols-4">
        <Field
          label="Loss-cluster guard"
          hint="pause signal executions while many signals just lost together (all keep being computed)"
        >
          <Switch
            label="Signal loss-cluster guard"
            checked={cluster.enabled}
            onChange={(v) => set(["cluster", "enabled"], v)}
          />
        </Field>
        <Field label="Cluster window (min)">
          <Num
            value={cluster.windowMin}
            min={5}
            max={720}
            onChange={(v) => set(["cluster", "windowMin"], v)}
          />
        </Field>
        <Field label="Min losing closes">
          <Num
            value={cluster.minLosses}
            min={1}
            max={1000}
            onChange={(v) => set(["cluster", "minLosses"], v)}
          />
        </Field>
        <Field label="Min loss share (%)">
          <Num
            pct
            step={5}
            min={0.3}
            max={1}
            value={cluster.lossShare}
            onChange={(v) => set(["cluster", "lossShare"], v)}
          />
        </Field>
      </div>
      <div className="v2-grid v2-cols-2">
        <Field
          label={`Normal: targets (%) × stop ratios → ${normal.tp.length * normal.slOfTp.length} configs`}
          hint="targets at the 15m reference, scaled per lane · stop = target × ratio"
        >
          <div className="v2-grid v2-cols-2" style={{ gap: 6 }}>
            <List pct value={normal.tp} onChange={(v) => set(["normal", "tp"], v)} />
            <List value={normal.slOfTp} onChange={(v) => set(["normal", "slOfTp"], v)} />
          </div>
        </Field>
        <Field
          label={`Trailing: targets (%) × trail shares → ${trailing.tp.length * trailing.trailOfTp.length} configs`}
          hint="trail = target × share · stop = target × stop ratio (wider)"
        >
          <div className="v2-grid v2-cols-3" style={{ gap: 6 }}>
            <List pct value={trailing.tp} onChange={(v) => set(["trailing", "tp"], v)} />
            <List value={trailing.trailOfTp} onChange={(v) => set(["trailing", "trailOfTp"], v)} />
            <Num
              value={trailing.slOfTp}
              step={0.25}
              min={0.2}
              max={5}
              onChange={(v) => set(["trailing", "slOfTp"], v)}
            />
          </div>
        </Field>
      </div>
      <div className="v2-grid v2-cols-4">
        <Field
          label="Exit model"
          hint="percent grid above, ATR exits (Stable-02: stop × ATR(14) at entry, target × stop), or both"
        >
          <select
            className="v2-select"
            aria-label="Signal exit model"
            value={exits}
            onChange={(e) => set(["exits"], e.target.value)}
          >
            <option value="pct">Percent</option>
            <option value="atr">ATR</option>
            <option value="both">Both</option>
          </select>
        </Field>
        <Field
          label={`ATR: stop (× ATR) × target ratios → ${atr.sl.length * atr.tpRatio.length} cells`}
          hint="stop 0.2–2 × ATR(14) · target 0.2–3 × stop"
        >
          <div className="v2-grid v2-cols-2" style={{ gap: 6 }}>
            <List value={atr.sl} onChange={(v) => set(["atr", "sl"], v)} />
            <List value={atr.tpRatio} onChange={(v) => set(["atr", "tpRatio"], v)} />
          </div>
        </Field>
        <Field
          label="ATR: trailing (%)"
          hint="each cell also runs once per trail % (0.4–2.4): arms at 0.95 × stop"
        >
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Switch
              label="ATR trailing variants"
              checked={atr.trail.length > 0}
              onChange={(v) => set(["atr", "trail"], v ? [...DEFAULT_SIGNALS.atr.trail] : [])}
            />
            {atr.trail.length > 0 ? (
              <List value={atr.trail} onChange={(v) => set(["atr", "trail"], v)} />
            ) : null}
          </div>
        </Field>
        <Field label="ATR: hold (15m bars)" hint="scaled per lane · 0 = the signal hold above">
          <Num
            value={atr.holdBars}
            min={0}
            max={384}
            onChange={(v) => set(["atr", "holdBars"], v)}
          />
        </Field>
      </div>
      <div className="v2-muted" style={{ fontSize: "var(--v-fs-xs)" }}>
        {nConfigs} configs per signal
        {exits === "both" ? ` (${nPct} percent + ${nAtr} ATR)` : ""}, each run on its own per symbol
        and direction.
      </div>
      <div>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Sources</div>
        <div className="v2-grid v2-cols-4" style={{ gap: 6 }}>
          {SIGNAL_SOURCES.map((x) => (
            <div key={x.name} style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <Switch
                label={`Signal source ${x.label}`}
                checked={src[x.name] !== false}
                onChange={(v) => set(["sources", x.name], v)}
              />
              <span>{x.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const TF_HELP: Record<number, string> = {
  1: "base data · every lane is derived from the 1m candles",
  5: "5 × 1m",
  15: "15 × 1m",
  30: "30 × 1m",
};

/**
 * Timeframe lanes: all processed at once, each independent and combined (kept only where every higher enabled
 * timeframe agrees). 1m is the base and always on; the days are each lane's history.
 */
export function Timeframes(props: {
  tfs: number[];
  tfDays: Record<string, number>;
  set: (path: string[], v: unknown) => void;
}) {
  const on = new Set(props.tfs ?? [1, 5, 15, 30]);
  return (
    <div className="v2-lines" style={{ gap: 8 }}>
      {[1, 5, 15, 30].map((tf) => (
        <div key={tf} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <Switch
            label={`Timeframe ${tf}m`}
            checked={on.has(tf)}
            disabled={tf === 1}
            onChange={(v) =>
              props.set(
                ["tfs"],
                [1, 5, 15, 30].filter((x) => (x === tf ? v : on.has(x))),
              )
            }
          />
          <div style={{ minWidth: 150, flex: 1 }}>
            <div style={{ fontWeight: 600 }}>
              {tf}m{" "}
              {on.has(tf) ? (
                <span className="v2-up">· processed</span>
              ) : (
                <span className="v2-muted">· off</span>
              )}
            </div>
            <div className="v2-muted" style={{ fontSize: "var(--v-fs-xs)" }}>
              {TF_HELP[tf]} · independent{tf < 30 ? " + combined" : ""}
            </div>
          </div>
          <div style={{ width: 110 }}>
            <Num
              value={props.tfDays?.[String(tf)] ?? 3}
              min={1}
              max={45}
              onChange={(v) => props.set(["tfDays", String(tf)], v)}
            />
          </div>
          <span className="v2-muted" style={{ fontSize: "var(--v-fs-xs)" }}>
            days
          </span>
        </div>
      ))}
    </div>
  );
}

export function Field(props: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 3, fontSize: "var(--v-fs-sm)" }}>
      <span style={{ color: "var(--v-text-2)", fontWeight: 600 }}>{props.label}</span>
      {props.children}
      {props.hint && (
        <span className="v2-muted" style={{ fontSize: "var(--v-fs-xs)" }}>
          {props.hint}
        </span>
      )}
    </label>
  );
}

export function Num(props: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  pct?: boolean;
}) {
  const toText = (v: number) => String(props.pct ? +(v * 100).toFixed(4) : v);
  const [text, setText] = useState(toText(props.value));
  const [focus, setFocus] = useState(false);
  // follow external changes (presets, import, reload) unless the user is typing
  useEffect(() => {
    if (!focus) setText(toText(props.value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.value, props.pct, focus]);
  // min / max are in value units (fractions for pct fields): compare the typed number in the same units
  const typed = Number(text);
  const val = props.pct ? typed / 100 : typed;
  const eps = 1e-12;
  const bad =
    text.trim() === "" ||
    !Number.isFinite(typed) ||
    (props.min !== undefined && val < props.min - eps) ||
    (props.max !== undefined && val > props.max + eps);
  const scale = (x: number | undefined) =>
    x === undefined ? undefined : props.pct ? +(x * 100).toFixed(6) : x;
  return (
    <input
      className="v2-input"
      type="number"
      inputMode="decimal"
      step={props.step ?? (props.pct ? 0.01 : 1)}
      min={scale(props.min)}
      max={scale(props.max)}
      value={text}
      aria-invalid={bad}
      style={bad ? { borderColor: "var(--v-down)" } : undefined}
      onFocus={() => setFocus(true)}
      onBlur={() => {
        setFocus(false);
        if (bad) setText(toText(props.value));
      }}
      onChange={(e) => {
        setText(e.target.value);
        const v = Number(e.target.value);
        if (e.target.value.trim() === "" || !Number.isFinite(v)) return;
        const x = props.pct ? v / 100 : v;
        // out-of-range input stays local (shown red, reset on blur) and is never saved
        if (props.min !== undefined && x < props.min - 1e-12) return;
        if (props.max !== undefined && x > props.max + 1e-12) return;
        props.onChange(x);
      }}
    />
  );
}

export function List(props: {
  value: readonly number[];
  onChange: (v: number[]) => void;
  pct?: boolean;
}) {
  const toText = (xs: readonly number[]) =>
    xs.map((v) => (props.pct ? +(v * 100).toFixed(4) : v)).join(", ");
  const [text, setText] = useState(toText(props.value));
  const [focus, setFocus] = useState(false);
  const parse = (t: string) =>
    t
      .split(/[,\s]+/)
      .filter(Boolean)
      .map(Number)
      .filter((x) => Number.isFinite(x));
  useEffect(() => {
    if (!focus) setText(toText(props.value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.value, props.pct, focus]);
  // nothing parses → invalid (red); on blur the text resets to the saved list
  const bad = parse(text).length === 0;
  return (
    <input
      className="v2-input"
      value={text}
      aria-invalid={bad}
      style={bad ? { borderColor: "var(--v-down)" } : undefined}
      onFocus={() => setFocus(true)}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        setFocus(false);
        const xs = parse(text);
        if (xs.length) props.onChange(xs.map((x) => (props.pct ? x / 100 : x)));
        setText(toText(xs.length ? xs.map((x) => (props.pct ? x / 100 : x)) : props.value));
      }}
    />
  );
}

/** how the universe is chosen (settings.symbolRank; default 1H volatility) */
const SYMBOL_RANK: Record<string, string> = {
  volatility1h: "1H volatility",
  volume: "24h quote volume",
  market: "market majors",
  gainers: "24h gainers",
  losers: "24h losers",
};

const TOGGLE_HELP: Record<string, string> = {
  normal:
    "the base sets (Normal and Trailing); off = the unadjusted base never executes — only Block-raised entries, and DCA / Axis keep running on it",
  trailing:
    "trailing-stop variants; off = no trailing anywhere (base, Block, signals), still computed",
  block: "adds +ratio volume per passing last-n window (1..max)",
  blockActive:
    "Active: Block raises volume only from its min level (a sustained streak); below it an entry is the plain base — executed with Normal on, skipped with Normal off",
  dca: "adds legs at deeper levels, target re-anchored to the average",
  dcaActive: "Active: skip the base leg, trade only the higher-level (better-priced) fill",
  axis: "Axis: mean-reversion ladder toward the axis (EMA centre), rungs at ATR spacing",
};

/** Free text while typing; parsed into pairs on blur (typing commas / spaces is never eaten). */
export function FocusText(props: { value: readonly string[]; onChange: (v: string[]) => void }) {
  const [text, setText] = useState(props.value.join(", "));
  const [focus, setFocus] = useState(false);
  useEffect(() => {
    if (!focus) setText(props.value.join(", "));
  }, [props.value, focus]);
  return (
    <textarea
      className="v2-input"
      rows={4}
      value={text}
      onFocus={() => setFocus(true)}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        setFocus(false);
        props.onChange(
          text
            .split(/[,\s]+/)
            .map((x) => x.trim())
            .filter(Boolean),
        );
      }}
    />
  );
}

const TACTIC_HELP: Record<string, string> = {
  session: "EU/US session only — signals on bars opening 07:00–20:59 UTC",
  volRegime: "volatility regime — ATR% in the upper half of its last ~2 weeks",
  trendStrength: "trend strength — ADX(14) ≥ 20",
  cooldown: "pacing — after an exit the config waits N bars before re-entering the symbol",
};

export function SettingsPage() {
  const [s, setS] = useState<Any>(null);
  const [wf, setWf] = useState<Any>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [base, setBase] = useState<string>("");
  const [ask, setAsk] = useState<null | "live" | "reset" | "mainnet">(null);
  // server status at save time (server clock): applied once a compute newer than it used the saved settings
  const [savedAt, setSavedAt] = useState<null | { settingsAt: number; lastComputeAt: number }>(
    null,
  );
  const fileRef = useRef<HTMLInputElement>(null);
  const { data: st } = usePoll(() => coreStatus(), 2500);
  const status = st as Any;
  const load = () =>
    coreSettings()
      .then((d: Any) => {
        setS(d.settings);
        setWf(d.wf);
        setBase(JSON.stringify({ settings: d.settings, wf: d.wf }));
      })
      .catch((e) => setError(String(e?.message ?? e)));
  useEffect(() => {
    void load();
  }, []);
  if (!s || !wf) return <>{error ? <ErrorNote error={error} /> : <Empty>Loading…</Empty>}</>;
  const dirty = base !== "" && JSON.stringify({ settings: s, wf }) !== base;
  const applied =
    !!savedAt &&
    !!status &&
    status.appliedSettingsAt >= status.settingsAt &&
    (status.settingsAt > savedAt.settingsAt || status.lastComputeAt > savedAt.lastComputeAt) &&
    !status.pending;
  const applyState = !savedAt
    ? null
    : applied
      ? `applied in compute #${status.computes}`
      : status?.state === "computing"
        ? `applying… ${status.stage} ${Math.round((status.progress ?? 0) * 100)}%`
        : "applying…";
  const set = (path: string[], v: unknown) => {
    setS((prev: Any) => {
      const next = structuredClone(prev);
      let o = next;
      for (const k of path.slice(0, -1)) o = o[k] ??= {};
      o[path[path.length - 1]] = v;
      return next;
    });
    setSaved(null);
  };
  const setW = (k: string, v: unknown) => {
    setWf((p: Any) => ({ ...p, [k]: v }));
    setSaved(null);
  };
  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      // send only what changed on this page (another tab / an applied preset is not overwritten)
      const b = base ? JSON.parse(base) : { settings: {}, wf: {} };
      const diff = (cur: Any, old: Any) =>
        Object.fromEntries(
          Object.keys(cur)
            .filter((k) => JSON.stringify(cur[k]) !== JSON.stringify(old?.[k]))
            .map((k) => [k, cur[k]]),
        );
      const pre = (await coreStatus().catch(() => status)) as Any;
      await saveCoreSettings({ data: { settings: diff(s, b.settings), wf: diff(wf, b.wf) } });
      setSavedAt({ settingsAt: pre?.settingsAt ?? 0, lastComputeAt: pre?.lastComputeAt ?? 0 });
      setSaved("Saved");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  const importFile = (f: File) =>
    f.text().then((t) => {
      try {
        const j = JSON.parse(t);
        // older exports lack newer sections (axis, tactics …): merge over the loaded settings, never replace them
        const merge = (a: Any, b: Any): Any => {
          if (!b || typeof b !== "object" || Array.isArray(b)) return b ?? a;
          const out: Any = { ...(a ?? {}) };
          for (const k of Object.keys(b))
            out[k] =
              a && typeof a[k] === "object" && !Array.isArray(a[k]) ? merge(a[k], b[k]) : b[k];
          return out;
        };
        // an import never switches Live on by itself: enabling goes through the Live confirmation
        const wantLive = j.settings?.live?.enabled === true && !s.live.enabled;
        if (j.settings?.live && j.settings.live.enabled === true) delete j.settings.live.enabled;
        // switching to the mainnet connection while Live is on is confirmed too
        const toMainnet =
          j.settings?.live?.connId === "bingx-x01" &&
          s.live.connId !== "bingx-x01" &&
          s.live.enabled;
        if (toMainnet) delete j.settings.live.connId;
        if (j.settings) setS((cur: Any) => merge(cur, j.settings));
        if (j.wf) setWf((cur: Any) => ({ ...cur, ...j.wf }));
        setSaved("Imported — press Save to apply");
        if (toMainnet) setAsk("mainnet");
        else if (wantLive) setAsk("live");
      } catch {
        setError("Not a settings JSON");
      }
    });
  return (
    <>
      <ErrorNote error={error} />
      <Confirm
        open={ask !== null}
        title={
          ask === "live"
            ? `Enable the Live stage on ${s.live.connId}?`
            : ask === "mainnet"
              ? "Switch the Live connection to bingx-x01 (mainnet)?"
              : "Discard unsaved changes?"
        }
        danger={ask === "live" || ask === "mainnet"}
        confirm={
          ask === "live" ? "Enable Live" : ask === "mainnet" ? "Switch to mainnet" : "Discard"
        }
        body={
          ask === "mainnet" ? (
            <>
              <p className="v2-down" style={{ fontWeight: 600 }}>
                Live is on — after Save, orders go to the MAINNET account with real money.
              </p>
              <p>
                Up to {s.live.maxPositions > 0 ? s.live.maxPositions : "unlimited"} positions of $
                {s.live.notionalUsd} each. Takes effect after Save.
              </p>
            </>
          ) : ask === "live" ? (
            <>
              {s.live.connId === "bingx-x01" ? (
                <p className="v2-down" style={{ fontWeight: 600 }}>
                  This is the MAINNET account — real money.
                </p>
              ) : null}
              <p>
                Orders are only sent when the host also has CTS_CORE_LIVE=1 and API keys, and only
                while the rolling simulated run holds PF ≥ {s.gates.minPf} and is stable. Up to{" "}
                {s.live.maxPositions > 0 ? s.live.maxPositions : "unlimited"} positions of $
                {s.live.notionalUsd} each. Takes effect after Save.
              </p>
            </>
          ) : (
            "Your edits on this page are lost and the saved settings are loaded again."
          )
        }
        onCancel={() => setAsk(null)}
        onConfirm={() => {
          if (ask === "live") set(["live", "enabled"], true);
          else if (ask === "mainnet") set(["live", "connId"], "bingx-x01");
          else void load();
          setAsk(null);
        }}
      />
      <Panel
        title="Settings"
        sub="stored in the in-memory SQLite (kv) and applied on the next compute"
        right={
          <>
            {dirty && <Pill kind="acc">unsaved changes</Pill>}
            {!dirty && saved && (
              <Pill kind={applied ? "ok" : undefined}>
                {saved} · {applyState}
              </Pill>
            )}
            <button type="button" className="v2-btn" onClick={() => fileRef.current?.click()}>
              Import
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void importFile(f);
                e.target.value = ""; // the same file can be imported again
              }}
            />
            <button
              type="button"
              className="v2-btn"
              onClick={() =>
                downloadFile("cts-core-settings.json", JSON.stringify({ settings: s, wf }, null, 2))
              }
            >
              Export
            </button>
            <button
              type="button"
              className="v2-btn"
              disabled={!dirty}
              onClick={() => setAsk("reset")}
            >
              Discard
            </button>
            <button
              type="button"
              className="v2-btn primary"
              disabled={busy || !dirty}
              onClick={save}
            >
              {busy ? "Saving…" : "Save"}
            </button>
          </>
        }
      >
        <div className="v2-grid v2-cols-4">
          <Field
            label="Symbols"
            hint={`top by ${SYMBOL_RANK[s.symbolRank ?? "volatility1h"] ?? s.symbolRank}`}
          >
            <Num value={s.symbols} min={1} max={120} onChange={(v) => set(["symbols"], v)} />
          </Field>
          <Field label="Base data" hint="1m candles; covers the longest lane history">
            <div className="v2-input" style={{ display: "flex", alignItems: "center" }}>
              {Math.max(...(s.tfs ?? [1]).map((tf: number) => s.tfDays?.[String(tf)] ?? 0))} days of
              1m
            </div>
          </Field>
          <Field label="Cycle (ms)">
            <Num value={s.cycleMs} step={50} min={100} onChange={(v) => set(["cycleMs"], v)} />
          </Field>
          <Field label="Tick (ms)" hint="open positions marked to market + live step">
            <Num value={s.tickMs ?? 100} step={50} min={50} onChange={(v) => set(["tickMs"], v)} />
          </Field>
          <Field
            label="Position cost (round trip, %)"
            hint="= 2 × (taker + slippage) · set the components below, or directly"
          >
            <Num pct value={s.cost} onChange={(v) => set(["cost"], v)} />
          </Field>
          <Field label="Order sizing" hint="fixed % of equity compounds with the balance">
            <select
              className="v2-select"
              aria-label="Order sizing"
              value={s.sizing?.mode ?? "equityPct"}
              onChange={(e) => set(["sizing", "mode"], e.target.value)}
            >
              <option value="equityPct">% of equity per order</option>
              <option value="fixed">Fixed notional</option>
            </select>
          </Field>
          <Field
            label="% of equity per order"
            hint="per order unit; Block volume multiplies it (≤ 8×)"
          >
            <Num
              pct
              step={0.1}
              min={0.001}
              max={0.25}
              value={s.sizing?.pct ?? 0.02}
              onChange={(v) => set(["sizing", "pct"], v)}
            />
          </Field>
          <Field label="Paper balance ($)" hint="starting equity of the paper book">
            <Num
              value={s.paperBalance ?? 1000}
              min={1}
              onChange={(v) => set(["paperBalance"], v)}
            />
          </Field>
          <Field label="Paper notional ($)" hint="fixed sizing only">
            <Num value={s.paperNotional} onChange={(v) => set(["paperNotional"], v)} />
          </Field>
          <Field
            label="Main config sets"
            hint="validated pairs given strategy sets · 0 = every validated"
          >
            <Num value={s.mainTop} min={0} onChange={(v) => set(["mainTop"], v)} />
          </Field>
          <Field label="Main refine top">
            <Num value={s.refineTop} onChange={(v) => set(["refineTop"], v)} />
          </Field>
          <Field label="Evaluated top">
            <Num value={s.evalTop} onChange={(v) => set(["evalTop"], v)} />
          </Field>
        </div>
      </Panel>

      <Panel
        title="Timeframes"
        sub="every lane is processed: independent, and combined where it agrees with every higher enabled timeframe"
      >
        <Timeframes tfs={s.tfs} tfDays={s.tfDays} set={set} />
      </Panel>

      <Panel
        title="Signals"
        sub="proven signal sources · the best N active · 15 Normal + 15 Trailing configs each, per symbol and direction"
      >
        <SignalsSettings signals={s.signals} set={set} status={status?.signals} />
      </Panel>

      <div className="v2-grid v2-cols-2">
        <Panel
          title="Gates"
          sub="PF neutral = 1.00 · default min 1.10"
          right={
            <select
              className="v2-select"
              aria-label="Gate preset"
              onChange={(e) =>
                e.target.value && set(["gates"], { ...GATE_PRESETS[e.target.value] })
              }
              defaultValue=""
            >
              <option value="">preset…</option>
              {Object.keys(GATE_PRESETS).map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          }
        >
          <div className="v2-grid v2-cols-2">
            <Field label="Min PF" hint="1.05 – 1.50">
              <select
                className="v2-select"
                value={MIN_PF_CHOICES.reduce((a, b) =>
                  Math.abs(b - s.gates.minPf) < Math.abs(a - s.gates.minPf) ? b : a,
                )}
                onChange={(e) => set(["gates", "minPf"], Number(e.target.value))}
              >
                {MIN_PF_CHOICES.map((v) => (
                  <option key={v} value={v}>
                    {v.toFixed(2)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Max DDT (hours)" hint="longest drawdown time, 2 – 20 h">
              <select
                className="v2-select"
                value={MAX_DDT_CHOICES.reduce((a, b) =>
                  Math.abs(b - s.gates.maxDdtH) < Math.abs(a - s.gates.maxDdtH) ? b : a,
                )}
                onChange={(e) => set(["gates", "maxDdtH"], Number(e.target.value))}
              >
                {MAX_DDT_CHOICES.map((v) => (
                  <option key={v} value={v}>
                    {v} h
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Min trades">
              <Num value={s.gates.minTrades} onChange={(v) => set(["gates", "minTrades"], v)} />
            </Field>
            <Field label="Eval quorum (0–1)">
              <Num
                step={0.05}
                value={s.gates.quorum}
                onChange={(v) => set(["gates", "quorum"], v)}
              />
            </Field>
          </div>
        </Panel>
        <Panel
          title="Strategies"
          sub="execution toggles — Base always computes every sub-strategy"
          right={
            <select
              className="v2-select"
              aria-label="Strategy preset"
              onChange={(e) =>
                e.target.value && set(["toggles"], { ...STRATEGY_PRESETS[e.target.value].toggles })
              }
              defaultValue=""
            >
              <option value="">preset…</option>
              {Object.entries(STRATEGY_PRESETS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
          }
        >
          <div className="v2-lines" style={{ gap: 8 }}>
            {Object.keys(TOGGLE_HELP).map((k) => (
              <div key={k} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <Switch
                  label={k}
                  checked={k === "axis" ? s.toggles[k] !== false : !!s.toggles[k]}
                  onChange={(v) => set(["toggles", k], v)}
                />
                <div>
                  <div style={{ fontWeight: 600 }}>{k}</div>
                  <div className="v2-muted" style={{ fontSize: "var(--v-fs-xs)" }}>
                    {TOGGLE_HELP[k]}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="v2-grid v2-cols-2">
        <Panel
          title="Position cost"
          sub="as charged on the exchange, per side — the engine deducts 2 × (taker + slippage) on every closed position"
        >
          <div className="v2-grid v2-cols-3">
            <Field label="Taker fee (%)" hint="BingX standard 0.05">
              <Num
                pct
                step={0.001}
                value={s.fees?.taker ?? 0.0005}
                onChange={(v) => {
                  set(["fees", "taker"], v);
                  set(["cost"], +(2 * (v + (s.fees?.slippage ?? 0.0005))).toFixed(5));
                }}
              />
            </Field>
            <Field label="Maker fee (%)" hint="limit fills (reference)">
              <Num
                pct
                step={0.001}
                value={s.fees?.maker ?? 0.0002}
                onChange={(v) => set(["fees", "maker"], v)}
              />
            </Field>
            <Field label="Slippage (%)" hint="per side, market orders">
              <Num
                pct
                step={0.001}
                value={s.fees?.slippage ?? 0.0005}
                onChange={(v) => {
                  set(["fees", "slippage"], v);
                  set(["cost"], +(2 * ((s.fees?.taker ?? 0.0005) + v)).toFixed(5));
                }}
              />
            </Field>
          </div>
          <div className="v2-muted" style={{ fontSize: "var(--v-fs-xs)", marginTop: 6 }}>
            Round trip deducted per position: <strong>{((s.cost ?? 0) * 100).toFixed(3)} %</strong>.
            With auto-cost on, it is raised to the measured live cost once 40+ fills were measured.
          </div>
        </Panel>
        <Panel
          title="Auto-adjust (live feedback)"
          sub="per strategy config set: the last N positions, re-scored with the measured live cost"
          right={
            <Switch
              label="Auto-adjust enabled"
              checked={!!s.adjust?.enabled}
              onChange={(v) => set(["adjust", "enabled"], v)}
            />
          }
        >
          <div className="v2-grid v2-cols-3">
            <Field label="Positions (last N)">
              <Num
                value={s.adjust?.window ?? 15}
                min={5}
                max={100}
                onChange={(v) => set(["adjust", "window"], v)}
              />
            </Field>
            <Field label="Adjust below PF">
              <Num
                step={0.05}
                value={s.adjust?.triggerPf ?? 1}
                onChange={(v) => set(["adjust", "triggerPf"], v)}
              />
            </Field>
            <Field label="Step back at PF">
              <Num
                step={0.05}
                value={s.adjust?.recoverPf ?? 1.2}
                onChange={(v) => set(["adjust", "recoverPf"], v)}
              />
            </Field>
            <Field label="Min SL step (%)">
              <Num
                pct
                step={0.01}
                value={s.adjust?.slStep ?? 0.002}
                onChange={(v) => set(["adjust", "slStep"], v)}
              />
            </Field>
            <Field label="Min SL max (%)">
              <Num
                pct
                step={0.1}
                value={s.adjust?.slMax ?? 0.03}
                onChange={(v) => set(["adjust", "slMax"], v)}
              />
            </Field>
            <Field label="Pause at caps (h)">
              <Num
                value={s.adjust?.pauseH ?? 12}
                min={0}
                max={168}
                onChange={(v) => set(["adjust", "pauseH"], v)}
              />
            </Field>
            <Field label="Min trail step (%)">
              <Num
                pct
                step={0.01}
                value={s.adjust?.trailStep ?? 0.001}
                onChange={(v) => set(["adjust", "trailStep"], v)}
              />
            </Field>
            <Field label="Min trail max (%)">
              <Num
                pct
                step={0.1}
                value={s.adjust?.trailMax ?? 0.02}
                onChange={(v) => set(["adjust", "trailMax"], v)}
              />
            </Field>
            <Field label="Auto-cost">
              <Switch
                label="Auto-cost"
                checked={!!s.adjust?.autoCost}
                onChange={(v) => set(["adjust", "autoCost"], v)}
              />
            </Field>
          </div>
        </Panel>
      </div>

      <div className="v2-grid v2-cols-2">
        <Panel
          title="Tactics"
          sub="entry filters for every combo (Base → Live); each only removes entries — switch off to compute plain signals"
        >
          <div className="v2-lines" style={{ gap: 8 }}>
            {Object.keys(TACTIC_HELP).map((k) => (
              <div key={k} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <Switch
                  label={k}
                  checked={!!s.tactics?.[k]}
                  onChange={(v) => set(["tactics", k], v)}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{k}</div>
                  <div className="v2-muted" style={{ fontSize: "var(--v-fs-xs)" }}>
                    {TACTIC_HELP[k]}
                  </div>
                </div>
                {k === "cooldown" && (
                  <div style={{ width: 90 }}>
                    <Num
                      value={s.tactics?.cooldownBars ?? 4}
                      min={0}
                      max={96}
                      onChange={(v) => set(["tactics", "cooldownBars"], v)}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </Panel>
        <Panel
          title="Indication types"
          sub="switched-off types are not computed anywhere (Base → Live)"
        >
          <div className="v2-grid v2-cols-3" style={{ gap: 8 }}>
            {INDICATION_KINDS.map((k) => {
              const on = !(s.disabledKinds ?? []).includes(k);
              return (
                <div key={k} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <Switch
                    label={`indication type ${k}`}
                    checked={on}
                    onChange={(v) =>
                      set(
                        ["disabledKinds"],
                        v
                          ? (s.disabledKinds ?? []).filter((x: string) => x !== k)
                          : [...(s.disabledKinds ?? []), k],
                      )
                    }
                  />
                  <span style={{ fontWeight: 600 }}>{k}</span>
                </div>
              );
            })}
          </div>
        </Panel>
        <Panel
          title="Focus"
          sub="restrict Base to these bot|indication pairs (empty = every combo)"
        >
          <Field
            label="Pairs"
            hint="comma separated, e.g. follow|rsi-mom-14-25 — presets fill this"
          >
            <FocusText value={s.focus ?? []} onChange={(v) => set(["focus"], v)} />
          </Field>
          <div className="v2-muted" style={{ fontSize: "var(--v-fs-xs)", marginTop: 6 }}>
            {(s.focus ?? []).length ? `${s.focus.length} pairs` : "all combos"}
          </div>
        </Panel>
      </div>

      <div className="v2-grid v2-cols-4">
        <Panel title="Block">
          <div className="v2-grid v2-cols-2">
            <Field label="Ratio per level">
              <Num step={0.05} value={s.block.ratio} onChange={(v) => set(["block", "ratio"], v)} />
            </Field>
            <Field label="Max level (last-n 1..N)">
              <Num
                value={s.block.maxLevel}
                min={1}
                max={12}
                onChange={(v) => set(["block", "maxLevel"], v)}
              />
            </Field>
            <Field label="Active min level">
              <Num
                value={s.block.minActiveLevel}
                min={1}
                onChange={(v) => set(["block", "minActiveLevel"], v)}
              />
            </Field>
            <Field label="Max multiple" hint="the Block stack is capped at 8×">
              <Num
                step={0.1}
                min={1}
                max={8}
                value={s.block.maxMult}
                onChange={(v) => set(["block", "maxMult"], v)}
              />
            </Field>
          </div>
          <BlockSources block={s.block} set={set} />
        </Panel>
        <Panel title="Axis" sub="ladder toward the axis price">
          <div className="v2-grid v2-cols-2">
            <Field
              label="Mode"
              hint={
                s.axis?.mode === "desk"
                  ? "desk: signal side, resting rungs at axis ∓ k × spacing, desk SL / TP (Stable-02)"
                  : "revert: back toward the axis, base leg at the next open"
              }
            >
              <select
                className="v2-select"
                value={s.axis?.mode ?? "revert"}
                onChange={(e) => set(["axis", "mode"], e.target.value)}
              >
                <option value="revert">revert (mean reversion)</option>
                <option value="desk">desk (Stable-02 ladder)</option>
              </select>
            </Field>
            <Field
              label="Range types"
              hint="each one its own tape · volume = ATR × (1.15 − min(vol × 8, 0.45))"
            >
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {AXIS_RANGES.map((r) => {
                  const cur = s.axis?.ranges?.length ? s.axis.ranges : AXIS_RANGES.slice(0, 4);
                  const on = cur.includes(r);
                  return (
                    <span key={r} style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                      <Switch
                        label={`axis range ${r}`}
                        checked={on}
                        disabled={on && cur.length === 1}
                        onChange={(v) =>
                          set(
                            ["axis", "ranges"],
                            AXIS_RANGES.filter((x) => (x === r ? v : cur.includes(x))),
                          )
                        }
                      />
                      {r}
                    </span>
                  );
                })}
              </div>
            </Field>
            <Field label={s.axis?.mode === "desk" ? "Rungs (min 2)" : "Legs (incl. base)"}>
              <Num
                value={s.axis?.levels ?? 3}
                min={1}
                max={8}
                onChange={(v) => set(["axis", "levels"], v)}
              />
            </Field>
            <Field label="Spacing (ATR)">
              <Num
                step={0.1}
                value={s.axis?.spacing ?? 0.7}
                onChange={(v) => set(["axis", "spacing"], v)}
              />
            </Field>
            <Field label="Rung size (× normal)">
              <Num
                step={0.1}
                value={s.axis?.ratio ?? 1}
                onChange={(v) => set(["axis", "ratio"], v)}
              />
            </Field>
            <Field label="Axis EMA">
              <Num value={s.axis?.center ?? 50} onChange={(v) => set(["axis", "center"], v)} />
            </Field>
            <Field label="Min displacement (ATR)">
              <Num
                step={0.05}
                value={s.axis?.minDisp ?? 0.35}
                onChange={(v) => set(["axis", "minDisp"], v)}
              />
            </Field>
            <Field label="Max displacement (ATR)">
              <Num
                step={0.1}
                value={s.axis?.maxDisp ?? 2.6}
                onChange={(v) => set(["axis", "maxDisp"], v)}
              />
            </Field>
            {s.axis?.mode === "desk" && (
              <>
                <Field
                  label="Desk SL (ATR)"
                  hint="slDist: min(ATR × this, 0.42 spacing), ≥ 0.35 ATR"
                >
                  <Num
                    step={0.1}
                    min={0.2}
                    max={2}
                    value={s.axis?.slAtr ?? 0.7}
                    onChange={(v) => set(["axis", "slAtr"], v)}
                  />
                </Field>
                <Field label="Desk TP / SL ratio" hint="0.2 – 3, step 0.2">
                  <Num
                    step={0.2}
                    min={0.2}
                    max={3}
                    value={s.axis?.tpRatio ?? 2.2}
                    onChange={(v) => set(["axis", "tpRatio"], v)}
                  />
                </Field>
                <Field label="Rung expiry (bars)" hint="0 = the protect's hold">
                  <Num
                    min={0}
                    max={500}
                    value={s.axis?.expiry ?? 0}
                    onChange={(v) => set(["axis", "expiry"], v)}
                  />
                </Field>
                <Field label="Hybrid trailing %" hint="0.4 – 2.4 (Stable-02 trail)">
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <Switch
                      label="axis hybrid"
                      checked={!!s.axis?.hybrid}
                      onChange={(v) => set(["axis", "hybrid"], v)}
                    />
                    <Num
                      step={0.2}
                      min={0.4}
                      max={2.4}
                      value={s.axis?.trailPct ?? 0.8}
                      onChange={(v) => set(["axis", "trailPct"], v)}
                    />
                  </div>
                </Field>
              </>
            )}
          </div>
        </Panel>
        <Panel title="DCA">
          <div className="v2-grid v2-cols-2">
            <Field label="Levels">
              <Num
                value={s.dca.levels}
                min={1}
                max={6}
                onChange={(v) => set(["dca", "levels"], v)}
              />
            </Field>
            <Field label="Step (%)">
              <Num pct value={s.dca.step} onChange={(v) => set(["dca", "step"], v)} />
            </Field>
          </div>
        </Panel>
        <Panel title="Protect grid" sub="every combination is its own independent tape">
          <div className="v2-grid" style={{ gap: 8 }}>
            <Field label="TP (%)">
              <List pct value={s.grid.tp} onChange={(v) => set(["grid", "tp"], v)} />
            </Field>
            <Field label="SL × TP (max ratio 2–2.5)">
              <List value={s.grid.slOfTp} onChange={(v) => set(["grid", "slOfTp"], v)} />
            </Field>
            <Field label="Trail share of TP (0 = off)">
              <List value={s.grid.trailOfTp} onChange={(v) => set(["grid", "trailOfTp"], v)} />
            </Field>
            <div className="v2-grid v2-cols-3">
              <Field label="Min trail (%)">
                <Num pct value={s.grid.minTrail} onChange={(v) => set(["grid", "minTrail"], v)} />
              </Field>
              <Field label="Min SL (%)">
                <Num pct value={s.grid.minSl} onChange={(v) => set(["grid", "minSl"], v)} />
              </Field>
              <Field label="Hold (h)">
                <List value={s.grid.holdH} onChange={(v) => set(["grid", "holdH"], v)} />
              </Field>
            </div>
            <div className="v2-grid v2-cols-2">
              <Field
                label="Stop floor, every lane (%)"
                hint="no config's stop closer than this after lane scaling (1m / 5m included)"
              >
                <Num
                  pct
                  step={0.05}
                  min={0}
                  max={0.1}
                  value={s.protectFloor?.minSl ?? 0.005}
                  onChange={(v) => set(["protectFloor", "minSl"], v)}
                />
              </Field>
              <Field
                label="Trailing floor, every lane (%)"
                hint="no config's trailing distance closer than this after lane scaling"
              >
                <Num
                  pct
                  step={0.05}
                  min={0}
                  max={0.1}
                  value={s.protectFloor?.minTrail ?? 0.005}
                  onChange={(v) => set(["protectFloor", "minTrail"], v)}
                />
              </Field>
            </div>
            <div className="v2-grid v2-cols-2">
              <Field
                label="Trail step (× activation)"
                hint="stop distance once active; 1 = plain trail (best after selection), 0.5 locks in half the move"
              >
                <Num
                  step={0.05}
                  min={0.1}
                  max={1}
                  value={s.grid.trailStep ?? 1}
                  onChange={(v) => set(["grid", "trailStep"], v)}
                />
              </Field>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <Switch
                  label="Trail runs free"
                  checked={!!s.grid.trailFree}
                  onChange={(v) => set(["grid", "trailFree"], v)}
                />
                <div>
                  <div style={{ fontWeight: 600 }}>Trail runs free</div>
                  <div className="v2-muted" style={{ fontSize: "var(--v-fs-xs)" }}>
                    drop the target once the trail is active
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Panel>
      </div>

      <div className="v2-grid v2-cols-2">
        <Panel title="Real stage (walk-forward)" sub="pre-historic window, last-N and book limits">
          <div className="v2-grid v2-cols-3">
            <Field label="Pre-calc (h)" hint="configs must still work here">
              <Num value={wf.preH} onChange={(v) => setW("preH", v)} />
            </Field>
            <Field label="Long window (h)" hint="Main robustness window">
              <Num value={wf.longH} onChange={(v) => setW("longH", v)} />
            </Field>
            <Field label="Sim run (h)">
              <Num value={wf.simH} onChange={(v) => setW("simH", v)} />
            </Field>
            <Field
              label="Re-evaluate every (min)"
              hint="≥ 1 min; never finer than one bar (BingX has no sub-minute history)"
            >
              <Num
                value={Math.round((wf.stepH ?? 1) * 60)}
                min={1}
                max={2880}
                onChange={(v) => setW("stepH", Math.max(1, v) / 60)}
              />
            </Field>
            <Field label="Real seats / family" hint="0 = no limit">
              <Num value={wf.portfolio} min={0} onChange={(v) => setW("portfolio", v)} />
            </Field>
            <Field label="Last-N (0 = off)">
              <Num value={wf.lastN} onChange={(v) => setW("lastN", v)} />
            </Field>
            <Field label="Last-N min PF">
              <Num step={0.05} value={wf.lastNMinPf} onChange={(v) => setW("lastNMinPf", v)} />
            </Field>
            <Field label="Robust share">
              <Num step={0.05} value={wf.robustFrac} onChange={(v) => setW("robustFrac", v)} />
            </Field>
            <Field label="Max orders / symbol" hint="0 = no limit">
              <Num value={wf.maxPerSymbol} min={0} onChange={(v) => setW("maxPerSymbol", v)} />
            </Field>
            <Field label="Max orders / side" hint="0 = no limit">
              <Num value={wf.maxPerSide} min={0} onChange={(v) => setW("maxPerSide", v)} />
            </Field>
            <Field
              label="Max positions"
              hint="symbol × direction; orders on an open one add no position · 0 = no limit"
            >
              <Num value={wf.maxPositions ?? 0} min={0} onChange={(v) => setW("maxPositions", v)} />
            </Field>
            <Field label="Max open orders" hint="0 = no limit">
              <Num value={wf.maxOpen} min={0} onChange={(v) => setW("maxOpen", v)} />
            </Field>
            <Field label="Hour guard (%)" hint="0 = off">
              <Num step={0.1} value={wf.guardPct} onChange={(v) => setW("guardPct", v)} />
            </Field>
            <Field label="Selection" hint="fixed = focus pairs trade continuously">
              <select
                className="v2-select"
                value={wf.mode}
                onChange={(e) => setW("mode", e.target.value)}
              >
                <option value="durable">durable winners</option>
                <option value="hourly">re-rank hourly</option>
                <option value="fixed">fixed set</option>
              </select>
            </Field>
            <Field label="Rank by">
              <select
                className="v2-select"
                value={wf.rank}
                onChange={(e) => setW("rank", e.target.value)}
              >
                <option value="lcb">confidence bound</option>
                <option value="score">composite score</option>
              </select>
            </Field>
          </div>
        </Panel>
        <Panel
          title="Coordination"
          sub="portfolio-level tactics on every order · realized results before each entry only"
        >
          {(() => {
            const c = {
              enabled: true,
              hourLock: 0,
              cooldown: "off",
              conflict: false,
              confirm: true,
              ...(wf.coord ?? {}),
            };
            const setC = (k: string, v: unknown) => setW("coord", { ...c, [k]: v });
            return (
              <div className="v2-grid v2-cols-3">
                <Field label="Coordination" hint="switches every tactic below">
                  <Switch
                    label="Coordination tactics"
                    checked={c.enabled}
                    onChange={(v) => setC("enabled", v)}
                  />
                </Field>
                <Field
                  label="Signal confirmation"
                  hint="a signal enters only while an engine position agrees (symbol + direction)"
                >
                  <Switch
                    label="Signal confirmation"
                    checked={c.confirm}
                    onChange={(v) => setC("confirm", v)}
                  />
                </Field>
                <Field
                  label="No opposite entries"
                  hint="skip an entry against an open position on the symbol"
                >
                  <Switch
                    label="No opposite entries"
                    checked={c.conflict}
                    onChange={(v) => setC("conflict", v)}
                  />
                </Field>
                <Field
                  label="Hour profit lock (Σ %)"
                  hint="no new entries once the hour made this · 0 = off"
                >
                  <Num
                    step={0.5}
                    min={0}
                    max={100}
                    value={c.hourLock}
                    onChange={(v) => setC("hourLock", v)}
                  />
                </Field>
                <Field
                  label="Stable-02 windows"
                  hint="a symbol whose last 6 closes lost (or PF < 1) takes no entries for its next 6 closes"
                >
                  <Switch
                    label="Stable-02 last-N windows"
                    checked={!!c.s2Windows}
                    onChange={(v) => setC("s2Windows", v)}
                  />
                </Field>
                <Field
                  label="Stable-02 relation volume"
                  hint="winning relations add 0.4× volume each (≤ 1.8×), re-judged every 2 h"
                >
                  <Switch
                    label="Stable-02 relation volume"
                    checked={!!c.s2RelVolume}
                    onChange={(v) => setC("s2RelVolume", v)}
                  />
                </Field>
                <Field
                  label="Negative-hour hedge"
                  hint="signals that were positive in the book's losing hours trade while the book is losing"
                >
                  <Switch
                    label="Negative-hour hedge"
                    checked={!!c.hedge}
                    onChange={(v) => setC("hedge", v)}
                  />
                </Field>
                <Field label="After a losing hour" hint="pause entries for the next hour">
                  <select
                    className="v2-select"
                    aria-label="After a losing hour"
                    value={c.cooldown}
                    onChange={(e) => setC("cooldown", e.target.value)}
                  >
                    <option value="off">keep trading</option>
                    <option value="signals">pause signals</option>
                    <option value="all">pause all entries</option>
                  </select>
                </Field>
              </div>
            );
          })()}
        </Panel>
        <Panel title="Live stage" sub="off by default · also requires CTS_CORE_LIVE=1 on the host">
          <div className="v2-grid v2-cols-2">
            <Field label="Enabled">
              <Switch
                label="Live enabled"
                checked={!!s.live.enabled}
                onChange={(v) => (v ? setAsk("live") : set(["live", "enabled"], false))}
              />
            </Field>
            <Field label="Connection">
              <select
                className="v2-select"
                value={s.live.connId}
                onChange={(e) =>
                  e.target.value === "bingx-x01" && s.live.enabled
                    ? setAsk("mainnet")
                    : set(["live", "connId"], e.target.value)
                }
              >
                <option value="bingx-vst-02">bingx-vst-02 (testnet)</option>
                <option value="bingx-vst-01">bingx-vst-01 (testnet)</option>
                <option value="bingx-x01">bingx-x01 (mainnet)</option>
              </select>
            </Field>
            <Field label="Notional per entry ($)">
              <Num value={s.live.notionalUsd} onChange={(v) => set(["live", "notionalUsd"], v)} />
            </Field>
            <Field label="Max positions">
              <Num
                value={s.live.maxPositions}
                min={0}
                onChange={(v) => set(["live", "maxPositions"], v)}
              />
            </Field>
            <Field label="Margin" hint="per symbol, applied before its first order">
              <select
                className="v2-select"
                value={s.live.marginMode ?? "cross"}
                onChange={(e) => set(["live", "marginMode"], e.target.value)}
              >
                <option value="cross">Cross margin</option>
                <option value="isolated">Isolated margin</option>
              </select>
            </Field>
            <Field
              label="Position mode"
              hint="hedge: long + short side by side · one-way: one net position per symbol"
            >
              <select
                className="v2-select"
                value={s.live.positionMode ?? "hedge"}
                onChange={(e) => set(["live", "positionMode"], e.target.value)}
              >
                <option value="hedge">Hedge mode</option>
                <option value="oneway">One-way mode</option>
              </select>
            </Field>
            <Field
              label="Mode"
              hint="overall = control orders: one position per symbol + direction"
            >
              <select
                className="v2-select"
                value={s.live.mode ?? "overall"}
                onChange={(e) => set(["live", "mode"], e.target.value)}
              >
                <option value="overall">overall (control orders)</option>
                <option value="entries">entries (one per signal)</option>
              </select>
            </Field>
            <Field label="Control ratio" hint="control volume per lane volume unit">
              <Num
                step={0.1}
                value={s.live.ratio ?? 1}
                onChange={(v) => set(["live", "ratio"], v)}
              />
            </Field>
            <Field label="Max $ per position" hint="cap per symbol + direction">
              <Num
                value={s.live.maxNotionalUsd ?? 30}
                onChange={(v) => set(["live", "maxNotionalUsd"], v)}
              />
            </Field>
            <Field
              label="Rebalance beyond (%)"
              hint="adjust only when the target moves more than this"
            >
              <Num
                pct
                step={1}
                value={s.live.rebalancePct ?? 0.25}
                onChange={(v) => set(["live", "rebalancePct"], v)}
              />
            </Field>
            <Field
              label="Require simulated readiness"
              hint="only trade while the rolling simulated run holds PF ≥ min and is stable (turn off for a testnet)"
            >
              <Switch
                label="Require simulated readiness"
                checked={s.live.requireReady !== false}
                onChange={(v) => set(["live", "requireReady"], v)}
              />
            </Field>
            <Field label="Minimum stop (%)" hint="exchange stops are never closer than this">
              <Num
                pct
                step={0.1}
                value={s.live.minStopPct ?? 0.01}
                onChange={(v) => set(["live", "minStopPct"], v)}
              />
            </Field>
            <Field
              label="Exchange sync (ms)"
              hint="positions / orders re-read over REST at most this often (own orders re-read at once); decisions run every tick"
            >
              <Num
                step={250}
                min={250}
                value={s.live.syncMs ?? 1000}
                onChange={(v) => set(["live", "syncMs"], v)}
              />
            </Field>
          </div>
        </Panel>
      </div>
    </>
  );
}
