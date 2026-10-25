import assert from "node:assert/strict";
import { test } from "node:test";
import { volumeRatio, validVolumeRatio } from "./volume-ratio.ts";
import { volumeFactorForIndication, volumeFactorForStrategy } from "./volume-factor.ts";
import { rangeVolumeFactorFor, defaultWalkForward } from "./sim/walkforward.ts";
import { INDICATION_KINDS } from "./domain/types.ts";
import { INDICATIONS, laneInd } from "./indications/registry.ts";
import { DEFAULT_SETTINGS } from "./config.ts";
import { checkSettings } from "./settings-check.ts";

test("all 50 ratio steps are exact, accepted for every indication and used on both lane types", () => {
  for(let i=1;i<=50;i++) {
    const ratio=i/10;
    assert.ok(validVolumeRatio(ratio)); assert.equal(volumeRatio(ratio),ratio);
    for(const kind of INDICATION_KINDS) {
      const ind=INDICATIONS.find(x=>x.kind===kind && !x.id.startsWith("sig-") && !x.id.startsWith("s2-"))!.id;
      checkSettings({signals:{combinedVolumeFactors:{[kind]:ratio}}} as never);
      for(const combined of [false,true])
        assert.equal(volumeFactorForIndication(laneInd(ind,15,combined),{coordination:1,combined:{[kind]:ratio}}),ratio);
    }
    checkSettings({exitStrategy:{volumeFactor:ratio},axis:{volumeFactor:ratio}} as never);
  }
  for(const value of [0,0.09,0.15,5.1,NaN,Infinity,"1",null]) assert.equal(validVolumeRatio(value),false);
});

test("Exit uses its own range ratio for ordinary and Signal sources, exactly once", () => {
  const o={...defaultWalkForward(DEFAULT_SETTINGS),exitVolumeFactor:0.3,
    rangeVolumeFactors:{wide:5,mn:2},signalRangeVolumeFactors:{short:4,medium:2},
    indicationVolumeFactors:{coordination:1,combined:{trend:1.3}}};
  for(const ind of ["trend-ema-12-26@m15","trend-ema-12-26@m15c","sig-ema-cross-s@m15"])
    assert.equal(rangeVolumeFactorFor({ind,protect:{exitType:"historic"}},o),0.3);
  const tp={ind:"trend-ema-12-26@m15",kind:"normal",protect:{tag:"mn" as const}};
  assert.equal(volumeFactorForStrategy(tp,o),1.3);
  assert.equal(rangeVolumeFactorFor(tp,o),2);
  assert.equal(volumeFactorForStrategy(tp,o)*rangeVolumeFactorFor(tp,o),2.6);
  assert.equal(volumeFactorForStrategy({...tp,kind:"axis"},o),1.3,"neutral Axis adds no hidden 0.1 multiplier");
});
