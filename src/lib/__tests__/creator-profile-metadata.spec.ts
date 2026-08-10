import { describe, expect, it } from "vitest";

import type { HostCreatorPublicProfile } from "@/actions/host-creator";
import {
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
  youtubeChannels: [],
  events: [],
  communities: [],
  playlists: [],
};

describe("creator profile metadata", () => {
  it("formats compact member counts", () => {
    expect(formatCompactSocialCount(14532)).toBe("14.5K");
    expect(formatCompactSocialCount(450)).toBe("450");
  });

  it("builds title and description from name, category, and members", () => {
    const metadata = buildCreatorProfileMetadata(baseProfile);

    expect(metadata.title).toBe(
      "Alex Rivers (@AlexDraws) | Content creator Creator on Tipmanna"
    );
    expect(metadata.description).toContain("Alex Rivers");
    expect(metadata.description).toContain("14.5K members");
    expect(metadata.description).toContain("Content creator");
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

    expect(metadata.openGraph?.images?.[0]?.url).toContain("avatar.jpg");
    expect(metadata.twitter?.images?.[0]).toContain("banner.jpg");
    expect(metadata.openGraph?.type).toBe("profile");
    expect(metadata.openGraph?.username).toBe("AlexDraws");
  });
});
