import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchTvScheduleClient } from "../tv-schedule-client-fetch";

describe("fetchTvScheduleClient correlation headers", () => {
  const originalBase = process.env.NEXT_PUBLIC_BACKEND_API_URL;

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalBase === undefined) {
      delete process.env.NEXT_PUBLIC_BACKEND_API_URL;
    } else {
      process.env.NEXT_PUBLIC_BACKEND_API_URL = originalBase;
    }
  });

  it("forwards startup trace id and schedule attempt id on direct fetch", async () => {
    process.env.NEXT_PUBLIC_BACKEND_API_URL = "http://backend.test/api/v1";
    let capturedHeaders: Record<string, string> = {};
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      capturedHeaders = (init?.headers ?? {}) as Record<string, string>;
      return {
        status: 200,
        ok: true,
        json: async () => ({ items: [] }),
        headers: { get: () => "etag-1" },
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    await fetchTvScheduleClient({
      communityId: null,
      startupTraceId: "trace-page-1",
      scheduleAttemptId: "attempt-a1",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(capturedHeaders["X-TV-Startup-Trace-Id"]).toBe("trace-page-1");
    expect(capturedHeaders["X-TV-Schedule-Attempt-Id"]).toBe("attempt-a1");
  });

  it("omits optional headers when not provided", async () => {
    process.env.NEXT_PUBLIC_BACKEND_API_URL = "http://backend.test/api/v1";
    let capturedHeaders: Record<string, string> = {};
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      capturedHeaders = (init?.headers ?? {}) as Record<string, string>;
      return {
        status: 200,
        ok: true,
        json: async () => ({ items: [] }),
        headers: { get: () => null },
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    await fetchTvScheduleClient({ communityId: "comm-x" });

    expect(capturedHeaders["X-TV-Startup-Trace-Id"]).toBeUndefined();
    expect(capturedHeaders["X-TV-Schedule-Attempt-Id"]).toBeUndefined();
  });
});
