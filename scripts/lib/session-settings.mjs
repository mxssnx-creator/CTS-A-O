import { createHash } from "node:crypto";

const jsonSafe = (value) => JSON.parse(JSON.stringify(value, (_key, item) =>
  item instanceof Set ? [...item] : item instanceof Map ? Object.fromEntries(item) : item));
const digest = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

/** Exact replay controls, with account execution-proof closes replaced by verifiable private-evidence metadata. */
export function sessionSettingsEvidence(settings, wf) {
  const effective = jsonSafe(settings);
  const fullSettingsSha256 = digest(effective);
  let privateExecutionCloses = 0;
  for (const lane of effective.live?.promotedLanes ?? []) {
    if (!lane.executionCloses?.length) continue;
    const rows = lane.executionCloses;
    privateExecutionCloses += rows.length;
    lane.executionCloses = [];
    lane.executionClosesRedacted = { count: rows.length, sha256: digest(rows) };
  }
  return { effective, effectiveWf: jsonSafe(wf), fullSettingsSha256,
    ...(privateExecutionCloses ? { privateExecutionEvidence: { redacted: true, closes: privateExecutionCloses } } : {}) };
}
