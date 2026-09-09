/**
 * Compare userscript `@version` strings: dotted segments, numeric where both
 * sides are numbers (so 1.10 > 1.9) and lexical where either isn't (1.0.0-rc).
 * Missing segments read as 0, so 1.2 and 1.2.0 are the same version.
 */
export function compareVersions(a: string, b: string): -1 | 0 | 1 {
  const left = a.split('.');
  const right = b.split('.');

  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    const x = left[i] ?? '0';
    const y = right[i] ?? '0';
    const nx = Number.parseInt(x, 10);
    const ny = Number.parseInt(y, 10);
    const diff =
      Number.isNaN(nx) || Number.isNaN(ny) || String(nx) !== x || String(ny) !== y
        ? x.localeCompare(y)
        : nx - ny;
    if (diff !== 0) return diff < 0 ? -1 : 1;
  }
  return 0;
}
