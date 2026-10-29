import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { coreListing, coreOverview, coreResults } from "../api-conn";
import { signalTypeLabel, signalUnitRowKey } from "../signal-units";
import { BaseConfigCounts } from "../base-config-counts";
import { unitStatsPfText } from "../accounting";
import { combineValidatedSetPf } from "../../../core/validated-set-pf";
import { validationCohortView } from "../validation-cohort";
import { pooledBasePfText } from "../progression";
import { PromotionEvidence } from "../promotion-evidence";
import { StrategyCoverageTable } from "../strategy-coverage";
import {
  Empty,
  ErrorNote,
  fmt,
  Kpi,
  Line,
  liveState,
  Panel,
  pfTone,
  Pill,
  Seg,
  tone,
  usePoll,
} from "../ui";

type Any = any;

const effectivePfText = (x: Any) => !x?.n ? "–"
  : x.pfBasis !== "effective-model-returns" ? "Basis unavailable"
    : x.noLoss ? "No losses" : fmt.pf(x.pf);

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
  const exits = d.status?.exitStrategies;
  const exitHistory = exits?.history ?? {};
  const activeKinds = (d.status?.listings?.byKind ?? []) as Any[];
  const executedKinds = (d.sim?.byKind ?? {}) as Record<string, Any>;
  const strategyKinds = [
    ...new Set([...activeKinds.map((x) => x.kind), ...Object.keys(executedKinds)]),
  ].sort();
  const validation = validationCohortView(d.status?.postBaseValidation);
  const activeMean = combineValidatedSetPf(activeKinds.map((x) => x.setPf));
  const activeValidationNoLoss = activeMean?.noLoss ?? false;
  const activeValidationPf = activeMean?.pf ?? null;
  const activeValidationCloses = activeKinds.reduce((n, x) => n + (x.validationCloses ?? 0), 0);
  const activeValidationPfText = (pf: number | null, noLoss: boolean) =>
    noLoss ? "∞ (no losses)" : fmt.pf(pf);
  return (
    <>
      <ErrorNote error={error} />
      <Panel
        title="Coordination"
        sub="All types: unfiltered source PF below 1 is normal. Configured PF gates above 1 apply from Base evaluation onward; later validation and Last-N gates remain independent."
      >
        <div className="v2-funnel">
          <div className="v2-stage">
            <div className="t">1 · Base</div>
            <div className="n">{fmt.num(d.status?.baseEvaluated ?? c.base)}</div>
            <p>
              Every indication × bot type is evaluated at Base; {d.wf.tapes} independent strategy
              tapes (Normal, capped Trailing, trailing-only, DCA, DCA Active and Axis across the
              configured protection variants) are built for later validation or measurement.
              Historic Exit has a separate Bot-free source set; each source first passes its own
              Base PF gate, then its candidates fit and validate on pre-run history. A computed tape
              is not an admitted or funded order.
            </p>
          </div>
          <div className="v2-stage">
            <div className="t">2 · Main</div>
            <div className="n">{validation.pfText} PF</div>
            <p>{validation.counts} validated · {fmt.frac(validation.fraction)} · {fmt.time(validation.at)} UTC. {validation.basisText}.</p>
            <p>
              In-sample return PF meets each range's effective floor (global {g.minPf}, with range
              overrides), DDT ≤ max({g.minDdtH ?? 0} h, {g.maxDdtH} h per 72 h), ≥ {g.minTrades}{" "}
              trades; pair must be parameter-robust. Refined on the protect grid.
            </p>
          </div>
          <div className="v2-stage">
            <div className="t">3 · Real</div>
            <div className="n">{activeValidationNoLoss ? "No losses" : fmt.pf(activeValidationPf)} PF</div>
            <p>{realSel} selected engine configs; {fmt.num(d.status?.listings?.validated)} / {fmt.num(d.status?.listings?.calculated)} validated at {fmt.time(d.status?.listings?.validation?.at)} UTC.</p>
            <p>
              {sigSel || d.status?.signals?.enabled
                ? `${realSel} engine · ${sigSel} signal configs. `
                : ""}
              Pre-historic window {d.wf.preH}h, validate last-N{" "}
              {d.wf.validLastN ? d.wf.validLastN : "off"}
              {d.wf.signalValidLastN !== undefined && d.wf.signalValidLastN !== d.wf.validLastN
                ? ` (signals ${d.wf.signalValidLastN || "off"})`
                : ""}{" "}
              (PF and DDT) before a seat. End stage and live re-check last-N{" "}
              {d.wf.lastN ? d.wf.lastN : "off"} (PF and DDT), then Block. Additional strategies
              (Historic Exit, Trailing, DCA, Axis) pass the same gates.
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

      <PromotionEvidence status={d.status?.livePromotion} />

      <Panel
        title="Strategy tape coverage"
        sub="Last completed research cohort, independent of the stage currently displayed"
      >
        <StrategyCoverageTable coverage={d.status?.strategyCoverage} />
      </Panel>

      <Panel
        title="Historic Exit sets"
        sub="five independent protection families over Bot-free indication, Tactic, and relation sources; each direction, timeframe lane, and source has its own Base → prehistory fit → holdout progression"
      >
        {exits ? (
          <div className="v2-lines">
            <Line
              k="Build / execution"
              v={`${exits.enabled ? "on" : "off"} / ${tg.exit !== false ? "on" : "off"}`}
            />
            <Line k="Independent Exit source lanes discovered" v={fmt.num(exits.pairs)} />
            <Line
              k="Standalone Base evaluated / passed / rejected"
              v={`${fmt.num(exits.baseEvaluated ?? exitHistory.baseEvaluated)} / ${fmt.num(exits.basePassed ?? exitHistory.basePassed)} / ${fmt.num(exits.baseRejected ?? exitHistory.baseRejected)}`}
            />
            <Line
              k="Independent protection families"
              v={`${fmt.num(exits.families ?? 5)} · Static SL, Adaptive SL, Trailing, Breakeven, Trailing only`}
            />
            <Line
              k="Tactic / relation lane sources"
              v={`${fmt.num(exits.tactics)} / ${fmt.num(exits.relations)} · ${
                [...(exits.timeframes ?? [])]
                  .sort((a: number, b: number) => a - b)
                  .map((tf: number) => `${tf}m`)
                  .join(", ") || "—"
              }`}
            />
            <Line k="Current configs (includes held lanes)" v={fmt.num(exits.configs)} />
            <Line
              k="Candidates / holdout evaluations / qualified"
              v={`${fmt.num(exitHistory.candidates)} / ${fmt.num(exitHistory.evaluated)} / ${fmt.num(exitHistory.qualified)}`}
            />
            <Line
              k="Capped / insufficient history or entries"
              v={`${fmt.num(exitHistory.capped)} / ${fmt.num((exitHistory.noPrehistory ?? 0) + (exitHistory.insufficientEntries ?? 0))}`}
            />
            <Line
              k="Holdout rejects: short / PF / drawdown"
              v={`${fmt.num(exitHistory.insufficientTrades)} / ${fmt.num(exitHistory.pfRejected)} / ${fmt.num(exitHistory.ddrRejected)}`}
            />
            <Line
              k="Position exits"
              v={
                d.settings.live.laneOrders
                  ? "lane orders · each lane has its own partial stop / target"
                  : "overall control · coordinates the combined position; lane completions can reduce it"
              }
            />
          </div>
        ) : (
          <Empty>Historic Exit status is not available yet</Empty>
        )}
      </Panel>

      <Panel
        title="Timeframe lanes"
        sub="Each lane is tracked through Base, Active validated configs, and Executed model closes. Open model positions and paper positions/orders are shown separately. A position is one symbol × direction episode."
        flush
      >
        {d.lanes?.length ? (
          <>
            <div className="v2-table-wrap">
              <table className="v2-table">
                <thead>
                  <tr>
                    <th>Lane</th>
                    <th>Base evaluated</th>
                    <th>Base passed</th>
                    <th>Main tapes</th>
                    <th>Validated sets / closes</th>
                    <th>Validated set mean PF</th>
                    <th>Executed model closes</th>
                    <th>Executed model unit PF</th>
                    <th>Executed effective PF</th>
                    <th>Executed unit net</th>
                    <th>Executed effective net</th>
                    <th>Executed model WR</th>
                    <th>Model open at end</th>
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
                        {fmt.num(l.activeSets)} / {fmt.num(l.activeCloses)}
                      </td>
                      <td className={l.activeSets ? pfTone(l.activePf) : ""}>
                        {l.activeSets ? activeValidationPfText(l.activePf, l.activeNoLoss) : "–"}
                      </td>
                      <td>{fmt.num(l.n)}</td>
                      <td className={l.n ? pfTone(l.pf) : ""}>{l.n ? unitStatsPfText(l) : "–"}</td>
                      <td className={l.effective?.n ? pfTone(l.effective.pf) : ""}>{effectivePfText(l.effective)}</td>
                      <td className={l.n ? tone(l.net) : ""}>{l.n ? fmt.pct(l.net) : "–"}</td>
                      <td className={l.effective?.n ? tone(l.effective.net) : ""}>{l.effective?.n ? fmt.pct(l.effective.net) : "–"}</td>
                      <td>{l.n ? fmt.ratio(l.wr) : "–"}</td>
                      <td>{fmt.num(l.orderCounts?.openOrders ?? 0)}</td>
                      <td>
                        {l.open?.positions ?? 0} / {l.open?.orders ?? 0}
                      </td>
                    </tr>
                  ))}
                  <tr className="v2-muted">
                    <td style={{ fontWeight: 600 }}>all lanes</td>
                    <td>{fmt.num(d.status?.baseEvaluated)}</td>
                    <td>{fmt.num(d.status?.basePassed)}</td>
                    <td>{fmt.num(d.wf?.tapes)}</td>
                    <td>
                      {fmt.num(d.status?.listings?.validated)} / {fmt.num(activeValidationCloses)}
                    </td>
                    <td className={activeKinds.length ? pfTone(activeValidationPf) : ""}>
                      {activeKinds.length
                        ? activeValidationPfText(activeValidationPf, activeValidationNoLoss)
                        : "–"}
                    </td>
                    <td>{fmt.num(d.sim?.executed?.n)}</td>
                    <td className={d.sim?.executed?.n ? pfTone(d.sim.executed.pf) : ""}>
                      {d.sim?.executed?.n ? unitStatsPfText(d.sim.executed) : "–"}
                    </td>
                    <td className={d.sim?.effective?.n ? pfTone(d.sim.effective.pf) : ""}>
                      {effectivePfText(d.sim?.effective)}
                    </td>
                    <td className={d.sim?.executed?.n ? tone(d.sim.executed.net) : ""}>
                      {d.sim?.executed?.n ? fmt.pct(d.sim.executed.net) : "–"}
                    </td>
                    <td className={d.sim?.effective?.n ? tone(d.sim.effective.net) : ""}>
                      {d.sim?.effective?.n ? fmt.pct(d.sim.effective.net) : "–"}
                    </td>
                    <td>{d.sim?.executed?.n ? fmt.ratio(d.sim.executed.wr) : "–"}</td>
                    <td>{fmt.num(d.sim?.openAtEnd)}</td>
                    <td>
                      {d.paper?.book?.positions ?? 0} / {d.paper?.book?.orders ?? 0}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="v2-muted" style={{ marginTop: 8, fontSize: "var(--v-fs-xs)" }}>
              Validated set mean PF averages the current step&apos;s individually passing configs. No-loss sets are listed separately from the finite-set mean. Executed model unit PF
              removes captured size; Executed effective PF includes the additive sized returns from
              closed replay orders only. Open-at-end orders are counted separately. Exchange fill PF
              remains in Statistics → Live.
            </div>
          </>
        ) : (
          <Empty>No compute yet</Empty>
        )}
      </Panel>

      <Panel
        title="Strategy execution by type"
        sub={`Runtime seat set: ${d.wf?.seatSet ?? "validated"}. Simulated execution is pinned to the config IDs in validated set V. Active validation and Executed model columns use different windows. Mirror-to-Live exchange fills are reported separately in Statistics → Live.`}
        flush
      >
        {strategyKinds.length ? (
          <div className="v2-table-wrap">
            <table className="v2-table">
              <thead>
                <tr>
                  <th>Strategy</th>
                  <th className="num">Active configs</th>
                  <th className="num">Validation closes</th>
                  <th className="num">Validated set mean PF</th>
                  <th className="num">Executed model closes</th>
                  <th className="num">Executed model unit PF</th>
                  <th className="num">Executed effective PF</th>
                  <th className="num">Executed unit net</th>
                  <th className="num">Executed effective net</th>
                </tr>
              </thead>
              <tbody>
                {strategyKinds.map((kind) => {
                  const active = activeKinds.find((x) => x.kind === kind);
                  const executed = executedKinds[kind];
                  const effective = d.sim?.effectiveByKind?.[kind];
                  return (
                    <tr key={kind}>
                      <td>
                        {kind === "exit"
                          ? "Historic Exit"
                          : kind === "trailing-only"
                            ? "Trailing only"
                            : kind === "dca-active"
                              ? "DCA Active"
                              : kind[0].toUpperCase() + kind.slice(1)}
                      </td>
                      <td className="num">{fmt.num(active?.validated ?? 0)}</td>
                      <td className="num">{fmt.num(active?.validationCloses ?? 0)}</td>
                      <td className={`num ${active ? pfTone(active.pf) : ""}`}>
                        {active ? activeValidationPfText(active.pf, active.noLoss) : "–"}
                      </td>
                      <td className="num">{fmt.num(executed?.n ?? 0)}</td>
                      <td className={`num ${executed?.n ? pfTone(executed.pf) : ""}`}>
                        {executed?.n ? unitStatsPfText(executed) : "–"}
                      </td>
                      <td className={`num ${effective?.n ? pfTone(effective.pf) : ""}`}>
                        {effectivePfText(effective)}
                      </td>
                      <td className={`num ${executed?.n ? tone(executed.net) : ""}`}>
                        {executed?.n ? fmt.pct(executed.net) : "–"}
                      </td>
                      <td className={`num ${effective?.n ? tone(effective.net) : ""}`}>
                        {effective?.n ? fmt.pct(effective.net) : "–"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>No Active or Executed strategy data yet.</Empty>
        )}
      </Panel>

      <Panel
        title="Mirror to Live · Exchange fills"
        sub="Actual owned closes from exchange fill records, kept separate from Active validation and Executed model results. PF requires measured fill prices and fees; hand exits and unverified flat markers are excluded."
      >
        <div className="v2-grid v2-cols-4">
          <Kpi
            label="Exchange closes"
            value={fmt.num(d.liveSession?.exchangeReturns?.n ?? 0)}
            sub={`${fmt.num(d.liveSession?.exchangeReturns?.unknownReturns ?? 0)} closes with unknown return evidence`}
          />
          <Kpi
            label="Exchange return PF"
            value={d.liveSession?.exchangeReturns?.n
              ? unitStatsPfText(d.liveSession.exchangeReturns)
              : "–"}
            className={d.liveSession?.exchangeReturns?.n
              ? pfTone(d.liveSession.exchangeReturns.pf)
              : ""}
            sub="measured own-fill returns"
          />
          <Kpi
            label="Exchange net return"
            value={d.liveSession?.exchangeReturns?.n
              ? fmt.pct(d.liveSession.exchangeReturns.net)
              : "–"}
            className={d.liveSession?.exchangeReturns?.n
              ? tone(d.liveSession.exchangeReturns.net)
              : ""}
            sub="same exchange close sample"
          />
          <Kpi
            label="Return evidence"
            value={d.liveSession?.exchangeReturns?.pfBasis === "unit-net-returns"
              ? "complete"
              : "unavailable"}
            sub="see Statistics → Live for fill-level details"
          />
        </div>
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
                v={`${pooledBasePfText({ passed: port.is.n, passedGp: port.is.gp, passedGl: port.is.gl })} · ${fmt.pct(port.is.net)}`}
                className={pfTone(port.is.pf, g.minPf)}
              />
              <Line
                k="Out-of-sample PF · net"
                v={`${pooledBasePfText({ passed: port.oos.n, passedGp: port.oos.gp, passedGl: port.oos.gl })} · ${fmt.pct(port.oos.net)}`}
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
        sub="historical model selection scores: last-N chosen in-sample, validated out-of-sample. Stored PF scores include the no-loss convention; they are separate from funded execution return PF"
        flush
      >
        <div className="v2-table-wrap">
          <table className="v2-table">
            <thead>
              <tr>
                <th>#</th>
                <th>config</th>
                <th className="num">n</th>
                <th className="num">Model PF score</th>
                <th className="num">net</th>
                <th className="num">best N</th>
                <th className="num">OOS n</th>
                <th className="num">OOS model PF score</th>
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
      <BaseConfigCounts />
      <SetListings minPf={g.minPf} />
    </>
  );
}

const PAGE = 50;

/**
 * The last paper step's listings (coreListing, built once per step): validated Normal / Trailing ranges and independent
 * strategy groups such as Historic Exit, with per-set validation PF means, active signal units, and proven live configs.
 */
export function SetListings(props: { minPf: number }) {
  const [kind, setKind] = useState<"validated" | "active" | "proven">("validated");
  const [group, setGroup] = useState("");
  const [lane, setLane] = useState("");
  const [strategy, setStrategy] = useState("");
  const [page, setPage] = useState(0);
  const { data } = usePoll(
    () =>
      coreListing({
        data: {
          kind,
          group: group || undefined,
          lane: lane || undefined,
          strategy: strategy || undefined,
          offset: page * PAGE,
          limit: PAGE,
        },
      }),
    10000,
    [kind, group, lane, strategy, page],
  );
  const d = data as Any;
  const pages = d?.total ? Math.ceil(d.total / PAGE) : 0;
  return (
    <Panel
      title="Validated and active sets"
      sub="The Active set is the current step's configs that passed Base and validation. Filter the line-by-line records by lane, strategy and range group."
    >
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
        {kind === "validated" && Array.isArray(d?.byGroup) && (
          <Seg
            value={group}
            label="group"
            options={[
              { value: "", label: "All" },
              ...d.byGroup.map((x: Any) => ({
                value: x.group,
                label: `${x.group} ${x.validated}/${x.calculated} · PF ${x.noLoss ? "no losses" : fmt.pf(x.pf)}`,
              })),
            ]}
            onChange={(v) => {
              setGroup(v);
              setPage(0);
            }}
          />
        )}
        {kind === "validated" && Array.isArray(d?.byKind) && (
          <Seg
            value={strategy}
            label="strategy"
            options={[
              { value: "", label: "All strategies" },
              ...d.byKind.map((x: Any) => ({
                value: x.kind,
                label: `${x.kind === "exit" ? "Historic Exit" : x.kind === "trailing-only" ? "Trailing only" : x.kind === "dca-active" ? "DCA Active" : x.kind[0].toUpperCase() + x.kind.slice(1)} ${x.validated}/${x.calculated}`,
              })),
            ]}
            onChange={(v) => {
              setStrategy(v);
              setPage(0);
              setGroup("");
            }}
          />
        )}
        {kind === "validated" && (
          <Seg
            value={lane}
            label="lane"
            options={[
              { value: "", label: "All lanes" },
              ...["1m", "1m+", "5m", "5m+", "15m", "15m+", "30m", "plain"].map((x) => ({
                value: x,
                label: x,
              })),
            ]}
            onChange={(v) => {
              setLane(v);
              setPage(0);
              setGroup("");
            }}
          />
        )}
      </div>
      {kind === "validated" && d?.ready && (
        <div className="v2-muted" style={{ marginTop: 8, fontSize: "var(--v-fs-xs)" }}>
          {fmt.num(d.total)} / {fmt.num(d.calculated)} validated · Last-N{" "}
          {d.validation?.engineLastN || "off"}
          {` · range Last-N ${d.validation?.rangeLastN || "off"} · ${d.validation?.historyH ?? "—"}h evaluation history`}
          <div>
            Each validated config row shows its own historical validation window beside later executed model closes for that
            same config ID. Validation windows can overlap and differ from the full replay window.
            Exchange fills are separate and appear in Statistics → Live.
          </div>
        </div>
      )}
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
                  <th>Range / strategy group</th>
                  <th className="num">Validated set mean PF</th>
                  <th className="num">Validation closes</th>
                  <th className="num">Validation net</th>
                  <th className="num">DDT h</th>
                  <th className="num">Score</th>
                  <th className="num">Executed model closes</th>
                  <th className="num">Executed model unit PF</th>
                  <th className="num">Executed effective PF</th>
                  <th className="num">Executed unit net</th>
                  <th className="num">Executed effective net</th>
                </tr>
              ) : kind === "active" ? (
                <tr>
                  <th>Signal · range · lane</th>
                  <th>Protection config</th>
                  <th>Type</th>
                  <th>Symbol</th>
                  <th>Side</th>
                </tr>
              ) : (
                <tr>
                  <th>Config</th>
                  {d.provenBySide && <th>Side</th>}
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
                    <td>{x.group}</td>
                    <td className={`num ${pfTone(x.pf, props.minPf)}`}>{x.noLoss ? "No losses" : fmt.pf(x.pf)}</td>
                    <td className="num">{x.n}</td>
                    <td className={`num ${tone(x.net)}`}>{fmt.pct(x.net)}</td>
                    <td className="num">{fmt.num(x.ddt)}</td>
                    <td className="num">{fmt.num(x.score)}</td>
                    <td className="num">{fmt.num(x.executed?.n ?? 0)}</td>
                    <td className={`num ${x.executed?.n ? pfTone(x.executed.pf) : ""}`}>
                      {x.executed?.n ? unitStatsPfText(x.executed) : "–"}
                    </td>
                    <td className={`num ${x.executed?.effective?.n ? pfTone(x.executed.effective.pf) : ""}`}>
                      {effectivePfText(x.executed?.effective)}
                    </td>
                    <td className={`num ${x.executed?.n ? tone(x.executed.net) : ""}`}>
                      {x.executed?.n ? fmt.pct(x.executed.net) : "–"}
                    </td>
                    <td className={`num ${x.executed?.effective?.n ? tone(x.executed.effective.net) : ""}`}>
                      {x.executed?.effective?.n ? fmt.pct(x.executed.effective.net) : "–"}
                    </td>
                  </tr>
                ) : kind === "active" ? (
                  <tr key={signalUnitRowKey(x)}>
                    <td>
                      {x.bot} · {x.ind}
                    </td>
                    <td className="v2-mono">{x.cfg ?? "Base / discovery"}</td>
                    <td>{signalTypeLabel(x.kind)}</td>
                    <td>{x.sym}</td>
                    <td>{x.side > 0 ? "long" : "short"}</td>
                  </tr>
                ) : (
                  <tr key={x.side ? `${x.id}|${x.side}` : (x.id ?? i)}>
                    <td>{x.id}</td>
                    {d.provenBySide && <td>{x.side}</td>}
                  </tr>
                ),
              )}
            </tbody>
          </table>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}>
            <button
              className="v2-btn"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Previous
            </button>
            <span>
              {fmt.num(d.total)} · page {pages ? page + 1 : 0} of {pages}
            </span>
            <button
              className="v2-btn"
              disabled={page + 1 >= pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </Panel>
  );
}
