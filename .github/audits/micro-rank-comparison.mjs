#!/usr/bin/env node
// Causal, paired 12-symbol comparison. Freeze both selection/config protocols before running either case.
import assert from "node:assert/strict";
import fs from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import { execFileSync } from "node:child_process";
import { rankUniverse, priceChange1h5m } from "../../src/core/market/bingx.ts";
import { resample } from "../../src/core/market/bars.ts";
import {
  sessionStudySourceFiles,
  studyExactJson,
  studySha256,
} from "../../scripts/lib/session-study.mjs";

const M = 60_000,
  H = 60 * M;
export const RANK_CASES = ["volatility1h", "change1h5m"];
export const RANK_DEFINITIONS = {
  volatility1h:
    "Production option: mean((high-low)/close) of the last 3 completed native 1H candles; 3h lookback. This existing rule is unchanged.",
  change1h5m:
    "Production option: sum(abs(close/previousClose-1)) / 12 over 13 completed 5m closes; exactly twelve 5m distances in one hour.",
};
const root = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const shaSource = () => studySha256(studyExactJson(sessionStudySourceFiles(root)));

export async function selectionAt(source, cutT, rank, n = 12) {
  assert.ok(RANK_CASES.includes(rank));
  assert.ok(Number.isSafeInteger(cutT) && cutT % H === 0);
  const symbols = source.tickers.map((t) => t.sym).sort();
  assert.equal(new Set(symbols).size, symbols.length);
  const tickers = [],
    histories = new Map(),
    metrics = [];
  for (const sym of symbols) {
    const all = source.candles[`${sym}|1`];
    assert.ok(Array.isArray(all), `${sym}: native minute history missing`);
    const day = all.filter((c) => c.t >= cutT - 24 * H && c.t + M <= cutT);
    assert.equal(day.length, 1440, `${sym}: exact causal 24h liquidity history required`);
    assert.ok(
      day.every(
        (c, i) =>
          c.t === cutT - 24 * H + i * M &&
          [c.o, c.h, c.l, c.c, c.v].every(Number.isFinite) &&
          c.c > 0 &&
          c.v >= 0,
      ),
      `${sym}: invalid/gapped history`,
    );
    const closed = all.filter((c) => c.t + M <= cutT);
    const five = resample(closed, 1, 5)
      .filter((c) => c.t + 5 * M <= cutT)
      .slice(-13);
    const hourly = resample(closed, 1, 60)
      .filter((c) => c.t + H <= cutT)
      .slice(-4);
    assert.equal(hourly.length, 4, `${sym}: four complete hourly input candles required`);
    assert.ok(hourly.every((c, i) => c.t === cutT - (4 - i) * H));
    const change = priceChange1h5m(five, cutT);
    assert.ok(change !== null, `${sym}: complete 13-close change evidence required`);
    const vol = hourly.slice(-3).reduce((sum, c) => sum + (c.h - c.l) / c.c, 0) / 3;
    const ticker = {
      sym,
      last: day.at(-1).c,
      quoteVol: day.reduce((sum, c) => sum + c.v * c.c, 0),
      changePct: (day.at(-1).c / day[0].o - 1) * 100,
    };
    tickers.push(ticker);
    histories.set(`${sym}|5`, five);
    histories.set(`${sym}|60`, hourly);
    metrics.push({
      sym,
      volatility1h: vol,
      change1h5m: change,
      netChange1h: day.at(-1).c / day.at(-61).c - 1,
      quoteVol: ticker.quoteVol,
      lastEvidenceCloseT: cutT,
    });
  }
  const calls = [];
  const feed = async (sym, tf, options = {}) => {
    assert.equal(options.nowT, cutT);
    const rows = histories.get(`${sym}|${tf}`);
    assert.ok(rows, `Unexpected ranking request: ${sym}/${tf}`);
    const result = rows
      .filter(
        (c) =>
          c.t + tf * M <= cutT &&
          (options.startT === undefined || c.t >= options.startT) &&
          (options.endT === undefined || c.t <= options.endT),
      )
      .slice(-(options.limit ?? rows.length));
    calls.push({ sym, tf, n: result.length, latestCloseT: result.at(-1)?.t + tf * M });
    return result;
  };
  const selected = await rankUniverse(tickers, n, rank, feed, cutT);
  assert.equal(selected.length, n);
  assert.equal(new Set(selected).size, n);
  assert.ok(calls.every((c) => c.latestCloseT <= cutT));
  return {
    schema: "cts-micro-symbol-selection-v1",
    rank,
    definition: RANK_DEFINITIONS[rank],
    cutT,
    candidateSymbols: symbols,
    selected,
    tickers,
    metrics,
    calls,
    latestEvidenceCloseT: cutT,
    liquidityBasis:
      "Causal preceding 24h sum of native minute close * base volume (OHLCV quote-volume approximation), never the feed's future endpoint ticker.",
    selectionPolicy:
      "Choose once at trade start; hold the same twelve-symbol universe for the twelve-hour run. Historical ranking among the same cached 24 contracts, not an exchange-wide listing survey.",
    networkRequests: 0,
  };
}

