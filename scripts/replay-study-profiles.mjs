#!/usr/bin/env node
// Public, factory-derived seeds for freeze-session-study.mjs. No saved desk or account state is read.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_SETTINGS } from "../src/core/config.ts";
import { ENGINE_SIDE_ACCEPT } from "../src/core/sim/walkforward.ts";

export const REPLAY_STUDY_PROFILES = Object.freeze([
  "full",
  "entry25",
  "expanded",
  "entry5strict",
  "entry25strict",
  "entry25plain",
  "entry5side",
  "entry5direction",
  "entry5proven",
]);

// Predeclared research-only additions from verified-replay-20261018-research-focus.json.
// The baseline factory focus and pins stay intact; every addition selects one exact registered lane.
export const EXPANDED_RESEARCH_FOCUS = Object.freeze([
  ...["trend", "pullback", "mean-reversion", "breakout", "adaptive"].flatMap((technique) =>
    ["s", "m"].flatMap((range) =>
      [1, 5, 15, 30].map((tf) => `follow|tactic-${technique}-${range}@m${tf}`),
    ),
  ),
  "follow|relate-1-trend-balanced@m1",
  "follow|relate-1-adaptive-balanced@m1",
  "follow|relate-5-trend-balanced@m5",
  "follow|relate-5-adaptive-balanced@m5",
  "follow|relate-15-trend-balanced@m15",
  "follow|relate-15-adaptive-balanced@m15",
  "follow|relate-1x5x15-trend-balanced@m1",
  "follow|relate-1x5x15-adaptive-balanced@m1",
  "follow|relate-mc-5-trend-balanced@m5",
  "follow|relate-mc-5-adaptive-balanced@m5",
  "follow|relate-mc-15-trend-balanced@m15",
  "follow|relate-mc-15-adaptive-balanced@m15",
  "follow|relate-mc-5x15-trend-balanced@m5",
  "follow|relate-mc-5x15-adaptive-balanced@m5",
]);

export function buildReplayStudyProfile(profile) {
  if (!REPLAY_STUDY_PROFILES.includes(profile))
    throw new Error(
      `Unknown replay profile ${JSON.stringify(profile)}; choose ${REPLAY_STUDY_PROFILES.join(", ")}`,
    );
  const settings = structuredClone(DEFAULT_SETTINGS);
  Object.assign(settings.live, {
    enabled: false,
    maxPositions: 100,
    maxPositionX: 0.75,
    maxExposureX: 7,
  });
  settings.paperBalance = 10;
  Object.assign(settings.sizing, { mode: "equityPct", pct: 0.001 });
  Object.assign(settings.signals, { enabled: true, count: 0 });
  if (profile === "expanded") settings.focus.push(...EXPANDED_RESEARCH_FOCUS);
  // Predeclared development refinements only; production defaults and range PF floors remain intact.
  if (profile === "entry25plain") settings.toggles.block = false;
  if (profile === "entry5proven") settings.gates.warmup = false;
  const entry5 = ["entry5strict", "entry5side", "entry5direction", "entry5proven"].includes(
    profile,
  );
  // Let the production freezer materialize every other WF default and normalize required data lanes.
  const wf = {
    preH: 6,
    simH: 6,
    longH: 6,
    causalBase: true,
    lastN: profile === "full" ? 0 : entry5 ? 5 : 25,
    lastNMinPf: entry5 || profile === "entry25strict" ? 1.2 : 1,
  };
  if (profile === "entry5side") wf.engineSideAccept = { ...ENGINE_SIDE_ACCEPT, enabled: true };
  if (profile === "entry5direction") wf.sideGateN = 10;
  return { settings, wf };
}

export function replayStudyProfileOptions(args) {
  const options = {};
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    if (flag !== "--profile" && flag !== "--out") throw new Error(`Unknown option ${flag}`);
    const key = flag.slice(2),
      value = args[++i];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for ${flag}`);
    if (options[key] !== undefined) throw new Error(`Duplicate option ${flag}`);
    options[key] = value;
  }
  if (!options.profile || !options.out)
    throw new Error(`Supply --profile ${REPLAY_STUDY_PROFILES.join("|")} and --out FILE`);
  return options;
}

function main(args) {
  if (args.length === 1 && args[0] === "--help") {
    console.log(
      `node --experimental-strip-types scripts/replay-study-profiles.mjs --profile ${REPLAY_STUDY_PROFILES.join("|")} --out FILE\nCreates a factory-derived settings/WF seed. Pass FILE to freeze-session-study.mjs --settings before running. Expanded and entry refinements are predeclared research-only profiles; no live execution is enabled.`,
    );
    return;
  }
  const { profile, out } = replayStudyProfileOptions(args);
  const seed = buildReplayStudyProfile(profile),
    target = resolve(out);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, JSON.stringify(seed, null, 2) + "\n");
  console.log(
    JSON.stringify({
      profile,
      out: target,
      focus: seed.settings.focus.length,
      pinned: seed.settings.pinned.length,
      live: false,
      lastN: seed.wf.lastN,
      researchOnly: !["full", "entry25"].includes(profile),
    }),
  );
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
