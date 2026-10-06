// Stable-02 Block coordination (CTS-A branch Stable-02, src/lib/desk/vst.ts), on the closed results of the
// Real candidates (the Block feed: every candidate is computed and judged whether it executed or not, so a held
// back symbol keeps being judged and comes back):
//  - last-N windows: every N closes on a symbol × direction form a window; a window that averaged negative or had
//    PF < 1 holds back that direction's entries on the symbol until its next N closes (tickBlockWindow /
//    skipLiveSymbol), and a symbol × direction whose latest 24 results have PF < 1 takes no new entries. Long and
//    short are judged apart (6 Oct: losing shorts never pause the longs of the symbol)
//  - relation volume: every `evalH` hours each relation (symbol, side, symbol+side, indication, config, strategy
//    type, bot, indication+type) is judged on its best last-N window (N 1–6); relations with PF ≥ minPf add
//    `ratio` volume each (best one per major relation kind plus every minor one, at most 8), capped at maxMult
//    (evalBlockRelations → relVolumeFactor)
// Causal: only results closed before an entry count.

export interface S2CoordSettings {
  windows: boolean;
  windowN: number;
  /** pause length in closes; defaults to the window length */
  pauseN?: number;
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
function tick(w: Win, pnl: number, pauseN?: number) {
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
  if (net / w.n < 0 || w.lastPf < 1) w.pauseLeft = pauseN && pauseN > 0 ? pauseN : w.n;
}

const symSide = (sym: string, side: number) => `${sym}|${side > 0 ? 1 : -1}`;

const MAJOR = new Set(["ind", "kind", "side", "book"]);
const MINOR = new Set(["cfg", "sub"]);

export class S2Coord {
  private o: S2CoordSettings;
  /** windows per symbol × direction (`sym|±1`) */
  private sym = new Map<string, Win>();
  /** latest results per symbol × direction (rolling PF) */
  private symLast = new Map<string, number[]>();
  private rel = new Map<string, Win[]>();
  private factor = 0;
  private evalAt = -Infinity;
  constructor(o: S2CoordSettings) {
    this.o = o;
  }

  /** a candidate closed (in exit order) */
  close(x: {
    cfg?: string;
    ind?: string;
    sym: string;
    side: number;
    r: number;
    kind?: string;
    type?: string;
  }) {
    const pnl = x.r;
    if (this.o.windows) {
      const k = symSide(x.sym, x.side);
      let w = this.sym.get(k);
      if (!w) this.sym.set(k, (w = emptyWin(this.o.windowN)));
      tick(w, pnl, this.o.pauseN);
      let l = this.symLast.get(k);
      if (!l) this.symLast.set(k, (l = []));
      l.push(pnl);
      if (l.length > 24) l.shift();
    }
    if (this.o.relVolume) {
      const [bot, cfgInd] = (x.cfg ?? "").split("|");
      const ind = x.ind ?? cfgInd ?? "";
      const side = x.side === 1 ? "long" : "short";
      const kind = x.type ?? x.kind ?? "normal";
      const keys = [
        `sym:${x.sym}`,
        `side:${side}`,
        `leg:${x.sym}:${side}`,
        `ind:${ind}`,
        ...(x.cfg ? [`cfg:${x.cfg}`] : []),
        `kind:${kind}`,
        ...(bot && x.cfg ? [`book:${bot}`] : []),
        `sub:${ind}:${kind}`,
      ];
      for (const k of keys) {
        let ws = this.rel.get(k);
        if (!ws)
          this.rel.set(
            k,
            (ws = Array.from({ length: Math.max(1, this.o.windowN) }, (_, i) => emptyWin(i + 1))),
          );
        for (const w of ws) tick(w, pnl, this.o.pauseN);
      }
    }
  }

  /** why an entry on `sym` in direction `side` is held back (null = allowed) */
  blocked(sym: string, side: number): string | null {
    if (!this.o.windows) return null;
    const k = symSide(sym, side);
    if ((this.sym.get(k)?.pauseLeft ?? 0) > 0) return "s2Window";
    const l = this.symLast.get(k);
    if (l && l.length >= 6) {
      let gp = 0;
      let gl = 0;
      for (const x of l) {
        if (x > 0) gp += x;
        else gl -= x;
      }
      if ((gl < 1e-12 ? (gp > 0 ? 4 : 0) : gp / gl) < 1) return "s2SymbolPf";
    }
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
      // symbol × direction keys (`sym|±1`) held back now
      paused: [...this.sym.keys()].filter((k) => {
        const [sym, side] = k.split("|");
        return this.blocked(sym, Number(side)) !== null;
      }),
    };
  }
}
