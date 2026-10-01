#!/usr/bin/env node
// Memory of one engine compute: RSS / heap / array buffers per phase, tape count and tape bytes.
//   node --experimental-strip-types scripts/core-mem-probe.mjs [--symbols 8] [--settings '{…}']
process.env.CTS_CORE_STATE = "off";
process.env.CTS_CORE_AUTOSTART = "0";
const { CoreRuntime } = await import("../src/core/server/runtime.server.ts");
const { CoreDb } = await import("../src/core/server/db.server.ts");
const { tapeBytes } = await import("../src/core/sim/walkforward.ts");
const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const mb = (x) => Math.round(x / 1e6);
const rt = new CoreRuntime(new CoreDb(":memory:"), { symbols: Number(arg("symbols", 8)), ...JSON.parse(arg("settings", "{}")) }, { market: "bingx" });
rt.updateSettings({}, { preH: 12, simH: 24 });
let peak = 0;
const phases = {};
const timer = setInterval(() => {
  const m = process.memoryUsage();
  peak = Math.max(peak, m.rss);
  const st = rt.status.stage || rt.status.state;
  const p = (phases[st] ??= { rss: 0, heap: 0, ab: 0 });
  p.rss = Math.max(p.rss, mb(m.rss));
  p.heap = Math.max(p.heap, mb(m.heapUsed));
  p.ab = Math.max(p.ab, mb(m.arrayBuffers));
}, 250);
const t0 = Date.now();
rt.start();
while (rt.status.computes < 1) {
  if (rt.status.state === "error" && Date.now() - t0 > 600_000) throw new Error(rt.status.error);
  await new Promise((r) => setTimeout(r, 500));
}
rt.stop();
clearInterval(timer);
const bytes = rt.tapes.reduce((a, t) => a + tapeBytes(t.n), 0);
const closes = rt.tapes.reduce((a, t) => a + t.n, 0);
const m = process.memoryUsage();
console.log(
  JSON.stringify(
    {
      computeS: Math.round(rt.status.lastComputeMs / 1000),
      tapes: rt.tapes.length,
      closes,
      tapeMb: mb(bytes),
      peakRssMb: mb(peak),
      endRssMb: mb(m.rss),
      heapMb: mb(m.heapUsed),
      arrayBuffersMb: mb(m.arrayBuffers),
      phases,
      sim: rt.sim ? { pf: +rt.sim.stats.pf.toFixed(3), n: rt.sim.stats.n } : null,
    },
    null,
    1,
  ),
);
process.exit(0);
