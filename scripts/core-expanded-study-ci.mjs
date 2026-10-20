#!/usr/bin/env node
// Fixed public-data replays only. Dependency installation belongs to the workflow; scoring uses an offline guard.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  studyHash,
  studyJson,
  studySources,
  studyEnvironment,
  verifyStudySources,
} from "./core-22-symbol-study.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EXPECTED_NODE = "v24.19.0";
const EXPECTED_SOURCE = "bc7216bd7ab6000b7651a5d83054a16887854097a31847e7701b9a92754693f7";
const EXPECTED_FEED = "02ad14fd7d7ba3e89dee99026962a2ec66d8145d6beb36b17ab42a89a7d2004e";
const EXPECTED_FEED_BYTES = 39_528_851;
const FIXTURE = path.join(ROOT, "research/fixtures/postbase-20261017/manifest.json");
const INDEX = path.join(ROOT, "docs/simulations/expanded-postbase-v4-index-20261017.json");
const LOGS = path.join(ROOT, "runs/ci-postbase-logs-20261017");
const INPUT = path.join(ROOT, "runs/ci-postbase-input-20261017");
const REVIEW = path.join(ROOT, "runs/ci-postbase-review-20261017");
const GUARD = path.join(ROOT, "scripts/lib/core-test-offline-guard.cjs");
const NODE = ["--require", GUARD, "--experimental-strip-types", "--no-warnings"];
const CASES = [
  {
    key: "baseline20",
    role: "dev20",
    count: 20,
    variant: "baseline",
    endAt: "2026-10-16T21:00:00Z",
  },
  {
    key: "reclaim20",
    role: "dev20",
    count: 20,
    variant: "reclaim8",
    endAt: "2026-10-16T21:00:00Z",
  },
  {
    key: "baseline22",
    role: "val22",
    count: 22,
    variant: "baseline",
    endAt: "2026-10-17T21:00:00Z",
  },
  {
    key: "reclaim22",
    role: "val22",
    count: 22,
    variant: "reclaim8",
    endAt: "2026-10-17T21:00:00Z",
  },
].map((c) => ({
  ...c,
  caseId: `${c.variant}-${c.count}`,
  directory: path.join(ROOT, `runs/ci-postbase-${c.role}-${c.variant}-20261017`),
}));
const read = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const same = (a, b) => studyJson(a) === studyJson(b);
const demand = (ok, reason) => {
  if (!ok) throw new Error(reason);
};
const hashFile = (p) => createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const persist = (p, value) => {
  fs.writeFileSync(p + ".tmp", studyJson(value));
  fs.renameSync(p + ".tmp", p);
};

