import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolve } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

test('Base UI renders independent passed-only trailing statistics with neutral PF 1', async () => {
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom',
    resolve: { alias: { '@': resolve('src') } }, logLevel: 'silent' });
  try {
    const { PrehistoricPanel } = await server.ssrLoadModule('/src/components/v2/prehistoric.tsx');
    const status = { state: 'ready', baseEvaluated: 10, basePassed: 2,
      prehistoric: { symbols: {}, counts: {}, ready: 8, total: 8, loaded: 8, complete: true, hours: 12, simH: 12 },
      baseTrailingOnlyByRange: [{ tag: 'mn', range: 'Minimal', enabled: true, evaluated: 4, passed: 2,
        unavailable: 1, passedGp: 2, passedGl: 2, unknownPassed: 0, pfPassedPooled: 1 }] };
    const html = renderToStaticMarkup(React.createElement(PrehistoricPanel, { status, minPf: 1.08, maxDdtH: 35 }));
    assert.match(html, /Base Trailing-only cells/);
    assert.match(html, /50\.00%/);
    assert.match(html, />1\.00<\/td>/);
    assert.match(html, /not execution or exchange PF/);
    const tone = html.match(/class="v2-num ([^"]*)">1\.00<\/td>/)?.[1] ?? '';
    assert.ok(!tone.includes('v2-up'), 'PF 1 is neutral');
    status.baseTrailingOnlyByRange[0].unknownPassed = 1;
    const unknown = renderToStaticMarkup(React.createElement(PrehistoricPanel, { status, minPf: 1.08, maxDdtH: 35 }));
    assert.match(unknown, /Basis unavailable/);
  } finally { await server.close(); }
});
