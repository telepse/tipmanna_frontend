import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/actions/auth", () => ({
  getHostLinkAction: vi.fn(),
}));

import { getHostLinkAction } from "@/actions/auth";
import {
  getCachedHostLink,
  getOrFetchHostLink,
  invalidateHostLinkCache,
} from "@/lib/host-link-cache";

const mockedGetHostLink = vi.mocked(getHostLinkAction);

describe("host-link cache", () => {
  afterEach(() => {
    invalidateHostLinkCache();
    vi.clearAllMocks();
  });

  it("single-flights concurrent fetches for the same user", async () => {
    let resolveFetch!: (
      value: Awaited<ReturnType<typeof getHostLinkAction>>
    ) => void;
    mockedGetHostLink.mockReturnValue(
      new Promise(resolve => {
        resolveFetch = resolve;
      }) as ReturnType<typeof getHostLinkAction>
    );

    const p1 = getOrFetchHostLink("u1", "token");
    const p2 = getOrFetchHostLink("u1", "token");

    resolveFetch({
      success: true,
      data: {
        hasHost: true,
        hostId: "h1",
        eventSlug: "slug",
        username: "host",
      },
      error: null,
    });

    const [a, b] = await Promise.all([p1, p2]);
    expect(a.success && a.data?.hostId).toBe("h1");
    expect(b.success && b.data?.hostId).toBe("h1");
    expect(mockedGetHostLink).toHaveBeenCalledTimes(1);
  });

  it("refetches after invalidate", async () => {
    mockedGetHostLink
      .mockResolvedValueOnce({
        success: true,
        data: {
          hasHost: false,
          hostId: null,
          eventSlug: null,
          username: null,
        },
        error: null,
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          hasHost: true,
          hostId: "h2",
          eventSlug: "slug",
          username: "host",
        },
        error: null,
      });

    const first = await getOrFetchHostLink("u1", "token");
    expect(first.success && first.data?.hasHost).toBe(false);

    invalidateHostLinkCache("u1");

    const second = await getOrFetchHostLink("u1", "token");
    expect(second.success && second.data?.hasHost).toBe(true);
    expect(mockedGetHostLink).toHaveBeenCalledTimes(2);
  });

  it("invalidate clears cached row", async () => {
    mockedGetHostLink.mockResolvedValue({
      success: true,
      data: {
        hasHost: true,
        hostId: "h1",
        eventSlug: null,
        username: null,
      },
      error: null,
    });

    await getOrFetchHostLink("u1", "token");
    expect(getCachedHostLink("u1")?.hostId).toBe("h1");

    invalidateHostLinkCache("u1");
    expect(getCachedHostLink("u1")).toBeNull();
  });
});
