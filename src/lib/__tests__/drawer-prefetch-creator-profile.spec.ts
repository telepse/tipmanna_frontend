import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/actions/host-creator", () => ({
  getHostCreatorPublicProfileAction: vi.fn(),
}));

import { getHostCreatorPublicProfileAction } from "@/actions/host-creator";
import {
  fetchCreatorProfileCached,
  getCachedCreatorProfile,
  invalidateCreatorProfile,
} from "@/lib/drawer-prefetch-cache";

describe("creator profile drawer cache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateCreatorProfile("force-user-a");
    invalidateCreatorProfile("force-user-b");
  });

  it("force invalidates cache and refetches", async () => {
    const first = {
      host: { id: "h1", username: "force-user-a" },
    } as never;
    const second = {
      host: { id: "h1", username: "force-user-a", fullName: "Updated" },
    } as never;
    vi.mocked(getHostCreatorPublicProfileAction)
      .mockResolvedValueOnce({ success: true, error: null, data: first })
      .mockResolvedValueOnce({ success: true, error: null, data: second });

    await fetchCreatorProfileCached("force-user-a");
    expect(getCachedCreatorProfile("force-user-a")).toEqual(first);

    const forced = await fetchCreatorProfileCached("force-user-a", {
      force: true,
    });
    expect(forced).toEqual(second);
    expect(getHostCreatorPublicProfileAction).toHaveBeenCalledTimes(2);
  });

  it("force clears hung inflight so Retry starts a new request", async () => {
    let resolveFirst!: (value: unknown) => void;
    const firstPromise = new Promise(resolve => {
      resolveFirst = resolve;
    });
    vi.mocked(getHostCreatorPublicProfileAction)
      .mockImplementationOnce(() => firstPromise as never)
      .mockResolvedValueOnce({
        success: true,
        error: null,
        data: { host: { id: "h1", username: "force-user-b" } },
      } as never);

    const hung = fetchCreatorProfileCached("force-user-b");
    const forced = fetchCreatorProfileCached("force-user-b", { force: true });

    resolveFirst({
      success: true,
      error: null,
      data: { host: { id: "h1", username: "force-user-b", stale: true } },
    });
    await hung;
    const result = await forced;
    expect(result).toMatchObject({ host: { username: "force-user-b" } });
    expect(getHostCreatorPublicProfileAction).toHaveBeenCalledTimes(2);
  });
});
