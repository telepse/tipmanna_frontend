import { describe, expect, it } from "vitest";
import {
  buildStartCommunityHubReturnTo,
  shouldOpenStartCommunityFromSearch,
  START_COMMUNITY_RESUME_QUERY,
} from "../start-community-resume";

describe("start-community-resume", () => {
  it("builds hub returnTo with startCommunity flag", () => {
    const href = buildStartCommunityHubReturnTo("/explore?tab=my-communities");
    expect(href).toContain("tab=my-communities");
    expect(href).toContain(`${START_COMMUNITY_RESUME_QUERY}=1`);
  });

  it("recognizes resume query values", () => {
    expect(shouldOpenStartCommunityFromSearch("1")).toBe(true);
    expect(shouldOpenStartCommunityFromSearch("true")).toBe(true);
    expect(shouldOpenStartCommunityFromSearch(null)).toBe(false);
    expect(shouldOpenStartCommunityFromSearch("0")).toBe(false);
  });
});
