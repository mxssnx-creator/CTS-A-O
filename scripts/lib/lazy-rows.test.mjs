import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { mappedRows } from './lazy-rows.mjs';
import { readSessionDump, writeSessionDump } from './session-dump.mjs';

test('chunked allocation projections are lazy, ordered, repeatable and lossless', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cts-lazy-rows-'));
  try {
    const rows = Array.from({ length: 100 }, (_, i) => ({ id: `order-${i}`, value: i / 7 }));
    let calls = 0;
    const project = (row, i) => { calls++; return { id: row.id, index: i, value: row.value }; };
    const projected = mappedRows(rows, project);
    assert.equal(projected.length, rows.length);
    assert.equal(calls, 0, 'constructing the report does not allocate projected rows');
    const file = join(dir, 'data.json');
    await writeSessionDump(file, { v: 2, sizedOrders: projected }, { arrayFields: ['sizedOrders'], maxChunkBytes: 512 });
    assert.equal(calls, rows.length);
    const restored = await readSessionDump(file);
    assert.deepEqual(restored.sizedOrders, rows.map((row, i) => ({ id: row.id, index: i, value: row.value })));
    assert.deepEqual([...projected], restored.sizedOrders, 'the same evidence can be streamed again');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
