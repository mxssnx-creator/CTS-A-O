import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { coreOverview, corePresets } from "../api-conn";
import { PresetSettingsDialog } from "../preset-settings";
import { ExecutionSummary } from "../execution-summary";
import { hasUnitReturnBasis, unitStatsPfText } from "../accounting";
import { PromotionEvidence } from "../promotion-evidence";
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

const CONN_META: Record<string, { net: string; tag: string }> = {
  "bingx-x01": { net: "mainnet", tag: "CTSBX1_" },
  "bingx-vst-01": { net: "testnet", tag: "CTSBV1_" },
  "bingx-vst-02": { net: "testnet", tag: "CTSBV2_" },
};

/** Which account the Live stage is aimed at. Id and net stay visible; the rest opens on Details. */
function ConnStrip(props: { d: Any }) {
  const [open, setOpen] = useState(false);
  const live = props.d.settings?.live ?? {};
  const id = String(live.connId ?? "–");
  const meta = CONN_META[id] ?? { net: "–", tag: "–" };
  const st = props.d.live ?? {};
  const sizing = props.d.settings?.sizing;
  const sizeBase = sizing?.mode === "equityPct"
    ? `${fmt.num(sizing.pct * 100, 2)}% of account balance`
    : sizing?.mode === "minQty" && live.mode !== "entries" ? "exchange minimum lot" : `${fmt.usd(live.notionalUsd)} configured notional`;
  const ls = liveState(!!live.enabled, st);
  const held = (st.control?.held ?? []) as Array<{ key: string; qty: number }>;
  const heldTxt = held.length
    ? held.map((h) => `${h.key} × ${h.qty}`).join(" · ")
    : "flat";
  return (
    <section className="v2-panel">
      <header className={`v2-panel-h${open ? "" : " no-rule"}`}>
        <div>
          <h2>Connection</h2>
          <p className="v2-conn-idnet">
            <span>
              connection <strong>{id}</strong>
            </span>
            <span>
              net <strong>{meta.net}</strong>
            </span>
          </p>
        </div>
        <div className="v2-right">
          <Pill kind={meta.net === "mainnet" ? "bad" : "acc"}>{meta.net}</Pill>
          <Pill kind={ls.on ? (ls.blocked ? "bad" : "ok") : undefined}>
            {ls.on ? "live on" : "live off"}
          </Pill>
          <button type="button" className="v2-btn" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
            {open ? "Hide" : "Details"}
          </button>
        </div>
      </header>
      {open && (
        <div className="v2-panel-b">
          <div className="v2-grid v2-cols-4">
            <div className="v2-lines">
              <Line k="connection" v={id} />
              <Line k="network" v={meta.net} />
              <Line k="order tag" v={meta.tag} />
            </div>
            <div className="v2-lines">
              <Line k="mode" v={live.mode ?? "–"} />
              <Line k="margin" v={live.marginMode ?? "–"} />
              <Line k="positions" v={live.positionMode ?? "–"} />
            </div>
            <div className="v2-lines">
              <Line
                k="size"
                v={`${sizeBase}${live.mode === "entries" ? " per signal · no Control ratio" : ` × lane volume × ${live.ratio ?? 1}`} · no fixed USD ceiling${live.maxPositionX ? ` · position ≤ ${live.maxPositionX}× balance` : ""}${live.maxExposureX ? ` · gross ≤ ${live.maxExposureX}× balance` : ""}`}
              />
              <Line
                k="max positions"
                v={live.maxPositions === 0 ? "no limit" : (live.maxPositions ?? "–")}
              />
              <Line k="readiness" v={live.requireReady === false ? "off" : "on"} />
            </div>
            <div className="v2-lines">
              <Line k="held" v={held.length ? `${held.length}` : "0"} />
              <Line k="placed / closed" v={`${st.placed ?? 0} / ${st.closed ?? 0}`} />
              <Line k="conn #" v={st.control?.connHash ?? "–"} />
            </div>
          </div>
          <p className="v2-muted" style={{ margin: "8px 0 0", fontSize: "var(--v-fs-sm)" }}>
            {st.reason ? `${st.reason} · ` : ""}
            {heldTxt}
          </p>
        </div>
      )}
    </section>
  );
}

