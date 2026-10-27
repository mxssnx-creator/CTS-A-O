import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { resolve } from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";

let vite, StrategyCoverageTable;
before(async () => {
  // Render the actual TSX component without booting the desk or opening an HTTP listener.
  vite = await createServer({ configFile: false, appType: "custom", plugins: [react()],
    resolve: { alias: { "@": resolve("src") } }, server: { middlewareMode: true },
    optimizeDeps: { noDiscovery: true } });
  ({ StrategyCoverageTable } = await vite.ssrLoadModule("/src/components/v2/strategy-coverage.tsx"));
});
after(async () => { await vite?.close(); });

test("Progress coverage stays unavailable until a cohort is completed", () => {
  const html = renderToStaticMarkup(React.createElement(StrategyCoverageTable, {}));
  assert.match(html, /unavailable until a compute completes/);
  assert.doesNotMatch(html, /<table/);
});

test("Progress shows actual strategy/source counts and held/carry provenance independently of Normal", () => {
  const coverage = { completedAt: Date.UTC(2026, 9, 27, 16), through: Date.UTC(2026, 9, 27, 13), total: 15,
    byKind: { normal: { engine: 2, signals: 1, heldOnly: 0, carried: 0 },
      axis: { engine: 7, signals: 3, heldOnly: 1, carried: 2 },
      exit: { engine: 0, signals: 2, heldOnly: 0, carried: 0 } } };
  const html = renderToStaticMarkup(React.createElement(StrategyCoverageTable, { coverage }));
  assert.match(html, /15 tapes/);
  assert.match(html, /simulation through 10-27 13:00 UTC/);
  assert.match(html, /<th scope="row">Axis<\/th><td>7<\/td><td>3<\/td><td>1<\/td><td>2<\/td>/);
  assert.match(html, /<th scope="row">Historic Exit<\/th><td>0<\/td><td>2<\/td>/);
  assert.match(html, /not an admitted, funded or venue order/);
  assert.match(html, /Block and Relate are execution adjustments/);
});
