import { useEffect, useRef, useState, type ReactNode } from "react";
import { coreSettings, coreStatus, saveCoreSettings } from "../api-conn";
import {
  DEFAULT_BLOCK,
  GATE_PRESETS,
  MAX_DDT_CHOICES,
  GENERAL_RANGE,
  LONG_RANGE,
  MICRO_RANGE,
  MIN_PF_CHOICES,
  MINIMAL_PLUS_RANGE,
  MINIMAL_RANGE,
  RANGE_GATE,
  SHORT_RANGE,
  STRATEGY_PRESETS,
  SYMBOL_RANK_CHOICES,
} from "@/core/config";
import { INDICATION_KINDS, type AxisRange } from "@/core/domain/types";
import { DEFAULT_SIGNALS, SIGNAL_COUNT_CHOICES, SIGNAL_SOURCES } from "@/core/signal-config";
import { Confirm, downloadFile, Empty, ErrorNote, Panel, Pill, Switch, usePoll } from "../ui";

const AXIS_RANGES: AxisRange[] = ["atr", "linear", "geo", "fib", "volume"];

/** Mainnet (bingx-x01) floors the runtime enforces on save (MAINNET_LAST_N / MAINNET_VALID_LAST_N in runtime.server.ts). */
const MAINNET_CONN = "bingx-x01";
const MAINNET_LAST_N = 25;
const MAINNET_VALID_LAST_N = 50;
const MAINNET_SIGNAL_VALID_LAST_N = 10;
/** DCA targets the engine uses while none are set (walkforward.ts dcaProtects). */
const DCA_TP_DEFAULT = [0.008, 0.012, 0.026, 0.035];
/** Leverage choices (any fixed 1–150× is accepted; the exchange caps it per symbol). */
const LEVERAGE_CHOICES = [1, 2, 3, 5, 10, 20, 25, 50, 75, 100, 125, 150];

type Any = any;

/** A min / max pair (both inside lo…hi, max never below min). */
function Span(props: {
  label: string;
  hint?: string;
  value: readonly [number, number] | readonly number[];
  lo: number;
  hi: number;
  step?: number;
  onChange: (v: [number, number]) => void;
}) {
  const a = props.value[0] ?? props.lo;
  const b = props.value[1] ?? props.hi;
  return (
    <Field label={props.label} hint={props.hint}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 6 }}>
        <Num
          step={props.step}
          min={props.lo}
          max={props.hi}
          value={a}
          onChange={(v) => props.onChange([v, Math.max(v, b)])}
        />
        <Num
          step={props.step}
          min={props.lo}
          max={props.hi}
          value={b}
          onChange={(v) => props.onChange([Math.min(a, v), v])}
        />
      </div>
    </Field>
  );
}

/** A switch with a bold title and a short help line (the page's toggle-row pattern). */
function SwitchRow(props: {
  label: string;
  title: string;
  help: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
      <Switch label={props.label} checked={props.checked} onChange={props.onChange} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 600 }}>{props.title}</div>
        <div className="v2-muted" style={{ fontSize: "var(--v-fs-xs)" }}>
          {props.help}
        </div>
      </div>
    </div>
  );
}

const BLOCK_SOURCE_HELP: Array<[string, string]> = [
  ["config", "the config set's own closed positions"],
  ["overall", "every executed position"],
  ["symbol", "positions on the same symbol"],
  ["direction", "positions on the same side (long / short)"],
  ["indication", "positions of the same indication type"],
  ["type", "positions of the same strategy type (Normal, Trailing, DCA, Axis)"],
];

/** Block sources and how their levels combine (shared = strongest, additive = sum, overall = each its own Block). */
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
        hint="shared: strongest source's level · additive: levels add up (capped by max multiple) · overall: every source its own Block and own position (overall, symbol, direction, indication independent)"
      >
        <select
          className="v2-select"
          aria-label="Block type"
          value={props.block.mode ?? "shared"}
          onChange={(e) => props.set(["block", "mode"], e.target.value)}
        >
          <option value="shared">Shared</option>
          <option value="additive">Additive</option>
          <option value="overall">Overall (independent per source)</option>
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
            {st.positions !== undefined
              ? ` · positions / orders ${st.positions} / ${st.orders} (peak ${st.peakPositions} / ${st.peakOrders})`
              : st.trades !== undefined
                ? ` · ${st.trades} orders`
                : ""}
            {st.openPositions !== undefined
              ? ` · open now ${st.openPositions} / ${st.openOrders}`
              : ""}
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
        <Field
          label="Max positions"
          hint="signal positions (symbol × direction, long and short counted apart) · 0 = no limit"
        >
          <Num
            value={g.maxPositions ?? 0}
            min={0}
            max={10000}
            onChange={(v) => set(["maxPositions"], v)}
          />
        </Field>
        <Field
          label="Orders / symbol"
          hint="all signal orders and partials on a symbol · 0 = unlimited"
        >
          <Num
            value={g.perSymbol ?? 0}
            min={0}
            max={1000}
            onChange={(v) => set(["perSymbol"], v)}
          />
        </Field>
        <Field label="Max orders" hint="all open signal orders and partials · 0 = unlimited">
          <Num value={g.maxOpen ?? 0} min={0} max={100000} onChange={(v) => set(["maxOpen"], v)} />
        </Field>
        <Field
          label="PF acceptance"
          hint="a signal trades only while its group (source × symbol × direction × type) has PF ≥ the minimum over the window"
        >
          <Switch
            label="Signal PF acceptance"
            checked={g.accept?.enabled !== false}
            onChange={(v) => set(["accept", "enabled"], v)}
          />
        </Field>
        <Field label="Minimum PF">
          <Num
            value={g.accept?.minPf ?? 1.8}
            min={1}
            max={5}
            step={0.01}
            onChange={(v) => set(["accept", "minPf"], v)}
          />
        </Field>
        <Field label="PF window (h)">
          <Num
            value={g.accept?.hours ?? 48}
            min={6}
            max={336}
            onChange={(v) => set(["accept", "hours"], v)}
          />
        </Field>
        <Field label="PF min. trades">
          <Num
            value={g.accept?.minTrades ?? 6}
            min={1}
            max={200}
            onChange={(v) => set(["accept", "minTrades"], v)}
          />
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

/** per-range stage min PF choices (Gates.rangeMinPf) */
const RANGE_PF_CHOICES = [1.05, 1.08, 1.1, 1.12, 1.15, 1.18, 1.2, 1.25, 1.3, 1.4, 1.5, 2] as const;

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

type RangeSpec = {
  tp: readonly number[];
  slOfTp: readonly number[];
  trailOfTp: readonly number[];
  trailSlOfTp?: number;
  minSl?: number;
  minTrail?: number;
  minTf?: number;
};

/** shortest lane per range (minutes; 0 = every lane) — the default of General and Long is 15 */
const MIN_TF_CHOICES = [0, 5, 15, 30] as const;
const RANGE_MIN_TF_DEFAULT: Partial<Record<string, number>> = { short: 15, general: 15, long: 15 };

