import { getPublicAbsoluteUrl } from "@/lib/site-config";
import { extractYoutubeID } from "@/lib/extractYoutubeID";

type VideoJsonLdInput = {
  title: string;
  hostName: string;
  url: string;
  videoUrl?: string;
  description?: string;
  uploadDate?: string;
};

export function buildVideoObjectJsonLd(input: VideoJsonLdInput) {
  const ytId = input.videoUrl ? extractYoutubeID(input.videoUrl) : null;
  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: input.title,
    description:
      input.description ??
      `Watch "${input.title}" by ${input.hostName} on Tipmanna.`,
    uploadDate: input.uploadDate,
    url: input.url,
    ...(ytId
      ? {
          embedUrl: `https://www.youtube.com/embed/${ytId}`,
          thumbnailUrl: `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`,
        }
      : {}),
    publisher: {
      "@type": "Organization",
      name: "Tipmanna",
      url: getPublicAbsoluteUrl("/explore"),
    },
  };
}

export function buildBroadcastEventJsonLd(input: {
  title: string;
  description?: string;
  startDate: string;
  url: string;
  image?: string | null;
  organizerName?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "BroadcastEvent",
    name: input.title,
    description: input.description,
    startDate: input.startDate,
    url: input.url,
    ...(input.image ? { image: input.image } : {}),
    ...(input.organizerName
      ? {
          organizer: {
            "@type": "Organization",
            name: input.organizerName,
          },
        }
      : {}),
  };
}

export function buildOrganizationJsonLd(input: {
  name: string;
  description?: string | null;
  url: string;
  logo?: string | null;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: input.name,
    description: input.description ?? undefined,
    url: input.url,
    ...(input.logo ? { logo: input.logo } : {}),
  };
}
