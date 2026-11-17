// The session's sizing replay enforces free margin like the exchange: orders open only with the margin the realized
// equity can carry; --margin off reproduces the unlimited book.
import { it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { fileURLToPath } from "node:url";
import { normalizedBookNotional } from "./lib/book-notional.mjs";

const source = readFileSync(fileURLToPath(new URL("./core-session.mjs", import.meta.url)), "utf8");
const start = source.indexOf("function sizeCapped(");
const end = source.indexOf("\nconst sizeOpt =", start);
const orderKey = (x) => `${x.cfg}|${x.sym}|${x.side > 0 ? 1 : -1}|${x.entryT}`;
const sizeCapped = runInNewContext(`(${source.slice(start, end).trim()})`, { normalizedBookNotional, orderKey, Map, Math, Float64Array, Error });
const M = 60_000;
// 200 orders entering together on one symbol, each 2 % of a $10 balance at 10× leverage would need 40× the equity in notional
const entries = Array.from({ length: 200 }, (_, i) => ({ cfg: `c${i}`, sym: "A", side: 1, entryT: M, exitT: 2 * M, r: -0.01, vol: 1 }));
const base = { balance: 10, sizing: { mode: "equityPct", pct: 0.2 }, fixedNotional: 0, posX: 0, expX: 0, leverage: 10 };

it("defaults on in the session; scales the instant's entries to the margin the equity carries", () => {
  assert.match(source, /const marginRule = arg\("margin", "on"\) !== "off";/);
  const on = sizeCapped(entries, [], { ...base, margin: true });
  const notional = [...on.units.values()].reduce((a, b) => a + b, 0);
  assert.ok(notional <= 10 * 10 + 1e-9, `open notional ${notional} within equity × leverage`);
  assert.equal(on.byMargin, 200, "every entry of the instant shares the room");
  assert.ok(on.realized >= 0, `balance ${on.realized} never below zero from these entries`);
});

it("off reproduces the unlimited book; a floor keeps part of the equity free", () => {
  const off = sizeCapped(entries, [], { ...base, margin: false });
  assert.ok(Math.abs([...off.units.values()].reduce((a, b) => a + b, 0) - 200 * 2) < 1e-9);
  assert.equal(off.byMargin, 0);
  const floor = sizeCapped(entries, [], { ...base, margin: true, marginFloor: 5 });
  assert.ok([...floor.units.values()].reduce((a, b) => a + b, 0) <= 5 * 10 + 1e-9);
});

it("a book within the margin is unchanged", () => {
  const few = entries.slice(0, 5);
  const on = sizeCapped(few, [], { ...base, margin: true }), off = sizeCapped(few, [], { ...base, margin: false });
  assert.deepEqual([...on.units], [...off.units]);
  assert.equal(on.byMargin, 0);
});
