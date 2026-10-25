// Statistics: the complete picture of the selected connection's book — balance, equity, margin and the open book
// over time, every type and sub-type (Normal, Trailing, Axis, DCA / DCA Active, Block / Block Active, Signals) with
// and without each sub-strategy, ranges, lanes, indication kinds, bots, symbols, exit reasons, hours, weekdays and
// every config with its parameters and dates.
import { Fragment, useMemo, useState } from "react";
import { coreStatistics } from "../api-conn";
import { configStrategyLabel, indicationKindLabel } from "../indication-ui";
import { hasNoTakeProfit, historicExitLabel, signalTrailGapRatio } from "../signal-units";
import {
  accountSource,
  cashPfText,
  comparisonPfDelta,
  comparisonPfText,
  returnPf,
  returnPfText,
  returnPfEdgeText,
  unitStatsPfText,
  liveBalanceUnavailable,
} from "../accounting";
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
  pf: number | null;
  pfBasis?: string;
  unknownReturns?: number;
  gp?: number | null;
  gl?: number | null;
  noLoss?: boolean | null;
  pfConvention?: string;
  cashPf?: number;
  cashNoLoss?: boolean;
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

function GroupTable(props: {
  rows: Row[];
  label: string;
  empty?: string;
  dates?: boolean;
  fine?: boolean;
  comparison?: boolean;
  source?: string;
}) {
  const usd = props.fine ? fmt.usd4 : fmt.usd;
  if (!props.rows.length) return <Empty>{props.empty ?? "No closes"}</Empty>;
  return (
    <div className="v2-table-wrap">
      <table className="v2-table">
        <thead>
          <tr>
            <th>{props.label}</th>
            <th className="num">orders</th>
            <th className="num">positions</th>
            <th className="num">
              {props.source === "paper-history" ? "recorded wins / losses" : "wins / losses"}
            </th>
            <th className="num">{props.source === "paper-history" ? "recorded WR" : "WR"}</th>
            <th className="num">Return PF</th>
            <th className="num">
              {props.source === "paper-history" ? "nominal cash PF ($)" : "cash PF ($, diagnostic)"}
            </th>
            <th
              className="num"
              title={
                props.comparison
                  ? undefined
                  : "Sum of recorded returns before removing execution volume; separate from the primary unit-return sample"
              }
            >
              {props.comparison ? "net %" : "recorded net %"}
            </th>
            <th className="num">{props.source === "paper-history" ? "nominal net $" : "net $"}</th>
            <th className="num">DDT</th>
            <th className="num">green h</th>
            <th className="num">avg hold</th>
            {props.dates && <th>first → last</th>}
          </tr>
        </thead>
        <tbody>
          {props.rows.map((r) => (
            <tr key={r.key}>
              <td>{props.label === "kind" ? indicationKindLabel(r.key) : r.key}</td>
              <td className="num">{r.n}</td>
              <td className="num">{Number.isFinite(r.positions) ? r.positions : "–"}</td>
              <td className="num">
                {r.wins} / {r.losses}
              </td>
              <td className="num">{pct(r.wr)}</td>
              <td className={`num ${pfTone(returnPf(r))}`}>
                {props.comparison ? comparisonPfText(r) : returnPfText(r)}
                <div className="v2-muted" title="PF edge = PF − 1. Zero is breakeven; positive means net gains exceed net losses.">
                  edge {returnPfEdgeText(r)}
                </div>
              </td>
              <td className="num v2-muted">{cashPfText(r)}</td>
              <td className={`num ${tone(r.net)}`}>{fmt.pct(r.net)}</td>
              <td className={`num ${tone(r.usd)}`}>{usd(r.usd)}</td>
              <td className="num">{fmt.h(r.ddt)}</td>
              <td className="num">{pct(r.gh)}</td>
              <td className="num">
                {Number.isFinite(r.avgHoldMin) ? `${fmt.num(r.avgHoldMin)}m` : "–"}
              </td>
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
              <th className="num">Return PF</th>
              <th className="num">net %</th>
              <th className="num">DDT</th>
              <th>without</th>
              <th className="num">Return PF</th>
              <th className="num">net %</th>
              <th className="num">DDT</th>
              <th className="num">Δ Return PF</th>
              <th className="num">Δ net</th>
              <th className="num">Δ DDT</th>
            </tr>
          </thead>
          <tbody>
            {props.rows.map((r) => {
              const deltaPf = comparisonPfDelta(r.with, r.without);
              return (
                <tr key={r.label}>
                  <td>
                    <b>{r.label}</b>
                  </td>
                  <td>{r.with.label}</td>
                  <td className={`num ${pfTone(r.with.pf)}`}>{comparisonPfText(r.with)}</td>
                  <td className={`num ${tone(r.with.net)}`}>{fmt.pct(r.with.net)}</td>
                  <td className="num">{fmt.h(r.with.ddt)}</td>
                  <td>{r.without.label}</td>
                  <td className={`num ${pfTone(r.without.pf)}`}>{comparisonPfText(r.without)}</td>
                  <td className={`num ${tone(r.without.net)}`}>{fmt.pct(r.without.net)}</td>
                  <td className="num">{fmt.h(r.without.ddt)}</td>
                  <td
                    className={`num ${tone(deltaPf)}`}
                    title={
                      deltaPf === null
                        ? "Unavailable: requires two nonempty measured return ratios"
                        : undefined
                    }
                  >
                    {deltaPf === null ? "–" : (deltaPf >= 0 ? "+" : "") + deltaPf.toFixed(2)}
                  </td>
                  <td className={`num ${tone(r.dNet)}`}>{fmt.pct(r.dNet)}</td>
                  <td className={`num ${tone(-r.dDdt)}`}>
                    {(r.dDdt >= 0 ? "+" : "") + r.dDdt.toFixed(1)}h
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="v2-muted" style={{ fontSize: "var(--v-fs-xs)" }}>
        Return PF uses net-return gains divided by losses. No-loss scores and results without
        gross-return provenance have no finite PF delta.
      </p>
      <details style={{ marginTop: 8 }}>
        <summary className="v2-muted">
          Every execution preset on the same tapes ({props.presets.length})
        </summary>
        <GroupTable
          label="preset"
          comparison
          rows={props.presets.map((p) => ({
            key: p.label,
            n: p.n,
            wins: Math.round(p.wr * p.n),
            losses: p.n - Math.round(p.wr * p.n),
            wr: p.wr,
            pf: p.pf,
            pfBasis: p.pfBasis,
            unknownReturns: p.unknownReturns,
            gp: p.gp,
            gl: p.gl,
            noLoss: p.noLoss,
            pfConvention: p.pfConvention,
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

function Configs(props: { rows: Any[]; source: string }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [sort, setSort] = useState<"usd" | "pf" | "n">("usd");
  const rows = useMemo(() => {
    const f = q.trim().toLowerCase();
    const xs = f
      ? props.rows.filter(
          (r) =>
            r.key.toLowerCase().includes(f) ||
            r.group.toLowerCase().includes(f) ||
            (historicExitLabel(r) ?? configStrategyLabel(r, props.source))
              .toLowerCase()
              .includes(f),
        )
      : props.rows;
    return [...xs].sort((a, b) => b[sort] - a[sort]);
  }, [props.rows, props.source, q, sort]);
  return (
    <>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
        <input
          className="v2-input"
          placeholder="filter: indication, group, type…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ maxWidth: 280 }}
        />
        <Seg
          label="Sort"
          value={sort}
          options={[
            { value: "usd", label: "net $" },
            { value: "pf", label: "Return PF" },
            { value: "n", label: "orders" },
          ]}
          onChange={(v) => setSort(v)}
        />
        <button
          type="button"
          className="v2-btn"
          onClick={() => downloadFile("configs.csv", toCsv(rows), "text/csv")}
        >
          CSV
        </button>
      </div>
      <div className="v2-table-wrap">
        <table className="v2-table">
          <thead>
            <tr>
              <th>bot · indication</th>
              <th>type</th>
              <th>range / strategy group</th>
              <th>lane</th>
              <th className="num">TP</th>
              <th className="num">SL</th>
              <th className="num">trail</th>
              <th className="num">orders</th>
              <th className="num">WR</th>
              <th className="num">Return PF</th>
              <th className="num">
                {props.source === "paper-history" ? "nominal cash PF ($)" : "cash PF ($, diagnostic)"}
              </th>
              <th className="num">net $</th>
              <th className="num">DDT</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 200).map((r) => (
              <Fragment key={r.key}>
                <tr
                  onClick={() => setOpen(open === r.key ? null : r.key)}
                  style={{ cursor: "pointer" }}
                  aria-expanded={open === r.key}
                >
                  <td>
                    {r.bot} · {r.ind}
                  </td>
                  <td>{historicExitLabel(r) ?? configStrategyLabel(r, props.source)}</td>
                  <td>{r.group}</td>
                  <td>{r.lane}</td>
                  <td className="num">
                    {hasNoTakeProfit(r) ? "None" : `${(r.tp * 100).toFixed(3)}%`}
                    {r.tpNet !== undefined && (
                      <span className="v2-muted"> (net {(r.tpNet * 100).toFixed(3)}%)</span>
                    )}
                  </td>
                  <td className="num">{(r.sl * 100).toFixed(3)}%</td>
                  <td className="num">{r.trail ? `${(r.trail * 100).toFixed(3)}%` : "–"}</td>
                  <td className="num">{r.n}</td>
                  <td className="num">{pct(r.wr)}</td>
                  <td className={`num ${pfTone(returnPf(r))}`}>
                    {returnPfText(r)}
                    <div className="v2-muted" title="PF edge = PF − 1; breakeven = 0">edge {returnPfEdgeText(r)}</div>
                  </td>
                  <td className="num v2-muted">{cashPfText(r)}</td>
                  <td className={`num ${tone(r.usd)}`}>{fmt.usd(r.usd)}</td>
                  <td className="num">{fmt.h(r.ddt)}</td>
                </tr>
                {open === r.key && (
                  <tr>
                    <td colSpan={13}>
                      <div className="v2-grid v2-cols-4" style={{ fontSize: "var(--v-fs-sm)" }}>
                        <div>
                          <div className="v2-muted">config</div>
                          <code style={{ wordBreak: "break-all" }}>{r.key}</code>
                        </div>
                        <div>
                          <div className="v2-muted">indication kind · bars held max</div>
                          {indicationKindLabel(r.indKind)} · {r.holdBars}
                        </div>
                        <div>
                          <div className="v2-muted">first → last close</div>
                          {fmt.time(r.firstT)} → {fmt.time(r.lastT)}
                        </div>
                        <div>
                          <div className="v2-muted">
                            symbols · positions · green hours · avg hold
                          </div>
                          {r.syms} · {r.positions} · {pct(r.gh)} · {fmt.num(r.avgHoldMin)}m
                        </div>
                        <div>
                          <div className="v2-muted">wins / losses · avg %</div>
                          {r.wins} / {r.losses} · {fmt.pct(r.avg, 3)}
                        </div>
                        <div>
                          <div className="v2-muted">
                            {hasNoTakeProfit(r)
                              ? "Hard SL · trail activation · trailing gap"
                              : "SL ÷ TP · trail ÷ TP"}
                          </div>
                          {hasNoTakeProfit(r) ? (
                            `${(r.sl * 100).toFixed(3)}% · ${(r.trail * 100).toFixed(3)}% · ${(r.trail * signalTrailGapRatio(r) * 100).toFixed(3)}%`
                          ) : (
                            <>
                              {(r.sl / Math.max(1e-9, r.tp)).toFixed(2)}× ·{" "}
                              {r.trail ? `${(r.trail / Math.max(1e-9, r.tp)).toFixed(2)}×` : "off"}
                            </>
                          )}
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
      {rows.length > 200 && (
        <p className="v2-muted">Showing 200 of {rows.length} (filter or export the CSV for all).</p>
      )}
    </>
  );
}

export function StatisticsPage() {
  const [source, setSource] = useState<"sim" | "paper" | "paper-history" | "live">("live");
  const [hours, setHours] = useState(0);
  const { data, error } = usePoll(() => coreStatistics({ data: { source, hours } }), 30_000, [
    source,
    hours,
  ]);
  const d = data as Any;
  const r = d?.report;
  // a wallet-based baseline ("account wallet", the own ledger's wallet reconstruction) is a based live balance too
  const unbasedLive =
    liveBalanceUnavailable(r?.source, d?.balanceFrom) && d?.balanceFrom !== "account wallet";
  const multi = useMemo(() => {
    if (!r) return null;
    const P = r.timeline.points as Any[];
    const basis = unbasedLive ? (r.balanceStart ?? 0) : 0;
    const s = (k: string) =>
      P.map((p) => ({ t: p.t, v: p[k] - (k === "balance" || k === "equity" ? basis : 0) }));
    return [
      {
        title: unbasedLive ? "Ledger net change ($)" : "Balance · equity ($)",
        unit: "",
        height: 160,
        series: [
          { name: unbasedLive ? "realized net" : "balance (reconstructed)", points: s("balance") },
          {
            name: unbasedLive ? "modeled net incl. MTM" : "equity (reconstructed)",
            points: s("equity"),
            fill: true,
          },
        ],
      },
      ...(unbasedLive
        ? []
        : [
            {
              title: "Drawdown (%)",
              height: 80,
              zero: true,
              digits: 1,
              series: [
                {
                  name: "drawdown",
                  points: P.map((p) => ({ t: p.t, v: -p.ddPct })),
                  color: "var(--v-down)",
                  fill: true,
                },
              ],
            },
          ]),
      {
        title: "Margin used ($)",
        height: 90,
        zero: true,
        series: [{ name: "margin", points: s("margin"), fill: true }],
      },
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
  }, [r, unbasedLive]);
  const controls = (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <Seg
        label="Source"
        value={source}
        options={[
          { value: "sim", label: "simulated run" },
          { value: "paper", label: "paper book" },
          { value: "paper-history", label: "recorded paper history" },
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
  // live amounts on a small account: cents of cents shown (4 decimals below $20)
  const fine = r.source === "live";
  const usd = fine ? fmt.usd4 : fmt.usd;
  const typeParts = (r.types as Row[]).map((x) => ({ label: x.key, value: x.n }));
  const hourBars = (r.hourOfDay as Row[]).map((x) => ({
    k: x.key,
    v: x.usd,
    tip: `${x.key}:00 UTC · ${x.n} orders · return PF ${returnPfText(x)} · ${usd(x.usd)}`,
  }));
  const dailyBars = (r.daily as Row[]).map((x) => ({
    k: x.key.slice(5),
    v: x.usd,
    tip: `${x.key} · ${x.n} orders · return PF ${returnPfText(x)} · ${usd(x.usd)}`,
  }));
  const heat = new Map<string, Any>((r.heat as Any[]).map((c) => [`${c.d}|${c.h}`, c]));
  // full colour at the largest |net| of a cell
  const heatSpan = Math.max(1e-9, ...(r.heat as Any[]).map((c) => Math.abs(c.net)));
  const balanceNote =
    d.balanceFrom === "account wallet"
      ? "from the account wallet − own closes; external funding and other activity are not reconciled"
      : d.balanceFrom === "account equity"
        ? "reconstructed from current account equity; external funding and other activity are not reconciled"
        : d.balanceFrom === "paper start balance + live P&L"
          ? "no account read: paper start balance + live P&L"
          : unbasedLive
            ? "account balance baseline unavailable; ledger net change only"
            : r.source === "live"
              ? ""
              : "virtual start balance";
  const apart = [
    r.hand?.n ? `ended by orders not ours ${r.hand.n} (${fmt.usdSigned(r.hand.usd)})` : "",
    r.flat?.n ? `exchange-ended, cause not proven ${r.flat.n} (${fmt.usdSigned(r.flat.usd)})` : "",
    d.unpriced?.n ? `${d.unpriced.n} flat markers without any price (not booked)` : "",
  ].filter(Boolean);
  const apartNote = apart.length ? ` · apart: ${apart.join(", ")}` : "";
  return (
    <>
      <ErrorNote error={error} />
      <Panel
        title="Statistics"
        sub={`${d.conn ?? ""} · ${d.sourceLabel ?? r.source} · ${fmt.time(r.startT)} → ${fmt.time(r.endT)} UTC · USD after fees${d.feesModelled ? " (includes estimated fees; unknown net returns cannot qualify PF)" : ""} · PF neutral 1; net % per unit of notional${r.source === "live" ? ` · measured trading-fee return basis; funding in account history · account read ${fmt.ago(d.accountAt)}` : ""}${r.open?.positions ? ` · ${r.open.positions} own positions open (marked in the chart, not closes)` : ""}`}
        right={controls}
      >
        <div className="v2-grid v2-cols-6">
          <Kpi
            label={
              unbasedLive
                ? "Ledger net (window)"
                : r.source === "live"
                  ? "Ledger balance (reconstructed)"
                  : "Closed-trade balance"
            }
            value={usd(unbasedLive ? T.usd : T.usdEnd)}
            sub={
              unbasedLive
                ? `${balanceNote}${apartNote}`
                : `${hours > 0 ? "window start" : "start"} ${usd(hours > 0 ? (r.balanceStart ?? r.balance0) : r.balance0)} · own results ${fmt.usdSigned(T.usd, fine ? 4 : 2)}${balanceNote ? ` · ${balanceNote}` : ""}${apartNote}`
            }
            className={tone(T.usd)}
          />
          <Kpi
            label={
              r.source === "live"
                ? "Ledger return PF"
                : r.source === "paper-history"
                  ? "Owned paper return PF"
                  : "Model return PF before allocation"
            }
            value={returnPfText(T)}
            sub={`PF edge (PF − 1): ${returnPfEdgeText(T)} · ${T.pfBasis === "unavailable" ? `unit-return evidence unavailable for ${fmt.num(T.unknownReturns)} closes · ` : ""}${r.source === "paper-history" ? "nominal paper cash PF" : "cash PF diagnostic"} ${cashPfText(T)} · ${r.source === "paper-history" ? "recorded WR" : "WR"} ${pct(T.wr)} · SQN ${fmt.pf(T.sqn)}`}
            className={pfTone(returnPf(T))}
          />
          <Kpi
            label="Orders · positions"
            value={`${T.n} · ${T.positions}`}
            sub={`${r.source === "paper-history" ? "recorded: " : ""}${T.wins} won · ${T.losses} lost · ${fmt.pf(T.tph)}/h`}
          />
          <Kpi
            label={unbasedLive ? "Ledger drawdown ($)" : "Equity drawdown"}
            value={unbasedLive ? usd(tl.maxDd) : `${tl.maxDdPct.toFixed(2)}%`}
            sub={
              unbasedLive
                ? `account drawdown % unavailable · under water ${fmt.h(tl.maxDdH)}`
                : `${usd(tl.maxDd)} · under water ${fmt.h(tl.maxDdH)}`
            }
            className={!unbasedLive && tl.maxDdPct > 20 ? "v2-down" : ""}
          />
          <Kpi label="DDT (closes)" value={fmt.h(T.ddt)} sub={`green hours ${pct(T.gh)}`} />
          <Kpi
            label="Peak book"
            value={`${tl.positionsMax} pos`}
            sub={`${tl.ordersMax} orders · ${tl.setsMax} sets · margin ${usd(tl.marginMax)} at ${d.leverageFrom ?? "–"}`}
          />
        </div>
        <p className="v2-muted">
          Return PF: 1 is breakeven; below 1 is losing. PF edge subtracts 1: zero is breakeven,
          positive is profitable on the displayed settled sample. No-loss samples have no finite ratio.
        </p>
        {r.source === "sim" && (
          <p className="v2-muted">
            Return PF uses settled post-Base accepted modeled records before account allocation. The
            reconstructed dollar book is a separate sizing calculation; this return sample does not
            establish funded paper or venue execution PF.
          </p>
        )}
        {r.source === "paper" && (
          <p className="v2-muted">
            Forward book: {fmt.num(d.paperEvidence?.requested)} settled closes, using held unit returns
            and actual paper allocations. Missing ownership or return evidence stays in the sample
            and makes return PF unavailable. This virtual book does not prove venue fills.
          </p>
        )}
        {r.source === "paper-history" && (
          <p className="v2-muted">
            All {fmt.num(d.paperEvidence?.requested)} recorded closes remain in this window:{" "}
            {fmt.num(d.paperEvidence?.verifiedOwnership)} have matching positive measured paper
            allocation, {fmt.num(d.paperEvidence?.unknownOwnership)} lack verified ownership.
            Missing ownership or owned-book unit-return evidence makes the whole primary owned-paper
            PF unavailable; it never removes an old losing close. Recorded-unit PF (nominal
            diagnostic only): <b>{unitStatsPfText(d.paperEvidence?.recordedReturns)}</b>. Cash PF,
            dollar balances, net and curves use the forward book’s captured allocation and recorded
            weighted return once. Missing allocation or volume makes cash performance unavailable;
            changing today’s sizing cannot reprice a recorded close.
            Paper evidence is not venue fills, and this aggregate cannot substitute for each exact
            lane's strict promotion window.
          </p>
        )}
      </Panel>
      {r.source === "live" && (
        <Panel
          title="Exchange account"
          sub={`${accountSource(d.account)}${d.account?.at ? ` · ${fmt.ago(d.account.at)}` : ""} · return PF above uses owned ledger net returns after costs; fees or fills may be estimated`}
        >
          <div className="v2-grid v2-cols-4">
            <Kpi label="Wallet balance" value={usd(d.account?.wallet)} />
            <Kpi
              label="Account equity"
              value={usd(d.account?.equity)}
              sub={`available margin ${usd(d.account?.availableMargin)}`}
            />
            <Kpi
              label="Open net"
              value={usd(d.account?.openNet)}
              className={tone(d.account?.openNet)}
            />
            <Kpi
              label="Exchange realized"
              value={usd(d.account?.realized)}
              className={tone(d.account?.realized)}
              sub="account-reported total; exchange reporting period"
            />
          </div>
        </Panel>
      )}
      {r.source === "live" && (
        <Panel
          title="Owned execution close history"
          sub={`latest ${d.closes?.length ?? 0} of ${T.n} closes in this window · the same net returns used by ledger return PF; includes cost estimates when fills are unavailable`}
          flush
        >
          {(d.closes ?? []).length ? (
            <div className="v2-table-wrap">
              <table className="v2-table">
                <thead>
                  <tr>
                    <th>opened UTC</th>
                    <th>closed UTC</th>
                    <th>symbol</th>
                    <th>side</th>
                    <th className="num">entry</th>
                    <th className="num">matched notional $</th>
                    <th className="num">net return</th>
                    <th className="num">net P&L $</th>
                    <th>reason</th>
                  </tr>
                </thead>
                <tbody>
                  {d.closes.map((x: Any, i: number) => (
                    <tr key={`${x.sym}|${x.side}|${x.entryT}|${x.exitT}|${i}`}>
                      <td>{fmt.time(x.entryT)}</td>
                      <td>{fmt.time(x.exitT)}</td>
                      <td>{x.sym}</td>
                      <td>{x.side > 0 ? "long" : "short"}</td>
                      <td className="num">{fmt.num(x.entry, 4)}</td>
                      <td className="num">{usd(x.notional)}</td>
                      <td className={`num ${tone(x.r)}`}>{fmt.frac(x.r)}</td>
                      <td className={`num ${tone(x.pnl)}`}>{usd(x.pnl)}</td>
                      <td>{x.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty>No owned execution closes in this window.</Empty>
          )}
        </Panel>
      )}
      <Panel
        title={unbasedLive ? "Ledger P&L reconstruction" : "Closed-trade reconstruction"}
        sub={
          unbasedLive
            ? "Owned ledger net change from zero at the window start; no account balance or equity level is inferred. Mark to market and margin are modeled from closed trades."
            : "balance, mark to market, drawdown and margin reconstructed from closes; external funding and other activity are not reconciled; current open exchange positions appear in the account snapshot"
        }
      >
        {multi && <MultiChart panels={multi} />}
      </Panel>
      <div className="v2-grid v2-cols-2">
        <Panel
          title="Types"
          sub="Normal · Trailing · Historic Exit · Axis · DCA · DCA Active · Signals"
        >
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
            <ArcShare parts={typeParts} size={140} center={`${T.n}`} />
            <div style={{ flex: 1, minWidth: 260 }}>
              <GroupTable fine={fine} rows={r.types} label="type" source={r.source} />
            </div>
          </div>
        </Panel>
        <Panel
          title="Sub-configs"
          sub="Block raised vs unit volume, Block Active level, DCA vs DCA Active, Axis"
        >
          {!r.detail.blockDetail && (
            <p className="v2-muted">
              {r.source === "live"
                ? "Live closes are rebuilt from the own order ledger per symbol × direction: they carry no Block / DCA detail. Switch to the simulated run for the split."
                : "The paper book keeps no Block / DCA detail per close: switch to the simulated run for the split."}
            </p>
          )}
          <GroupTable fine={fine} rows={r.subTypes} label="sub-config" source={r.source} />
        </Panel>
      </div>
      <Panel
        title="With and without"
        sub="the execution presets computed on the same tapes: each sub-strategy on vs off (PF, net, drawdown time)"
      >
        <WithWithout rows={r.withWithout} presets={r.presets} />
      </Panel>
      <div className="v2-grid v2-cols-2">
        <Panel
          title="Ranges"
          sub="Normal / Trailing groups: Micro · Minimal · Minimal plus · Short · General · Long · Wide"
        >
          <GroupTable fine={fine} rows={r.ranges} label="range" source={r.source} />
        </Panel>
        <Panel
          title="Strategy groups"
          sub="Signals and Historic Exit are evaluated independently of Normal / Trailing ranges"
        >
          <GroupTable fine={fine} rows={r.strategyGroups} label="strategy group" source={r.source} />
        </Panel>
        <Panel title="Timeframe lanes">
          <GroupTable fine={fine} rows={r.lanes} label="lane" source={r.source} />
        </Panel>
        <Panel title="Indication kinds">
          <GroupTable fine={fine} rows={r.indKinds} label="kind" source={r.source} />
        </Panel>
        <Panel title="Bots · sides · exit reasons">
          <GroupTable fine={fine} rows={[...r.bots, ...r.sides]} label="bot / side" source={r.source} />
          <div style={{ height: 8 }} />
          <GroupTable fine={fine} rows={r.reasons} label="exit" source={r.source} />
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
      <Panel
        title="Weekday × hour"
        sub="net % of one unit, closes in that hour of that weekday (UTC)"
      >
        <HeatGrid
          rows={WEEKDAYS}
          cols={Array.from({ length: 24 }, (_, h) => String(h).padStart(2, "0"))}
          neutral={0}
          span={heatSpan}
          cell={(row, col) => {
            const c = heat.get(`${WEEKDAYS.indexOf(row)}|${Number(col)}`);
            return c
              ? { v: c.net, tip: `${row} ${col}:00 · ${c.n} closes · ${c.net.toFixed(2)}%` }
              : null;
          }}
        />
      </Panel>
      <Panel title="Symbols" sub="every symbol traded">
        <GroupTable fine={fine} rows={r.symbols} label="symbol" dates source={r.source} />
      </Panel>
      <Panel
        title="Configs"
        sub={`${(r.configCount ?? r.configs.length) > r.configs.length ? `top / bottom ${Math.ceil(r.configs.length / 2)} of ${r.configCount} by $` : "every config"}: parameters, results and dates (click a row for the details)`}
      >
        <Configs rows={r.configs} source={r.source} />
        {r.configs.length > 0 && (
          <p className="v2-muted" style={{ marginTop: 6 }}>
            <Pill>{r.configCount ?? r.configs.length}</Pill> configs with closes in the window
            {(r.configCount ?? r.configs.length) > r.configs.length
              ? ` · ${r.configs.length} listed (the best and the worst by $)`
              : ""}
            .
          </p>
        )}
      </Panel>
    </>
  );
}
