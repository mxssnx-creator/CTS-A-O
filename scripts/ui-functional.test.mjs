// UI functional test: the dev server runs the app on the synthetic market (test-only CTS_CORE_MARKET=synthetic, two
// symbols, no network), computes once, and a browser visits every /v2 page on a desktop and a phone viewport.
// Checked per page: it renders numbers (not only a loading or error state), the browser logs no error and no
// uncaught exception, nothing scrolls sideways, and the Settings page saves unchanged settings without an error.
// Heavy (a dev server, a runtime compute and a browser): the test runner starts it only with memory headroom;
// CTS_UI_TEST=0 skips it.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { createServer } from "node:net";
import { delimiter, dirname, join } from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SKIP = process.env.CTS_UI_TEST === "0";
const treeSrc = readFileSync(join(ROOT, "src/routeTree.gen.ts"), "utf8");
const pages = [
  ...treeSrc.match(/interface FileRoutesByFullPath \{([^}]*)\}/)[1].matchAll(/'([^']+)':/g),
]
  .map((m) => m[1])
  .filter((p) => p.startsWith("/v2") && !p.includes("$") && p !== "/v2/");

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

/** computes of the primary runtime, read from the event stream's first (state) events */
async function computes(base) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 3_000);
  try {
    const r = await fetch(`${base}/api/core/events`, { signal: ctl.signal });
    const reader = r.body.getReader();
    let txt = "";
    while (!txt.includes("\n\n")) {
      const { value, done } = await reader.read();
      if (done) break;
      txt += new TextDecoder().decode(value);
    }
    ctl.abort();
    const m = /"computes":(\d+)/.exec(txt);
    return m ? Number(m[1]) : 0;
  } catch {
    return 0;
  } finally {
    clearTimeout(timer);
  }
}

describe(
  "UI functional: every page on computed numbers, desktop and phone",
  { skip: SKIP, timeout: 1_200_000 },
  () => {
    let child;
    let base;
    let log = "";
    let browser;

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
            CTS_CORE_STATE: "off",
            CTS_CORE_SNAPSHOT: "",
            CTS_CORE_MARKET: "synthetic",
            CTS_CORE_SYNTHETIC_END: String(Math.floor(Date.now() / 3_600_000) * 3_600_000),
            CTS_CORE_TEST_SETTINGS: JSON.stringify({
              symbols: 2,
              historyDays: 18,
              tfDays: { 1: 3, 5: 6, 15: 18, 30: 18 },
              mainTop: 8,
              refineTop: 3,
              evalTop: 5,
              gates: { minPf: 1.05, minTrades: 3, maxDdr: 0 },
            }),
            CTS_CORE_LIVE: "",
            PATH: `${join(ROOT, "node_modules/.bin")}${delimiter}${process.env.PATH}`,
          },
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
      child.stdout.on("data", (d) => (log += d));
      child.stderr.on("data", (d) => (log += d));
      const deadline = Date.now() + 900_000;
      for (;;) {
        if (child.exitCode !== null)
          throw new Error(`dev server exited early:\n${log.slice(-4000)}`);
        try {
          const r = await fetch(`${base}/v2`, { redirect: "manual" });
          if (r.status === 200 && (await computes(base)) >= 1) break;
        } catch {
          /* still booting */
        }
        if (Date.now() > deadline)
          throw new Error(`no compute within 15 min:\n${log.slice(-4000)}`);
        await new Promise((r) => setTimeout(r, 2_000));
      }
      const { chromium } = await import("playwright");
      browser = await chromium
        .launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox"] })
        .catch(() => chromium.launch({ args: ["--no-sandbox"] }));
    });

    after(async () => {
      await browser?.close();
      child?.kill("SIGTERM");
    });

    for (const [vpName, viewport] of [
      ["desktop", { width: 1366, height: 900 }],
      ["phone", { width: 390, height: 844 }],
    ]) {
      test(`${vpName}: every page renders numbers, logs no error and never scrolls sideways`, async () => {
        const ctx = await browser.newContext({ viewport });
        const bad = [];
        for (const path of pages) {
          const page = await ctx.newPage();
          const errs = [];
          page.on("console", (m) => {
            // a resource of another host (web fonts behind this machine's proxy) is not the app's error
            const from = m.location()?.url ?? "";
            const foreign = /^Failed to load resource/.test(m.text()) && from && !from.startsWith(base);
            if (
              m.type() === "error" &&
              !foreign &&
              !/favicon|DevTools|Download the React DevTools/i.test(m.text())
            )
              errs.push(m.text().slice(0, 200));
          });
          page.on("pageerror", (e) => errs.push(`uncaught: ${String(e).slice(0, 200)}`));
          await page.goto(base + path, { waitUntil: "networkidle", timeout: 120_000 });
          // the page's data arrives after the first render: wait for digits in the main content
          await page
            .waitForFunction(
              () => /\d/.test(document.querySelector("main")?.innerText ?? document.body.innerText),
              null,
              { timeout: 60_000 },
            )
            .catch(() => undefined);
          const r = await page.evaluate(() => {
            const main = document.querySelector("main") ?? document.body;
            const text = main.innerText;
            return {
              digits: (text.match(/\d/g) ?? []).length,
              errorText:
                /Something went wrong|Internal Server Error|Cannot read properties|is not a function/.test(
                  text,
                ),
              overflow: document.documentElement.scrollWidth - window.innerWidth,
            };
          });
          if (r.digits < 5) bad.push(`${path}: renders no numbers (${r.digits} digits)`);
          if (r.errorText) bad.push(`${path}: shows an error`);
          if (r.overflow > 1) bad.push(`${path}: scrolls sideways by ${r.overflow}px`);
          for (const e of errs) bad.push(`${path}: ${e}`);
          await page.close();
        }
        await ctx.close();
        assert.deepEqual(bad, [], bad.join("\n"));
      });
    }

    test("Settings: saving unchanged settings succeeds without an error", async () => {
      const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
      const errs = [];
      page.on("pageerror", (e) => errs.push(String(e)));
      await page.goto(`${base}/v2/settings`, { waitUntil: "networkidle", timeout: 120_000 });
      const save = page.getByRole("button", { name: /^save/i }).first();
      assert.ok(await save.count(), "a Save button");
      // nothing changed: nothing to save
      assert.ok(await save.isDisabled(), "Save is disabled while the settings are unchanged");
      // an edit enables it, the save answers without an error, and the edit undone saves back
      const box = page.locator('main [role="switch"]:not([disabled])').first();
      assert.ok(await box.count(), "a switch to edit");
      const saveNow = async () => {
        assert.ok(await save.isEnabled(), "Save is enabled after an edit");
        const resp = page.waitForResponse((r) => r.request().method() === "POST", { timeout: 30_000 });
        await save.click();
        const r = await resp;
        assert.ok(r.status() < 400, `save answered ${r.status()}`);
        await page.waitForTimeout(500);
      };
      await box.click();
      await saveNow();
      await box.click();
      await saveNow();
      assert.deepEqual(errs, []);
      await page.close();
    });

    test("the dev server logged no unhandled errors", () => {
      assert.doesNotMatch(
        log,
        /unhandled|TypeError|ReferenceError|Error: Cannot find module/i,
        log.slice(-3000),
      );
    });
  },
);
