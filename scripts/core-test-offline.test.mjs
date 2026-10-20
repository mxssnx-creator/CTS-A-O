import { test } from "node:test";
import assert from "node:assert/strict";
import { copyFileSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const GUARD = fileURLToPath(new URL("./lib/core-test-offline-guard.cjs", import.meta.url));
const MARKER = "Symbol.for('cts.core.offline.guard')";
function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), "cts-offline-test-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}
function run(file, { guard = GUARD, args = [], env = {}, preload = true } = {}) {
  const childEnv = { ...process.env, ...env };
  // These are independent fixture processes, not children in the enclosing runner's private test IPC protocol.
  delete childEnv.NODE_TEST_CONTEXT;
  delete childEnv.NODE_OPTIONS;
  const result = spawnSync(process.execPath, [
    ...(preload ? ["--require", guard] : []), ...args, file,
  ], { encoding: "utf8", timeout: 20_000, env: childEnv });
  assert.equal(result.status, 0, result.stderr || result.stdout || String(result.error));
  return result.stdout;
}
function program(dir, text, name = "fixture.cjs") {
  const file = join(dir, name);
  writeFileSync(file, `const assert = require('node:assert/strict');\n(async () => {\n${text}\n})().catch(e => { console.error(e); process.exitCode = 1; });\n`);
  return file;
}
const workerTools = `
const { Worker } = require('node:worker_threads');
const message = (worker) => new Promise((resolve, reject) => {
  const timeout = setTimeout(() => reject(Error('worker did not answer')), 6000);
  worker.once('message', async value => { clearTimeout(timeout); await worker.terminate(); resolve(value); });
  worker.once('error', error => { clearTimeout(timeout); reject(error); });
});
const script = "require('node:worker_threads').parentPort.postMessage({ guarded: !!globalThis[Symbol.for('cts.core.offline.guard')], live: process.env.CTS_CORE_LIVE, clean: !Object.keys(process.env).some(k => /^(BINGX|BINANCE|BYBIT|OKX)/i.test(k)), nodeOptionsAbsent: !process.env.NODE_OPTIONS, argv: process.execArgv })";
`;

