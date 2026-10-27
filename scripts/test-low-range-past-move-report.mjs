#!/usr/bin/env node
// Exercise the portable report's client-side rendering, including both interactive controls.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const path = process.argv[2];
if (!path) throw new Error("Expected report HTML path");
const html = readFileSync(path, "utf8");
const script = /<script>([\s\S]*?)<\/script>/.exec(html)?.[1];
assert.ok(script, "embedded report script");
class Element {
  innerHTML = "";
  value = "2";
  open = false;
  handlers = new Map();
  addEventListener(type, callback) { this.handlers.set(type, callback); }
  fire(type) { this.handlers.get(type)?.call(this); }
}
const elements = new Map();
const document = { querySelector(selector) {
  assert.ok(html.includes(`id="${selector.slice(1)}"`), `missing ${selector}`);
  if (!elements.has(selector)) elements.set(selector, new Element());
  return elements.get(selector);
} };
runInNewContext(script, { document });
const rows = (selector) => (elements.get(selector).innerHTML.match(/<tr>/g) ?? []).length;
assert.equal(rows("#steps"), 5);
assert.equal(rows("#relations"), 40);
assert.equal(rows("#symbolRows"), 100);
assert.equal(rows("#symbolHeat"), 21);
const before = elements.get("#symbolHeat").innerHTML;
elements.get("#stepChoice").value = "6";
elements.get("#stepChoice").fire("change");
assert.notEqual(elements.get("#symbolHeat").innerHTML, before, "step selector changes heatmap");
elements.get("#detailPanel").open = true;
elements.get("#detailPanel").fire("toggle");
assert.equal(rows("#detailRows"), 2400);
for (const [name, node] of elements)
  assert.ok(!/\b(?:NaN|undefined)\b/.test(node.innerHTML), `${name} has invalid displayed values`);
console.log("Report rendering passed: 5 step rows, 40 relation rows, 100 symbol rows, 2,400 symbol-hour rows and interactive heatmap.");
