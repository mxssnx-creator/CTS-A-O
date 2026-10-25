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
// A UI compute needs representative real config builders, not the production desk's thousands of cells.
// Keep every nested range complete: settings patches merge a group only one level deep.
const FIXTURE_SETTINGS = {
  symbols: 2,
  historyDays: 6,
  tfs: [1, 15],
  tfDays: { 1: 2, 5: 2, 15: 6, 30: 6 },
  focus: [
    "follow|ema-9-21@m15",
    "revert|ema-9-21@m15",
    "follow|rsi-mom-14-20@m15",
    "revert|rsi-mom-14-20@m15",
  ],
  pinned: [],
  mainTop: 8,
  refineTop: 3,
  evalTop: 5,
  cycleMs: 60_000,
  tactics: {
    session: false,
    volRegime: false,
    trendStrength: false,
    cooldown: false,
    cooldownBars: 4,
  },
  gates: { minPf: 1.05, minTrades: 3, maxDdr: 0 },
  toggles: {
    normal: true,
    trailing: true,
    exit: true,
    block: true,
    blockActive: false,
    dca: true,
    dcaActive: false,
    axis: true,
  },
  grid: {
    tp: [0.02],
    slOfTp: [1],
    trailOfTp: [0, 0.5],
    holdH: [4],
    minSl: 0.005,
    minTrail: 0.005,
    trailStep: 1,
    minimal: false,
    short: false,
    general: false,
    long: false,
    micro: false,
    minimalPlus: { enabled: false },
    // Measurement builds the small engine grid even when a representative pair misses Base; PF gates still
    // decide qualification and execution. This gives all config pages actual computed rows.
    allSets: true,
  },
  dca: { levels: 2, step: 0.02, stopGap: 0.5, slOfTp: 1 },
  axis: { levels: 2, ranges: ["atr"], levelsSet: [2] },
  exitStrategy: {
    signalRanges: [{ holdH: 6, distance: 1.5, basis: "close" }],
    enabled: true,
    lookbackH: 72,
    trainFraction: 0.6,
    minEntries: 5,
    minValidationTrades: 3,
    minPf: 1.05,
    maxDdr: 0,
    holdH: 4,
    maxConfigsPerPair: 6,
    quantiles: [0.6],
    stopQuantiles: [0.5],
    minTp: 0.006,
    maxTp: 0.2,
    maxSl: 0.25,
    trailShares: [0.5],
    stopMultiples: [1],
  },
  signals: {
    enabled: true,
    sourcesMode: "allow",
    sources: { "ema-cross": true, "rsi-reversal": true },
    lanes: [15],
    ranges: { short: true, medium: true },
    normal: { tp: [0.02], slOfTp: [1] },
    trailing: { tp: [0.03], trailOfTp: [0.5], slOfTp: 1 },
    trailingOnly: { enabled: true, sl: [0.02], trail: [0.01], trailStep: 1 },
    hist: {
      enabled: true,
      quantiles: [0.6],
      trailOfTp: [0.5],
      slOfTp: [1],
      minN: 5,
      lookbackH: 72,
    },
    holdH: 4,
  },
};
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

async function withClosed(resource, run) {
  let failed = false;
  let failure;
  let result;
  try {
    result = await run(resource);
  } catch (error) {
    failed = true;
    failure = error;
  } finally {
    try {
      await resource.close();
    } catch (error) {
      if (!failed) {
        failed = true;
        failure = error;
      }
    }
  }
  if (failed) throw failure;
  return result;
}

