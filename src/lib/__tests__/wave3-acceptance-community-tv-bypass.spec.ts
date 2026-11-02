import { afterEach, describe, expect, it } from "vitest";

import { resolveCommunityTvAccessGate } from "../tv-community-access-gate-logic";
import { isWave3AcceptanceCommunityTvE2eBypass } from "../wave3-acceptance-community-tv-bypass";

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
