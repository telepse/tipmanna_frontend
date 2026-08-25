export const PARTNER_PAGE_METADATA = {
  title: "Welcome to Tipmanna 💎⚡ — Participatory Community Media",
  description:
    "Tipmanna helps creators and communities turn audiences into active participants through TV, realtime engagement, memberships, and supporter experiences.",
  canonicalPath: "/partner",
} as const;

/** Scroll target for partner deep links (`?section=pricing`, `#pricing`). */
export function resolvePartnerScrollTargetId(input: {
  pathname: string;
  section?: string | null;
  hash?: string | null;
}): string | null {
  if (input.pathname !== "/partner") return null;

  const section = input.section?.trim();
  const hash = (input.hash ?? "").replace(/^#/, "").toLowerCase();
  if (section === "pricing" || hash === "pricing") {
    return "pricing";
  }
  return null;
}
