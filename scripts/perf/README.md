# Performance tools

What the engine does on its main thread, measured instead of guessed.

| Tool | What it measures |
|---|---|
| `stall-probe.ts <root>` | The runtime test's two computes: the worst event-loop stall and each phase's longest slice. Run with `node --cpu-prof --cpu-prof-dir=<dir>` and read the profile with `stalls.mjs`. |
| `stalls.mjs <file.cpuprofile> [minMs]` | Every main-thread run of ≥ minMs (default 150) in a CPU profile: its functions by self time, the app frames, and an aggregate. |
| `cdp-profile.mjs <port> <s> <out>` | A CPU profile of a running desk over the inspector (`kill -USR1 <pid>` opens it on 9229). |
| `cdp-heap.mjs <port> <s> <out>` | A sampling allocation profile of a running desk (garbage included): MB allocated per function. |
| `control-bench.ts <root> [positions] [steps]` | The live control step on an x02-sized book against the simulated exchange: garbage and ms per steady step. |

Measured 7 Oct (x02): GC 255 s of 1,100 s, 170 GB allocated in 15 min (~120 GB in the live control step). Control step at
2,500 positions: 14.1 → 6.0 MB garbage and 28 → 18 ms per step, ~1 step/s instead of 10.
