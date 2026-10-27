import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { cappedSettings, loadOriginal, settingsCompatibility, verifySettingsCompatibility, verifyReplayContinuity, verifyReplayFeed } from "./low-range-runtime-5m-balance-caps-study.mjs";
import { studyExactJson, studySha256 } from "./lib/session-study.mjs";

const dir = mkdtempSync(join(tmpdir(), "cts-low-range-cap-test-"));
after(() => rmSync(dir, { recursive: true, force: true }));
const start = Date.parse("2026-10-18T00:00:00Z");
const symbols = Array.from({ length: 20 }, (_, i) => `TEST${String(i).padStart(2, "0")}`);
const feed = { tickers: symbols.map((sym) => ({ sym })), candles: {} };
for (const sym of symbols) for (const tf of [1, 60])
  feed.candles[`${sym}|${tf}`] = Array.from({ length: 48 * 60 / tf }, (_, i) => ({ t: start + i * tf * 60_000 }));
const feedPath = join(dir, "feed.json"), protocolPath = join(dir, "protocol.json");
const feedBytes = Buffer.from(JSON.stringify(feed));
writeFileSync(feedPath, feedBytes);
const p = { schema: "cts-session-study-v1", id: "original-5m", lane: 5, sourceCount: 195, symbols,
  window: { indicatorStartT: start, evaluationFromT: start + 12 * 3_600_000,
    tradeStartT: start + 24 * 3_600_000, endT: start + 48 * 3_600_000, warmH: 12, preH: 12, runH: 24 },
  tacticMode: "off", actualSettings: { grid: { short: { minTf: 5 }, lowRange: { enabled: true } }, cost: 0.0015,
    live: { enabled: false, maxPositionX: 0, maxExposureX: 0 }, relate: { enabled: false, ratio: 2.6 },
    focus: Array.from({ length: 195 }, (_, i) => `follow|${i}`) },
  actualWf: { relate: { enabled: false, ratio: 2.6 }, causalBase: true, stepH: 1 },
  account: { balance: 10, leverage: 10 }, feed: { path: feedPath, sha256: studySha256(feedBytes) },
  source: { files: [{ path: "test-source", sha256: "test-sha" }] } };
p.source.sha256 = studySha256(studyExactJson(p.source.files));
const writeProtocol = (data) => writeFileSync(protocolPath, JSON.stringify(data));
const loadFixture = () => loadOriginal(protocolPath, studySha256(readFileSync(protocolPath)));

