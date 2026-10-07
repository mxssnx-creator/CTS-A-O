// Usage: node --cpu-prof --cpu-prof-dir=<dir> --experimental-strip-types --no-warnings scripts/perf/stall-probe.ts <repo root>
// Runs the runtime test's two computes and prints each phase's longest uninterrupted slice and the worst loop stall.
process.env.CTS_CORE_SYNTHETIC_END = String(Math.floor(Date.now() / 3_600_000) * 3_600_000);
const root = process.argv[2];
const { CoreRuntime } = await import(`${root}/src/core/server/runtime.server.ts`);
const { CoreDb } = await import(`${root}/src/core/server/db.server.ts`);
const { SIGNAL_SOURCES } = await import(`${root}/src/core/signal-config.ts`);
const { signalSettings } = await import(`${root}/src/core/signals.ts`);
const small = {
  symbols: 4, historyDays: 18, tfDays: { "1": 3, "5": 6, "15": 18, "30": 18 }, mainTop: 12, refineTop: 4, evalTop: 8,
  cycleMs: 60_000, grid: { short: false }, tactics: { session: false, volRegime: false, trendStrength: false, cooldown: false, cooldownBars: 4 },
  gates: { minPf: 1.05, minTrades: 3, maxDdr: 0 },
  signals: signalSettings({ exits: "pct", sources: Object.fromEntries(SIGNAL_SOURCES.filter((x: { name: string }) => x.name.startsWith("s2-")).map((x: { name: string }) => [x.name, false])) }),
};
const rt = new CoreRuntime(new CoreDb(":memory:"), small as never, { market: "synthetic" });
let worst = 0, worstAt = "";
let last = performance.now();
const iv = setInterval(() => {
  const now = performance.now();
  const d = now - last - 10;
  if (d > worst) { worst = d; worstAt = `${rt.status.stage ?? "?"} ${rt.status.label ?? ""}`.slice(0, 120); }
  last = now;
}, 10);
const until = async (c: () => boolean) => { while (!c()) await new Promise((r) => setTimeout(r, 20)); };
rt.start();
await until(() => rt.status.computes >= 1);
rt.updateSettings({ gates: { ...rt.settings.gates, minPf: rt.settings.gates.minPf + 0.05 } });
await until(() => rt.status.computes >= 2);
clearInterval(iv);
rt.stop();
console.log(`worst stall ${worst.toFixed(0)} ms during: ${worstAt}`);
for (const [k, v] of Object.entries(rt.status.phases as Record<string, { maxSliceMs: number; slowest?: string }>).sort((a, b) => b[1].maxSliceMs - a[1].maxSliceMs).slice(0, 8))
  console.log(`  ${k}: max slice ${v.maxSliceMs.toFixed(0)} ms ${v.slowest ? `(${String(v.slowest).slice(0, 90)})` : ""}`);
process.exit(0);
