/** Per-set validation means. Never average the engine's finite no-loss gate score. */
export interface ValidatedSetPfAccumulator {
  sets: number;
  finiteSets: number;
  noLossSets: number;
  unavailableSets: number;
  finiteMean: number;
}
export interface ValidatedSetPf {
  pf: number | null;
  finiteMean: number | null;
  noLoss: boolean;
  sets: number;
  finiteSets: number;
  noLossSets: number;
  unavailableSets: number;
}
export const emptyValidatedSetPf = (): ValidatedSetPfAccumulator => ({
  sets: 0, finiteSets: 0, noLossSets: 0, unavailableSets: 0, finiteMean: 0,
});

/** Call only for a set that passed its own gate; missing/empty evidence remains in the denominator. */
export function addValidatedSetPf(a: ValidatedSetPfAccumulator, n: number, gp: number | undefined, gl: number | undefined): void {
  a.sets++;
  if (!Number.isSafeInteger(n) || n < 1 || typeof gp !== "number" || typeof gl !== "number" ||
      !Number.isFinite(gp) || !Number.isFinite(gl) || gp < 0 || gl < 0 || gp + gl === 0) {
    a.unavailableSets++; return;
  }
  if (gl === 0) { a.noLossSets++; return; }
  const pf = gp / gl;
  if (!Number.isFinite(pf)) { a.unavailableSets++; return; }
  a.finiteMean += (pf - a.finiteMean) / ++a.finiteSets;
}

export function mergeValidatedSetPf(a: ValidatedSetPfAccumulator, b: ValidatedSetPfAccumulator): void {
  const finite = a.finiteSets + b.finiteSets;
  if (b.finiteSets) a.finiteMean += (b.finiteMean - a.finiteMean) * (b.finiteSets / finite);
  a.sets += b.sets; a.finiteSets = finite; a.noLossSets += b.noLossSets; a.unavailableSets += b.unavailableSets;
}

export function validatedSetPf(a?: ValidatedSetPfAccumulator | null): ValidatedSetPf | null {
  if (!a || ![a.sets, a.finiteSets, a.noLossSets, a.unavailableSets].every((n) => Number.isSafeInteger(n) && n >= 0) ||
      a.sets !== a.finiteSets + a.noLossSets + a.unavailableSets || !Number.isFinite(a.finiteMean) || a.finiteMean < 0)
    return null;
  return { sets: a.sets, finiteSets: a.finiteSets, noLossSets: a.noLossSets, unavailableSets: a.unavailableSets,
    finiteMean: a.finiteSets > 0 ? a.finiteMean : null,
    pf: a.unavailableSets === 0 && a.finiteSets > 0 ? a.finiteMean : null,
    noLoss: a.sets > 0 && a.noLossSets === a.sets };
}

export function combineValidatedSetPf(rows: readonly (ValidatedSetPf | null | undefined)[]): ValidatedSetPf | null {
  const a = emptyValidatedSetPf();
  for (const r of rows) {
    if (!r) return null;
    const b = { ...r, finiteMean: r.finiteSets > 0 ? r.finiteMean ?? NaN : 0 };
    if (!validatedSetPf(b)) return null;
    mergeValidatedSetPf(a, b);
  }
  return validatedSetPf(a);
}

export function validatedSetPfOf(rows: readonly { n: number; gp?: number; gl?: number }[]): ValidatedSetPf {
  const a = emptyValidatedSetPf();
  for (const r of rows) addValidatedSetPf(a, r.n, r.gp, r.gl);
  return validatedSetPf(a)!;
}
