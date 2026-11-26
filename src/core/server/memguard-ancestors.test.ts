import assert from "node:assert/strict";
import { test } from "node:test";
import { cgroupMemoryEstimate, memLevel } from "./memguard.server.ts";

const MB = 1048576;
const read = (files: Record<string, string>) => (path: string) => files[path] ?? null;

test("a cgroup v2 parent can limit an unlimited child", () => {
  const root = "/sys/fs/cgroup";
  const files = {
    "/proc/self/cgroup": "0::/group/worker\n",
    [`${root}/group/worker/memory.max`]: "max\n",
    [`${root}/group/memory.max`]: String(4096 * MB),
    [`${root}/group/memory.current`]: String(3900 * MB),
    [`${root}/group/memory.stat`]: `inactive_file ${100 * MB}\n`,
  };
  const estimate = cgroupMemoryEstimate(read(files));
  assert.ok(estimate);
  assert.equal(estimate.availMb, 296);
  assert.equal(memLevel(estimate.availMb, 2500, 1200), "hard");
});

test("the tightest v2 ancestor or child wins, including ancestor usage by siblings", () => {
  const root = "/sys/fs/cgroup";
  const files = {
    "/proc/self/cgroup": "0::/top/slice/worker\n",
    [`${root}/top/slice/worker/memory.max`]: String(4096 * MB),
    [`${root}/top/slice/worker/memory.current`]: String(1024 * MB),
    [`${root}/top/slice/worker/memory.stat`]: "inactive_file 0\n",
    [`${root}/top/slice/memory.max`]: "max\n",
    [`${root}/top/memory.max`]: String(8192 * MB),
    [`${root}/top/memory.current`]: String(8000 * MB),
    [`${root}/top/memory.stat`]: `inactive_file ${8 * MB}\n`,
  };
  assert.equal(cgroupMemoryEstimate(read(files))?.availMb, 200);
  files[`${root}/top/memory.current`] = String(1000 * MB);
  assert.equal(cgroupMemoryEstimate(read(files))?.availMb, 3072);
});

test("a finite v1 ancestor is read when the child has an unlimited sentinel", () => {
  const root = "/sys/fs/cgroup/memory";
  const files = {
    "/proc/self/cgroup": "4:memory:/group/worker\n",
    [`${root}/group/worker/memory.limit_in_bytes`]: "9223372036854771712",
    [`${root}/group/memory.limit_in_bytes`]: String(4096 * MB),
    [`${root}/group/memory.usage_in_bytes`]: String(4000 * MB),
    [`${root}/group/memory.stat`]: `total_inactive_file ${4 * MB}\n`,
  };
  const estimate = cgroupMemoryEstimate(read(files));
  assert.equal(estimate?.version, 1);
  assert.equal(estimate?.availMb, 100);
});

test("a zero v2 memory limit is a hard limit, not an unlimited group", () => {
  const estimate = cgroupMemoryEstimate(read({
    "/proc/self/cgroup": "0::/group\n",
    "/sys/fs/cgroup/group/memory.max": "0\n",
    "/sys/fs/cgroup/group/memory.current": "0\n",
    "/sys/fs/cgroup/group/memory.stat": "inactive_file 0\n",
  }));
  assert.equal(estimate?.availMb, 0);
});
