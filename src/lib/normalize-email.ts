/** Match backend normalize-email.util.ts for client-side auth forms. */
export function normalizeEmail(raw: unknown): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase();
}