/** Values from `from` to `to` in `step` (at most 60). */
function stepValues(from: number, to: number, step: number, digits: number, max: number): number[] {
  if (!(step > 0) || !(to >= from)) return [from];
  const out: number[] = [];
  for (let x = from; x <= to + step * 1e-6 && out.length < max; x += step) out.push(+x.toFixed(digits));
  return out;
}

/** A list edited as min / max / step (an irregular list keeps its values until one of the three changes). */
export function StepList(props: {
  label: string;
  value: readonly number[];
  onChange: (v: number[]) => void;
  pct?: boolean;
  digits?: number;
  /** most values the server accepts for this list */
  max?: number;
}) {
  const xs = props.value.length ? [...props.value] : [0];
  const lo = Math.min(...xs);
  const hi = Math.max(...xs);
  const step = xs.length > 1 ? +((hi - lo) / (xs.length - 1)).toFixed(6) : props.pct ? 0.0005 : 0.25;
  const d = props.digits ?? (props.pct ? 6 : 3);
  const max = props.max ?? 12;
  const put = (a: number, b: number, c: number) => props.onChange(stepValues(a, b, c, d, max));
  return (
    <Field label={props.label} hint={`${xs.length} values (max ${max}): ${xs.map((x) => (props.pct ? +(x * 100).toFixed(3) : x)).join(", ")}`}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 6 }}>
        <Num pct={props.pct} step={props.pct ? 0.025 : 0.25} min={0} value={lo} onChange={(v) => put(v, Math.max(v, hi), step)} />
        <Num pct={props.pct} step={props.pct ? 0.025 : 0.25} min={0} value={hi} onChange={(v) => put(Math.min(lo, v), v, step)} />
        <Num pct={props.pct} step={props.pct ? 0.025 : 0.25} min={props.pct ? 0.00001 : 0.01} value={step} onChange={(v) => put(lo, hi, v)} />
      </div>
    </Field>
  );
}

/** One protect range beside the wide grid: switch, TP / SL ranges (min / max / step), trails, own floors. */
export function RangeEditor(props: {
  grid: Record<string, unknown>;
  k: "short" | "minimal" | "general" | "long" | "micro";
  title: string;
  info: string;
  defaults: RangeSpec;
  set: (path: string[], v: unknown) => void;
}) {
  const spec = props.grid[props.k] as false | RangeSpec | undefined;
  const on = !!spec;
  const s = spec || props.defaults;
  const p = (f: string) => ["grid", props.k, f];
  const enable = () =>
    props.set(["grid", props.k], {
      tp: [...props.defaults.tp],
      slOfTp: [...props.defaults.slOfTp],
      trailOfTp: [...props.defaults.trailOfTp],
      trailSlOfTp: props.defaults.trailSlOfTp,
      minSl: props.defaults.minSl,
      minTrail: props.defaults.minTrail,
    });
  const cells = s.tp.length * s.slOfTp.length * s.trailOfTp.length;
  return (
    <>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <Switch label={props.title} checked={on} onChange={(v) => (v ? enable() : props.set(["grid", props.k], false))} />
        <div>
          <div style={{ fontWeight: 600 }}>
            {props.title} {on && <span className="v2-muted">· {cells} cells per hold</span>}
          </div>
          <div className="v2-muted" style={{ fontSize: "var(--v-fs-xs)" }}>
            {props.info}
          </div>
        </div>
      </div>
      {on && (
        <div className="v2-grid v2-cols-3">
          <StepList
            label={`${props.title} TP (%) min · max · step`}
            pct
            max={props.k === "micro" ? 16 : 12}
            value={s.tp}
            onChange={(v) => props.set(p("tp"), v)}
          />
          <StepList label={`${props.title} SL × TP min · max · step`} value={s.slOfTp} onChange={(v) => props.set(p("slOfTp"), v)} />
          <Field label={`${props.title} trail × TP`} hint="0 = no trail; several widths, each its own config">
            <List value={s.trailOfTp} onChange={(v) => props.set(p("trailOfTp"), v)} />
          </Field>
          <Field label="Trailing stop at least (× TP)" hint="trailing cells use at least this stop (higher stops)">
            <Num step={0.25} min={1} max={5} value={s.trailSlOfTp ?? 2} onChange={(v) => props.set(p("trailSlOfTp"), v)} />
          </Field>
          <Field label="Min SL (%)" hint="this range's own stop floor (the wide-grid floor does not apply)">
            <Num pct step={0.01} min={0} max={0.2} value={s.minSl ?? 0} onChange={(v) => props.set(p("minSl"), v)} />
          </Field>
          <Field label="Min trail (%)" hint="this range's own trailing floor">
            <Num pct step={0.01} min={0} max={0.1} value={s.minTrail ?? 0} onChange={(v) => props.set(p("minTrail"), v)} />
          </Field>
          <Field label="Shortest lane" hint="faster timeframe lanes do not trade this range (its target is too far for their signals)">
            <select
              className="v2-select"
              value={String(s.minTf ?? RANGE_MIN_TF_DEFAULT[props.k] ?? 0)}
              onChange={(e) => props.set(p("minTf"), Number(e.target.value))}
            >
              {MIN_TF_CHOICES.map((m) => (
                <option key={m} value={String(m)}>
                  {m === 0 ? "every lane" : `${m}m and slower`}
                </option>
              ))}
            </select>
          </Field>
        </div>
      )}
    </>
  );
}

/** Short range: 8–14× position cost (1.6–2.8 %), step 1×, SL 1–2× TP, trailing stops at least 2× TP. */
export function ShortRange(props: { grid: Record<string, unknown> | object; set: (path: string[], v: unknown) => void }) {
  return (
    <RangeEditor
      grid={props.grid as Record<string, unknown>}
      k="short"
      title="Short range"
      info="TP 8–14× the 0.2 % position cost (1.6–2.8 %), step 1× (8× belongs to Minimal). SL 1–2× the target, trailing cells too. Orders tracked as H."
      defaults={SHORT_RANGE}
      set={props.set}
    />
  );
}

/** Minimal range: 4–8× position cost (0.8–1.6 %), step 1×, SL 1–2× TP, two trail widths. */
export function MinimalRange(props: { grid: Record<string, unknown> | object; set: (path: string[], v: unknown) => void }) {
  return (
    <RangeEditor
      grid={props.grid as Record<string, unknown>}
      k="minimal"
      title="Minimal range"
      info="TP 4–8× the 0.2 % position cost (0.8–1.6 %), step 1×, SL 1–2× the target, trailing cells too. Orders tracked as N."
      defaults={MINIMAL_RANGE}
      set={props.set}
    />
  );
}

/** General range: 14–22× position cost (2.8–4.4 %), step 2×, SL 0.5–1× TP, two trail widths. */
export function GeneralRange(props: { grid: Record<string, unknown> | object; set: (path: string[], v: unknown) => void }) {
  return (
    <RangeEditor
      grid={props.grid as Record<string, unknown>}
      k="general"
      title="General range"
      info="TP 14–22× the 0.2 % position cost (2.8–4.4 %), step 2× (14× belongs to Short), SL 0.5–1× the target. Orders tracked as G."
      defaults={GENERAL_RANGE}
      set={props.set}
    />
  );
}

