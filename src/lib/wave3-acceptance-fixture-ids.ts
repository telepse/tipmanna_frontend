/** Staging S7b acceptance fixtures (public, non-secret). */
export const WAVE3_ACCEPTANCE_COMMUNITY_TV_ID =
  "00000000-0000-4000-8000-000000000001";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Deterministic UUID-shaped ids for Explore E2E feed rows (ingest-safe). */
export function e2eExploreFeedChannelId(index: number): string {
  const n = Math.max(1, Math.min(9999, index));
  const tail = n.toString(16).padStart(12, "0").slice(-12);
  const id = `e2efe000-0000-4000-8000-${tail}`;
  if (!UUID_RE.test(id)) {
    throw new Error(`invalid e2e channel fixture id for index ${index}`);
  }
  return id;
}

export function e2eExploreFeedEventId(index: number): string {
  const n = Math.max(1, Math.min(9999, index));
  const tail = n.toString(16).padStart(12, "0").slice(-12);
  const id = `e2efe001-0000-4000-8000-${tail}`;
  if (!UUID_RE.test(id)) {
    throw new Error(`invalid e2e event fixture id for index ${index}`);
  }
  return id;
}
