import { useEffect, useRef, useState, type ReactNode } from "react";
import { coreSettings, coreStatus, saveCoreSettings } from "@/core/api";
import { GATE_PRESETS, MAX_DDT_CHOICES, MIN_PF_CHOICES, STRATEGY_PRESETS } from "@/core/config";
import { INDICATION_KINDS } from "@/core/domain/types";
import { Confirm, downloadFile, Empty, ErrorNote, Panel, Pill, Switch, usePoll } from "../ui";

type Any = any;

function Field(props: { label: string; hint?: string; children: ReactNode }) {
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

function Num(props: {
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
  const bad =
    text.trim() === "" ||
    !Number.isFinite(Number(text)) ||
    (props.min !== undefined && Number(text) < props.min) ||
    (props.max !== undefined && Number(text) > props.max);
  return (
    <input
      className="v2-input"
      type="number"
      inputMode="decimal"
      step={props.step ?? (props.pct ? 0.01 : 1)}
      min={props.min}
      max={props.max}
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
        if (e.target.value.trim() !== "" && Number.isFinite(v))
          props.onChange(props.pct ? v / 100 : v);
      }}
    />
  );
}

function List(props: { value: readonly number[]; onChange: (v: number[]) => void; pct?: boolean }) {
  const [text, setText] = useState(
    props.value.map((v) => (props.pct ? +(v * 100).toFixed(4) : v)).join(", "),
  );
  useEffect(
    () => setText(props.value.map((v) => (props.pct ? +(v * 100).toFixed(4) : v)).join(", ")),
    [props.value, props.pct],
  );
  return (
    <input
      className="v2-input"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        const xs = text
          .split(/[,\s]+/)
          .map(Number)
          .filter((x) => Number.isFinite(x));
        if (xs.length) props.onChange(xs.map((x) => (props.pct ? x / 100 : x)));
      }}
    />
  );
}

const TOGGLE_HELP: Record<string, string> = {
  normal: "plain positions; off = only Block-adjusted ones execute (Base still computes all)",
  trailing: "trailing-stop variants; off = excluded from execution, still computed",
  block: "adds +ratio volume per passing last-n window (1..max)",
  blockActive: "Active: execute only Block level ≥ min (skip normal / lower levels)",
  dca: "adds legs at deeper levels, target re-anchored to the average",
  dcaActive: "Active: skip the base leg, trade only the higher-level (better-priced) fill",
  axis: "Axis: mean-reversion ladder toward the axis (EMA centre), rungs at ATR spacing",
};

/** Free text while typing; parsed into pairs on blur (typing commas / spaces is never eaten). */
function FocusText(props: { value: readonly string[]; onChange: (v: string[]) => void }) {
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
  const [ask, setAsk] = useState<null | "live" | "reset">(null);
  const [savedAt, setSavedAt] = useState(0);
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
    savedAt > 0 &&
    status &&
    status.appliedSettingsAt >= status.settingsAt &&
    status.lastComputeAt >= savedAt &&
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
      await saveCoreSettings({ data: { settings: diff(s, b.settings), wf: diff(wf, b.wf) } });
      setSavedAt(Date.now());
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
        if (j.settings) setS((cur: Any) => merge(cur, j.settings));
        if (j.wf) setWf((cur: Any) => ({ ...cur, ...j.wf }));
        setSaved("Imported — press Save to apply");
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
          ask === "live" ? `Enable the Live stage on ${s.live.connId}?` : "Discard unsaved changes?"
        }
        danger={ask === "live"}
        confirm={ask === "live" ? "Enable Live" : "Discard"}
        body={
          ask === "live" ? (
            <>
              {s.live.connId === "bingx-x01" ? (
                <p className="v2-down" style={{ fontWeight: 600 }}>
                  This is the MAINNET account — real money.
                </p>
              ) : null}
              <p>
                Orders are only sent when the host also has CTS_CORE_LIVE=1 and API keys, and only
                while the rolling simulated run holds PF ≥ {s.gates.minPf} and is stable. Up to{" "}
                {s.live.maxPositions} positions of ${s.live.notionalUsd} each. Takes effect after
                Save.
              </p>
            </>
          ) : (
            "Your edits on this page are lost and the saved settings are loaded again."
          )
        }
        onCancel={() => setAsk(null)}
        onConfirm={() => {
          if (ask === "live") set(["live", "enabled"], true);
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
          <Field label="Timeframe" hint="bars; 15m cleared the 0.2% cost best in holdout tests">
            <select
              className="v2-select"
              value={s.tfMin}
              onChange={(e) => set(["tfMin"], Number(e.target.value))}
            >
              {[5, 15, 30, 60].map((m) => (
                <option key={m} value={m}>
                  {m}m
                </option>
              ))}
            </select>
          </Field>
          <Field label="Symbols" hint="top by 24h quote volume">
            <Num value={s.symbols} min={2} max={120} onChange={(v) => set(["symbols"], v)} />
          </Field>
          <Field label="History (days)">
            <Num value={s.historyDays} min={2} max={45} onChange={(v) => set(["historyDays"], v)} />
          </Field>
          <Field label="Cycle (ms)">
            <Num value={s.cycleMs} step={1000} min={5000} onChange={(v) => set(["cycleMs"], v)} />
          </Field>
          <Field label="Position cost (round trip, %)" hint="0.20% = 0.1% per side × 2">
            <Num pct value={s.cost} onChange={(v) => set(["cost"], v)} />
          </Field>
          <Field label="Paper notional ($)">
            <Num value={s.paperNotional} onChange={(v) => set(["paperNotional"], v)} />
          </Field>
          <Field label="Main refine top">
            <Num value={s.refineTop} onChange={(v) => set(["refineTop"], v)} />
          </Field>
          <Field label="Evaluated top">
            <Num value={s.evalTop} onChange={(v) => set(["evalTop"], v)} />
          </Field>
        </div>
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
            <Field label="Max multiple">
              <Num
                step={0.1}
                value={s.block.maxMult}
                onChange={(v) => set(["block", "maxMult"], v)}
              />
            </Field>
          </div>
        </Panel>
        <Panel title="Axis" sub="ladder toward the axis price">
          <div className="v2-grid v2-cols-2">
            <Field label="Legs (incl. base)">
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
            <Field label="Portfolio size">
              <Num value={wf.portfolio} onChange={(v) => setW("portfolio", v)} />
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
            <Field label="Max / symbol">
              <Num value={wf.maxPerSymbol} onChange={(v) => setW("maxPerSymbol", v)} />
            </Field>
            <Field label="Max / side">
              <Num value={wf.maxPerSide} onChange={(v) => setW("maxPerSide", v)} />
            </Field>
            <Field label="Max open">
              <Num value={wf.maxOpen} onChange={(v) => setW("maxOpen", v)} />
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
                onChange={(e) => set(["live", "connId"], e.target.value)}
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
              <Num value={s.live.maxPositions} onChange={(v) => set(["live", "maxPositions"], v)} />
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
          </div>
        </Panel>
      </div>
    </>
  );
}
