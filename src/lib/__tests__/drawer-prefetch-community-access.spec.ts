import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/actions/communities", () => ({
  getCommunityAccessStateAction: vi.fn(),
}));

import { getCommunityAccessStateAction } from "@/actions/communities";
import {
  fetchCommunityAccessStateCached,
  getCachedCommunityAccessState,
  invalidateCommunityAccessState,
} from "@/lib/drawer-prefetch-cache";

describe("community access drawer cache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("invalidate clears cached access state", async () => {
    const guest = { isMember: false };
    const member = { isMember: true };
    vi.mocked(getCommunityAccessStateAction)
      .mockResolvedValueOnce({ success: true, error: null, data: guest })
      .mockResolvedValueOnce({ success: true, error: null, data: member });

    const id = "community-gap1-a";
    await fetchCommunityAccessStateCached(id);
    expect(getCachedCommunityAccessState(id)).toEqual(guest);

    invalidateCommunityAccessState(id);
    expect(getCachedCommunityAccessState(id)).toBeNull();

    const fresh = await fetchCommunityAccessStateCached(id);
    expect(fresh).toEqual(member);
    expect(getCommunityAccessStateAction).toHaveBeenCalledTimes(2);
  });

  it("force bypasses cache and refetches", async () => {
    const guest = { isMember: false };
    const member = { isMember: true };
    vi.mocked(getCommunityAccessStateAction)
      .mockResolvedValueOnce({ success: true, error: null, data: guest })
      .mockResolvedValueOnce({ success: true, error: null, data: member });

    const id = "community-gap1-b";
    await fetchCommunityAccessStateCached(id);
    expect(getCachedCommunityAccessState(id)).toEqual(guest);

    const forced = await fetchCommunityAccessStateCached(id, { force: true });
    expect(forced).toEqual(member);
    expect(getCommunityAccessStateAction).toHaveBeenCalledTimes(2);
  });
});
