import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';
import assert from 'node:assert/strict';

// Exercise the delivered, self-contained report without a browser or exchange connection.
test('12h execution report retains every close, open order, config and UTC heatmap hour', () => {
  const html = readFileSync('docs/execution-audit-20261030/report.html', 'utf8');
  const js = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(js, 'embedded script exists');
  class Node {
    constructor(tag) { this.tag = tag; this.children = []; this.style = {}; this.textContent = ''; this.value = ''; }
    append(...xs) { this.children.push(...xs); }
    replaceChildren(...xs) { this.children = xs; }
    addEventListener(name, fn) { this[name] = fn; }
    click() {}
  }
  const nodes = new Map();
  const document = { createElement: tag => new Node(tag), getElementById: id => {
    if (!nodes.has(id)) nodes.set(id, new Node('element'));
    return nodes.get(id);
  }};
  const sandbox = { document, Blob, URL, setTimeout, Date, console };
  runInNewContext(js + '\n;globalThis.reportData=D;', sandbox, { timeout: 3000 });
  const d = sandbox.reportData;
  assert.equal(d.orders.length, 294); assert.equal(d.open.length, 13); assert.equal(d.configs.length, 818);
  assert.equal(d.counts.openedOrders, d.orders.length + d.open.length);
  assert.equal(d.basePassed, 120); assert.equal(d.baseEvaluated, 27242);
  const rows = Object.values(d.evalAfterBase);
  assert.equal(rows.reduce((n, x) => n + x.configs - (x['type off'] ?? 0) - (x['base off'] ?? 0), 0), d.evalStats.evaluated);
  assert.equal(rows.reduce((n, x) => n + x.passed, 0), d.evalStats.passed);
  assert.equal(d.parity.matched, 294); assert.equal(d.parity.mismatchCount, 0); assert.equal(d.comparisonOk, true);
  let gp = 0, gl = 0;
  for (const x of d.orders) { if (x.unitReturn > 0) gp += x.unitReturn; else gl -= x.unitReturn; }
  assert.ok(Math.abs(gp / gl - 3.596185408680534) < 1e-12);
  assert.equal(nodes.get('heat').children[1].children.length, 12, 'exactly the 12 reporting hours');
  assert.equal(nodes.get('orders').children[1].children.length, 100, 'bounded first page');
  assert.equal(nodes.get('open').children[1].children.length, 13);
  nodes.get('orderQuery').value = 'not-a-real-symbol'; nodes.get('orderQuery').input();
  assert.equal(nodes.get('orders').children[1].children.length, 0, 'search filters without removing saved data');
  assert.equal(d.orders.length, 294);
});
