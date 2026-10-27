import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { test } from "node:test";

class Element {
  constructor() { this.children = []; this.handlers = {}; this.value = ""; this.textContent = ""; this.disabled = false; }
  appendChild(x) { this.children.push(x); }
  replaceChildren(...xs) { this.children = xs; }
  addEventListener(name, fn) { this.handlers[name] = fn; }
  fire(name) { this.handlers[name](); }
}
test("offline config-direction UI paginates, filters, and distinguishes empty, flat and no-loss", () => {
  const ids = ["lr-config-hours-data", "lr-config-search", "lr-config-direction", "lr-config-filter", "lr-config-body",
    "lr-config-status", "lr-config-page", "lr-config-prev", "lr-config-next"];
  const e = Object.fromEntries(ids.map(x => [x, new Element()]));
  const rows = Array.from({ length: 30 }, (_, i) => [`cfg-${String(i).padStart(2, "0")}`, 1, 3, 1, 1, 0,
    [[0, 1, 1, 0, 0], [1, 1, 0, 0, 0], [2, 1, 0, 1, 0]], false]);
  rows.push(["<external>", -1, 20, 20, 0, 1, [[0, 7, 7, 0, 0], [1, 7, 7, 0, 0], [2, 6, 6, 0, 1]], true]);
  e["lr-config-hours-data"].textContent = JSON.stringify({ startT: 0, rows, exploratory: { minCloses: 20, minActiveHours: 3, minHourlyPf: 1.1 } });
  e["lr-config-direction"].value = "both"; e["lr-config-filter"].value = "all";
  const document = { getElementById: id => e[id], createElement: () => new Element() };
  runInNewContext(readFileSync(new URL("./low-range-config-hours-ui.js", import.meta.url), "utf8"), { document });
  const body = e["lr-config-body"], page = e["lr-config-page"];
  assert.equal(body.children.length, 25); assert.equal(page.textContent, "1–25 of 31");
  const cells = body.children[0].children;
  assert.equal(cells[5].textContent, "No loss"); assert.equal(cells[6].textContent, "Flat");
  assert.equal(cells[7].textContent, "0.000"); assert.equal(cells[8].textContent, "Empty");
  assert.equal(e["lr-config-prev"].disabled, true); assert.equal(e["lr-config-next"].disabled, false);
  e["lr-config-next"].fire("click"); assert.equal(body.children.length, 6); assert.equal(page.textContent, "26–31 of 31");
  assert.equal(body.children[5].children[0].textContent, "<external>", "untrusted config uses text content, not HTML");
  e["lr-config-prev"].fire("click"); assert.equal(page.textContent, "1–25 of 31");
  e["lr-config-search"].value = "cfg-02"; e["lr-config-search"].fire("input");
  assert.equal(body.children.length, 1); assert.equal(body.children[0].children[0].textContent, "cfg-02");
  e["lr-config-search"].value = ""; e["lr-config-direction"].value = "-1"; e["lr-config-direction"].fire("input");
  assert.equal(body.children.length, 1); assert.equal(body.children[0].children[1].textContent, "Short");
  e["lr-config-filter"].value = "consistent"; e["lr-config-filter"].fire("input"); assert.equal(body.children.length, 1);
  e["lr-config-search"].value = "missing"; e["lr-config-search"].fire("input");
  assert.equal(body.children.length, 0); assert.equal(page.textContent, "0–0 of 0");
  assert.equal(e["lr-config-prev"].disabled, true); assert.equal(e["lr-config-next"].disabled, true);
});
