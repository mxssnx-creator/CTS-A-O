#!/usr/bin/env node
// One memory-safe run of every test file, with coverage and a report.
//
//   node --experimental-strip-types --no-warnings scripts/test-all.mjs [--only <substr>] [--no-coverage]
//        [--min-free <MB>] [--kill-below <MB>] [--out <dir>] [--logs <dir>]
//
// - Files run one at a time, light suites first, heavy ones last, each in its own process with the allocator caps,
//   CTS_CORE_WORKERS=1, oom_score_adj 1000 (the kernel picks a test before a desk) and the network guard
//   (scripts/test-preload.mjs).
// - Before a file starts the container must have --min-free MB available (the same reading as the runtime's memory
//   guard, cgroupAvailMb); it waits up to 10 minutes, else the file is recorded as skipped with the reason. While a file
//   runs, it is killed if the available memory falls under --kill-below MB, so a desk sharing the container is never
//   endangered.
// - Coverage: V8 precise coverage of every process (NODE_V8_COVERAGE), merged across files into line and function
//   coverage per src/core module; modules no test loads are listed at 0 %.
// - Writes <out>/report-<date>.json and .md (default docs/tests). Exit 1 when any file failed or was killed.
import { spawn } from "node:child_process";
import {
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
  existsSync,
  mkdtempSync,
} from "node:fs";
import { join, relative, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { cgroupAvailMb } from "../src/core/server/memguard.server.ts";

const ROOT = resolve(fileURLToPath(import.meta.url), "../..");
const args = process.argv.slice(2);
const opt = (k, d) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? args[i + 1] : d;
};
const flag = (k) => args.includes(`--${k}`);
const ONLY = opt("only", "");
const COVERAGE = !flag("no-coverage");
const MIN_FREE = Number(opt("min-free", 3500));
const KILL_BELOW = Number(opt("kill-below", 900));
const OUT = resolve(ROOT, opt("out", "docs/tests"));
const LOGS = resolve(opt("logs", join(tmpdir(), "cts-test-logs")));
const DATE = new Date().toISOString().slice(0, 10);

/** suites that start full synthetic runtimes or long simulations: run last, with a longer timeout */
const HEAVY = [
  "runtime.test",
  "processing.test",
  "heal.test",
  "ranges.test",
  "regression.test",
  "signals.test",
  "presets.live.test",
  "block-matrix.test",
  "memguard-runtime.test",
  "gating-runtime.test",
  "boot.test",
  "fast.test",
  "adjust.test",
  "seats.test",
  "conns.test",
  "symmetry.test",
  "book-coverage.test",
  "trading-e2e.test",
  "signals-e2e.test",
  "api-contract.test",
  "ui-functional.test",
];
/** suites that need more headroom than --min-free before they start (MB) */
const NEED = {
  "ui-functional.test": 5500,
  "runtime.test": 4500,
  "processing.test": 4500,
  "book-coverage.test": 4500,
};
const needOf = (f) =>
  Math.max(
    MIN_FREE,
    ...Object.entries(NEED)
      .filter(([k]) => f.includes(`/${k}.`))
      .map(([, v]) => v),
  );
const heavyRank = (f) => {
  const i = HEAVY.findIndex((h) => f.endsWith(`/${h}.ts`) || f.endsWith(`/${h}.mjs`));
  return i < 0 ? -1 : HEAVY.length - i; // runtime.test last
};

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name.startsWith(".")) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const files = [
  ...walk(join(ROOT, "scripts")).filter((f) => f.endsWith(".test.mjs")),
  ...walk(join(ROOT, "src")).filter((f) => f.endsWith(".test.ts")),
]
  .map((f) => relative(ROOT, f))
  .filter((f) => !ONLY || f.includes(ONLY))
  // a previous report orders the light files by their measured duration
  .sort(
    (a, b) =>
      heavyRank(a) - heavyRank(b) || (prevDur(a) ?? 0) - (prevDur(b) ?? 0) || a.localeCompare(b),
  );

