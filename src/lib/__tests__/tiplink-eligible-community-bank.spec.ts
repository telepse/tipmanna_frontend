import { describe, expect, it } from "vitest";

import { listTipLinkEligibleCommunityBankVideos } from "@/lib/tiplink-eligible-videos";
import type { CommunityContentBankVideo } from "@/actions/communities";

const publicApproved = (
  channelId: string,
  title = "Bank track"
): CommunityContentBankVideo => ({
  id: `entry-${channelId}`,
  status: "approved",
  visibility: "public",
  createdAt: "2024-01-01",
  submittedBy: {
    id: "host-submitter",
    fullName: "Submitter",
    username: "submitter",
  },
  channel: {
    id: channelId,
    title,
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    isLive: false,
    eventVideoType: null,
    sharePath: "/c/x",
    shareUrl: "https://example.com/c/x",
  },
  metrics: {
    encounters: 0,
    completes: 0,
    saves: 0,
    shares: 0,
    comments: 0,
    numOfTips: 0,
    durationSeconds: 0,
    amountRaised: 0,
  },
});

describe("listTipLinkEligibleCommunityBankVideos", () => {
  it("emits community-linked eventId on eligible public bank videos", () => {
    const rows = listTipLinkEligibleCommunityBankVideos(
      "comm-1",
      "My Community",
      [publicApproved("ch-1")],
      [],
      [],
      "event-community-1"
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      channelId: "ch-1",
      eventId: "event-community-1",
      source: "community_bank",
      communityId: "comm-1",
      communityName: "My Community",
    });
  });

  it("omits all videos when eventId is missing", () => {
    expect(
      listTipLinkEligibleCommunityBankVideos(
        "comm-1",
        "My Community",
        [publicApproved("ch-1")],
        [],
        [],
        null
      )
    ).toEqual([]);
    expect(
      listTipLinkEligibleCommunityBankVideos(
        "comm-1",
        "My Community",
        [publicApproved("ch-1")],
        [],
        [],
        "   "
      )
    ).toEqual([]);
  });

  it("skips private bank videos", () => {
    const privateVid = publicApproved("ch-priv");
    privateVid.visibility = "private";
    expect(
      listTipLinkEligibleCommunityBankVideos(
        "comm-1",
        "My Community",
        [privateVid],
        [],
        [],
        "event-1"
      )
    ).toEqual([]);
  });
});
