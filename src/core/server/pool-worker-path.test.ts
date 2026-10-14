import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { resolveWorkerUrl, workerExecArgv } from "./pool.server.ts";

const roots: string[] = [];
afterEach(() => { for (const p of roots.splice(0)) rmSync(p, { recursive: true, force: true }); });
const root = () => { const p = mkdtempSync(join(tmpdir(), "cts-worker-path-")); roots.push(p); return p; };
const touch = (p: string) => { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, "// worker fixture\n"); return pathToFileURL(p); };

describe("production worker entry resolution", () => {
  it("keeps the development TypeScript worker when it exists beside the module", () => {
    const p = root();
    const source = touch(join(p, "src/core/server/tapes.worker.ts"));
    touch(join(p, "cts-core-worker.mjs"));
    assert.equal(resolveWorkerUrl(pathToFileURL(join(p, "src/core/server/pool.server.ts")).href, "").href, source.href);
  });
  for (const layout of [".vercel/output/functions/__server.func", ".vercel/output/functions/__nitro.func", ".output/server"]) {
    it(`finds the packaged ESM worker above Nitro chunks in ${layout}`, () => {
      const p = root();
      const packaged = touch(join(p, layout, "cts-core-worker.mjs"));
      const module = pathToFileURL(join(p, layout, "_ssr/chunks/runtime.server.mjs"));
      assert.equal(resolveWorkerUrl(module.href, "").href, packaged.href);
    });
  }
  it("honors an explicit path even if missing rather than falling back to another worker", () => {
    const p = root();
    const source = touch(join(p, "tapes.worker.ts"));
    const configured = join(p, "operator/worker.mjs");
    assert.equal(resolveWorkerUrl(new URL("pool.server.ts", source).href, configured).href, pathToFileURL(configured).href);
  });
  it("does not accept a similarly named artifact, directory or worker outside the bounded parent chain", () => {
    const p = root();
    touch(join(p, "cts-core-worker-old.mjs"));
    mkdirSync(join(p, "cts-core-worker.mjs"));
    touch(join(p, "other/cts-core-worker.mjs"));
    const module = pathToFileURL(join(p, "server/_ssr/runtime.mjs"));
    assert.equal(resolveWorkerUrl(module.href, "").href, new URL("./tapes.worker.ts", module).href);
  });
  it("uses strip-types only for TypeScript workers, with ordinary ESM flags for the packaged worker", () => {
    assert.ok(workerExecArgv(new URL("file:///srv/tapes.worker.ts")).includes("--experimental-strip-types"));
    assert.deepEqual(workerExecArgv(new URL("file:///srv/cts-core-worker.mjs")), ["--no-warnings"]);
  });
});
