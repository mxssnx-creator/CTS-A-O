import wt from "node:worker_threads";
import { syncBuiltinESMExports } from "node:module";
const Orig = wt.Worker;
const dir = process.env.WORKER_PROF_DIR;
wt.Worker = class extends Orig { constructor(u, o = {}) { super(u, { ...o, execArgv: [...(o.execArgv ?? []), "--cpu-prof", `--cpu-prof-dir=${dir}`] }); } };
syncBuiltinESMExports();
