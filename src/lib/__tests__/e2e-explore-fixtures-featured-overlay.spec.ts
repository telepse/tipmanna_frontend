import { describe, expect, it } from "vitest";

import {
  E2E_FIXTURE_MEDIA_URL,
  E2E_FEED_ALL_ITEMS,
  E2E_JOIN_COMMUNITY_ID,
  E2E_JOIN_FEATURED_VIDEOS,
  E2E_TV_HANDOFF,
} from "../e2e-explore-fixtures";

describe("E2E join featured overlay fixture", () => {
  it("provides one playable featured row with event and channel ids", () => {
    expect(E2E_JOIN_COMMUNITY_ID).toMatch(
      /^11111111-1111-4111-8111-111111111111$/
    );
    expect(E2E_JOIN_FEATURED_VIDEOS).toHaveLength(1);
    const row = E2E_JOIN_FEATURED_VIDEOS[0];
    expect(row.eventId).toBeTruthy();
    expect(row.channelId).toBeTruthy();
    expect(row.title).toBe("E2E Featured overlay clip");
  });

  it("uses same-origin poster media (no YouTube / external player hosts)", () => {
    expect(E2E_FIXTURE_MEDIA_URL.startsWith("/")).toBe(true);
    expect(E2E_FIXTURE_MEDIA_URL).not.toMatch(/youtube|youtu\.be|ytimg/i);
    expect(E2E_JOIN_FEATURED_VIDEOS[0].url).toBe(E2E_FIXTURE_MEDIA_URL);
    for (const item of E2E_FEED_ALL_ITEMS) {
      expect(item.url).toBe(E2E_FIXTURE_MEDIA_URL);
    }
    expect(E2E_TV_HANDOFF.currentProgramme.channel.url).toBe(
      E2E_FIXTURE_MEDIA_URL
    );
    expect(E2E_TV_HANDOFF.nextProgramme.channel.url).toBe(
      E2E_FIXTURE_MEDIA_URL
    );
  });
});
