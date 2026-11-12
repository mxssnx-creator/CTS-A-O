import { coreLiveDiff } from "./api-conn";
import { Empty, ErrorNote, fmt, Kpi, Panel, tone, usePoll } from "./ui";

type Any = any;
const pf = (x: unknown) => (typeof x === "number" && Number.isFinite(x) ? (x >= 99 ? "no loss" : x.toFixed(2)) : "–");
const pct = (x: unknown) => (typeof x === "number" && Number.isFinite(x) ? `${x.toFixed(2)} %` : "–");

/**
 * System (paper book, simulated close) against the exchange (own fills): the same relation the desk report and the standing
 * check use. Gap = exchange − system in trade %; negative = the exchange did worse. Each number carries its sample.
 */
export function LiveVsSystem(props: { hours?: number }) {
  const { data, error } = usePoll(() => coreLiveDiff({ data: { hours: props.hours ?? 48 } }), 15000);
  const d = data as Any;
  if (!d) return <>{error ? <ErrorNote error={error} /> : <Empty>Loading live vs system…</Empty>}</>;
  const rel = d.relation as Any;
  const t = rel.total as Any;
  const gap = t.gap as Any;
  const alarms = (d.check?.alarms ?? []) as Any[];
  const none = rel.counts.matched === 0;
  return (
    <>
      <ErrorNote error={error} />
      <Panel
        title="Live vs system"
        sub={`last ${d.hours} h · tag ${d.tag} · model round trip ${pct(d.cost * 100)} · gap = exchange − system (trade %), negative = the exchange did worse · ${rel.counts.matched} matched of ${rel.counts.own} own lanes (${rel.events} independent events)`}
      >
        <div className="v2-grid v2-cols-4">
          <Kpi label="Exchange PF (matched lanes)" value={pf(t.exchange?.pf)} sub={`${t.exchange?.n ?? 0} closes · net ${pct(t.exchange?.net)}`} />
          <Kpi label="System PF (same lanes)" value={pf(t.system?.pf)} sub={`${t.system?.n ?? 0} closes · net ${pct(t.system?.net)}`} />
          <Kpi label="Gap (exchange − system)" value={pct(gap.total)} className={tone(gap.total)} sub={`entry join ${pct(gap.entryJoin)} · adoption ${pct(gap.entryAdoption)} · exit ${pct(gap.exit)} · fees ${pct(gap.fees)} · undecomposed ${pct(gap.undecomposed)}`} />
          <Kpi label="Real positions (own fills)" value={rel.positions ? `${rel.positions.n} · PF ${pf(rel.positions.pf)}` : "–"} className={tone(rel.positions?.usd)} sub={rel.positions ? `${fmt.usd(rel.positions.usd)} after fees · by hand ${rel.positions.hand?.n ?? 0} · cause unproven ${rel.positions.flat?.n ?? 0} (left out of PF)` : "no ledger"} />
        </div>
        {none && <Empty>No matched lane yet: the diff needs an exchange close with a paper counterpart in this window. Unmatched: exchange-only {rel.counts.exchangeOnly}, system open {rel.counts.systemOpen}, outside coverage {rel.counts.outsideCoverage}.</Empty>}
        {alarms.length > 0 && <ErrorNote error={alarms.map((a) => `${a.kind}: ${a.msg}`).join(" · ")} />}
        {d.check && !d.check.judged && <Empty>Standing check not judged: {d.check.why}</Empty>}
      </Panel>
      {(d.hints as Any[]).length > 0 && (
        <Panel title="Where the live result is worse than the system" sub="read from the measured parts of the gap per range; hints only, nothing is changed automatically" flush>
          <div className="v2-table-wrap">
            <table className="v2-table">
              <thead><tr><th>range</th><th className="num">matched</th><th className="num">gap</th><th>main part</th><th className="num">part</th><th>what to check</th></tr></thead>
              <tbody>
                {(d.hints as Any[]).map((h) => (
                  <tr key={h.range}><td>{h.range || "Wide"}</td><td className="num">{h.matched}</td><td className={`num ${tone(h.gapTotal)}`}>{pct(h.gapTotal)}</td><td>{h.mainPart}</td><td className={`num ${tone(h.partValue)}`}>{pct(h.partValue)}</td><td>{h.action}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
      <Panel title="By range" sub="matched lanes: exchange against system, with the gap split" flush>
        <div className="v2-table-wrap">
          <table className="v2-table">
            <thead><tr><th>range</th><th className="num">matched</th><th className="num">exch. PF</th><th className="num">system PF</th><th className="num">gap</th><th className="num">entry</th><th className="num">exit</th><th className="num">fees</th><th className="num">exch.-only</th><th className="num">system open</th></tr></thead>
            <tbody>
              {(rel.byRange as Any[]).map((g) => (
                <tr key={g.key}><td>{g.key || "Wide"}</td><td className="num">{g.matched}</td><td className="num">{pf(g.exchange.pf)}</td><td className="num">{pf(g.system.pf)}</td><td className={`num ${tone(g.gap.total)}`}>{pct(g.gap.total)}</td><td className="num">{pct(g.gap.entryAdoption + g.gap.entryJoin)}</td><td className="num">{pct(g.gap.exit)}</td><td className="num">{pct(g.gap.fees)}</td><td className="num">{g.exchangeOnly}</td><td className="num">{g.systemOpen}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <Panel title="By hour" sub="settled hour of the exchange close" flush>
        <div className="v2-table-wrap">
          <table className="v2-table">
            <thead><tr><th>hour</th><th className="num">matched</th><th className="num">exch. net</th><th className="num">system net</th><th className="num">gap</th></tr></thead>
            <tbody>
              {(rel.byHour as Any[]).slice(-24).reverse().map((g) => (
                <tr key={g.key}><td>{g.key}</td><td className="num">{g.matched}</td><td className={`num ${tone(g.exchange.net)}`}>{pct(g.exchange.net)}</td><td className={`num ${tone(g.system.net)}`}>{pct(g.system.net)}</td><td className={`num ${tone(g.gap.total)}`}>{pct(g.gap.total)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <Panel title="Real position history" sub={`own fills, USD after fees · latest ${(d.history as Any[]).length}`} flush>
        <div className="v2-table-wrap">
          <table className="v2-table">
            <thead><tr><th>exit</th><th>symbol</th><th>side</th><th className="num">notional</th><th className="num">return</th><th className="num">P&L</th><th className="num">lanes</th><th className="num">system mean</th><th className="num">exchange mean</th></tr></thead>
            <tbody>
              {(d.history as Any[]).map((p) => (
                <tr key={`${p.sym}|${p.side}|${p.entryT}`}><td>{fmt.time(p.exitT)}</td><td>{p.sym}</td><td>{p.side > 0 ? "long" : "short"}</td><td className="num">{fmt.usd(p.notional)}</td><td className={`num ${tone(p.r)}`}>{fmt.frac(p.r)}</td><td className={`num ${tone(p.usd)}`}>{fmt.usd(p.usd)}</td><td className="num">{p.lanes}</td><td className="num">{pct(p.systemMeanR)}</td><td className="num">{pct(p.exchangeMeanR)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <Panel title="Worst gaps" sub="matched lanes, exchange − system" flush>
        <div className="v2-table-wrap">
          <table className="v2-table">
            <thead><tr><th>exit</th><th>symbol</th><th>reason</th><th className="num">system</th><th className="num">exchange</th><th className="num">gap</th><th className="num">entry</th><th className="num">exit</th><th className="num">fees</th></tr></thead>
            <tbody>
              {(rel.worst as Any[]).map((l) => (
                <tr key={l.id}><td>{fmt.time(l.exitT)}</td><td>{l.sym}</td><td>{l.reason}</td><td className="num">{pct(l.system)}</td><td className="num">{pct(l.exchange)}</td><td className={`num ${tone(l.gap)}`}>{pct(l.gap)}</td><td className="num">{l.parts ? pct((l.parts.entryAdoption ?? 0) + l.parts.entryJoin) : "–"}</td><td className="num">{l.parts ? pct(l.parts.exit) : "–"}</td><td className="num">{l.parts ? pct(l.parts.fees) : "–"}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
