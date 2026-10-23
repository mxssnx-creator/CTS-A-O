// Legacy DCA research is an unfunded scenario, never a funded-account profitability report.
import assert from 'node:assert/strict';
import { modeledUnitStatsOf, statsOf } from '../src/core/metrics/stats.ts';
export function dcaSweepStats(rows,startT,endT,{candidate=false,curveDivisor=1}={}) {
  assert.ok(Number.isFinite(startT)&&endT>startT&&curveDivisor>0);
  const settled=rows.filter(x=>!x.markedOpen&&x.exitT>startT&&x.exitT<=endT)
    .sort((a,b)=>a.exitT-b.exitT||a.entryT-b.entryT);
  const st=candidate?statsOf(settled,endT):modeledUnitStatsOf(settled,endT);
  const known=candidate||st.pfBasis==='unit-net-returns';
  const noLoss=known&&settled.length>0&&st.gl===0&&st.gp>0;
  return {
    n:settled.length,pf:known&&st.gl>0?st.pf:null,pfState:!known?'unknown':!settled.length?'empty':noLoss?'no-loss':st.gl>0?'ratio':'flat',
    gateScore:known?st.pf:null,pfBasis:known?'unit-net-returns':'unavailable',unknownReturns:st.unknownReturns??0,
    gp:known?st.gp:null,gl:known?st.gl:null,net:known?st.net/curveDivisor:null,
    wr:known?st.wr:null,mdd:known?st.mdd/curveDivisor:null,ddt:known?st.ddt:null,
    gh:known?st.gh:null,legs:settled.length?settled.reduce((n,x)=>n+(x.vol??1),0)/settled.length:0,
    markedOpenExcluded:rows.filter(x=>x.markedOpen).length,
    outsideWindowExcluded:rows.filter(x=>!x.markedOpen&&(x.exitT<=startT||x.exitT>endT)).length,
    basis:candidate?'unfiltered-tape-diagnostic':'post-gate-unfunded-virtual-scenario',
  };
}
