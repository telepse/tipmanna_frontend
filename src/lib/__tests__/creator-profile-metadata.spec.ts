import { describe, expect, it } from "vitest";
import type { Metadata } from "next";

import type { HostCreatorPublicProfile } from "@/actions/host-creator";
import {
  buildCommunityMetaDescription,
  buildCreatorProfileMetadata,
  formatCompactSocialCount,
} from "@/lib/creator-profile-metadata";

const baseProfile: HostCreatorPublicProfile = {
  host: {
    id: "host-1",
    username: "AlexDraws",
    fullName: "Alex Rivers",
    eventSlug: "alex",
    createdAt: "2024-01-01T00:00:00.000Z",
    profileImageUrl:
      "https://res.cloudinary.com/tipmanna/image/upload/v1/avatar.jpg",
    pageDescription:
      "Creating daily cyberpunk art tutorials and animation breakdowns.",
    profileCategory: "content_creator",
    externalLink: null,
  },
  stats: {
    totalVideos: 12,
    totalTipsReceived: 500,
    totalTipCount: 40,
    totalEncounters: 9000,
    totalSubscribers: 14532,
    totalSaves: 10,
    totalShares: 5,
    totalTvFeatures: 2,
    totalComments: 30,
  },
  contents: [],
  coOwnedVideos: [],
  youtubeChannels: [],
  events: [],
  communities: [],
  playlists: [],
};

function toMediaUrl(value: string | URL | undefined): string | undefined {
  if (!value) return undefined;
  return typeof value === "string" ? value : value.toString();
}

function firstOgImageUrl(
  images: NonNullable<Metadata["openGraph"]>["images"]
): string | undefined {
  if (!images) return undefined;
  const first = Array.isArray(images) ? images[0] : images;
  if (typeof first === "string" || first instanceof URL) {
    return toMediaUrl(first);
  }
  return toMediaUrl(first?.url);
}

function firstTwitterImageUrl(
  images: NonNullable<Metadata["twitter"]>["images"]
): string | undefined {
  if (!images) return undefined;
  const first = Array.isArray(images) ? images[0] : images;
  if (typeof first === "string" || first instanceof URL) {
    return toMediaUrl(first);
  }
  return toMediaUrl(first?.url);
}

describe("creator profile metadata", () => {
  it("formats compact member counts", () => {
    expect(formatCompactSocialCount(14532)).toBe("14.5K");
    expect(formatCompactSocialCount(450)).toBe("450");
  });

  it("builds title and three-line description starting with metrics", () => {
    const metadata = buildCreatorProfileMetadata(baseProfile);

    expect(metadata.title).toBe(
      "Alex (@AlexDraws) | Content creator Creator on Tipmanna"
    );
    expect(metadata.description).toContain("14.5K members");
    expect(metadata.description).toContain("40 tips");
    expect(metadata.description).toContain("12 videos");
    expect(metadata.description?.split("\n")).toHaveLength(3);
  });

  it("builds community meta description with logo metrics first", () => {
    const description = buildCommunityMetaDescription({
      name: "Design Club",
      memberCount: 1200,
      totalTips: 450,
      numVideos: 32,
      description: "A community for designers sharing tips and tutorials.",
    });

    expect(description.split("\n")).toHaveLength(3);
    expect(description).toMatch(/^1.2K members · 450 tips · 32 videos/);
  });

  it("uses avatar for open graph and banner fallback for twitter", () => {
    const metadata = buildCreatorProfileMetadata({
      ...baseProfile,
      events: [
        {
          id: "evt-1",
          eventName: "Main channel",
          eventSlug: "main",
          eventBanner:
            "https://res.cloudinary.com/tipmanna/image/upload/v1/banner.jpg",
          submissionKind: "content_only",
          numOfTips: 0,
          amountRaised: 0,
          createdAt: "2024-01-01T00:00:00.000Z",
          locked: false,
          videos: [],
          startTime: "",
          endTime: "",
          eventDate: "",
          organizationName: null,
        },
      ],
    });

    expect(firstOgImageUrl(metadata.openGraph?.images)).toContain("avatar.jpg");
    expect(firstTwitterImageUrl(metadata.twitter?.images)).toContain(
      "banner.jpg"
    );

    const openGraph = metadata.openGraph;
    expect(openGraph && "username" in openGraph ? openGraph.type : null).toBe(
      "profile"
    );
    expect(
      openGraph && "username" in openGraph ? openGraph.username : null
    ).toBe("AlexDraws");
  });
});
