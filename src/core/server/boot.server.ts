// Starts the Core v2 runtime with the server process (not on the first viewer request), so the engine runs
// continuously. Disable with CTS_CORE_AUTOSTART=0.
import { coreRuntime } from "./runtime.server.ts";

const G = globalThis as unknown as { __ctsCoreSignals?: boolean };

export function bootCore(): string {
  if (process.env.CTS_CORE_AUTOSTART === "0") return "autostart disabled";
  const rt = coreRuntime();
  // a stop / update / reboot persists state and the snapshot first (registered once per process)
  if (!G.__ctsCoreSignals) {
    G.__ctsCoreSignals = true;
    for (const sig of ["SIGTERM", "SIGINT"] as const)
      process.once(sig, () => {
        try {
          const r = coreRuntime().shutdown(sig);
          console.info(
            `[core] ${sig}: stopped, state saved, snapshot ${r.snapshot ? "written" : "off"}`,
          );
        } catch (err) {
          console.error("[core] shutdown failed:", err);
        }
        process.exit(0);
      });
  }
  return `core v2 runtime ${rt.status.state}`;
}
