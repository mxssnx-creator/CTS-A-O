import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import { ExchangeRejected } from "../exchange/bingx.server.ts";
import { SimExchange, fakeRt, lane } from "../test-support.ts";
import { CoreDb } from "./db.server.ts";
import { resetLiveBackoff, stepLive } from "./live.server.ts";
import type { CoreRuntime } from "./runtime.server.ts";

process.env.CTS_CORE_LIVE = "1";
afterEach(() => { resetLiveBackoff(); mock.timers.reset(); });

for (const side of [1, -1] as const) for (const kind of ["entry", "close"] as const)
  for (const change of ["epoch", "connection", "fingerprint", "mode", "processing"] as const)
    for (const variant of ["ordinary", "special"] as const)
      test(`stale Overall ${kind} rejection ${change}/${variant} preserves pending identity on side ${side}`, async () => {
        mock.timers.enable({ apis: ["Date"], now: 1_790_000_000_000 });
        const db = new CoreDb(":memory:"), rt = fakeRt(db).rt, ex = new SimExchange();
        try {
          let fingerprint = "initial-account";
          ex.fingerprint = () => fingerprint;
          const place = ex.order.bind(ex), step = () => stepLive(rt as unknown as CoreRuntime, [], 1, ex);
          rt.paper.positions = [lane("a", "S0-USDT", side, 10)];
          if (kind === "close") { await step(); rt.paper.positions = []; mock.timers.tick(20_000); }
          let market: Record<string, string | number> | undefined, sends = 0;
          let entered!: () => void, reject!: (reason: unknown) => void;
          const reached = new Promise<void>((r) => { entered = r; });
          ex.order = async (p) => {
            if (p.type !== "MARKET") return place(p);
            sends++; market = p; entered();
            return new Promise((_resolve, rejectPromise) => { reject = rejectPromise; });
          };
          const pendingStep = step();
          await reached;
          const orderKind = kind === "entry" ? "O" : "X";
          const original = db.get<{ coid: string; qty: number; msg: string; status: string }>(
            "SELECT coid,qty,msg,status FROM live_orders WHERE kind=?", orderKind,
          )!;
          assert.equal(original.coid, market!.clientOrderID);
          assert.equal(original.qty, 0);
          assert.ok(original.msg.startsWith("execution-pending "));
          if (change === "epoch") (rt as unknown as { liveEpoch: number }).liveEpoch = 1;
          else if (change === "connection") Object.assign(rt.settings.live, { connId: "bingx-x01" });
          else if (change === "fingerprint") fingerprint = "other-account";
          else if (change === "mode") rt.settings.live.positionMode = "oneway";
          else rt.settings.live.mode = "entries";
          const reason = variant === "ordinary" ? "permission denied" : kind === "entry"
            ? "The minimum order amount is 1.5 S0" : "position not exist";
          reject(new ExchangeRejected(reason, 80001));
          await pendingStep;
          const retained = db.get<{ coid: string; qty: number; msg: string; status: string }>(
            "SELECT coid,qty,msg,status FROM live_orders WHERE kind=?", orderKind,
          )!;
          assert.deepEqual({ ...retained }, { ...original }, "an abandoned rejection cannot rewrite the old pending request");
          assert.equal(sends, 1, "a stale rejection cannot trigger a retry");
          assert.equal(db.all("SELECT * FROM live_orders WHERE kind='F'").length, 0, "already-flat rejection cannot invent a flat marker");
        } finally { db.db.close(); }
      });
