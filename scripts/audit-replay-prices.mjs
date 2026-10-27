import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { auditReplayPrices } from "./lib/replay-price-audit.mjs";
const [feedPath, sessionPath] = process.argv.slice(2);
if (!feedPath || !sessionPath) throw new Error("Provide a candle feed and a modeled session JSON or JSON.gz");
const read = path => { const b = readFileSync(path); return JSON.parse(path.endsWith(".gz") ? gunzipSync(b) : b); };
const report = auditReplayPrices(read(feedPath), read(sessionPath));
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exitCode = 1;
