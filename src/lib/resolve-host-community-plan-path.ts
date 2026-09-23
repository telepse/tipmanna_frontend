import { getHostUserFromCookies } from "@/lib/host-session-client";
import type { HostCapability } from "@/hooks/use-host-capability";

export function manageHostCommunityHref(eventSlug: string): string {
  return `/host/${encodeURIComponent(eventSlug)}/host-community`;
}

/** Slug for post–start-interest redirect (never /dashboard/host-community). */
export function resolveHostCommunityPlanSlug(input: {
  preferredHostSlug?: string | null;
  capability: HostCapability;
}): string {
  const preferred = input.preferredHostSlug?.trim();
  if (preferred) return preferred;

  const hostSession = getHostUserFromCookies();
  const fromCookie =
    hostSession?.eventSlug?.trim() || hostSession?.username?.trim() || "";
  if (fromCookie) return fromCookie;

  if (
    input.capability.status === "active" ||
    input.capability.status === "stale"
  ) {
    return (
      input.capability.eventSlug?.trim() ||
      input.capability.username?.trim() ||
      ""
    );
  }
  return "";
}

export function resolveHostCommunityPlanPath(input: {
  preferredHostSlug?: string | null;
  capability: HostCapability;
}): string | null {
  const slug = resolveHostCommunityPlanSlug(input);
  return slug ? manageHostCommunityHref(slug) : null;
}
