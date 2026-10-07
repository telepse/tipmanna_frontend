import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/actions/communities", () => ({
  getCommunityAccessStateAction: vi.fn(),
}));

vi.mock("@/actions/events", () => ({
  getEventCharacterCatalogAction: vi.fn(),
}));

vi.mock("@/actions/tv-schedule", () => ({
  fetchTvScheduleAction: vi.fn(),
}));

import { getCommunityAccessStateAction } from "@/actions/communities";
import { getEventCharacterCatalogAction } from "@/actions/events";
import { fetchTvScheduleAction } from "@/actions/tv-schedule";
import {
  emptyTvSsrBootstrap,
  isEntitledToCommunityTvSsrBootstrap,
  loadSsrTvBootstrap,
} from "@/lib/tv-ssr-live-tip-catalog";

const COMM = "comm-ssr-1";
const scheduleBody = {
  items: [{ channel: { eventId: "ev-1" } }],
  livePosition: { scheduleIndex: 0 },
};

describe("Community TV SSR fail-closed bootstrap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchTvScheduleAction).mockResolvedValue({
      success: true,
      data: { body: scheduleBody, etag: '"e1"' },
      error: null,
    });
    vi.mocked(getEventCharacterCatalogAction).mockResolvedValue({
      success: false,
      data: null,
      error: "skip catalog in unit test",
    });
  });

  it("global /tv does not probe community access-state", async () => {
    const result = await loadSsrTvBootstrap(null);
    expect(getCommunityAccessStateAction).not.toHaveBeenCalled();
    expect(fetchTvScheduleAction).toHaveBeenCalledWith(undefined);
    expect(result.ssrScheduleBootstrap?.body).toEqual(scheduleBody);
    expect(result.communityId).toBeNull();
    expect(result.ssrCommunityTvViewerEntitlement).toBe("unknown");
  });

  it("anonymous community URL gets empty bootstrap without schedule fetch", async () => {
    vi.mocked(getCommunityAccessStateAction).mockResolvedValue({
      success: true,
      data: { isMember: false, viewerHostsCommunity: false },
      error: null,
    });
    const result = await loadSsrTvBootstrap(COMM);
    expect(getCommunityAccessStateAction).toHaveBeenCalledWith(COMM);
    expect(fetchTvScheduleAction).not.toHaveBeenCalled();
    expect(result).toEqual(emptyTvSsrBootstrap(COMM, "denied"));
  });

  it("authenticated non-member gets empty bootstrap without schedule fetch", async () => {
    vi.mocked(getCommunityAccessStateAction).mockResolvedValue({
      success: true,
      data: { isMember: false, viewerHostsCommunity: false },
      error: null,
    });
    const result = await loadSsrTvBootstrap(COMM);
    expect(fetchTvScheduleAction).not.toHaveBeenCalled();
    expect(result.ssrScheduleBootstrap).toBeNull();
    expect(result.communityId).toBe(COMM);
    expect(result.ssrCommunityTvViewerEntitlement).toBe("denied");
  });

  it("active entitled member loads normal community bootstrap", async () => {
    vi.mocked(getCommunityAccessStateAction).mockResolvedValue({
      success: true,
      data: { isMember: true, viewerHostsCommunity: false },
      error: null,
    });
    const result = await loadSsrTvBootstrap(COMM);
    expect(fetchTvScheduleAction).toHaveBeenCalledWith({ communityId: COMM });
    expect(result.ssrScheduleBootstrap?.body).toEqual(scheduleBody);
    expect(result.communityId).toBe(COMM);
    expect(result.ssrCommunityTvViewerEntitlement).toBe("entitled");
  });

  it("owner without membership row loads normal bootstrap", async () => {
    vi.mocked(getCommunityAccessStateAction).mockResolvedValue({
      success: true,
      data: { isMember: false, viewerHostsCommunity: true },
      error: null,
    });
    const result = await loadSsrTvBootstrap(COMM);
    expect(fetchTvScheduleAction).toHaveBeenCalledWith({ communityId: COMM });
    expect(result.ssrScheduleBootstrap).not.toBeNull();
  });

  it("active co-creator via membership row loads normal bootstrap", async () => {
    vi.mocked(getCommunityAccessStateAction).mockResolvedValue({
      success: true,
      data: {
        isMember: true,
        viewerHostsCommunity: false,
        communityTvViewerEntitled: true,
      },
      error: null,
    });
    const result = await loadSsrTvBootstrap(COMM);
    expect(fetchTvScheduleAction).toHaveBeenCalled();
    expect(result.ssrScheduleBootstrap).not.toBeNull();
  });

  it("active co-creator without membership row loads bootstrap when backend flag set", async () => {
    vi.mocked(getCommunityAccessStateAction).mockResolvedValue({
      success: true,
      data: {
        isMember: false,
        viewerHostsCommunity: false,
        communityTvViewerEntitled: true,
      },
      error: null,
    });
    const result = await loadSsrTvBootstrap(COMM);
    expect(fetchTvScheduleAction).toHaveBeenCalledWith({ communityId: COMM });
    expect(result.ssrScheduleBootstrap).not.toBeNull();
  });

  it("visitor-only (access-state not member) gets empty bootstrap", async () => {
    vi.mocked(getCommunityAccessStateAction).mockResolvedValue({
      success: true,
      data: { isMember: false, viewerHostsCommunity: false },
      error: null,
    });
    expect(await isEntitledToCommunityTvSsrBootstrap(COMM)).toBe(false);
    expect(await loadSsrTvBootstrap(COMM)).toEqual(
      emptyTvSsrBootstrap(COMM, "denied")
    );
  });

  it("expired/revoked (not isMember) gets empty bootstrap", async () => {
    vi.mocked(getCommunityAccessStateAction).mockResolvedValue({
      success: true,
      data: { isMember: false, viewerHostsCommunity: false },
      error: null,
    });
    const result = await loadSsrTvBootstrap(COMM);
    expect(fetchTvScheduleAction).not.toHaveBeenCalled();
    expect(result.initialTvTipCatalog).toBeNull();
  });

  it("access-state failure (e.g. unavailable community) yields empty bootstrap", async () => {
    vi.mocked(getCommunityAccessStateAction).mockResolvedValue({
      success: false,
      data: null,
      error: "Community not found",
    });
    const result = await loadSsrTvBootstrap(COMM);
    expect(fetchTvScheduleAction).not.toHaveBeenCalled();
    expect(result).toEqual(emptyTvSsrBootstrap(COMM, "denied"));
  });

  it("entitled member still gets empty bootstrap when schedule fetch fails", async () => {
    vi.mocked(getCommunityAccessStateAction).mockResolvedValue({
      success: true,
      data: { isMember: true, viewerHostsCommunity: false },
      error: null,
    });
    vi.mocked(fetchTvScheduleAction).mockResolvedValue({
      success: false,
      data: null,
      error: "Schedule HTTP 404",
    });
    const result = await loadSsrTvBootstrap(COMM);
    expect(fetchTvScheduleAction).toHaveBeenCalled();
    expect(result).toEqual(emptyTvSsrBootstrap(COMM, "entitled"));
  });
});
