import { describe, expect, it } from "vitest";

import {
  E2E_JOIN_COMMUNITY_ID,
  E2E_JOIN_FEATURED_VIDEOS,
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
    expect(row.url).toContain("youtube.com");
  });
});
