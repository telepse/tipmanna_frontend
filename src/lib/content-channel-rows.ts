/** Normalize GET /contents/channel/:eventId payload into channel row array. */
export function unwrapContentChannelRows(
  data: unknown
): Record<string, unknown>[] {
  if (Array.isArray(data)) {
    return data.filter(
      (row): row is Record<string, unknown> =>
        Boolean(row) && typeof row === "object"
    );
  }
  if (
    data &&
    typeof data === "object" &&
    "formattedContents" in data &&
    Array.isArray((data as { formattedContents?: unknown[] }).formattedContents)
  ) {
    return (data as { formattedContents: unknown[] }).formattedContents.filter(
      (row): row is Record<string, unknown> =>
        Boolean(row) && typeof row === "object"
    );
  }
  return [];
}
