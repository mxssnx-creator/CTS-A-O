import assert from "node:assert/strict";
import { test } from "node:test";
import { hasNoTakeProfit, historicExitLabel, signalConfigCounts, signalTrailGapRatio, signalTypeLabel, signalUnitRowKey } from "./signal-units.ts";
import { DEFAULT_SIGNALS, signalSettings } from "../../core/signal-config.ts";
import { signalProtects } from "../../core/signals.ts";

test("signal unit rows keep types, ranges, lanes, symbols and directions independent", () => {
  const unit = { bot: "follow", ind: "sig-rsi-m@m15", sym: "BTC-USDT", side: 1, kind: "normal" };
  const variants = [
    unit,
    { ...unit, kind: "trailing" },
    { ...unit, kind: "trailing-only" },
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
  assert.equal(signalTypeLabel("trailing"), "Trailing with TP");
  assert.equal(signalTypeLabel("trailing-only"), "Trailing only · no TP");
  assert.equal(signalTypeLabel("dca-active"), "DCA Active");
  assert.equal(signalTypeLabel("exit"), "Historic Exit");
  assert.equal(signalTypeLabel("future-type"), "future-type");
});

test("Historic Exit labels preserve every family and direction without assigning a range or changing the kind", () => {
  const base = "follow|rsi@m5|tp1.2|sl0.8|tr0.3|h32";
  for (const [code, family] of [["0", "Static SL"], ["1", "Adaptive SL"], ["2", "Trailing"]]) {
    for (const [direction, side] of [["L", "Long"], ["S", "Short"]]) {
      const row = { key: `${base}|hx${direction}${code}`, kind: "exit" };
      assert.equal(historicExitLabel(row), `Historic Exit · ${family} · ${side}`);
      assert.equal(row.kind, "exit", "display text must retain the independent execution/filter kind");
    }
  }
  assert.equal(historicExitLabel({ cfg: `${base}|hxL0` }), "Historic Exit · Static SL · Long");
  assert.equal(historicExitLabel({ id: `${base}|hxS2` }), "Historic Exit · Trailing · Short");
  assert.equal(historicExitLabel({ key: `${base}|hx` }), "Historic Exit", "legacy identity cannot invent a family or direction");
  assert.equal(historicExitLabel({ key: `${base}|hxL` }), "Historic Exit · Long");
  assert.equal(historicExitLabel({ key: `${base}|hx1` }), "Historic Exit · Adaptive SL");
  for (const suffix of ["", "|mc", "|to", "|hxL3", "|hxLS0", "|hxL0|extra", "|hxL0|dca"])
    assert.equal(historicExitLabel({ key: `${base}${suffix}` }), null);
  assert.equal(historicExitLabel({}), null);
});

test("Signal UI counts match the engine and include no-TP sets independently of percent/ATR selection", () => {
  for (const exits of ["pct", "atr", "both"] as const) {
    const settings = signalSettings({ exits });
    const counts = signalConfigCounts(settings);
    const protects = signalProtects(settings);
    assert.equal(counts.total, protects.length);
    assert.equal(counts.trailingOnly, 9);
    assert.equal(protects.filter((p) => p.trailOnly).length, counts.trailingOnly);
  }
  const disabled = signalSettings({ trailingOnly: { ...DEFAULT_SIGNALS.trailingOnly, enabled: false } });
  assert.equal(signalConfigCounts(disabled).trailingOnly, 0);
  assert.equal(signalConfigCounts(disabled).total, signalProtects(disabled).length);
  const custom = signalSettings({ trailingOnly: { enabled: true, sl: [0.015, 0.015, 0.03], trail: [0.005], trailStep: 1 } });
  assert.equal(signalConfigCounts(custom).trailingOnly, 2);
  assert.equal(signalConfigCounts(custom).total, signalProtects(custom).length);
  const belowFloor = signalSettings({
    trailingOnly: { ...custom.trailingOnly, trailStep: 0.5 },
  });
  assert.equal(signalConfigCounts(belowFloor).trailingOnly, 0);
  assert.equal(signalConfigCounts(belowFloor).total, signalProtects(belowFloor).length);
});

test("No-TP labels require the explicit mode, and trailing gap is separate from its activation move", () => {
  assert.equal(hasNoTakeProfit({ tp: 0 }), false, "zero can be missing live detail");
  assert.equal(hasNoTakeProfit({ trailOnly: true }), true);
  assert.equal(hasNoTakeProfit({ kind: "trailing-only" }), true);
  assert.equal(hasNoTakeProfit({ id: "follow|sig-rsi-s@m15|tp0|sl1.5|tr0.5|h32|to|ts0.5" }), true);
  assert.equal(hasNoTakeProfit({ id: "follow|sig-rsi-s@m15|tp1|sl1.5|tr0.5|h32|today" }), false);
  assert.equal(signalTrailGapRatio({ id: "x|to" }), 1);
  assert.equal(signalTrailGapRatio({ id: "x|to|ts0.5" }), 0.5);
  assert.equal(signalTrailGapRatio({ trailStep: 1.5 }), 1.5);
});
