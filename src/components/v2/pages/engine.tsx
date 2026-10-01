import { useState } from "react";
import { coreConns, coreControl, coreEngine } from "../api-conn";
import { useConn } from "../conn";
import { PrehistoricPanel } from "../prehistoric";
import { MultiArcGauge } from "../charts";
import { Confirm, Empty, ErrorNote, fmt, Kpi, Line, Panel, Pill, Switch, usePoll } from "../ui";

type Any = any;

export function EnginePage() {
  const { data, error, refresh } = usePoll(() => coreEngine(), 3000);
  const [busy, setBusy] = useState(false);
  const [actErr, setActErr] = useState<string | null>(null);
  const [ask, setAsk] = useState<null | "stop" | "resync">(null);
  const d = data as Any;
  if (!d) return <>{error ? <ErrorNote error={error} /> : <Empty>Loading…</Empty>}</>;
  const st = d.status;
  const act = async (action: "start" | "stop" | "recompute" | "resync") => {
    setBusy(true);
    try {
      await coreControl({ data: { action } });
      setActErr(null);
    } catch (e) {
      setActErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      void refresh();
    }
  };
  return (
    <>
      <ErrorNote error={actErr ?? error} />
      <Connections />
      <PrehistoricPanel
        status={st}
        minPf={d.settings?.gates?.minPf ?? 1.1}
        maxDdtH={d.settings?.gates?.maxDdtH ?? 35}
      />
      <Panel
        title="Runtime"
        sub="continuous loop · time-sliced compute · watchdog restarts a stale loop"
        right={
          <>
            <button
              type="button"
              className="v2-btn"
              disabled={busy}
              onClick={() => act("recompute")}
            >
              Recompute
            </button>
            <button
              type="button"
              className="v2-btn"
              disabled={busy}
              onClick={() => setAsk("resync")}
            >
              Resync market
            </button>
            {st.state === "stopped" ? (
              <button
                type="button"
                className="v2-btn primary"
                disabled={busy}
                onClick={() => act("start")}
              >
                Start
              </button>
            ) : (
              <button
                type="button"
                className="v2-btn"
                disabled={busy}
                onClick={() => setAsk("stop")}
              >
                Stop
              </button>
            )}
          </>
        }
      >
        <div className="v2-grid v2-cols-3">
          <MultiArcGauge
            size={170}
            center={`${Math.round(st.progress * 100)}%`}
            centerSub={st.stage || st.state}
            rings={[
              {
                label: `Stage ${st.stage || "–"}`,
                value: st.progress,
                display: `${Math.round(st.progress * 100)}%`,
              },
              {
                label: "Cycle vs budget",
                value: Math.min(1, st.lastCycleMs / 20000),
                display: `${fmt.num(st.lastCycleMs)} ms`,
              },
              {
                label: "Heap",
                value: Math.min(1, d.process.heap / 2e9),
                display: fmt.bytes(d.process.heap),
              },
              { label: "SQLite", value: Math.min(1, d.bytes / 5e8), display: fmt.bytes(d.bytes) },
            ]}
          />
          <div className="v2-lines">
            <Line
              k="State"
              v={<Pill kind={st.state === "error" ? "bad" : "ok"}>{st.state}</Pill>}
            />
            <Line k="Label" v={st.label || "–"} />
            <Line k="Cycles · computes" v={`${st.cycles} · ${st.computes}`} />
            <Line k="Last compute" v={`${fmt.num(st.lastComputeMs)} ms`} />
            <Line k="Heartbeat" v={fmt.ago(st.heartbeat)} />
            <Line k="Next cycle" v={fmt.time(st.nextCycleAt)} />
            <Line k="Started" v={fmt.time(st.startedAt)} />
            {st.error && <Line k="Error" v={st.error} className="v2-down" />}
          </div>
          <div className="v2-lines">
            <Line k="Source" v={st.source} />
            <Line k="Symbols" v={st.symbols.length} />
            <Line k="Last closed bar" v={fmt.time(st.lastBarT)} />
            <Line k="Node" v={d.process.node} />
            <Line k="RSS" v={fmt.bytes(d.process.rss)} />
            <Line k="Uptime" v={fmt.h(d.process.uptime / 3600)} />
          </div>
        </div>
      </Panel>
      <Confirm
        open={ask !== null}
        title={ask === "stop" ? "Stop the engine?" : "Resync the market?"}
        body={
          ask === "stop"
            ? "The running compute is abandoned at its next yield. Paper positions stay as they are; nothing is sent to an exchange. Start resumes with a fresh compute."
            : "All candles are dropped and the universe is backfilled again from BingX (about 15–30 s for 40 symbols), then everything is recomputed."
        }
        confirm={ask === "stop" ? "Stop" : "Resync"}
        danger={ask === "stop"}
        onCancel={() => setAsk(null)}
        onConfirm={() => {
          const a = ask;
          setAsk(null);
          if (a) void act(a);
        }}
      />
      <div className="v2-grid v2-cols-2">
        <Panel
          title="Compute phases"
          sub="total time · longest uninterrupted slice (what can delay requests)"
          flush
        >
          <div className="v2-table-wrap">
            <table className="v2-table">
              <thead>
                <tr>
                  <th>phase</th>
                  <th className="num">total</th>
                  <th className="num">max slice</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {Object.entries((st.phases ?? {}) as Record<string, Any>).map(([k, v]) => (
                  <tr key={k}>
                    <td>{k}</td>
                    <td className="num">{fmt.num(v.ms)} ms</td>
                    <td
                      className={`num ${v.maxSliceMs > 150 ? "v2-down" : v.maxSliceMs > 60 ? "v2-warn" : "v2-up"}`}
                    >
                      {fmt.num(v.maxSliceMs)} ms
                    </td>
                    <td>
                      {v.maxSliceMs > 150 ? (
                        <Pill kind="bad">blocking</Pill>
                      ) : (
                        <Pill kind="ok">responsive</Pill>
                      )}
                      {v.slowest ? (
                        <div className="v2-muted" style={{ fontSize: "var(--v-fs-xs)" }}>
                          slowest step: {v.slowest}
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
        <Panel title="Event loop" sub="delay measured during the last compute">
          <div className="v2-lines">
            <Line k="p50" v={`${fmt.num(st.loop?.p50, 1)} ms`} />
            <Line
              k="p99"
              v={`${fmt.num(st.loop?.p99, 1)} ms`}
              className={st.loop?.p99 > 100 ? "v2-down" : "v2-up"}
            />
            <Line
              k="max"
              v={`${fmt.num(st.loop?.max, 0)} ms`}
              className={st.loop?.max > 250 ? "v2-down" : st.loop?.max > 100 ? "v2-warn" : "v2-up"}
            />
            <Line
              k={`Main pairs (Base ${fmt.num(st.basePassed ?? 0)} passed of ${fmt.num(st.baseEvaluated ?? 0)})`}
              v={st.mainPairs}
            />
            <Line k="Compute queued" v={st.pending ? "yes" : "no"} />
            <Line k="Base workers" v={st.workers ?? "–"} />
            <Line
              k="Tick (positions + live)"
              v={
                st.tick
                  ? `${fmt.num(st.tick.ms, 1)} ms · #${fmt.num(st.tick.count)} · ${st.tick.open} open${st.tick.error ? ` · ${st.tick.error}` : ""}`
                  : "–"
              }
              className={st.tick?.error ? "v2-down" : ""}
            />
            <Line
              k="Price stream"
              v={
                st.tick?.stream
                  ? `${st.tick.stream.connected ? "connected" : "reconnecting"} · ${st.tick.stream.symbols} symbols · ${fmt.num(st.tick.stream.rate, 1)}/s · age ${Number.isFinite(st.tick.stream.ageMs) ? `${fmt.num(st.tick.stream.ageMs)} ms` : "–"}`
                  : "off (synthetic / not started)"
              }
              className={st.tick?.stream && !st.tick.stream.connected ? "v2-down" : "v2-up"}
            />
          </div>
        </Panel>
      </div>
      <Panel
        title="Self-audit"
        sub={
          d.audit
            ? `${d.audit.checks.length} invariants recomputed after the last paper step · ${d.audit.ms} ms · ${new Date(d.audit.at).toLocaleTimeString()}`
            : "runs after the first paper step"
        }
        right={
          d.audit ? (
            <Pill kind={d.audit.ok ? "ok" : "bad"}>{d.audit.ok ? "all pass" : "failing"}</Pill>
          ) : null
        }
        flush
      >
        {d.audit ? (
          <div className="v2-table-wrap">
            <table className="v2-table">
              <thead>
                <tr>
                  <th>Check</th>
                  <th>Result</th>
                  <th>Detail</th>
                </tr>
              </thead>
              <tbody>
                {d.audit.checks.map((c: Any) => (
                  <tr key={c.name}>
                    <td>{c.name}</td>
                    <td className={c.ok ? "v2-up" : "v2-down"}>{c.ok ? "pass" : "FAIL"}</td>
                    <td className="v2-muted" style={{ fontSize: "var(--v-fs-xs)" }}>
                      {c.detail}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>waiting for the first paper step</Empty>
        )}
      </Panel>
      <div className="v2-grid v2-cols-4">
        {d.tables.map((t: Any) => (
          <Kpi key={t.table} label={t.table} value={fmt.num(t.rows)} />
        ))}
      </div>
      <div className="v2-grid v2-cols-2">
        <Panel title="Compute runs" flush>
          <div className="v2-table-wrap" style={{ maxHeight: 380 }}>
            <div className="v2-table-wrap">
              <table className="v2-table">
                <thead>
                  <tr>
                    <th>ended</th>
                    <th className="num">items</th>
                    <th className="num">ms</th>
                    <th>note</th>
                  </tr>
                </thead>
                <tbody>
                  {d.runs.map((r: Any) => (
                    <tr key={r.id}>
                      <td>{fmt.time(r.ended)}</td>
                      <td className="num">{fmt.num(r.items)}</td>
                      <td className="num">{fmt.num(r.ms)}</td>
                      <td className="v2-muted">{r.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Panel>
        <Panel title="Events" flush>
          <div className="v2-table-wrap" style={{ maxHeight: 380 }}>
            <div className="v2-table-wrap">
              <table className="v2-table">
                <thead>
                  <tr>
                    <th>time</th>
                    <th>level</th>
                    <th>message</th>
                  </tr>
                </thead>
                <tbody>
                  {d.events.map((e: Any) => (
                    <tr key={e.id}>
                      <td>{fmt.time(e.at)}</td>
                      <td>
                        <Pill
                          kind={e.level === "error" ? "bad" : e.level === "warn" ? undefined : "ok"}
                        >
                          {e.level}
                        </Pill>
                      </td>
                      <td style={{ whiteSpace: "normal" }}>{e.msg}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Panel>
      </div>
    </>
  );
}

/** Every exchange connection runs its own runtime side by side; each can be switched on or off. */
function Connections() {
  const { conn, setConn, last } = useConn();
  const { data, error, refresh } = usePoll(() => coreConns(), 5000);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const list = ((data as Any)?.conns ?? []) as Any[];
  const toggle = async (c: string, on: boolean) => {
    setBusy(c);
    try {
      await coreControl({ data: { action: on ? "connOn" : "connOff", conn: c } });
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
      void refresh();
    }
  };
  return (
    <Panel title="Connections" sub="one runtime per connection, running in parallel · the pages show the selected one" flush>
      <ErrorNote error={err ?? error} />
      <div className="v2-table-wrap">
        <table className="v2-table">
          <thead>
            <tr>
              <th>connection</th>
              <th>runs</th>
              <th>state</th>
              <th>keys</th>
              <th>live</th>
              <th className="num">computes</th>
              <th className="num">sim PF</th>
              <th className="num">paper P&amp;L</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {list.map((c) => {
              const e = last[c.conn];
              const state = e ? e.state : c.state;
              return (
                <tr key={c.conn} aria-selected={c.conn === conn}>
                  <td>
                    <b>{c.label}</b> {c.primary && <Pill>primary</Pill>} {c.network === "mainnet" && <Pill kind="bad">mainnet</Pill>}
                  </td>
                  <td>
                    <Switch
                      label={`run ${c.label}`}
                      checked={c.enabled}
                      disabled={c.primary || busy === c.conn}
                      onChange={(v) => toggle(c.conn, v)}
                    />
                  </td>
                  <td>
                    {state}
                    {(state === "computing" || state === "backfill") && e ? ` · ${e.stage} ${Math.round(e.progress * 100)}%` : ""}
                    {c.error && <div className="v2-down" style={{ fontSize: "var(--v-fs-xs)" }}>{c.error}</div>}
                  </td>
                  <td>{c.keys}</td>
                  <td>{c.live?.enabled ? (c.armed ? <Pill kind="bad">on</Pill> : <Pill>on (host not armed)</Pill>) : "off"}</td>
                  <td className="num">{e?.computes ?? c.computes}</td>
                  <td className="num">{c.sim ? fmt.pf(c.sim.pf) : "–"}</td>
                  <td className="num">{c.paper ? fmt.usd(c.paper.equity) : "–"}</td>
                  <td>
                    {c.conn !== conn && (
                      <button type="button" className="v2-btn" onClick={() => setConn(c.conn)}>
                        Show
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