/** Long range: 22–32× position cost (4.4–6.4 %), step 2×, SL 0.5–1× TP, two trail widths. */
export function LongRange(props: { grid: Record<string, unknown> | object; set: (path: string[], v: unknown) => void }) {
  return (
    <RangeEditor
      grid={props.grid as Record<string, unknown>}
      k="long"
      title="Long range"
      info="TP 22–32× the 0.2 % position cost (4.4–6.4 %), step 2× (22× belongs to General), SL 0.5–1× the target. Orders tracked as L."
      defaults={LONG_RANGE}
      set={props.set}
    />
  );
}

/** Micro range: 0.1–0.4 % step 0.025 %, SL 1–3× step 0.5, both trailing widths. */
export function MicroRange(props: { grid: Record<string, unknown> | object; set: (path: string[], v: unknown) => void }) {
  return (
    <RangeEditor
      grid={props.grid as Record<string, unknown>}
      k="micro"
      title="Micro range"
      info="TP 0.1–0.4 % in 0.025 % steps, SL 1–3× in 0.5 steps, every cell its own seat. Orders tracked as U. Off by default."
      defaults={MICRO_RANGE}
      set={props.set}
    />
  );
}

/** Minimal plus: 2–5× cost (step 0.25), SL 0.5–3× (step 0.25), trailing cells with higher stops; only stored cells. */
export function MinimalPlusRange(props: {
  grid: { minimalPlus?: false | (RangeSpec & { enabled?: boolean; lastN?: number; minPf?: number; cells?: ReadonlyArray<unknown> }) };
  set: (path: string[], v: unknown) => void;
}) {
  const mp = props.grid.minimalPlus || null;
  const on = !!mp && mp.enabled === true;
  const base = mp || { ...MINIMAL_PLUS_RANGE, enabled: false, lastN: 50, minPf: 1.35, cells: [] };
  const put = (patch: Record<string, unknown>) => props.set(["grid", "minimalPlus"], { ...base, ...patch });
  const cells = base.cells?.length ?? 0;
  return (
    <>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <Switch label="Minimal plus" checked={on} onChange={(v) => put({ enabled: v })} />
        <div>
          <div style={{ fontWeight: 600 }}>
            Minimal plus <span className="v2-muted">· {cells} stored cells</span>
          </div>
          <div className="v2-muted" style={{ fontSize: "var(--v-fs-xs)" }}>
            TP 2–5× position cost (step 0.25), SL 0.5–3× (step 0.25), trailing cells at least 2.5×. Only the stored cells
            are built, each kept while its last N closes clear the min PF. Orders tracked as M. Off by default.
          </div>
        </div>
      </div>
      {on && (
        <div className="v2-grid v2-cols-3">
          <StepList label="Plus TP (%) min · max · step" pct value={base.tp} onChange={(v) => put({ tp: v })} />
          <StepList label="Plus SL × TP min · max · step" value={base.slOfTp} onChange={(v) => put({ slOfTp: v })} />
          <Field label="Plus trail × TP" hint="0 = no trail">
            <List value={base.trailOfTp} onChange={(v) => put({ trailOfTp: v })} />
          </Field>
          <Field label="Previous closes (last N)" hint="50 – 500">
            <Num min={50} max={500} value={base.lastN ?? 50} onChange={(v) => put({ lastN: Math.max(50, Math.round(v)) })} />
          </Field>
          <Field label="Min PF of those closes" hint="higher than the usual gate (at least 1.2)">
            <Num step={0.05} min={1.2} max={5} value={base.minPf ?? 1.35} onChange={(v) => put({ minPf: v })} />
          </Field>
          <Field label="Plus trailing stop at least (× TP)" hint="trailing cells use at least this stop · 1 – 5">
            <Num step={0.25} min={1} max={5} value={base.trailSlOfTp ?? 2.5} onChange={(v) => put({ trailSlOfTp: v })} />
          </Field>
          <Field label="Plus min SL (%)" hint="this range's own stop floor">
            <Num pct step={0.01} min={0} max={0.2} value={base.minSl ?? 0} onChange={(v) => put({ minSl: v })} />
          </Field>
          <Field label="Plus min trail (%)" hint="this range's own trailing floor">
            <Num pct step={0.01} min={0} max={0.1} value={base.minTrail ?? 0} onChange={(v) => put({ minTrail: v })} />
          </Field>
        </div>
      )}
    </>
  );
}

/** Range gate and range seats: every range cell needs its last N closes at a higher PF before a seat. */
export function RangeGate(props: {
  grid: { rangeGate?: { enabled: boolean; lastN: number; minPf: number }; rangeSeats?: boolean };
  set: (path: string[], v: unknown) => void;
}) {
  const g = props.grid.rangeGate ?? { ...RANGE_GATE, enabled: false };
  const put = (patch: Record<string, unknown>) => props.set(["grid", "rangeGate"], { ...g, ...patch });
  return (
    <div className="v2-grid v2-cols-3">
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <Switch label="Range gate" checked={g.enabled} onChange={(v) => put({ enabled: v })} />
        <div>
          <div style={{ fontWeight: 600 }}>Range gate</div>
          <div className="v2-muted" style={{ fontSize: "var(--v-fs-xs)" }}>
            micro, minimal, short and plus cells seat only after their last N closes clear the min PF
          </div>
        </div>
      </div>
      <Field label="Range last N" hint="previous closes, at least 50">
        <Num min={50} max={1000} value={g.lastN} onChange={(v) => put({ lastN: Math.max(50, Math.round(v)) })} />
      </Field>
      <Field label="Range min PF" hint="higher than the usual gate (at least 1.1)">
        <Num step={0.05} min={1.1} max={5} value={g.minPf} onChange={(v) => put({ minPf: v })} />
      </Field>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <Switch label="Range seats" checked={!!props.grid.rangeSeats} onChange={(v) => props.set(["grid", "rangeSeats"], v)} />
        <div>
          <div style={{ fontWeight: 600 }}>Range seats</div>
          <div className="v2-muted" style={{ fontSize: "var(--v-fs-xs)" }}>
            short / minimal / plus hold their own seat per pair instead of competing with the wide cells
          </div>
        </div>
      </div>
    </div>
  );
}

