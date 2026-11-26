/**
 * Admission keys only compare candidates in the current timestamp or entry minute.
 * Candidates are processed in chronological order, including across batch boundaries.
 */
export class EntryEventWindow {
  readonly duplicates = new Set<string>();
  readonly crowd = new Map<string, number>();
  readonly pairEvents = new Set<string>();
  private timestamp = NaN;
  private minute = NaN;

  advance(entryT: number): void {
    if (entryT !== this.timestamp) {
      this.duplicates.clear();
      this.crowd.clear();
      this.timestamp = entryT;
    }
    const minute = Math.floor(entryT / 60_000);
    if (minute !== this.minute) {
      this.pairEvents.clear();
      this.minute = minute;
    }
  }
}
