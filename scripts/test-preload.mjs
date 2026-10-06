// Preloaded into every test process (node --import ./scripts/test-preload.mjs):
// - no network: fetch and WebSocket to anything but this machine throw, so a suite can never reach an exchange or
//   another service by accident (CTS_TEST_NETWORK=1 lifts it for a deliberate network test);
// - the synthetic market ends at a pinned UTC hour unless the file sets its own end, so every run sees the same bars.
const PINNED_END = Date.UTC(2026, 8, 30, 12);
process.env.CTS_CORE_SYNTHETIC_END ??= String(PINNED_END);

if (process.env.CTS_TEST_NETWORK !== "1") {
  const local = (u) => {
    try {
      const h = new URL(String(u)).hostname;
      return h === "localhost" || h === "127.0.0.1" || h === "::1" || h === "[::1]";
    } catch {
      return false;
    }
  };
  const realFetch = globalThis.fetch;
  globalThis.fetch = (input, init) => {
    const url = typeof input === "string" || input instanceof URL ? input : input?.url;
    if (local(url)) return realFetch(input, init);
    return Promise.reject(new Error(`network disabled in tests: fetch ${url}`));
  };
  const RealWs = globalThis.WebSocket;
  if (RealWs)
    globalThis.WebSocket = class extends RealWs {
      constructor(url, protocols) {
        if (!local(url)) throw new Error(`network disabled in tests: WebSocket ${url}`);
        super(url, protocols);
      }
    };
}
