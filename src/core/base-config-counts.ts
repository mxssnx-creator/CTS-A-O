// Exact configured-cell accounting for the full Base calculation. Returns are already net of the supplied cost;
// the counter never simulates, subtracts cost again, promotes a cell, or substitutes a sibling's qualification.
import type { Gates, Protect } from "./domain/types.ts";
import { statsOf, type TradeLike } from "./metrics/stats.ts";
import { minPfOf } from "./minimal-coord.ts";
import { passesBase } from "./pipeline/pipeline.ts";

export type BaseConfigCountOptions = {
  gates: Pick<Gates, "minPf" | "minTrades" | "maxDdr" | "rangeMinPf">;
  cost: number;
  cutT: number;
  fromT: number;
};

export interface BaseConfigCountRow {
  bot: string;
  ind: string;
  tag: string;
  kind: string;
  configured: number;
  evaluated: number;
  pfPassed: number;
  passed: number;
  notEvaluated: Record<string, number>;
  minPf: number;
  floorPf: number;
  cost: number;
  cutT: number;
  fromT: number;
  closes: number;
  gp: number;
  gl: number;
  firstEntryT: number | null;
  lastExitT: number | null;
}

const FLOOR_PF = 1.1;

export class BaseConfigCounter {
  private readonly options: BaseConfigCountOptions;
  private readonly counts = new Map<string, BaseConfigCountRow>();

  constructor(options: BaseConfigCountOptions) {
    this.options = {
      ...options,
      gates: { ...options.gates, rangeMinPf: { ...options.gates.rangeMinPf } },
    };
  }

  record(
    bot: string,
    ind: string,
    protect: Protect,
    kind: string,
    trades: readonly TradeLike[],
    skipReason?: string,
  ): void {
    const o = this.options;
    const tag = protect.tag ?? "";
    const key = JSON.stringify([bot, ind, tag, kind]);
    let row = this.counts.get(key);
    if (!row) {
      row = {
        bot,
        ind,
        tag,
        kind,
        configured: 0,
        evaluated: 0,
        pfPassed: 0,
        passed: 0,
        notEvaluated: {},
        minPf: Math.max(FLOOR_PF, minPfOf(o.gates, tag)),
        floorPf: FLOOR_PF,
        cost: o.cost,
        cutT: o.cutT,
        fromT: o.fromT,
        closes: 0,
        gp: 0,
        gl: 0,
        firstEntryT: null,
        lastExitT: null,
      };
      this.counts.set(key, row);
    }
    row.configured++;
    const skip = (reason: string) => {
      row.notEvaluated[reason] = (row.notEvaluated[reason] ?? 0) + 1;
    };
    if (skipReason !== undefined) {
      skip(skipReason);
      return;
    }
    const closed: TradeLike[] = [];
    for (const trade of trades) {
      // Unknown timestamps cannot be safely placed inside or outside the causal window. Reject that entire cell,
      // retaining an explicit reason; silently dropping only its invalid losing samples would inflate its PF.
      if (
        !Number.isFinite(trade.entryT) ||
        !Number.isFinite(trade.exitT) ||
        trade.exitT < trade.entryT
      ) {
        skip("invalid-trades");
        return;
      }
      if (trade.entryT < o.fromT || trade.exitT > o.cutT) continue;
      if (!Number.isFinite(trade.r)) {
        skip("invalid-trades");
        return;
      }
      closed.push(trade);
    }
    closed.sort((a, b) => a.exitT - b.exitT || a.entryT - b.entryT);
    const stats = statsOf(closed, o.cutT);
    row.evaluated++;
    // The floor is a return ratio from actual gross gains/losses. In particular, a no-loss sample's finite display
    // sentinel is not used to decide whether that sample clears the PF floor.
    const returnPf = stats.gl > 0 ? stats.gp / stats.gl : stats.gp > 0 ? Infinity : 0;
    if (returnPf >= FLOOR_PF) row.pfPassed++;
    // The complete gate matches the running engine, including its disclosed no-loss score convention.
    if (passesBase(stats, { ...o.gates, minPf: row.minPf })) row.passed++;
    row.closes += stats.n;
    row.gp += stats.gp;
    row.gl += stats.gl;
    if (stats.n > 0) {
      row.firstEntryT =
        row.firstEntryT === null ? stats.firstT : Math.min(row.firstEntryT, stats.firstT);
      row.lastExitT = row.lastExitT === null ? stats.lastT : Math.max(row.lastExitT, stats.lastT);
    }
  }

  rows(): BaseConfigCountRow[] {
    return [...this.counts.values()]
      .sort(
        (a, b) =>
          a.bot.localeCompare(b.bot) ||
          a.ind.localeCompare(b.ind) ||
          a.tag.localeCompare(b.tag) ||
          a.kind.localeCompare(b.kind),
      )
      .map((row) => ({ ...row, notEvaluated: { ...row.notEvaluated } }));
  }
}
