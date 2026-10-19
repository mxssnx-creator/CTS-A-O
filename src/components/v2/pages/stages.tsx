import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { coreListing, coreOverview, coreResults } from "../api-conn";
import { Empty, ErrorNote, fmt, Line, liveState, Panel, pfTone, Pill, Seg, tone, usePoll } from "../ui";

type Any = any;

export function StagesPage() {
  const { data, error } = usePoll(() => coreOverview(), 5000);
  const { data: ranked } = usePoll(
    () => coreResults({ data: { stage: 3, sort: "rank", limit: 40 } }),
    15000,
  );
  const d = data as Any;
  if (!d) return <>{error ? <ErrorNote error={error} /> : <Empty>Loading…</Empty>}</>;
  const c = d.counts ?? {};
  const g = d.settings.gates;
  const tg = d.settings.toggles;
  const pipe = d.pipeline;
  const port = pipe?.portfolio;
  const ls = liveState(d.settings.live.enabled, d.live);
  // engine configs and signal configs apart (a signal config carries a "sig-" indication: bot|ind|…), as Overview
  const selected = (d.paper.selected ?? []) as string[];
  const sigSel = selected.filter((id) => (id.split("|")[1] ?? "").includes("sig-")).length;
  const realSel = selected.length - sigSel;
  return (
    <>
      <ErrorNote error={error} />
      <Panel
        title="Coordination"
        sub="each stage only evaluates what passed the previous one — no overload, full coverage in Base"
      >
        <div className="v2-funnel">
          <div className="v2-stage">
            <div className="t">1 · Base</div>
            <div className="n">{fmt.num(d.status?.baseEvaluated ?? c.base)}</div>
            <p>
              Every indication × bot type with the base protect, plus {d.wf.tapes} independent
              strategy tapes (normal, trailing, DCA, DCA Active × {d.wf.protects} protect variants).
              Always computed, whatever the toggles.
            </p>
          </div>
          <div className="v2-stage">
            <div className="t">2 · Main</div>
            <div className="n">{fmt.num(c.main)}</div>
            <p>
              In-sample PF ≥ {g.minPf}, DDT ≤ max({g.minDdtH ?? 0} h, {g.maxDdtH} h per 72 h), ≥{" "}
              {g.minTrades} trades; pair must be
              parameter-robust. Refined on the protect grid.
            </p>
          </div>
          <div className="v2-stage">
            <div className="t">3 · Real</div>
            <div className="n">{realSel}</div>
            <p>
              {sigSel || d.status?.signals?.enabled ? `${realSel} engine · ${sigSel} signal configs. ` : ""}
              Pre-historic window {d.wf.preH}h, validate last-N{" "}
              {d.wf.validLastN ? d.wf.validLastN : "off"}
              {d.wf.signalValidLastN !== undefined && d.wf.signalValidLastN !== d.wf.validLastN
                ? ` (signals ${d.wf.signalValidLastN || "off"})`
                : ""}{" "}
              (PF and DDT) before a seat. End stage and
              live re-check last-N {d.wf.lastN ? d.wf.lastN : "off"} (PF and DDT), then Block.
              Additional strategies (Trailing, DCA, Axis) pass the same gates.
            </p>
          </div>
          <div className="v2-stage">
            <div className="t">4 · Live</div>
            <div className="n">{ls.on ? "on" : "off"}</div>
            <p>
              {!ls.on
                ? "Disabled in settings"
                : ls.blocked
                  ? `blocked: ${ls.blocked}`
                  : (d.live?.reason ?? "armed")}
              . Own CTSB tags only; a foreign side is skipped in hedge mode, the whole symbol in
              one-way mode or for a foreign order with no position side.
            </p>
          </div>
        </div>
      </Panel>

      <Panel
        title="Timeframe lanes"
        sub="1m base, 5m / 15m / 30m derived · m+ = combined (agrees with every higher timeframe) · each lane independent through every stage · sim = the simulated run (Σ trade %), paper = the open paper book (virtual) · a position is one symbol × direction episode: a real position held by several lanes counts in each lane, the total row counts it once"
        flush
      >
        {d.lanes?.length ? (
          <div className="v2-table-wrap">
            <table className="v2-table">
              <thead>
                <tr>
                  <th>Lane</th>
                  <th>Base evaluated</th>
                  <th>Base passed</th>
                  <th>Main tapes</th>
                  <th>Sim positions / orders</th>
                  <th>Sim PF</th>
                  <th>Sim net (Σ trade %)</th>
                  <th>Sim WR</th>
                  <th>Paper open pos / orders</th>
                </tr>
              </thead>
              <tbody>
                {d.lanes.map((l: Any) => (
                  <tr key={l.lane}>
                    <td style={{ fontWeight: 600 }}>{l.lane}</td>
                    <td>{fmt.num(l.base)}</td>
                    <td>{fmt.num(l.passed)}</td>
                    <td>{fmt.num(l.tapes)}</td>
                    <td>
                      {fmt.num(l.positions)} / {fmt.num(l.n)}
                    </td>
                    <td className={l.n ? pfTone(l.pf) : ""}>{l.n ? fmt.pf(l.pf) : "–"}</td>
                    <td className={l.n ? tone(l.net) : ""}>{l.n ? fmt.pct(l.net) : "–"}</td>
                    <td>{l.n ? fmt.ratio(l.wr) : "–"}</td>
                    <td>
                      {l.open?.positions ?? 0} / {l.open?.orders ?? 0}
                    </td>
                  </tr>
                ))}
                <tr className="v2-muted">
                  <td style={{ fontWeight: 600 }}>all lanes</td>
                  <td colSpan={3} />
                  <td>
                    {fmt.num(d.sim?.positions)} / {fmt.num(d.sim?.stats?.n)}
                  </td>
                  <td>{fmt.pf(d.sim?.stats?.pf)}</td>
                  <td>{fmt.pct(d.sim?.stats?.net)}</td>
                  <td>{fmt.ratio(d.sim?.stats?.wr)}</td>
                  <td>
                    {d.paper?.book?.positions ?? 0} / {d.paper?.book?.orders ?? 0}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>No compute yet</Empty>
        )}
      </Panel>

      <div className="v2-grid v2-cols-3">
        <Panel title="Execution toggles" sub="filters execution only">
          <div className="v2-lines">
            {Object.entries(tg as Record<string, boolean>).map(([k, v]) => (
              <Line key={k} k={k} v={<Pill kind={v ? "ok" : undefined}>{v ? "on" : "off"}</Pill>} />
            ))}
            <Line
              k="Block"
              v={`+${d.settings.block.ratio}/level · 1–${d.settings.block.maxLevel} · cap ${d.settings.block.maxMult}×`}
            />
            <Line
              k="DCA"
              v={`${d.settings.dca.levels} levels · step ${fmt.frac(d.settings.dca.step)}`}
            />
          </div>
        </Panel>
        <Panel title="Pipeline run" sub={pipe ? fmt.ago(pipe.at) : ""}>
          {pipe ? (
            <div className="v2-lines">
              <Line
                k="Universe"
                v={`${pipe.universe.symbols.length} symbols · ${fmt.num(pipe.universe.bars)} bars`}
              />
              <Line k="In-sample / OOS split" v={fmt.time(pipe.universe.splitT)} />
              <Line k="Base (S1)" v={`${pipe.s1} combos · ${fmt.num(pipe.timings.S1)} ms`} />
              <Line k="Main (S2)" v={`${pipe.s2} runs · ${fmt.num(pipe.timings.S2)} ms`} />
              <Line
                k="Real eval (S3)"
                v={`${pipe.ranked} configs · ${fmt.num(pipe.timings.S3)} ms`}
              />
            </div>
          ) : (
            <Empty>–</Empty>
          )}
        </Panel>
        <Panel title="Validated portfolio" sub="in-sample picked, out-of-sample reported">
          {port ? (
            <div className="v2-lines">
              <Line k="Members" v={port.members.length} />
              <Line k="Hour guard" v={port.guardPct ? `${port.guardPct}%` : "off"} />
              <Line
                k="In-sample PF · net"
                v={`${fmt.pf(port.is.pf)} · ${fmt.pct(port.is.net)}`}
                className={pfTone(port.is.pf, g.minPf)}
              />
              <Line
                k="Out-of-sample PF · net"
                v={`${fmt.pf(port.oos.pf)} · ${fmt.pct(port.oos.net)}`}
                className={pfTone(port.oos.pf, g.minPf)}
              />
              <Line k="OOS green hours" v={`${port.oos.greenHours}/${port.oos.hours}`} />
            </div>
          ) : (
            <Empty>–</Empty>
          )}
        </Panel>
      </div>

      <Panel
        title="Ranked (Main → Real candidates)"
        sub="last-N chosen in-sample, validated out-of-sample; continuous window evals"
        flush
      >
        <div className="v2-table-wrap">
          <table className="v2-table">
            <thead>
              <tr>
                <th>#</th>
                <th>config</th>
                <th className="num">n</th>
                <th className="num">PF</th>
                <th className="num">net</th>
                <th className="num">best N</th>
                <th className="num">OOS n</th>
                <th className="num">OOS PF</th>
                <th className="num">OOS net</th>
                <th>last-N</th>
                <th className="num">eval pass</th>
                <th>armed</th>
              </tr>
            </thead>
            <tbody>
              {((ranked as Any)?.rows ?? []).map((r: Any) => (
                <tr key={r.id}>
                  <td>{r.rank}</td>
                  <td>
                    <Link to="/v2/config/$id" params={{ id: r.id }} className="v2-mono">
                      {r.id}
                    </Link>
                  </td>
                  <td className="num">{r.n}</td>
                  <td className={`num ${pfTone(r.pf, g.minPf)}`}>{fmt.pf(r.pf)}</td>
                  <td className={`num ${tone(r.net)}`}>{fmt.pct(r.net)}</td>
                  <td className="num">{r.best_n || "all"}</td>
                  <td className="num">{r.oos_n}</td>
                  <td className={`num ${pfTone(r.oos_pf, g.minPf)}`}>{fmt.pf(r.oos_pf)}</td>
                  <td className={`num ${tone(r.oos_net)}`}>{fmt.pct(r.oos_net)}</td>
                  <td>{r.lastn_ok ? <Pill kind="ok">pass</Pill> : <Pill kind="bad">fail</Pill>}</td>
                  <td className="num">{fmt.ratio(r.eval_pass)}</td>
                  <td>{r.armed ? <Pill kind="acc">armed</Pill> : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <SetListings minPf={g.minPf} />
    </>
  );
}

const PAGE = 50;

/**
 * The last paper step's listings (coreListing, built once per step): the engine configs it validated, per range with
 * that range's PF taken together on the validation windows, the signal units active, and the engine configs proven live.
 */
function SetListings(props: { minPf: number }) {
  const [kind, setKind] = useState<"validated" | "active" | "proven">("validated");
  const [range, setRange] = useState("");
  const [page, setPage] = useState(0);
  const { data } = usePoll(
    () => coreListing({ data: { kind, range: range || undefined, offset: page * PAGE, limit: PAGE } }),
    10000,
    [kind, range, page],
  );
  const d = data as Any;
  const pages = d?.total ? Math.ceil(d.total / PAGE) : 0;
  return (
    <Panel title="Validated and active sets" sub="the last paper step's seats, signal units and proven configs, a page at a time">
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <Seg
          value={kind}
          label="list"
          options={[
            { value: "validated", label: "Validated sets" },
            { value: "active", label: "Active signal units" },
            { value: "proven", label: "Proven live" },
          ]}
          onChange={(v) => {
            setKind(v);
            setPage(0);
          }}
        />
        {kind === "validated" && Array.isArray(d?.byRange) && (
          <Seg
            value={range}
            label="range"
            options={[{ value: "", label: "All" }, ...d.byRange.map((x: Any) => ({ value: x.range, label: `${x.range} ${x.validated} · PF ${fmt.pf(x.pf)}` }))]}
            onChange={(v) => {
              setRange(v);
              setPage(0);
            }}
          />
        )}
      </div>
      {!d ? (
        <Empty>Loading…</Empty>
      ) : !d.ready ? (
        <Empty>No paper step yet.</Empty>
      ) : kind === "proven" && !d.proofOn ? (
        <Empty>The engine proof is off (live.engineProofN).</Empty>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="v2-table" style={{ fontSize: "var(--v-fs-sm)" }}>
            <thead>
              {kind === "validated" ? (
                <tr>
                  <th>Config</th>
                  <th>Range</th>
                  <th className="num">PF</th>
                  <th className="num">Closes</th>
                  <th className="num">Net</th>
                  <th className="num">DDT h</th>
                  <th className="num">Score</th>
                </tr>
              ) : kind === "active" ? (
                <tr>
                  <th>Signal</th>
                  <th>Symbol</th>
                  <th>Side</th>
                </tr>
              ) : (
                <tr>
                  <th>Config</th>
                </tr>
              )}
            </thead>
            <tbody>
              {(d.rows as Any[]).map((x: Any, i: number) =>
                kind === "validated" ? (
                  <tr key={x.id}>
                    <td>
                      <Link to="/v2/config/$id" params={{ id: x.id }} className="v2-mono">
                        {x.id}
                      </Link>
                    </td>
                    <td>{x.range}</td>
                    <td className={`num ${pfTone(x.pf, props.minPf)}`}>{fmt.pf(x.pf)}</td>
                    <td className="num">{x.n}</td>
                    <td className={`num ${tone(x.net)}`}>{fmt.pct(x.net)}</td>
                    <td className="num">{fmt.num(x.ddt)}</td>
                    <td className="num">{fmt.num(x.score)}</td>
                  </tr>
                ) : kind === "active" ? (
                  <tr key={`${x.bot}|${x.ind}|${x.sym}|${x.side}`}>
                    <td>
                      {x.bot} · {x.ind}
                    </td>
                    <td>{x.sym}</td>
                    <td>{x.side > 0 ? "long" : "short"}</td>
                  </tr>
                ) : (
                  <tr key={x.id ?? i}>
                    <td>{x.id}</td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}>
            <button className="v2-btn" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
              Previous
            </button>
            <span>
              {fmt.num(d.total)} · page {pages ? page + 1 : 0} of {pages}
            </span>
            <button className="v2-btn" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>
              Next
            </button>
          </div>
        </div>
      )}
    </Panel>
  );
}
