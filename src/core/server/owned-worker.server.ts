import { Worker } from "node:worker_threads";
import { resolveWorkerUrl, workerExecArgv, workersAvailable } from "./pool.server.ts";

/** One private stateful realtime thread. At most one request; timeouts terminate its state before retrying.
 * Never queues behind historical work, never cancels another desk and never falls back to main-thread allocation. */
export class OwnedWorker {
  private worker: Worker | null = null;
  private serial = 0;
  private pending: {
    id: number;
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
    timer: ReturnType<typeof setTimeout>;
  } | null = null;
  private heapMb: number;
  constructor(heapMb = 512) {
    this.heapMb = heapMb;
  }
  get available() {
    return workersAvailable();
  }
  get busy() {
    return this.pending !== null;
  }

  async run<R>(message: Record<string, unknown>, timeoutMs: number): Promise<R> {
    if (this.pending) throw new Error("realtime worker already processing a request");
    if (!this.available) throw new Error("realtime worker unavailable");
    if (!this.worker) {
      const url = resolveWorkerUrl();
      const worker = new Worker(url, {
        execArgv: workerExecArgv(url),
        resourceLimits: { maxOldGenerationSizeMb: this.heapMb },
      });
      this.worker = worker;
      worker.unref();
      worker.on("message", (m) => {
        if (this.worker !== worker || m.id !== this.pending?.id) return;
        if (m.progress !== undefined && m.ok === undefined) return;
        const pending = this.pending;
        if (!pending) return;
        clearTimeout(pending.timer);
        this.pending = null;
        if (m.ok) pending.resolve(m);
        else {
          this.dispose(new Error(m.error ?? "realtime worker calculation failed"));
          pending.reject(new Error(m.error ?? "realtime worker calculation failed"));
        }
      });
      worker.on("error", (error) => {
        if (this.worker === worker) this.dispose(error);
      });
      worker.on("exit", (code) => {
        if (this.worker === worker) this.dispose(new Error(`realtime worker exited (${code})`));
      });
    }
    const id = ++this.serial;
    return await new Promise<R>((resolve, reject) => {
      const timer = setTimeout(
        () => this.dispose(new Error(`realtime worker timeout after ${timeoutMs} ms`)),
        timeoutMs,
      );
      this.pending = { id, timer, resolve: (v) => resolve(v as R), reject };
      try {
        this.worker!.postMessage({ ...message, id });
      } catch (error) {
        this.dispose(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  dispose(reason = new Error("realtime worker stopped")) {
    const worker = this.worker;
    this.worker = null;
    const pending = this.pending;
    this.pending = null;
    if (pending) {
      clearTimeout(pending.timer);
      pending.reject(reason);
    }
    if (worker) void worker.terminate();
  }
}
