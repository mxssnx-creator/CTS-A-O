import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { sessionCutT } from "./session-window.ts";

const H = 3_600_000;
const NOW = Date.UTC(2026, 9, 6, 1, 57, 12);
const HOUR = Date.UTC(2026, 9, 6, 1);

describe("session window", () => {
  it("cuts at the current full hour by default, so a 3 h run is three complete hours (was 3 h 57 min)", () => {
    assert.equal(sessionCutT({ now: NOW }), HOUR);
  });
  it("--end-at (floored to the hour) and --end-ago win; --to-now keeps the uncut feed", () => {
    assert.equal(sessionCutT({ now: NOW, endAt: "2026-10-05T22:30:00Z" }), Date.UTC(2026, 9, 5, 22));
    assert.equal(sessionCutT({ now: NOW, endAgo: 2 }), HOUR - 2 * H);
    assert.equal(sessionCutT({ now: NOW, toNow: true }), 0);
  });
});
