// The session report's page code (scripts/core-session.mjs → clientMain) runs in the browser, embedded with
// toString(): it sees none of the script's top-level helpers. A call to one (baseGateRows) threw a ReferenceError at
// load and left every report page blank. This checks clientMain on its own against the browser's globals: every
// name it uses must be its own or the DOM's.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const SCRIPT = new URL("../../scripts/core-session.mjs", import.meta.url);

/** The source text of a top-level function declaration of the script. */
function functionText(name: string): string {
  const text = readFileSync(SCRIPT, "utf8");
  const sf = ts.createSourceFile(
    "core-session.mjs",
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS,
  );
  const fn = sf.statements.find((s) => ts.isFunctionDeclaration(s) && s.name?.text === name);
  assert.ok(fn, `${name} not found in scripts/core-session.mjs`);
  return fn.getText(sf);
}

/** "Cannot find name" diagnostics of a standalone browser script. */
function unresolvedNames(code: string): string[] {
  const file = "/page.js";
  const opts: ts.CompilerOptions = {
    allowJs: true,
    checkJs: true,
    noEmit: true,
    target: ts.ScriptTarget.ES2022,
    lib: ["lib.es2023.d.ts", "lib.dom.d.ts", "lib.dom.iterable.d.ts"],
    types: [],
  };
  const host = ts.createCompilerHost(opts);
  const read = host.getSourceFile.bind(host);
  host.getSourceFile = (f, lang, ...rest) =>
    f === file
      ? ts.createSourceFile(f, code, lang, true, ts.ScriptKind.JS)
      : read(f, lang, ...rest);
  const exists = host.fileExists.bind(host);
  host.fileExists = (f) => f === file || exists(f);
  const program = ts.createProgram([file], opts, host);
  const sf = program.getSourceFile(file)!;
  // 2304 Cannot find name 'x' · 2552 Cannot find name 'x'. Did you mean 'y'? · 2662 / 2663 (missing this. / static)
  const codes = new Set([2304, 2552, 2662, 2663]);
  return program
    .getSemanticDiagnostics(sf)
    .filter((d) => codes.has(d.code))
    .map((d) => ts.flattenDiagnosticMessageText(d.messageText, " "));
}

describe("session report page", () => {
  it("clientMain uses only its own names and the browser's (no top-level helper of the script)", () => {
    const missing = unresolvedNames(`${functionText("clientMain")}\n`);
    assert.deepEqual(missing, []);
  });

  it("the check sees a top-level helper the page cannot reach", () => {
    const missing = unresolvedNames(
      "function clientMain(D) { const rows = baseGateRows(D.engine); return document.title + rows.length; }\n",
    );
    assert.equal(missing.length, 1);
    assert.match(missing[0], /baseGateRows/);
  });
});
