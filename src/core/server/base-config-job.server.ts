// Background Base counts use the trading simulator, but never retain tapes or hold the foreground compute open.
import { createHash } from "node:crypto";
import { isPlainKind, protectKind } from "../pipeline/pipeline.ts";
import type { BaseConfigCountRow } from "../base-config-counts.ts";
import type { BaseConfigChunkMessage, BaseConfigChunkReply } from "./pool.server.ts";
import { axisRangeVariants, axisVariants } from "../sim/walkforward.ts";

export interface BaseConfigSummary {
  state: "pending" | "running" | "partial" | "complete" | "cancelled" | "error" | "disabled";
  key: string;
  settingsAt: number;
  cutT: number;
  fromT: number;
  cost: number;
  floorPf: number;
  totalPairs: number;
  population: "focusedIndicationCandidates";
  admittedPairs: number;
  admittedPairKeys: string[];
  donePairs: number;
  totalChunks: number;
  doneChunks: number;
  configured: number;
  plannedConfigured: number;
  evaluated: number;
  pfPassed: number;
  passed: number;
  updatedAt: number;
  reason?: string;
  error?: string;
}
export type BaseConfigSnapshot = { summary: BaseConfigSummary; rows: BaseConfigCountRow[] };
export type BaseConfigJob = {
  key: string;
  settingsAt: number;
  common: Omit<BaseConfigChunkMessage, "type" | "pair" | "protects" | "dcaOpt" | "kinds" | "seen">;
  pairs: string[];
  protects: BaseConfigChunkMessage["protects"];
  dcaOpt?: BaseConfigChunkMessage["dcaOpt"];
  kinds: string[];
  admittedPairKeys?: string[];
  reason?: string;
};

type CountChunk = Pick<BaseConfigChunkMessage, "protects" | "kinds" | "dcaOpt"> & {
  axisWindow?: { offset: number; limit: number };
  configured: number;
};
function chunksFor(job: BaseConfigJob, pair: string): CountChunk[] {
  const regular = job.protects.filter((p) => job.kinds.includes(protectKind(p)));
  // A large universe lowers the cell count per slice; there is always a yield between cells/jobs.
  const bars = job.common.bars.reduce((n, b) => n + b.n, 0);
  const size = Math.max(1, Math.min(32, Math.floor(8_000_000 / Math.max(1, bars * 2))));
  const chunks: CountChunk[] = [];
  for (let i = 0; i < regular.length; i += size) {
    const protects = regular.slice(i, i + size);
    chunks.push({ protects, kinds: job.kinds.filter(isPlainKind), configured: protects.length });
  }
  if (!job.dcaOpt) return chunks;
  const tags = job.common.floors.pairTags?.[pair];
  const wide = !(job.dcaOpt.axis?.perRange && tags && !tags.includes(""));
  const dcaKinds = job.kinds.filter((k) => k === "dca" || k === "dca-active");
  if (wide && !job.dcaOpt.noDca && dcaKinds.length) {
    const per = Math.max(1, Math.floor(size / dcaKinds.length));
    for (let i = 0; i < job.dcaOpt.protects.length; i += per) {
      const dca = job.dcaOpt.protects.slice(i, i + per);
      chunks.push({
        protects: [],
        kinds: dcaKinds,
        dcaOpt: { ...job.dcaOpt, protects: dca, axis: undefined },
        configured: dca.length * dcaKinds.length,
      });
    }
  }
  if (job.dcaOpt.axis && job.kinds.includes("axis")) {
    const n =
      (wide ? axisVariants(job.dcaOpt.axis, job.dcaOpt.protects).length : 0) +
      (job.dcaOpt.axis.perRange && tags
        ? axisRangeVariants(job.dcaOpt.axis, job.protects, tags, job.common.floors.pairTps?.[pair])
            .length
        : 0);
    for (let offset = 0; offset < n; offset += size) {
      const limit = Math.min(size, n - offset);
      chunks.push({
        protects: job.protects,
        kinds: ["axis"],
        dcaOpt: job.dcaOpt,
        axisWindow: { offset, limit },
        configured: limit,
      });
    }
  }
  return chunks;
}

/** Includes the exact causal bar values, settings, grid and qualified full pair identities, without copying bars. */
export function baseConfigJobKey(job: Omit<BaseConfigJob, "key" | "settingsAt">): string {
  const h = createHash("sha256");
  const { bars, ...common } = job.common;
  h.update(JSON.stringify({ ...job, common, key: undefined }));
  for (const b of bars) {
    h.update(`${b.sym}|${b.tfMin}|`);
    for (const k of ["t", "o", "h", "l", "c", "v"] as const)
      h.update(new Uint8Array(b[k].buffer, b[k].byteOffset, b[k].byteLength));
  }
  return h.digest("hex");
}

