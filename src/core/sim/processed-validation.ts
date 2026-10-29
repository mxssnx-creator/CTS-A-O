import type { Trade } from "../domain/types.ts";
import { modeledUnitReturn, profitFactor } from "../metrics/stats.ts";

type SourceIdentity = Pick<Trade, "cfg" | "sym" | "side" | "entryT"> & { kind?: string };

/** Bounded own-context model history, independent of account funding and its downstream PF gate. */
export class ProcessedValidationBook {
  private readonly rows = new Map<string, number[]>();
  private readonly sources = new Map<string, { entryT: number; open: boolean }>();
  private readonly capacity: number;
  constructor(capacity: number) {
    if (!Number.isSafeInteger(capacity) || capacity < 1) throw new RangeError("invalid processed history capacity");
    this.capacity = capacity;
  }
  private key(cfg: string, sym: string, side: number, kind: string): string {
    return JSON.stringify([cfg, sym, side, kind]);
  }
  private sourceKey(x: SourceIdentity): string | null {
    return x.cfg.trim() && x.sym.trim() && (x.side === 1 || x.side === -1) && Number.isFinite(x.entryT)
      ? this.key(x.cfg, x.sym, x.side, x.kind ?? "normal") : null;
  }
  sourceBusy(x: SourceIdentity): boolean {
    const key = this.sourceKey(x);
    return key !== null && this.sources.get(key)?.open === true;
  }
  /** Take an own-context slot only after upstream qualification; retries and overlaps cannot become samples. */
  admitSource(x: SourceIdentity): boolean {
    const key = this.sourceKey(x);
    if (key === null) return false;
    const prior = this.sources.get(key);
    if (prior && (prior.open || prior.entryT >= x.entryT)) return false;
    this.sources.set(key, { entryT: x.entryT, open: true });
    return true;
  }
  /** Explicit intrinsic unit basis from a qualified compact source tape, never a venue fill or funded return. */
  closeSource(x: SourceIdentity & { unitR: number; markedOpen?: boolean }): void {
    const key = this.sourceKey(x);
    if (key === null || x.markedOpen) return;
    const source = this.sources.get(key);
    if (!source?.open || source.entryT !== x.entryT) return;
    source.open = false;
    this.append(key, x.unitR);
  }
  private append(key: string, r: number): void {
    const values = this.rows.get(key) ?? [];
    values.push(r);
    if (values.length > this.capacity) values.splice(0, values.length - this.capacity);
    this.rows.set(key, values);
  }
  /** Called only as an accepted order settles; open marks and rejected candidates are not observations. */
  close(trade: Trade): void {
    if (trade.markedOpen || !trade.cfg.trim() || !trade.sym.trim() || (trade.side !== 1 && trade.side !== -1)) return;
    const key = this.key(trade.cfg, trade.sym, trade.side, trade.kind ?? "normal");
    this.append(key, modeledUnitReturn(trade));
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
