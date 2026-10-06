import { useEffect, useMemo, useState } from "react";
import { corePresets, corePresetSeries, presetAction } from "../api-conn";
import { MultiArcGauge, MultiChart } from "../charts";
import { PresetSettingsDialog } from "../preset-settings";
import { DEFAULT_SETTINGS, DEFAULT_TOGGLES } from "@/core/config";
import { positiveCoordWarnings } from "@/core/positive";
import { signalSettings } from "@/core/signal-config";
import {
  Confirm,
  downloadFile,
  Empty,
  ErrorNote,
  fmt,
  Line,
  Panel,
  pfTone,
  Pill,
  usePoll,
} from "../ui";

type Any = any;

/**
 * The positive coordinations (docs/positive-coordinations.md) a preset would turn off when applied. Applying starts
 * the gates and the walk-forward patch from their defaults and merges the rest over the settings; what the preset
 * does not carry is judged at the code default, so only what the preset itself changes is reported.
 */
// the code default of wf.coord (walkforward.ts DEFAULT_COORD; the engine module is not loaded in the browser)
const COORD_DEFAULT = { enabled: true, hourLock: 0, cooldown: "off", conflict: false, confirm: true } as const;
function presetCoordWarnings(p: Any): string[] {
  const st = p?.settings ?? {};
  const wf = p?.wf ?? {};
  const at = (s: Any, w: Any) =>
    positiveCoordWarnings(
      {
        signals: signalSettings(s.signals),
        toggles: { ...DEFAULT_TOGGLES, ...(s.toggles ?? {}) },
        grid: { ...DEFAULT_SETTINGS.grid, ...(s.grid ?? {}) },
        gates: { ...DEFAULT_SETTINGS.gates, ...(s.gates ?? {}) },
      },
      { coord: { ...COORD_DEFAULT, ...(w.coord ?? {}) }, ...(w.seatPer ? { seatPer: w.seatPer } : {}) } as Any,
    );
  const base = new Set(at({}, {}));
  return at(st, wf).filter((x) => !base.has(x));
}

