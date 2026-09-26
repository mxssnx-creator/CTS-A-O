// Progressive prehistoric start: symbols #/#, progress, results of the complete computation before realtime.
import { fmt, pfTone, Pill } from "./ui";

type Any = any;

const STATE_COLOR: Record<string, string> = {
  ready: "var(--v-up)",
  computing: "var(--v-accent)",
  loading: "var(--v-warn, #d4a017)",
  queued: "var(--v-text-3)",
  skipped: "var(--v-down)",
};

export function PrehistoricPanel(props: { status: Any; minPf: number; maxDdtH: number }) {
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
  const total = Math.max(1, p.total);
  const running = st.state === "computing" || st.state === "backfill";
  // overall progress: symbols ready + the running stage's share of the current batch
  const pct = Math.min(
    100,
    Math.round(
      ((p.ready + (running && !p.complete ? st.progress * Math.max(0, p.loaded - p.ready) : 0)) /
        total) *
        100,
    ),
  );
  const s = p.stats;
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
            <Pill kind="acc">
              {st.stage} {Math.round((st.progress ?? 0) * 100)}%
            </Pill>
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
            ? `${st.stage}: ${st.label || "…"}`
            : p.complete
              ? `completed ${fmt.ago(p.readyAt)}`
              : "next batch queued"}
        </div>
      </div>
      <div className="v2-grid v2-cols-6" style={{ gap: 8 }}>
        <Stat
          k="PF"
          v={fmt.pf(s?.pf)}
          cls={pfTone(s?.pf, props.minPf)}
          sub={`min ${props.minPf}`}
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
      <div className="v2-grid v2-cols-6" style={{ gap: 8 }}>
        <Stat k="Base evaluated" v={fmt.num(st.baseEvaluated ?? c.base)} sub="config sets" />
        <Stat k="Base passed" v={fmt.num(st.basePassed)} sub={`PF ≥ ${props.minPf}`} />
        <Stat k="Main pairs" v={fmt.num(c.main)} sub="promoted" />
        <Stat k="Sets (tapes)" v={fmt.num(c.sets)} sub="protect × strategy" />
        <Stat k="Real" v={fmt.num(c.real)} sub="selected now" />
        <Stat k="Evals · armed" v={`${c.evals} · ${c.armed}`} sub="continuous evals" />
      </div>
      <details>
        <summary style={{ cursor: "pointer", fontSize: "var(--v-fs-sm)" }}>
          Per symbol ({syms.length})
        </summary>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
          {syms.map(([sym, v]) => (
            <span
              key={sym}
              className="v2-pill"
              title={`${v.state}${v.bars ? ` · ${v.bars} bars` : ""}${v.n ? ` · ${v.n} trades · PF ${fmt.pf(v.pf)}` : ""}`}
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
                  {fmt.pf(v.pf)}·{v.n}
                </span>
              ) : null}
            </span>
          ))}
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
