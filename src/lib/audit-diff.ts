export type FieldChange = { from: unknown; to: unknown };

function normalize(value: unknown): unknown {
  return value instanceof Date ? value.toISOString().slice(0, 10) : value;
}

/**
 * Field-by-field "before -> after" for the audit log, limited to the keys we
 * care about. Unchanged fields are left out so the log stays readable.
 */
export function diffFields<T extends Record<string, unknown>>(
  before: T,
  after: Partial<T>,
  keys: readonly (keyof T & string)[],
): Record<string, FieldChange> {
  const changes: Record<string, FieldChange> = {};
  for (const key of keys) {
    if (!(key in after)) continue;
    const from = normalize(before[key]);
    const to = normalize(after[key]);
    if (JSON.stringify(from) !== JSON.stringify(to)) changes[key] = { from, to };
  }
  return changes;
}