describe("Post-hoc 5m replay preparation guards", () => {
  it("adds only the explicit balance caps without mutating the frozen settings", () => {
    const before = structuredClone(p.actualSettings), afterCaps = cappedSettings(p.actualSettings);
    assert.deepEqual(p.actualSettings, before);
    assert.equal(afterCaps.live.maxPositionX, 0.5);
    assert.equal(afterCaps.live.maxExposureX, 1);
    assert.equal(afterCaps.live.exposureScaler, true);
    afterCaps.live = before.live;
    assert.deepEqual(afterCaps, before);
  });
  it("accepts the exact 20-symbol window and protects the original protocol and feed bytes", () => {
    writeProtocol(p);
    const loaded = loadFixture();
    assert.equal(loaded.protocolSha256, studySha256(readFileSync(protocolPath)));
    assert.equal(studySha256(loaded.feedBytes), p.feed.sha256);
    assert.equal(loaded.protocol.symbols.length, 20);
    assert.throws(() => loadOriginal(protocolPath), /original protocol bytes changed/);
  });
  it("rejects mismatched feed hashes and gaps, even when a modified feed has a matching hash", () => {
    const wrongHash = structuredClone(p); wrongHash.feed.sha256 = "0".repeat(64); writeProtocol(wrongHash);
    assert.throws(loadFixture, /original feed bytes changed/);
    const gapped = structuredClone(feed); gapped.candles[`${symbols[0]}|1`][7].t += 60_000;
    const bytes = Buffer.from(JSON.stringify(gapped)), path = join(dir, "gapped-feed.json");
    writeFileSync(path, bytes);
    const wrongTime = structuredClone(p); wrongTime.feed = { path, sha256: studySha256(bytes) }; writeProtocol(wrongTime);
    assert.throws(loadFixture, /continuity/);
  });
  it("rejects altered study scope and an already-capped baseline", () => {
    const wrongClock = structuredClone(p); wrongClock.window.endT += 3_600_000; writeProtocol(wrongClock);
    assert.throws(loadFixture);
    const wrongCaps = structuredClone(p); wrongCaps.actualSettings.live.maxExposureX = 1; writeProtocol(wrongCaps);
    assert.throws(loadFixture);
  });
  it("preserves legacy exact snapshots and accepts only a recorded inactive maxSl migration", () => {
    const original = structuredClone(p), before = structuredClone(original);
    const old = { actualSettings: cappedSettings(original.actualSettings), actualWf: structuredClone(original.actualWf), parent: {} };
    assert.equal(settingsCompatibility(original, old.actualSettings, old.actualWf), "exact");
    assert.equal(verifySettingsCompatibility(original, old), "exact", "legacy protocol without metadata remains valid");
    const migrated = structuredClone(old);
    migrated.actualSettings.relate.maxSl = .0075; migrated.actualWf.relate.maxSl = .0075;
    assert.equal(settingsCompatibility(original, migrated.actualSettings, migrated.actualWf), "inactive-relate-maxsl-default");
    assert.throws(() => verifySettingsCompatibility(original, migrated), /not recorded/);
    migrated.parent.settingsCompatibility = "inactive-relate-maxsl-default";
    assert.equal(verifySettingsCompatibility(original, migrated), "inactive-relate-maxsl-default");
    assert.deepEqual(original, before, "compatibility checks never mutate the parent evidence");
  });
  it("fails closed on economic edits, either Relate enablement, wrong defaults, and incomplete migration", () => {
    const original = structuredClone(p);
    const make = () => {
      const result = { actualSettings: cappedSettings(original.actualSettings), actualWf: structuredClone(original.actualWf),
        parent: { settingsCompatibility: "inactive-relate-maxsl-default" } };
      result.actualSettings.relate.maxSl = .0075; result.actualWf.relate.maxSl = .0075;
      return result;
    };
    const edits = [
      x => { x.actualSettings.cost = .0014; },
      x => { x.actualSettings.grid.short.minTf = 15; },
      x => { x.actualSettings.focus[0] = "other"; },
      x => { x.actualSettings.live.maxPositionX = .6; },
      x => { x.actualSettings.live.maxExposureX = .9; },
      x => { x.actualSettings.live.exposureScaler = false; },
      x => { x.actualSettings.relate.ratio = 2.7; },
      x => { x.actualWf.stepH = 2; },
      x => { x.actualWf.relate.ratio = 2.7; },
      x => { x.actualSettings.relate.enabled = true; },
      x => { x.actualWf.relate.enabled = true; },
      x => { x.actualSettings.relate.maxSl = .01; },
      x => { x.actualWf.relate.maxSl = .01; },
      x => { delete x.actualSettings.relate.maxSl; },
      x => { delete x.actualWf.relate.maxSl; },
      x => { x.parent.settingsCompatibility = "exact"; },
    ];
    for (const edit of edits) { const actual = make(); edit(actual); assert.throws(() => verifySettingsCompatibility(original, actual)); }
    const enabledParent = structuredClone(original); enabledParent.actualSettings.relate.enabled = true;
    const enabledActual = make(); enabledActual.actualSettings.relate.enabled = true;
    assert.throws(() => verifySettingsCompatibility(enabledParent, enabledActual), /original settings Relate/);
    const alreadyConfigured = structuredClone(original);
    alreadyConfigured.actualSettings.relate.maxSl = .01; alreadyConfigured.actualWf.relate.maxSl = .01;
    const actual = make();
    assert.throws(() => verifySettingsCompatibility(alreadyConfigured, actual), /already exists/);
    actual.actualSettings.relate.maxSl = .01; actual.actualWf.relate.maxSl = .01; actual.parent.settingsCompatibility = "exact";
    assert.equal(verifySettingsCompatibility(alreadyConfigured, actual), "exact", "a present original value must stay exact");
  });
  it("checks original feed, symbols, clocks, account, sizing and caps before scoring", () => {
    const original = structuredClone(p);
    const make = () => ({ lane: original.lane, sourceCount: original.sourceCount, symbols: structuredClone(original.symbols),
      window: structuredClone(original.window), tacticMode: original.tacticMode,
      feed: { ...original.feed, path: "/new/copied/feed", parentSha256: original.feed.sha256 },
      account: { ...original.account, maxPositionX: .5, maxExposureX: 1, capBasis: "realized balance",
        perPositionKey: "symbol × side", exposureBasis: "gross long plus short notional" },
      actualSettings: cappedSettings(original.actualSettings), actualWf: structuredClone(original.actualWf),
      parent: { id: original.id, sourceSha256: original.source.sha256, feedSha256: original.feed.sha256 } });
    assert.equal(verifyReplayContinuity(original, make()), "exact");
    const edits = [
      x => { x.symbols[0] = "FOREIGN"; },
      x => { x.window.endT += 3_600_000; },
      x => { x.sourceCount--; },
      x => { x.lane = 15; },
      x => { x.tacticMode = "on"; },
      x => { x.feed.sha256 = "0".repeat(64); },
      x => { x.feed.parentSha256 = "0".repeat(64); },
      x => { x.feed.provider = "different"; },
      x => { x.account.balance = 100; },
      x => { x.account.leverage = 5; },
      x => { x.account.maxPositionX = 1; },
      x => { x.account.maxExposureX = 2; },
      x => { x.account.capBasis = "marked equity"; },
      x => { x.parent.id = "other"; },
      x => { x.parent.feedSha256 = "0".repeat(64); },
      x => { x.parent.sourceSha256 = "0".repeat(64); },
    ];
    for (const edit of edits) { const actual = make(); edit(actual); assert.throws(() => verifyReplayContinuity(original, actual)); }
  });
  it("checks copied feed bytes independently of claimed protocol hashes", () => {
    const copyPath = join(dir, "copy-feed.json"), frozen = { feed: { path: copyPath } };
    writeFileSync(copyPath, feedBytes); verifyReplayFeed(p, frozen);
    writeFileSync(copyPath, Buffer.from("changed data"));
    assert.throws(() => verifyReplayFeed(p, frozen), /capped feed bytes changed/);
  });
});
