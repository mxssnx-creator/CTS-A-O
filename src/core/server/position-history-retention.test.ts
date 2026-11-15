import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { test } from 'node:test';
import { positionTapeValid } from '../position-windows.ts';

test('replacement and malformed columns still invalidate cached chronology', () => {
  const tape = { n: 2, syms: ['A'], exitT: [2, 4], entryT: [1, 3],
    symI: [0, 0], side: [1, -1], r: [.01, -.01] };
  assert.equal(positionTapeValid(tape), true);
  tape.exitT = [4, 2];
  assert.equal(positionTapeValid(tape), false);
  tape.exitT = [2, 4];
  assert.equal(positionTapeValid(tape), true);
  const bad = {...tape, side: null} as unknown as Parameters<typeof positionTapeValid>[0];
  assert.equal(positionTapeValid(bad), false);
  assert.equal(positionTapeValid(bad), false);
});

test('position validation does not pin evicted immutable history buffers', () => {
  const source = `
    import assert from 'node:assert/strict';
    import {setImmediate} from 'node:timers/promises';
    import {TapeHistoryStore} from ${JSON.stringify(new URL('./history-store.server.ts', import.meta.url).href)};
    import {makeTape} from ${JSON.stringify(new URL('../sim/walkforward.ts', import.meta.url).href)};
    import {positionTapeValid} from ${JSON.stringify(new URL('../position-windows.ts', import.meta.url).href)};
    const store = new TapeHistoryStore({cacheBytes: 1});
    const make = () => {
      const rows=Array.from({length:256},(_,i)=>({cfg:'own',sym:'A',side:1,entryT:i*60000,
        exitT:i*60000+1,entry:100,exit:101,r:.01,mult:1,reason:'tp',bars:1,mfe:0,mae:0,kind:'normal'}));
      return store.append(makeTape('own','follow','ema-9-21@m1',{tp:.01,sl:.01,trail:0,hold:1},'normal',['A'],rows,[],[]));
    };
    try {
      const tape=make();
      assert.equal(positionTapeValid(tape),true);
      const buffer=new WeakRef(tape.exitT.buffer);
      store.clearCache();
      for(let i=0;i<8;i++){await setImmediate();globalThis.gc();}
      assert.equal(buffer.deref()===undefined,true,'validation metadata must not retain the evicted history arena');
      assert.equal(positionTapeValid(tape),true,'reloaded history remains valid');
      assert.ok(store.stats.reads>=2,'released columns are reloaded and revalidated');
    } finally {store.close();}
  `;
  assert.doesNotThrow(() => execFileSync(process.execPath,
    ['--expose-gc','--experimental-strip-types','--no-warnings','--input-type=module','-e',source],
    {timeout:30_000,stdio:'pipe',env:process.env}));
});
