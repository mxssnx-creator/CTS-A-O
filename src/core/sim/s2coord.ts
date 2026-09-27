// Stable-02 Block coordination (CTS-A branch Stable-02, src/lib/desk/vst.ts), on the executed orders of a run:
//  - last-N windows: every N closes on a symbol form a window; a window that averaged negative or had PF < 1
//    holds back that symbol's entries until its next N closes (tickBlockWindow / skipLiveSymbol), and a symbol
//    whose executed orders have PF < 1 (≥ 2 closes) takes no new entries
//  - relation volume: every `evalH` hours each relation (symbol, side, symbol+side, indication, config, strategy
//    type, bot, indication+type) is judged on its best last-N window (N 1–6); relations with PF ≥ minPf add
//    `ratio` volume each (best one per major relation kind plus every minor one, at most 8), capped at maxMult
//    (evalBlockRelations → relVolumeFactor)
// Causal: only orders closed before an entry count.

export interface S2CoordSettings {
  windows: boolean;
  windowN: number;
  relVolume: boolean;
  ratio: number;
  minPf: number;
  maxMult: number;
  evalH: number;
}

const H = 3_600_000;

interface Win {
  n: number;
  ring: number[];
  closed: number;
  pauseLeft: number;
  lastPf: number;
  lastNet: number;
}

const emptyWin = (n: number): Win => ({
  n,
  ring: [],
  closed: 0,
  pauseLeft: 0,
  lastPf: 0,
  lastNet: 0,
});

/** tickBlockWindow: a close enters the window; every n closes the window is judged */
function tick(w: Win, pnl: number) {
  w.ring.push(pnl);
  if (w.ring.length > w.n * 2) w.ring.splice(0, w.ring.length - w.n * 2);
  w.closed++;
  if (w.pauseLeft > 0) w.pauseLeft--;
  if (w.closed % w.n !== 0) return;
  const last = w.ring.slice(-w.n);
  let gp = 0;
  let gl = 0;
  for (const x of last) {
    if (x > 0) gp += x;
    else gl -= x;
  }
  const net = gp - gl;
  w.lastNet = net;
  w.lastPf = gl < 1e-12 ? (gp > 0 ? 4 : 0) : gp / gl;
  if (net / w.n < 0 || w.lastPf < 1) w.pauseLeft = w.n;
}

const MAJOR = new Set(["ind", "kind", "side", "book"]);
const MINOR = new Set(["cfg", "sub"]);

export class S2Coord {
  private o: S2CoordSettings;
  private sym = new Map<string, Win>();
  private symPf = new Map<string, { gp: number; gl: number; n: number }>();
  private rel = new Map<string, Win[]>();
  private factor = 0;
  private evalAt = -Infinity;
  constructor(o: S2CoordSettings) {
    this.o = o;
  }

  /** an executed order closed (in exit order) */
  close(x: { cfg: string; sym: string; side: number; r: number; kind?: string }) {
    const pnl = x.r;
    if (this.o.windows) {
      let w = this.sym.get(x.sym);
      if (!w) this.sym.set(x.sym, (w = emptyWin(this.o.windowN)));
      tick(w, pnl);
      const s = this.symPf.get(x.sym) ?? { gp: 0, gl: 0, n: 0 };
      if (pnl > 0) s.gp += pnl;
      else s.gl -= pnl;
      s.n++;
      this.symPf.set(x.sym, s);
    }
    if (this.o.relVolume) {
      const [bot, ind] = x.cfg.split("|");
      const side = x.side === 1 ? "long" : "short";
      const kind = x.kind ?? "normal";
      const keys = [
        `sym:${x.sym}`,
        `side:${side}`,
        `leg:${x.sym}:${side}`,
        `ind:${ind}`,
        `cfg:${x.cfg}`,
        `kind:${kind}`,
        `book:${bot}`,
        `sub:${ind}:${kind}`,
      ];
      for (const k of keys) {
        let ws = this.rel.get(k);
        if (!ws) this.rel.set(k, (ws = [1, 2, 3, 4, 5, 6].map(emptyWin)));
        for (const w of ws) tick(w, pnl);
      }
    }
  }

  /** why an entry on `sym` is held back (null = allowed) */
  blocked(sym: string): string | null {
    if (!this.o.windows) return null;
    if ((this.sym.get(sym)?.pauseLeft ?? 0) > 0) return "s2Window";
    const s = this.symPf.get(sym);
    if (s && s.n >= 2 && (s.gl < 1e-12 ? (s.gp > 0 ? 4 : 0) : s.gp / s.gl) < 1) return "s2SymbolPf";
    return null;
  }

  /** volume multiple for an entry at t (1 + relation factor, re-evaluated every evalH hours) */
  volume(t: number): number {
    if (!this.o.relVolume) return 1;
    if (t - this.evalAt >= this.o.evalH * H) {
      this.evalAt = Math.floor(t / (this.o.evalH * H)) * this.o.evalH * H;
      this.factor = this.evaluate();
    }
    return 1 + this.factor;
  }

  private evaluate(): number {
    const cands: Array<{ key: string; pf: number; net: number }> = [];
    for (const [key, ws] of this.rel) {
      let best: { key: string; pf: number; net: number; n: number } | null = null;
      for (const w of ws)
        if (w.closed >= w.n && (!best || w.lastPf > best.pf))
          best = { key, pf: w.lastPf, net: w.lastNet, n: w.n };
      if (best && best.pf >= this.o.minPf) cands.push(best);
    }
    const byPrefix = new Map<string, { key: string; pf: number }>();
    for (const c of cands) {
      const p = c.key.split(":")[0];
      if (MAJOR.has(p) && (!byPrefix.has(p) || c.pf > byPrefix.get(p)!.pf)) byPrefix.set(p, c);
    }
    const picks = new Set<string>([...byPrefix.values()].map((c) => c.key));
    for (const c of cands) if (MINOR.has(c.key.split(":")[0])) picks.add(c.key);
    const winners = Math.min(8, picks.size);
    return Math.min(Math.max(0, this.o.maxMult - 1), winners * this.o.ratio);
  }

  snapshot(t: number) {
    return {
      factor: this.o.relVolume ? this.volume(t) - 1 : 0,
      paused: [...this.sym.keys()].filter((s) => this.blocked(s) !== null),
    };
  }
}
