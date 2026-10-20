#!/usr/bin/env node
// Top allocation sites of a V8 .heapprofile (sampling profile), by self bytes: node scripts/heapprof-top.mjs f.heapprofile [n]
import { readFileSync } from "node:fs";
const p = JSON.parse(readFileSync(process.argv[2], "utf8"));
const N = Number(process.argv[3] ?? 40);
const by = new Map();
let total = 0;
(function walk(n) {
  const cf = n.callFrame;
  const self = n.selfSize ?? 0;
  if (self) {
    const k = `${cf.functionName || "(anon)"} ${cf.url.replace(/^.*\/(src|scripts)\//, "$1/")}:${cf.lineNumber + 1}`;
    by.set(k, (by.get(k) ?? 0) + self);
    total += self;
  }
  for (const c of n.children ?? []) walk(c);
})(p.head);
console.log(`${(total / 1048576).toFixed(0)} MB sampled allocation`);
for (const [k, v] of [...by].sort((a, b) => b[1] - a[1]).slice(0, N))
  console.log(`${(v / 1048576).toFixed(0).padStart(7)} MB ${((100 * v) / total).toFixed(1).padStart(5)} %  ${k}`);
