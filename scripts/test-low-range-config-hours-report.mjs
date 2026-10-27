#!/usr/bin/env node
// Exercise the real embedded data and controls without requiring a browser binary.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
const html = readFileSync(process.argv[2], "utf8"), expected = JSON.parse(readFileSync(`${process.argv[3]}/config-direction-hours.json`));
const payload = html.match(/<script type="application\/json" id="lr-config-hours-data">([\s\S]*?)<\/script>/)?.[1];
const ui = html.match(/<script id="lr-config-hours-ui">([\s\S]*?)<\/script>/)?.[1];
assert.ok(payload && ui, "offline config-direction data and UI must both be present");
const data = JSON.parse(payload);
assert.equal(data.status, "passed"); assert.equal(data.contexts, expected.contexts);
assert.deepEqual(data.exploratory, expected.exploratory); assert.equal(data.total.n, expected.total.n);
assert.equal(data.rows.length, expected.rows.length);
for (const id of ["lr-config-search", "lr-config-direction", "lr-config-filter"])
  assert.ok(html.includes(`<label for="${id}">`), `missing accessible label for ${id}`);
assert.match(html, /not direction-level historical Base validation/);
assert.match(html, /a close exactly on the hour belongs to the hour just completed/);
class Element {
  constructor() { this.children = []; this.handlers = {}; this.textContent = ""; this.value = ""; this.disabled = false; }
  appendChild(x) { this.children.push(x); } replaceChildren(...xs) { this.children = xs; }
  addEventListener(name, fn) { this.handlers[name] = fn; } fire(name) { this.handlers[name](); }
}
const ids = ["lr-config-hours-data", "lr-config-search", "lr-config-direction", "lr-config-filter", "lr-config-body",
  "lr-config-status", "lr-config-page", "lr-config-prev", "lr-config-next"];
const e = Object.fromEntries(ids.map(x => [x, new Element()]));
e["lr-config-hours-data"].textContent = payload; e["lr-config-direction"].value = "both"; e["lr-config-filter"].value = "all";
runInNewContext(ui, { document: { getElementById: id => e[id], createElement: () => new Element() } }, { timeout: 4000 });
assert.equal(e["lr-config-body"].children.length, Math.min(25, data.contexts));
assert.ok(e["lr-config-body"].children.every(tr => tr.children.length === 29), "each visible row has 24 hour cells");
if (data.contexts > 25) {
  assert.equal(e["lr-config-next"].disabled, false); e["lr-config-next"].fire("click");
  assert.match(e["lr-config-page"].textContent, /^26/); e["lr-config-prev"].fire("click");
}
e["lr-config-filter"].value = "consistent"; e["lr-config-filter"].fire("input");
assert.equal(e["lr-config-body"].children.length, Math.min(25, data.exploratory.consistent));
e["lr-config-search"].value = "no-such-config-782901"; e["lr-config-search"].fire("input");
assert.equal(e["lr-config-body"].children.length, 0);
console.log(`Rendered ${data.contexts} audited contexts through accessible, paginated 24-hour controls.`);
