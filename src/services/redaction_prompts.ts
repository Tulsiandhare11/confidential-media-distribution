/** Turns "License plates, name badge!" into ["License plates", "name badge"]. */
export function parseRemoveObjects(raw: unknown): string[] {
  if (typeof raw !== 'string') return [];
  return raw
    .split(/[,;\n]/)
    .map((s) => s.replace(/[^\p{L}\p{N} ]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 40))
    .filter(Boolean)
    .slice(0, 5);
}