/** Range horizon fit: range cells computed only where their target fits the indication's typical move. */
export function RangeFit(props: {
  grid: { rangeFit?: { enabled: boolean; lo?: number; hi?: number; keep?: number } };
  set: (path: string[], v: unknown) => void;
}) {
  // DEFAULT_RANGE_FIT (walkforward.ts): lo 0.2, hi 2.5, keep 2
  const f = { lo: 0.2, hi: 2.5, keep: 2, ...(props.grid.rangeFit ?? { enabled: false }) };
  const put = (patch: Record<string, unknown>) => props.set(["grid", "rangeFit"], { ...f, ...patch });
  return (
    <div className="v2-grid v2-cols-2">
      <SwitchRow
        label="Range horizon fit"
        title="Range horizon fit"
        help="compute a range cell only when its target is within low…high × the indication's typical move (off = every cell computed, the gates decide)"
        checked={f.enabled === true}
        onChange={(v) => put({ enabled: v })}
      />
      <Field label="Fit low (× typical move)" hint="0.05 – 2, below the high">
        <Num
          step={0.05}
          min={0.05}
          max={2}
          value={f.lo}
          onChange={(v) => put({ lo: v, hi: Math.max(f.hi, +(v + 0.05).toFixed(2)) })}
        />
      </Field>
      <Field label="Fit high (× typical move)" hint="0.5 – 10, above the low">
        <Num
          step={0.1}
          min={0.5}
          max={10}
          value={f.hi}
          onChange={(v) => put({ hi: v, lo: Math.max(0.05, Math.min(f.lo, +(v - 0.05).toFixed(2))) })}
        />
      </Field>
      <Field label="Targets kept per range" hint="at least this many targets stay per range · 1 – 8">
        <Num min={1} max={8} value={f.keep} onChange={(v) => put({ keep: Math.round(v) })} />
      </Field>
    </div>
  );
}

