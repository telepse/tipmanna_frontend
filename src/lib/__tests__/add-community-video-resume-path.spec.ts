import { describe, expect, it } from "vitest";

import { buildAddCommunityVideoSubscriptionResumePath } from "@/lib/add-community-video-resume-path";

describe("buildAddCommunityVideoSubscriptionResumePath", () => {
  const communityId = "comm-abc";

  it("uses dashboard keys on host-community path", () => {
    const path = buildAddCommunityVideoSubscriptionResumePath(
      "/host/my-event/host-community",
      communityId
    );
    expect(path).toContain("communityId=comm-abc");
    expect(path).toContain("addVideo=1");
    expect(path).not.toContain("addCommunityVideo");
  });

  it("uses creator keys on creator profile path", () => {
    const path = buildAddCommunityVideoSubscriptionResumePath(
      "/u/@creator",
      communityId
    );
    expect(path).toContain("addCommunityVideo=1");
    expect(path).toContain("addCommunityVideoId=comm-abc");
    expect(path).not.toContain("addVideo=1");
  });
});
