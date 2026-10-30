import { liveGroupOf } from "@/core/live-validation";
import { promotionWindowPfText } from "./progression";
import { Empty, fmt, Kpi, Panel, Pill } from "./ui";

type Any = any;
const STATES: Record<string, string> = {
  qualified: "Proof gates passed",
  "model-insufficient": "Model sample insufficient",
  "execution-insufficient": "Owned sample insufficient",
  "real-insufficient": "Real sample insufficient",
  unknown: "Evidence unknown",
  "model-failed": "Model PF failed",
  "execution-failed": "Owned execution PF failed",
  "real-failed": "Real return PF failed",
  ineligible: "Ineligible",
};
const sourceLabel = (source?: string) => source === "owned-paper" ? "Owned paper" : source === "verified-venue" ? "Verified venue" : "Source unavailable";

/** These are strict live-entry proof windows, separate from paper deactivation and raw calculation coverage. */
export function PromotionEvidence({ status }: { status?: Any }) {
  const known = status?.evidenceBasis === "settled-post-base-and-owned-execution";
  const rows = known && Array.isArray(status.lanes) ? status.lanes : [];
  return <Panel title="Live promotion proof" sub="Each full config × symbol × direction needs post-Base accepted returns, independently owned returns and its own Real net-return window. Endpoint marks and raw unfiltered candidate PF do not qualify a lane.">
    {!known ? <Empty>No strict promotion proof has been reported. Base passes, computed tapes and a positive candidate PF do not establish owned execution performance.</Empty> : <>
      <div className="v2-grid v2-cols-6">
        <Kpi label="Proof gates passed" value={fmt.num(status.qualified)} />
        <Kpi label="Insufficient sample" value={fmt.num(status.insufficient)} />
        <Kpi label="Unknown evidence" value={fmt.num(status.unknown)} />
        <Kpi label="Failed proof" value={fmt.num(status.failed)} />
        <Kpi label="Ineligible" value={fmt.num(status.ineligible)} />
        <Kpi label="Verified venue" value={fmt.num(status.verifiedVenue)} />
      </div>
      <p className="v2-muted" style={{ fontSize: "var(--v-fs-xs)" }}>Reported {fmt.ago(status.at)} · totals cover all evaluated identities; at most {fmt.num(rows.length)} detail rows shown. Verified venue P&L includes measured fees and funding. Paper P&L uses the recorded adoption price, owned allocation and modeled costs; missing or unsupported evidence stays unknown. Nominal lane attribution is unverified and cannot establish live profitability. Passing these proof gates does not waive the remaining entry, risk or readiness gates.</p>
      {rows.length ? <div className="v2-table-wrap"><table className="v2-table">
        <thead><tr><th>Full config · group</th><th>Symbol · direction</th><th>Post-Base accepted PF (before allocation)</th><th>Owned execution evidence</th><th>Real return PF</th><th>Minimums</th><th>Proof status</th></tr></thead>
        <tbody>{rows.map((r: Any) => <tr key={JSON.stringify([r.cfg, r.sym, r.side])}>
          <td className="v2-mono">{r.cfg}<div className="v2-muted">{liveGroupOf(r.cfg)}</div></td>
          <td>{r.sym} · {r.side > 0 ? "long" : "short"}</td>
          <td><b>{promotionWindowPfText(r.model)}</b> · {fmt.num(r.model?.n)} closes<div className="v2-muted">{r.modelRequired === false ? "Diagnostic only · " : ""}{fmt.time(r.model?.fromT)} → {fmt.time(r.model?.toT)}</div></td>
          <td>{sourceLabel(r.execution?.source)} · <b>{promotionWindowPfText(r.execution)}</b> · {fmt.num(r.execution?.n)} closes<div className="v2-muted">{fmt.time(r.execution?.fromT)} → {fmt.time(r.execution?.toT)}</div></td>
          <td>{sourceLabel(r.real?.source)} · <b>{promotionWindowPfText(r.real)}</b> · {fmt.num(r.real?.n)} closes<div className="v2-muted">{fmt.time(r.real?.fromT)} → {fmt.time(r.real?.toT)} · dollar-weighted PF {promotionWindowPfText(r.realCash)}</div></td>
          <td>PF ≥ {fmt.pf(r.minPf)} · {fmt.num(r.minN)} model / owned · {fmt.num(r.realLastN)} Real closes</td>
          <td><Pill kind={r.ok ? "ok" : r.state === "unknown" ? undefined : "bad"}>{STATES[r.state] ?? r.state ?? "Unavailable"}</Pill></td>
        </tr>)}</tbody>
      </table></div> : <Empty>No eligible identity has a proof window yet.</Empty>}
    </>}
  </Panel>;
}