test("preload is portable, idempotent, clears exchange/proxy credentials and disables live", (t) => {
  const dir = fixture(t);
  const copiedDir = join(dir, "portable guard with spaces");
  mkdirSync(copiedDir);
  const copied = join(copiedDir, "offline.cjs");
  copyFileSync(GUARD, copied);
  const file = program(dir, `
    const marker = globalThis[${MARKER}];
    assert.equal(marker.nonlocalTransportDenied, true);
    assert.equal(marker.protection, 'node-test-surface-only');
    const net = require('node:net'); const before = net.connect;
    delete require.cache[require.resolve(${JSON.stringify(copied)})];
    require(${JSON.stringify(copied)});
    assert.equal(net.connect, before, 'second preload does not wrap again');
    for (const key of ['BINGX_API_KEY', 'binance_secret', 'BYBIT_TOKEN', 'OKX_PASSPHRASE', 'HTTP_PROXY', 'https_proxy', 'ALL_PROXY', 'NODE_USE_ENV_PROXY']) assert.equal(process.env[key], undefined, key + ' cleared');
    assert.equal(process.env.CTS_CORE_LIVE, '0');
    ${workerTools}
    assert.equal((await message(new Worker(script, { eval: true, env: {} }))).guarded, true);
  `);
  run(file, { guard: copied, env: {
    BINGX_API_KEY: "fixture-only", binance_secret: "fixture-only", BYBIT_TOKEN: "fixture-only", OKX_PASSPHRASE: "fixture-only",
    HTTP_PROXY: "http://proxy.invalid", https_proxy: "http://proxy.invalid", ALL_PROXY: "http://proxy.invalid", NODE_USE_ENV_PROXY: "0", CTS_CORE_LIVE: "1",
  } });
  assert.doesNotMatch(readFileSync(GUARD, "utf8"), /\/workspace\/|\/tmp\//, "no machine-specific preload path");
});

test("denies every nonlocal/custom transport overload before any native transport or dispatcher call", (t) => {
  const dir = fixture(t);
  const file = program(dir, `
    const net = require('node:net'), tls = require('node:tls'), http = require('node:http'), https = require('node:https'), dgram = require('node:dgram');
    let calls = 0;
    const reached = () => { calls++; return {}; };
    net.connect = net.createConnection = net.Socket.prototype.connect = tls.connect = reached;
    for (const module of [http, https]) module.request = module.get = reached;
    dgram.Socket.prototype.send = dgram.Socket.prototype.connect = reached;
    globalThis.fetch = async () => { calls++; return { mocked: true }; };
    globalThis.WebSocket = class FixtureWebSocket { constructor() { calls++; } };
    const preGuardRequest = new Request('http://127.0.0.1', { dispatcher: { dispatch: reached } });
    require(${JSON.stringify(GUARD)});
    const denied = f => assert.throws(f, { code: 'CTS_OFFLINE_NETWORK_DENIED' });
    const external = 'nonlocal.invalid';
    for (const f of [net.connect, net.createConnection, (...args) => new net.Socket().connect(...args)]) {
      denied(() => f(1234, external));
      denied(() => f({ port: 1234, host: external }));
      denied(() => f({ port: 1234, host: '127.0.0.1', hostname: external }));
      denied(() => f('/fixture-unix.sock'));
      denied(() => f({ path: '/fixture-unix.sock' }));
      denied(() => f({ port: 1234, host: '127.0.0.1', lookup: reached }));
      denied(() => f(net._normalizeArgs([1234, external])));
      for (const options of [{ port: 1234, host: external }, { path: '/fixture-unix.sock' }, { port: 1234, lookup: reached }])
        denied(() => f(Object.assign([], options)));
      denied(() => f({ port: 1234, fd: 0 }));
    }
    denied(() => tls.connect(443, '127.0.0.1', { host: external }));
    denied(() => tls.connect(443, { host: external }));
    denied(() => tls.connect({ host: '127.0.0.1', port: 443 }, { host: external }));
    denied(() => tls.connect({ host: '127.0.0.1', port: 443, socket: {} }));
    denied(() => tls.connect(443, '127.0.0.1', Object.assign([], { host: external })));
    for (const module of [http, https]) for (const f of [module.request, module.get]) {
      denied(() => f('http://' + external, { host: '127.0.0.1' }));
      denied(() => f('http://127.0.0.1', { host: external }));
      denied(() => f({ host: '127.0.0.1', hostname: external }));
      denied(() => f({ host: '127.0.0.1', path: 'hTtPs://' + external }));
      denied(() => f({ host: '127.0.0.1', path: '//' + external }));
      denied(() => f({ host: '127.0.0.1', method: 'CONNECT', path: external + ':443' }));
      for (const key of ['lookup', 'createConnection', 'socket', 'socketPath', 'agent', '_defaultAgent', 'proxyEnv']) {
        const value = key === 'socketPath' ? '/fixture-unix.sock' : key === 'proxyEnv' ? { HTTP_PROXY: 'http://' + external } : reached;
        denied(() => f('http://127.0.0.1', { [key]: value }));
        denied(() => f(Object.assign(new URL('http://127.0.0.1'), { [key]: value })));
      }
    }
    const udp = dgram.createSocket('udp4');
    try { denied(() => udp.send('fixture', 1, external)); denied(() => udp.connect(1, external)); } finally { udp.close(); }
    await assert.rejects(fetch('https://' + external), { code: 'CTS_OFFLINE_NETWORK_DENIED' });
    await assert.rejects(fetch('http://127.0.0.1', { dispatcher: { dispatch: reached } }), { code: 'CTS_OFFLINE_NETWORK_DENIED' });
    await assert.rejects(fetch(preGuardRequest), { code: 'CTS_OFFLINE_NETWORK_DENIED' });
    denied(() => new Request('http://127.0.0.1', { dispatcher: { dispatch: reached } }));
    denied(() => new WebSocket('wss://' + external));
    denied(() => new WebSocket('ws://127.0.0.1', { dispatcher: reached }));
    const agent = http.globalAgent;
    http.globalAgent = { addRequest: reached };
    denied(() => http.get('http://127.0.0.1'));
    http.globalAgent = agent;
    agent.options.proxyEnv = { HTTP_PROXY: 'http://' + external };
    denied(() => http.get('http://127.0.0.1'));
    agent.options.proxyEnv = {};
    if (http.setGlobalProxyFromEnv) denied(() => http.setGlobalProxyFromEnv());
    const error = (() => { try { http.get('https://fixture-user:fixture-secret@' + external); } catch (e) { return e; } })();
    assert.doesNotMatch(error.message, /fixture-user|fixture-secret|nonlocal\\.invalid/);
    assert.equal(calls, 0, 'all attempted transports stopped before native/stub call');
    for (const [name, cjs] of [['net', net], ['tls', tls], ['http', http], ['https', https]]) {
      const esm = await import('node:' + name);
      assert.equal(esm[name === 'net' ? 'connect' : name === 'tls' ? 'connect' : 'request'], cjs[name === 'net' ? 'connect' : name === 'tls' ? 'connect' : 'request']);
    }
  `);
  run(file, { preload: false });
});

test("allows literal loopback overloads, normalizes localhost and keeps in-memory fetch mocks replaceable", (t) => {
  const dir = fixture(t);
  const file = program(dir, `
    const net = require('node:net'), tls = require('node:tls'), http = require('node:http');
    const calls = [];
    net.connect = net.createConnection = net.Socket.prototype.connect = tls.connect = (...args) => { calls.push(args); return {}; };
    http.request = http.get = (...args) => { calls.push(args); return {}; };
    globalThis.fetch = async () => ({ mocked: true });
    globalThis.WebSocket = class FixtureWebSocket {};
    require(${JSON.stringify(GUARD)});
    net.connect(1234, 'LOCALHOST');
    net.createConnection({ port: 1234 });
    new net.Socket().connect(net._normalizeArgs([1234, 'localhost']));
    tls.connect(1234, 'localhost');
    assert.equal(calls[0][1], '127.0.0.1');
    assert.equal(calls[1][0].host, '127.0.0.1');
    assert.equal(calls[2][0][0].host, '127.0.0.1');
    assert.equal(calls[3][1], '127.0.0.1');
    for (const host of ['127.0.0.1', '127.3.2.1', '::1', '::ffff:127.0.0.1']) net.connect({ port: 1234, host });
    http.get('http://localhost'); http.request(new URL('http://[::1]'));
    const request = new Request('http://127.0.0.1');
    assert.equal((await fetch(request)).mocked, true);
    assert.equal((await fetch(request.clone())).mocked, true);
    assert.equal((await fetch(request.clone().clone())).mocked, true);
    new WebSocket('ws://127.0.0.1');
    globalThis.fetch = async () => ({ fixtureOnly: true });
    assert.equal((await fetch('https://nonlocal.invalid')).fixtureOnly, true, 'replacement is an in-memory fixture, not transport');
  `);
  run(file, { preload: false });
});

test("real loopback HTTP, Request clones, fetch and TCP sockets work under the preload", (t) => {
  const dir = fixture(t);
  const file = program(dir, `
    const http = require('node:http'), net = require('node:net');
    const server = http.createServer((req, res) => res.end('fixture-ok'));
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port, url = 'http://localhost:' + port;
    try {
      assert.equal(await (await fetch(url)).text(), 'fixture-ok');
      assert.equal(await (await fetch(new Request(url).clone())).text(), 'fixture-ok');
      assert.equal(await (await fetch(new Request(url).clone().clone())).text(), 'fixture-ok');
      const body = await new Promise((resolve, reject) => http.get(url, res => { let s=''; res.on('data', d => s += d); res.on('end', () => resolve(s)); }).on('error', reject));
      assert.equal(body, 'fixture-ok');
      for (const create of [() => net.connect(port, 'LOCALHOST'), () => net.connect({port}), () => new net.Socket().connect(port, 'localhost')]) {
        const socket = create();
        await new Promise((resolve,reject) => { socket.once('connect', resolve); socket.once('error', reject); });
        socket.destroy();
      }
    } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
  `);
  run(file, { args: process.allowedNodeEnvironmentFlags.has("--use-env-proxy") ? ["--use-env-proxy"] : [], env: {
    HTTP_PROXY: "http://nonlocal.invalid:9", HTTPS_PROXY: "http://nonlocal.invalid:9", NODE_USE_ENV_PROXY: "1",
  } });
});

test("default 32MB watchdog worker ignores expanded Node --test/V8 flags and guards nested workers", (t) => {
  const dir = fixture(t);
  const file = program(dir, `
    const { test } = require('node:test');
    ${workerTools}
    test('guarded default worker under the actual Node test runner', async () => {
      process.execArgv.push('--v8-pool-size=4', '--stack-trace-limit=10', '--expose-gc', '--max-old-space-size=1024');
      const reply = await message(new Worker(script, { eval: true, env: {}, resourceLimits: {maxOldGenerationSizeMb:32,maxYoungGenerationSizeMb:8} }));
      assert.equal(reply.guarded, true); assert.equal(reply.live, '0');
      assert.equal(reply.clean, true);
      assert.ok(reply.argv.includes('--enable-source-maps'));
      assert.ok(!reply.argv.some(x => /^(--v8-pool-size|--stack-trace-limit|--expose-gc|--max-old-space-size|--test)/.test(x)));
      const nested = "const {Worker,parentPort}=require('node:worker_threads'); const w=new Worker(" + JSON.stringify(script) + ", {eval:true,env:{}}); w.once('message', x=>{parentPort.postMessage(x);w.terminate()});";
      assert.equal((await message(new Worker(nested, {eval:true,env:{}}))).guarded, true);
    });
  `, "worker.test.cjs");
  const output = run(file, { args: ["--test", "--test-concurrency=1", "--expose-gc", "--max-old-space-size=128", "--enable-source-maps"] });
  assert.match(output, /pass 1/);
});

test("explicit worker args survive, real preloads run after the guard and TypeScript workers with empty env stay guarded", (t) => {
  const dir = fixture(t);
  const observe = join(dir, "observe-preload.cjs");
  writeFileSync(observe, `if (!globalThis[${MARKER}]) throw Error('caller preload ran before offline guard'); globalThis.sawOfflineGuardFirst = true;`);
  const ts = join(dir, "fixture-worker.ts");
  writeFileSync(ts, `import {parentPort} from 'node:worker_threads'; const typed: boolean = true; parentPort!.postMessage({typed,guarded:!!(globalThis as any)[Symbol.for('cts.core.offline.guard')],live:process.env.CTS_CORE_LIVE,clean:!process.env.BINGX_API_KEY});`);
  const file = program(dir, `
    ${workerTools}
    for (const execArgv of [[], ['--conditions', ${JSON.stringify(GUARD)}], ['--require', ${JSON.stringify(observe)}]]) {
      const reply = await message(new Worker(script, {eval:true,execArgv,env:{BINGX_API_KEY:'fixture-only',CTS_CORE_LIVE:'1'}}));
      assert.equal(reply.guarded,true); assert.equal(reply.live,'0'); assert.equal(reply.clean,true);
      for (const arg of execArgv) assert.ok(reply.argv.includes(arg), 'explicit arg retained');
    }
    assert.throws(() => new Worker('', {eval:true,execArgv:['--expose-gc']}), {code:'ERR_WORKER_INVALID_EXEC_ARGV'}, 'invalid explicit flags are not silently dropped');
    const envReply = await message(new Worker(script, {eval:true,execArgv:[],env:{NODE_OPTIONS:'--require ' + ${JSON.stringify(observe)}}}));
    assert.equal(envReply.guarded,true); assert.equal(envReply.nodeOptionsAbsent,true);
    const beforeOptions = process.env.NODE_OPTIONS;
    process.env.NODE_OPTIONS = '--require ' + ${JSON.stringify(observe)};
    assert.throws(() => new Worker(script, {eval:true,env:require('node:worker_threads').SHARE_ENV}), {code:'CTS_OFFLINE_NETWORK_DENIED'});
    assert.equal(process.env.NODE_OPTIONS, '--require ' + ${JSON.stringify(observe)}, 'parent environment was not rewritten');
    if (beforeOptions === undefined) delete process.env.NODE_OPTIONS; else process.env.NODE_OPTIONS = beforeOptions;
    const reply = await message(new Worker(${JSON.stringify(ts)}, {execArgv:['--experimental-strip-types','--no-warnings'],env:{}}));
    assert.deepEqual(reply,{typed:true,guarded:true,live:'0',clean:true});
    const esm = await import('node:worker_threads');
    assert.equal(esm.Worker, Worker, 'ESM named builtin export sees the guarded constructor');
  `);
  run(file);
});