// The Python decoder holds one <=512KiB base64 part and one1MiB inflate buffer at a time.
const DECODER = String.raw`
import base64,gzip,hashlib,json,pathlib,sys
manifest_path=pathlib.Path(sys.argv[1]).resolve(); out=pathlib.Path(sys.argv[2]); root=manifest_path.parent
m=json.loads(manifest_path.read_text()); expected='02ad14fd7d7ba3e89dee99026962a2ec66d8145d6beb36b17ab42a89a7d2004e'
assert m['schema']=='cts-public-cached-feed-fixture-v1'
assert m['feed']=={'fileName':'feed.json','bytes':39528851,'sha256':expected}
assert m['gzip']['fileName']=='feed.json.gz' and m['gzip']['mtime']==0
assert m['gzip']['bytes']==7546998 and m['gzip']['sha256']=='1373d0a7fab7528d0528573385e19dfecf6f4ab353194231c639103af29aadcd'
assert all(m['encoding'].get(k)==v for k,v in {'compression':'gzip','chunkEncoding':'base64','chunkBytesMax':390000}.items())
assert isinstance(m['chunks'],list) and len(m['chunks'])>0
out.mkdir(parents=True,exist_ok=False); gz=out/'feed.json.gz'; feed=out/'feed.json'; gh=hashlib.sha256(); gn=0
with gz.open('xb') as target:
 for i,c in enumerate(m['chunks']):
  assert c['index']==i and c['path']==f'feed.json.gz.part-{i:03d}.b64'
  p=root/c['path']; assert not p.is_symlink() and p.resolve().parent==root
  raw=p.read_bytes(); assert 0<len(raw)<=524288 and len(raw)==c['textBytes']
  assert raw.endswith(b'\n') and b'\n' not in raw[:-1] and hashlib.sha256(raw).hexdigest()==c['textSha256']
  part=base64.b64decode(raw[:-1],validate=True)
  assert 0<len(part)<=390000 and len(part)==c['decodedBytes'] and hashlib.sha256(part).hexdigest()==c['decodedSha256']
  target.write(part); gh.update(part); gn+=len(part)
assert gn==m['gzip']['bytes'] and gh.hexdigest()==m['gzip']['sha256']
fh=hashlib.sha256(); fn=0
with gzip.open(gz,'rb') as source,feed.open('xb') as target:
 while True:
  b=source.read(1048576)
  if not b: break
  fn+=len(b); assert fn<=39528851; target.write(b); fh.update(b)
assert fn==39528851 and fh.hexdigest()==expected
print(json.dumps({'complete':True,'gzipBytes':gn,'gzipSha256':gh.hexdigest(),'feedBytes':fn,'feedSha256':fh.hexdigest(),'parts':len(m['chunks'])}))
`;

function verifyFixedInputs() {
  demand(
    process.version === EXPECTED_NODE,
    `Node must be ${EXPECTED_NODE}, found ${process.version}`,
  );
  const index = read(INDEX),
    fixture = read(FIXTURE),
    sources = studySources();
  demand(
    index.sourceSha256 === EXPECTED_SOURCE && same(index.sources, sources),
    "Current source files differ from the frozen v4 index",
  );
  demand(
    studyHash(studyJson(sources)) === EXPECTED_SOURCE,
    "Frozen source manifest SHA-256 mismatch",
  );
  demand(
    fixture.schema === "cts-public-cached-feed-fixture-v1" &&
      fixture.feed?.sha256 === EXPECTED_FEED &&
      fixture.feed?.bytes === EXPECTED_FEED_BYTES &&
      fixture.feed?.fileName === "feed.json",
    "Fixture does not contain the exact frozen public candle archive",
  );
  demand(
    Array.isArray(index.protocols) && index.protocols.length === 4,
    "Exactly four frozen v4 case definitions are required",
  );
  for (const c of CASES) {
    const expected = index.protocols.find((p) => p.case === c.caseId);
    demand(
      expected &&
        expected.variant === c.variant &&
        expected.symbols?.length === c.count &&
        expected.window?.endT === Date.parse(c.endAt),
      `Frozen case identity differs for ${c.key}`,
    );
  }
  return {
    index,
    fixture,
    sourceSha256: EXPECTED_SOURCE,
    indexSha256: hashFile(INDEX),
    fixtureManifestSha256: hashFile(FIXTURE),
  };
}

