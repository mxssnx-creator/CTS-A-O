type Identity = { cfg: string; sym: string; side: number; entryT: number; blockPredecessor?: true };
type Candidate = Omit<Identity, "entryT"> & { entryT?: number; id?: string };
const context = (x: Candidate) => JSON.stringify([x.cfg, x.sym, x.side]);
const exact = (x: Candidate, at: number) => JSON.stringify([x.cfg, x.sym, x.side, at]);

/** Entry ownership is immutable within a published book; tick marks/protection may still change in place. */
export class ProcessingPredecessors {
  private book?: WeakRef<readonly Identity[]>;
  private length = -1;
  private contexts = new Set<string>();
  private entries = new Set<string>();

  has(positions: readonly Identity[], lane: Candidate): boolean {
    if (lane.blockPredecessor) return true;
    if (this.book?.deref() !== positions || this.length !== positions.length) {
      this.book = new WeakRef(positions);
      this.length = positions.length;
      this.contexts.clear(); this.entries.clear();
      for (const p of positions) if (p.blockPredecessor) {
        this.contexts.add(context(p)); this.entries.add(exact(p, p.entryT));
      }
    }
    const at = lane.entryT ?? (lane.id ? Number(lane.id.slice(lane.id.lastIndexOf("|") + 1)) : undefined);
    return at === undefined || !Number.isFinite(at) ? this.contexts.has(context(lane)) : this.entries.has(exact(lane, at));
  }
}
