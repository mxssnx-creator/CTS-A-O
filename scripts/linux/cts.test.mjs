// Tests for scripts/linux/cts.sh. Each test runs the installer with --root (a temp prefix for every absolute path it
// writes) and --dir (a fake project), with a fake npm, vite and curl first on PATH. No root, no systemd, no network:
// nothing outside the temp directory is written.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  appendFileSync,
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const CTS = join(HERE, 'cts.sh');
const NAME = 'cts-a-o';
const PORT = '18181'; // a port nothing on a development machine listens on
const PURGE_MSG = 'data is kept; use install --clean to remove it';

function writeText(path, text) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
}

function writeExecutable(path, text) {
  writeText(path, text);
  chmodSync(path, 0o755);
}

// a temp root, a fake project and fake npm / vite / curl; every fake records its calls in one log
function makeFixture(t) {
  const base = mkdtempSync(join(tmpdir(), 'cts-a-o-test-'));
  t.after(() => rmSync(base, { recursive: true, force: true }));
  const fx = {
    base,
    root: join(base, 'root'),
    project: join(base, 'project'),
    bin: join(base, 'bin'),
    calls: join(base, 'calls.log'),
  };
  mkdirSync(fx.root, { recursive: true });
  writeText(join(fx.project, 'package.json'), '{"name":"fake-cts","private":true}\n');
  writeText(join(fx.project, 'package-lock.json'), '{"lockfileVersion":3}\n');
  writeText(join(fx.project, 'src/app.ts'), 'export const app = 1;\n');
  writeText(join(fx.project, 'src/core/server/tapes.worker.ts'), 'export {};\n');
  writeText(join(fx.project, 'README.md'), '# fake project\n');
  writeExecutable(
    join(fx.bin, 'npm'),
    [
      '#!/bin/sh',
      'if [ "$1" = "-v" ]; then echo 10.0.0; exit 0; fi',
      'echo "npm $*" >>"$CTS_TEST_CALLS"',
      'if [ "$1" = ci ]; then mkdir -p node_modules && : >node_modules/.fake-npm; fi',
      'exit 0',
      '',
    ].join('\n'),
  );
  writeExecutable(
    join(fx.bin, 'vite'),
    [
      '#!/bin/sh',
      'echo "vite $* preset=$NITRO_PRESET" >>"$CTS_TEST_CALLS"',
      'rm -rf .output && mkdir -p .output/server',
      "printf '%s\\n' 'console.log(\"fake server\");' >.output/server/index.mjs",
      '',
    ].join('\n'),
  );
  writeExecutable(join(fx.bin, 'curl'), '#!/bin/sh\necho "curl $*" >>"$CTS_TEST_CALLS"\nexit 0\n');
  return fx;
}

// run cts.sh <args> with the fixture's --root, --dir and --port
function cts(fx, args, { ok = true } = {}) {
  const r = spawnSync('bash', [CTS, ...args, '--root', fx.root, '--dir', fx.project, '--port', PORT], {
    encoding: 'utf8',
    env: {
      PATH: `${fx.bin}:${process.env.PATH}`,
      HOME: fx.base,
      LANG: 'C.UTF-8',
      CTS_TEST_CALLS: fx.calls,
      CTS_TEST_ROOT: '1',
    },
    timeout: 120000,
  });
  if (ok) assert.equal(r.status, 0, `cts.sh ${args.join(' ')} failed (rc ${r.status})\n${r.stdout}\n${r.stderr}`);
  return r;
}

function paths(fx) {
  return {
    unit: join(fx.root, 'etc/systemd/system', `${NAME}.service`),
    launcher: join(fx.root, 'usr/local/lib', NAME, 'launch.sh'),
    data: join(fx.root, 'var/lib', NAME),
    env: join(fx.root, 'var/lib', NAME, 'env'),
    conf: join(fx.root, 'etc/cts', `${NAME}.conf`),
    registry: join(fx.root, 'etc/cts-instances'),
    buildLogs: join(fx.root, 'var/log', `${NAME}-build`),
    output: join(fx.project, '.output', 'server', 'index.mjs'),
  };
}

// every entry under dir (mode and sha256 of files, mode of directories), keyed by relative path; top-level names in
// skip are left out
function snapshot(dir, skip) {
  const out = [];
  const walk = (d, rel) => {
    for (const name of readdirSync(d).sort()) {
      if (!rel && skip.includes(name)) continue;
      const p = join(d, name);
      const r = rel ? `${rel}/${name}` : name;
      const st = lstatSync(p);
      const mode = (st.mode & 0o7777).toString(8);
      if (st.isDirectory()) {
        out.push(`${r}/ ${mode}`);
        walk(p, r);
      } else {
        const sha = createHash('sha256').update(readFileSync(p)).digest('hex');
        out.push(`${r} ${mode} ${sha}`);
      }
    }
  };
  walk(dir, '');
  return out;
}

