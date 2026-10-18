# Interrupted development replay

This is the first 20-symbol baseline attempt, using the v1 frozen protocol.
The runtime aborted its first compute under shared memory pressure after
loading only five symbols and entered its lighter fallback. The owned launcher
session was stopped with SIGINT and returned exit 130. Its log remained
unchanged after termination; the SHA-256 is recorded in `run-result.json`.

No settled trade result was produced or admitted to the comparison. The retry
must use a new protocol and directory with complete-feed preload and strict
memory admission. Runtime memory protections and study completeness checks
remain enabled.