function prevDur(f) {
  prevDur.cache ??= (() => {
    try {
      const last = readdirSync(OUT)
        .filter((x) => /^report-.*\.json$/.test(x))
        .sort()
        .at(-1);
      const r = last ? JSON.parse(readFileSync(join(OUT, last), "utf8")) : null;
      return new Map((r?.files ?? []).map((x) => [x.file, x.ms]));
    } catch {
      return new Map();
    }
  })();
  return prevDur.cache.get(f);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rssMb = (pid) => {
  try {
    const m = /VmRSS:\s+(\d+)/.exec(readFileSync(`/proc/${pid}/status`, "utf8"));
    return m ? Math.round(Number(m[1]) / 1024) : 0;
  } catch {
    return 0;
  }
};

async function waitHeadroom(need = MIN_FREE) {
  const t0 = Date.now();
  for (;;) {
    const avail = cgroupAvailMb();
    if (avail == null || avail >= need) return { ok: true, avail };
    if (Date.now() - t0 > 600_000) return { ok: false, avail };
    await sleep(10_000);
  }
}

function parseTap(txt) {
  const n = (k) => {
    const m = new RegExp(`^# ${k} (\\d+)`, "m").exec(txt);
    return m ? Number(m[1]) : 0;
  };
  // failing leaf tests (a failing suite repeats its children's failure, so keep the names once)
  const failed = [...txt.matchAll(/^\s*not ok \d+ - (.*)$/gm)].map((m) =>
    m[1].replace(/\s+#.*$/, ""),
  );
  return {
    tests: n("tests"),
    pass: n("pass"),
    fail: n("fail"),
    cancelled: n("cancelled"),
    skipped: n("skipped"),
    todo: n("todo"),
    failed: [...new Set(failed)],
  };
}

// ---- coverage --------------------------------------------------------------------------------------------------
/** per module: covered code lines (any run) and functions (by start offset) */
const cov = new Map();
const srcCache = new Map();
function codeLines(file) {
  if (srcCache.has(file)) return srcCache.get(file);
  const src = readFileSync(file, "utf8");
  const starts = [0];
  for (let i = 0; i < src.length; i++) if (src.charCodeAt(i) === 10) starts.push(i + 1);
  // a code line: not blank, not only a comment, not only a closing bracket
  const code = [];
  let inBlock = false;
  for (let l = 0; l < starts.length; l++) {
    const line = src.slice(starts[l], (starts[l + 1] ?? src.length + 1) - 1);
    const t = line.trim();
    if (inBlock) {
      if (t.includes("*/")) inBlock = false;
      continue;
    }
    if (t.startsWith("/*")) {
      if (!t.includes("*/")) inBlock = true;
      continue;
    }
    if (
      !t ||
      t.startsWith("//") ||
      /^[\]})>;,]+$/.test(t) ||
      t.startsWith("import ") ||
      t.startsWith("export type ") ||
      t.startsWith("type ")
    )
      continue;
    code.push({ line: l, at: starts[l] + (line.length - line.trimStart().length) });
  }
  const r = { code, len: src.length };
  srcCache.set(file, r);
  return r;
}
function mergeCoverage(dir) {
  if (!existsSync(dir)) return;
  for (const f of readdirSync(dir)) {
    let data;
    try {
      data = JSON.parse(readFileSync(join(dir, f), "utf8"));
    } catch {
      continue;
    }
    for (const s of data.result ?? []) {
      if (!s.url?.startsWith("file://")) continue;
      const file = fileURLToPath(s.url);
      const rel = relative(ROOT, file);
      if (
        !rel.startsWith("src/core/") ||
        rel.endsWith(".test.ts") ||
        rel.endsWith("test-support.ts")
      )
        continue;
      const { code, len } = codeLines(file);
      // paint counts: outer ranges first, nested blocks after (sorted by start, then the longer first)
      const paint = new Int8Array(len + 1).fill(-1);
      const ranges = [];
      for (const fn of s.functions) for (const r of fn.ranges) ranges.push(r);
      ranges.sort((a, b) => a.startOffset - b.startOffset || b.endOffset - a.endOffset);
      for (const r of ranges)
        paint.fill(r.count > 0 ? 1 : 0, r.startOffset, Math.min(len, r.endOffset));
      const c = cov.get(rel) ?? { lines: new Set(), fns: new Map() };
      for (const x of code) if (paint[x.at] === 1) c.lines.add(x.line);
      for (const fn of s.functions) {
        const r0 = fn.ranges[0];
        if (!r0 || (r0.startOffset === 0 && fn.functionName === "")) continue; // the module itself
        const k = r0.startOffset;
        c.fns.set(k, (c.fns.get(k) ?? false) || r0.count > 0);
      }
      cov.set(rel, c);
    }
  }
}
function coverageTable() {
  const mods = walk(join(ROOT, "src/core"))
    .map((f) => relative(ROOT, f))
    .filter(
      (f) =>
        f.endsWith(".ts") &&
        !f.endsWith(".test.ts") &&
        !f.endsWith("test-support.ts") &&
        !f.endsWith(".d.ts"),
    );
  return mods
    .map((m) => {
      const { code } = codeLines(join(ROOT, m));
      const c = cov.get(m);
      const linesCov = c ? c.lines.size : 0;
      const fnTotal = c ? c.fns.size : null;
      const fnCov = c ? [...c.fns.values()].filter(Boolean).length : 0;
      return {
        module: m,
        loaded: !!c,
        lines: code.length,
        linesCovered: linesCov,
        linePct: code.length ? +((100 * linesCov) / code.length).toFixed(1) : 100,
        functions: fnTotal,
        functionsCovered: fnCov,
        fnPct: fnTotal ? +((100 * fnCov) / fnTotal).toFixed(1) : null,
      };
    })
    .sort((a, b) => a.module.localeCompare(b.module));
}

