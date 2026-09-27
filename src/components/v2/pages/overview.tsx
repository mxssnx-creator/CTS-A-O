import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { coreOverview, corePresets } from "@/core/api";
import { PresetSettingsDialog } from "../preset-settings";
import { PrehistoricPanel } from "../prehistoric";
import { ArcShare, EquityChart, MultiArcGauge, RadialHours, SignedBars } from "../charts";
import {
  Empty,
  ErrorNote,
  fmt,
  Kpi,
  Line,
  liveState,
  Panel,
  pfTone,
  Pill,
  tone,
  usePoll,
} from "../ui";

type Any = any;

/** Top bar: the applied preset and a button showing its settings (or the engine's when none is applied). */
function PresetBar() {
  const { data } = usePoll(() => corePresets(), 10000);
  const [open, setOpen] = useState<Any | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const d = data as Any;
  const all = d ? [...(d.research ?? []), ...(d.saved ?? [])] : [];
  const active = d?.active ? all.find((p: Any) => p.id === d.active.id) : null;
  return (
    <div
      className="v2-panel"
      style={{
        padding: "8px 12px",
        display: "flex",
        gap: 10,
        alignItems: "center",
        flexWrap: "wrap",
      }}
    >
      <span className="v2-muted" style={{ fontSize: "var(--v-fs-sm)" }}>
        Preset
      </span>
      <strong style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
        {active
          ? active.label
          : d?.active
            ? `${d.active.label} (removed)`
            : "none applied — engine settings"}
      </strong>
      {note && <Pill kind="ok">{note}</Pill>}
      <span style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
        <button
          type="button"
          className="v2-btn primary"
          disabled={!d}
          onClick={() =>
            setOpen(
              active ?? {
                id: "engine",
                kind: "engine",
                label: "Current engine settings",
                settings: {},
                wf: {},
              },
            )
          }
        >
          Preset settings
        </button>
        <Link to="/v2/presets" className="v2-btn">
          All presets
        </Link>
      </span>
      <PresetSettingsDialog
        preset={open}
        readOnly={open?.kind === "engine"}
        onClose={() => setOpen(null)}
        onSaved={setNote}
      />
    </div>
  );
}