function callCount(fx, prefix) {
  if (!existsSync(fx.calls)) return 0;
  return readFileSync(fx.calls, 'utf8')
    .split('\n')
    .filter((l) => l.startsWith(prefix)).length;
}

test('bash -n accepts cts.sh', () => {
  const r = spawnSync('bash', ['-n', CTS], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
});

test('shellcheck is clean when it is installed', (t) => {
  const probe = spawnSync('shellcheck', ['--version'], { encoding: 'utf8' });
  if (probe.error) return t.skip('shellcheck is not installed');
  const r = spawnSync('shellcheck', [CTS], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test('install builds in the project; the unit, launcher and data directory point there', (t) => {
  const fx = makeFixture(t);
  const p = paths(fx);
  cts(fx, ['install']);

  assert.ok(existsSync(p.output), 'the build output is in the project (.output/server/index.mjs)');
  assert.ok(existsSync(p.unit), 'the unit is rendered into /etc/systemd/system');
  assert.ok(existsSync(p.launcher), 'the launcher is written');
  assert.ok(existsSync(p.env), 'the environment file is in the data directory');
  assert.ok(existsSync(p.conf), 'the saved options are in /etc/cts');

  const unit = readFileSync(p.unit, 'utf8');
  const execStart = unit.split('\n').find((l) => l.startsWith('ExecStart='));
  assert.ok(execStart, 'the unit has an ExecStart');
  assert.ok(execStart.includes(`${fx.project}/.output/server/index.mjs`), `ExecStart is the project build: ${execStart}`);
  assert.ok(unit.includes(`WorkingDirectory=${p.data}`), 'the unit works in the data directory');
  assert.ok(!unit.includes('/opt/'), 'nothing is installed under /opt');
  assert.ok(readFileSync(p.launcher, 'utf8').includes(`${fx.project}/.output/server/index.mjs`), 'the launcher runs the project build');
  assert.match(readFileSync(join(fx.project, '.output', 'server', 'index.mjs'), 'utf8'), /fake server/);
  assert.equal(callCount(fx, 'vite build preset=node-server'), 1, 'vite build ran once, with NITRO_PRESET=node-server');
});

test('the project tree is unchanged by install, remove and reinstall (sources, modes and hashes)', (t) => {
  const fx = makeFixture(t);
  const p = paths(fx);
  const before = snapshot(fx.project, ['node_modules', '.output']);

  cts(fx, ['install']);
  assert.ok(existsSync(p.output));
  assert.deepStrictEqual(snapshot(fx.project, ['node_modules', '.output']), before, 'after install');

  cts(fx, ['remove']);
  assert.ok(!existsSync(join(fx.project, '.output')), 'remove deletes the build output');
  assert.deepStrictEqual(snapshot(fx.project, ['node_modules', '.output']), before, 'after remove');

  cts(fx, ['reinstall']);
  assert.ok(existsSync(p.output), 'reinstall builds again');
  assert.deepStrictEqual(snapshot(fx.project, ['node_modules', '.output']), before, 'after reinstall');
});

test('remove keeps the data directory, the saved options and the build logs', (t) => {
  const fx = makeFixture(t);
  const p = paths(fx);
  cts(fx, ['install']);
  writeText(join(p.data, 'state.json'), '{"kept":true}\n');
  writeText(join(p.data, 'core.sqlite'), 'database');

  cts(fx, ['remove']);

  assert.equal(readFileSync(join(p.data, 'state.json'), 'utf8'), '{"kept":true}\n', 'state.json is kept');
  assert.equal(readFileSync(join(p.data, 'core.sqlite'), 'utf8'), 'database', 'core.sqlite is kept');
  assert.ok(existsSync(p.env), 'the environment file is kept');
  assert.ok(existsSync(p.conf), '/etc/cts conf is kept');
  assert.ok(existsSync(join(p.buildLogs, 'build.log')), 'build logs are kept');
  assert.ok(!existsSync(p.unit), 'the unit is removed');
  assert.ok(!existsSync(p.launcher), 'the launcher is removed');
  assert.ok(!existsSync(join(fx.project, '.output')), 'the build output is removed');
  const registry = existsSync(p.registry) ? readFileSync(p.registry, 'utf8') : '';
  assert.ok(!new RegExp(`^${NAME} `, 'm').test(registry), 'the registry line is removed');
});

test('a second install keeps data written in between and does not rebuild the dependencies', (t) => {
  const fx = makeFixture(t);
  const p = paths(fx);
  cts(fx, ['install']);
  writeText(join(p.data, 'state.json'), 'state written by the server');
  appendFileSync(p.env, 'CTS_TEST_MARK=kept\n');

  cts(fx, ['install']);

  assert.equal(readFileSync(join(p.data, 'state.json'), 'utf8'), 'state written by the server', 'state.json survives');
  assert.match(readFileSync(p.env, 'utf8'), /^CTS_TEST_MARK=kept$/m, 'environment values survive');
  assert.equal(callCount(fx, 'npm ci'), 1, 'npm ci ran once: the lockfile is unchanged');
});

test('update runs npm ci only when package-lock.json changed', (t) => {
  const fx = makeFixture(t);
  cts(fx, ['install']);
  cts(fx, ['update']);
  assert.equal(callCount(fx, 'npm ci'), 1, 'unchanged lockfile: no second npm ci');

  writeText(join(fx.project, 'package-lock.json'), '{"lockfileVersion":3,"changed":true}\n');
  cts(fx, ['update']);
  assert.equal(callCount(fx, 'npm ci'), 2, 'changed lockfile: npm ci runs again');
});

test('install --clean removes the data directory, the saved options and the build logs, and says so', (t) => {
  const fx = makeFixture(t);
  const p = paths(fx);
  cts(fx, ['install']);
  writeText(join(p.data, 'state.json'), 'old state');
  appendFileSync(p.env, 'CTS_TEST_MARK=old\n');

  const r = cts(fx, ['install', '--clean']);
  const out = r.stdout + r.stderr;

  assert.ok(out.includes(p.data), `the data directory is printed: ${p.data}`);
  assert.ok(out.includes(p.conf), `the saved options are printed: ${p.conf}`);
  assert.ok(out.includes(p.buildLogs), `the build logs are printed: ${p.buildLogs}`);
  assert.ok(!existsSync(join(p.data, 'state.json')), 'the old state is gone');
  assert.doesNotMatch(readFileSync(p.env, 'utf8'), /CTS_TEST_MARK=old/, 'the old environment is gone');
  assert.ok(existsSync(p.output), 'then installed fresh');
  assert.ok(existsSync(p.unit), 'then the unit is written');
});

test('--purge is refused with the message; nothing is removed', (t) => {
  const fx = makeFixture(t);
  const p = paths(fx);
  cts(fx, ['install']);
  writeText(join(p.data, 'state.json'), 'kept');

  const r = cts(fx, ['remove', '--purge'], { ok: false });

  assert.notEqual(r.status, 0, '--purge exits non-zero');
  assert.ok(r.stderr.includes(PURGE_MSG), `message: ${r.stderr}`);
  assert.ok(existsSync(p.unit), 'the unit is still there');
  assert.ok(existsSync(p.conf), 'the saved options are still there');
  assert.equal(readFileSync(join(p.data, 'state.json'), 'utf8'), 'kept', 'the data is still there');
});

test('reinstall keeps the data and the saved options', (t) => {
  const fx = makeFixture(t);
  const p = paths(fx);
  cts(fx, ['install']);
  writeText(join(p.data, 'state.json'), 'kept across reinstall');
  appendFileSync(p.env, 'CTS_TEST_MARK=kept\n');

  cts(fx, ['reinstall']);

  assert.equal(readFileSync(join(p.data, 'state.json'), 'utf8'), 'kept across reinstall');
  assert.match(readFileSync(p.env, 'utf8'), /^CTS_TEST_MARK=kept$/m);
  assert.ok(existsSync(p.conf));
  assert.ok(existsSync(p.output), 'the program is built again');
  assert.ok(existsSync(p.unit), 'the unit is written again');
});

test('--clean is accepted by install only', (t) => {
  const fx = makeFixture(t);
  const r = cts(fx, ['remove', '--clean'], { ok: false });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /--clean applies to install only/);
});

test('a data directory that holds the project is refused, and nothing is deleted', (t) => {
  const fx = makeFixture(t);
  const holder = dirname(fx.project); // the parent of the project: --clean would delete the project with it
  const r = cts(fx, ['install', '--clean', '--data', holder], { ok: false });
  assert.notEqual(r.status, 0, 'install --clean with a data directory above the project exits non-zero');
  assert.match(r.stderr, /holds the project/);
  assert.ok(existsSync(join(fx.project, 'package.json')), 'the project is still there');
  assert.ok(existsSync(join(fx.project, 'src/app.ts')), 'the project sources are still there');
});

test('install refuses a project directory without package.json', (t) => {
  const fx = makeFixture(t);
  rmSync(join(fx.project, 'package.json'));
  const r = cts(fx, ['install'], { ok: false });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /package\.json/);
  assert.ok(!existsSync(paths(fx).unit), 'nothing is installed');
});

test('--data must be an absolute path: a relative one is refused and nothing is deleted (review 1)', (t) => {
  const fx = makeFixture(t);
  // from the project's own cwd: "../project" resolves to the project, and --clean would delete it
  const r = spawnSync('bash', [CTS, 'install', '--clean', '--data', '../project', '--root', fx.root, '--dir', fx.project, '--port', PORT], {
    cwd: fx.project,
    encoding: 'utf8',
    env: { PATH: `${fx.bin}:${process.env.PATH}`, HOME: fx.base, LANG: 'C.UTF-8', CTS_TEST_CALLS: fx.calls, CTS_TEST_ROOT: '1' },
    timeout: 120000,
  });
  assert.notEqual(r.status, 0, `a relative --data exits non-zero\n${r.stdout}\n${r.stderr}`);
  assert.match(r.stderr, /absolute/);
  assert.ok(existsSync(join(fx.project, 'package.json')), 'the project is still there');
  assert.ok(existsSync(join(fx.project, 'src/app.ts')), 'the project sources are still there');
});

test('--data must be a dedicated instance directory: a shared parent such as /var/lib is refused (review 2)', (t) => {
  const fx = makeFixture(t);
  const shared = join(fx.root, 'var/lib');
  mkdirSync(shared, { recursive: true });
  writeText(join(shared, 'other-service.db'), 'keep me\n');
  const r = cts(fx, ['install', '--clean', '--data', shared], { ok: false });
  assert.notEqual(r.status, 0, 'a shared data directory is refused');
  assert.match(r.stderr, /dedicated|instance/);
  assert.ok(existsSync(join(shared, 'other-service.db')), 'the shared directory is untouched');
});

test('a plain install keeps a legacy install.conf when the saved options already exist (review 3)', (t) => {
  const fx = makeFixture(t);
  cts(fx, ['install']);
  const p = paths(fx);
  writeText(join(p.data, 'install.conf'), 'HOST=10.9.9.9\n');
  cts(fx, ['install']);
  assert.ok(existsSync(join(p.data, 'install.conf')), 'the legacy file is not deleted when it was not migrated');
  assert.match(readFileSync(p.conf, 'utf8'), /^HOST=0\.0\.0\.0$/m, 'the saved HOST is unchanged');
});

test('a project path that would break the unit (spaces, quotes or %) is refused before anything is written (review 8)', (t) => {
  const fx = makeFixture(t);
  const spaced = join(fx.base, 'my project');
  // move the fixture project to a path with a space
  spawnSync('mv', [fx.project, spaced]);
  const r = spawnSync('bash', [CTS, 'install', '--root', fx.root, '--dir', spaced, '--port', PORT], {
    encoding: 'utf8',
    env: { PATH: `${fx.bin}:${process.env.PATH}`, HOME: fx.base, LANG: 'C.UTF-8', CTS_TEST_CALLS: fx.calls, CTS_TEST_ROOT: '1' },
    timeout: 120000,
  });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /spaces|quote|%/);
  assert.ok(!existsSync(paths(fx).unit), 'no unit is written');
});

test('a test root never installs host packages or runs the Node.js installer (review 4)', (t) => {
  const fx = makeFixture(t);
  // a node that reports v16: the Node.js step runs, and under --root it must only warn
  writeExecutable(join(fx.bin, 'node'), '#!/bin/sh\nif [ "$1" = -v ]; then echo v16.0.0; exit 0; fi\nexec ' + JSON.stringify(process.execPath) + ' "$@"\n');
  cts(fx, ['install'], { ok: false });
  const calls = existsSync(fx.calls) ? readFileSync(fx.calls, 'utf8') : '';
  assert.doesNotMatch(calls, /nodesource/, 'no NodeSource installer is fetched under --root');
});

test('--root is refused unless CTS_TEST_ROOT=1 (a real install cannot be pointed at a test root by accident)', (t) => {
  const fx = makeFixture(t);
  const r = spawnSync('bash', [CTS, 'install', '--root', fx.root, '--dir', fx.project, '--port', PORT], {
    encoding: 'utf8',
    env: { PATH: `${fx.bin}:${process.env.PATH}`, HOME: fx.base, LANG: 'C.UTF-8' },
    timeout: 120000,
  });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /tests only/);
  assert.ok(!existsSync(paths(fx).unit), 'nothing is written');
});
