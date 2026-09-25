/**
 * Partial updates where null removes a field (link and collection state).
 * Pure, so stores can apply the same patch optimistically.
 */

/** A value sets the field; null removes it; an absent key leaves it alone. */
export type Patch<T> = { [K in keyof T]?: T[K] | null };

export function applyPatch<T extends object>(target: T, patch: Record<string, unknown>): T {
  const result = { ...target } as Record<string, unknown>;
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) {
      delete result[key];
    } else if (value !== undefined) {
      result[key] = value;
    }
  }
  return result as T;
}
