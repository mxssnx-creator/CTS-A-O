import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { auditModeledOrders } from "./lib/modeled-order-audit.mjs";

const paths = process.argv.slice(2);
if (!paths.length) throw new Error("Provide one or more modeled JSON or JSON.gz session dumps");
for (const path of paths) {
  const bytes = readFileSync(path);
  const data = JSON.parse(path.endsWith(".gz") ? gunzipSync(bytes) : bytes);
  const report = auditModeledOrders(data);
  console.log(JSON.stringify({ path, ...report }));
  if (!report.ok) process.exitCode = 1;
}
