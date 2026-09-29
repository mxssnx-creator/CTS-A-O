// Every setting of ONE preset in a dialog. Changes are saved to that preset (a research preset is saved as your
// own edited copy); the engine is only changed when the preset is applied.
import { useEffect, useState, type ReactNode } from "react";
import { coreSettings, presetAction } from "@/core/api";
import { MAX_DDT_CHOICES, MIN_PF_CHOICES, SYMBOL_RANK_CHOICES } from "@/core/config";
import { INDICATION_KINDS } from "@/core/domain/types";
import { ErrorNote, Modal, Pill, Switch } from "./ui";
import {
  BlockSources,
  Field,
  FocusText,
  List,
  Num,
  ShortRange,
  SignalsSettings,
  Timeframes,
} from "./pages/settings";

type Any = any;

const STRATS: Array<[string, string]> = [
  ["normal", "Normal"],
  ["trailing", "Trailing"],
  ["axis", "Axis"],
  ["block", "Block"],
  ["blockActive", "Block Active"],
  ["dca", "DCA"],
  ["dcaActive", "DCA Active"],
];
const TACTICS: Array<[string, string]> = [
  ["session", "EU/US session"],
  ["volRegime", "Volatility regime"],
  ["trendStrength", "Trend strength (ADX ≥ 20)"],
  ["cooldown", "Cooldown"],
];

function Section(props: { title: string; sub?: string; children: ReactNode }) {
  return (
    <section
      style={{
        borderTop: "1px solid var(--v-border)",
        padding: "12px 0",
        display: "grid",
        gap: 10,
      }}
    >
      <div>
        <div style={{ fontWeight: 700 }}>{props.title}</div>
        {props.sub && (
          <div className="v2-muted" style={{ fontSize: "var(--v-fs-xs)" }}>
            {props.sub}
          </div>
        )}
      </div>
      {props.children}
    </section>
  );
}

const nearest = (xs: readonly number[], v: number) =>
  xs.reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a));

/**
 * Engine-level settings a preset never carries (the server strips them, see PRESET_EXCLUDED in core/presets.ts):
 * they are neither shown nor edited here and stay unchanged when a preset is applied.
 */
const NOT_IN_PRESET = [
  "live",
  "sizing",
  "paperBalance",
  "cost",
  "fees",
  "cycleMs",
  "tickMs",
  "adjust",
] as const;

/** Effective settings of a preset: the engine's current values under the preset's own ones. */
function effective(engine: Any, p: Any) {
  const ps = p.settings ?? {};
  const merged: Any = structuredClone(engine);
  for (const [k, v] of Object.entries(ps))
    merged[k] =
      v && typeof v === "object" && !Array.isArray(v) ? { ...(engine[k] ?? {}), ...(v as Any) } : v;
  // a preset without its own symbol selection shows the engine's current one (and keeps it on apply)
  merged.symbols ??= 1;
  merged.symbolRank ??= "volatility1h";
  for (const k of NOT_IN_PRESET) delete merged[k];
  return merged;
}

