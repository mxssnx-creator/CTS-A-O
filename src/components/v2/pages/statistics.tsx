// Statistics: the complete picture of the selected connection's book — balance, equity, margin and the open book
// over time, every type and sub-type (Normal, Trailing, Axis, DCA / DCA Active, Block / Block Active, Signals) with
// and without each sub-strategy, ranges, lanes, indication kinds, bots, symbols, exit reasons, hours, weekdays and
// every config with its parameters and dates.
import { Fragment, useMemo, useState } from "react";
import { coreStatistics } from "../api-conn";
import { ArcShare, HeatGrid, MultiChart, SignedBars } from "../charts";
import {
  downloadFile,
  Empty,
  ErrorNote,
  fmt,
  Kpi,
  Panel,
  pfTone,
  Pill,
  Seg,
  toCsv,
  tone,
  usePoll,
} from "../ui";

type Any = any;
type Row = {
  key: string;
  n: number;
  wins: number;
  losses: number;
  wr: number;
  pf: number;
  net: number;
  usd: number;
  avg: number;
  ddt: number;
  gh: number;
  positions: number;
  avgHoldMin: number;
  firstT: number;
  lastT: number;
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const pct = (x: number) => `${(x * 100).toFixed(0)}%`;

function GroupTable(props: { rows: Row[]; label: string; empty?: string; dates?: boolean }) {
  if (!props.rows.length) return <Empty>{props.empty ?? "No closes"}</Empty>;
  return (
    <div className="v2-table-wrap">
      <table className="v2-table">
        <thead>
          <tr>
            <th>{props.label}</th>
            <th className="num">orders</th>
            <th className="num">positions</th>
            <th className="num">wins / losses</th>
            <th className="num">WR</th>
            <th className="num">PF</th>
            <th className="num">net % unit</th>
            <th className="num">net $</th>
            <th className="num">DDT</th>
            <th className="num">green h</th>
            <th className="num">avg hold</th>
            {props.dates && <th>first → last</th>}
          </tr>
        </thead>
        <tbody>
          {props.rows.map((r) => (
            <tr key={r.key}>
              <td>{r.key}</td>
              <td className="num">{r.n}</td>
              <td className="num">{Number.isFinite(r.positions) ? r.positions : "–"}</td>
              <td className="num">
                {r.wins} / {r.losses}
              </td>
              <td className="num">{pct(r.wr)}</td>
              <td className={`num ${pfTone(r.pf)}`}>{fmt.pf(r.pf)}</td>
              <td className={`num ${tone(r.net)}`}>{fmt.pct(r.net)}</td>
              <td className={`num ${tone(r.usd)}`}>{fmt.usd(r.usd)}</td>
              <td className="num">{fmt.h(r.ddt)}</td>
              <td className="num">{pct(r.gh)}</td>
              <td className="num">{Number.isFinite(r.avgHoldMin) ? `${fmt.num(r.avgHoldMin)}m` : "–"}</td>
              {props.dates && (
                <td className="v2-mono" style={{ whiteSpace: "nowrap" }}>
                  {fmt.time(r.firstT)} → {fmt.time(r.lastT)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WithWithout(props: { rows: Any[]; presets: Any[] }) {
  if (!props.rows.length)
    return <Empty>The execution presets are computed with the next simulated run.</Empty>;
  return (
    <>
      <div className="v2-table-wrap">
        <table className="v2-table">
          <thead>
            <tr>
              <th>sub-strategy</th>
              <th>with</th>
              <th className="num">PF</th>
              <th className="num">net %</th>
              <th className="num">DDT</th>
              <th>without</th>
              <th className="num">PF</th>
              <th className="num">net %</th>
              <th className="num">DDT</th>
              <th className="num">Δ PF</th>
              <th className="num">Δ net</th>
              <th className="num">Δ DDT</th>
            </tr>
          </thead>
          <tbody>
            {props.rows.map((r) => (
              <tr key={r.label}>
                <td>
                  <b>{r.label}</b>
                </td>
                <td>{r.with.label}</td>
                <td className={`num ${pfTone(r.with.pf)}`}>{fmt.pf(r.with.pf)}</td>
                <td className={`num ${tone(r.with.net)}`}>{fmt.pct(r.with.net)}</td>
                <td className="num">{fmt.h(r.with.ddt)}</td>
                <td>{r.without.label}</td>
                <td className={`num ${pfTone(r.without.pf)}`}>{fmt.pf(r.without.pf)}</td>
                <td className={`num ${tone(r.without.net)}`}>{fmt.pct(r.without.net)}</td>
                <td className="num">{fmt.h(r.without.ddt)}</td>
                <td className={`num ${tone(r.dPf)}`}>{(r.dPf >= 0 ? "+" : "") + r.dPf.toFixed(2)}</td>
                <td className={`num ${tone(r.dNet)}`}>{fmt.pct(r.dNet)}</td>
                <td className={`num ${tone(-r.dDdt)}`}>{(r.dDdt >= 0 ? "+" : "") + r.dDdt.toFixed(1)}h</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <details style={{ marginTop: 8 }}>
        <summary className="v2-muted">Every execution preset on the same tapes ({props.presets.length})</summary>
        <GroupTable
          label="preset"
          rows={props.presets.map((p) => ({
            key: p.label,
            n: p.n,
            wins: Math.round(p.wr * p.n),
            losses: p.n - Math.round(p.wr * p.n),
            wr: p.wr,
            pf: p.pf,
            net: p.net,
            usd: NaN,
            avg: 0,
            ddt: p.ddt,
            gh: p.gh,
            positions: NaN,
            avgHoldMin: NaN,
            firstT: 0,
            lastT: 0,
          }))}
        />
      </details>
    </>
  );
}

function Configs(props: { rows: Any[] }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [sort, setSort] = useState<"usd" | "pf" | "n">("usd");
  const rows = useMemo(() => {
    const f = q.trim().toLowerCase();
    const xs = f ? props.rows.filter((r) => r.key.toLowerCase().includes(f) || r.range.toLowerCase().includes(f) || r.type.toLowerCase().includes(f)) : props.rows;
    return [...xs].sort((a, b) => b[sort] - a[sort]);
  }, [props.rows, q, sort]);
  return (
    <>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
        <input className="v2-input" placeholder="filter: indication, range, type…" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 280 }} />
        <Seg
          label="Sort"
          value={sort}
          options={[
            { value: "usd", label: "net $" },
            { value: "pf", label: "PF" },
            { value: "n", label: "orders" },
          ]}
          onChange={(v) => setSort(v)}
        />
        <button type="button" className="v2-btn" onClick={() => downloadFile("configs.csv", toCsv(rows), "text/csv")}>
          CSV
        </button>
      </div>
      <div className="v2-table-wrap">
        <table className="v2-table">
          <thead>
            <tr>
              <th>bot · indication</th>
              <th>type</th>
              <th>range</th>
              <th>lane</th>
              <th className="num">TP</th>
              <th className="num">SL</th>
              <th className="num">trail</th>
              <th className="num">orders</th>
              <th className="num">WR</th>
              <th className="num">PF</th>
              <th className="num">net $</th>
              <th className="num">DDT</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 200).map((r) => (
              <Fragment key={r.key}>
                <tr onClick={() => setOpen(open === r.key ? null : r.key)} style={{ cursor: "pointer" }} aria-expanded={open === r.key}>
                  <td>
                    {r.bot} · {r.ind}
                  </td>
                  <td>{r.type}</td>
                  <td>{r.range}</td>
                  <td>{r.lane}</td>
                  <td className="num">{(r.tp * 100).toFixed(3)}%</td>
                  <td className="num">{(r.sl * 100).toFixed(3)}%</td>
                  <td className="num">{r.trail ? `${(r.trail * 100).toFixed(3)}%` : "–"}</td>
                  <td className="num">{r.n}</td>
                  <td className="num">{pct(r.wr)}</td>
                  <td className={`num ${pfTone(r.pf)}`}>{fmt.pf(r.pf)}</td>
                  <td className={`num ${tone(r.usd)}`}>{fmt.usd(r.usd)}</td>
                  <td className="num">{fmt.h(r.ddt)}</td>
                </tr>
                {open === r.key && (
                  <tr>
                    <td colSpan={12}>
                      <div className="v2-grid v2-cols-4" style={{ fontSize: "var(--v-fs-sm)" }}>
                        <div>
                          <div className="v2-muted">config</div>
                          <code style={{ wordBreak: "break-all" }}>{r.key}</code>
                        </div>
                        <div>
                          <div className="v2-muted">indication kind · bars held max</div>
                          {r.indKind} · {r.holdBars}
                        </div>
                        <div>
                          <div className="v2-muted">first → last close</div>
                          {fmt.time(r.firstT)} → {fmt.time(r.lastT)}
                        </div>
                        <div>
                          <div className="v2-muted">symbols · positions · green hours · avg hold</div>
                          {r.syms} · {r.positions} · {pct(r.gh)} · {fmt.num(r.avgHoldMin)}m
                        </div>
                        <div>
                          <div className="v2-muted">wins / losses · avg %</div>
                          {r.wins} / {r.losses} · {fmt.pct(r.avg, 3)}
                        </div>
                        <div>
                          <div className="v2-muted">SL ÷ TP · trail ÷ TP</div>
                          {(r.sl / Math.max(1e-9, r.tp)).toFixed(2)}× · {r.trail ? `${(r.trail / Math.max(1e-9, r.tp)).toFixed(2)}×` : "off"}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > 200 && <p className="v2-muted">Showing 200 of {rows.length} (filter or export the CSV for all).</p>}
    </>
  );
}

export function StatisticsPage() {
  const [source, setSource] = useState<"sim" | "paper" | "live">("sim");
  const [hours, setHours] = useState(0);
  const { data, error } = usePoll(() => coreStatistics({ data: { source, hours } }), 30_000, [source, hours]);
  const d = data as Any;
  const r = d?.report;
  const multi = useMemo(() => {
    if (!r) return null;
    const P = r.timeline.points as Any[];
    const s = (k: string) => P.map((p) => ({ t: p.t, v: p[k] }));
    return [
      {
        title: "Balance · equity ($)",
        unit: "",
        height: 160,
        series: [
          { name: "balance", points: s("balance") },
          { name: "equity", points: s("equity"), fill: true },
        ],
      },
      { title: "Drawdown (%)", height: 80, zero: true, digits: 1, series: [{ name: "drawdown", points: P.map((p) => ({ t: p.t, v: -p.ddPct })), color: "var(--v-down)", fill: true }] },
      { title: "Margin used ($)", height: 90, zero: true, series: [{ name: "margin", points: s("margin"), fill: true }] },
      {
        title: "Open book",
        height: 110,
        zero: true,
        digits: 0,
        step: true,
        series: [
          { name: "sets", points: s("sets") },
          { name: "positions", points: s("positions") },
          { name: "orders", points: s("orders") },
        ],
      },
    ];
  }, [r]);
  const controls = (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <Seg
        label="Source"
        value={source}
        options={[
          { value: "sim", label: "simulated run" },
          { value: "paper", label: "paper book" },
          { value: "live", label: "live (own ids)" },
        ]}
        onChange={(v) => setSource(v)}
      />
      <Seg
        label="Range"
        value={hours}
        options={[
          { value: 0, label: "all" },
          { value: 6, label: "6h" },
          { value: 24, label: "24h" },
          { value: 72, label: "3d" },
        ]}
        onChange={(v) => setHours(v)}
      />
    </div>
  );
  if (!d) return <>{error ? <ErrorNote error={error} /> : <Empty>Loading…</Empty>}</>;
  if (!r)
    return (
      <>
        {controls}
        <Empty>{d.why ?? "No data yet"}</Empty>
      </>
    );
  const T = r.total;
  const tl = r.timeline;
  const typeParts = (r.types as Row[]).map((x) => ({ label: x.key, value: x.n }));
  const hourBars = (r.hourOfDay as Row[]).map((x) => ({ k: x.key, v: x.usd, tip: `${x.key}:00 UTC · ${x.n} orders · PF ${fmt.pf(x.pf)} · ${fmt.usd(x.usd)}` }));
  const dailyBars = (r.daily as Row[]).map((x) => ({ k: x.key.slice(5), v: x.usd, tip: `${x.key} · ${x.n} orders · PF ${fmt.pf(x.pf)} · ${fmt.usd(x.usd)}` }));
  const heat = new Map<string, Any>((r.heat as Any[]).map((c) => [`${c.d}|${c.h}`, c]));
  return (
    <>
      <ErrorNote error={error} />
      <Panel
        title="Statistics"
        sub={`${d.conn ?? ""} · ${r.source === "sim" ? "simulated run (full detail)" : r.source === "live" ? "live orders by own client id (fills, fees)" : "paper book"} · ${fmt.time(r.startT)} → ${fmt.time(r.endT)} UTC`}
        right={controls}
      >
        <div className="v2-grid v2-cols-6">
          <Kpi label="Balance" value={fmt.usd(T.usdEnd)} sub={`start ${fmt.usd(r.balance0)} · ${fmt.usd(T.usd)}`} className={tone(T.usd)} />
          <Kpi label="Profit factor" value={fmt.pf(T.pf)} sub={`WR ${pct(T.wr)} · SQN ${fmt.pf(T.sqn)}`} className={pfTone(T.pf)} />
          <Kpi label="Orders · positions" value={`${T.n} · ${T.positions}`} sub={`${T.wins} won · ${T.losses} lost · ${fmt.pf(T.tph)}/h`} />
          <Kpi label="Equity drawdown" value={`${tl.maxDdPct.toFixed(2)}%`} sub={`${fmt.usd(tl.maxDd)} · under water ${fmt.h(tl.maxDdH)}`} className={tl.maxDdPct > 20 ? "v2-down" : ""} />
          <Kpi label="DDT (closes)" value={fmt.h(T.ddt)} sub={`green hours ${pct(T.gh)}`} />
          <Kpi label="Peak book" value={`${tl.positionsMax} pos`} sub={`${tl.ordersMax} orders · ${tl.setsMax} sets · margin ${fmt.usd(tl.marginMax)}`} />
        </div>
      </Panel>
      <Panel title="Overall" sub="balance, equity marked to market, drawdown, margin used and the open book (sets · positions · orders) on one time axis">
        {multi && <MultiChart panels={multi} />}
      </Panel>
      <div className="v2-grid v2-cols-2">
        <Panel title="Types" sub="Normal · Trailing · Axis · DCA · DCA Active · Signals">
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
            <ArcShare parts={typeParts} size={140} center={`${T.n}`} />
            <div style={{ flex: 1, minWidth: 260 }}>
              <GroupTable rows={r.types} label="type" />
            </div>
          </div>
        </Panel>
        <Panel title="Sub-configs" sub="Block raised vs unit volume, Block Active level, DCA vs DCA Active, Axis">
          {!r.detail.blockDetail && <p className="v2-muted">The paper book keeps no Block / DCA detail per close: switch to the simulated run for the split.</p>}
          <GroupTable rows={r.subTypes} label="sub-config" />
        </Panel>
      </div>
      <Panel title="With and without" sub="the execution presets computed on the same tapes: each sub-strategy on vs off (PF, net, drawdown time)">
        <WithWithout rows={r.withWithout} presets={r.presets} />
      </Panel>
      <div className="v2-grid v2-cols-2">
        <Panel title="Ranges" sub="Wide · Short · Minimal · Micro · Minimal plus">
          <GroupTable rows={r.ranges} label="range" />
        </Panel>
        <Panel title="Timeframe lanes">
          <GroupTable rows={r.lanes} label="lane" />
        </Panel>
        <Panel title="Indication kinds">
          <GroupTable rows={r.indKinds} label="kind" />
        </Panel>
        <Panel title="Bots · sides · exit reasons">
          <GroupTable rows={[...r.bots, ...r.sides]} label="bot / side" />
          <div style={{ height: 8 }} />
          <GroupTable rows={r.reasons} label="exit" />
        </Panel>
      </div>
      <div className="v2-grid v2-cols-2">
        <Panel title="Hour of day (UTC)" sub="net $ of the closes per hour">
          <SignedBars data={hourBars} />
        </Panel>
        <Panel title="Days" sub="net $ per day">
          <SignedBars data={dailyBars} />
        </Panel>
      </div>
      <Panel title="Weekday × hour" sub="net % of one unit, closes in that hour of that weekday (UTC)">
        <HeatGrid
          rows={WEEKDAYS}
          cols={Array.from({ length: 24 }, (_, h) => String(h).padStart(2, "0"))}
          neutral={0}
          cell={(row, col) => {
            const c = heat.get(`${WEEKDAYS.indexOf(row)}|${Number(col)}`);
            return c ? { v: c.net, tip: `${row} ${col}:00 · ${c.n} closes · ${c.net.toFixed(2)}%` } : null;
          }}
        />
      </Panel>
      <Panel title="Symbols" sub="every symbol traded">
        <GroupTable rows={r.symbols} label="symbol" dates />
      </Panel>
      <Panel title="Configs" sub="every config: parameters, results and dates (click a row for the details)">
        <Configs rows={r.configs} />
        {r.configs.length > 0 && (
          <p className="v2-muted" style={{ marginTop: 6 }}>
            <Pill>{r.configs.length}</Pill> configs with closes in the window.
          </p>
        )}
      </Panel>
    </>
  );
}
