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
  </div>;
}
