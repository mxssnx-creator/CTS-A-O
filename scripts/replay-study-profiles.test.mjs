import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { DEFAULT_SETTINGS } from "../src/core/config.ts";
import { BOT_BY_TYPE } from "../src/core/bots/bots.ts";
import { INDICATION_BY_ID, laneOf } from "../src/core/indications/registry.ts";
import { allCombos, microLaneFloor } from "../src/core/pipeline/pipeline.ts";
import {
  buildReplayStudyProfile,
  EXPANDED_RESEARCH_FOCUS,
  REPLAY_STUDY_PROFILES,
  replayStudyProfileOptions,
} from "./replay-study-profiles.mjs";

describe("public replay study profiles", () => {
  it("derives the complete baseline from factory settings with explicit paper funding caps", () => {
    const expected = structuredClone(DEFAULT_SETTINGS);
    Object.assign(expected.live, {
      enabled: false,
      maxPositions: 100,
      maxPositionX: 0.75,
      maxExposureX: 7,
    });
    expected.paperBalance = 10;
    Object.assign(expected.sizing, { mode: "equityPct", pct: 0.001 });
    Object.assign(expected.signals, { enabled: true, count: 0 });
    const seed = buildReplayStudyProfile("full");
    assert.deepEqual(seed.settings, expected);
    assert.equal(seed.settings.cost, 0.0015);
    assert.deepEqual(seed.settings.gates, DEFAULT_SETTINGS.gates);
    assert.deepEqual(seed.settings.grid, DEFAULT_SETTINGS.grid);
    assert.deepEqual(seed.wf, {
      preH: 6,
      simH: 6,
      longH: 6,
      causalBase: true,
      lastN: 0,
      lastNMinPf: 1,
    });
  });

  it("changes only entry Last-N between full and entry25", () => {
    const full = buildReplayStudyProfile("full"),
      entry25 = buildReplayStudyProfile("entry25");
    assert.equal(entry25.wf.lastN, 25);
    assert.deepEqual(entry25, { settings: full.settings, wf: { ...full.wf, lastN: 25 } });
  });

  it("adds only the predeclared focus selections to entry25 and retains every baseline selector and pin", () => {
    const entry25 = buildReplayStudyProfile("entry25"),
      expanded = buildReplayStudyProfile("expanded");
    assert.equal(entry25.settings.focus.length, 97);
    assert.equal(expanded.settings.focus.length, 151);
    assert.equal(expanded.settings.pinned.length, 24);
    assert.deepEqual(expanded, {
      settings: {
        ...entry25.settings,
        focus: [...entry25.settings.focus, ...EXPANDED_RESEARCH_FOCUS],
      },
      wf: entry25.wf,
    });
    assert.equal(new Set(expanded.settings.focus).size, expanded.settings.focus.length);
  });

  it("registers all 54 unique additions and constructs each exact eligible bot and lane", () => {
    assert.equal(EXPANDED_RESEARCH_FOCUS.length, 54);
    assert.equal(new Set(EXPANDED_RESEARCH_FOCUS).size, 54);
    assert.equal(EXPANDED_RESEARCH_FOCUS.filter((x) => x.startsWith("follow|tactic-")).length, 40);
    assert.equal(EXPANDED_RESEARCH_FOCUS.filter((x) => x.startsWith("follow|relate-")).length, 14);
    for (const id of EXPANDED_RESEARCH_FOCUS) {
      assert.ok(!DEFAULT_SETTINGS.focus.includes(id), `already selected: ${id}`);
      const [bot, ind] = id.split("|");
      assert.ok(BOT_BY_TYPE.has(bot), `unknown bot: ${bot}`);
      const spec = INDICATION_BY_ID.get(laneOf(ind).base);
      assert.ok(spec, `unknown indication: ${ind}`);
      assert.ok(spec.kind === "tactic" || spec.kind === "relate", `unexpected kind: ${id}`);
    }
    const combos = allCombos(
      EXPANDED_RESEARCH_FOCUS,
      DEFAULT_SETTINGS.disabledKinds,
      DEFAULT_SETTINGS.tfs,
      microLaneFloor(DEFAULT_SETTINGS.grid),
    );
    assert.deepEqual(
      combos.map((x) => `${x.bot}|${x.ind}`).sort(),
      [...EXPANDED_RESEARCH_FOCUS].sort(),
    );
  });

  it("returns isolated deep clones and leaves defaults and exported declarations unchanged", () => {
    const before = structuredClone(DEFAULT_SETTINGS),
      additions = [...EXPANDED_RESEARCH_FOCUS];
    for (const profile of REPLAY_STUDY_PROFILES) {
      const seed = buildReplayStudyProfile(profile);
      assert.equal(seed.settings.live.enabled, false);
      seed.settings.gates.rangeMinPf.micro = 999;
      seed.settings.grid.micro.enabled = false;
      seed.settings.signals.sources["r-bos"] = true;
      seed.settings.live.enabled = true;
      seed.settings.focus.push("private|saved-account-config");
      seed.settings.pinned.length = 0;
      seed.wf.lastNMinPf = 999;
      assert.equal(buildReplayStudyProfile(profile).settings.live.enabled, false);
    }
    assert.deepEqual(DEFAULT_SETTINGS, before);
    assert.deepEqual(EXPANDED_RESEARCH_FOCUS, additions);
    assert.ok(Object.isFrozen(EXPANDED_RESEARCH_FOCUS));
    assert.ok(Object.isFrozen(REPLAY_STUDY_PROFILES));
  });

  it("rejects unknown profiles and incomplete, duplicate or unsupported CLI options", () => {
    for (const name of [undefined, "", "private", "FULL"])
      assert.throws(() => buildReplayStudyProfile(name), /Unknown replay profile/);
    assert.deepEqual(replayStudyProfileOptions(["--profile", "full", "--out", "seed.json"]), {
      profile: "full",
      out: "seed.json",
    });
    for (const args of [
      [],
      ["--profile"],
      ["--profile", "--out", "x"],
      ["--profile", "full"],
      ["--out", "x"],
      ["--settings", "private.json"],
      ["--profile", "full", "--profile", "entry25", "--out", "x"],
    ])
      assert.throws(() => replayStudyProfileOptions(args), /Supply|Missing|Unknown|Duplicate/);
  });

  it("writes reproducible public JSON via the CLI without requiring saved state", () => {
    const dir = mkdtempSync(join(tmpdir(), "cts-replay-profile-cli-"));
    try {
      const cli = fileURLToPath(new URL("./replay-study-profiles.mjs", import.meta.url));
      for (const profile of REPLAY_STUDY_PROFILES) {
        const target = join(dir, "nested", `${profile}.json`);
        const child = spawnSync(
          process.execPath,
          [
            "--experimental-strip-types",
            "--no-warnings",
            cli,
            "--profile",
            profile,
            "--out",
            target,
          ],
          { cwd: dir, encoding: "utf8", timeout: 10_000 },
        );
        assert.equal(child.status, 0, child.stderr);
        assert.deepEqual(
          JSON.parse(readFileSync(target, "utf8")),
          buildReplayStudyProfile(profile),
        );
        const summary = JSON.parse(child.stdout);
        assert.equal(summary.live, false);
        assert.equal(summary.researchOnly, profile === "expanded");
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
