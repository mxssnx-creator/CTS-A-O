# Lossless session evidence

Large simulation dumps use a JSON header plus checksummed JSONL chunks. Every
trade, tape-history row and validation check remains in the evidence directory.
An empty placeholder array in a header is **not an empty execution result**.
Read the corresponding manifest and chunks before calculating statistics.

## Reading and writing

Use `readSessionDump(file)` from `scripts/lib/session-dump.mjs` to reconstruct
the original logical object, including legacy single-file dumps. Use
`iterateSessionTapeTrades(file)` or `iterateSessionValidation(file)` to process
one tape or validation step at a time. Preserve tape order, duplicate IDs and
trade order; allocation `closeIndex` refers to that original trade order.
The repository's evaluation, range, Block and Signal-window readers use this
loader. The Python losing-config report uses a bounded file-to-file bridge.

`readSessionDump(file, {loadTapeTrades:false, loadValidation:false,
verifyUnloaded:true})` loads executions without retaining unused histories and
still verifies every referenced history chunk. A metadata-only projection must
not calculate execution counts from unloaded placeholder arrays.
Frozen-result validation and the independent arithmetic auditor reject
unloaded execution/allocation placeholders explicitly.

`writeSessionDump(file, raw, {arrayFields:['trades']})` stores tape histories,
validation checks and executions without one enormous JSON string. Session
capture generates history tuples lazily after disposing runtime workers.
The optional report flag `--chunk-allocations` also stores every exact
`sizedOrders` and `sizedOpenOrders` row in chunks; the usual flat report format
remains supported. Report HTML contains summaries and a link to the exact
allocation evidence rather than a second unused allocation copy.

## Integrity

Header fields `tapeTradesSidecar`, `validationSidecar` and `arraySidecars`
describe the stored arrays. Each manifest records schema, item/row/record
counts, ordered payload SHA256 and each chunk's relative path, byte count and
SHA256. Chunks are bounded to 8 MiB. Readers verify all descriptors, hashes,
ordinals and totals, and reject traversal, escaping symlinks, missing chunks,
duplicate chunk paths, corruption and reordered records.

Preserve the complete evidence directory or its artifact ZIP. Moving only the
header loses its referenced data. A completed-study receipt verifies the
header **and every raw/report chunk**. Unknown funding or unit returns remain
unknown; storage changes never make a gate pass or discard losing orders.

## Verification

Regression coverage compares legacy and chunked logical results, all executed
identities and allocations, stage checks, duplicate-ID behavior, empty arrays,
nonfinite JSON semantics, report rendering and corruption in unused histories.
A large stress run retained **12,000 tapes / 12,000,000 rows**: its estimated
legacy tape JSON alone was **672,948,892 bytes**, above Node's 536,870,888-byte
string limit. Chunk writing and complete verification succeeded at **347 MiB
peak RSS** in the shared local worker. This is serialization evidence, not a
market simulation or profitability result.

The original 22-symbol selection attempt failed at the monolithic JSON
stringification after completing its computation. Four separate risk arms
failed at the default approximately 4-GiB V8 heap during capture. Those attempts
have no funded/account result. Isolated 16-GiB research runners now explicitly
allow an 8-GiB main child heap; strategy worker policy and memory guards remain
separate. New full studies must still verify coverage and financial outcomes.