export function mergeBaseConfigRows(
  into: BaseConfigCountRow[],
  add: readonly BaseConfigCountRow[],
): void {
  for (const row of add) {
    const x = into.find(
      (v) => v.bot === row.bot && v.ind === row.ind && v.tag === row.tag && v.kind === row.kind,
    );
    if (!x) {
      into.push({ ...row, notEvaluated: { ...row.notEvaluated } });
      continue;
    }
    for (const k of [
      "configured",
      "evaluated",
      "pfPassed",
      "passed",
      "closes",
      "gp",
      "gl",
    ] as const)
      x[k] += row[k];
    for (const [reason, n] of Object.entries(row.notEvaluated))
      x.notEvaluated[reason] = (x.notEvaluated[reason] ?? 0) + n;
    if (row.firstEntryT !== null)
      x.firstEntryT =
        x.firstEntryT === null ? row.firstEntryT : Math.min(x.firstEntryT, row.firstEntryT);
    if (row.lastExitT !== null)
      x.lastExitT = x.lastExitT === null ? row.lastExitT : Math.max(x.lastExitT, row.lastExitT);
  }
  into.sort(
    (a, b) =>
      a.bot.localeCompare(b.bot) ||
      a.ind.localeCompare(b.ind) ||
      a.tag.localeCompare(b.tag) ||
      a.kind.localeCompare(b.kind),
  );
}

/** One bounded worker message at a time. A superseded reply is discarded before any row/status publication. */
export class BaseConfigJobRunner {
  snapshot: BaseConfigSnapshot | null = null;
  private job: BaseConfigJob | null = null;
  private epoch = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private running = false;
  private chunkIndex = 0;
  private readonly deps: {
    foreground: () => boolean;
    ready: () => boolean;
    memoryOkay: () => boolean;
    available: () => boolean;
    run: (message: BaseConfigChunkMessage) => Promise<BaseConfigChunkReply>;
    publish: (snapshot: BaseConfigSnapshot) => void;
  };
  constructor(deps: BaseConfigJobRunner["deps"]) {
    this.deps = deps;
  }

