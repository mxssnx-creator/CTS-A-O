// Usage: node cdp-profile.mjs <port> <seconds> <out.cpuprofile>
// Takes a sampling CPU profile of a running node process whose inspector listens on <port>, then closes the inspector.
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
await send("Profiler.enable");
await send("Profiler.setSamplingInterval", { interval: 2000 });
await send("Profiler.start");
console.log(`profiling ${secs}s from ${new Date().toISOString()}`);
await new Promise((r) => setTimeout(r, Number(secs) * 1000));
const { profile } = await send("Profiler.stop");
(await import("node:fs")).writeFileSync(out, JSON.stringify(profile));
console.log(`saved ${out}: ${profile.samples.length} samples`);
try {
  await send("Runtime.evaluate", { expression: "import('node:inspector').then(i => i.close())", awaitPromise: true });
} catch (e) {
  console.log("close:", String(e).slice(0, 200));
}
ws.close();
process.exit(0);
