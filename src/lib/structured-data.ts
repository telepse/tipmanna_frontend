import { getPublicAbsoluteUrl } from "@/lib/site-config";
import { extractYoutubeID } from "@/lib/extractYoutubeID";

type VideoJsonLdInput = {
  title: string;
  hostName: string;
  url: string;
  videoUrl?: string;
  description?: string;
  uploadDate?: string;
  /** Overrides YouTube-derived thumbnail when set (e.g. TipLink banner). */
  thumbnailUrl?: string | null;
};

export function buildVideoObjectJsonLd(input: VideoJsonLdInput) {
  const ytId = input.videoUrl ? extractYoutubeID(input.videoUrl) : null;
  const ytThumb = ytId
    ? `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`
    : undefined;
  const thumbnailUrl = input.thumbnailUrl?.trim() || ytThumb;

  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: input.title,
    description:
      input.description ??
      `Watch "${input.title}" by ${input.hostName} on Tipmanna.`,
    uploadDate: input.uploadDate,
    url: input.url,
    ...(ytId ? { embedUrl: `https://www.youtube.com/embed/${ytId}` } : {}),
    ...(thumbnailUrl ? { thumbnailUrl } : {}),
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

export function buildFaqPageJsonLd(
  faqs: ReadonlyArray<{ question: string; answer: string }>
) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(faq => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

export function buildPartnerOffersJsonLd(
  plans: ReadonlyArray<{
    name: string;
    price: string;
    description: string;
    features: string[];
  }>,
  pageUrl: string
) {
  return plans.map(plan => {
    const numericPrice = plan.price.replace(/[^\d.]/g, "");
    return {
      "@context": "https://schema.org",
      "@type": "Product",
      name: `Tipmanna ${plan.name}`,
      description: plan.description,
      url: pageUrl,
      brand: {
        "@type": "Organization",
        name: "Tipmanna",
      },
      offers: {
        "@type": "Offer",
        price: numericPrice || "0",
        priceCurrency: "GBP",
        availability: "https://schema.org/InStock",
        url: `${pageUrl}#pricing`,
        description: plan.features.join(". "),
      },
    };
  });
}
