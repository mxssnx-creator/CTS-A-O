import assert from "node:assert/strict";
import { test } from "node:test";
import { signalTypeLabel, signalUnitRowKey } from "./signal-units.ts";

test("signal unit rows keep types, ranges, lanes, symbols and directions independent", () => {
  const unit = { bot: "follow", ind: "sig-rsi-m@m15", sym: "BTC-USDT", side: 1, kind: "normal" };
  const variants = [
    unit,
    { ...unit, kind: "trailing" },
    { ...unit, kind: "dca" },
    { ...unit, kind: "dca-active" },
    { ...unit, kind: "axis" },
    { ...unit, ind: "sig-rsi-s@m15" },
    { ...unit, ind: "sig-rsi-m@m5" },
    { ...unit, sym: "ETH-USDT" },
    { ...unit, side: -1 },
    { ...unit, kind: undefined },
  ];
  assert.equal(new Set(variants.map(signalUnitRowKey)).size, variants.length);
  assert.equal(signalUnitRowKey({ ...unit }), signalUnitRowKey(unit));
});

test("legacy discovery rows are explicit and never labeled as a qualified Normal unit", () => {
  assert.equal(signalTypeLabel(), "Base / discovery");
  assert.equal(signalTypeLabel(null), "Base / discovery");
  assert.equal(signalTypeLabel("normal"), "Normal");
  assert.equal(signalTypeLabel("trailing"), "Trailing");
  assert.equal(signalTypeLabel("dca-active"), "DCA Active");
  assert.equal(signalTypeLabel("future-type"), "future-type");
});
