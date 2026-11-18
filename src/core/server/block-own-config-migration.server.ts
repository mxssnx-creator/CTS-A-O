import type { CoreDb } from "./db.server.ts";
import type { SettingsPatch } from "../config.ts";
import { DEFAULT_BLOCK } from "../config.ts";

/** The pooled Block default before 17 Nov: every source on (each config's raise read every other config's closes). */
const OLD_DEFAULT_SOURCES = ["config", "overall", "symbol", "direction", "indication", "type"] as const;
const isOldDefault = (sources: unknown) =>
  !!sources && typeof sources === "object" &&
  OLD_DEFAULT_SOURCES.every((k) => (sources as Record<string, unknown>)[k] === true) &&
  Object.keys(sources).length === OLD_DEFAULT_SOURCES.length;

/**
 * Block relations under Auto (operator, 17 Nov). Stored settings and presets that carry exactly the old six-source
 * default move to the new default: the config's own records (config-wide and its symbol × side lane), every pooled
 * relation and the range relation, each count judged by the automatic evaluation. Any other stored selection is the
 * operator's choice and stays; nothing about positions, protection or evidence changes.
 */
export function migrateBlockOwnConfig(db: CoreDb): void {
  const version = "blockOwnConfig20261117V1";
  if (db.kvGet(version)) return;
  db.tx(() => {
    const settings = db.kvGet<SettingsPatch>("settings"),
      presets = db.kvGet<Array<{ settings?: SettingsPatch }>>("presets");
    db.kvSet("blockOwnConfig20261117BackupV1", structuredClone({ settings, presets }));
    const move = (s: SettingsPatch | undefined): boolean => {
      const b = s?.block as { sources?: unknown; configScope?: unknown } | undefined;
      if (!b || !isOldDefault(b.sources)) return false;
      b.sources = structuredClone(DEFAULT_BLOCK.sources);
      if (b.configScope === undefined) b.configScope = DEFAULT_BLOCK.configScope;
      if ((b as { auto?: unknown }).auto === undefined) (b as { auto?: unknown }).auto = structuredClone(DEFAULT_BLOCK.auto);
      return true;
    };
    if (settings && move(settings)) db.kvSet("settings", settings);
    let changed = false;
    for (const p of presets ?? []) changed = move(p.settings) || changed;
    if (presets && changed) db.kvSet("presets", presets);
    db.kvSet(version, true);
  });
}

/**
 * x01 (the mainnet account): Block's automatic evaluation judges every count per relation key, i.e. per config for the
 * config and lane relations (scope "key"), at PF 1.1 (operator, 18 Nov, after the four-window comparison in
 * docs/positive-coordinations.md: per-config Auto +1,725 % summed against +668 % for the pooled record and +247 % at
 * PF 1.3). Applied once to the x01 connection's stored settings; a later desk change is the operator's and stays.
 * Other connections keep the shipped default.
 */
export function migrateX01BlockAuto(db: CoreDb, conn: string | undefined): void {
  if (conn !== "bingx-x01") return;
  const version = "x01BlockAuto20261118V2";
  if (db.kvGet(version)) return;
  db.tx(() => {
    const settings = db.kvGet<SettingsPatch>("settings") ?? ({} as SettingsPatch);
    db.kvSet("x01BlockAuto20261118BackupV2", structuredClone(settings));
    const block = (settings.block ?? {}) as { auto?: Record<string, unknown> };
    block.auto = { ...structuredClone(DEFAULT_BLOCK.auto), ...(block.auto ?? {}), scope: "key", pf: 1.1 };
    settings.block = block as SettingsPatch["block"];
    db.kvSet("settings", settings);
    db.kvSet(version, true);
  });
}
