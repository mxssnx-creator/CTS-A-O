import { useState } from "react";
import { coreListing } from "./api-conn";
import { signalTypeLabel } from "./signal-units";
import { basePairAdmission } from "./base-counts";
import { Empty, ErrorNote, fmt, Kpi, Panel, Pill, useDebounced, usePoll } from "./ui";

type Any = any;
const PAGE = 50;
const RANGES = [["", "All ranges"], ["Wide", "Wide"], ["mc", "Micro"], ["mn", "Minimal"], ["mp", "Minimal plus"], ["sh", "Short"], ["gn", "General"], ["lg", "Long"]] as const;
const rangeLabel = (tag: string) => tag === "" ? "Wide" : RANGES.find(([key]) => key === tag)?.[1] ?? tag;
const stateNote: Record<string, string> = {
  pending: "Waiting for the exact historical Base sweep. No count is inferred from representative pairs.",
  running: "Historical Base cells are being evaluated. Totals cover only the completed work reported below.",
  partial: "The sweep is partial. Totals cover only the completed work reported below.",
  complete: "The historical sweep is complete for this frozen settings and history sample.",
  cancelled: "The sweep was cancelled. Shown counts belong to its recorded settings and history sample.",
  error: "The historical sweep did not finish. Shown totals cover completed cells only.",
  disabled: "The exact Tactic configuration counter is disabled for the current settings.",
};
const reasonNote: Record<string, string> = {
  disabled: "Tactic indication type is off.",
  typeDisabled: "Tactic indication type is off.",
  strategiesDisabled: "All strategy types are disabled for these settings.",
  focusExcluded: "Base focus and pinned pairs include no Tactic candidates. Use Include Tactic in Base focus in Settings to add them explicitly.",
  noPassedBase: "No Tactic pair passed Base qualification on this history sample.",
  noBaseHistory: "No Tactic Base history was available for this sample.",
  noConfigs: "No enabled configured Tactic cells are available for this sample.",
  representativesNotAdmitted: "No representative Tactic pair qualified for later stages. These full configuration counts remain a separate Base measurement and do not admit execution.",
  settingsChanged: "Settings changed; these counts have not been recomputed for the new settings.",
  stopped: "The engine stopped before this measurement finished.",
  restartRequired: "Stored counts were restored after a restart; a fresh measurement is required.",
  memoryPressure: "The memory guard stopped the sweep; unevaluated cells remain unknown.",
  workersUnavailable: "Historical count workers are unavailable; no evaluation result is inferred.",
  newBaseCut: "A new Base history cut superseded this measurement; a new sweep is required.",
  newGeneration: "A newer engine calculation superseded this measurement.",
};

