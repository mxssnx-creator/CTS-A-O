import assert from "node:assert/strict";
import { test } from "node:test";
import { CoreRuntime } from "./runtime.server.ts";
import { CoreDb } from "./db.server.ts";

test("neutral ratio migration backs up factory values, bounds old ratios and preserves later custom choices", () => {
  const db=new CoreDb(":memory:");
  db.kvSet("wfCapsV",37); db.kvSet("ddtMax35",true);
  db.kvSet("settings",{signals:{coordination:{volumeFactor:8},combinedVolumeFactors:{trend:12,rsi:1.3}},axis:{volumeFactor:0.1}});
  const open=()=>new CoreRuntime(db,undefined,{market:"synthetic",priceStream:null});
  const rt=open();
  try {
    assert.equal(rt.settings.signals.coordination.volumeFactor,1);
    assert.equal(rt.settings.axis.volumeFactor,1);
    assert.equal(rt.settings.signals.combinedVolumeFactors.trend,5);
    assert.equal(rt.settings.signals.combinedVolumeFactors.rsi,1.3);
    assert.equal(rt.settings.exitStrategy.volumeFactor,1);
    assert.equal(db.kvGet<any>("neutralVolumeRatiosBackupV1").settings.signals.coordination.volumeFactor,8);
    rt.updateSettings({signals:{coordination:{volumeFactor:0.1}},axis:{volumeFactor:0.1}} as never);
  } finally {rt.dispose();}
  const reopened=open();
  try {assert.equal(reopened.settings.signals.coordination.volumeFactor,0.1);assert.equal(reopened.settings.axis.volumeFactor,0.1);}
  finally {reopened.dispose();db.db.close();}
});
