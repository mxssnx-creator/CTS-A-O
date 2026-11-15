import { modeledUnitReturn } from "./metrics/stats.ts";

/** Settled modeled orders only; callers retain unknown ownership and exclude endpoint marks/zero allocations. */
export interface BlockLaneTrade {
  r: number;
  mult?: number;
  unitR?: number | null;
  /** Explicit Block component. Total mult can include indication, coordination, range and Relate. */
  blockVol?: number;
  coordVol?: number;
  level?: number;
}
export interface LaneStats {
  n: number;
  gp: number | null;
  gl: number | null;
  pf: number | null | "no loss";
  net: number | null;
  judged: boolean;
  state: "empty" | "flat" | "finite" | "no-loss" | "unknown";
  unknownReturns: number;
  unknownMemberships: number;
}
export interface BlockLane {
  plain: LaneStats;
  raised: LaneStats;
  unknown: LaneStats;
  byLevel: Record<string, LaneStats>;
  minCloses: number;
  basis: "funded-settled-modeled-unit-returns";
}
function statsOf(xs: number[], minCloses: number, unknownMemberships = 0): LaneStats {
  let gp=0,gl=0,net=0,unknownReturns=0;
  for(const r of xs) {
    if(!Number.isFinite(r)) { unknownReturns++; continue; }
    net+=r;
    if(r>0)gp+=r;else if(r<0)gl-=r;
  }
  const unavailable=unknownReturns>0 || unknownMemberships>0 || ![gp,gl,net].every(Number.isFinite) || (gl>0&&!Number.isFinite(gp/gl));
  const state=unavailable?"unknown":xs.length===0?"empty":gp===0&&gl===0?"flat":gl===0?"no-loss":"finite";
  return {n:xs.length,gp:unavailable?null:gp,gl:unavailable?null:gl,net:unavailable?null:net,
    pf:state==="finite"?gp/gl:state==="no-loss"?"no loss":null,state,
    judged:!unavailable&&state!=="empty"&&state!=="flat"&&xs.length>=minCloses,unknownReturns,unknownMemberships};
}
/** No sizing component can create a primary unit-PF improvement on the same settled cohort. */
export function blockLane(trades:readonly BlockLaneTrade[],opts:{minCloses?:number;maxLevel?:number}={}):BlockLane {
  const minCloses=opts.minCloses??30;
  if(!Number.isSafeInteger(minCloses)||minCloses<1)throw new RangeError("Block lane minimum closes must be a positive integer");
  const plain:number[]=[],raised:number[]=[],unknown:number[]=[],levels:Record<string,number[]>={};
  for(const t of trades) {
    const u=modeledUnitReturn(t);
    if(!(typeof t.blockVol==="number"&&Number.isFinite(t.blockVol)&&t.blockVol>=1)) {unknown.push(u);continue;}
    if(t.blockVol===1) {plain.push(u);continue;}
    raised.push(u);
    const key=Number.isSafeInteger(t.level)&&t.level!>=1?`level ${t.level}`:"unknown level";
    (levels[key]??=[]).push(u);
  }
  const byLevel:Record<string,LaneStats>={};
  for(const [key,rs] of Object.entries(levels))byLevel[key]=statsOf(rs,minCloses,unknown.length);
  return {plain:statsOf(plain,minCloses,unknown.length),raised:statsOf(raised,minCloses,unknown.length),
    unknown:statsOf(unknown,minCloses),byLevel,minCloses,basis:"funded-settled-modeled-unit-returns"};
}
