/** Prefer API-resolved email over a username typed in emailOrUsername. */
export function resolvedEmailFromAuthPayload(
  data: unknown,
  fallback: string
): string {
  const fromApi =
    data && typeof data === "object" && "email" in data
      ? String((data as { email?: unknown }).email ?? "").trim()
      : "";
  if (fromApi.includes("@")) return fromApi;
  const fb = fallback.trim();
  if (fb.includes("@")) return fb;
  return fromApi || fb;
}