/** Exact configured cells are a separate historical measurement from the engine's representative-pair counters. */
export function BaseConfigCounts() {
  const [q, setQ] = useState("");
  const [range, setRange] = useState("");
  const [page, setPage] = useState(0);
  const query = useDebounced(q, 250);
  const { data, error } = usePoll(
    () => coreListing({ data: { kind: "baseConfigs", q: query || undefined, range: range || undefined, offset: page * PAGE, limit: PAGE } }),
    4000,
    [query, range, page],
  );
  const d = data as Any;
  const summary = d?.summary;
  const rows = (d?.rows ?? []) as Any[];
  const state = summary?.state;
  const pages = d?.total ? Math.ceil(d.total / PAGE) : 0;
  return (
    <Panel title="Tactic · exact Base configuration counts" sub="Historical configured TP / SL / trailing / hold cells for all focused Tactic candidate pairs, per full indication, range and strategy type. Return PF floor 1.10 after costs; independent from representative-pair and Main validation counters."
      right={<Pill kind={state === "complete" ? "ok" : state === "error" || state === "cancelled" ? "bad" : "acc"}>{state ?? "awaiting status"}</Pill>}>
      <ErrorNote error={error ?? summary?.error} />
      <p className="v2-muted">{stateNote[state] ?? "Waiting for an exact Base counter report."} {summary?.reason ? reasonNote[summary.reason] ?? String(summary.reason) : ""}</p>
      <div className="v2-grid v2-cols-4">
        <Kpi label="Configured cells counted" value={fmt.num(summary?.configured)} sub={`${fmt.num(summary?.plannedConfigured)} planned · ${fmt.num(summary?.donePairs)} / ${fmt.num(summary?.totalPairs)} full pairs processed`} />
        <Kpi label="Evaluated cells" value={fmt.num(summary?.evaluated)} sub="actual historical cell evaluations" />
        <Kpi label="Return PF ≥ 1.10" value={fmt.num(summary?.pfPassed)} sub="PF-only passes; every cell uses its own net returns" />
        <Kpi label="All Base gates passed" value={fmt.num(summary?.passed)} sub="also meets the configured sample and Base gates" />
      </div>
      <p className="v2-muted" style={{ fontSize: "var(--v-fs-xs)" }}>Representative pairs admitted to later stages: {fmt.num(summary?.admittedPairs)} / {fmt.num(summary?.totalPairs)} candidates. A cell passing all Base gates does not override its parent pair's admission or later validation.</p>
      <p className="v2-muted" style={{ fontSize: "var(--v-fs-xs)" }}>
        Base history {fmt.time(summary?.fromT)} → {fmt.time(summary?.cutT)} UTC · round-trip cost {fmt.frac(summary?.cost)} · settings snapshot {fmt.time(summary?.settingsAt)} · updated {fmt.ago(summary?.updatedAt)}
        {summary?.totalChunks !== undefined ? ` · chunks ${fmt.num(summary.doneChunks)} / ${fmt.num(summary.totalChunks)}` : ""}
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
        <input className="v2-input" aria-label="Filter exact Base configurations" placeholder="filter: indication, lane, type…" maxLength={80} value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} style={{ maxWidth: 300 }} />
        <select className="v2-select" aria-label="Exact Base range" value={range} onChange={(e) => { setRange(e.target.value); setPage(0); }}>
          {RANGES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>
      {rows.length ? <div className="v2-table-wrap"><table className="v2-table">
        <thead><tr><th>Bot · full indication · lane</th><th>Representative admitted</th><th>Range</th><th>Type</th><th className="num">Configured</th><th className="num">Evaluated</th><th className="num">PF ≥ 1.10</th><th className="num">All gates</th><th className="num">Effective min PF</th><th className="num">Evaluation closes</th><th>Not evaluated · actual reasons</th><th>Sample UTC</th></tr></thead>
        <tbody>{rows.map((row) => <tr key={JSON.stringify([row.bot, row.ind, row.tag, row.kind])}>
          <td className="v2-mono">{row.bot} · {row.ind}</td><td>{basePairAdmission(row, summary) === null ? "Unknown" : basePairAdmission(row, summary) ? "Yes" : "No"}</td><td>{rangeLabel(row.tag)}</td><td>{signalTypeLabel(row.kind)}</td>
          <td className="num">{fmt.num(row.configured)}</td><td className="num">{fmt.num(row.evaluated)}</td><td className="num">{fmt.num(row.pfPassed)}</td><td className="num">{fmt.num(row.passed)}</td><td className="num">{fmt.pf(row.minPf)}</td><td className="num">{fmt.num(row.closes)}</td>
          <td>{Object.entries(row.notEvaluated ?? {}).map(([reason, count]) => `${reason}: ${fmt.num(count)}`).join(" · ") || "–"}</td>
          <td>{fmt.time(row.fromT)} → {fmt.time(row.cutT)}</td>
        </tr>)}</tbody>
      </table></div> : <Empty>{(query || range) && summary?.configured > 0 ? `No exact configuration rows match these filters.${state === "complete" ? "" : " The sweep is not complete yet."}` : summary?.reason ? reasonNote[summary.reason] ?? String(summary.reason) : state === "complete" ? "No exact configuration rows match these filters." : "No completed configuration rows reported yet."}</Empty>}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
        <button type="button" className="v2-btn" disabled={page === 0} onClick={() => setPage((value) => Math.max(0, value - 1))}>Previous</button>
        <span>{fmt.num(d?.total)} rows · page {pages ? page + 1 : 0} of {pages}</span>
        <button type="button" className="v2-btn" disabled={!pages || page + 1 >= pages} onClick={() => setPage((value) => value + 1)}>Next</button>
      </div>
    </Panel>
  );
}