export function OverviewPage() {
  const { data, error } = usePoll(() => coreOverview(), 4000);
  const d = data as Any;
  if (!d) return <>{error ? <ErrorNote error={error} /> : <Empty>Starting the engine…</Empty>}</>;
  const sim = d.sim;
  const s = sim?.stats;
  const knownReturns = hasUnitReturnBasis(s);
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
      <ConnStrip d={d} />
      <PrehistoricPanel
        status={d.status}
        minPf={minPf}
        maxDdtH={d.settings.gates.maxDdtH}
        baseSetsMinPf={d.settings.gates.baseSetsMinPf}
      />
      <ExecutionSummary account={d.live?.account} />
      <PromotionEvidence status={d.status?.livePromotion} />
      <div className="v2-grid v2-cols-6">
        <Kpi
          label="Model return PF"
          value={s ? unitStatsPfText(s) : "–"}
          className={pfTone(s?.pf, minPf)}
          sub={`post-Base accepted records before allocation, including endpoint marks · min ${minPf} · separate from funded execution`}
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
          value={knownReturns ? `${fmt.num(s?.greenHours)}/${fmt.num(s?.hours)}` : "–"}
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
          sub={`balance ${fmt.usd(d.paper.balance)} · equity ${fmt.usd(d.paper.accountEquity)} · ${d.paper.positions} open orders · ${realSel} Real${sigSel || d.status?.signals?.enabled ? ` · ${sigSel} signal` : ""} configs`}
        />
      </div>
      {s && !knownReturns && <div className="v2-muted">Unit-return evidence is unavailable for {fmt.num(s.unknownReturns)} modeled closes. All {fmt.num(s.n)} outcomes remain counted; return charts are unavailable for this sample.</div>}

      <div className="v2-grid v2-cols-3">
        <Panel title="Health arcs" sub="each ring against its own target">
          {knownReturns ? <MultiArcGauge
            size={190}
            center={unitStatsPfText(s)}
            centerSub="model return PF"
            rings={[
              { label: `Return PF vs 2.0`, value: (s?.pf ?? 0) / 2, display: unitStatsPfText(s) },
              { label: "Green hours", value: s?.gh ?? 0, display: fmt.ratio(s?.gh) },
              { label: "Win rate", value: s?.wr ?? 0, display: fmt.ratio(s?.wr) },
              {
                label: d.status?.signals?.enabled && d.status.signals.representativeBaseGate === false ? "Engine Base" : "Base passing",
                value: baseEval ? basePassed / baseEval : 0,
                display: `${basePassed}/${baseEval}`,
              },
              {
                label: "DDT headroom",
                value: s ? Math.max(0, 1 - s.ddt / Math.max(1, d.settings.gates.maxDdtH)) : 0,
                display: s ? fmt.h(d.settings.gates.maxDdtH - s.ddt) : "–",
              },
            ]}
          /> : <Empty>{s ? "Unit-return basis unavailable" : "No simulated run yet"}</Empty>}
        </Panel>
        <Panel title="Hours" sub="net per hour, outward = profit">
          {knownReturns && hours.length ? (
            <RadialHours hours={hours} size={230} />
          ) : (
            <Empty>{knownReturns ? "No simulated hours yet" : "Unit-return history unavailable"}</Empty>
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
          {knownReturns ? <EquityChart series={[{ name: "net %", points: curve }]} unit="%" /> : <Empty>Unit-return history unavailable</Empty>}
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
          {knownReturns ? <SignedBars
            unit="%"
            data={hours.map((h) => ({
              k: fmt.hour(h.t),
              v: h.net,
              tip: `${fmt.hour(h.t)} · ${h.n} closes · return PF ${unitStatsPfText(h)} · ${fmt.pct(h.net)}`,
            }))}
          /> : <Empty>Unit-return history unavailable</Empty>}
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
                  ? ` · ${sigSel} selected signal configs (${fmt.num(d.status?.signals?.configs)} requested protection configurations)`
                  : ""}
              </p>
            </div>
            <div className="v2-stage">
              <div className="t">Live</div>
              <div className="n">{ls.on ? "on" : "off"}</div>
              <p>
                {d.settings.live.connId}
                {d.settings.live.connId === "bingx-x01" ? " · mainnet" : " · testnet"}
                {!ls.on
                  ? " · disabled in settings"
                  : ls.blocked
                    ? ` · blocked: ${ls.blocked}`
                    : ` · ${d.live?.reason ?? "armed"}`}
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
                    <td className={`num ${pfTone(r.pf, minPf)}`}>{unitStatsPfText(r)}</td>
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
