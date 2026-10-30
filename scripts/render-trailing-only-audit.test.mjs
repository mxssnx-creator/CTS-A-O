import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

// Exercise the self-contained deliverables with a bounded DOM and no venue or browser.
for (const [name, configCount, orders, open, basePassed, evalPassed, evalCount, trailingCount] of [
  ['report.html', 800, 294, 13, 120, 6, 236, 0],
  ['report-n10.html', 1102, 2116, 79, 151, 54, 478, 126],
]) test(`${name} preserves the modeled cohorts and all twelve heatmap hours`, () => {
  const html = readFileSync(`docs/trailing-only-audit-20261030/${name}`, 'utf8');
  const js = html.match(/<script>([\s\S]*?)<\/script>/)?.[1]; assert.ok(js);
  class Node {
    constructor() { this.children = []; this.style = {}; this.value = ''; }
    append(...xs) { this.children.push(...xs); }
    replaceChildren(...xs) { this.children = xs; }
    addEventListener(name, fn) { this[name] = fn; }
    click() {}
  }
  const nodes = new Map();
  const document = { createElement: () => new Node(), getElementById: id => {
    if (!nodes.has(id)) nodes.set(id, new Node()); return nodes.get(id);
  }};
  const sandbox = { document, Blob, URL, setTimeout, Date, console };
  runInNewContext(js + '\n;globalThis.reportData=D;', sandbox, { timeout: 5000 });
  const d = sandbox.reportData;
  assert.equal(d.configs.length, configCount); assert.equal(d.orders.length, orders); assert.equal(d.open.length, open);
  assert.equal(d.basePassed, basePassed); assert.equal(d.baseEvaluated, 27242);
  assert.equal(d.evalStats.passed, evalPassed); assert.equal(d.evalStats.evaluated, evalCount);
  assert.equal(d.orders.filter(o => o.kind === 'trailing-only').length, trailingCount);
  assert.equal(d.parity.matched, orders); assert.equal(d.parity.mismatchCount, 0);
  assert.equal(nodes.get('heat').children[1].children.length, 12);
  assert.equal(nodes.get('orders').children[1].children.length, 100);
  assert.ok(html.includes('exchange PF is unavailable'));
  if (trailingCount) {
    assert.ok(d.diagnosticExperiment); assert.equal(d.comparisonOk, null);
    assert.ok(html.includes('Research-only comparison'));
  } else {
    assert.equal(d.qualifiedComparison.removed.length, 18);
    assert.equal(d.qualifiedComparison.retainedIdentical, 800);
  }
});
