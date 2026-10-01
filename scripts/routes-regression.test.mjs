import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { createServer } from "node:net";
import { delimiter, dirname, join } from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const treeSrc = readFileSync(join(ROOT, "src/routeTree.gen.ts"), "utf8");

/** full paths the generated route tree knows, e.g. "/v2/engine" */
const treePaths = [
  ...treeSrc.match(/interface FileRoutesByFullPath \{([^}]*)\}/)[1].matchAll(/'([^']+)':/g),
].map((m) => m[1]);
// pages only: API routes (the event stream never ends) are checked on their own below
const staticPaths = treePaths.filter((p) => !p.includes("$") && !p.startsWith("/api/"));

describe("route tree", () => {
  test("every route file under src/routes/v2 is registered", () => {
    const files = readdirSync(join(ROOT, "src/routes/v2"))
      .filter((f) => f.endsWith(".tsx"))
      .map((f) => f.replace(/\.tsx$/, ""));
    for (const f of files) {
      const path = f === "index" ? "/v2/" : `/v2/${f.replace(/\./g, "/")}`;
      assert.ok(treePaths.includes(path), `${f}.tsx is not in routeTree.gen.ts (${path})`);
    }
  });

  test("the app keeps its overview, engine, trading and settings pages", () => {
    for (const p of ["/", "/v2", "/v2/engine", "/v2/trading", "/v2/settings", "/v2/stages"]) {
      assert.ok(treePaths.includes(p), `missing route ${p}`);
    }
  });

  test("the document shell keeps the platform bridge and branding hooks", () => {
    const root = readFileSync(join(ROOT, "src/routes/__root.tsx"), "utf8");
    assert.match(root, /PreviewHostBridge/);
    assert.doesNotMatch(root, /og:title|twitter:card/);
    const router = readFileSync(join(ROOT, "src/router.tsx"), "utf8");
    assert.match(router, /export function getRouter/);
    assert.match(router, /defaultErrorComponent/);
  });
});

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.once("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

describe("dev server renders every page", { timeout: 180_000 }, () => {
  let child;
  let base;
  let log = "";

  before(async () => {
    const port = await freePort();
    base = `http://127.0.0.1:${port}`;
    child = spawn(
      process.execPath,
      ["scripts/with-app-env.mjs", "vite", "dev", "--host", "127.0.0.1", "--port", String(port)],
      {
        cwd: ROOT,
        env: {
          ...process.env,
          CTS_CORE_WORKERS: "1",
          // the routes are under test, not the engine: no runtimes computing beside the renders, no state file
          CTS_CORE_AUTOSTART: "0",
          CTS_CORE_STATE: "off",
          PATH: `${join(ROOT, "node_modules/.bin")}${delimiter}${process.env.PATH}`,
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    child.stdout.on("data", (d) => (log += d));
    child.stderr.on("data", (d) => (log += d));
    const deadline = Date.now() + 120_000;
    for (;;) {
      if (child.exitCode !== null) throw new Error(`dev server exited early:\n${log}`);
      try {
        const r = await fetch(`${base}/v2`, { redirect: "manual" });
        if (r.status === 200) break;
      } catch {
        /* still booting */
      }
      if (Date.now() > deadline) throw new Error(`dev server did not start:\n${log}`);
      await new Promise((r) => setTimeout(r, 500));
    }
  });

  after(() => {
    child?.kill("SIGTERM");
  });

  test("GET /api/core/events streams server-sent events", async () => {
    const ctl = new AbortController();
    const r = await fetch(`${base}/api/core/events`, { signal: ctl.signal });
    assert.equal(r.status, 200);
    assert.match(r.headers.get("content-type") ?? "", /text\/event-stream/);
    const reader = r.body.getReader();
    const { value } = await reader.read();
    assert.match(new TextDecoder().decode(value), /event: core/);
    ctl.abort();
  });

  for (const path of staticPaths) {
    test(`GET ${path} answers without a server error`, async () => {
      const r = await fetch(base + path, { redirect: "manual" });
      if (path === "/" || path.endsWith("/")) {
        // "/" and "/v2/" hand over to the overview
        assert.ok([200, 307, 308].includes(r.status), `status ${r.status}`);
        if (r.status !== 200) assert.match(r.headers.get("location") ?? "", /\/v2/);
        return;
      }
      assert.equal(r.status, 200);
      const html = await r.text();
      assert.match(r.headers.get("content-type") ?? "", /text\/html/);
      assert.match(html, /<div/);
      assert.doesNotMatch(html, /Internal Server Error|Cannot read properties/);
    });
  }

  test("pages carry the CTS-A-O title and description", async () => {
    const html = await (await fetch(`${base}/v2`)).text();
    assert.match(html, /<title>CTS-A-O<\/title>/);
    assert.match(html, /<meta name="description" content="CTS-A-O/);
  });

  test("an unknown path is a 404, not a crash", async () => {
    const r = await fetch(`${base}/v2/does-not-exist`);
    assert.ok(r.status < 500, `status ${r.status}`);
  });

  test("the dev server logged no unhandled errors while rendering", () => {
    assert.doesNotMatch(log, /unhandled|TypeError|ReferenceError|Error: Cannot find module/i);
  });
});