/** Every protect range with its switch (Settings and the preset dialog). */
export function ProtectRanges(props: { grid: object; set: (path: string[], v: unknown) => void }) {
  return (
    <>
      <MinimalRange grid={props.grid} set={props.set} />
      <ShortRange grid={props.grid} set={props.set} />
      <GeneralRange grid={props.grid} set={props.set} />
      <LongRange grid={props.grid} set={props.set} />
      <MicroRange grid={props.grid} set={props.set} />
      <MinimalPlusRange grid={props.grid as never} set={props.set} />
      <RangeGate grid={props.grid as never} set={props.set} />
      <RangeFit grid={props.grid as never} set={props.set} />
    </>
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

/** Bot types the engine runs (src/core/bots/bots.ts); the Real-stage filter takes any subset. */
const BOT_TYPES = ["follow", "revert", "pivot", "magnet", "clamp", "sweep", "ribbon", "pulse", "snap", "sandwich"] as const;

const TOGGLE_HELP: Record<string, string> = {
  normal:
    "the plain base (Normal and Trailing entries); off = neither executes unless Block raises it — Block, DCA, DCA Active and Axis keep processing (every set is still computed and evaluated)",
  trailing:
    "trailing-stop variants; off = no trailing anywhere (base, Block-raised, signals), still computed",
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
  const onMainnet = s.live?.connId === MAINNET_CONN;
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
          <Field label="Symbol ranking" hint="how the universe of symbols is picked">
            <select
              className="v2-select"
              aria-label="Symbol ranking"
              value={s.symbolRank ?? "volatility1h"}
              onChange={(e) => set(["symbolRank"], e.target.value)}
            >
              {SYMBOL_RANK_CHOICES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Symbol offset"
            hint="skip this many symbols at the top of the ranking (desks sharing one account take disjoint slices) · 0 = none"
          >
            <Num
              value={s.symbolOffset ?? 0}
              min={0}
              max={200}
              onChange={(v) => set(["symbolOffset"], Math.round(v))}
            />
          </Field>
          <Field
            label="Forced symbols"
            hint="always in the universe whatever their rank (comma separated, e.g. XRP, SOL, BCH); the ranking fills the rest up to the symbol count"
          >
            <input
              className="v2-input"
              defaultValue={(s.forceSymbols ?? []).join(", ")}
              placeholder="XRP, SOL, BCH"
              onBlur={(e) =>
                set(
                  ["forceSymbols"],
                  e.target.value
                    .split(/[\s,;]+/)
                    .map((x) => x.trim().toUpperCase())
                    .filter(Boolean)
                    .map((x) => (x.includes("-") ? x : `${x.replace(/USDT$/, "")}-USDT`)),
                )
              }
            />
          </Field>
          <Field label="Cycle (ms)" hint="checks for newly closed bars · 100 – 600000">
            <Num value={s.cycleMs} step={50} min={100} max={600_000} onChange={(v) => set(["cycleMs"], v)} />
          </Field>
          <Field label="Tick (ms)" hint="open positions marked to market + live step · 50 – 10000">
            <Num value={s.tickMs ?? 100} step={50} min={50} max={10_000} onChange={(v) => set(["tickMs"], v)} />
          </Field>
          <Field
            label="Position cost (round trip, %)"
            hint="= 2 × (taker + slippage) · set the components below, or directly · 0 – 2"
          >
            <Num pct min={0} max={0.02} value={s.cost} onChange={(v) => set(["cost"], v)} />
          </Field>
          <Field
            label="Order sizing"
            hint="minimum quantity: every live order unit is the symbol's exchange minimum (paper sizes it by % of equity) · % of equity compounds with the balance"
          >
            <select
              className="v2-select"
              aria-label="Order sizing"
              value={s.sizing?.mode ?? "minQty"}
              onChange={(e) => set(["sizing", "mode"], e.target.value)}
            >
              <option value="minQty">Minimum quantity per order</option>
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
              max={100_000_000}
              onChange={(v) => set(["paperBalance"], v)}
            />
          </Field>
          <Field label="Paper notional ($)" hint="fixed sizing only · 1 – 1000000">
            <Num
              value={s.paperNotional}
              min={1}
              max={1_000_000}
              onChange={(v) => set(["paperNotional"], v)}
            />
          </Field>
          <Field
            label="Main config sets"
            hint="validated pairs given strategy sets · 0 = every validated"
          >
            <Num
              value={s.mainTop}
              min={0}
              max={100_000}
              onChange={(v) => set(["mainTop"], Math.round(v))}
            />
          </Field>
          <Field label="Main refine top" hint="stage-1 winners refined in stage 2 · 1 – 100">
            <Num
              value={s.refineTop}
              min={1}
              max={100}
              onChange={(v) => set(["refineTop"], Math.round(v))}
            />
          </Field>
          <Field label="Evaluated top" hint="configs taken to last-N + continuous evals · 1 – 400">
            <Num
              value={s.evalTop}
              min={1}
              max={400}
              onChange={(v) => set(["evalTop"], Math.round(v))}
            />
          </Field>
          <Field label="Armed portfolio" hint="max bots in the armed portfolio · 1 – 40">
            <Num
              value={s.armTop ?? 10}
              min={1}
              max={40}
              onChange={(v) => set(["armTop"], Math.round(v))}
            />
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
            {(
              [
                ["micro", "Micro min PF"],
                ["minimal", "Minimal min PF"],
                ["short", "Short min PF"],
                ["general", "General min PF"],
                ["long", "Long min PF"],
              ] as const
            ).map(([k, label]) => {
              const v = s.gates.rangeMinPf?.[k];
              return (
                <Field key={k} label={label} hint="this range's stage min PF (empty = Min PF)">
                  <select
                    className="v2-select"
                    value={v === undefined ? "" : String(RANGE_PF_CHOICES.reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a)))}
                    onChange={(e) =>
                      set(["gates", "rangeMinPf", k], e.target.value === "" ? undefined : Number(e.target.value))
                    }
                  >
                    <option value="">= Min PF</option>
                    {RANGE_PF_CHOICES.map((c) => (
                      <option key={c} value={String(c)}>
                        {c.toFixed(2)}
                      </option>
                    ))}
                  </select>
                </Field>
              );
            })}
            <Field label="Max DDT (hours)" hint="longest drawdown time, 2 – 35 h">
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
            <Field
              label="Max DDR"
              hint="max drawdown ratio: a config's largest drawdown ÷ its net result over the window (Base, seat selection, validation and the Real last-N) · off = no limit"
            >
              <select
                className="v2-select"
                aria-label="Max drawdown ratio"
                value={String(s.gates.maxDdr ?? 0)}
                onChange={(e) => set(["gates", "maxDdr"], Number(e.target.value))}
              >
                {[0, 3, 2, 1.5, 1, 0.75, 0.5].map((v) => (
                  <option key={v} value={String(v)}>
                    {v ? v.toFixed(2) : "off"}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Min trades" hint="closed trades a config needs · 1 – 500">
              <Num
                value={s.gates.minTrades}
                min={1}
                max={500}
                onChange={(v) => set(["gates", "minTrades"], v)}
              />
            </Field>
            <Field label="Eval quorum (0–1)" hint="share of eval windows that must pass">
              <Num
                step={0.05}
                min={0}
                max={1}
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
                min={0}
                max={0.01}
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
                min={0}
                max={0.01}
                value={s.fees?.maker ?? 0.0002}
                onChange={(v) => set(["fees", "maker"], v)}
              />
            </Field>
            <Field label="Slippage (%)" hint="per side, market orders">
              <Num
                pct
                step={0.001}
                min={0}
                max={0.02}
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
            <Field label="Positions (last N)" hint="positions per set judged · 5 – 100">
              <Num
                value={s.adjust?.window ?? 15}
                min={5}
                max={100}
                onChange={(v) => set(["adjust", "window"], Math.round(v))}
              />
            </Field>
            <Field label="Adjust below PF" hint="step up (wider SL / trail) below this · 0.5 – 2">
              <Num
                step={0.05}
                min={0.5}
                max={2}
                value={s.adjust?.triggerPf ?? 1}
                onChange={(v) => set(["adjust", "triggerPf"], v)}
              />
            </Field>
            <Field label="Step back at PF" hint="at or above this · 0.5 – 3, ≥ the adjust PF">
              <Num
                step={0.05}
                min={0.5}
                max={3}
                value={s.adjust?.recoverPf ?? 1.2}
                onChange={(v) => set(["adjust", "recoverPf"], v)}
              />
            </Field>
            <Field label="Min SL step (%)" hint="0.01 – 2">
              <Num
                pct
                step={0.01}
                min={0.0001}
                max={0.02}
                value={s.adjust?.slStep ?? 0.002}
                onChange={(v) => set(["adjust", "slStep"], v)}
              />
            </Field>
            <Field label="Min SL max (%)" hint="cap · 0.1 – 20">
              <Num
                pct
                step={0.1}
                min={0.001}
                max={0.2}
                value={s.adjust?.slMax ?? 0.03}
                onChange={(v) => set(["adjust", "slMax"], v)}
              />
            </Field>
            <Field label="Pause at caps (h)" hint="pause a set still below at the caps · 0 – 168">
              <Num
                value={s.adjust?.pauseH ?? 12}
                min={0}
                max={168}
                onChange={(v) => set(["adjust", "pauseH"], v)}
              />
            </Field>
            <Field label="Min trail step (%)" hint="0.01 – 2">
              <Num
                pct
                step={0.01}
                min={0.0001}
                max={0.02}
                value={s.adjust?.trailStep ?? 0.001}
                onChange={(v) => set(["adjust", "trailStep"], v)}
              />
            </Field>
            <Field label="Min trail max (%)" hint="cap · 0.1 – 20">
              <Num
                pct
                step={0.1}
                min={0.001}
                max={0.2}
                value={s.adjust?.trailMax ?? 0.02}
                onChange={(v) => set(["adjust", "trailMax"], v)}
              />
            </Field>
            <Field label="Auto-cost" hint="raise the engine cost to the measured live cost">
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
          sub="restrict Base to these bot|indication pairs (empty = every combo) · pinned pairs always go on"
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
          <div style={{ marginTop: 10 }}>
            <Field
              label="Pinned pairs"
              hint="proven wide-trail pairs always taken through Main → Real besides whatever Base passes (they must still pass Base) · up to 80 · empty = none"
            >
              <FocusText value={s.pinned ?? []} onChange={(v) => set(["pinned"], v)} />
            </Field>
            <div className="v2-muted" style={{ fontSize: "var(--v-fs-xs)", marginTop: 6 }}>
              {(s.pinned ?? []).length} pinned
            </div>
          </div>
        </Panel>
      </div>

      <div className="v2-grid v2-cols-4">
        <Panel title="Block">
          <div className="v2-grid v2-cols-2">
            <Field label="Ratio per level" hint="extra volume per passing level · 0 – 2">
              <Num
                step={0.05}
                min={0}
                max={2}
                value={s.block.ratio}
                onChange={(v) => set(["block", "ratio"], v)}
              />
            </Field>
            <Field label="Max level (last-n 1..N)">
              <Num
                value={s.block.maxLevel}
                min={1}
                max={12}
                onChange={(v) => set(["block", "maxLevel"], v)}
              />
            </Field>
            <Field label="Active min level" hint="Block Active: entries below this level are skipped">
              <Num
                value={s.block.minActiveLevel}
                min={1}
                max={12}
                onChange={(v) => set(["block", "minActiveLevel"], v)}
              />
            </Field>
            <Field label="Volume steps" hint="raise in equal steps up to the max multiple (0 = continuous)">
              <Num
                value={s.block.steps ?? 0}
                min={0}
                max={12}
                onChange={(v) => set(["block", "steps"], v)}
              />
            </Field>
            <Field label="Pause after a win" hint="closes a source waits after a positive raised position (0 = none)">
              <Num
                value={s.block.pause ?? 0}
                min={0}
                max={12}
                onChange={(v) => set(["block", "pause"], v)}
              />
            </Field>
            <Field
              label="Max stack"
              hint="volume cap of a raised position (default 8×) · Overall: each source up to max − 1 extra, the stack ≤ 8×"
            >
              <Num
                step={0.1}
                min={1}
                max={8}
                value={s.block.maxMult}
                onChange={(v) => set(["block", "maxMult"], v)}
              />
            </Field>
            <Field
              label="Increase per relation"
              hint="volume added per passing relation (also the Stable-02 relation-volume default) · 0.05 – 1"
            >
              <Num
                step={0.05}
                min={0.05}
                max={1}
                value={s.block.increase ?? 0.4}
                onChange={(v) => set(["block", "increase"], v)}
              />
            </Field>
          </div>
          <BlockSources block={s.block} set={set} />
          {(() => {
            const r = { ...DEFAULT_BLOCK.ranges!, ...(s.block.ranges ?? {}) };
            const putR = (k: string, v: [number, number]) =>
              set(["block", "ranges"], { ...r, [k]: v });
            return (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontWeight: 600, fontSize: "var(--v-fs-sm)" }}>Allowed ranges</div>
                <div className="v2-muted" style={{ fontSize: "var(--v-fs-xs)", marginBottom: 6 }}>
                  min · max each Block knob may take (presets and sweeps stay inside)
                </div>
                <div className="v2-grid v2-cols-2">
                  <Span label="Levels" hint="1 – 12" value={r.levels} lo={1} hi={12} onChange={(v) => putR("levels", v)} />
                  <Span
                    label="Volume ratio"
                    hint="0.05 – 2"
                    value={r.volRatio}
                    lo={0.05}
                    hi={2}
                    step={0.05}
                    onChange={(v) => putR("volRatio", v)}
                  />
                  <Span label="Volume steps" hint="0 – 12" value={r.steps} lo={0} hi={12} onChange={(v) => putR("steps", v)} />
                  <Span
                    label="Increase"
                    hint="0.05 – 1"
                    value={r.increase}
                    lo={0.05}
                    hi={1}
                    step={0.05}
                    onChange={(v) => putR("increase", v)}
                  />
                  <Span label="Pause" hint="0 – 12" value={r.pause} lo={0} hi={12} onChange={(v) => putR("pause", v)} />
                </div>
              </div>
            );
          })()}
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
            <Field label={s.axis?.mode === "desk" ? "Rungs (min 2)" : "Legs (incl. base)"} hint="1 – 8">
              <Num
                value={s.axis?.levels ?? 3}
                min={1}
                max={8}
                onChange={(v) => set(["axis", "levels"], v)}
              />
            </Field>
            <Field label="Spacing (ATR)" hint="0.1 – 5">
              <Num
                step={0.1}
                min={0.1}
                max={5}
                value={s.axis?.spacing ?? 0.7}
                onChange={(v) => set(["axis", "spacing"], v)}
              />
            </Field>
            <Field label="Rung size (× normal)" hint="0.1 – 5">
              <Num
                step={0.1}
                min={0.1}
                max={5}
                value={s.axis?.ratio ?? 1}
                onChange={(v) => set(["axis", "ratio"], v)}
              />
            </Field>
            <Field label="Axis EMA (bars)" hint="5 – 400 · used when the minutes below are 0">
              <Num
                min={5}
                max={400}
                value={s.axis?.center ?? 50}
                onChange={(v) => set(["axis", "center"], v)}
              />
            </Field>
            <Field
              label="Axis EMA (minutes)"
              hint="converted to each lane's bars (old desk ≈ 132) · 0 = the bar period above"
            >
              <Num
                min={0}
                max={1440}
                value={s.axis?.centerMin ?? 0}
                onChange={(v) => set(["axis", "centerMin"], Math.round(v))}
              />
            </Field>
            <Field
              label="Ladder depths"
              hint="every depth (legs, 1 – 8) its own tape per range type · empty = the legs above"
            >
              <List
                value={s.axis?.levelsSet?.length ? s.axis.levelsSet : [s.axis?.levels ?? 3]}
                onChange={(v) =>
                  set(
                    ["axis", "levelsSet"],
                    [...new Set(v.map((x) => Math.round(x)).filter((x) => x >= 1 && x <= 8))],
                  )
                }
              />
            </Field>
            <Field
              label="Exits"
              hint="managed: target just past the moving axis, breakeven at 0.85 risk · fixed: target = the axis at the signal (revert mode)"
            >
              <select
                className="v2-select"
                aria-label="Axis exits"
                value={s.axis?.exits ?? "managed"}
                onChange={(e) => set(["axis", "exits"], e.target.value)}
              >
                <option value="managed">managed</option>
                <option value="fixed">fixed</option>
              </select>
            </Field>
            <Field label="Min displacement (ATR)" hint="0 – 10, below the max">
              <Num
                step={0.05}
                min={0}
                max={10}
                value={s.axis?.minDisp ?? 0.35}
                onChange={(v) => set(["axis", "minDisp"], v)}
              />
            </Field>
            <Field label="Max displacement (ATR)" hint="0.1 – 20">
              <Num
                step={0.1}
                min={0.1}
                max={20}
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
            <Field label="Levels" hint="deeper legs after the base leg · the stack is at most 5 stages (base + 4)">
              <Num
                value={s.dca.levels}
                min={1}
                max={4}
                onChange={(v) => set(["dca", "levels"], v)}
              />
            </Field>
            <Field label="Step (%)" hint="distance between levels (unless a step × target is set) · 0.1 – 10">
              <Num
                pct
                min={0.001}
                max={0.1}
                value={s.dca.step}
                onChange={(v) => set(["dca", "step"], v)}
              />
            </Field>
            <Field
              label="Targets (%)"
              hint="DCA take-profit targets, each its own config · up to 12, 0.2 – 20"
            >
              <List
                pct
                value={s.dca.tp?.length ? s.dca.tp : DCA_TP_DEFAULT}
                onChange={(v) =>
                  set(
                    ["dca", "tp"],
                    v.filter((x) => x >= 0.002 && x <= 0.2).slice(0, 12),
                  )
                }
              />
            </Field>
            <Field label="Step × target" hint="level distance as a multiple of the DCA target (0 = the % step)">
              <Num
                step={0.25}
                min={0}
                max={5}
                value={s.dca.stepOfTp ?? 0}
                onChange={(v) => set(["dca", "stepOfTp"], v)}
              />
            </Field>
            <Field label="Stop gap (levels)" hint="the stop sits this many level steps beyond the deepest level">
              <Num
                step={0.25}
                min={0}
                max={5}
                value={s.dca.stopGap ?? 0.5}
                onChange={(v) => set(["dca", "stopGap"], v)}
              />
            </Field>
            <Field label="Stop × target" hint="DCA stop as a multiple of its target (never inside the deepest level + gap)">
              <Num
                step={0.25}
                min={0.25}
                max={5}
                value={s.dca.slOfTp ?? 1.5}
                onChange={(v) => set(["dca", "slOfTp"], v)}
              />
            </Field>
          </div>
        </Panel>
        <Panel
          title="Protect grid"
          sub="wide targets, short range, and a minimal range under it — every combination is its own tape (max 480)"
        >
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
              <Field label="Min trail (%)" hint="0 – 10">
                <Num
                  pct
                  min={0}
                  max={0.1}
                  value={s.grid.minTrail}
                  onChange={(v) => set(["grid", "minTrail"], v)}
                />
              </Field>
              <Field label="Min SL (%)" hint="0 – 20">
                <Num
                  pct
                  min={0}
                  max={0.2}
                  value={s.grid.minSl}
                  onChange={(v) => set(["grid", "minSl"], v)}
                />
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
            <ProtectRanges grid={s.grid} set={set} />
          </div>
        </Panel>
      </div>

      <div className="v2-grid v2-cols-2">
        <Panel title="Real stage (walk-forward)" sub="pre-historic window, last-N and book limits">
          <div className="v2-grid v2-cols-3">
            <Field label="Pre-calc (h)" hint="configs must still work here · 1 – 240">
              <Num value={wf.preH} min={1} max={240} onChange={(v) => setW("preH", v)} />
            </Field>
            <Field label="Long window (h)" hint="Main robustness window · 24 – 1440">
              <Num value={wf.longH} min={24} max={1440} onChange={(v) => setW("longH", v)} />
            </Field>
            <Field label="Sim run (h)" hint="6 – 240">
              <Num value={wf.simH} min={6} max={240} onChange={(v) => setW("simH", v)} />
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
              <Num
                value={wf.portfolio}
                min={0}
                max={10_000}
                onChange={(v) => setW("portfolio", Math.round(v))}
              />
            </Field>
            <Field
              label="Validate last-N"
              hint={`pre-historic / best set: last closes must clear min PF and DDT · 0 = off · 0 – 200 · mainnet (${MAINNET_CONN}): at least ${MAINNET_VALID_LAST_N} enforced${onMainnet ? " — active now" : ""}`}
            >
              <Num
                value={wf.validLastN ?? 0}
                min={0}
                max={200}
                onChange={(v) => setW("validLastN", Math.round(v))}
              />
            </Field>
            <Field
              label="Signal last-N"
              hint={`signals: validation and live last-N on their own last closes (a signal config closes ~10× in a window) · 0 = off · 0 – 200 · mainnet (${MAINNET_CONN}): at least ${MAINNET_SIGNAL_VALID_LAST_N} enforced${onMainnet ? " — active now" : ""}`}
            >
              <Num
                value={wf.signalValidLastN ?? 0}
                min={0}
                max={200}
                onChange={(v) => setW("signalValidLastN", Math.round(v))}
              />
            </Field>
            <Field
              label="Live last-N"
              hint={`end stage and live: last closes must clear min PF and DDT again · 0 = off · 0 – 200 · mainnet (${MAINNET_CONN}): at least ${MAINNET_LAST_N} enforced${onMainnet ? " — active now" : ""}`}
            >
              <Num
                value={wf.lastN}
                min={0}
                max={200}
                onChange={(v) => setW("lastN", Math.round(v))}
              />
            </Field>
            <Field label="Last-N min PF" hint="0 – 5">
              <Num
                step={0.05}
                min={0}
                max={5}
                value={wf.lastNMinPf}
                onChange={(v) => setW("lastNMinPf", v)}
              />
            </Field>
            <Field label="Robust share" hint="share of a pair's variants that must pass the long window · 0 – 1">
              <Num
                step={0.05}
                min={0}
                max={1}
                value={wf.robustFrac}
                onChange={(v) => setW("robustFrac", v)}
              />
            </Field>
            <Field label="Max orders / symbol" hint="0 = no limit">
              <Num
                value={wf.maxPerSymbol}
                min={0}
                max={1000}
                onChange={(v) => setW("maxPerSymbol", Math.round(v))}
              />
            </Field>
            <Field label="Max orders / side" hint="0 = no limit">
              <Num
                value={wf.maxPerSide}
                min={0}
                max={10_000}
                onChange={(v) => setW("maxPerSide", Math.round(v))}
              />
            </Field>
            <Field
              label="Max positions"
              hint="engine positions: symbol × direction, long and short apart; orders on an open one add no position · signals have their own cap · 0 = no limit"
            >
              <Num
                value={wf.maxPositions ?? 0}
                min={0}
                max={10_000}
                onChange={(v) => setW("maxPositions", Math.round(v))}
              />
            </Field>
            <Field label="Max open orders" hint="0 = no limit">
              <Num
                value={wf.maxOpen}
                min={0}
                max={100_000}
                onChange={(v) => setW("maxOpen", Math.round(v))}
              />
            </Field>
            <Field label="Hour guard (%)" hint="0 = off · 0 – 100">
              <Num
                step={0.1}
                min={0}
                max={100}
                value={wf.guardPct}
                onChange={(v) => setW("guardPct", v)}
              />
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
                <option value="net">net result</option>
              </select>
            </Field>
            <Field label="Durable splits" hint="durable selection: sub-windows of the long window · 2 – 12">
              <Num
                value={wf.durableSplits ?? 4}
                min={2}
                max={12}
                onChange={(v) => setW("durableSplits", Math.round(v))}
              />
            </Field>
            <Field
              label="Durable positive share"
              hint="durable selection: share of the sub-windows a config must be positive in · 0 – 1"
            >
              <Num
                step={0.05}
                min={0}
                max={1}
                value={wf.durableFrac ?? 0.75}
                onChange={(v) => setW("durableFrac", v)}
              />
            </Field>
            <Field
              label="Seats per lane"
              hint="minimum Real seats per timeframe lane group (validated configs only) · 0 – 40"
            >
              <Num
                value={wf.laneSeats ?? 3}
                min={0}
                max={40}
                onChange={(v) => setW("laneSeats", Math.round(v))}
              />
            </Field>
            <Field
              label="Symbol gate"
              hint="Real, per symbol: veto = a proven loser on the symbol does not open · proven = the symbol must already clear min PF · per side = judged on that direction only"
            >
              <select
                className="v2-select"
                aria-label="Symbol gate"
                value={wf.symGate ?? "proven"}
                onChange={(e) => setW("symGate", e.target.value)}
              >
                <option value="proven">proven symbols only</option>
                <option value="provenSide">proven, per side</option>
                <option value="veto">veto losers</option>
                <option value="vetoSide">veto losers, per side</option>
              </select>
            </Field>
            <Field
              label="Symbol gate sample"
              hint="closes a config needs on the symbol before the symbol gate judges it · 1 – 50"
            >
              <Num
                value={wf.symMinN ?? 2}
                min={1}
                max={50}
                onChange={(v) => setW("symMinN", Math.round(v))}
              />
            </Field>
            <Field
              label="Symbol gate window (h)"
              hint="how far back the symbol gate looks · 0 = the long window · up to 1440"
            >
              <Num
                value={wf.symH ?? 0}
                min={0}
                max={1440}
                onChange={(v) => setW("symH", v)}
              />
            </Field>
          </div>
          <div className="v2-grid v2-cols-2" style={{ marginTop: 10 }}>
            <SwitchRow
              label="Pre-window gate"
              title="Pre-window gate"
              help="a config must still work (PF ≥ 1) in the pre-calc window before it takes a seat"
              checked={wf.preGate !== false}
              onChange={(v) => setW("preGate", v)}
            />
            <SwitchRow
              label="Family seats"
              title="Family seats"
              help="Normal / Trailing, DCA and Axis each get their own seats instead of competing for one seat per pair"
              checked={wf.familySeats !== false}
              onChange={(v) => setW("familySeats", v)}
            />
            <SwitchRow
              label="DCA / Axis need a base"
              title="DCA / Axis need a base"
              help="a DCA or Axis set takes a seat only when it beats a Normal / Trailing result on the same pair"
              checked={wf.familyNeedsBase === true}
              onChange={(v) => setW("familyNeedsBase", v)}
            />
            <SwitchRow
              label="Best first"
              title="Best first"
              help="at the same entry time the best-ranked config enters first (off = by config id)"
              checked={wf.bestFirst !== false}
              onChange={(v) => setW("bestFirst", v)}
            />
          </div>
          <div style={{ marginTop: 10 }}>
            <div style={{ fontWeight: 600, fontSize: "var(--v-fs-sm)" }}>Bot types</div>
            <div className="v2-muted" style={{ fontSize: "var(--v-fs-xs)", marginBottom: 6 }}>
              which bots may take Real seats · every bot is still computed and evaluated (all on = no filter)
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {BOT_TYPES.map((b) => {
                const cur: string[] = wf.bots ?? [];
                const on = !cur.length || cur.includes(b);
                return (
                  <Switch
                    key={b}
                    label={b}
                    checked={on}
                    onChange={(v) => {
                      const all = cur.length ? cur : [...BOT_TYPES];
                      const next = v ? [...new Set([...all, b])] : all.filter((x) => x !== b);
                      // every bot on = no filter; at least one stays on
                      if (!next.length) return;
                      setW("bots", next.length === BOT_TYPES.length ? [] : next);
                    }}
                  />
                );
              })}
            </div>
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
                  label="Stable-02 window (closes)"
                  hint="closes judged per symbol window · default 6"
                >
                  <Num
                    min={1}
                    max={100}
                    value={c.s2Steps ?? 6}
                    onChange={(v) => setC("s2Steps", Math.round(v))}
                  />
                </Field>
                <Field
                  label="Stable-02 pause (closes)"
                  hint="closes a losing symbol waits · default = the window"
                >
                  <Num
                    min={1}
                    max={100}
                    value={c.s2Pause ?? c.s2Steps ?? 6}
                    onChange={(v) => setC("s2Pause", Math.round(v))}
                  />
                </Field>
                <Field
                  label="Stable-02 volume per relation"
                  hint="added per winning relation (≤ 1.8× in total) · default 0.4"
                >
                  <Num
                    step={0.05}
                    min={0.05}
                    max={1}
                    value={c.s2Increase ?? 0.4}
                    onChange={(v) => setC("s2Increase", v)}
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
                <Field
                  label="Hedge: min PF"
                  hint="a signal's PF in the book's losing hours · 1 – 5"
                >
                  <Num
                    step={0.1}
                    min={1}
                    max={5}
                    value={c.hedgeMinPf ?? 2}
                    onChange={(v) => setC("hedgeMinPf", v)}
                  />
                </Field>
                <Field
                  label="Hedge: min results"
                  hint="results in losing hours needed · 1 – 100"
                >
                  <Num
                    min={1}
                    max={100}
                    value={c.hedgeMinN ?? 10}
                    onChange={(v) => setC("hedgeMinN", Math.round(v))}
                  />
                </Field>
                <Field
                  label="Hedge: previous hour only"
                  hint="hedge only after a losing previous hour (off = also while the current hour is negative)"
                >
                  <Switch
                    label="Hedge previous hour only"
                    checked={!!c.hedgePrevOnly}
                    onChange={(v) => setC("hedgePrevOnly", v)}
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
            <Field label="Connection" hint="these settings belong to the connection selected at the top">
              <input className="v2-input" value={s.live.connId} readOnly aria-readonly />
            </Field>
            <Field label="Notional per entry ($)" hint="1 – 500">
              <Num
                min={1}
                max={500}
                value={s.live.notionalUsd}
                onChange={(v) => set(["live", "notionalUsd"], v)}
              />
            </Field>
            <Field
              label="Max positions"
              hint="engine positions (symbol × direction, long and short apart; every lane order on one counts once) · signals have their own cap (Signals → Max positions)"
            >
              <Num
                value={s.live.maxPositions}
                min={0}
                max={10_000}
                onChange={(v) => set(["live", "maxPositions"], Math.round(v))}
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
              label="Leverage"
              hint="per symbol and side, set before its first order · maximum = the exchange maximum (least margin per position)"
            >
              <select
                className="v2-select"
                aria-label="Leverage"
                value={String(s.live.leverage ?? "max")}
                onChange={(e) =>
                  set(["live", "leverage"], e.target.value === "max" ? "max" : Number(e.target.value))
                }
              >
                <option value="max">Maximum</option>
                {[
                  ...new Set([
                    ...LEVERAGE_CHOICES,
                    ...(typeof s.live.leverage === "number" ? [s.live.leverage] : []),
                  ]),
                ]
                  .sort((a, b) => a - b)
                  .map((n) => (
                    <option key={n} value={n}>
                      {n}×
                    </option>
                  ))}
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
            <Field label="Control ratio" hint="control volume per lane volume unit · 0.1 – 10">
              <Num
                step={0.1}
                min={0.1}
                max={10}
                value={s.live.ratio ?? 1}
                onChange={(v) => set(["live", "ratio"], v)}
              />
            </Field>
            <Field label="Max $ per position" hint="cap per symbol + direction · 0 = no cap (volume from the factors and relations) · 1 – 5000">
              <Num
                min={0}
                max={5000}
                value={s.live.maxNotionalUsd ?? 30}
                onChange={(v) => set(["live", "maxNotionalUsd"], v)}
              />
            </Field>
            <Field
              label="Rebalance beyond (%)"
              hint="adjust only when the target moves more than this · 0 – 100"
            >
              <Num
                pct
                step={1}
                min={0}
                max={1}
                value={s.live.rebalancePct ?? 0.25}
                onChange={(v) => set(["live", "rebalancePct"], v)}
              />
            </Field>
            <Field
              label="Require simulated readiness"
              hint={`only trade while the rolling simulated run holds PF ≥ min and is stable (turn off for a testnet) · mainnet (${MAINNET_CONN}): always on, enforced on save${onMainnet ? " — active now" : ""}`}
            >
              <Switch
                label="Require simulated readiness"
                checked={s.live.requireReady !== false}
                onChange={(v) => set(["live", "requireReady"], v)}
              />
            </Field>
            <Field label="Minimum stop (%)" hint="exchange stops are never closer than this · 0.1 – 20">
              <Num
                pct
                step={0.1}
                min={0.001}
                max={0.2}
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
                max={60_000}
                value={s.live.syncMs ?? 1000}
                onChange={(v) => set(["live", "syncMs"], v)}
              />
            </Field>
            <Field
              label="Min free margin ($)"
              hint="no opening or increasing while the account's free margin (USDT) is below this; closing always runs · 0 = off"
            >
              <Num
                min={0}
                max={1_000_000}
                value={s.live.minFreeMargin ?? 0}
                onChange={(v) => set(["live", "minFreeMargin"], v)}
              />
            </Field>
            <Field
              label="Openings paused"
              hint={
                typeof s.live.openPaused === "string" && s.live.openPaused
                  ? `paused: ${s.live.openPaused} · held positions, closes and stops keep running`
                  : "no opening or increasing; held positions, closes, reduces and stops keep running (a coordinator may set this)"
              }
            >
              <Switch
                label="Openings paused"
                checked={!!s.live.openPaused}
                onChange={(v) => set(["live", "openPaused"], v)}
              />
            </Field>
          </div>
        </Panel>
      </div>
    </>
  );
}
