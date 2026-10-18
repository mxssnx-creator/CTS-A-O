#!/usr/bin/env node
// Fixed file-to-file bridge for the Python losing-config report. No JSON stdout.
import { readSessionDump, writeJsonFile } from './session-dump.mjs';

const [input, output, ...extra] = process.argv.slice(2);
if (!input || !output || extra.length) throw new Error('Usage: session-dump-bridge.mjs INPUT OUTPUT');
const raw = await readSessionDump(input, {
  loadTapeTrades: false,
  loadValidation: false,
  verifyUnloaded: true,
});
await writeJsonFile(output, { trades: raw.trades });
