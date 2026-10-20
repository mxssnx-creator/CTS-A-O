import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Worker } from "node:worker_threads";
import {
  CORE_WORKER_FILENAME,
  buildCoreWorker,
  coreWorkerOutputDirs,
} from "./build-core-worker.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), "cts-worker-deployment-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}

async function nitroFunction(root, name = "__server.func", runtime = "nodejs24.x") {
  const dir = join(root, ".vercel/output/functions", name);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, ".vc-config.json"), JSON.stringify({ handler: "index.mjs", runtime }));
  await writeFile(join(dir, "index.mjs"), "// existing Nitro server entry\n");
  await writeFile(join(dir, "_runtime.mjs"), "// existing Nitro runtime\n");
  return dir;
}

function closedBars(n = 400) {
  const tfMin = 15;
  const b = {
    sym: "T-USDT",
    tfMin,
    n,
    t: new Float64Array(n),
    o: new Float64Array(n),
    h: new Float64Array(n),
    l: new Float64Array(n),
    c: new Float64Array(n),
    v: new Float64Array(n),
  };
  let price = 100;
  for (let i = 0; i < n; i++) {
    b.t[i] = Date.UTC(2026, 8, 1) + i * tfMin * 60_000;
    b.o[i] = price;
    price += 0.1;
    b.c[i] = price;
    b.h[i] = price + 0.25;
    b.l[i] = b.o[i] - 0.25;
    b.v[i] = 1000;
  }
  return b;
}

function request(worker, message) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Packaged worker did not answer its calculation request")),
      15_000,
    );
    const finish = (fn, value) => {
      clearTimeout(timeout);
      worker.off("message", onMessage);
      worker.off("error", onError);
      fn(value);
    };
    const onError = (error) => finish(reject, error);
    const onMessage = (reply) => {
      if (reply.id !== message.id || !Object.hasOwn(reply, "ok")) return;
      if (reply.ok) finish(resolve, reply);
      else finish(reject, new Error(String(reply.error)));
    };
    worker.on("message", onMessage);
    worker.once("error", onError);
    worker.postMessage(message);
  });
}

test("finds the generated Nitro Node entry layout and excludes browser, edge and unrelated API outputs", async (t) => {
  const root = await fixture(t);
  const server = await nitroFunction(root);
  const renamed = await nitroFunction(root, "__nitro.func");
  await nitroFunction(root, "edge.func", "edge");
  const api = await nitroFunction(root, "unrelated-api.func");
  await rm(join(api, "_runtime.mjs"));
  const node = join(root, ".output/server");
  await mkdir(node, { recursive: true });
  await writeFile(join(node, "index.mjs"), "// node-server entry");
  const browser = join(root, ".vercel/output/static");
  await mkdir(browser, { recursive: true });
  await writeFile(join(browser, "index.mjs"), "// public asset");
  assert.deepEqual(await coreWorkerOutputDirs(root), [server, renamed, node].sort());
});

test("fails without a real Nitro server entry before creating worker artifacts", async (t) => {
  const root = await fixture(t);
  await assert.rejects(
    buildCoreWorker({ root: ROOT, outputRoot: root }),
    /No built Nitro Node server entry/,
  );
  assert.deepEqual(await readdir(root), []);
});

test(
  "bundles one real standalone ESM worker, preserves server assets, and completes Base config work without TypeScript flags",
  { timeout: 60_000 },
  async (t) => {
    const root = await fixture(t);
    const server = await nitroFunction(root);
    const node = join(root, ".output/server");
    await mkdir(join(node, "_chunks"), { recursive: true });
    await writeFile(join(node, "index.mjs"), "// existing node-server entry");
    await writeFile(join(node, "_chunks/server.mjs"), "// existing server chunk");
    await writeFile(join(server, CORE_WORKER_FILENAME), "// stale worker");
    const outputs = await buildCoreWorker({ root: ROOT, outputRoot: root });
    assert.deepEqual(
      outputs,
      [join(server, CORE_WORKER_FILENAME), join(node, CORE_WORKER_FILENAME)].sort(),
    );
    assert.equal(
      await readFile(join(server, "index.mjs"), "utf8"),
      "// existing Nitro server entry\n",
    );
    assert.equal(
      await readFile(join(server, "_runtime.mjs"), "utf8"),
      "// existing Nitro runtime\n",
    );
    assert.equal(
      await readFile(join(node, "_chunks/server.mjs"), "utf8"),
      "// existing server chunk",
    );
    const bundle = await readFile(outputs[0], "utf8");
    assert.ok(bundle.length > 1000, "actual engine code was bundled");
    assert.doesNotMatch(bundle, /(?:from\s*|import\s*\()\s*["'][^"']+\.ts["']/);
    assert.equal(await readFile(outputs[1], "utf8"), bundle);
    for (const directory of [server, node])
      assert.ok(!(await readdir(directory)).some((name) => name.endsWith(".tmp")));
    const worker = new Worker(outputs[0], { execArgv: [] });
    try {
      const bars = closedBars();
      const reply = await request(worker, {
        id: 41,
        type: "base-config-count",
        bars: [bars],
        pair: "follow|tactic-trend-s@m15",
        protects: [{ tp: 0.01, sl: 0.01, trail: 0, hold: 32 }],
        cost: 0.002,
        floors: { minSl: 0, minTrail: 0 },
        kinds: ["normal"],
        seen: [],
        options: {
          gates: { minPf: 1.1, minTrades: 1, maxDdr: 0 },
          cost: 0.002,
          fromT: bars.t[0],
          cutT: bars.t[bars.n - 1] + 15 * 60_000,
        },
      });
      assert.equal(reply.ok, true);
      assert.equal(reply.rows.length, 1);
      const row = reply.rows[0];
      assert.equal(row.ind, "tactic-trend-s@m15");
      assert.equal(row.configured, 1);
      assert.equal(row.evaluated, 1);
      assert.ok(row.closes > 0, "the production worker simulated real closed positions");
      assert.ok(row.gp > 0);
      assert.equal(row.pfPassed, 1);
      assert.equal(row.passed, 1);
      assert.equal(row.minPf, 1.1);
      assert.equal(reply.seen.length, 1);
    } finally {
      await worker.terminate();
    }
  },
);

test("both build modes package the worker after Vite and before production database migration", async () => {
  const pkg = JSON.parse(await readFile(join(ROOT, "package.json"), "utf8"));
  assert.equal(pkg.scripts["build:core-worker"], "node scripts/build-core-worker.mjs");
  assert.match(pkg.scripts.build, /vite build && npm run build:core-worker && npm run db:migrate$/);
  assert.match(
    pkg.scripts["build:dev"],
    /vite build --mode development && npm run build:core-worker$/,
  );
});
