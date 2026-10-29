/** True if accumulated rounding can obscure the selected part of a nonnegative prefix sum. */
export function imprecisePrefix(prefix: ArrayLike<number>, a: number, b: number): boolean {
  const before = prefix[a], after = prefix[b], diff = after - before;
  const scale = Math.max(Math.abs(before), Math.abs(after));
  return !Number.isFinite(diff) || (a > 0 && scale > 0 && Math.abs(diff) <=
    Number.EPSILON * scale * Math.max(4, b));
}

/** Recover a rare cancellation-prone window from its own original unit returns. */
export function returnWindow(
  tape: { gp: ArrayLike<number>; gl: ArrayLike<number>; r?: ArrayLike<number>; direction?: ArrayLike<number> }, a: number, b: number,
): { gp: number; gl: number; rescanned: boolean } {
  let gp = tape.gp[b] - tape.gp[a], gl = tape.gl[b] - tape.gl[a];
  const badGp = imprecisePrefix(tape.gp, a, b), badGl = imprecisePrefix(tape.gl, a, b);
  // A single signed return cannot add to both sides. One reliably visible nonzero increment proves the other is zero.
  if (b === a + 1 && ((gp > 0 && !badGp && gl === 0) || (gl > 0 && !badGl && gp === 0)))
    return { gp, gl, rescanned: false };
  const direction = tape.direction ? tape.direction[b] - tape.direction[a] : 0;
  if ((direction === b - a && gp > 0 && !badGp && gl === 0) ||
      (direction === a - b && gl > 0 && !badGl && gp === 0))
    return { gp, gl, rescanned: false };
  const rescanned = badGp || badGl;
  if (!rescanned) return { gp, gl, rescanned };
  if (!tape.r || tape.r.length < b) return { gp: NaN, gl: NaN, rescanned };
  gp = gl = 0;
  for (let i = a; i < b; i++) {
    const r = tape.r[i];
    if (!Number.isFinite(r)) return { gp: NaN, gl: NaN, rescanned };
    if (r > 0) gp += r;
    else gl -= r;
  }
  return { gp, gl, rescanned };
}
