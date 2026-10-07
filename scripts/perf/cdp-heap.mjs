// Usage: node cdp-heap.mjs <port> <seconds> <out.json> — sampling heap (allocation) profile of a running node process
const [port, secs, out] = process.argv.slice(2);
const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const ws = new WebSocket(list[0].webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
const send = (method, params = {}) =>
  new Promise((res, rej) => {
    const i = ++id;
    pending.set(i, { res, rej });
    ws.send(JSON.stringify({ id: i, method, params }));
  });
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    const p = pending.get(m.id);
    pending.delete(m.id);
    m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result);
  }
};
await new Promise((r) => (ws.onopen = r));
await send("HeapProfiler.enable");
// keep objects collected by GC in the profile: the sample then shows allocation volume (garbage), not only live data
await send("HeapProfiler.startSampling", { samplingInterval: 262144, includeObjectsCollectedByMajorGC: true, includeObjectsCollectedByMinorGC: true });
console.log(`allocation sampling ${secs}s from ${new Date().toISOString()}`);
await new Promise((r) => setTimeout(r, Number(secs) * 1000));
const { profile } = await send("HeapProfiler.stopSampling");
(await import("node:fs")).writeFileSync(out, JSON.stringify(profile));
// self size per function (allocation volume over the window)
const self = new Map();
const walk = (n, stack) => {
  const f = n.callFrame;
  const name = `${f.functionName || "(anon)"} ${(f.url || "").replace(/^file:\/\/.*?\/(src|scripts)\//, "$1/")}:${f.lineNumber + 1}`;
  if (n.selfSize) self.set(name, (self.get(name) ?? 0) + n.selfSize);
  for (const c of n.children ?? []) walk(c, stack);
};
walk(profile.head, []);
const tot = [...self.values()].reduce((a, b) => a + b, 0);
console.log(`sampled ${(tot / 1048576).toFixed(0)} MB allocated`);
for (const [k, v] of [...self].sort((a, b) => b[1] - a[1]).slice(0, 40)) console.log(`${(v / 1048576).toFixed(0).padStart(7)} MB  ${k}`);
ws.close();
process.exit(0);