function summary(p: Any): string {
  const s = p.settings ?? {};
  const w = p.wf ?? {};
  const tac = Object.entries(s.tactics ?? {})
    .filter(([k, v]) => v === true && k !== "cooldownBars")
    .map(([k]) => k);
  const tg = Object.entries(s.toggles ?? {})
    .filter(([, v]) => v)
    .map(([k]) => k);
  return [
    s.tfMin ? `${s.tfMin}m` : null,
    s.symbols
      ? `${s.symbols} symbol${s.symbols > 1 ? "s" : ""} by ${({ volatility1h: "1H volatility", volume: "24h volume", market: "market", gainers: "gainers", losers: "losers" } as Record<string, string>)[s.symbolRank ?? "volatility1h"]}`
      : null,
    s.focus?.length ? `${s.focus.length} focus pairs` : "all combos",
    w.mode ? `${w.mode} selection` : null,
    tg.length ? tg.join(" + ") : null,
    tac.length ? `tactics: ${tac.join(", ")}` : "no tactics",
    w.validLastN !== undefined ? `validate N ${w.validLastN || "off"}` : null,
    w.lastN !== undefined ? `live N ${w.lastN || "off"}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function Backtests(props: {
  p: Any;
  list: Any[];
  job: Any;
  gates: Any;
  maxDays: number;
  onRun: (days: number) => void;
}) {
  const [days, setDays] = useState(props.maxDays || 3);
  const running = props.job?.state === "running";
  const mine = props.job && props.job.id === props.p.id;
  return (
    <div className="v2-panel" style={{ padding: 8, display: "grid", gap: 8 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontWeight: 600, fontSize: "var(--v-fs-sm)" }}>Backtest last</span>
        <select
          className="v2-select"
          aria-label="Backtest days"
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
        >
          {[1, 2, 3, 5, 7, 10, 14, 21].filter((d) => d < props.maxDays).map((d) => (
            <option key={d} value={d}>
              {d} day{d > 1 ? "s" : ""}
            </option>
          ))}
          <option value={props.maxDays}>{props.maxDays} days (max)</option>
        </select>
        <button
          type="button"
          className="v2-btn"
          disabled={running}
          onClick={() => props.onRun(days)}
        >
          {running && mine ? "Running…" : "Run backtest"}
        </button>
        {mine && running && (
          <span className="v2-muted" style={{ fontSize: "var(--v-fs-xs)" }}>
            {props.job.stage} {Math.round(props.job.progress * 100)}%
          </span>
        )}
        {mine && props.job.state === "error" && (
          <span className="v2-down" style={{ fontSize: "var(--v-fs-xs)" }}>
            {props.job.error}
          </span>
        )}
        <span className="v2-muted" style={{ fontSize: "var(--v-fs-xs)", marginLeft: "auto" }}>
          gates: PF ≥ {fmt.pf(props.gates?.minPf)} · DDT ≤ {props.gates?.maxDdtH}h
        </span>
      </div>
      {props.list.length ? (
        <div className="v2-table-wrap">
          <table className="v2-table">
            <thead>
              <tr>
                <th>run</th>
                <th className="num">days</th>
                <th className="num">PF</th>
                <th className="num">success hours</th>
                <th className="num">DDT</th>
                <th className="num">trades</th>
                <th className="num">WR</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {props.list.slice(0, 8).map((b: Any) => (
                <tr key={b.at}>
                  <td>
                    <div>{fmt.time(b.at)}</div>
                    <div className="v2-muted" style={{ fontSize: "var(--v-fs-xs)" }}>
                      {b.tfMin}m · {fmt.time(b.from)} → {fmt.time(b.to)}
                    </div>
                  </td>
                  <td className="num">{b.days}</td>
                  <td className={`num ${pfTone(b.pf, b.minPf)}`}>{fmt.pf(b.pf)}</td>
                  <td className="num">
                    {fmt.ratio(b.successHours)}{" "}
                    <span className="v2-muted">
                      ({b.greenHours}/{b.hours})
                    </span>
                  </td>
                  <td className={`num ${b.ddtH <= b.maxDdtH ? "" : "v2-down"}`}>{fmt.h(b.ddtH)}</td>
                  <td className="num">{b.n}</td>
                  <td className="num">{fmt.ratio(b.wr)}</td>
                  <td>{b.pass ? <Pill kind="ok">pass</Pill> : <Pill kind="bad">fail</Pill>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="v2-muted" style={{ fontSize: "var(--v-fs-xs)" }}>
          No backtest yet — results stay listed here.
        </div>
      )}
    </div>
  );
}

const fmtPf = (x: number | null | undefined) => (x === null || x === undefined ? "–" : fmt.pf(x));

/**
 * The preset's cached diagrams of its latest backtest (max range by default): balance · equity, drawdown, P&L per
 * type (Normal, Trailing, Axis, Block, DCA), open positions · orders; info: positions per hour, PF of the last
 * 12 / 25 / 75 positions, DDT. Loaded when the card shows them; refreshed when a newer backtest lands.
 */
function PresetDiagrams(props: { id: string; at: number | null }) {
  const [open, setOpen] = useState(false);
  const [s, setS] = useState<Any | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (!open || !props.at) return;
    let live = true;
    corePresetSeries({ data: { id: props.id } })
      .then((r: Any) => live && setS(r.series))
      .catch((e: unknown) => live && setErr(e instanceof Error ? e.message : String(e)));
    return () => {
      live = false;
    };
  }, [open, props.id, props.at]);
  const panels = useMemo(() => {
    if (!s) return null;
    const pts = (xs: number[], neg = false) => xs.map((v, i) => ({ t: s.t[i], v: neg ? -v : v }));
    const kinds = (["Normal", "Trailing", "Axis", "Block", "DCA"] as const).filter((k) =>
      s.kinds[k].some((v: number) => Math.abs(v) > 1e-9),
    );
    return [
      {
        title: "Balance · equity ($)",
        height: 150,
        series: [
          { name: "balance", points: pts(s.balance) },
          { name: "equity", points: pts(s.equity), fill: true },
        ],
      },
      { title: "Drawdown (%)", height: 70, zero: true, digits: 1, series: [{ name: "drawdown", points: pts(s.ddPct, true), color: "var(--v-down)", fill: true }] },
      ...(kinds.length
        ? [{ title: "Realized P&L by type ($)", height: 130, zero: true, series: kinds.map((k) => ({ name: k, points: pts(s.kinds[k]) })) }]
        : []),
      {
        title: "Open positions · orders",
        height: 90,
        zero: true,
        digits: 0,
        step: true,
        series: [
          { name: "positions", points: pts(s.positions) },
          { name: "orders", points: pts(s.orders) },
        ],
      },
    ];
  }, [s]);
  if (!props.at)
    return (
      <div className="v2-muted" style={{ fontSize: "var(--v-fs-xs)" }}>
        No diagrams yet: run a backtest (the max range is cached per preset).
      </div>
    );
  const i = s?.info;
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <button type="button" className="v2-btn" style={{ justifySelf: "start" }} aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? "Hide diagrams" : "Show diagrams"}
      </button>
      {open && err && <ErrorNote error={err} />}
      {open && !s && !err && <div className="v2-muted">Loading…</div>}
      {open && i && (
        <div className="v2-muted" style={{ fontSize: "var(--v-fs-xs)", display: "flex", gap: 12, flexWrap: "wrap" }}>
          <span>{s.days} days · {fmt.time(s.from)} → {fmt.time(s.to)}</span>
          <span>positions/hour <b>{fmt.num(i.posPerHour, 2)}</b> ({fmt.num(i.positions)} positions)</span>
          <span>
            PF last 12 / 25 / 75 positions{" "}
            <b className={pfTone(i.pfLast12)}>{fmtPf(i.pfLast12)}</b> /{" "}
            <b className={pfTone(i.pfLast25)}>{fmtPf(i.pfLast25)}</b> /{" "}
            <b className={pfTone(i.pfLast75)}>{fmtPf(i.pfLast75)}</b>
          </span>
          <span>DDT overall <b>{fmt.h(i.ddtH)}</b></span>
          <span>max DD <b>{fmt.num(i.maxDdPct, 1)} %</b></span>
          <span>DDR <b>{i.ddr === null || i.ddr === undefined ? "–" : fmt.num(i.ddr, 2)}</b></span>
          <span>PF <b className={pfTone(i.pf)}>{fmtPf(i.pf)}</b> · net {fmt.num(i.netPct, 1)} %</span>
        </div>
      )}
      {open && panels && <MultiChart panels={panels} />}
    </div>
  );
}

function PresetCard(props: {
  p: Any;
  active: boolean;
  onApply: () => void;
  onDelete?: () => void;
  onSettings: () => void;
  backtests: Any[];
  job: Any;
  gates: Any;
  maxDays: number;
  onBacktest: (days: number) => void;
}) {
  const { p } = props;
  const latest = props.backtests.find((b: Any) => b.posPerHour !== undefined) ?? null;
  const m = p.metrics ?? {};
  const pfRing = Math.max(0, Math.min(1, ((m.pf ?? 0) - 0.5) / 1.5));
  return (
    <section className="v2-panel" style={{ display: "grid", gap: 10, padding: 14 }}>
      <header
        style={{
          display: "flex",
          gap: 8,
          alignItems: "flex-start",
          justifyContent: "space-between",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700 }}>{p.label}</div>
          <div className="v2-muted" style={{ fontSize: "var(--v-fs-xs)" }}>
            {summary(p)}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <Pill kind={p.kind === "research" ? "acc" : p.kind === "auto" ? "ok" : undefined}>
            {p.kind}
          </Pill>
          {props.active && <Pill kind="ok">active</Pill>}
        </div>
      </header>
      <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
        <MultiArcGauge
          size={112}
          rings={[
            { label: "PF", value: pfRing, color: "var(--v-s1)", display: fmt.pf(m.pf) },
            {
              label: "green hours",
              value: m.greenHours ?? 0,
              color: "var(--v-s2)",
              display: fmt.ratio(m.greenHours),
            },
            { label: "win rate", value: m.wr ?? 0, color: "var(--v-s3)", display: fmt.ratio(m.wr) },
          ]}
          center={fmt.pf(m.pf)}
          centerSub="PF"
        />
        <div className="v2-lines" style={{ flex: 1, minWidth: 180 }}>
          <Line k="profit factor" v={fmt.pf(m.pf)} className={pfTone(m.pf)} />
          <Line k="success ratio (green hours)" v={fmt.ratio(m.greenHours)} />
          {m.greenDays !== undefined && <Line k="green days" v={fmt.ratio(m.greenDays)} />}
          {m.runs ? <Line k="positive runs" v={`${m.positiveRuns}/${m.runs}`} /> : null}
          <Line k="trades" v={`${fmt.num(m.n)} · ${fmt.num(m.perDay, 1)}/day`} />
          <Line k="win rate" v={fmt.ratio(m.wr)} />
          <Line k="net (Σ trade %)" v={fmt.pct(m.net, 1)} />
          {m.ddtH !== undefined && <Line k="longest drawdown" v={fmt.h(m.ddtH)} />}
        </div>
      </div>
      {m.checks?.length ? (
        <div className="v2-table-wrap">
          <table className="v2-table">
            <thead>
              <tr>
                <th>period</th>
                <th className="num">PF</th>
                <th className="num">orders/day</th>
                <th className="num">green h</th>
                <th className="num">WR</th>
                <th className="num">runs +</th>
              </tr>
            </thead>
            <tbody>
              {m.checks.map((c: Any) => (
                <tr key={`${c.label}|${c.period}`}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{c.label}</div>
                    <div className="v2-muted" style={{ fontSize: "var(--v-fs-xs)" }}>
                      {c.period}
                    </div>
                  </td>
                  <td className={`num ${pfTone(c.pf)}`}>{fmt.pf(c.pf)}</td>
                  <td className="num">{fmt.num(c.perDay, 1)}</td>
                  <td className="num">{fmt.ratio(c.greenHours)}</td>
                  <td className="num">{fmt.ratio(c.wr)}</td>
                  <td className="num">{c.runs ? `${c.positiveRuns}/${c.runs}` : "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {m.oot && !m.checks?.length && (
        <div className="v2-panel" style={{ padding: 8, background: "var(--v-bg-2, transparent)" }}>
          <div style={{ fontWeight: 600, fontSize: "var(--v-fs-sm)" }}>
            Out of time · {m.oot.period}
          </div>
          <div className="v2-muted" style={{ fontSize: "var(--v-fs-xs)" }}>
            PF <span className={pfTone(m.oot.pf)}>{fmt.pf(m.oot.pf)}</span> · green hours{" "}
            {fmt.ratio(m.oot.greenHours)} · WR {fmt.ratio(m.oot.wr)} · {fmt.num(m.oot.n)} trades (
            {fmt.num(m.oot.perDay, 1)}/day)
          </div>
        </div>
      )}
      <Backtests
        p={p}
        list={props.backtests}
        job={props.job}
        gates={props.gates}
        maxDays={props.maxDays}
        onRun={props.onBacktest}
      />
      <PresetDiagrams id={p.id} at={latest?.at ?? null} />
      {p.info && (
        <p className="v2-muted" style={{ margin: 0, fontSize: "var(--v-fs-sm)" }}>
          {p.info}
        </p>
      )}
      <div className="v2-muted" style={{ fontSize: "var(--v-fs-xs)" }}>
        {m.period} · {m.source}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" className="v2-btn primary" onClick={props.onApply}>
          Apply
        </button>
        <button type="button" className="v2-btn" onClick={props.onSettings}>
          Settings
        </button>
        <button
          type="button"
          className="v2-btn"
          onClick={() => downloadFile(`preset-${p.id}.json`, JSON.stringify(p, null, 2))}
        >
          Export
        </button>
        {props.onDelete && (
          <button type="button" className="v2-btn" onClick={props.onDelete}>
            Delete
          </button>
        )}
      </div>
    </section>
  );
}

export function PresetsPage() {
  const { data, error, refresh } = usePoll(() => corePresets(), 3000);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [ask, setAsk] = useState<null | { kind: "apply" | "delete"; p: Any }>(null);
  const [edit, setEdit] = useState<Any | null>(null);
  const [label, setLabel] = useState("");
  const [info, setInfo] = useState("");
  const d = data as Any;
  if (!d) return <>{error ? <ErrorNote error={error} /> : <Empty>Loading…</Empty>}</>;
  const run = async (fn: () => Promise<unknown>, done: string): Promise<boolean> => {
    setErr(null);
    try {
      await fn();
      setNote(done);
      refresh();
      return true;
    } catch (e) {
      setNote(null);
      setErr(e instanceof Error ? e.message : String(e));
      return false;
    }
  };
  const cur = d.current;
  return (
    <>
      <PresetSettingsDialog
        preset={edit}
        onClose={() => setEdit(null)}
        onSaved={(msg) => {
          setNote(msg);
          refresh();
        }}
      />
      <>
        <ErrorNote error={err ?? error} />
        <Confirm
          open={!!ask}
          title={ask?.kind === "apply" ? `Apply “${ask?.p.label}”?` : `Delete “${ask?.p.label}”?`}
          danger={ask?.kind === "delete"}
          confirm={ask?.kind === "apply" ? "Apply" : "Delete"}
          body={
            ask?.kind === "apply" ? (
              <>
                Replaces the engine settings (timeframe, focus, grid, tactics, strategies, selection). The Live stage,
                sizing, paper balance, costs / fees, the auto-adjuster and loop timing (cycle / tick) stay unchanged.
                Takes effect on the next compute; a timeframe change re-syncs the market data.
                {(() => {
                  const warn = presetCoordWarnings(ask.p);
                  return warn.length ? (
                    <div style={{ marginTop: 10, color: "var(--v-down)" }}>
                      <strong>This preset turns off a positive coordination:</strong>
                      <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
                        {warn.map((w) => (
                          <li key={w}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null;
                })()}
              </>
            ) : (
              "The saved preset is removed."
            )
          }
          onCancel={() => setAsk(null)}
          onConfirm={() => {
            const a = ask!;
            setAsk(null);
            void run(
              () => presetAction({ data: { action: a.kind, id: a.p.id } }),
              a.kind === "apply" ? `Applied “${a.p.label}” — recomputing` : "Deleted",
            );
          }}
        />
        <Panel
          title="Save the current settings as a preset"
          sub={
            cur
              ? `latest simulated run: PF ${fmt.pf(cur.pf)} · ${cur.n} trades · green hours ${fmt.ratio(cur.gh)} · WR ${fmt.ratio(cur.wr)} · ${cur.stable ? "stable" : "not stable"}`
              : "available after the first compute"
          }
          right={note ? <Pill kind="ok">{note}</Pill> : undefined}
        >
          <div className="v2-grid v2-cols-3" style={{ alignItems: "end" }}>
            <label style={{ display: "grid", gap: 3 }}>
              <span className="v2-muted">Name</span>
              <input
                className="v2-input"
                value={label}
                maxLength={80}
                placeholder="e.g. Momentum 1h, session"
                onChange={(e) => setLabel(e.target.value)}
              />
            </label>
            <label style={{ display: "grid", gap: 3 }}>
              <span className="v2-muted">Info</span>
              <input
                className="v2-input"
                value={info}
                maxLength={400}
                placeholder="why / what it is for"
                onChange={(e) => setInfo(e.target.value)}
              />
            </label>
            <button
              type="button"
              className="v2-btn primary"
              disabled={!cur}
              onClick={() =>
                void run(
                  () => presetAction({ data: { action: "save", label, info } }),
                  "Saved",
                ).then((ok) => {
                  // keep what was typed when saving failed
                  if (ok) {
                    setLabel("");
                    setInfo("");
                  }
                })
              }
            >
              Save preset
            </button>
          </div>
          <p className="v2-muted" style={{ margin: "8px 0 0", fontSize: "var(--v-fs-xs)" }}>
            Successful runs (PF ≥ min, enough trades, stable) are also saved automatically as “auto”
            presets — one per distinct settings, the best run kept.
          </p>
        </Panel>
        <Panel
          title="Research presets"
          sub="from the complete simulated trading matrix: every settings variant × execution preset over three periods of real 1h BingX data, 0.2% round-trip cost; ranked by the worst period"
          right={
            <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {d.queued ? <span className="v2-muted" style={{ fontSize: "var(--v-fs-xs)" }}>{d.queued} queued</span> : null}
              <button
                type="button"
                className="v2-btn"
                onClick={() =>
                  void run(
                    () => presetAction({ data: { action: "backtestAll", days: d.maxDays ?? 30 } }),
                    `Backtests queued (${d.maxDays ?? 30} days, presets without diagrams)`,
                  )
                }
              >
                Diagrams for all ({d.maxDays ?? 30} days)
              </button>
            </span>
          }
        >
          {d.research.length ? (
            <div className="v2-grid v2-cols-2">
              {d.research.map((p: Any) => (
                <PresetCard
                  key={p.id}
                  p={p}
                  active={d.active?.id === p.id}
                  onApply={() => setAsk({ kind: "apply", p })}
                  onSettings={() => setEdit(p)}
                  backtests={d.backtests?.[p.id] ?? []}
                  job={d.job}
                  gates={d.gates}
                  maxDays={d.maxDays ?? 30}
                  onBacktest={(days) =>
                    void run(
                      () => presetAction({ data: { action: "backtest", id: p.id, days } }),
                      `Backtest started (${days}d)`,
                    )
                  }
                />
              ))}
            </div>
          ) : (
            <Empty>No research presets.</Empty>
          )}
        </Panel>
        <Panel title="Saved presets" sub={`${d.saved.length} saved · manual and automatic`}>
          {d.saved.length ? (
            <div className="v2-grid v2-cols-2">
              {d.saved.map((p: Any) => (
                <PresetCard
                  key={p.id}
                  p={p}
                  active={d.active?.id === p.id}
                  onApply={() => setAsk({ kind: "apply", p })}
                  onSettings={() => setEdit(p)}
                  onDelete={() => setAsk({ kind: "delete", p })}
                  backtests={d.backtests?.[p.id] ?? []}
                  job={d.job}
                  gates={d.gates}
                  maxDays={d.maxDays ?? 30}
                  onBacktest={(days) =>
                    void run(
                      () => presetAction({ data: { action: "backtest", id: p.id, days } }),
                      `Backtest started (${days}d)`,
                    )
                  }
                />
              ))}
            </div>
          ) : (
            <Empty>
              Nothing saved yet — save the current settings above, or wait for a successful run.
            </Empty>
          )}
        </Panel>
      </>
    </>
  );
}
