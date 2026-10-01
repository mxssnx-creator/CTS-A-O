// Starts the Core v2 runtime with the server process (not on the first viewer request), so the engine runs
// continuously. Disable with CTS_CORE_AUTOSTART=0.
import {
  allRuntimes,
  coreRuntime,
  enabledConns,
  isConnId,
  runtimeFor,
  type CoreRuntime,
} from "./runtime.server.ts";
import type { LiveSettings } from "../config.ts";

const G = globalThis as unknown as { __ctsCoreSignals?: boolean };

export function bootCore(): string {
  if (process.env.CTS_CORE_AUTOSTART === "0") return "autostart disabled";
  const rt = coreRuntime();
  // the host's live connection gets the live switches (CTS_CORE_LIVE_CONN; default the primary connection)
  const liveConn = process.env.CTS_CORE_LIVE_CONN?.trim();
  const target = isConnId(liveConn) ? runtimeFor(liveConn, { start: false }) : rt;
  const applied = applyHostSettings(target);
  if (applied) console.info(`[core] host settings applied: ${applied}`);
  // every enabled connection runs its own runtime, side by side
  const conns = enabledConns();
  for (const c of conns) runtimeFor(c);
  // a stop / update / reboot persists state and the snapshot first (registered once per process)
  if (!G.__ctsCoreSignals) {
    G.__ctsCoreSignals = true;
    for (const sig of ["SIGTERM", "SIGINT"] as const)
      process.once(sig, () => {
        for (const r of allRuntimes())
          try {
            const res = r.shutdown(sig);
            console.info(
              `[core] ${sig} ${r.conn ?? ""}: stopped, state saved, snapshot ${res.snapshot ? "written" : "NOT written (see the event log)"}`,
            );
          } catch (err) {
            console.error(`[core] shutdown ${r.conn ?? ""} failed:`, err);
          }
        process.exit(0);
      });
  }
  return `core v2 runtimes ${conns.join(", ")} (${rt.status.state})`;
}

const CONNS = ["bingx-x01", "bingx-vst-01", "bingx-vst-02"] as const;

/**
 * Unattended setup from the host environment (the installer's env file), for a server nobody clicks through:
 *   CTS_CORE_SYMBOLS=30            universe size (1–200)
 *   CTS_CORE_LIVE_CONN=bingx-x01   live connection
 *   CTS_CORE_LIVE_AUTO=1           switch Settings → Live on (orders still need CTS_CORE_LIVE=1, keys and a ready
 *                                  simulated run; =0 switches it off)
 *   CTS_CORE_REQUIRE_READY=0       waive the simulated-run gate, including on mainnet (x01). =1 forces it on.
 * Applied once per set of values: a later change in the UI is kept across restarts until the env values change.
 */
export function applyHostSettings(rt: CoreRuntime, env: NodeJS.ProcessEnv = process.env): string {
  const want: Record<string, string> = {};
  for (const k of ["CTS_CORE_SYMBOLS", "CTS_CORE_LIVE_CONN", "CTS_CORE_LIVE_AUTO", "CTS_CORE_REQUIRE_READY"])
    if (env[k]?.trim()) want[k] = env[k]!.trim();
  if (!Object.keys(want).length) return "";
  // each variable is applied once per value: changing one never re-applies the others (a Live switched off in
  // the UI stays off when only the symbol count changes)
  // (the previous format stored the whole set as a JSON string)
  let raw = rt.db.kvGet<unknown>("hostSettingsApplied");
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      raw = null;
    }
  }
  const applied: Record<string, string> =
    raw && typeof raw === "object" ? { ...(raw as Record<string, string>) } : {};
  const fresh = (k: string) => want[k] !== undefined && applied[k] !== want[k];
  if (!Object.keys(want).some(fresh)) return "";
  const patch: Record<string, unknown> = {};
  const live: Partial<LiveSettings> = {};
  const done: string[] = [];
  if (fresh("CTS_CORE_SYMBOLS")) {
    const n = Number(want.CTS_CORE_SYMBOLS);
    if (Number.isInteger(n) && n >= 1 && n <= 200) {
      patch.symbols = n;
      done.push(`symbols ${n}`);
    } else console.warn(`[core] CTS_CORE_SYMBOLS=${want.CTS_CORE_SYMBOLS} ignored (1–200)`);
  }
  if (fresh("CTS_CORE_LIVE_CONN")) {
    const conn = want.CTS_CORE_LIVE_CONN as (typeof CONNS)[number];
    if (CONNS.includes(conn)) {
      live.connId = conn;
      done.push(`live connection ${conn}`);
      // the real account never trades without the readiness check, unless the host explicitly waives it
      if (
        conn === "bingx-x01" &&
        rt.settings.live.requireReady === false &&
        want.CTS_CORE_REQUIRE_READY !== "0"
      ) {
        live.requireReady = true;
        done.push("readiness check on (mainnet)");
      }
    } else console.warn(`[core] CTS_CORE_LIVE_CONN=${conn} ignored (${CONNS.join(", ")})`);
  }
  if (fresh("CTS_CORE_LIVE_AUTO")) {
    if (want.CTS_CORE_LIVE_AUTO === "1" || want.CTS_CORE_LIVE_AUTO === "0") {
      live.enabled = want.CTS_CORE_LIVE_AUTO === "1";
      done.push(`live ${live.enabled ? "on" : "off"}`);
    }
  }
  if (fresh("CTS_CORE_REQUIRE_READY")) {
    if (want.CTS_CORE_REQUIRE_READY === "0" || want.CTS_CORE_REQUIRE_READY === "1") {
      live.requireReady = want.CTS_CORE_REQUIRE_READY === "1";
      done.push(`readiness ${live.requireReady ? "on" : "off"}`);
    } else console.warn(`[core] CTS_CORE_REQUIRE_READY=${want.CTS_CORE_REQUIRE_READY} ignored (0 or 1)`);
  }
  if (Object.keys(live).length) patch.live = { ...rt.settings.live, ...live };
  if (Object.keys(patch).length) rt.updateSettings(patch as never);
  rt.db.kvSet("hostSettingsApplied", { ...applied, ...want });
  rt.db.event(
    "info",
    `host settings applied from the environment: ${done.join(", ") || "nothing valid"}`,
  );
  return done.join(", ");
}
