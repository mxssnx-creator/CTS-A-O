/** Re-iterable projection with a known count, without materializing a second array of rows. */
export function mappedRows(rows, project) {
  const length = rows.length;
  return {
    length,
    *[Symbol.iterator]() {
      for (let i = 0; i < length; i++) yield project(rows[i], i);
    },
  };
}
