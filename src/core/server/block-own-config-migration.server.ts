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
 * Block on each config's own record (operator, 17 Nov). Stored settings and presets that carry exactly the old
 * all-sources default move to the new default (config source, config-wide). Any other stored selection is the
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
      return true;
    };
    if (settings && move(settings)) db.kvSet("settings", settings);
    let changed = false;
    for (const p of presets ?? []) changed = move(p.settings) || changed;
    if (presets && changed) db.kvSet("presets", presets);
    db.kvSet(version, true);
  });
}
