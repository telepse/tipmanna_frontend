/**
 * Normalizes GET /contents/channel/:eventId responses (array or formattedContents wrapper).
 */
export function unwrapContentChannelList(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (
    data &&
    typeof data === "object" &&
    "formattedContents" in data &&
    Array.isArray((data as { formattedContents?: unknown[] }).formattedContents)
  ) {
    return (data as { formattedContents: unknown[] }).formattedContents;
  }
  return [];
}

/** Append or replace a channel row by id (stable order: replace in place, append if new). */
export function mergeEventRoomChannel<T extends { id: string }>(
  list: T[],
  row: T
): T[] {
  const idx = list.findIndex(c => String(c.id) === String(row.id));
  if (idx >= 0) {
    const next = [...list];
    next[idx] = row;
    return next;
  }
  return [...list, row];
}
