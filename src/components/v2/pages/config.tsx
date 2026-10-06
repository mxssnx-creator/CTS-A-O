import { coreConfig, coreSettings } from "../api-conn";
import { EquityChart, NCurve } from "../charts";
import {
  downloadFile,
  Empty,
  ErrorNote,
  fmt,
  Kpi,
  Panel,
  pfTone,
  Pill,
  toCsv,
  tone,
  usePoll,
} from "../ui";

type Any = any;

/** Drawdown-time spans of a cumulative curve: from each peak until the curve is back at it (or the curve ends). */
function drawdownSpans(pts: ReadonlyArray<{ t: number; v: number }>): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  // the curve starts at 0 before the first close
  let peak = 0;
  let peakT = pts[0]?.t ?? 0;
  let from: number | null = null;
  for (const p of pts) {
    if (p.v >= peak) {
      if (from !== null) out.push([from, p.t]);
      from = null;
      peak = p.v;
      peakT = p.t;
    } else if (from === null) from = peakT;
  }
  if (from !== null && pts.length) out.push([from, pts[pts.length - 1].t]);
  return out;
}

export function ConfigPage(props: { id: string }) {
  const { data, error } = usePoll(() => coreConfig({ data: { id: props.id } }), 15000, [props.id]);
  // the round-trip cost currently applied (settings.cost), not a hard-coded figure
  const { data: cs } = usePoll(() => coreSettings(), 60000);
  const cost = (cs as Any)?.settings?.cost as number | undefined;
  const d = data as Any;
  if (!d) return <>{error ? <ErrorNote error={error} /> : <Empty>Loading…</Empty>}</>;
  const r = d.row;
  const trades = (d.trades ?? []) as Any[];
  let cum = 0;
  const curve = [...trades]
    .sort((a, b) => a.exit_t - b.exit_t)
    .map((t) => ({ t: t.exit_t, v: (cum += t.r * 100) }));
  const ddSpans = drawdownSpans(curve);
  const ln = (d.lastn ?? []) as Any[];
  const isRows = ln.filter((x) => x.part === "is").sort((a, b) => a.n - b.n);
  const oosRows = ln.filter((x) => x.part === "oos").sort((a, b) => a.n - b.n);
  const latestAt = d.evals?.[0]?.at;
  const seenWin = new Set<string>();
  const evals = (d.evals ?? []).filter(
    (e: Any) => e.at === latestAt && !seenWin.has(e.win) && seenWin.add(e.win),
  );
  return (
    <>
      <ErrorNote error={error} />
      <Panel
        title={<span className="v2-mono">{props.id}</span>}
        right={
          <button
            type="button"
            className="v2-btn"
            onClick={() =>
              downloadFile(`${props.id.replace(/\|/g, "_")}.csv`, toCsv(trades), "text/csv")
            }
          >
            Trades CSV
          </button>
        }
      >
        {r ? (
          <div className="v2-grid v2-cols-6">
            <Kpi label="Orders" value={r.n} sub={`WR ${fmt.ratio(r.wr)}`} />
            <Kpi
              label="PF"
              value={fmt.pf(r.pf)}
              className={pfTone(r.pf)}
              sub={`IS ${fmt.pf(r.is_pf)}`}
            />
            <Kpi
              label="Net"
              value={fmt.pct(r.net)}
              className={tone(r.net)}
              sub={`IS ${fmt.pct(r.is_net)}`}
            />
            <Kpi label="DDT" value={fmt.h(r.ddt)} sub={`MDD ${fmt.num(r.mdd, 2)}%`} />
            <Kpi
              label="Best last-N"
              value={r.best_n ?? "–"}
              sub={r.lastn_ok ? "OOS pass" : r.lastn_ok === 0 ? "OOS fail" : "not evaluated"}
              className={r.lastn_ok ? "v2-up" : ""}
            />
            <Kpi
              label="OOS PF"
              value={fmt.pf(r.oos_pf)}
              className={pfTone(r.oos_pf)}
              sub={`n ${r.oos_n ?? "–"} · ${fmt.pct(r.oos_net)}`}
            />
          </div>
        ) : (
          <Empty>Config not in the current run (rankings refresh each compute).</Empty>
        )}
      </Panel>
      <div className="v2-grid v2-cols-2">
        <Panel
          title="Last-N gate"
          sub="PF of taken trades per N (0 = ungated) · dashed = neutral 1.0"
        >
          <NCurve
            neutral={1}
            best={r?.best_n ?? undefined}
            series={[
              { name: "in-sample", points: isRows.map((x) => ({ n: x.n, v: Math.min(x.pf, 4) })) },
              {
                name: "out-of-sample",
                points: oosRows.map((x) => ({ n: x.n, v: Math.min(x.pf, 4) })),
              },
            ]}
          />
        </Panel>
        <Panel title="Continuous independent evals" sub={latestAt ? fmt.time(latestAt) : ""} flush>
          <div className="v2-table-wrap">
            <table className="v2-table">
              <thead>
                <tr>
                  <th>window</th>
                  <th className="num">n</th>
                  <th className="num">PF</th>
                  <th className="num">net</th>
                  <th className="num">DDT</th>
                  <th className="num">WR</th>
                  <th>pass</th>
                </tr>
              </thead>
              <tbody>
                {evals.map((e: Any) => (
                  <tr key={e.win}>
                    <td>{e.win}</td>
                    <td className="num">{e.n}</td>
                    <td className={`num ${pfTone(e.pf)}`}>{fmt.pf(e.pf)}</td>
                    <td className={`num ${tone(e.net)}`}>{fmt.pct(e.net)}</td>
                    <td className="num">{fmt.h(e.ddt)}</td>
                    <td className="num">{fmt.ratio(e.wr)}</td>
                    <td>{e.pass ? <Pill kind="ok">pass</Pill> : <Pill>–</Pill>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
      <Panel title="Cumulative net" sub="shaded: time under a previous peak (DDT)">
        <EquityChart series={[{ name: "net %", points: curve }]} ddSpans={ddSpans} unit="%" />
      </Panel>
      <Panel
        title="Trade tape"
        sub={`${trades.length} closes · ${cost === undefined ? "the" : `${fmt.num(cost * 100, 2)}%`} round-trip cost included`}
        flush
      >
        <div className="v2-table-wrap">
          <table className="v2-table">
            <thead>
              <tr>
                <th>symbol</th>
                <th>side</th>
                <th>entry</th>
                <th>exit</th>
                <th className="num">entry px</th>
                <th className="num">exit px</th>
                <th className="num">net</th>
                <th>reason</th>
                <th className="num">bars</th>
              </tr>
            </thead>
            <tbody>
              {[...trades]
                .reverse()
                .slice(0, 500)
                .map((t, i) => (
                  <tr key={i}>
                    <td>{t.sym}</td>
                    <td>{t.side > 0 ? "long" : "short"}</td>
                    <td>{fmt.time(t.entry_t)}</td>
                    <td>{fmt.time(t.exit_t)}</td>
                    <td className="num">{fmt.num(t.entry, 4)}</td>
                    <td className="num">{fmt.num(t.exit, 4)}</td>
                    <td className={`num ${tone(t.r)}`}>{fmt.pct(t.r * 100)}</td>
                    <td>{t.reason}</td>
                    <td className="num">{t.bars}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
