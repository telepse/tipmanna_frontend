import { afterEach, describe, expect, it } from "vitest";

import { resolveCommunityTvAccessGate } from "../tv-community-access-gate-logic";
import {
  buildWave3AcceptanceCommunityTvSchedulePayload,
  isWave3AcceptanceCommunityTvE2eBypass,
  WAVE3_ACCEPTANCE_COMMUNITY_TV_MEDIA_URL,
} from "../wave3-acceptance-community-tv-bypass";
import { extractYoutubeID } from "../extractYoutubeID";

describe("Wave 3 acceptance community TV bypass", () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_ENABLE_EXPLORE_E2E_FIXTURES;
  });

  it("allows only the acceptance community when E2E fixtures build flag is on", () => {
    process.env.NEXT_PUBLIC_ENABLE_EXPLORE_E2E_FIXTURES = "1";
    expect(
      isWave3AcceptanceCommunityTvE2eBypass(
        "00000000-0000-4000-8000-000000000001"
      )
    ).toBe(true);
    expect(isWave3AcceptanceCommunityTvE2eBypass("other-community")).toBe(false);
  });

  it("synthetic schedule uses a playable YouTube URL", () => {
    expect(extractYoutubeID(WAVE3_ACCEPTANCE_COMMUNITY_TV_MEDIA_URL)).toBeTruthy();
    const payload = buildWave3AcceptanceCommunityTvSchedulePayload();
    expect(extractYoutubeID(payload.items[0]?.channel?.url ?? "")).toBeTruthy();
  });

  it("resolveCommunityTvAccessGate allows acceptance community under bypass", () => {
    process.env.NEXT_PUBLIC_ENABLE_EXPLORE_E2E_FIXTURES = "1";
    const res = resolveCommunityTvAccessGate(
      "00000000-0000-4000-8000-000000000001",
      false,
      null
    );
    expect(res.outcome).toBe("allowed");
  });
});
