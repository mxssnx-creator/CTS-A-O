import type { Trade } from "../domain/types.ts";
import { modeledUnitReturn, profitFactor } from "../metrics/stats.ts";

/** A bounded chronological record of orders the modeled book actually accepted and closed. */
export class ProcessedValidationBook {
  private readonly rows = new Map<string, number[]>();
  private readonly capacity: number;
  constructor(capacity: number) {
    if (!Number.isSafeInteger(capacity) || capacity < 1) throw new RangeError("invalid processed history capacity");
    this.capacity = capacity;
  }
  private key(cfg: string, sym: string, side: number, kind: string): string {
    return JSON.stringify([cfg, sym, side, kind]);
  }
  /** Called only as an accepted order settles; open marks and rejected candidates are not observations. */
  close(trade: Trade): void {
    if (trade.markedOpen || !trade.cfg.trim() || !trade.sym.trim() || (trade.side !== 1 && trade.side !== -1)) return;
    const key = this.key(trade.cfg, trade.sym, trade.side, trade.kind ?? "normal");
    const values = this.rows.get(key) ?? [];
    values.push(modeledUnitReturn(trade));
    if (values.length > this.capacity) values.splice(0, values.length - this.capacity);
    this.rows.set(key, values);
  }
  /** A Base-qualified context can bootstrap until its own full processed sample is available. */
  verdict(cfg: string, sym: string, side: number, kind: string, n: number, minPf: number): {
    ok: boolean; state: "warming" | "qualified" | "failed" | "unknown"; n: number; pf: number | null;
  } {
    if (!cfg.trim() || !sym.trim() || (side !== 1 && side !== -1) || !Number.isSafeInteger(n) || n < 1 ||
      n > this.capacity || !Number.isFinite(minPf) || minPf <= 0)
      return { ok: false, state: "unknown", n: 0, pf: null };
    const values = this.rows.get(this.key(cfg, sym, side, kind)) ?? [];
    const last = values.slice(-n);
    if (last.some((r) => !Number.isFinite(r))) return { ok: false, state: "unknown", n: last.length, pf: null };
    if (last.length < n) return { ok: true, state: "warming", n: last.length, pf: null };
    let gp = 0, gl = 0;
    for (const r of last) if (r > 0) gp += r; else gl -= r;
    if (!Number.isFinite(gp) || !Number.isFinite(gl)) return { ok: false, state: "unknown", n: last.length, pf: null };
    const pf = profitFactor(gp, gl), ok = gp > gl && pf >= minPf;
    return { ok, state: ok ? "qualified" : "failed", n: last.length, pf };
  }
}
