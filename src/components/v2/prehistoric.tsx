// Progressive prehistoric start: symbols #/#, progress, results of the complete computation before realtime.
import { prehistPct, progressText } from "@/core/progress";
import { RANGE_LABEL } from "@/core/minimal-coord";
import { hasUnitReturnBasis, unitStatsPfText } from "./accounting";
import { pooledBasePfText, signalProgressCounts } from "./progression";
import { fmt, pfTone, Pill } from "./ui";
import { StrategyCoverageTable } from "./strategy-coverage";

type Any = any;

const STATE_COLOR: Record<string, string> = {
  ready: "var(--v-up)",
  computing: "var(--v-accent)",
  loading: "var(--v-warn, #d4a017)",
  queued: "var(--v-text-3)",
  skipped: "var(--v-down)",
};

/** The Base pass floor in words: a pass also needs net > 0, so a floor of 1 admits PF > 1 only. */
const baseFloorText = (min: number) => (min > 1 ? `PF ≥ ${min}, net > 0` : "PF > 1 (net > 0)");

export function PrehistoricPanel(props: {
  status: Any;
  minPf: number;
  maxDdtH: number;
  /** the minimum PF Base builds a pair's sets from (gates.baseSetsMinPf; unset = minPf) */
  baseSetsMinPf?: number;
}) {
  const st = props.status;
  const p = st?.prehistoric;
  if (!p) {
    return (
      <section className="v2-panel" style={{ padding: 12 }}>
        <div style={{ fontWeight: 700 }}>Prehistoric calculation</div>
        <div className="v2-muted" style={{ fontSize: "var(--v-fs-sm)" }}>
          {st?.state === "backfill"
            ? `loading market data · ${st.label ?? ""}`
            : "starting — the first batch of symbols is being loaded"}
        </div>
      </section>
    );
  }
  const running = st.state === "computing" || st.state === "backfill";
  // overall progress: symbols ready + the running job's share of the batch being computed (prehistPct)
  const pct = prehistPct(p, st);
  const s = p.stats;
  const knownReturns = hasUnitReturnBasis(s);
  const signalCounts = signalProgressCounts(st.signals);
  const perSymbol = new Map<string, Any>((s?.perSymbol ?? []).map((x: Any) => [x.sym, x]));
  const syms = Object.entries(p.symbols as Record<string, Any>).sort(
    (a, b) => (b[1].n ?? 0) - (a[1].n ?? 0),
  );
  const c = p.counts;
  return (
    <section className="v2-panel" style={{ padding: 12, display: "grid", gap: 10 }}>
      <header style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <strong>Prehistoric calculation</strong>
        <span className="v2-muted" style={{ fontSize: "var(--v-fs-sm)" }}>
          {p.hours} h pre-calc · {p.simH} h simulated run · complete computation per batch, realtime
          starts as each batch is ready
        </span>
        <span style={{ marginLeft: "auto" }}>
          {p.complete ? (
            <Pill kind="ok">complete · realtime running</Pill>
          ) : (
            <Pill kind="acc">{running ? progressText(st) : "next batch queued"}</Pill>
          )}
        </span>
      </header>
      <div>
        <div
          style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--v-fs-sm)" }}
        >
          <span>
            Symbols processed{" "}
            <strong>
              {p.ready}/{p.total}
            </strong>{" "}
            · loaded {p.loaded}
          </span>
          <span>{pct}%</span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Prehistoric progress"
          style={{
            height: 10,
            borderRadius: 6,
            background: "var(--v-bg-2, rgba(127,127,127,.18))",
            overflow: "hidden",
            marginTop: 4,
          }}
        >
          <div
            style={{
              width: `${pct}%`,
              height: "100%",
              background: p.complete ? "var(--v-up)" : "var(--v-accent)",
              transition: "width .4s",
            }}
          />
        </div>
        <div className="v2-muted" style={{ fontSize: "var(--v-fs-xs)", marginTop: 4 }}>
          {running
            ? `${st.stage}: ${st.label || "…"} · last progress ${fmt.ago(st.heartbeat)}${Date.now() - (st.heartbeat ?? 0) > 60_000 ? " · stale" : ""}`
            : p.complete
              ? `completed ${fmt.ago(p.readyAt)}`
              : "next batch queued"}
        </div>
      </div>
      <div className="v2-grid v2-cols-6" style={{ gap: 8 }}>
        <Stat
          k="Post-Base validation PF"
          v={st.postBaseValidation?.noLoss ? "no losses" : fmt.pf(st.postBaseValidation?.pf)}
          cls={pfTone(st.postBaseValidation?.pf, props.minPf)}
          sub={st.postBaseValidation
            ? `${fmt.num(st.postBaseValidation.passed)} / ${fmt.num(st.postBaseValidation.evaluated)} engine configs · ${fmt.frac(st.postBaseValidation.evaluated > 0 ? st.postBaseValidation.passed / st.postBaseValidation.evaluated : null)} · ${fmt.time(st.postBaseValidation.at)} UTC`
            : "engine selection-pool validation unavailable"}
        />
        <Stat
          k="Pre-allocation model PF"
          v={s ? unitStatsPfText(s) : "–"}
          cls={pfTone(s?.pf, props.minPf)}
          sub={`post-Base accepted model records before Active seat allocation · min ${props.minPf}`}
        />
        <Stat
          k="DDT"
          v={fmt.h(s?.ddtH)}
          cls={s && s.ddtH > props.maxDdtH ? "v2-down" : ""}
          sub={`max ${props.maxDdtH} h`}
        />
        <Stat
          k="Avg open pos / orders"
          v={`${fmt.num(s?.avgPositions, 1)} / ${fmt.num(s?.avgOpen, 1)}`}
          sub={`peak ${s?.maxPositions ?? 0} / ${s?.maxOpen ?? 0} processing`}
        />
        <Stat
          k="Positions / Orders"
          v={`${fmt.num(s?.positions)} / ${fmt.num(s?.n)}`}
          sub={`WR ${fmt.ratio(s?.wr)} (orders)`}
        />
        <Stat k="Green hours" v={fmt.ratio(s?.greenHours)} sub={`net ${fmt.pct(s?.net, 1)}`} />
        <Stat k="Symbols trading" v={`${s?.perSymbol?.length ?? 0}`} sub={`of ${p.ready} ready`} />
      </div>
      {st.postBaseValidation && <div className="v2-muted" style={{ fontSize: "var(--v-fs-xs)" }}>
        Validation PF pools the passing engine configs&apos; overlapping historical windows. It is separate from later modeled closes, allocated paper results and exchange fills; Signals use their own context validation.
      </div>}
      <div className="v2-grid v2-cols-6" style={{ gap: 8 }}>
        <Stat k="Base evaluated" v={fmt.num(st.baseEvaluated ?? c.base)} sub="pairs" />
        <Stat
          k="Base passed"
          v={fmt.num(st.basePassed)}
          sub={`${baseFloorText(props.baseSetsMinPf ?? props.minPf)} · engine${st.signals?.representativeBaseGate ? " + gated signals" : ""}`}
        />
        <Stat k="Main pairs calculated" v={fmt.num(c.main)} sub="includes measurement or held-only pairs; not execution admission" />
        <Stat k="Sets (tapes)" v={fmt.num(c.sets)} sub="protect × strategy" />
        <Stat k="Real" v={fmt.num(c.real)} sub="selected now" />
        <Stat k="Evals · armed" v={`${c.evals} · ${c.armed}`} sub="continuous evals" />
      </div>
      <StrategyCoverageTable coverage={st.strategyCoverage} />
      {s && !knownReturns && <div className="v2-muted">Unit-return basis unavailable for {fmt.num(s.unknownReturns)} closes. All {fmt.num(s.n)} modeled closes remain counted; this is not a zero-return sample.</div>}
      {st.signals?.enabled && <div className="v2-muted" style={{ fontSize: "var(--v-fs-xs)" }}>
        Signals: {fmt.num(signalCounts.discovery)} initialized discovery pairs · {fmt.num(signalCounts.representativePassed)} representative pairs passed Base · {fmt.num(signalCounts.requested)} requested protection configurations (effective IDs can merge identical cells).
        {st.signals.historic && ` Historic exits: ${fmt.num(st.signals.historic.qualified)} qualified range/config variants · ${fmt.num(st.signals.historic.evaluated)} candidates PF-tested; ${fmt.num(st.signals.historic.insufficientEntries)} pairs lacked complete historic entries.`}
        {st.signals.representativeBaseGate === false ? " Representative Base gating is off for discovery; each full config/type still faces its own admission and execution gates." : " Representative Base gating is on; discovery and execution remain different samples."}
      </div>}
      {Array.isArray(st.baseByRange) && st.baseByRange.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table className="v2-table" style={{ fontSize: "var(--v-fs-sm)" }}>
            <caption style={{ textAlign: "left", fontWeight: 700, padding: "4px 0" }}>
              Base representatives per range · historical qualification sample, separate from post-Base and owned execution PF
            </caption>
            <thead>
              <tr>
                <th>Range</th>
                <th className="v2-num">Pooled Base return PF of passed</th>
                <th className="v2-num">Passed / evaluated</th>
                <th className="v2-num">Min PF</th>
                <th className="v2-num">PF score median (all)</th>
                <th className="v2-num">PF score median (passed)</th>
              </tr>
            </thead>
            <tbody>
              {st.baseByRange.map((r: Any) => (
                <tr key={r.tag} className={r.enabled ? "" : "v2-muted"}>
                  <td>
                    {r.range}
                    {r.enabled ? "" : " (off)"}
                    {/* a range judged (partly) at the default protect: its figures are the Wide row's */}
                    {r.enabled && r.tag && typeof r.ownCells === "number" && r.evaluated > 0 ? (
                      r.ownCells === 0 ? (
                        <span className="v2-muted"> (default cell)</span>
                      ) : r.ownCells < r.evaluated ? (
                        <span className="v2-muted">
                          {" "}
                          ({fmt.num(r.ownCells)}/{fmt.num(r.evaluated)} own cells)
                        </span>
                      ) : null
                    ) : null}
                  </td>
                  <td className={`v2-num ${pfTone(r.pfPassedPooled, r.minPf)}`}>{pooledBasePfText(r)}</td>
                  <td className="v2-num">
                    {fmt.num(r.passed)} / {fmt.num(r.evaluated)}
                  </td>
                  <td className="v2-num">{fmt.pf(r.minPf)}</td>
                  <td className={`v2-num ${pfTone(r.pfMedian, r.minPf)}`}>{fmt.pf(r.pfMedian)}</td>
                  <td className={`v2-num ${pfTone(r.pfPassedMedian, r.minPf)}`}>{fmt.pf(r.pfPassedMedian)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="v2-muted" style={{ fontSize: "var(--v-fs-xs)" }}>Score medians include the engine's no-loss score 4; that score is not a measured finite PF. The pooled column uses the passed representatives' gross return gains and losses.</div>
        </div>
      )}
      {Array.isArray(st.baseWhy) && st.baseWhy.length > 0 && <div style={{ overflowX: "auto" }}>
        <table className="v2-table">
          <caption style={{ textAlign: "left", fontWeight: 700 }}>Base rejection reasons · first gate missed on the current historical sample</caption>
          <thead><tr><th>Range</th><th className="v2-num">Evaluated</th><th className="v2-num">Passed</th><th className="v2-num">Too few closes</th><th className="v2-num">Nonpositive net</th><th className="v2-num">PF below floor</th><th className="v2-num">Drawdown ratio</th><th className="v2-num">Window</th><th className="v2-num">Last-N</th></tr></thead>
          <tbody>{st.baseWhy.map((r: Any) => <tr key={r.tag}><td>{RANGE_LABEL[r.tag as keyof typeof RANGE_LABEL] ?? r.tag}</td><td className="v2-num">{fmt.num(r.evaluated)}</td><td className="v2-num">{fmt.num(r.passed)}</td><td className="v2-num">{fmt.num(r.first?.closes)}</td><td className="v2-num">{fmt.num(r.first?.net)}</td><td className="v2-num">{fmt.num(r.first?.pf)}</td><td className="v2-num">{fmt.num(r.first?.ddr)}</td><td className="v2-num">{fmt.num(r.first?.windows)}</td><td className="v2-num">{fmt.num(r.first?.lastN)}</td></tr>)}</tbody>
        </table>
        <div className="v2-muted" style={{ fontSize: "var(--v-fs-xs)" }}>One first rejection per failed representative, in gate order. These counts do not describe future executed returns or waive any later gate.</div>
      </div>}
      <details>
        <summary style={{ cursor: "pointer", fontSize: "var(--v-fs-sm)" }}>
          Per symbol ({syms.length})
        </summary>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
          {syms.map(([sym, state]) => { const v = { ...state, ...perSymbol.get(sym) }; return (
            <span
              key={sym}
              className="v2-pill"
              title={`${v.state}${v.bars ? ` · ${v.bars} bars` : ""}${v.n ? ` · ${v.n} closes · return PF ${unitStatsPfText(v)}` : ""}`}
              style={{ borderColor: STATE_COLOR[v.state] ?? "var(--v-border)" }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 4,
                  background: STATE_COLOR[v.state] ?? "gray",
                  display: "inline-block",
                  marginRight: 5,
                }}
              />
              {sym.replace("-USDT", "")}
              {v.n ? (
                <span className={pfTone(v.pf, props.minPf)} style={{ marginLeft: 5 }}>
                  {unitStatsPfText(v)}·{v.n}
                </span>
              ) : null}
            </span>
          ); })}
        </div>
      </details>
    </section>
  );
}

function Stat(props: { k: string; v: string; sub?: string; cls?: string }) {
  return (
    <div className="v2-panel" style={{ padding: "6px 8px" }}>
      <div className="v2-muted" style={{ fontSize: "var(--v-fs-xs)" }}>
        {props.k}
      </div>
      <div className={props.cls} style={{ fontWeight: 700, fontSize: "var(--v-fs-lg, 1.1em)" }}>
        {props.v}
      </div>
      {props.sub && (
        <div className="v2-muted" style={{ fontSize: "var(--v-fs-xs)" }}>
          {props.sub}
        </div>
      )}
    </div>
  );
}
