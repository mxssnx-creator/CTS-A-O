import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

for (const [name, base, evalPassed, evalCount, configs, orders, open, noTp, proof] of [
  ['report.html', 132, 8, 251, 811, 336, 18, 42, 35],
  ['report-n10.html', 166, 61, 460, 1068, 2445, 89, 455, 56],
]) test(`${name} preserves independent Base and funded modeled cohorts`, () => {
  const html = readFileSync(`docs/trailing-only-independent-base-20261030/${name}`, 'utf8');
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
  assert.equal(d.basePassed, base); assert.equal(d.baseEvaluated, 27242);
  assert.equal(d.evalStats.passed, evalPassed); assert.equal(d.evalStats.evaluated, evalCount);
  assert.equal(d.configs.length, configs); assert.equal(d.orders.length, orders); assert.equal(d.open.length, open);
  assert.equal(d.orders.filter(x => x.kind === 'trailing-only').length, noTp);
  assert.equal(d.baseTrailingOnlyByRange.find(x => x.tag === 'mn').passed, proof);
  assert.equal(d.parity.matched, orders); assert.equal(d.parity.mismatchCount, 0);
  assert.equal(nodes.get('noTpBase').children[1].children.length, d.baseTrailingOnlyByRange.length);
  assert.equal(nodes.get('heat').children[1].children.length, 12);
  assert.equal(nodes.get('orders').children[1].children.length, 100);
  assert.ok(html.includes('independently Base-qualified trailing-only configs'));
  if (name.includes('n10')) assert.ok(html.includes('Research-only comparison'));
});