function validatePrepared(c, protocol, expected, sourceFeed) {
  verifyStudySources(protocol);
  const actual = protocol.cases?.[0];
  demand(
    protocol.cases?.length === 1 && actual?.id === c.caseId && actual.variant === c.variant,
    `Prepared case identity differs for ${c.key}`,
  );
  demand(
    same(protocol.sources, studySources()) &&
      studyHash(studyJson(protocol.sources)) === EXPECTED_SOURCE,
    `Prepared source changed for ${c.key}`,
  );
  demand(
    same(protocol.window, expected.window) && same(actual.symbols, expected.symbols),
    `Prepared window/universe differs for ${c.key}`,
  );
  demand(
    actual.feedSha256 === expected.feedSha256 && hashFile(actual.feed) === expected.feedSha256,
    `Prepared feed differs for ${c.key}`,
  );
  demand(
    actual.runtime.settingsSha256 === expected.runtimeSettingsSha256 &&
      actual.runtime.settings.focus.length === expected.focusCount,
    `Prepared runtime settings/WF differ for ${c.key}`,
  );
  demand(
    same(protocol.book, expected.book) &&
      same(protocol.budget, expected.budget) &&
      same(protocol.execution, expected.execution),
    `Prepared sizing/resource policy differs for ${c.key}`,
  );
  demand(
    protocol.originalFeed.path === sourceFeed && protocol.originalFeed.sha256 === EXPECTED_FEED,
    `Prepared original feed differs for ${c.key}`,
  );
  demand(
    actual.runtime.cost === 0.0015 &&
      actual.runtime.settings.cost === 0.0015 &&
      actual.runtime.settings.fees.taker === 0.0005 &&
      actual.runtime.settings.fees.slippage === 0.00025,
    `Cost components differ for ${c.key}`,
  );
  demand(
    actual.runtime.settings.sizing.mode === "equityPct" &&
      actual.runtime.settings.sizing.pct === 0.001 &&
      actual.runtime.settings.paperBalance === 1000 &&
      protocol.book.leverage === 10,
    `Sizing differs for ${c.key}`,
  );
  demand(
    actual.runtime.wf.preH === 24 &&
      actual.runtime.wf.longH === 24 &&
      actual.runtime.wf.simH === 24 &&
      actual.runtime.replayPreloadAll === true,
    `Replay history/preload differs for ${c.key}`,
  );
  return {
    key: c.key,
    directory: c.directory,
    caseId: c.caseId,
    protocolSha256: hashFile(path.join(c.directory, "protocol.json")),
    feedSha256: actual.feedSha256,
    runtimeSettingsSha256: actual.runtime.settingsSha256,
    sourceSha256: EXPECTED_SOURCE,
  };
}

function progressMirror(file, label) {
  let offset = 0;
  return () => {
    if (!fs.existsSync(file)) return;
    let fd;
    try {
      const size = fs.statSync(file).size;
      if (size < offset) offset = 0;
      if (size === offset) return;
      const start = Math.max(offset, size - 32 * 1024),
        skipped = start - offset,
        buffer = Buffer.alloc(size - start);
      fd = fs.openSync(file, "r");
      const bytes = fs.readSync(fd, buffer, 0, buffer.length, start);
      offset = start + bytes;
      console.log(`\n[${label} progress ${new Date().toISOString()}]`);
      if (skipped) console.log(`[${skipped} older new log bytes omitted; full log retained]`);
      process.stdout.write(buffer.subarray(0, bytes));
      if (bytes && buffer[bytes - 1] !== 10) process.stdout.write("\n");
    } catch (error) {
      console.error(`[${label} progress read failed: ${String(error)}]`);
    } finally {
      if (fd !== undefined) fs.closeSync(fd);
    }
  };
}

async function runProcess(command, args, log, state, signalState, progress = null) {
  demand(!signalState.interrupted, "CI orchestration was interrupted");
  const fd = fs.openSync(log, "wx"),
    started = Date.now();
  const mirror = progress ? progressMirror(progress.file, progress.label) : null;
  const progressTimer = mirror ? setInterval(mirror, 30_000) : null;
  progressTimer?.unref();
  console.log(`[CI step start] ${path.basename(log)} ${new Date(started).toISOString()}`);
  try {
    const result = await new Promise((resolve) => {
      const child = spawn(command, args, {
        cwd: ROOT,
        env: studyEnvironment(),
        stdio: ["ignore", fd, fd],
      });
      signalState.child = child;
      child.once("error", (e) => resolve({ exitCode: null, signal: null, error: String(e) }));
      child.once("close", (exitCode, signal) => resolve({ exitCode, signal }));
    });
    signalState.child = null;
    if (signalState.escalation) {
      clearTimeout(signalState.escalation);
      signalState.escalation = null;
    }
    const record = { command, args, log, seconds: (Date.now() - started) / 1000, ...result };
    state.steps.push(record);
    console.log(
      `[CI step finished] ${path.basename(log)} exit=${result.exitCode ?? result.signal ?? result.error} seconds=${record.seconds}`,
    );
    demand(
      !signalState.interrupted && result.exitCode === 0,
      `CI step failed or interrupted: ${path.basename(log)} (${result.exitCode ?? result.signal ?? result.error})`,
    );
    return record;
  } finally {
    if (progressTimer) clearInterval(progressTimer);
    mirror?.();
    fs.closeSync(fd);
  }
}

