/**
 * Normalize list API responses: legacy bare arrays or paginated `{ data, pagination }`.
 */
export function unwrapPaginatedList<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) {
    return raw;
  }
  if (
    raw &&
    typeof raw === "object" &&
    "data" in raw &&
    Array.isArray((raw as { data: unknown }).data)
  ) {
    return (raw as { data: T[] }).data;
  }
  return [];
}
