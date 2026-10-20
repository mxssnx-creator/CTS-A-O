import type { Bars } from "../domain/types.ts";
import { makeUniverse } from "../pipeline/pipeline.ts";
import { buildTapes, makeTape, type ConfigTape, type EntryFloors } from "./walkforward.ts";
import { TapeContinuations } from "./cursor.ts";
import { laneOf } from "../indications/registry.ts";
import type { OpenPosition, Trade } from "../domain/types.ts";
import { StreamMath } from "../indications/stream-math.ts";
import { IncrementalMarkets, MarketSource } from "../indications/market.ts";

export type RealtimeTapeGroup = {
  key: string;
  pairs: string[];
  protects: Parameters<typeof buildTapes>[1];
  dcaOpt?: Parameters<typeof buildTapes>[3];
  tactics?: Parameters<typeof buildTapes>[5];
  adjust?: Parameters<typeof buildTapes>[6];
  floors: Omit<EntryFloors, "continuations" | "baseConfigCounter" | "buildStats">;
};

const columns = ["t", "o", "h", "l", "c", "v"] as const;
const seriesKey = (b: Pick<Bars, "sym" | "tfMin">) => `${b.sym}|${b.tfMin}`;

/** An isolated worker's validated cohort. Discovery never runs here. A new economic revision gets a new book. */
export class RealtimeTapeBook {
  private series = new Map<string, Bars>();
  private continuations = new TapeContinuations();
  private appended = 0;
  private failed = false;
  private buffers = new WeakSet<ArrayBuffer>();
  private groups: readonly RealtimeTapeGroup[];
  private cost: number;
  private evaluationFromT?: number;
  private math = new Map<string, StreamMath>();
  private market = new IncrementalMarkets();
  private templates = new Map<
    string,
    Pick<ConfigTape, "id" | "bot" | "ind" | "protect" | "kind" | "syms" | "fromT" | "heldOnly">
  >();
  constructor(
    bars: readonly Bars[],
    groups: readonly RealtimeTapeGroup[],
    cost: number,
    evaluationFromT?: number,
  ) {
    this.groups = groups;
    this.cost = cost;
    this.evaluationFromT = evaluationFromT;
    for (const b of bars) {
      const key = seriesKey(b);
      if (this.series.has(key)) throw new Error(`duplicate realtime series ${key}`);
      this.series.set(key, b);
    }
    // Bootstrap the exact qualified history once. Only simulator state survives, not historical Trade objects.
    const tapes = this.calculate();
    for (const { id, bot, ind, protect, kind, syms, fromT, heldOnly } of tapes)
      this.templates.set(id, { id, bot, ind, protect, kind, syms, fromT, heldOnly });
    for (const g of groups)
      for (const id of g.floors.onlyIds ?? [])
        if (!this.templates.has(id))
          throw new Error(`qualified realtime config cannot be reconstructed: ${id}`);
  }

  ends(): Record<string, number> {
    return Object.fromEntries([...this.series].map(([key, b]) => [key, b.t[b.n - 1] ?? -Infinity]));
  }

  private universe() {
    const u = makeUniverse([...this.series.values()], this.evaluationFromT);
    const market = new MarketSource([...this.series.values()], this.market);
    for (let i = 0; i < u.bars.length; i++) {
      const key = seriesKey(u.bars[i]);
      let math = this.math.get(key);
      if (!math) this.math.set(key, (math = new StreamMath()));
      u.caches[i].setMarket(market);
      u.caches[i].enableStreaming(math);
    }
    return u;
  }

  private calculate(changedTfs?: ReadonlySet<number>): ConfigTape[] {
    const u = this.universe();
    const out = this.groups.flatMap((g) => {
      const pairs = changedTfs
        ? g.pairs.filter((pair) => {
            const tf = laneOf(pair.split("|")[1] ?? "").tf;
            return tf === null || changedTfs.has(tf);
          })
        : g.pairs;
      return pairs.length
        ? buildTapes(u, g.protects, this.cost, g.dcaOpt, new Set(pairs), g.tactics, g.adjust, {
            ...g.floors,
            continuations: this.continuations,
          })
        : [];
    });
    for (const cache of u.caches) cache.clear();
    return out;
  }

