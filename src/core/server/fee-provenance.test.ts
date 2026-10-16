import assert from "node:assert/strict";
import { it } from "node:test";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CoreDb, upgradeShared } from "./db.server.ts";
import { CoreRuntime } from "./runtime.server.ts";
import { feeOf, liveTrades } from "../statistics.ts";

const LEGACY =
  "CREATE TABLE live_fills (coid TEXT PRIMARY KEY,sym TEXT,side INTEGER,kind TEXT,qty REAL,ref_px REAL,fill_px REAL,fee REAL,at INTEGER)";
const INSERT =
  "INSERT INTO live_fills (coid,sym,side,kind,qty,ref_px,fill_px,fee,fee_known,at) VALUES (?,'A-USDT',1,'O',1,100,100,?,?,?)";

it("hot-reloads a retained legacy fills table without certifying its zero placeholders", () => {
  const raw = new DatabaseSync(":memory:");
  try {
    raw.exec(LEGACY);
    raw.prepare("INSERT INTO live_fills VALUES ('old','A-USDT',1,'O',1,100,100,0,1)").run();
    const retained = { db: raw, stmts: new Map(), versions: new Map() } as unknown as CoreDb;
    upgradeShared(retained);
    upgradeShared(retained);
    const row = retained.get<{ fee: number; feeKnown: null; qty: number }>(
      "SELECT fee,fee_known AS feeKnown,qty FROM live_fills",
    )!;
    assert.equal(row.feeKnown, null);
    assert.equal(feeOf(row, 100, 0.002), 0.1);
  } finally {
    raw.close();
  }
});

it("migrates legacy zero fees as unknown, including hot reload and snapshot replacement", () => {
  const dir = mkdtempSync(join(tmpdir(), "cts-fee-provenance-"));
  try {
    const path = join(dir, "legacy.sqlite"),
      oldSnapshot = join(dir, "old-snapshot.sqlite"),
      raw = new DatabaseSync(path);
    raw.exec(LEGACY);
    raw.prepare("INSERT INTO live_fills VALUES ('old','A-USDT',1,'O',1,100,100,0,1)").run();
    raw.exec(`VACUUM INTO '${oldSnapshot.replace(/'/g, "''")}'`);
    raw.close();
    const db = new CoreDb(path);
    try {
      const row = db.get<{ fee: number; feeKnown: null; qty: number }>(
        "SELECT fee,fee_known AS feeKnown,qty FROM live_fills WHERE coid='old'",
      )!;
      assert.equal(row.feeKnown, null);
      assert.equal(feeOf(row, 100, 0.002), 0.1);
      upgradeShared(db);
      upgradeShared(db);
      assert.equal(
        db
          .all<{ name: string }>("SELECT name FROM pragma_table_info('live_fills')")
          .filter((x) => x.name === "fee_known").length,
        1,
      );
      db.run(INSERT, "new", 0, 1, 2);
      assert.equal(db.snapshot(join(dir, "snapshot.sqlite")), true);
    } finally {
      db.db.close();
    }
    const restored = new CoreDb();
    try {
      assert.equal(restored.restore(join(dir, "snapshot.sqlite")), true);
      assert.deepEqual(
        restored
          .all("SELECT coid,fee,fee_known FROM live_fills ORDER BY coid")
          .map((x) => ({ ...x })),
        [
          { coid: "new", fee: 0, fee_known: 1 },
          { coid: "old", fee: 0, fee_known: null },
        ],
      );
      restored.run("UPDATE live_fills SET fee_known=1 WHERE coid='old'");
      assert.equal(restored.restore(oldSnapshot), true);
      assert.equal(
        restored.get<{ fee_known: null }>("SELECT fee_known FROM live_fills WHERE coid='old'")
          ?.fee_known,
        null,
      );
    } finally {
      restored.db.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

it("keeps an explicit free-fee flag through journal recovery without backfilling legacy placeholders", () => {
  const dir = mkdtempSync(join(tmpdir(), "cts-fee-journal-"));
  try {
    const db = new CoreDb(),
      restored = new CoreDb();
    try {
      db.journalPath = join(dir, "fills.journal");
      db.runDurable(INSERT, "free", 0, 1, 1);
      db.runDurable(INSERT, "missing", null, 0, 2);
      db.runDurable(INSERT, "legacy", 0, null, 3);
      restored.journalPath = db.journalPath;
      assert.equal(restored.replayJournal(), 3);
      const rows = restored.all<{
        coid: string;
        fee: number | null;
        feeKnown: number | null;
        qty: number;
      }>("SELECT coid,fee,fee_known AS feeKnown,qty FROM live_fills ORDER BY at");
      assert.deepEqual(
        rows.map((x) => feeOf(x, 100, 0.002)),
        [0, 0.1, 0.1],
      );
      assert.equal(rows[0].feeKnown, 1);
      assert.equal(rows[1].fee, null);
      assert.equal(rows[2].feeKnown, null);
    } finally {
      db.db.close();
      restored.db.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

it("charges actual measured zero and only estimates a missing or legacy fee leg", () => {
  assert.equal(feeOf({ fee: 0, feeKnown: 1, qty: 1 }, 100, 0.002), 0);
  assert.equal(feeOf({ fee: 0, feeKnown: true, qty: 1 }, 100, 0.002), 0);
  for (const feeKnown of [undefined, null, 0, false])
    assert.equal(feeOf({ fee: 0, feeKnown, qty: 1 }, 100, 0.002), 0.1);
  assert.equal(feeOf({ fee: null, feeKnown: 1, qty: 1 }, 100, 0.002), 0.1);
  assert.equal(feeOf({ fee: NaN, feeKnown: 1, qty: 1 }, 100, 0.002), 0.1);
  assert.equal(feeOf({ fee: 0.3, qty: 1 }, 100, 0.002), 0.3);
  const rows = [
    {
      coid: "TAGUa",
      sym: "A-USDT",
      side: 1,
      kind: "O",
      qty: 1,
      px: 100,
      fillPx: 100,
      fee: 0,
      feeKnown: 1,
      status: "ok",
      at: 1,
    },
    {
      coid: "TAGXb",
      sym: "A-USDT",
      side: 1,
      kind: "X",
      qty: 1,
      px: 100,
      fillPx: 100,
      fee: 0,
      feeKnown: 1,
      status: "ok",
      at: 2,
    },
  ];
  assert.equal(liveTrades(rows, 3)[0].r, 0);
  assert.equal(liveTrades(rows, 3)[0].unitR, 0);
  assert.equal(
    liveTrades(
      rows.map((x) => ({ ...x, feeKnown: null })),
      3,
    )[0].r,
    -0.002,
  );
  assert.equal(liveTrades([rows[0], { ...rows[1], feeKnown: 0 }], 3)[0].r, -0.001);
});

it("measured live cost includes confirmed free fills while legacy zero rows remain unmeasured", () => {
  const rt = new CoreRuntime(
    new CoreDb(),
    { symbols: 1 },
    { market: "synthetic", priceStream: null },
  );
  rt.stop();
  try {
    for (let i = 0; i < 40; i++) rt.db.run(INSERT, String(i), 0, null, i);
    assert.equal(rt.liveCost(), null);
    for (let i = 0; i < 20; i++)
      rt.db.run("UPDATE live_fills SET fee_known=1 WHERE coid=?", String(i));
    assert.deepEqual(rt.liveCost(), { rt: 0, fills: 40, fee: 0, slip: 0 });
    assert.equal(rt.settings.cost, 0.002, "measuring actual fees never changes modeled study cost");
  } finally {
    rt.dispose();
  }
});