export async function expandedStudyCiMain(argv = process.argv.slice(2)) {
  demand(
    argv.length === 0 || same(argv, ["--check"]),
    "Usage: core-expanded-study-ci.mjs [--check]",
  );
  const fixed = verifyFixedInputs();
  if (argv[0] === "--check") {
    console.log(
      studyJson({
        checked: true,
        node: process.version,
        sourceSha256: fixed.sourceSha256,
        indexSha256: fixed.indexSha256,
        fixtureManifestSha256: fixed.fixtureManifestSha256,
        cases: CASES.map((x) => x.caseId),
        strategyScoring: false,
      }),
    );
    return;
  }
  demand(
    process.env.GITHUB_ACTIONS === "true",
    "Scoring is restricted to the isolated GitHub runner; use --check for local validation",
  );
  fs.mkdirSync(LOGS, { recursive: true });
  const metadataFile = path.join(LOGS, "orchestration.json");
  demand(
    !fs.existsSync(metadataFile),
    "Preserve the previous CI attempt; orchestration evidence already exists",
  );
  const git = spawnSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" });
  demand(git.status === 0, "Cannot record the exact checked-out commit");
  demand(
    !process.env.GITHUB_SHA || git.stdout.trim() === process.env.GITHUB_SHA,
    "Checked-out commit differs from the triggering GitHub commit",
  );
  const state = {
    schema: "cts-expanded-study-ci-v1",
    complete: false,
    status: "starting",
    startedAt: new Date().toISOString(),
    node: process.version,
    commit: git.stdout.trim(),
    githubCommit: process.env.GITHUB_SHA ?? null,
    githubRunId: process.env.GITHUB_RUN_ID ?? null,
    githubRunAttempt: process.env.GITHUB_RUN_ATTEMPT ?? null,
    orchestratorSha256: hashFile(fileURLToPath(import.meta.url)),
    sourceSha256: fixed.sourceSha256,
    indexSha256: fixed.indexSha256,
    fixtureManifestSha256: fixed.fixtureManifestSha256,
    marketAcquisitionRequests: 0,
    sourceChanged: false,
    preparedBeforeScoring: false,
    prepared: [],
    steps: [],
  };
  const signalState = { interrupted: null, child: null, escalation: null };
  const onSignal = (signal) => {
    signalState.interrupted ??= signal;
    state.status = "interrupted";
    if (signalState.child) {
      signalState.child.kill(signal);
      signalState.escalation ??= setTimeout(() => signalState.child?.kill("SIGKILL"), 10000);
    }
    persist(metadataFile, state);
  };
  const interrupt = () => onSignal("SIGINT"),
    terminate = () => onSignal("SIGTERM");
  process.on("SIGINT", interrupt);
  process.on("SIGTERM", terminate);
  persist(metadataFile, state);
  try {
    state.status = "decoding";
    persist(metadataFile, state);
    await runProcess(
      "python3",
      ["-c", DECODER, FIXTURE, INPUT],
      path.join(LOGS, "decode.log"),
      state,
      signalState,
    );
    const sourceFeed = path.join(INPUT, "feed.json");
    demand(
      hashFile(sourceFeed) === EXPECTED_FEED &&
        fs.statSync(sourceFeed).size === EXPECTED_FEED_BYTES,
      "Decoded source feed hash/size mismatch",
    );
    for (const c of CASES) {
      state.status = `preparing-${c.key}`;
      persist(metadataFile, state);
      await runProcess(
        process.execPath,
        [
          ...NODE,
          path.join(ROOT, "scripts/core-22-symbol-study.mjs"),
          "prepare",
          "--feed",
          sourceFeed,
          "--out",
          c.directory,
          "--symbols",
          String(c.count),
          "--variant",
          c.variant,
          "--end-at",
          c.endAt,
          "--cost",
          "0.0015",
          "--lane-history-days",
          "11",
          "--timeout-min",
          "180",
        ],
        path.join(LOGS, `prepare-${c.key}.log`),
        state,
        signalState,
      );
      state.prepared.push(
        validatePrepared(
          c,
          read(path.join(c.directory, "protocol.json")),
          fixed.index.protocols.find((x) => x.case === c.caseId),
          sourceFeed,
        ),
      );
    }
    verifyFixedInputs();
    demand(
      state.prepared.length === 4,
      "All four equivalent v4 protocols must be sealed before any score",
    );
    state.preparedBeforeScoring = true;
    state.status = "all-four-prepared";
    persist(metadataFile, state);
    for (const c of CASES) {
      verifyFixedInputs();
      state.status = `running-${c.key}`;
      persist(metadataFile, state);
      await runProcess(
        process.execPath,
        [
          ...NODE,
          path.join(ROOT, "scripts/core-22-symbol-study.mjs"),
          "run",
          "--protocol",
          path.join(c.directory, "protocol.json"),
          "--case",
          c.caseId,
        ],
        path.join(LOGS, `run-${c.key}.log`),
        state,
        signalState,
        {
          file: path.join(c.directory, c.caseId, "engine.log"),
          label: c.key,
        },
      );
      const dir = path.join(c.directory, c.caseId),
        result = read(path.join(dir, "run-result.json")),
        summary = read(path.join(dir, "summary.json"));
      demand(
        result.complete === true &&
          result.status === "complete" &&
          summary.complete === true &&
          result.summarySha256 === hashFile(path.join(dir, "summary.json")),
        `Incomplete ${c.key}; no later case or review may run`,
      );
      console.log(`\n[Completed ${c.key}: full hourly summary]\n`);
      console.log(fs.readFileSync(path.join(dir, "summary.md"), "utf8"));
    }
    demand(!signalState.interrupted, "Interrupted before final review");
    state.status = "reviewing";
    persist(metadataFile, state);
    await runProcess(
      process.execPath,
      [
        ...NODE,
        path.join(ROOT, "scripts/core-expanded-study-review.mjs"),
        ...CASES.flatMap((c) => [`--${c.key}`, path.join(c.directory, c.caseId)]),
        "--out",
        REVIEW,
      ],
      path.join(LOGS, "review.log"),
      state,
      signalState,
    );
    demand(!signalState.interrupted, "Interrupted during final review");
    const markdown = fs.readFileSync(path.join(REVIEW, "review.md"), "utf8");
    console.log(markdown);
    if (process.env.GITHUB_STEP_SUMMARY)
      fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown);
    state.complete = true;
    state.status = "complete";
  } catch (error) {
    state.error = String(error);
    state.status = signalState.interrupted ? "interrupted" : "failed";
    console.error(state.error);
    process.exitCode =
      signalState.interrupted === "SIGINT" ? 130 : signalState.interrupted === "SIGTERM" ? 143 : 1;
  } finally {
    state.finishedAt = new Date().toISOString();
    persist(metadataFile, state);
    process.off("SIGINT", interrupt);
    process.off("SIGTERM", terminate);
    if (signalState.escalation) clearTimeout(signalState.escalation);
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  await expandedStudyCiMain();