export async function main(args = process.argv.slice(2)) {
  const mode = args[0];
  const arg = (key, fallback) => {
    const i = args.indexOf(`--${key}`);
    return i < 0 ? fallback : args[i + 1];
  };
  const out = resolve(arg("out", "runs/micro-rank-comparison-v3"));
  if (mode === "prepare") {
    assert.ok(!fs.existsSync(`${out}/plan.json`), "Never overwrite a frozen comparison");
    const inputPath = resolve(
      arg("feed", "docs/micro-24-sim-2026-10-21/reproduction-feed.json.gz"),
    );
    const input = fs.readFileSync(inputPath),
      source = JSON.parse(input[0] === 31 ? gunzipSync(input) : input);
    assert.equal(source.tickers.length, 24);
    const endT = Math.min(...source.tickers.map((t) => source.candles[`${t.sym}|1`].at(-1).t + M));
    assert.equal(endT % H, 0);
    const cutT = endT - 12 * H,
      sourceSha256 = shaSource(),
      selections = {};
    fs.mkdirSync(out, { recursive: true });
    for (const rank of RANK_CASES) {
      const selection = {
        ...(await selectionAt(source, cutT, rank)),
        parentFeedSha256: studySha256(input),
        sourceSha256,
      };
      const file = `${out}/${rank}-selection.json`;
      fs.writeFileSync(file, JSON.stringify(selection, null, 2) + "\n");
      selections[rank] = {
        path: file,
        sha256: studySha256(fs.readFileSync(file)),
        selected: selection.selected,
      };
      execFileSync(
        process.execPath,
        [
          "--experimental-strip-types",
          "--no-warnings",
          ".github/audits/micro-24-trade-sim.mjs",
          "prepare",
          "--feed",
          inputPath,
          "--selection-file",
          file,
          "--label",
          `micro-12-symbol-rank-${rank}-12h-pre-12h-run-v3`,
          "--out",
          `${out}/${rank}`,
        ],
        { cwd: root, stdio: "inherit" },
      );
    }
    const protocols = Object.fromEntries(
      RANK_CASES.map((rank) => [rank, JSON.parse(fs.readFileSync(`${out}/${rank}/protocol.json`))]),
    );
    const comparable = (p) => {
      const settings = structuredClone(p.actualSettings);
      delete settings.forceSymbols;
      delete settings.symbolRank;
      return {
        settings,
        wf: p.actualWf,
        window: p.window,
        account: p.account,
        source: p.source.sha256,
        focus: p.scope.focus,
      };
    };
    assert.equal(
      studyExactJson(comparable(protocols.volatility1h)),
      studyExactJson(comparable(protocols.change1h5m)),
      "Only the causal symbol selection may differ",
    );
    const plan = {
      schema: "cts-micro-12-symbol-rank-comparison-v1",
      sourceSha256,
      parentFeedSha256: studySha256(input),
      candidateCount: 24,
      selectedCount: 12,
      window: protocols.volatility1h.window,
      selections,
      selectionDigests: Object.fromEntries(
        RANK_CASES.map((rank) => [rank, selections[rank].sha256]),
      ),
      selectedSymbols: Object.fromEntries(
        RANK_CASES.map((rank) => [rank, selections[rank].selected]),
      ),
      protocols: Object.fromEntries(
        RANK_CASES.map((rank) => [
          rank,
          studySha256(fs.readFileSync(`${out}/${rank}/protocol.json`)),
        ]),
      ),
      definitions: RANK_DEFINITIONS,
      identicalEconomicSettings: true,
      comparableSettingsSha256: studySha256(studyExactJson(comparable(protocols.volatility1h))),
      selectionBeforeScoring: true,
      harnesses: Object.fromEntries(
        [".github/audits/micro-rank-comparison.mjs", ".github/audits/micro-24-trade-sim.mjs"].map(
          (f) => [f, studySha256(fs.readFileSync(resolve(root, f)))],
        ),
      ),
      classification:
        "Two causal fixed-universe historical model replays. All own Base/config/range/direction gates remain active; retain losses, infeasibility, empty cohorts and failures. Not live execution or unseen performance.",
    };
    const expectedFile = arg("expected-file");
    if (expectedFile) {
      const expected = JSON.parse(fs.readFileSync(resolve(expectedFile)));
      const actual = Object.fromEntries(Object.keys(expected).map((key) => [key, plan[key]]));
      // Paths and commit labels may differ by runner; economic settings, selections and windows may not.
      assert.equal(
        studyExactJson(actual),
        studyExactJson(expected),
        "Paired plan differs from its preregistered rule/source/settings/selection",
      );
      plan.preregistrationSha256 = studySha256(fs.readFileSync(resolve(expectedFile)));
    }
    fs.writeFileSync(`${out}/plan.json`, JSON.stringify(plan, null, 2) + "\n");
    console.log(
      JSON.stringify({
        out,
        sourceSha256,
        selections: Object.fromEntries(RANK_CASES.map((r) => [r, selections[r].selected])),
      }),
    );
  } else if (mode === "run") {
    const rank = arg("rank");
    assert.ok(RANK_CASES.includes(rank));
    const plan = JSON.parse(fs.readFileSync(`${out}/plan.json`));
    assert.equal(plan.sourceSha256, shaSource());
    for (const [file, sha] of Object.entries(plan.harnesses))
      assert.equal(studySha256(fs.readFileSync(resolve(root, file))), sha, file);
    for (const r of RANK_CASES)
      assert.equal(studySha256(fs.readFileSync(`${out}/${r}/protocol.json`)), plan.protocols[r]);
    for (const r of RANK_CASES)
      assert.equal(
        studySha256(fs.readFileSync(`${out}/${r}-selection.json`)),
        plan.selections[r].sha256,
      );
    execFileSync(
      process.execPath,
      [
        "--experimental-strip-types",
        "--no-warnings",
        ".github/audits/micro-24-trade-sim.mjs",
        "run",
        "--out",
        `${out}/${rank}`,
        "--workers",
        arg("workers", "2"),
      ],
      { cwd: root, stdio: "inherit" },
    );
  } else
    throw new Error(
      "micro-rank-comparison.mjs prepare|run --out DIR [--feed FILE] [--rank volatility1h|change1h5m]",
    );
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  await main();
