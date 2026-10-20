import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire, syncBuiltinESMExports } from "node:module";
import { cgroupAvailMb, cgroupMemoryEstimate, memHardMb, memInfo, memSoftMb } from "./memguard.server.ts";

const MB = 1048576;
const fields = { file: 5000 * MB, shmem: 0, active_file: 4000 * MB, inactive_file: 1000 * MB,
  file_mapped: 0, file_dirty: 0, file_writeback: 0, unevictable: 0 };
const stat = (values: Record<string, number | string>) => Object.entries(values).map(([key, value]) => `${key} ${value}`).join("\n");
const fixture = (stats = stat(fields), used = 7500 * MB, limit = 8192 * MB) => {
  const files: Record<string, string> = { "/proc/self/cgroup": "0::/app\n", "/sys/fs/cgroup/app/memory.max": String(limit),
    "/sys/fs/cgroup/app/memory.current": String(used), "/sys/fs/cgroup/app/memory.stat": stats };
  return (path: string) => files[path] ?? null;
};

test("complete v2 cache counters explain the measured trace without lowering memory reserves", () => {
  const read = fixture(stat({ file: 5_486_000_000, shmem: 0, active_file: 4_421_000_000, inactive_file: 1_065_000_000,
    file_mapped: 36_864, file_dirty: 265_000_000, file_writeback: 0, unevictable: 0 }), 7_580_000_000, 8_589_934_592);
  const estimate = cgroupMemoryEstimate(read)!;
  assert.equal(estimate.basis, "clean-file-estimate");
  assert.equal(estimate.version, 2);
  assert.equal(estimate.rawAvailMb, 963);
  assert.equal(estimate.cacheCreditMb, 4979);
  assert.equal(estimate.availMb, 5942);
  assert.equal(cgroupAvailMb(read), estimate.availMb);
  const previousHard = process.env.CTS_CORE_MEM_HARD_MB, previousSoft = process.env.CTS_CORE_MEM_SOFT_MB;
  try {
    delete process.env.CTS_CORE_MEM_HARD_MB; delete process.env.CTS_CORE_MEM_SOFT_MB;
    assert.equal(memHardMb(), 1200); assert.equal(memSoftMb(), 2500);
  } finally {
    if (previousHard === undefined) delete process.env.CTS_CORE_MEM_HARD_MB; else process.env.CTS_CORE_MEM_HARD_MB = previousHard;
    if (previousSoft === undefined) delete process.env.CTS_CORE_MEM_SOFT_MB; else process.env.CTS_CORE_MEM_SOFT_MB = previousSoft;
  }
});

test("mapped, dirty, writeback, shmem and unevictable bytes never supply complete-stat cache credit", () => {
  for (const excluded of ["file_mapped", "file_dirty", "file_writeback", "shmem", "unevictable"] as const) {
    const estimate = cgroupMemoryEstimate(fixture(stat({ ...fields, [excluded]: fields.file })))!;
    assert.equal(estimate.basis, "clean-file-estimate", excluded);
    assert.equal(estimate.cacheCreditMb, 0, excluded);
    assert.equal(estimate.availMb, 692, excluded);
  }
  const overlap = cgroupMemoryEstimate(fixture(stat({ ...fields, file_mapped: 2000 * MB, file_dirty: 2000 * MB,
    file_writeback: 2000 * MB, unevictable: 2000 * MB })))!;
  assert.equal(overlap.cacheCreditMb, 0, "overlapping exclusions may conservatively exhaust credit");
});

test("cache credit is capped by both regular file type and LRU counters, and never masks an over-limit deficit", () => {
  assert.equal(cgroupMemoryEstimate(fixture(stat({ ...fields, file: 1200 * MB, shmem: 200 * MB })))!.cacheCreditMb, 1000);
  assert.equal(cgroupMemoryEstimate(fixture(stat({ ...fields, active_file: 200 * MB, inactive_file: 300 * MB })))!.cacheCreditMb, 500);
  assert.equal(cgroupMemoryEstimate(fixture(stat({ ...fields, shmem: fields.file + MB })))!.cacheCreditMb, 0);
  const over = cgroupMemoryEstimate(fixture(stat({ ...fields, file: 300 * MB, active_file: 300 * MB,
    inactive_file: 0 }), 8400 * MB))!;
  assert.equal(over.rawAvailMb, 0); assert.equal(over.cacheCreditMb, 300); assert.equal(over.availMb, 92);
  const zero = cgroupMemoryEstimate(fixture(stat(Object.fromEntries(Object.keys(fields).map((key) => [key, 0])))))!;
  assert.equal(zero.basis, "clean-file-estimate"); assert.equal(zero.cacheCreditMb, 0);
  const large = cgroupMemoryEstimate(fixture(stat({ ...fields, file: Number.MAX_SAFE_INTEGER,
    active_file: Number.MAX_SAFE_INTEGER, inactive_file: Number.MAX_SAFE_INTEGER })))!;
  assert.equal(large.availMb, 8192, "safe individual counters cannot overflow the capped LRU sum");
  assert.equal(large.cacheCreditMb, 7500, "credit never exceeds current usage");
});