  restore(value: BaseConfigSnapshot | undefined): void {
    if (!value) return;
    this.snapshot = {
      summary: {
        ...value.summary,
        state: "cancelled",
        reason: "restartRequired",
        updatedAt: Date.now(),
      },
      rows: value.rows,
    };
    this.deps.publish(this.snapshot);
  }
  request(job: BaseConfigJob): void {
    if (this.job?.key === job.key && this.job.settingsAt === job.settingsAt) return;
    if (
      this.snapshot?.summary.key === job.key &&
      this.snapshot.summary.state === "complete" &&
      this.snapshot.summary.settingsAt === job.settingsAt
    )
      return;
    this.epoch++;
    this.job = job;
    this.seenPair = "";
    this.seen = [];
    this.chunkIndex = 0;
    const scope = job.pairs.map((pair) => chunksFor(job, pair));
    const { cutT, fromT, cost } = job.common.options;
    this.snapshot = {
      summary: {
        state:
          job.reason === "typeDisabled"
            ? "disabled"
            : job.pairs.length && job.kinds.length
              ? "pending"
              : "complete",
        key: job.key,
        settingsAt: job.settingsAt,
        cutT,
        fromT,
        cost,
        floorPf: 1.1,
        population: "focusedIndicationCandidates",
        admittedPairs: job.admittedPairKeys?.length ?? 0,
        admittedPairKeys: [...(job.admittedPairKeys ?? [])],
        totalPairs: job.pairs.length,
        donePairs: 0,
        totalChunks: scope.reduce((n, chunks) => n + chunks.length, 0),
        doneChunks: 0,
        plannedConfigured: scope.reduce(
          (n, chunks) => n + chunks.reduce((m, c) => m + c.configured, 0),
          0,
        ),
        configured: 0,
        evaluated: 0,
        pfPassed: 0,
        passed: 0,
        updatedAt: Date.now(),
        reason: job.reason,
      },
      rows: [],
    };
    this.publish();
    if (["complete", "disabled"].includes(this.snapshot.summary.state)) this.job = null;
    else this.schedule();
  }
  cancel(reason: string): void {
    this.epoch++;
    this.job = null;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.seenPair = "";
    this.seen = [];
    if (this.snapshot && this.snapshot.summary.state !== "cancelled") {
      this.snapshot.summary.state = "cancelled";
      this.snapshot.summary.reason = reason;
      this.publish();
    }
  }
  private publish(): void {
    if (!this.snapshot) return;
    this.snapshot.summary.updatedAt = Date.now();
    this.deps.publish(this.snapshot);
  }
  private schedule(delay = 25): void {
    if (
      this.timer ||
      this.running ||
      !this.job ||
      !this.snapshot ||
      ["complete", "disabled", "error"].includes(this.snapshot.summary.state)
    )
      return;
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.drive();
    }, delay);
    this.timer.unref?.();
  }
  private async drive(): Promise<void> {
    const job = this.job;
    const state = this.snapshot;
    const epoch = this.epoch;
    if (!job || !state) return;
    if (!this.deps.ready() || this.deps.foreground()) {
      this.schedule(250);
      return;
    }
    if (!this.deps.memoryOkay()) {
      state.summary.state = "error";
      state.summary.error = "Base counts paused by memory guard; unevaluated cells remain unknown";
      state.summary.reason = "memoryPressure";
      this.job = null;
      this.publish();
      return;
    }
    if (!this.deps.available()) {
      state.summary.state = "error";
      state.summary.error = "Base count workers unavailable; no foreground fallback";
      state.summary.reason = "workersUnavailable";
      this.job = null;
      this.publish();
      return;
    }
    this.running = true;
    try {
      // Completed slices carry only identities across requests, never trade arrays or mutable simulator caches.
      const pairIndex = state.summary.donePairs;
      const pair = job.pairs[pairIndex];
      const chunks = pair ? chunksFor(job, pair) : [];
      const chunkIndex = this.chunkIndex;
      const chunk = chunks[chunkIndex];
      if (!pair) {
        state.summary.state = "complete";
        if (!state.summary.configured && !state.summary.reason) state.summary.reason = "noConfigs";
        this.publish();
        return;
      }
      if (!chunk) {
        state.summary.donePairs++;
        this.chunkIndex = 0;
        state.summary.state = state.summary.donePairs === job.pairs.length ? "complete" : "partial";
        if (
          state.summary.state === "complete" &&
          !state.summary.configured &&
          !state.summary.reason
        )
          state.summary.reason = "noConfigs";
        this.publish();
        return;
      }
      const seen = this.seenPair === pair ? this.seen : [];
      state.summary.state = "running";
      this.publish();
      const reply = await this.deps.run({
        ...job.common,
        protects: chunk.protects,
        kinds: chunk.kinds,
        dcaOpt: chunk.dcaOpt,
        floors: { ...job.common.floors, countAxisWindow: chunk.axisWindow },
        type: "base-config-count",
        pair,
        seen,
      });
      if (epoch !== this.epoch || this.job !== job) return;
      if (reply.rows.some((r) => `${r.bot}|${r.ind}` !== pair))
        throw new Error("Base count worker returned another pair's rows");
      if (
        reply.rows.reduce((n, r) => n + r.configured, 0) !== chunk.configured ||
        reply.rows.some(
          (r) =>
            r.configured !==
              r.evaluated + Object.values(r.notEvaluated).reduce((n, v) => n + v, 0) ||
            r.pfPassed > r.evaluated ||
            r.passed > r.pfPassed ||
            r.cost !== job.common.options.cost ||
            r.cutT !== job.common.options.cutT ||
            r.fromT !== job.common.options.fromT,
        )
      )
        throw new Error("Base count worker returned inconsistent cell counts or provenance");
      mergeBaseConfigRows(state.rows, reply.rows);
      this.seenPair = pair;
      this.seen = [...seen, ...reply.seen];
      state.summary.doneChunks++;
      this.chunkIndex++;
      if (chunkIndex + 1 === chunks.length) {
        state.summary.donePairs++;
        this.chunkIndex = 0;
        this.seenPair = "";
        this.seen = [];
      }
      for (const k of ["configured", "evaluated", "pfPassed", "passed"] as const)
        state.summary[k] = state.rows.reduce((n, r) => n + r[k], 0);
      state.summary.state = state.summary.donePairs === job.pairs.length ? "complete" : "partial";
      if (state.summary.state === "complete" && !state.summary.configured)
        state.summary.reason = "noConfigs";
      this.publish();
    } catch (error) {
      if (epoch === this.epoch && this.job === job) {
        state.summary.state = "error";
        state.summary.reason = "workerError";
        state.summary.error = error instanceof Error ? error.message : String(error);
        this.publish();
      }
    } finally {
      this.running = false;
      if (epoch === this.epoch && ["complete", "error", "disabled"].includes(state.summary.state)) {
        this.job = null;
        this.seenPair = "";
        this.seen = [];
      }
      this.schedule();
    }
  }
  private seenPair = "";
  private seen: string[] = [];
}
