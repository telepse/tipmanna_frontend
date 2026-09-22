export type HostPremiumTab =
  | "channel_manage"
  | "video_requests"
  | "video_coowners"
  | "advanced_video_analytics"
  | "playlist"
  | "event_room_access_control";

export type HostCommunityMainTab =
  | "bank"
  | "cocreators"
  | "membership"
  | "subscribers"
  | "activation";

export type CommunityTvTab =
  | "schedule"
  | "control"
  | "reports"
  | "reminders"
  | "themes";

const PREMIUM_TABS = new Set<string>([
  "video_requests",
  "video_coowners",
  "advanced_video_analytics",
  "playlist",
  "event_room_access_control",
]);

const COMMUNITY_TABS = new Set<string>([
  "bank",
  "cocreators",
  "membership",
  "subscribers",
  "activation",
]);

const TV_TABS = new Set<string>([
  "schedule",
  "control",
  "reports",
  "reminders",
  "themes",
]);

export function buildTipLayoutHref(hostSlug: string, eventId: string): string {
  return `/host/${hostSlug}/tip-customization/${eventId}`;
}

export function buildHostPremiumHref(
  hostSlug: string,
  tab: HostPremiumTab
): string {
  return `/host/${hostSlug}/host-premium?tab=${encodeURIComponent(tab)}`;
}

export function buildHostCommunityHref(
  hostSlug: string,
  communityId: string,
  tab?: HostCommunityMainTab
): string {
  const base = `/host/${hostSlug}/host-community?communityId=${encodeURIComponent(communityId)}`;
  return tab ? `${base}&tab=${encodeURIComponent(tab)}` : base;
}

export function buildCommunityTvHref(
  hostSlug: string,
  communityId: string,
  tab: CommunityTvTab = "schedule"
): string {
  return `/host/${hostSlug}/community-tv?communityId=${encodeURIComponent(communityId)}&tab=${encodeURIComponent(tab)}`;
}

export function buildCommunityAnalyticsHref(
  hostSlug: string,
  communityId: string
): string {
  return `/host/${hostSlug}/community-analytics?communityId=${encodeURIComponent(communityId)}`;
}

export function buildCommunityCustomizationHref(
  hostSlug: string,
  communityId: string
): string {
  return `/host/${hostSlug}/community-customization?communityId=${encodeURIComponent(communityId)}`;
}

export function parseHostPremiumTab(
  value: string | null
): HostPremiumTab | null {
  if (!value || !PREMIUM_TABS.has(value)) return null;
  return value as HostPremiumTab;
}

export function parseHostCommunityTab(
  value: string | null
): HostCommunityMainTab | null {
  if (!value || !COMMUNITY_TABS.has(value)) return null;
  return value as HostCommunityMainTab;
}

export function parseCommunityTvTab(value: string | null): CommunityTvTab {
  if (value && TV_TABS.has(value)) return value as CommunityTvTab;
  return "schedule";
}

export function isHostCommunityOwnerTab(tab: HostCommunityMainTab): boolean {
  return COMMUNITY_TABS.has(tab);
}