// ---- run -------------------------------------------------------------------------------------------------------
mkdirSync(OUT, { recursive: true });
mkdirSync(LOGS, { recursive: true });
const results = [];
const t0 = Date.now();
console.log(
  `test-all: ${files.length} files · coverage ${COVERAGE ? "on" : "off"} · min free ${MIN_FREE} MB · kill below ${KILL_BELOW} MB`,
);

for (const [i, file] of files.entries()) {
  const need = needOf(file);
  const head = await waitHeadroom(need);
  const tag = `[${i + 1}/${files.length}] ${file}`;
  if (!head.ok) {
    results.push({
      file,
      status: "skipped",
      reason: `memory: ${head.avail} MB available < ${need} MB for 10 min`,
      ms: 0,
    });
    console.log(`${tag} SKIPPED (memory ${head.avail} MB)`);
    continue;
  }
  const covDir = COVERAGE ? mkdtempSync(join(tmpdir(), "cts-cov-")) : null;
  const heavy = heavyRank(file) >= 0;
  const timeoutMs = heavy ? 60 * 60_000 : 20 * 60_000;
  const nodeArgs = [
    "--experimental-strip-types",
    "--no-warnings",
    "--import",
    "./scripts/test-preload.mjs",
    "--test-reporter=tap",
    file,
  ];
  const started = Date.now();
  const child = spawn(
    "sh",
    ["-c", 'echo 1000 > /proc/self/oom_score_adj 2>/dev/null; exec node "$@"', "sh", ...nodeArgs],
    {
      cwd: ROOT,
      env: {
        ...process.env,
        MALLOC_ARENA_MAX: "2",
        MALLOC_MMAP_THRESHOLD_: "1048576",
        CTS_CORE_WORKERS: "1",
        ...(covDir ? { NODE_V8_COVERAGE: covDir } : {}),
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let out = "";
  child.stdout.on("data", (d) => (out += d));
  child.stderr.on("data", (d) => (out += d));
  let peak = 0;
  let killed = null;
  const watch = setInterval(() => {
    peak = Math.max(peak, rssMb(child.pid));
    const avail = cgroupAvailMb();
    if (avail != null && avail < KILL_BELOW && !killed) {
      killed = `memory: container had ${avail} MB available (< ${KILL_BELOW} MB)`;
      child.kill("SIGKILL");
    }
    if (Date.now() - started > timeoutMs && !killed) {
      killed = `timeout after ${Math.round(timeoutMs / 60_000)} min`;
      child.kill("SIGKILL");
    }
  }, 2_000);
  const code = await new Promise((r) => child.on("close", (c) => r(c)));
  clearInterval(watch);
  const ms = Date.now() - started;
  const tap = parseTap(out);
  const log = join(LOGS, file.replace(/[/\\]/g, "__") + ".log");
  writeFileSync(log, out);
  const status = killed ? "killed" : code === 0 && tap.fail === 0 ? "pass" : "fail";
  results.push({
    file,
    status,
    code,
    ms,
    peakRssMb: peak,
    ...tap,
    ...(killed ? { reason: killed } : {}),
    log,
    tail: status === "pass" ? undefined : out.split("\n").slice(-60).join("\n"),
  });
  console.log(
    `${tag} ${status.toUpperCase()} · ${tap.pass}/${tap.tests} pass${tap.fail ? ` · ${tap.fail} fail` : ""} · ${(ms / 1000).toFixed(1)} s · peak ${peak} MB${killed ? ` · ${killed}` : ""}`,
  );
  if (covDir) {
    mergeCoverage(covDir);
    rmSync(covDir, { recursive: true, force: true });
  }
}

const coverage = COVERAGE ? coverageTable() : [];
const totals = results.reduce(
  (a, r) => ({
    files: a.files + 1,
    tests: a.tests + (r.tests ?? 0),
    pass: a.pass + (r.pass ?? 0),
    fail: a.fail + (r.fail ?? 0),
    skipped: a.skipped + (r.skipped ?? 0),
    filesFailed: a.filesFailed + (r.status === "fail" || r.status === "killed" ? 1 : 0),
    filesSkipped: a.filesSkipped + (r.status === "skipped" ? 1 : 0),
  }),
  { files: 0, tests: 0, pass: 0, fail: 0, skipped: 0, filesFailed: 0, filesSkipped: 0 },
);
const covSum = coverage.reduce(
  (a, m) => ({ lines: a.lines + m.lines, covered: a.covered + m.linesCovered }),
  { lines: 0, covered: 0 },
);
const report = {
  date: new Date().toISOString(),
  node: process.version,
  durationMs: Date.now() - t0,
  totals,
  coverage: COVERAGE
    ? {
        linePct: covSum.lines ? +((100 * covSum.covered) / covSum.lines).toFixed(1) : 0,
        modules: coverage,
      }
    : null,
  files: results,
};
const base = join(OUT, `report-${DATE}${ONLY ? `-${ONLY.replace(/[^\w.-]/g, "_")}` : ""}`);
writeFileSync(`${base}.json`, JSON.stringify(report, null, 1));

const md = [
  `# Test report ${DATE}`,
  "",
  `${totals.files} files · ${totals.tests} tests · **${totals.pass} pass · ${totals.fail} fail** · ${totals.skipped} skipped · files failed ${totals.filesFailed} · files skipped ${totals.filesSkipped} · ${(report.durationMs / 60_000).toFixed(1)} min · Node ${process.version}`,
  COVERAGE
    ? `\nLine coverage of src/core: **${report.coverage.linePct} %** (${covSum.covered} of ${covSum.lines} code lines).`
    : "",
  "",
  "## Files",
  "",
  "| file | status | tests | pass | fail | s | peak MB |",
  "|---|---|---:|---:|---:|---:|---:|",
  ...results.map(
    (r) =>
      `| ${r.file} | ${r.status}${r.reason ? ` (${r.reason})` : ""} | ${r.tests ?? ""} | ${r.pass ?? ""} | ${r.fail ?? ""} | ${(r.ms / 1000).toFixed(1)} | ${r.peakRssMb ?? ""} |`,
  ),
  "",
  ...(results.some((r) => r.failed?.length)
    ? [
        "## Failures",
        "",
        ...results
          .filter((r) => r.failed?.length)
          .flatMap((r) => [`### ${r.file}`, "", ...r.failed.map((f) => `- ${f}`), ""]),
      ]
    : []),
  ...(COVERAGE
    ? [
        "## Coverage per module",
        "",
        "| module | lines | covered | line % | functions % |",
        "|---|---:|---:|---:|---:|",
        ...coverage.map(
          (m) =>
            `| ${m.module}${m.loaded ? "" : " (not loaded by any test)"} | ${m.lines} | ${m.linesCovered} | ${m.linePct} | ${m.fnPct ?? ""} |`,
        ),
      ]
    : []),
  "",
].join("\n");
writeFileSync(`${base}.md`, md);
console.log(
  `\n${totals.pass}/${totals.tests} tests pass · ${totals.fail} fail · files failed ${totals.filesFailed} · skipped ${totals.filesSkipped}${COVERAGE ? ` · line coverage ${report.coverage.linePct} %` : ""}`,
);
console.log(`report: ${relative(ROOT, base)}.md / .json · logs: ${LOGS}`);
process.exit(totals.filesFailed ? 1 : 0);
