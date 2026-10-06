// Core v2 server functions. The UI polls these; the runtime runs continuously on the server. Each one validates its
// input and returns its page's data from api-data.ts (where the shaping lives and is tested).
import { createServerFn } from "@tanstack/react-start";
import {
  connInput,
  coreConfigData,
  coreConfigInput,
  coreConnsData,
  coreControlData,
  coreControlInput,
  coreEngineData,
  coreMarketData,
  coreMatrixData,
  coreOverviewData,
  corePresetSeriesData,
  corePresetSeriesInput,
  corePresetsData,
  coreResultsData,
  coreResultsInput,
  coreSettingsData,
  coreSimData,
  coreStatisticsData,
  coreStatisticsInput,
  coreStatusData,
  coreTradingData,
  presetActionData,
  presetActionInput,
  saveCoreSettingsData,
  saveCoreSettingsInput,
} from "./api-data.ts";

/** Light status for the header (polled often). */
export const coreStatus = createServerFn({ method: "GET" })
  .validator(connInput)
  .handler(({ data }) => coreStatusData(data));

export const coreOverview = createServerFn({ method: "GET" })
  .validator(connInput)
  .handler(({ data }) => coreOverviewData(data));

export const coreResults = createServerFn({ method: "GET" })
  .validator(coreResultsInput)
  .handler(({ data }) => coreResultsData(data));

/** Bot × indication matrix from the Base stage (best stage-1 result per pair). */
export const coreMatrix = createServerFn({ method: "GET" })
  .validator(connInput)
  .handler(({ data }) => coreMatrixData(data));

export const coreConfig = createServerFn({ method: "GET" })
  .validator(coreConfigInput)
  .handler(({ data }) => coreConfigData(data));

export const coreSim = createServerFn({ method: "GET" })
  .validator(connInput)
  .handler(({ data }) => coreSimData(data));

export const coreTrading = createServerFn({ method: "GET" })
  .validator(connInput)
  .handler(({ data }) => coreTradingData(data));

export const coreMarket = createServerFn({ method: "GET" })
  .validator(connInput)
  .handler(({ data }) => coreMarketData(data));

export const coreEngine = createServerFn({ method: "GET" })
  .validator(connInput)
  .handler(({ data }) => coreEngineData(data));

export const coreSettings = createServerFn({ method: "GET" })
  .validator(connInput)
  .handler(({ data }) => coreSettingsData(data));

export const saveCoreSettings = createServerFn({ method: "POST" })
  .validator(saveCoreSettingsInput)
  .handler(({ data }) => saveCoreSettingsData(data));

/** Research presets (fixed, measured) + presets saved from the engine, with their results. */
export const corePresets = createServerFn({ method: "GET" })
  .validator(connInput)
  .handler(({ data }) => corePresetsData(data));

/** The cached diagrams of one preset's latest backtest (kept apart from corePresets, which polls every few s). */
export const corePresetSeries = createServerFn({ method: "GET" })
  .validator(corePresetSeriesInput)
  .handler(({ data }) => corePresetSeriesData(data));

export const presetAction = createServerFn({ method: "POST" })
  .validator(presetActionInput)
  .handler(({ data }) => presetActionData(data));

export const coreControl = createServerFn({ method: "POST" })
  .validator(coreControlInput)
  .handler(({ data }) => coreControlData(data));

/** Every exchange connection with its own runtime: state, progress, Live, keys (the top connection selector). */
export const coreConns = createServerFn({ method: "GET" }).handler(() => coreConnsData());

/** Complete statistics of the selected connection: simulated run (full detail) or paper book. */
export const coreStatistics = createServerFn({ method: "GET" })
  .validator(coreStatisticsInput)
  .handler(({ data }) => coreStatisticsData(data));
