/** Deadline based polling: no overlap, no catch-up burst, and no interval added to the task duration. */
export interface ProgressClock {
  now(): number;
  set(callback: () => void, delay: number): unknown;
  clear(handle: unknown): void;
}
const clock: ProgressClock = {
  now: () => performance.now(),
  set: (callback, delay) => {
    const timer = setTimeout(callback, delay);
    timer.unref?.();
    return timer;
  },
  clear: (timer) => clearTimeout(timer as ReturnType<typeof setTimeout>),
};
export interface ExecutionProgressStats {
  intervalMs: number;
  checks: number;
  lagMs: number;
  maxLagMs: number;
  missed: number;
  error: string | null;
}
export class ExecutionProgress {
  private timer: unknown = null;
  private epoch = 0;
  private inFlight: Promise<void> | null = null;
  private readonly step: () => void | Promise<void>;
  readonly intervalMs: number;
  private readonly time: ProgressClock;
  readonly stats: ExecutionProgressStats;
  constructor(step: () => void | Promise<void>, intervalMs = 100, time: ProgressClock = clock) {
    if (!Number.isFinite(intervalMs) || intervalMs < 1)
      throw new Error("Invalid execution interval");
    this.step = step;
    this.intervalMs = intervalMs;
    this.time = time;
    this.stats = { intervalMs, checks: 0, lagMs: 0, maxLagMs: 0, missed: 0, error: null };
  }
  start() {
    if (this.timer !== null) return;
    const epoch = ++this.epoch;
    const schedule = (deadline: number) => {
      this.timer = this.time.set(
        () => {
          if (epoch !== this.epoch) return;
          this.stats.lagMs = Math.max(0, this.time.now() - deadline);
          this.stats.maxLagMs = Math.max(this.stats.maxLagMs, this.stats.lagMs);
          this.stats.checks++;
          const running = (this.inFlight ?? Promise.resolve())
            .catch(() => {})
            .then(() => (epoch === this.epoch ? this.step() : undefined));
          this.inFlight = running;
          void running
            .then(
              () => {
                if (epoch === this.epoch) this.stats.error = null;
              },
              (err) => {
                if (epoch === this.epoch)
                  this.stats.error = err instanceof Error ? err.message : String(err);
              },
            )
            .finally(() => {
              if (this.inFlight === running) this.inFlight = null;
              if (epoch !== this.epoch) return;
              const next = deadline + this.intervalMs;
              const skipped = Math.max(
                0,
                Math.floor((this.time.now() - next) / this.intervalMs) + 1,
              );
              this.stats.missed += skipped;
              schedule(next + skipped * this.intervalMs);
            });
        },
        Math.max(0, deadline - this.time.now()),
      );
    };
    schedule(this.time.now() + this.intervalMs);
  }
  stop() {
    this.epoch++;
    if (this.timer !== null) this.time.clear(this.timer);
    this.timer = null;
  }
}
