#!/usr/bin/env node
// Add explicit engine/account endpoint marks to immutable existing evidence.
// This command never runs a strategy, reallocates an order or reseals a study.
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { access, mkdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { endpointBookMark, endpointMarkPrice } from './lib/endpoint-mark.mjs';
import { readSessionDump, verifySessionDumpSidecars, writeJsonFile, writeSessionDump } from './lib/session-dump.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const finite = (x) => typeof x === 'number' && Number.isFinite(x);
const jsonHash = (x) => createHash('sha256').update(JSON.stringify(x)).digest('hex');
const RECONCILIATION_TOLERANCE_USD = 0.000002; // original data.json rounds totals to six decimals

function rowsHash(rows) {
  const hash = createHash('sha256');
  hash.update('[');
  let first = true;
  for (const row of rows) { if (!first) hash.update(','); first = false; hash.update(JSON.stringify(row)); }
  return hash.update(']').digest('hex');
}
function* allocationRows(report) {
  for (const [kind, index, rows] of [['settled', 'closeIndex', report.sizedOrders], ['open', 'openIndex', report.sizedOpenOrders]])
    for (const r of rows) yield [kind, r[index], r.key, r.unitNotional, r.rawUnitNotional ?? null, r.allocatedNotional, r.volume, r.rawGot ?? null, r.roundoffZeroed ?? false];
}
function unchangedProof(raw, report) {
  return {
    settledOrdersSha256: rowsHash(report.sizedOrders), rawSettledTradesSha256: rowsHash(raw.trades),
    allocationNotionalsSha256: rowsHash(allocationRows(report)),
    hoursSha256: rowsHash(report.hours ?? []), curveSha256: rowsHash(report.curve ?? []),
    studySha256: jsonHash(report.study ?? null), rawStudySha256: jsonHash(raw.study ?? null),
  };
}
async function hashFile(file) {
  const hash = createHash('sha256'); let bytes = 0;
  for await (const chunk of createReadStream(file)) { hash.update(chunk); bytes += chunk.length; }
  return { sha256: hash.digest('hex'), bytes };
}
async function evidenceOf(file) {
  return { path: resolve(file), manifest: await hashFile(file), sidecars: await verifySessionDumpSidecars(file) };
}
async function amendmentCode() {
  const files = [];
  for (const path of ['scripts/amend-endpoint-report.mjs', 'scripts/lib/endpoint-mark.mjs', 'scripts/lib/session-dump.mjs'])
    files.push({ path, sha256: createHash('sha256').update(await readFile(resolve(root, path))).digest('hex') });
  return { files, sha256: jsonHash(files) };
}
async function requireNewOutput(outDir) {
  try { await access(outDir); } catch (error) { if (error.code === 'ENOENT') return; throw error; }
  throw new Error('Amendment output directory already exists; refusing to overwrite evidence');
}
function requireSame(a, b, label) { if (a !== b) throw new Error(`Original ${label} differs`); }
const identityKey = (x) => `${x.cfg}|${x.sym}|${x.side}|${x.entryT}`;

function supplementReport(raw, report) {
  if (!Array.isArray(raw.trades) || !Array.isArray(raw.openEnd) || !Array.isArray(report.sizedOrders) || !Array.isArray(report.sizedOpenOrders))
    throw new Error('Missing complete execution/allocation evidence');
  if (report.reportRevision) throw new Error('Report already has revision provenance');
  if (!finite(raw.window?.startT) || !finite(raw.window?.endT) || raw.window.endT <= raw.window.startT ||
      !finite(raw.settings?.cost) || raw.settings.cost < 0)
    throw new Error('Unknown or invalid original execution window/cost');
  requireSame(raw.window?.startT, report.window?.startT, 'execution start');
  requireSame(raw.window?.endT, report.window?.endT, 'execution end');
  requireSame(jsonHash(raw.study ?? null), jsonHash(report.study ?? null), 'frozen study provenance');
  if (report.sizedOrders.length !== raw.trades.length || report.sizedOpenOrders.length !== raw.openEnd.length)
    throw new Error('Original execution/allocation row counts differ');
  // Allocation identities are never inferred from a representative configuration.
  for (const [i, row] of report.sizedOrders.entries()) {
    const tr = raw.trades[i];
    if (row.closeIndex !== i || row.key !== identityKey(tr) || ['cfg', 'sym', 'side', 'entryT', 'exitT'].some((k) => row[k] !== tr[k]))
      throw new Error('Original settled allocation identity/order differs');
  }
  const marks = new Map(), seen = new Set();
  let engineSizedPnl = 0, bookSizedPnl = 0, differingRows = 0, unknownEngineMarks = 0;
  const sizedOpenOrders = report.sizedOpenOrders.map((row) => {
    const i = row.openIndex, open = raw.openEnd[i];
    if (!Number.isSafeInteger(i) || i < 0 || !open || seen.has(i) || row.key !== identityKey(open) ||
        !finite(open.entryT) || open.entryT < raw.window.startT || open.entryT > raw.window.endT ||
        ['cfg', 'sym', 'side', 'entryT'].some((k) => row[k] !== open[k]))
      throw new Error('Original endpoint allocation identity/order differs');
    seen.add(i);
    if (!marks.has(open.sym)) marks.set(open.sym, endpointMarkPrice(raw.closes, open.sym, raw.window.endT));
    const fields = endpointBookMark(open, row, { cost: raw.settings?.cost, endT: raw.window.endT, mark: marks.get(open.sym) });
    if (row.sizedReturn !== open.mtmR || row.sizedPnl !== fields.engineMarkSizedPnl)
      throw new Error('Original endpoint fields do not retain the engine mark basis');
    for (const [key, value] of Object.entries(fields)) if (Object.hasOwn(row, key) && jsonHash(row[key]) !== jsonHash(value))
      throw new Error(`Refusing to replace original endpoint field ${key}`);
    bookSizedPnl += fields.bookSizedPnl;
    if (fields.engineMarkSizedPnl === null) unknownEngineMarks++;
    else {
      engineSizedPnl += fields.engineMarkSizedPnl;
      if (Math.abs(fields.engineMinusBookMarkUsd) > 1e-12) differingRows++;
    }
    return { ...row, ...fields };
  });
  if (seen.size !== raw.openEnd.length) throw new Error('Incomplete endpoint allocation coverage');
  const reportedAccountMtm = report.total?.openEnd?.mtm;
  const equityMinusBalance = report.total?.equityEnd - report.total?.balanceEnd;
  if (!finite(reportedAccountMtm) || !finite(equityMinusBalance) ||
      Math.abs(bookSizedPnl - reportedAccountMtm) > RECONCILIATION_TOLERANCE_USD ||
      Math.abs(bookSizedPnl - equityMinusBalance) > RECONCILIATION_TOLERANCE_USD)
    throw new Error('Supplemented book marks do not reconcile to the original account totals');
  return {
    report: { ...report, sizedOpenOrders },
    reconciliation: { rows: sizedOpenOrders.length, differingRows, unknownEngineMarks,
      engineSizedPnl: unknownEngineMarks ? null : engineSizedPnl, bookSizedPnl,
      engineMinusBookMarkUsd: unknownEngineMarks ? null : engineSizedPnl - bookSizedPnl,
      reportedAccountMtm, equityMinusBalance, toleranceUsd: RECONCILIATION_TOLERANCE_USD, checksOk: true },
  };
}

export async function amendEndpointReport({ rawFile, reportFile, outDir }) {
  if (!rawFile || !reportFile || !outDir) throw new Error('Required: --raw FILE --report FILE --out NEW_DIRECTORY');
  rawFile = resolve(rawFile); reportFile = resolve(reportFile); outDir = resolve(outDir);
  await requireNewOutput(outDir);
  // Receipts bind physical input headers and every referenced chunk, including
  // histories not used by this arithmetic-only amendment.
  const inputs = { raw: await evidenceOf(rawFile), report: await evidenceOf(reportFile) };
  const raw = await readSessionDump(rawFile, { loadTapeTrades: false, loadValidation: false });
  const original = await readSessionDump(reportFile);
  const unchanged = unchangedProof(raw, original), amendment = await amendmentCode();
  const { report, reconciliation } = supplementReport(raw, original);
  requireSame(jsonHash(unchangedProof(raw, report)), jsonHash(unchanged), 'settled/allocation/hour/curve fingerprints');
  // Every top-level original value is retained; only endpoint rows gain fields.
  for (const key of Object.keys(original)) {
    if (key === 'sizedOpenOrders') continue;
    if (report[key] !== original[key]) throw new Error(`Original report field changed: ${key}`);
  }
  for (const [i, row] of original.sizedOpenOrders.entries()) for (const key of Object.keys(row))
    if (jsonHash(row[key]) !== jsonHash(report.sizedOpenOrders[i][key])) throw new Error(`Original endpoint field changed: ${key}`);
  report.reportRevision = {
    schema: 'cts-endpoint-report-revision-v1', createdAt: new Date().toISOString(),
    kind: 'additive-engine-and-existing-minute-book-endpoint-marks',
    originalRawSha256: inputs.raw.manifest.sha256, originalReportSha256: inputs.report.manifest.sha256,
    amendmentCodeSha256: amendment.sha256,
    originalStudyUnchanged: true, settledAndAccountCurvesUnchanged: true,
    limitation: 'The existing minute model uses final arithmetic aggregate entry and final volume from parent entry. Raw evidence lacks per-leg prices/fill times; this is not a causal reconstruction of individual ladder fills. No harmonic entry is inferred.',
  };
  // Recheck immutable header bytes before publishing an amendment; source inputs
  // are never opened for writing and the original frozen source seal stays intact.
  requireSame((await hashFile(rawFile)).sha256, inputs.raw.manifest.sha256, 'raw header bytes');
  requireSame((await hashFile(reportFile)).sha256, inputs.report.manifest.sha256, 'report header bytes');
  await mkdir(dirname(outDir), { recursive: true }); await mkdir(outDir);
  const outputFile = resolve(outDir, 'data.json'), receiptFile = resolve(outDir, 'receipt.json');
  await writeSessionDump(outputFile, report, { arrayFields: ['sizedOrders', 'sizedOpenOrders'] });
  const revised = await readSessionDump(outputFile);
  requireSame(jsonHash(unchangedProof(raw, revised)), jsonHash(unchanged), 'written settled/allocation/hour/curve fingerprints');
  const receipt = {
    schema: 'cts-endpoint-report-amendment-v1', createdAt: report.reportRevision.createdAt,
    inputs, amendment, output: { report: await evidenceOf(outputFile) }, unchanged, reconciliation,
    policy: 'Additive report evidence only. Original raw/study, engine mark fields, settled returns, allocation notionals, hourly results and account curves are unchanged. No model rerun, source reseal, gate change or live promotion.',
  };
  await writeJsonFile(receiptFile, receipt);
  return { reportFile: outputFile, receiptFile, receipt };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const arg = (k) => { const i = process.argv.indexOf(`--${k}`); return i >= 0 ? process.argv[i + 1] : undefined; };
  try {
    const result = await amendEndpointReport({ rawFile: arg('raw'), reportFile: arg('report'), outDir: arg('out') });
    console.log(JSON.stringify({ reportFile: result.reportFile, receiptFile: result.receiptFile, ...result.receipt.reconciliation }));
  } catch (error) { console.error(String(error)); process.exitCode = 1; }
}