  advance(appends: readonly Bars[]): {
    tapes: ConfigTape[];
    ends: Record<string, number>;
    changed: string[];
    profile?: Record<string, number>;
  } {
    if (this.failed)
      throw new Error("realtime book requires a new bootstrap after a failed update");
    const updates = new Map<string, Bars>();
    for (const tail of appends) {
      const key = seriesKey(tail);
      const old = this.series.get(key);
      if (!old || updates.has(key)) throw new Error(`unknown or repeated realtime append ${key}`);
      if (!tail.n) continue;
      if (columns.some((c) => tail[c].length !== tail.n))
        throw new Error("invalid realtime column length");
      let last = old.t[old.n - 1] ?? -Infinity;
      for (let i = 0; i < tail.n; i++) {
        if (!(Number.isFinite(tail.t[i]) && tail.t[i] > last))
          throw new Error(
            "realtime append must be strictly newer; corrections require a new bootstrap",
          );
        last = tail.t[i];
      }
      const n = old.n + tail.n;
      if (old.n < 120 && n >= 120)
        throw new Error("realtime universe membership changed; research bootstrap required");
      const next: Bars = { ...old, n };
      // Private append capacity; published snapshots remain immutable. Reuse a column's backing store only past
      // its previous extent. Growth occurs on the worker and never copies or scans historical candles on the ticker.
      for (const col of columns) {
        const prev = old[col];
        const available = prev.buffer.byteLength / 8 - prev.byteOffset / 8;
        const out =
          available >= n && prev.buffer instanceof ArrayBuffer && this.buffers.has(prev.buffer)
            ? new Float64Array(prev.buffer, prev.byteOffset, n)
            : new Float64Array(Math.max(n, Math.ceil(n * 1.25) + 256));
        this.buffers.add(out.buffer as ArrayBuffer);
        if (out.buffer !== prev.buffer) out.set(prev);
        out.set(tail[col], old.n);
        next[col] = out.subarray(0, n);
      }
      updates.set(key, next);
    }
    if (!updates.size) return { tapes: [], ends: this.ends(), changed: [] };
    if (this.appended + Math.max(...appends.map((b) => b.n)) > 1440)
      throw new Error("realtime continuation needs refreshed research after 1440 appended bars");
    for (const [key, b] of updates) this.series.set(key, b);
    try {
      const u = this.universe();
      const changedTfs = new Set([...updates.values()].map((b) => b.tfMin));
      const records = new Map<
        string,
        { trades: Trade[]; open: OpenPosition[]; pending: ConfigTape["pending"] }
      >();
      for (const { id, sym, result } of this.continuations.advance(u, changedTfs)) {
        let rows = records.get(id);
        if (!rows) records.set(id, (rows = { trades: [], open: [], pending: [] }));
        const template = this.templates.get(id)!;
        for (const trade of result.trades) {
          trade.kind = template.kind;
          rows.trades.push(trade);
        }
        if (result.open) rows.open.push(result.open);
        if (result.pending)
          rows.pending.push({
            sym,
            side: result.pending,
            ...(result.pendingProtect ? { protect: result.pendingProtect } : {}),
          });
      }
      const tapes = [...records].map(([id, rows]) => {
        const meta = this.templates.get(id)!;
        const tape = makeTape(
          id,
          meta.bot,
          meta.ind,
          meta.protect,
          meta.kind,
          meta.syms,
          rows.trades,
          rows.open,
          rows.pending,
        );
        if (meta.fromT !== undefined) tape.fromT = meta.fromT;
        if (meta.heldOnly) tape.heldOnly = true;
        return tape;
      });
      this.appended += Math.max(...appends.map((b) => b.n));
      return {
        tapes,
        ends: this.ends(),
        changed: [...updates.keys()],
        profile: this.continuations.profile,
      };
    } catch (error) {
      // Some continuations may have advanced before the error. Never retry a partly advanced generation.
      this.failed = true;
      throw error;
    }
  }
}
