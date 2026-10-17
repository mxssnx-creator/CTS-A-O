/** A complete file run may contain explicit TAP opt-in skips; an unrun file cannot certify the requested suite. */
export function testAllVerdict(requestedFiles, results) {
  const expected = [...new Set(requestedFiles)];
  const wanted = new Set(expected);
  const byFile = new Map();
  const issues = [];
  if (!expected.length) issues.push("No test files were selected");
  for (const result of results) {
    if (!wanted.has(result.file)) issues.push(`${result.file}: unexpected result outside the requested files`);
    const rows = byFile.get(result.file) ?? [];
    rows.push(result);
    byFile.set(result.file, rows);
  }
  for (const file of expected) {
    const rows = byFile.get(file) ?? [];
    if (!rows.length) { issues.push(`${file}: no file result was recorded`); continue; }
    if (rows.length !== 1) { issues.push(`${file}: multiple file results were recorded`); continue; }
    const row = rows[0];
    if (row.status !== "pass") issues.push(`${file}: ${row.status ?? "unrun"}${row.reason ? ` (${row.reason})` : ""}`);
    else if (row.code !== 0 || !(row.tests > 0) || row.fail !== 0 || row.cancelled !== 0)
      issues.push(`${file}: a passing file requires exit 0 and completed TAP results without failures or cancellations`);
  }
  return { complete: issues.length === 0, exitCode: issues.length ? 1 : 0, requestedFiles: expected.length, issues };
}
