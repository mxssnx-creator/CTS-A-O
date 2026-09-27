// Order sizing. equityPct (default): every order's unit notional is a fixed share of the equity at its entry —
// realized equity, compounding from the starting balance, so a drawdown shrinks the next orders and a profit grows
// them. fixed: every order's unit notional is the same amount. The Block volume multiplies the unit (the 8× stack
// cap applies upstream); a trade's P&L = r × unit, where r already carries its volume.
export interface SizingSettings {
  mode: "equityPct" | "fixed";
  /** equityPct: share of equity per order unit (0.02 = 2 %) */
  pct: number;
}

export const DEFAULT_SIZING: SizingSettings = { mode: "equityPct", pct: 0.02 };

export function sizingSettings(s?: Partial<SizingSettings> | null): SizingSettings {
  const mode = s?.mode === "fixed" ? "fixed" : "equityPct";
  const pct = Number(s?.pct);
  return {
    mode,
    pct: Number.isFinite(pct) ? Math.min(0.25, Math.max(0.001, pct)) : DEFAULT_SIZING.pct,
  };
}

/** Unit notional of an order entered at `equity` (fixed mode: `fixedNotional`). */
export const unitNotional = (s: SizingSettings, equity: number, fixedNotional: number) =>
  s.mode === "fixed" ? fixedNotional : Math.max(0, s.pct * equity);

export interface SizedBook {
  /** unit notional per order key (`cfg|sym|entryT`), closed and open orders */
  units: Map<string, number>;
  /** starting balance + realized P&L of the closed orders */
  realized: number;
  /** realized P&L only */
  pnl: number;
}

export const orderKey = (x: { cfg: string; sym: string; entryT: number }) =>
  `${x.cfg}|${x.sym}|${x.entryT}`;

/**
 * Size a book causally: in time order, each entry takes its unit from the realized equity at that moment (orders
 * that exited at or before it count), each exit adds r × unit. Open orders get their unit the same way.
 */
export function sizeBook(
  trades: ReadonlyArray<{ cfg: string; sym: string; entryT: number; exitT: number; r: number }>,
  open: ReadonlyArray<{ cfg: string; sym: string; entryT: number }>,
  opt: { balance: number; sizing: SizingSettings; fixedNotional: number },
): SizedBook {
  // events: exits before entries at the same instant (a close frees its result before the next entry)
  type Ev = { t: number; kind: 0 | 1; i: number; open: boolean };
  const ev: Ev[] = [];
  trades.forEach((x, i) => {
    ev.push({ t: x.entryT, kind: 1, i, open: false });
    ev.push({ t: x.exitT, kind: 0, i, open: false });
  });
  open.forEach((x, i) => ev.push({ t: x.entryT, kind: 1, i, open: true }));
  ev.sort((a, b) => a.t - b.t || a.kind - b.kind || Number(a.open) - Number(b.open) || a.i - b.i);
  const units = new Map<string, number>();
  const unitOf: number[] = new Array(trades.length).fill(0);
  let pnl = 0;
  for (const e of ev) {
    if (e.kind === 1) {
      const u = unitNotional(opt.sizing, opt.balance + pnl, opt.fixedNotional);
      if (e.open) units.set(orderKey(open[e.i]), u);
      else {
        unitOf[e.i] = u;
        units.set(orderKey(trades[e.i]), u);
      }
    } else pnl += trades[e.i].r * unitOf[e.i];
  }
  return { units, realized: opt.balance + pnl, pnl };
}
