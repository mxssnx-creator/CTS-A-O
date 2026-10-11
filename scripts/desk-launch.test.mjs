// Tests for docs/live-coordination/launch.sh: a desk runs from the project checkout and keeps its data on the server
// ($CTS_DESK_DATA), never under the checkout's runs/ folder. A fake node records its working directory, arguments and
// environment, so no desk is started and no exchange is called.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const LAUNCH = join(HERE, '..', 'docs', 'live-coordination', 'launch.sh');

// a temp project with a copy of launch.sh, a fake node on PATH and a data directory on the server (also temporary)
function fixture(t) {
  const base = mkdtempSync(join(tmpdir(), 'desk-launch-'));
  t.after(() => rmSync(base, { recursive: true, force: true }));
  const project = join(base, 'project');
  const launchDir = join(project, 'docs', 'live-coordination');
  mkdirSync(launchDir, { recursive: true });
  mkdirSync(join(project, 'scripts'), { recursive: true });
  copyFileSync(LAUNCH, join(launchDir, 'launch.sh'));
  const bin = join(base, 'bin');
  mkdirSync(bin, { recursive: true });
  const log = join(base, 'node-calls.log');
  writeFileSync(
    join(bin, 'node'),
    '#!/bin/sh\n{ echo "cwd=$(pwd -P)"; for a in "$@"; do echo "arg=$a"; done; echo "ban=$CTS_BINGX_BAN_FILE"; echo "tag=$CTS_CORE_LIVE_TAG"; } >>"$CTS_TEST_LOG"\nexit 0\n',
  );
  chmodSync(join(bin, 'node'), 0o755);
  const data = join(base, 'server-data', 'desks');
  return { base, project, launch: join(launchDir, 'launch.sh'), bin, log, data };
}

function launch(fx, desk) {
  return spawnSync('bash', [fx.launch, desk], {
    encoding: 'utf8',
    cwd: fx.base,
    env: {
      PATH: `${fx.bin}:${process.env.PATH}`,
      HOME: fx.base,
      CTS_DESK_DATA: fx.data,
      CTS_TEST_LOG: fx.log,
      BINGX_API_KEY: 'k',
      BINGX_API_SECRET: 's',
    },
    timeout: 60000,
  });
}

// the fake node runs in the background: wait for its whole record (its last line is the tag)
async function calls(fx) {
  for (let i = 0; i < 200; i++) {
    const text = existsSync(fx.log) ? readFileSync(fx.log, 'utf8') : '';
    if (/^tag=/m.test(text)) return text;
    await new Promise((r) => setTimeout(r, 50));
  }
  return existsSync(fx.log) ? readFileSync(fx.log, 'utf8') : '';
}

function seedDesk(fx, desk, files) {
  mkdirSync(join(fx.data, desk), { recursive: true });
  for (const f of files) writeFileSync(join(fx.data, desk, f), '{}\n');
}

test('the twin desk runs from the checkout, reads its settings and writes its output on the server', async (t) => {
  const fx = fixture(t);
  seedDesk(fx, 'x02', ['twin.json', 'patch.json']);
  const r = launch(fx, 'twin');
  assert.equal(r.status, 0, r.stderr);
  const out = await calls(fx);
  const cwd = out.match(/^cwd=(.*)$/m)?.[1];
  assert.equal(cwd, join(fx.project), 'the desk runs from the project directory');
  assert.ok(out.includes(`arg=${join(fx.data, 'x02', 'twin.json')}`), 'settings come from the server data directory');
  assert.ok(out.includes(`arg=${join(fx.data, 'x02', 'live-twin')}`), 'output goes to the server data directory');
  assert.equal(out.match(/^ban=(.*)$/m)?.[1], join(fx.data, 'x02', 'bingx-ban'), 'the ban file is on the server');
  assert.ok(!existsSync(join(fx.project, 'runs')), 'nothing is written under the checkout\'s runs/ folder');
});

test('a desk without its settings on the server is refused with the file it needs', (t) => {
  const fx = fixture(t);
  const r = launch(fx, 'x01');
  assert.notEqual(r.status, 0);
  assert.match(r.stdout + r.stderr, /missing .*x01\.json/);
});

test('the x01 desk keeps its ban and book files on the server, and starts only with its own settings', async (t) => {
  const fx = fixture(t);
  seedDesk(fx, 'x01', ['x01.json', 'patch.json']);
  const r = launch(fx, 'x01');
  assert.equal(r.status, 0, r.stderr);
  const out = await calls(fx);
  assert.ok(out.includes('arg=--mainnet') && out.includes('arg=yes'), 'the mainnet flag is passed');
  assert.equal(out.match(/^ban=(.*)$/m)?.[1], join(fx.data, 'x01', 'bingx-ban'));
  assert.equal(out.match(/^tag=(.*)$/m)?.[1], 'CTSV2X_');
});

test('the data directory is created on the server when it does not exist yet', (t) => {
  const fx = fixture(t);
  assert.ok(!existsSync(fx.data));
  launch(fx, 'twin');
  assert.ok(existsSync(join(fx.data, 'x01')) && existsSync(join(fx.data, 'x02')), 'both desk folders are created');
});
