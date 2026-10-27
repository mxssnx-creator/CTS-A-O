/** Preserve only venue order IDs that have not lost integer precision during JSON decoding. */
export function exactVenueOrderId(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) return String(value);
  return "";
}

/** A precision-preserving string can accompany a compatible rounded numeric alias; any conflict is unsafe. */
export function exactVenueOrderIds(...values: unknown[]): string {
  const present = values.filter((value) => value !== undefined && value !== null);
  const ids = present.map(exactVenueOrderId).filter((id) => id !== "");
  if (!ids.length || ids.some((id) => id !== ids[0])) return "";
  const id = ids[0];
  // Unsafe JSON numbers may only corroborate an exact decimal string when they are its actual rounded value.
  const compatible = present.every((value) => exactVenueOrderId(value) === id ||
    (typeof value === "number" && Number.isInteger(value) && !Number.isSafeInteger(value) && value >= 0 &&
      /^\d+$/.test(id) && Number(id) === value));
  return compatible ? id : "";
}
