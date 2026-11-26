import { test } from "node:test";
import assert from "node:assert/strict";
import { EntryEventWindow } from "./entry-event-window.ts";

test("admission keys survive only as long as their exact timestamp or minute", () => {
  const w = new EntryEventWindow();
  w.advance(1_000);
  w.duplicates.add("duplicate");
  w.crowd.set("crowd", 1);
  w.pairEvents.add("pair");
  w.advance(1_000);
  assert.ok(w.duplicates.has("duplicate"));
  assert.equal(w.crowd.get("crowd"), 1);
  assert.ok(w.pairEvents.has("pair"));
  w.advance(59_999);
  assert.equal(w.duplicates.size, 0);
  assert.equal(w.crowd.size, 0);
  assert.ok(w.pairEvents.has("pair"), "a minute split across batches keeps the funded event");
  w.advance(60_000);
  assert.equal(w.pairEvents.size, 0);
});

test("admission memory is bounded by the current timestamp and minute, not the run length", () => {
  const w = new EntryEventWindow();
  for (let i = 0; i < 100_000; i++) {
    w.advance(i * 1_000);
    w.duplicates.add(`duplicate-${i}`);
    w.crowd.set(`crowd-${i}`, 1);
    w.pairEvents.add(`pair-${i}`);
    assert.equal(w.duplicates.size, 1);
    assert.equal(w.crowd.size, 1);
    assert.ok(w.pairEvents.size <= 60);
  }
});
