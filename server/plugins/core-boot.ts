/**
 * Self-hosted server build (NITRO_PRESET=node-server, see scripts/linux/cts.sh): start the Core engine with the
 * process, so it runs continuously from boot instead of waiting for the first request. The dev server does the
 * same through the core-v2-boot Vite plugin. Never on Vercel (serverless functions do not keep a loop alive).
 */
import { definePlugin } from "nitro";

export default definePlugin(() => {
  if (process.env.VERCEL || process.env.CTS_CORE_AUTOSTART === "0") return;
  void import("../../src/core/server/boot.server.ts")
    .then((m) => console.info(`[core] ${m.bootCore()}`))
    .catch((err) => console.error("[core] boot failed:", err));
});
