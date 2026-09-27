import { Link } from "@tanstack/react-router";
import { coreMarket, coreTrading } from "@/core/api";
import { Sparkline } from "../charts";
import { Empty, ErrorNote, fmt, Kpi, Line, Panel, Pill, tone, usePoll } from "../ui";

type Any = any;

export function TradingPage() {
  const { data, error } = usePoll(() => coreTrading(), 5000);
  const d = data as Any;
  if (!d) return <>{error ? <ErrorNote error={error} /> : <Empty>Loading…</Empty>}</>;
  const trades = d.trades as Any[];
  const pnl = trades.reduce((a, t) => a + (t.pnl ?? 0), 0);
  const live = d.live;
  return (
    <>
      <ErrorNote error={error} />
      <div className="v2-grid v2-cols-4">
        <Kpi
          label="Paper P&L"
          value={fmt.usd(d.equity)}
          className={tone(d.equity)}
          sub={`balance ${fmt.usd(d.balance)} from ${fmt.usd(d.startBalance)} · ${d.sizing?.mode === "fixed" ? "fixed notional" : `${fmt.num((d.sizing?.pct ?? 0.02) * 100, 1)}% of equity per order`}`}
        />
        <Kpi
          label="Open positions / orders"
          value={`${d.book?.positions ?? 0} / ${d.book?.orders ?? d.positions.length}`}
          sub={`long ${d.book?.long ?? 0} · short ${d.book?.short ?? 0} · ${d.selected.length} Real configs`}
        />
        <Kpi
          label="Closed positions / orders"
          value={`${d.closed?.positions ?? 0} / ${d.closed?.orders ?? trades.length}`}
          sub={fmt.usd(pnl)}
          className={tone(pnl)}
        />
        <Kpi
          label="Live"
          value={live?.enabled ? "armed" : "off"}
          sub={live?.reason ?? "disabled in settings"}
          className={live?.enabled ? "v2-up" : ""}
        />
      </div>
      <div className="v2-grid v2-cols-2">
        <Panel
          title="Open paper orders"
          sub={`${d.book?.orders ?? 0} orders (lane partials) in ${d.book?.positions ?? 0} positions (symbol × direction)`}
          flush
        >
          {d.positions.length ? (
            <div className="v2-table-wrap">
              <table className="v2-table">
                <thead>
                  <tr>
                    <th>symbol</th>
                    <th>side</th>
                    <th>config</th>
                    <th>entry</th>
                    <th className="num">px</th>
                    <th className="num">stop</th>
                    <th className="num">target</th>
                    <th className="num">MTM</th>
                  </tr>
                </thead>
                <tbody>
                  {d.positions.map((p: Any) => (
                    <tr key={`${p.cfg}|${p.sym}`}>
                      <td>{p.sym}</td>
                      <td>{p.side > 0 ? "long" : "short"}</td>
                      <td>
                        <Link to="/v2/config/$id" params={{ id: p.cfg }} className="v2-mono">
                          {p.cfg}
                        </Link>
                      </td>
                      <td>{fmt.time(p.entry_t)}</td>
                      <td className="num">{fmt.num(p.entry, 4)}</td>
                      <td className="num">{fmt.num(p.stop, 4)}</td>
                      <td className="num">{fmt.num(p.target, 4)}</td>
                      <td className={`num ${tone(p.mtm)}`}>{fmt.pct(p.mtm * 100)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty>No open paper positions</Empty>
          )}
        </Panel>
        <Panel
          title="Due now (Live intents)"
          sub="signals on the newest closed bar from Real configs"
          flush
        >
          {d.pending.length ? (
            <div className="v2-table-wrap">
              <table className="v2-table">
                <thead>
                  <tr>
                    <th>symbol</th>
                    <th>side</th>
                    <th>config</th>
                    <th className="num">TP</th>
                    <th className="num">SL</th>
                  </tr>
                </thead>
                <tbody>
                  {d.pending.map((p: Any, i: number) => (
                    <tr key={i}>
                      <td>{p.sym}</td>
                      <td>{p.side > 0 ? "long" : "short"}</td>
                      <td className="v2-mono">{p.cfg}</td>
                      <td className="num">{fmt.frac(p.protect.tp)}</td>
                      <td className="num">{fmt.frac(p.protect.sl)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty>Nothing due on the latest bar</Empty>
          )}
          {live && (
            <div className="v2-lines" style={{ padding: 10 }}>
              <Line k="Live status" v={live.reason} />
              <Line k="Placed last cycle" v={live.placed} />
              {(live.skipped ?? []).slice(0, 6).map((s: Any, i: number) => (
                <Line key={i} k={`skip ${s.sym}`} v={s.why} />
              ))}
              {live.error && <Line k="Error" v={live.error} className="v2-down" />}
            </div>
          )}
        </Panel>
      </div>
      <Panel title="Paper closes" flush>
        <div className="v2-table-wrap">
          <table className="v2-table">
            <thead>
              <tr>
                <th>exit</th>
                <th>symbol</th>
                <th>side</th>
                <th>config</th>
                <th className="num">entry</th>
                <th className="num">exit</th>
                <th className="num">net</th>
                <th className="num">pnl</th>
                <th>reason</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((t, i) => (
                <tr key={i}>
                  <td>{fmt.time(t.exit_t)}</td>
                  <td>{t.sym}</td>
                  <td>{t.side > 0 ? "long" : "short"}</td>
                  <td className="v2-mono">{t.cfg}</td>
                  <td className="num">{fmt.num(t.entry, 4)}</td>
                  <td className="num">{fmt.num(t.exit, 4)}</td>
                  <td className={`num ${tone(t.r)}`}>{fmt.pct(t.r * 100)}</td>
                  <td className={`num ${tone(t.pnl)}`}>{fmt.usd(t.pnl)}</td>
                  <td>{t.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <Panel
        title="Position cost and auto-adjust"
        sub={`model ${(d.cost?.model * 100).toFixed(3)} % round trip (taker ${(d.cost?.fees?.taker * 100).toFixed(3)} % + slippage ${(d.cost?.fees?.slippage * 100).toFixed(3)} % per side) · measured live: ${d.liveCost ? `${(d.liveCost.rt * 100).toFixed(3)} % from ${d.liveCost.fills} fills (fee ${(d.liveCost.fee * 100).toFixed(3)} %, slippage ${(d.liveCost.slip * 100).toFixed(3)} % per side)` : "not enough live fills yet (40 needed)"}`}
        flush
      >
        {(d.adjust ?? []).length ? (
          <div className="v2-table-wrap">
            <table className="v2-table">
              <thead>
                <tr>
                  <th>strategy config set</th>
                  <th className="num">last N PF</th>
                  <th className="num">level</th>
                  <th className="num">min SL</th>
                  <th className="num">min trail</th>
                  <th>state</th>
                  <th>last change</th>
                </tr>
              </thead>
              <tbody>
                {(d.adjust as Any[]).map((a) => (
                  <tr key={a.set}>
                    <td style={{ fontWeight: 600 }}>{a.set}</td>
                    <td className="num">
                      {fmt.pf(a.pf)} <span className="v2-muted">({a.n})</span>
                    </td>
                    <td className="num">{a.level}</td>
                    <td className="num">{fmt.frac(a.minSl)}</td>
                    <td className="num">{fmt.frac(a.minTrail)}</td>
                    <td>
                      {a.pausedUntil > Date.now() ? (
                        <Pill kind="bad">paused until {fmt.time(a.pausedUntil)}</Pill>
                      ) : a.level > 0 ? (
                        <Pill kind="acc">adjusted</Pill>
                      ) : (
                        <Pill>base</Pill>
                      )}
                    </td>
                    <td className="v2-muted">{a.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>
            No set has {15} closed positions yet — the adjuster judges each set after its last N
            positions.
          </Empty>
        )}
      </Panel>

      <Panel
        title="Control orders · Overall"
        sub={`one position per symbol + direction, sized from every lane holding it · ${(d.liveSettings?.mode ?? "overall") === "overall" ? "Live mode: overall" : "Live mode: entries (preview only)"} · $${d.liveSettings?.notionalUsd} × lane volume × ${d.liveSettings?.ratio ?? 1}, cap $${d.liveSettings?.maxNotionalUsd ?? (d.liveSettings?.notionalUsd ?? 6) * 5}, adjust beyond ±${Math.round((d.liveSettings?.rebalancePct ?? 0.25) * 100)}%`}
        right={
          d.control ? (
            <Pill kind={d.control.reconnected ? "bad" : d.control.unchanged ? undefined : "acc"}>
              {d.control.reconnected
                ? "connection changed"
                : d.control.unchanged
                  ? "in sync"
                  : "adjusted"}
            </Pill>
          ) : undefined
        }
        flush
      >
        {d.control && (
          <div
            className="v2-muted"
            style={{
              padding: "8px 12px",
              fontSize: "var(--v-fs-xs)",
              fontFamily: "var(--v-mono, monospace)",
              display: "flex",
              flexWrap: "wrap",
              gap: "4px 14px",
            }}
          >
            <span>conn #{d.control.connHash}</span>
            <span>targets #{d.control.targetsHash}</span>
            <span>book #{d.control.bookHash}</span>
            <span>plan #{d.control.planHash}</span>
            <span>
              steps {d.control.steps} · changes {d.control.changes}
              {d.control.suppressed
                ? ` · ${d.control.suppressed} lane order(s) held back after a position was closed outside CTS-A-O`
                : ""}
            </span>
            <span>{fmt.ago(d.control.at)}</span>
          </div>
        )}
        {(d.controlPreview?.targets ?? []).length ? (
          <div className="v2-table-wrap">
            <table className="v2-table">
              <thead>
                <tr>
                  <th>symbol</th>
                  <th>direction</th>
                  <th className="num">lanes</th>
                  <th className="num">volume</th>
                  <th className="num">target $</th>
                  <th className="num">target qty</th>
                  <th className="num">held qty</th>
                  <th className="num">stop</th>
                </tr>
              </thead>
              <tbody>
                {(d.controlPreview.targets as Any[]).map((t) => {
                  const held = (d.control?.held as Any[] | undefined)?.find(
                    (h) => h.key === t.key,
                  )?.qty;
                  return (
                    <tr key={t.key}>
                      <td style={{ fontWeight: 600 }}>{t.sym}</td>
                      <td className={t.side === 1 ? "v2-up" : "v2-down"}>
                        {t.side === 1 ? "long" : "short"}
                      </td>
                      <td className="num">{t.lanes}</td>
                      <td className="num">{fmt.num(t.vol, 2)}</td>
                      <td className="num">{fmt.num(t.notional, 2)}</td>
                      <td className="num">{fmt.num(t.qty, 4)}</td>
                      <td className="num">{held === undefined ? "–" : fmt.num(held, 4)}</td>
                      <td className="num">{fmt.frac(t.stopDist)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>No control positions — no lane holds a paper position right now.</Empty>
        )}
        {(d.control?.actions ?? []).length > 0 && (
          <div className="v2-muted" style={{ padding: "8px 12px", fontSize: "var(--v-fs-xs)" }}>
            last actions:{" "}
            {(d.control.actions as Any[])
              .map((a) => `${a.kind} ${a.key} ${fmt.num(a.qty, 4)}${a.ok ? "" : ` ✗ ${a.msg}`}`)
              .join(" · ")}
          </div>
        )}
      </Panel>

      <Panel title="Live orders" sub="own CTSB tickets only" flush>
        {d.liveOrders.length ? (
          <div className="v2-table-wrap">
            <table className="v2-table">
              <thead>
                <tr>
                  <th>time</th>
                  <th>coid</th>
                  <th>symbol</th>
                  <th>kind</th>
                  <th className="num">qty</th>
                  <th className="num">px</th>
                  <th>status</th>
                </tr>
              </thead>
              <tbody>
                {d.liveOrders.map((o: Any) => (
                  <tr key={o.coid}>
                    <td>{fmt.time(o.at)}</td>
                    <td className="v2-mono">{o.coid}</td>
                    <td>{o.sym}</td>
                    <td>{o.kind}</td>
                    <td className="num">{o.qty}</td>
                    <td className="num">{fmt.num(o.px, 4)}</td>
                    <td>
                      {o.status === "ok" ? (
                        <Pill kind="ok">ok</Pill>
                      ) : (
                        <Pill kind="bad">{o.status}</Pill>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>
            No live orders — the Live stage is off unless enabled in Settings and CTS_CORE_LIVE=1 on
            the host.
          </Empty>
        )}
      </Panel>
    </>
  );
}

export function MarketPage() {
  const { data, error } = usePoll(() => coreMarket(), 15000);
  const d = data as Any;
  if (!d) return <>{error ? <ErrorNote error={error} /> : <Empty>Loading…</Empty>}</>;
  return (
    <>
      <ErrorNote error={error} />
      <Panel
        title="Universe"
        sub={`${d.symbols.length} symbols · ${d.tfMin}m bars · source ${d.source} · ranked by 24h quote volume`}
        flush
      >
        <div className="v2-table-wrap">
          <table className="v2-table">
            <thead>
              <tr>
                <th>symbol</th>
                <th className="num">last</th>
                <th className="num">24h</th>
                <th className="num">24h quote vol</th>
                <th className="num">bars</th>
                <th>from</th>
                <th>to</th>
                <th>last 24h</th>
              </tr>
            </thead>
            <tbody>
              {d.symbols.map((s: Any) => (
                <tr key={s.sym}>
                  <td style={{ fontWeight: 600 }}>{s.sym}</td>
                  <td className="num">{fmt.num(s.last, 4)}</td>
                  <td className={`num ${tone(s.change_pct)}`}>{fmt.pct(s.change_pct)}</td>
                  <td className="num">{fmt.num(s.quote_vol / 1e6, 1)}M</td>
                  <td className="num">{s.bars}</td>
                  <td>{fmt.time(s.first_t)}</td>
                  <td>{fmt.time(s.last_t)}</td>
                  <td>
                    <Sparkline values={d.spark[s.sym] ?? []} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
