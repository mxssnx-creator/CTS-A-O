import type { StrategyCoverage } from "@/core/server/strategy-coverage";
import { fmt } from "./ui";

const labels: Record<string, string> = {
  normal: "Normal",
  trailing: "Trailing",
  "trailing-only": "Trailing only",
  dca: "DCA",
  "dca-active": "DCA Active",
  axis: "Axis",
  exit: "Historic Exit",
};
const order = Object.keys(labels);

/** Last completed cohort only: a tape is neither a validated seat nor a funded or exchange order. */
export function StrategyCoverageTable({ coverage }: { coverage?: StrategyCoverage | null }) {
  if (!coverage) return <div className="v2-muted">Strategy coverage is unavailable until a compute completes.</div>;
  const kinds = [...new Set([...order, ...Object.keys(coverage.byKind)])];
  return <div className="v2-table-wrap">
    <table className="v2-table">
      <caption style={{ textAlign: "left", fontWeight: 700, padding: "4px 0" }}>
        Last completed research cohort · {fmt.num(coverage.total)} tapes · simulation through {fmt.time(coverage.through)} UTC · published {fmt.time(coverage.completedAt)} UTC
      </caption>
      <thead><tr><th scope="col">Strategy</th><th scope="col">Engine tapes</th><th scope="col">Signal tapes</th><th scope="col">Held-only</th><th scope="col">Carried</th></tr></thead>
      <tbody>{kinds.map((kind) => {
        const row = coverage.byKind[kind];
        return <tr key={kind}><th scope="row">{labels[kind] ?? kind}</th><td>{fmt.num(row?.engine ?? 0)}</td>
          <td>{fmt.num(row?.signals ?? 0)}</td><td>{fmt.num(row?.heldOnly ?? 0)}</td><td>{fmt.num(row?.carried ?? 0)}</td></tr>;
      })}</tbody>
    </table>
    <p className="v2-muted">Counts include held-only and carried tapes; carried tapes use an earlier compute. A tape is not an admitted, funded or venue order. Block and Relate are execution adjustments, not separate tape types. The current progress stage may be building the next cohort.</p>
    <h3>Last-N sample coverage</h3>
    {coverage.lastNSamples ? <>
      <p className="v2-muted">Exact config × symbol × direction candidate histories before {fmt.time(coverage.lastNSamples.at)} UTC. Empty and losing contexts remain counted. These counts do not establish PF validation or processed Main/Real admission. Held-only configs are excluded; carried evidence is unavailable.</p>
      <table className="v2-table"><thead><tr><th>Type / range</th><th>Window</th><th>N</th><th>Enough samples</th><th>Short</th><th>Unknown</th></tr></thead>
        <tbody>{coverage.lastNSamples.rows.map((r) => <tr key={JSON.stringify([r.kind,r.range,r.window,r.n])}>
          <td>{labels[r.kind] ?? r.kind} / {r.range}</td><td>{r.window}</td><td>{r.n || "off"}</td>
          <td>{r.n <= 0 ? "Disabled" : r.pct === null ? "Unavailable" : `${r.usable}/${r.contexts - r.disabled} (${r.pct.toFixed(1)}%)`}</td>
          <td>{r.insufficient}</td><td>{r.unknown}</td>
        </tr>)}</tbody>
      </table>
    </> : <p className="v2-muted">Sample coverage is unavailable until the next compute completes.</p>}
  </div>;
}
