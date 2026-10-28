/** Historical Exit owns its coordination evidence by complete config identity. */
export function isHistoricExitConfig(cfg?: string, type?: string): boolean {
  if (type === "exit") return true;
  if (!cfg?.includes("|hx")) return false;
  const core = cfg.replace(/\|(?:mp|mc|mn|sh|gn|lg)(?=\||$)/g, "");
  return /\|hx(?:[LS])?[0-4]?$/.test(core);
}

/** A stable, unambiguous suffix for pooled histories; normal strategies keep their legacy keys. */
export function exitScopeSuffix(cfg?: string, type?: string): string {
  return isHistoricExitConfig(cfg, type) ? `|#exit:${encodeURIComponent(cfg ?? "")}` : "";
}
