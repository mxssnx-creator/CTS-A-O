import assert from "node:assert/strict";
import { test } from "node:test";
import { CoreRuntime } from "./runtime.server.ts";
import { CoreDb } from "./db.server.ts";

test("runtime slice cancellation closes generator-owned resources before rejecting", async () => {
  const db = new CoreDb(":memory:"),
    rt = new CoreRuntime(db, {}, { market: "synthetic" });
  const hooks = rt as unknown as {
    drive(name: string, g: Generator<number, void>, step: (n: number) => void): Promise<void>;
  };
  let closed = 0;
  const failure = new Error("superseded history transfer");
  const work = function* () {
    try {
      yield 1;
      assert.fail("cancelled transfer resumed");
    } finally {
      closed++;
    }
  };
  try {
    await assert.rejects(
      hooks.drive("transfer", work(), () => {
        throw failure;
      }),
      (error) => error === failure,
    );
    assert.equal(closed, 1);
  } finally {
    rt.dispose();
    db.db.close();
  }
});