describe(
  "UI functional: every page on computed numbers, desktop and phone",
  { skip: SKIP, timeout: 1_200_000 },
  () => {
    let child;
    let base;
    let log = "";
    let browser;
    let activity = "before hook";
    let fixtureStarted = 0;
    const observeRequests = (page) => {
      const pending = new Set();
      const label = (request) => `${request.method()} ${new URL(request.url()).pathname}`;
      let changed = Date.now();
      page.on("request", (request) => {
        const url = new URL(request.url());
        if (url.origin !== base || url.pathname === "/api/core/events") return;
        // Wait for finite application data, not Vite's speculative module preloads. During dependency
        // re-optimization those imports can be abandoned without requestfinished/requestfailed, even after
        // the replacement document has rendered and hydrated. Console/page-error checks still cover assets.
        if (!["document", "fetch", "xhr"].includes(request.resourceType())) return;
        // Vite may replace the whole document after first-run dependency discovery.
        // Old-document imports can be abandoned without a terminal network event;
        // the new document and all of its finite requests must still settle below.
        if (request.isNavigationRequest() && request.frame() === page.mainFrame()) pending.clear();
        pending.add(request);
        changed = Date.now();
      });
      // A full document replacement can abandon an old fetch after the navigation request starts,
      // without a terminal Playwright event. At main-frame commit no new document script has run yet:
      // discard those previous-document RPCs, but keep the document itself until its body finishes.
      // Requests made by the committed document are still tracked and must complete normally.
      page.on("framenavigated", (frame) => {
        if (frame !== page.mainFrame()) return;
        for (const request of pending) {
          if (!request.isNavigationRequest()) pending.delete(request);
        }
        changed = Date.now();
      });
      const finished = (request) => {
        if (pending.delete(request)) changed = Date.now();
      };
      page.on("requestfinished", finished);
      page.on("requestfailed", finished);
      page.on("requestfailed", (request) => {
        const url = new URL(request.url());
        console.log(
          `[ui requestfailed] ${activity}: ${request.method()} ${url.pathname} ${request.failure()?.errorText ?? "unknown"}`,
        );
      });
      // Data can render before the shell's concurrent status refresh finishes. Closing then aborts
      // an otherwise healthy finite RPC and makes the framework log an unhandled ECONNRESET.
      // Let finite replies and the 400ms event debounce settle; the live SSE stream stays open.
      return async () => {
        const deadline = Date.now() + 30_000;
        while (pending.size > 0 || Date.now() - changed < 500) {
          assert.ok(
            Date.now() < deadline,
            `finite requests did not settle: ${[...pending].map(label).join(", ")}`,
          );
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      };
    };

    before(async () => {
      const started = Date.now();
      fixtureStarted = started;
      let phase = "starting synthetic dev server";
      let ready;
      let settleReady;
      let failed = false;
      let closeFailed = false;
      let closeError;
      const enter = (next) => {
        phase = next;
        activity = next;
        console.log(`[ui-fixture] ${phase} +${Date.now() - started}ms`);
      };
      try {
        const port = await freePort();
        base = `http://127.0.0.1:${port}`;
        enter(phase);
        child = spawn(
          process.execPath,
          [
            "scripts/with-app-env.mjs",
            "vite",
            "dev",
            "--host",
            "127.0.0.1",
            "--port",
            String(port),
          ],
          {
            cwd: ROOT,
            env: {
              ...process.env,
              CTS_CORE_WORKERS: "1",
              // This stopped/live-off synthetic fixture needs its own compute even when the outer suite disables autostart.
              CTS_CORE_AUTOSTART: "1",
              // This fixture explicitly exercises Compare even when a serial outer runner disables comparisons.
              CTS_CORE_COMPARE: "1",
              CTS_CORE_STATE: "off",
              CTS_CORE_SNAPSHOT: "",
              CTS_CORE_MARKET: "synthetic",
              CTS_CORE_SYNTHETIC_END: String(Date.UTC(2026, 8, 30, 12)),
              // Measured memory-pressure handling has its own runtime tests. UI readiness must not depend on
              // another test process crossing the shared host's available-memory thresholds.
              CTS_CORE_MEM_SOFT_MB: "1",
              CTS_CORE_MEM_HARD_MB: "1",
              CTS_CORE_TEST_SETTINGS: JSON.stringify(FIXTURE_SETTINGS),
              CTS_CORE_LIVE: "",
              PATH: `${join(ROOT, "node_modules/.bin")}${delimiter}${process.env.PATH}`,
            },
            stdio: ["ignore", "pipe", "pipe"],
          },
        );
        const record = (d) => (log += `[ui ${activity} +${Date.now() - fixtureStarted}ms] ${d}`);
        child.stdout.on("data", record);
        child.stderr.on("data", record);
        const deadline = Date.now() + 120_000;
        for (;;) {
          if (child.exitCode !== null) throw new Error("dev server exited early");
          try {
            const r = await fetch(`${base}/v2`, {
              redirect: "manual",
              signal: AbortSignal.timeout(120_000),
            });
            // Finish the finite SSR response before releasing it: an unread streaming body can be collected
            // and disconnected by the client, making the dev server report an aborted request.
            await r.arrayBuffer();
            // Avoid opening and aborting the runtime's long-lived SSE stream just to probe readiness.
            // The comparison table below is the durable signal that the synthetic compute completed.
            if (r.status === 200) break;
          } catch {
            /* still booting */
          }
          if (Date.now() > deadline) throw new Error("no HTTP readiness within 2 min");
          await new Promise((r) => setTimeout(r, 2_000));
        }
        enter("HTTP ready; launching Chromium");
        const { chromium } = await import("playwright");
        browser = await chromium
          .launch({
            executablePath: process.env.CTS_UI_BROWSER_EXECUTABLE ?? "/opt/pw-browsers/chromium",
            args: ["--no-sandbox"],
          })
          .catch(() => chromium.launch({ args: ["--no-sandbox"] }));
        enter("Chromium launched; opening Compare");
        // Comparisons finish after Paper publishes computes >= 1. Wait for their real persisted table,
        // rather than treating the legitimate not-yet-computed empty state as a page failure.
        ready = await browser.newPage();
        settleReady = observeRequests(ready);
        await ready.goto(`${base}/v2/compare`, { waitUntil: "domcontentloaded", timeout: 120_000 });
        enter("Compare loaded; waiting for the real computed comparison table");
        await ready.locator("main .v2-table tbody tr").first().waitFor({ timeout: 180_000 });
        await settleReady();
        enter("real compute and Compare finished; checking every page");
      } catch (error) {
        failed = true;
        const visible = ready
          ? await ready
              .locator("body")
              .innerText({ timeout: 2_000 })
              .catch(() => "unavailable")
          : "browser page not created";
        throw new Error(
          `UI before hook failed at ${phase} after ${Date.now() - started}ms: ${String(error)}\n` +
            `fixture: 2 symbols, 4 engine pairs, 2 Signal sources, 2 range cells, 6 Exit candidates/pair\n` +
            `visible runtime/page state:\n${visible.slice(0, 3000)}\nserver log:\n${log.slice(-6000)}`,
        );
      } finally {
        try {
          await ready?.close();
        } catch (error) {
          if (!failed) {
            closeFailed = true;
            closeError = error;
          }
        }
      }
      if (closeFailed) throw closeError;
    });

    after(async () => {
      try {
        await browser?.close();
      } finally {
        child?.kill("SIGTERM");
      }
    });

    for (const [vpName, viewport] of [
      ["desktop", { width: 1366, height: 900 }],
      ["phone", { width: 390, height: 844 }],
    ]) {
      test(`${vpName}: every page renders numbers, logs no error and never scrolls sideways`, async () => {
        await withClosed(await browser.newContext({ viewport }), async (ctx) => {
          const bad = [];
          for (const path of pages) {
            activity = `${vpName} ${path}`;
            console.log(`[ui-fixture] ${vpName}: ${path} +${Date.now() - fixtureStarted}ms`);
            const errs = [];
            await withClosed(await ctx.newPage(), async (page) => {
              const settleRequests = observeRequests(page);
              page.on("console", (m) => {
                // a resource of another host (web fonts behind this machine's proxy) is not the app's error
                const from = m.location()?.url ?? "";
                const foreign =
                  /^Failed to load resource/.test(m.text()) && from && !from.startsWith(base);
                if (
                  m.type() === "error" &&
                  !foreign &&
                  !/favicon|DevTools|Download the React DevTools/i.test(m.text())
                )
                  errs.push(m.text().slice(0, 200));
              });
              page.on("pageerror", (e) => errs.push(`uncaught: ${String(e).slice(0, 200)}`));
              // The app keeps its event stream open; page data readiness is the content check below.
              await page.goto(base + path, { waitUntil: "domcontentloaded", timeout: 120_000 });
              // Match the assertion's exact scope and threshold. Body/first-digit readiness can precede the
              // main loading state's replacement during hydration and let the assertion race real page data.
              await page
                .waitForFunction(
                  () => {
                    const main = document.querySelector("main");
                    return main !== null && (main.innerText.match(/\d/g) ?? []).length >= 5;
                  },
                  null,
                  { timeout: 60_000 },
                )
                .catch(() => undefined);
              await settleRequests();
              if (path === "/v2/statistics") {
                assert.match(await page.locator("main").innerText(), /PF edge subtracts 1/);
              }
              if (path === "/v2/settings") {
                assert.match(await page.locator("main").innerText(), /classic and coordinated Signals use the Signals range/);
                assert.match(await page.locator("main").innerText(), /excluding Signals/);
              }
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
                  visible: text.slice(0, 2000),
                };
              });
              if (r.digits < 5 || r.errorText || r.overflow > 1)
                console.log(`[ui state] ${vpName} ${path}: ${JSON.stringify(r)}`);
              if (r.digits < 5) bad.push(`${path}: renders no numbers (${r.digits} digits)`);
              if (r.errorText) bad.push(`${path}: shows an error`);
              if (r.overflow > 1) bad.push(`${path}: scrolls sideways by ${r.overflow}px`);
            });
            for (const e of errs) bad.push(`${path}: ${e}`);
          }
          assert.deepEqual(bad, [], bad.join("\n"));
        });
      });
    }

    test("Settings: saving unchanged settings succeeds without an error", async () => {
      activity = "settings save";
      const errs = [];
      await withClosed(
        await browser.newPage({ viewport: { width: 1366, height: 900 } }),
        async (page) => {
          const settleRequests = observeRequests(page);
          page.on("pageerror", (e) => errs.push(String(e)));
          await page.goto(`${base}/v2/settings`, {
            waitUntil: "domcontentloaded",
            timeout: 120_000,
          });
          // SSR can show the form before hydration replaces it with the initial loading state. Wait for the
          // finite settings/status RPCs and their debounce before asserting against the settled client form.
          await settleRequests();
          const save = page.getByRole("button", { name: /^save/i }).first();
          await save.waitFor({ state: "visible", timeout: 60_000 });
          // Hydration can replace the visible form between two awaits. count() is an immediate snapshot
          // and could falsely see zero; the locator state check below resolves the replacement button.
          // nothing changed: nothing to save
          assert.ok(await save.isDisabled({ timeout: 60_000 }), "Save is disabled while the settings are unchanged");
          // an edit enables it, the save answers without an error, and the edit undone saves back
          const box = page.locator('main [role="switch"]:not([disabled])').first();
          assert.ok(await box.count(), "a switch to edit");
          const saveNow = async () => {
            assert.ok(await save.isEnabled(), "Save is enabled after an edit");
            const resp = page.waitForResponse((r) => r.request().method() === "POST", {
              timeout: 30_000,
            });
            await save.click();
            const r = await resp;
            assert.ok(r.status() < 400, `save answered ${r.status()}`);
            await page.waitForTimeout(500);
          };
          await box.click();
          await saveNow();
          await box.click();
          await saveNow();
          const ranking = page.getByRole("combobox", { name: "Symbol ranking", exact: true });
          const previousRank = await ranking.inputValue();
          await ranking.selectOption("change1h5m");
          await saveNow();
          await page.reload({ waitUntil: "domcontentloaded", timeout: 120_000 });
          await ranking.waitFor({ state: "visible", timeout: 60_000 });
          assert.equal(await ranking.inputValue(), "change1h5m", "the new exchange ranking persists through a real Settings save/reload");
          await ranking.selectOption(previousRank);
          await saveNow();
          await page.getByRole("button", { name: "Add Signal Exit range", exact: true }).click();
          const structure = page.getByRole("combobox", { name: "Signal Exit range 2 price structure", exact: true });
          await structure.selectOption("extrema");
          await saveNow();
          await page.reload({ waitUntil: "domcontentloaded", timeout: 120_000 });
          await settleRequests();
          await structure.waitFor({ state: "visible", timeout: 60_000 });
          assert.equal(await structure.inputValue(), "extrema", "additional Exit range survives settings save/reload");
          await page.getByRole("button", { name: "Remove range 2", exact: true }).click();
          await saveNow();
          const minimalHold = page.getByRole("spinbutton", { name: /^Minimal range maximum hold \(minutes\)/ });
          const shortHold = page.getByRole("spinbutton", { name: /^Short range maximum hold \(minutes\)/ });
          const previousHolds = [await minimalHold.inputValue(), await shortHold.inputValue()];
          await minimalHold.fill("15");
          await shortHold.fill("30");
          await saveNow();
          await page.reload({ waitUntil: "domcontentloaded", timeout: 120_000 });
          await minimalHold.waitFor({ state: "visible", timeout: 60_000 });
          assert.equal(await minimalHold.inputValue(), "15");
          assert.equal(await shortHold.inputValue(), "30");
          await minimalHold.fill(previousHolds[0]);
          await shortHold.fill(previousHolds[1]);
          await saveNow();
          await settleRequests();
        },
      );
      assert.deepEqual(errs, []);
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