test("every missing or invalid complete-stat field falls back to valid inactive-file credit only", () => {
  for (const key of Object.keys(fields)) {
    const missing = { ...fields } as Record<string, number | string>; delete missing[key];
    for (const stats of [stat(missing), ...["-1", "1.5", "NaN", "Infinity", "9007199254740992", "1 extra"].map((invalid) => stat({ ...fields, [key]: invalid })),
      `${stat(fields)}\n${key} 0`]) {
      const estimate = cgroupMemoryEstimate(fixture(stats))!;
      assert.equal(estimate.basis, "inactive-file", `${key}: ${stats}`);
      assert.equal(estimate.cacheCreditMb, key === "inactive_file" ? 0 : 1000, key);
      assert.equal(estimate.availMb, key === "inactive_file" ? 692 : 1692, key);
    }
  }
  for (const invalid of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(cgroupMemoryEstimate(fixture(stat(fields), invalid)), null, "invalid v2 current is unknown");
    assert.equal(cgroupMemoryEstimate(fixture(stat(fields), 7500 * MB, invalid)), null, "invalid v2 limit is unknown");
  }
});

test("v1 retains its existing total-inactive-file semantics despite complete v2-style fields", () => {
  for (const [total, credit] of [[200, 200], [0, 1000]]) {
    const read = (path: string) => ({ "/proc/self/cgroup": "4:memory:/legacy\n", "/sys/fs/cgroup/memory/legacy/memory.limit_in_bytes": String(8192 * MB),
      "/sys/fs/cgroup/memory/legacy/memory.usage_in_bytes": String(7500 * MB),
      "/sys/fs/cgroup/memory/legacy/memory.stat": `${stat(fields)}\ntotal_inactive_file ${total * MB}\ntotal_active_file ${4000 * MB}` } as Record<string, string>)[path] ?? null;
    const estimate = cgroupMemoryEstimate(read)!;
    assert.equal(estimate.version, 1); assert.equal(estimate.basis, "inactive-file");
    assert.equal(estimate.cacheCreditMb, credit); assert.equal(estimate.availMb, 692 + credit);
  }
});

test("memInfo retains the host cap and exposes the cgroup estimate basis and raw/cache contribution", () => {
  const builtin = createRequire(import.meta.url)("node:fs") as typeof import("node:fs");
  const originalRead = builtin.readFileSync;
  const read = fixture();
  builtin.readFileSync = ((path: string, ...args: unknown[]) => {
    if (path === "/proc/meminfo") return "MemAvailable: 2048000 kB\n";
    const value = read(path); return value === null ? Reflect.apply(originalRead, builtin, [path, ...args]) : value;
  }) as typeof originalRead;
  syncBuiltinESMExports();
  try {
    const info = memInfo(Date.now() + 10_000);
    assert.equal(info.hostAvailMb, 2000); assert.equal(info.availMb, 2000);
    assert.equal(info.cgroup?.availMb, 5692); assert.equal(info.cgroup?.rawAvailMb, 692);
    assert.equal(info.cgroup?.cacheCreditMb, 5000); assert.equal(info.cgroup?.basis, "clean-file-estimate");
  } finally { builtin.readFileSync = originalRead; syncBuiltinESMExports(); }
});

test("runtime replay evidence retains the host cap and cgroup estimate diagnostics", async () => {
  const { CoreRuntime } = await import("./runtime.server.ts");
  const { CoreDb } = await import("./db.server.ts");
  const rt = new CoreRuntime(new CoreDb(":memory:"), { symbols: 1 }, { market: "synthetic" });
  try {
    const cgroup = cgroupMemoryEstimate(fixture())!;
    const info = { availMb: 2000, hostAvailMb: 2000, cgroup, rssMb: 50, heapMb: 10, level: "soft" as const, at: Date.now() };
    (rt as unknown as { memStatus(value: typeof info): void }).memStatus(info);
    assert.equal(rt.status.mem?.hostAvailMb, 2000); assert.deepEqual(rt.status.mem?.cgroup, cgroup);
    assert.equal(rt.status.mem?.availMb, 2000);
  } finally { rt.dispose(); }
});
