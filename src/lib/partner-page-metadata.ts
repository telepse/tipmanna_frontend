export type PartnerMetadataVariant = "default" | "pricing";

export const PARTNER_PAGE_METADATA = {
  default: {
    title: "Welcome to Tipmanna 💎⚡ — Participatory Community Media",
    description:
      "Tipmanna helps creators and communities turn audiences into active participants through TV, realtime engagement, memberships, and supporter experiences.",
    canonicalPath: "/partner",
  },
  pricing: {
    title: "Launch your own community TV network ⚡",
    description:
      "Build your own monetised media ecosystem with TV channels, memberships, livestreams, realtime engagement, and community infrastructure.",
    canonicalPath: "/partner?section=pricing#pricing",
  },
} as const;

export function resolvePartnerMetadataVariant(input: {
  section?: string | null;
  hash?: string | null;
}): PartnerMetadataVariant {
  const section = input.section?.trim();
  const hash = (input.hash ?? "").replace(/^#/, "").toLowerCase();
  if (section === "pricing" || hash === "pricing") {
    return "pricing";
  }
  return "default";
}

export function getPartnerMetadataForVariant(variant: PartnerMetadataVariant) {
  return PARTNER_PAGE_METADATA[variant];
}

/** Scroll target for partner deep links (`?section=pricing`, `#pricing`). */
export function resolvePartnerScrollTargetId(input: {
  pathname: string;
  section?: string | null;
  hash?: string | null;
}): string | null {
  if (input.pathname !== "/partner") return null;
  const variant = resolvePartnerMetadataVariant({
    section: input.section,
    hash: input.hash,
  });
  return variant === "pricing" ? "pricing" : null;
}
