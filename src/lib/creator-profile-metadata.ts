import type { HostCreatorPublicProfile } from "@/actions/host-creator";
import { buildCreatorProfileShareUrl } from "@/lib/creator-profile-url";
import { getPrimaryOrigin, getPublicAbsoluteUrl } from "@/lib/site-config";
import { formatCreatorProfileCategoryLabel } from "@/schemas/creator.schema";
import type { Metadata } from "next";

const DEFAULT_AVATAR =
  "https://res.cloudinary.com/tipmanna/image/upload/v1786172267/user_sce6gw.png";

const DEFAULT_BANNER =
  "https://res.cloudinary.com/tipmanna/image/upload/v1786171632/event_banner_hcqybl.webp";

const BIO_SNIPPET_MAX = 120;

export function formatCompactSocialCount(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 1,
  }).format(Math.max(0, value));
}

export function formatVideoCount(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 1,
  }).format(Math.max(0, value));
}

export function toAbsoluteMediaUrl(
  url: string | null | undefined
): string | null {
  if (!url?.trim()) return null;
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return getPublicAbsoluteUrl(
    trimmed.startsWith("/") ? trimmed : `/${trimmed}`
  );
}

function bioSnippet(description: string | null | undefined): string | null {
  const text = description?.trim();
  if (!text) return null;
  if (text.length <= BIO_SNIPPET_MAX) return text;
  return `${text.slice(0, BIO_SNIPPET_MAX - 1).trim()}…`;
}

export function resolveCreatorBannerUrl(
  profile: HostCreatorPublicProfile
): string {
  const fromEvent = profile.events.find(e =>
    e.eventBanner?.trim()
  )?.eventBanner;
  const fromCommunity = profile.communities.find(c =>
    c.eventRoomBanner?.trim()
  )?.eventRoomBanner;

  return (
    toAbsoluteMediaUrl(fromEvent) ??
    toAbsoluteMediaUrl(fromCommunity) ??
    DEFAULT_BANNER
  );
}

export function resolveCreatorAvatarUrl(
  profile: HostCreatorPublicProfile
): string {
  return toAbsoluteMediaUrl(profile.host.profileImageUrl) ?? DEFAULT_AVATAR;
}

export function buildCreatorProfileMetadata(
  profile: HostCreatorPublicProfile
): Metadata {
  const { host, stats } = profile;
  const handle = host.username.trim();
  const name = host.fullName.trim().split(" ")[0] || handle;
  const categoryLabel = formatCreatorProfileCategoryLabel(host.profileCategory);
  const membersLabel = formatCompactSocialCount(stats.totalSubscribers);
  const numOfVideosLabel = formatVideoCount(stats.totalVideos);
  const pageUrl = buildCreatorProfileShareUrl(handle);
  const avatarUrl = resolveCreatorAvatarUrl(profile);
  const bannerUrl = resolveCreatorBannerUrl(profile);
  const snippet = bioSnippet(host.pageDescription);

  const title = `${name} (@${handle}) | ${categoryLabel} Creator on Tipmanna`;
  const description = `Watch the latest ${categoryLabel} videos, live streams, and exclusive content from ${name}. Join ${membersLabel} members today!`;

  const ogDescription = snippet
    ? `Check out ${name}'s profile on Tipmanna. ${membersLabel} members. ${snippet}`
    : `Check out ${name}'s profile on Tipmanna. ${numOfVideosLabel} videos, ${membersLabel} subscribers. Explore videos, channels, and communities.`;

  const twitterDescription = `Explore exclusive ${categoryLabel} content from ${name} on Tipmanna.`;

  return {
    metadataBase: new URL(getPrimaryOrigin()),
    title,
    description,
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      type: "profile",
      title: `${name} (@${handle}) | Tipmanna`,
      description: ogDescription,
      url: pageUrl,
      siteName: "Tipmanna",
      username: handle,
      images: [
        {
          url: avatarUrl,
          alt: `${name} profile picture`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${name} (@${handle})`,
      description: twitterDescription,
      images: [bannerUrl],
    },
  };
}

export function buildCreatorProfileJsonLd(profile: HostCreatorPublicProfile) {
  const { host, stats } = profile;
  const handle = host.username.trim();
  const name = host.fullName.trim().split(" ")[0] || handle;
  const pageUrl = buildCreatorProfileShareUrl(handle);
  const avatarUrl = resolveCreatorAvatarUrl(profile);
  const externalUrl = host.externalLink?.url?.trim();

  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    mainEntity: {
      "@type": "Person",
      name,
      alternateName: handle,
      description: host.pageDescription ?? undefined,
      image: avatarUrl,
      url: pageUrl,
      ...(externalUrl && externalUrl !== "#" ? { sameAs: [externalUrl] } : {}),
      interactionStatistic: {
        "@type": "InteractionCounter",
        interactionType: "https://schema.org/FollowAction",
        userInteractionCount: stats.totalSubscribers,
      },
    },
  };
}
