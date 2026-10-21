#!/usr/bin/env node
// Verify frozen evidence and generate a self-contained HTML report with measured charts.
import {spawnSync} from 'node:child_process';
const p = spawnSync('python', ['scripts/report-inverse.py', ...process.argv.slice(2)], {stdio:'inherit'});
process.exit(p.status ?? 1);