export function PresetSettingsDialog(props: {
  preset: Any | null;
  onClose: () => void;
  onSaved?: (msg: string) => void;
  readOnly?: boolean;
}) {
  const p = props.preset;
  const [s, setS] = useState<Any>(null);
  // symbol selection as shown when the dialog opened: saved into the preset only if it had it or it changed
  const [sym0, setSym0] = useState<{ symbols: number; symbolRank: string } | null>(null);
  const [wf, setWf] = useState<Any>(null);
  const [label, setLabel] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!p) return;
    setErr(null);
    setLabel(p.kind === "research" ? `${p.label} (edited)` : p.label);
    void coreSettings()
      .then((d: Any) => {
        const e = effective(d.settings, p);
        setS(e);
        setSym0({ symbols: e.symbols, symbolRank: e.symbolRank });
        setWf({ ...d.wf, ...(p.wf ?? {}) });
      })
      .catch((e) => setErr(String(e?.message ?? e)));
  }, [p]);
  const set = (path: string[], v: unknown) =>
    setS((prev: Any) => {
      const next = structuredClone(prev);
      let o = next;
      for (const k of path.slice(0, -1)) o = o[k] ??= {};
      o[path[path.length - 1]] = v;
      return next;
    });
  const setW = (k: string, v: unknown) => setWf((x: Any) => ({ ...x, [k]: v }));
  const save = async (apply: boolean) => {
    setBusy(true);
    setErr(null);
    try {
      const ps = p.settings ?? {};
      const settings: Any = {
        tfs: s.tfs,
        tfDays: s.tfDays,
        gates: s.gates,
        toggles: s.toggles,
        tactics: s.tactics,
        disabledKinds: s.disabledKinds ?? [],
        focus: s.focus ?? [],
        grid: s.grid,
        block: s.block,
        dca: s.dca,
        axis: s.axis,
        signals: s.signals,
      };
      if (ps.symbols !== undefined || s.symbols !== sym0?.symbols) settings.symbols = s.symbols;
      if (ps.symbolRank !== undefined || s.symbolRank !== sym0?.symbolRank)
        settings.symbolRank = s.symbolRank;
      const w = {
        mode: wf.mode,
        lastN: wf.lastN,
        lastNMinPf: wf.lastNMinPf,
        portfolio: wf.portfolio,
        maxPerSymbol: wf.maxPerSymbol,
        maxPerSide: wf.maxPerSide,
        maxPositions: wf.maxPositions,
        maxOpen: wf.maxOpen,
        preH: wf.preH,
        longH: wf.longH,
      };
      const r = (await presetAction({
        data: { action: "update", id: p.id, settings, wf: w, label },
      })) as Any;
      if (apply) await presetAction({ data: { action: "apply", id: r.preset.id } });
      props.onSaved?.(
        apply
          ? `Saved and applied “${r.preset.label}”`
          : p.kind === "research"
            ? `Saved as your preset “${r.preset.label}”`
            : `Saved “${r.preset.label}”`,
      );
      props.onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  const ro = !!props.readOnly;
  return (
    <Modal
      open={!!p}
      onClose={props.onClose}
      title={
        <>
          Preset settings · {p?.label}{" "}
          {p && <Pill kind={p.kind === "research" ? "acc" : undefined}>{p.kind}</Pill>}
        </>
      }
      footer={
        ro ? (
          <button type="button" className="v2-btn" onClick={props.onClose}>
            Close
          </button>
        ) : (
          <>
            <button type="button" className="v2-btn" onClick={props.onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="v2-btn"
              disabled={busy || !s}
              onClick={() => void save(false)}
            >
              {p?.kind === "research" ? "Save as my preset" : "Save to preset"}
            </button>
            <button
              type="button"
              className="v2-btn primary"
              disabled={busy || !s}
              onClick={() => void save(true)}
            >
              Save & apply
            </button>
          </>
        )
      }
    >
      <ErrorNote error={err} />
      {!s || !wf ? (
        <div className="v2-muted">Loading…</div>
      ) : (
        <fieldset disabled={ro} style={{ border: 0, padding: 0, margin: 0, display: "grid" }}>
          <p className="v2-muted" style={{ margin: "0 0 8px", fontSize: "var(--v-fs-sm)" }}>
            {ro
              ? "No preset is applied — these are the engine's current settings (read-only here; change them in Settings or apply a preset)."
              : null}
          </p>
          <p
            hidden={ro}
            className="v2-muted"
            style={{ margin: "0 0 8px", fontSize: "var(--v-fs-sm)" }}
          >
            Changes belong to this preset only
            {p.kind === "research"
              ? " (saved as your own copy — the research preset stays as measured)"
              : ""}
            ; the engine changes when the preset is applied. A preset never carries the Live stage,
            sizing, paper balance, costs / fees, the auto-adjuster or the loop timing (cycle / tick)
            — those stay as set in Settings.
          </p>
          {!ro && (
            <Field label="Name">
              <input
                className="v2-input"
                value={label}
                maxLength={80}
                onChange={(e) => setLabel(e.target.value)}
              />
            </Field>
          )}
          <Section title="Symbols" sub="how many coins and which ones">
            <div className="v2-grid v2-cols-2">
              <Field label={`Count: ${s.symbols}`} hint="1 – 50">
                <input
                  type="range"
                  min={1}
                  max={50}
                  step={1}
                  value={Math.min(50, Math.max(1, s.symbols))}
                  aria-label="Symbol count"
                  onChange={(e) => set(["symbols"], Number(e.target.value))}
                />
              </Field>
              <Field label="Order type" hint="ranking that picks the symbols">
                <select
                  className="v2-select"
                  value={s.symbolRank}
                  onChange={(e) => set(["symbolRank"], e.target.value)}
                >
                  {SYMBOL_RANK_CHOICES.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </Section>
          <Section title="Timeframes">
            <Timeframes tfs={s.tfs} tfDays={s.tfDays} set={set} />
          </Section>
          <Section title="Signals">
            <SignalsSettings signals={s.signals} set={set} />
          </Section>
          <Section title="Gates">
            <div className="v2-grid v2-cols-4">
              <Field label="Min PF">
                <select
                  className="v2-select"
                  value={nearest(MIN_PF_CHOICES, s.gates.minPf)}
                  onChange={(e) => set(["gates", "minPf"], Number(e.target.value))}
                >
                  {MIN_PF_CHOICES.map((v) => (
                    <option key={v} value={v}>
                      {v.toFixed(2)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Max DDT">
                <select
                  className="v2-select"
                  value={nearest(MAX_DDT_CHOICES, s.gates.maxDdtH)}
                  onChange={(e) => set(["gates", "maxDdtH"], Number(e.target.value))}
                >
                  {MAX_DDT_CHOICES.map((v) => (
                    <option key={v} value={v}>
                      {v} h
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </Section>
          <Section title="Strategies" sub="executed sub-strategies (Base always computes all)">
            <div className="v2-grid v2-cols-4" style={{ gap: 8 }}>
              {STRATS.map(([k, l]) => (
                <label key={k} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <Switch
                    label={l}
                    checked={k === "axis" ? s.toggles?.[k] !== false : !!s.toggles?.[k]}
                    onChange={(v) => set(["toggles", k], v)}
                  />
                  <span>{l}</span>
                </label>
              ))}
            </div>
          </Section>
          <Section title="Tactics" sub="entry filters; each only removes entries">
            <div className="v2-grid v2-cols-4" style={{ gap: 8 }}>
              {TACTICS.map(([k, l]) => (
                <label key={k} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <Switch
                    label={l}
                    checked={!!s.tactics?.[k]}
                    onChange={(v) => set(["tactics", k], v)}
                  />
                  <span>{l}</span>
                </label>
              ))}
            </div>
            {s.tactics?.cooldown && (
              <Field label="Cooldown bars">
                <Num
                  value={s.tactics.cooldownBars ?? 4}
                  min={0}
                  max={96}
                  onChange={(v) => set(["tactics", "cooldownBars"], v)}
                />
              </Field>
            )}
          </Section>
          <Section title="Indication types">
            <div className="v2-grid v2-cols-4" style={{ gap: 8 }}>
              {INDICATION_KINDS.map((k) => {
                const on = !(s.disabledKinds ?? []).includes(k);
                return (
                  <label key={k} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <Switch
                      label={`type ${k}`}
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
                    <span>{k}</span>
                  </label>
                );
              })}
            </div>
            <Field label="Focus pairs" hint="bot|indication, comma separated — empty = every combo">
              <FocusText value={s.focus ?? []} onChange={(v) => set(["focus"], v)} />
            </Field>
          </Section>
          <Section title="Protect grid">
            <div className="v2-grid v2-cols-3">
              <Field label="TP (%)">
                <List pct value={s.grid.tp} onChange={(v) => set(["grid", "tp"], v)} />
              </Field>
              <Field label="SL × TP">
                <List value={s.grid.slOfTp} onChange={(v) => set(["grid", "slOfTp"], v)} />
              </Field>
              <Field label="Trail share of TP (0 = off)">
                <List value={s.grid.trailOfTp} onChange={(v) => set(["grid", "trailOfTp"], v)} />
              </Field>
              <Field label="Hold (h)">
                <List value={s.grid.holdH} onChange={(v) => set(["grid", "holdH"], v)} />
              </Field>
              <Field label="Min trail (%)">
                <Num pct value={s.grid.minTrail} onChange={(v) => set(["grid", "minTrail"], v)} />
              </Field>
              <Field label="Min SL (%)">
                <Num pct value={s.grid.minSl} onChange={(v) => set(["grid", "minSl"], v)} />
              </Field>
            </div>
            <ShortRange grid={s.grid} set={set} />
          </Section>
          <Section title="Block · DCA · Axis">
            <div className="v2-grid v2-cols-4">
              <Field label="Block ratio">
                <Num
                  step={0.05}
                  value={s.block.ratio}
                  onChange={(v) => set(["block", "ratio"], v)}
                />
              </Field>
              <Field label="Block max level">
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
              <Field label="Block max multiple" hint="capped at 8×">
                <Num
                  step={0.1}
                  min={1}
                  max={8}
                  value={s.block.maxMult}
                  onChange={(v) => set(["block", "maxMult"], v)}
                />
              </Field>
              <Field label="DCA levels">
                <Num
                  value={s.dca.levels}
                  min={1}
                  max={6}
                  onChange={(v) => set(["dca", "levels"], v)}
                />
              </Field>
              <Field label="DCA step (%)">
                <Num pct value={s.dca.step} onChange={(v) => set(["dca", "step"], v)} />
              </Field>
              <Field label="Axis legs">
                <Num
                  value={s.axis?.levels ?? 3}
                  min={1}
                  max={8}
                  onChange={(v) => set(["axis", "levels"], v)}
                />
              </Field>
              <Field label="Axis spacing (ATR)">
                <Num
                  step={0.1}
                  value={s.axis?.spacing ?? 0.7}
                  onChange={(v) => set(["axis", "spacing"], v)}
                />
              </Field>
            </div>
            <BlockSources block={s.block} set={set} />
          </Section>
          <Section title="Real stage" sub="selection, last-N and book limits">
            <div className="v2-grid v2-cols-4">
              <Field label="Selection">
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
              <Field label="Last-N (0 = off)">
                <Num value={wf.lastN} min={0} max={200} onChange={(v) => setW("lastN", v)} />
              </Field>
              <Field label="Real seats / family" hint="0 = no limit">
                <Num
                  value={wf.portfolio}
                  min={0}
                  max={10000}
                  onChange={(v) => setW("portfolio", v)}
                />
              </Field>
              <Field label="Max positions (0 = no limit)">
                <Num
                  value={wf.maxPositions ?? 0}
                  min={0}
                  max={10000}
                  onChange={(v) => setW("maxPositions", v)}
                />
              </Field>
              <Field label="Max orders / symbol" hint="0 = no limit">
                <Num
                  value={wf.maxPerSymbol}
                  min={0}
                  max={1000}
                  onChange={(v) => setW("maxPerSymbol", v)}
                />
              </Field>
            </div>
          </Section>
        </fieldset>
      )}
    </Modal>
  );
}
