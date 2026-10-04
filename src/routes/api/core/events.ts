// Server-sent events of every connection's runtime: state, progress, compute done, paper step, live step,
// settings. The UI refreshes a page when its connection reports something new instead of polling blind.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/core/events")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { onCoreEvent, CONN_IDS, existingRuntime } = await import("@/core/server/runtime.server");
        const enc = new TextEncoder();
        let off: (() => void) | null = null;
        let ping: ReturnType<typeof setInterval> | null = null;
        const close = () => {
          off?.();
          off = null;
          if (ping) clearInterval(ping);
          ping = null;
        };
        const stream = new ReadableStream<Uint8Array>({
          start(ctl) {
            const send = (event: string, data: unknown) => {
              try {
                ctl.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
              } catch {
                close();
              }
            };
            // the current state of every connection first, then every change
            for (const conn of CONN_IDS) {
              const r = existingRuntime(conn);
              send("core", {
                type: "state",
                conn,
                at: Date.now(),
                state: r?.status.state ?? "off",
                stage: r?.status.stage ?? "",
                progress: r?.status.progress ?? 0,
                label: r?.status.label ?? "",
                overall: r?.status.overall ?? 0,
                computes: r?.status.computes ?? 0,
              });
            }
            off = onCoreEvent((e) => send("core", e));
            // a comment line every 15 s keeps proxies from closing an idle stream
            ping = setInterval(() => {
              try {
                ctl.enqueue(enc.encode(`: ping\n\n`));
              } catch {
                close();
              }
            }, 15_000);
            request.signal.addEventListener("abort", () => {
              close();
              try {
                ctl.close();
              } catch {
                /* already closed */
              }
            });
          },
          cancel() {
            close();
          },
        });
        return new Response(stream, {
          headers: {
            "content-type": "text/event-stream; charset=utf-8",
            "cache-control": "no-cache, no-transform",
            connection: "keep-alive",
            "x-accel-buffering": "no",
          },
        });
      },
    },
  },
});
