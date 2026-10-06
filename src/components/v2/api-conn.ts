// The server functions, bound to the selected connection: each call carries `conn` (pages import from here,
// not from @/core/api). coreConns lists every connection and is not bound.
import * as api from "@/core/api";
import { getConn } from "./conn";

type Fn = (opts?: { data?: Record<string, unknown> }) => Promise<unknown>;
const bind =
  <F>(fn: F) =>
  (opts?: { data?: Record<string, unknown> }) =>
    // an explicit conn in the call wins (the engine page's Run switch acts on its own row's connection)
    (fn as unknown as Fn)({ data: { ...(opts?.data ?? {}), conn: opts?.data?.conn ?? getConn() } }) as ReturnType<F extends (...a: never[]) => infer R ? () => R : never>;

export const coreStatus = bind(api.coreStatus);
export const coreOverview = bind(api.coreOverview);
export const coreResults = bind(api.coreResults);
export const coreMatrix = bind(api.coreMatrix);
export const coreConfig = bind(api.coreConfig);
export const coreSim = bind(api.coreSim);
export const coreTrading = bind(api.coreTrading);
export const coreMarket = bind(api.coreMarket);
export const coreEngine = bind(api.coreEngine);
export const coreSettings = bind(api.coreSettings);
export const saveCoreSettings = bind(api.saveCoreSettings);
export const corePresets = bind(api.corePresets);
export const presetAction = bind(api.presetAction);
export const corePresetSeries = bind(api.corePresetSeries);
export const coreControl = bind(api.coreControl);
export const coreStatistics = bind(api.coreStatistics);
export const coreConns = api.coreConns;
