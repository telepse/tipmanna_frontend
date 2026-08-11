import type { HostCreatorPublicProfile } from "@/actions/host-creator";
import { buildCreatorProfileShareUrl } from "@/lib/creator-profile-url";
import { getPrimaryOrigin, getPublicAbsoluteUrl } from "@/lib/site-config";
import { formatCreatorProfileCategoryLabel } from "@/schemas/creator.schema";
import type { Metadata } from "next";

const DEFAULT_AVATAR =
  "https://res.cloudinary.com/tipmanna/image/upload/v1786172267/user_sce6gw.png";

const DEFAULT_BANNER =
  "https://res.cloudinary.com/tipmanna/image/upload/v1786171632/event_banner_hcqybl.webp";

const DEFAULT_COMMUNITY_LOGO =
  "https://res.cloudinary.com/tipmanna/image/upload/v1786172267/user_sce6gw.png";

const BIO_SNIPPET_MAX = 120;
const META_DESCRIPTION_LINE_MAX = 120;

export const OG_SQUARE_IMAGE_SIZE = 200;

export function toOgSquareImageUrl(
  url: string,
  options?: { focusFace?: boolean }
): string {
  const size = OG_SQUARE_IMAGE_SIZE;
  const crop = options?.focusFace
    ? `c_fill,w_${size},h_${size},g_face`
    : `c_fill,w_${size},h_${size}`;

  if (!url.includes("/image/upload/") || /\/image\/upload\/c_/.test(url)) {
    return url;
  }

  return url.replace("/image/upload/", `/image/upload/${crop}/`);
}

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

function truncateMetaDescriptionLine(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  if (trimmed.length <= META_DESCRIPTION_LINE_MAX) return trimmed;
  return `${trimmed.slice(0, META_DESCRIPTION_LINE_MAX - 1).trim()}…`;
}

/** SEO / OG descriptions: exactly three lines (metrics, body, CTA). */
export function buildThreeLineMetaDescription(
  line1: string,
  line2: string,
  line3: string
): string {
  return [line1, line2, line3]
    .map(truncateMetaDescriptionLine)
    .filter(Boolean)
    .join("\n");
}

export function formatMetaMetricsLine(input: {
  members: number;
  tips: number;
  videos: number;
}): string {
  const members = formatCompactSocialCount(input.members);
  const tips = formatCompactSocialCount(input.tips);
  const videos = formatVideoCount(input.videos);
  return `${members} members · ${tips} tips · ${videos} videos`;
}

export function buildCommunityMetaDescription(input: {
  memberCount?: number;
  totalTips?: number;
  numVideos?: number;
  description?: string | null;
  name?: string;
}): string {
  const metrics = formatMetaMetricsLine({
    members: input.memberCount ?? 0,
    tips: input.totalTips ?? 0,
    videos: input.numVideos ?? 0,
  });
  const body =
    bioSnippet(input.description) ??
    `Discover clips and connect with members of ${input.name?.trim() || "this community"}.`;
  return buildThreeLineMetaDescription(
    metrics,
    body,
    "Join this community on Tipmanna TV."
  );
}

export function buildCreatorMetaDescription(input: {
  name: string;
  categoryLabel: string;
  members: number;
  tips: number;
  videos: number;
  pageDescription?: string | null;
}): string {
  const metrics = formatMetaMetricsLine({
    members: input.members,
    tips: input.tips,
    videos: input.videos,
  });
  const body =
    bioSnippet(input.pageDescription) ??
    `Watch the latest ${input.categoryLabel.toLowerCase()} videos, live streams, and exclusive content from ${input.name}.`;
  return buildThreeLineMetaDescription(
    metrics,
    body,
    `Explore ${input.name}'s profile on Tipmanna.`
  );
}

export function resolveCommunityLogoUrl(
  logoUrl: string | null | undefined
): string {
  return toAbsoluteMediaUrl(logoUrl) ?? DEFAULT_COMMUNITY_LOGO;
}

export function buildCommunityJoinMetadata(input: {
  id: string;
  name: string;
  description: string;
  logoUrl?: string | null;
}): Metadata {
  const pageUrl = getPublicAbsoluteUrl(
    `/community/${encodeURIComponent(input.id)}/join`
  );
  const title = `Join ${input.name} | community on Tipmanna`;
  const absoluteLogoUrl = resolveCommunityLogoUrl(input.logoUrl);
  const ogLogoUrl = toOgSquareImageUrl(absoluteLogoUrl, { focusFace: false });

  return {
    metadataBase: new URL(getPrimaryOrigin()),
    title,
    description: input.description,
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      title,
      description: input.description,
      url: pageUrl,
      siteName: "Tipmanna",
      type: "website",
      images: [
        {
          url: ogLogoUrl,
          width: OG_SQUARE_IMAGE_SIZE,
          height: OG_SQUARE_IMAGE_SIZE,
          alt: `${input.name} logo`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: input.description,
      images: [ogLogoUrl],
    },
  };
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
  const pageUrl = buildCreatorProfileShareUrl(handle);
  const avatarUrl = resolveCreatorAvatarUrl(profile);
  const ogAvatarUrl = toOgSquareImageUrl(avatarUrl, { focusFace: true });
  const bannerUrl = resolveCreatorBannerUrl(profile);
  const threeLineDescription = buildCreatorMetaDescription({
    name,
    categoryLabel,
    members: stats.totalSubscribers,
    tips: stats.totalTipCount,
    videos: stats.totalVideos,
    pageDescription: host.pageDescription,
  });

  const title = `${name} (@${handle}) | ${categoryLabel} Creator on Tipmanna`;
  const description = threeLineDescription;
  const ogDescription = threeLineDescription;
  const twitterDescription = threeLineDescription;

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
          url: ogAvatarUrl,
          width: OG_SQUARE_IMAGE_SIZE,
          height: OG_SQUARE_IMAGE_SIZE,
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