export function OverviewPage() {
  const { data, error } = usePoll(() => coreOverview(), 4000);
  const d = data as Any;
  if (!d) return <>{error ? <ErrorNote error={error} /> : <Empty>Starting the engine…</Empty>}</>;
  const sim = d.sim;
  const s = sim?.stats;
  const minPf = d.settings.gates.minPf;
  const hours = (sim?.hourly ?? []) as Array<{ t: number; net: number; n: number; pf: number }>;
  let cum = 0;
  const curve = hours.map((h) => ({ t: h.t + 3_600_000, v: (cum += h.net) }));
  const simDays = sim ? (sim.endT - sim.startT) / 86_400_000 : 1;
  const c = d.counts ?? {};
  const selected = (d.paper.selected ?? []) as string[];
  // signal configs carry a "sig-" indication (cfg = bot|ind|…); the rest are the engine's Real configs
  const sigSel = selected.filter((id) => (id.split("|")[1] ?? "").includes("sig-")).length;
  const realSel = selected.length - sigSel;
  const baseEval = Number(d.status?.baseEvaluated ?? 0);
  const basePassed = Number(d.status?.basePassed ?? 0);
  const ls = liveState(d.settings.live.enabled, d.live);
  const byKind = Object.entries((sim?.byKind ?? {}) as Record<string, { n: number }>).map(
    ([label, v]) => ({ label, value: v.n }),
  );
  return (
    <>
      <PresetBar />
      <ErrorNote error={error} />
      <PrehistoricPanel status={d.status} minPf={minPf} maxDdtH={d.settings.gates.maxDdtH} />
      <div className="v2-grid v2-cols-6">
        <Kpi
          label="Sim PF"
          value={fmt.pf(s?.pf)}
          className={pfTone(s?.pf, minPf)}
          sub={`min ${minPf} · neutral 1.00`}
        />
        <Kpi
          label="Sim net (Σ trade %)"
          value={fmt.pct(s?.net)}
          className={tone(s?.net)}
          sub={`${d.wf.simH}h run · ${d.wf.preH}h pre-calc`}
        />
        <Kpi
          label="Positions / Orders"
          value={`${fmt.num(d.sim?.positions)} / ${fmt.num(s?.n)}`}
          sub={`${fmt.num((s?.n ?? 0) / Math.max(simDays, 0.01))} orders/day · open ${d.paper.book?.positions ?? 0} / ${d.paper.book?.orders ?? 0}`}
        />
        <Kpi
          label="Green hours"
          value={s ? `${s.greenHours}/${s.hours}` : "–"}
          sub={fmt.ratio(s?.gh)}
          className={s && s.gh >= 0.6 ? "v2-up" : ""}
        />
        <Kpi
          label="DDT · MDD"
          value={fmt.h(s?.ddt)}
          sub={`MDD ${fmt.num(s?.mdd, 2)} Σ trade % · worst h ${fmt.pct(s?.worstHour)}`}
        />
        <Kpi
          label="Paper P&L"
          value={fmt.usd(d.paper.equity)}
          className={tone(d.paper.equity)}
          sub={`balance ${fmt.usd(d.paper.balance)} · ${d.paper.positions} open orders · ${realSel} Real${sigSel || d.status?.signals?.enabled ? ` · ${sigSel} signal` : ""} configs`}
        />
      </div>

      <div className="v2-grid v2-cols-3">
        <Panel title="Health arcs" sub="each ring against its own target">
          <MultiArcGauge
            size={190}
            center={fmt.pf(s?.pf)}
            centerSub="sim PF"
            rings={[
              { label: `PF vs 2.0`, value: (s?.pf ?? 0) / 2, display: fmt.pf(s?.pf) },
              { label: "Green hours", value: s?.gh ?? 0, display: fmt.ratio(s?.gh) },
              { label: "Win rate", value: s?.wr ?? 0, display: fmt.ratio(s?.wr) },
              {
                label: "Base passing",
                value: baseEval ? basePassed / baseEval : 0,
                display: `${basePassed}/${baseEval}`,
              },
              {
                label: "DDT headroom",
                value: s ? Math.max(0, 1 - s.ddt / Math.max(1, d.settings.gates.maxDdtH)) : 0,
                display: fmt.h(s?.ddt),
              },
            ]}
          />
        </Panel>
        <Panel title="Hours" sub="net per hour, outward = profit">
          {hours.length ? (
            <RadialHours hours={hours} size={230} />
          ) : (
            <Empty>No simulated hours yet</Empty>
          )}
        </Panel>
        <Panel title="Orders by sub-strategy" sub="executed in the simulated run">
          {byKind.length ? (
            <ArcShare parts={byKind} center={String(s?.n ?? 0)} />
          ) : (
            <Empty>–</Empty>
          )}
          <div className="v2-lines" style={{ marginTop: 10 }}>
            {Object.entries((sim?.skips ?? {}) as Record<string, number>).map(([k, v]) => (
              <Line key={k} k={`skipped · ${k}`} v={fmt.num(v)} />
            ))}
          </div>
        </Panel>
      </div>

      <div className="v2-grid v2-cols-2">
        <Panel
          title="Cumulative net (simulated run, Σ trade %)"
          sub={
            sim
              ? `${fmt.hour(sim.startT)} → ${fmt.hour(sim.endT)} UTC · ${sim.stable ? "stable" : "not stable"}`
              : ""
          }
          right={
            sim && (
              <Pill kind={sim.stable ? "ok" : "bad"}>{sim.stable ? "stable" : "unstable"}</Pill>
            )
          }
        >
          <EquityChart series={[{ name: "net %", points: curve }]} unit="%" />
        </Panel>
        <Panel
          title="Net per hour"
          sub="Σ trade %"
          right={
            <Link to="/v2/hourly" className="v2-btn">
              Hour by hour →
            </Link>
          }
        >
          <SignedBars
            unit="%"
            data={hours.map((h) => ({
              k: fmt.hour(h.t).slice(6),
              v: h.net,
              tip: `${fmt.hour(h.t)} · ${h.n} closes · PF ${fmt.pf(h.pf)} · ${fmt.pct(h.net)}`,
            }))}
          />
        </Panel>
      </div>

      <div className="v2-grid v2-cols-2">
        <Panel
          title="Stages"
          sub="Base → Main → Real → Live"
          right={
            <Link to="/v2/stages" className="v2-btn">
              Open
            </Link>
          }
        >
          <div className="v2-funnel">
            <div className="v2-stage">
              <div className="t">Base</div>
              <div className="n">{fmt.num(c.base)}</div>
              <p>combos computed · {d.wf.tapes} strategy tapes</p>
            </div>
            <div className="v2-stage">
              <div className="t">Main</div>
              <div className="n">{fmt.num(c.main)}</div>
              <p>refined · {c.evaluated ?? 0} evaluated</p>
            </div>
            <div className="v2-stage">
              <div className="t">Real</div>
              <div className="n">{realSel}</div>
              <p>
                {d.paper.eligible} eligible this hour
                {sigSel || d.status?.signals?.enabled
                  ? ` · ${sigSel} signal configs (${d.status?.signals?.configs ?? 0} built)`
                  : ""}
              </p>
            </div>
            <div className="v2-stage">
              <div className="t">Live</div>
              <div className="n">{ls.on ? "on" : "off"}</div>
              <p>
                {!ls.on
                  ? "disabled in settings"
                  : ls.blocked
                    ? `blocked: ${ls.blocked}`
                    : (d.live?.reason ?? "armed")}
              </p>
            </div>
          </div>
        </Panel>
        <Panel title="Top configs in the run" sub="by net">
          <div className="v2-table-wrap">
            <table className="v2-table">
              <thead>
                <tr>
                  <th>config</th>
                  <th className="num">n</th>
                  <th className="num">PF</th>
                  <th className="num">net</th>
                </tr>
              </thead>
              <tbody>
                {(sim?.byConfig ?? []).map((r: Any) => (
                  <tr key={r.id}>
                    <td>
                      <Link to="/v2/config/$id" params={{ id: r.id }} className="v2-mono">
                        {r.id}
                      </Link>
                    </td>
                    <td className="num">{r.n}</td>
                    <td className={`num ${pfTone(r.pf, minPf)}`}>{fmt.pf(r.pf)}</td>
                    <td className={`num ${tone(r.net)}`}>{fmt.pct(r.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </>
  );
}
