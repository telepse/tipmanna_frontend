import { beforeEach, describe, expect, it, vi } from "vitest";

const runServerFetch = vi.fn();
const cookiesGet = vi.fn();

vi.mock("@/lib/action-fetch", () => ({
  runServerFetch: (...args: unknown[]) => runServerFetch(...args),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => cookiesGet(name),
  }),
}));

import {
  createAccountDeletionRequestAction,
  createContentDeletionRequestAction,
  getAccountDeletionPreflightAction,
  getContentDeletionPreflightAction,
  getDeletionCapabilitiesAction,
  getOwnDeletionRequestAction,
} from "../deletion";

describe("deletion server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_BACKEND_API_URL =
      "https://tipmanna-staging.onrender.com/api/v1";
    cookiesGet.mockImplementation((name: string) =>
      name === "token" ? { value: "tipper-jwt" } : undefined
    );
    runServerFetch.mockResolvedValue({
      success: true,
      data: { accountDeletionEnabled: true, purgeEnabled: false },
      error: null,
    });
  });

  it("capabilities uses V2 path only", async () => {
    await getDeletionCapabilitiesAction();
    expect(runServerFetch).toHaveBeenCalled();
    const url = String(runServerFetch.mock.calls[0]?.[0] ?? "");
    expect(url).toContain("/deletion/capabilities");
    expect(url).not.toContain("delete-tipper");
  });

  it("preflight requires auth cookie and uses V2 account path", async () => {
    await getAccountDeletionPreflightAction();
    const [url, init] = runServerFetch.mock.calls[0] ?? [];
    expect(String(url)).toContain("/deletion/account/preflight");
    expect(String(url)).not.toContain("delete-tipper");
    expect(
      (init as { headers?: { Authorization?: string } }).headers?.Authorization
    ).toBe("Bearer tipper-jwt");
  });

  it("create rejects when unauthenticated", async () => {
    cookiesGet.mockReturnValue(undefined);
    const res = await createAccountDeletionRequestAction({ agree: true });
    expect(res.httpStatus).toBe(401);
    expect(runServerFetch).not.toHaveBeenCalled();
  });

  it("getOwnDeletionRequest rejects non-uuid ids without fetching", async () => {
    const res = await getOwnDeletionRequestAction("not-a-uuid");
    expect(res.httpStatus).toBe(400);
    expect(runServerFetch).not.toHaveBeenCalled();
  });

  it("create posts V2 account requests path with agree confirmation", async () => {
    runServerFetch.mockResolvedValue({
      success: true,
      data: {
        requestId: "77521173-847e-4380-bdb3-5355bf278425",
        status: "pending",
      },
      error: null,
    });
    const res = await createAccountDeletionRequestAction({
      agree: true,
      clientKey: "fe-test",
    });
    expect(res.success).toBe(true);
    const [url, init] = runServerFetch.mock.calls[0] ?? [];
    expect(String(url)).toContain("/deletion/account/requests");
    expect(String(url)).not.toContain("delete-tipper");
    expect(String(url).toLowerCase()).not.toContain("purge");
    expect((init as { method?: string }).method).toBe("POST");
    expect(JSON.parse(String((init as { body?: string }).body))).toEqual({
      agree: true,
      clientKey: "fe-test",
    });
  });

  it("create rejects without confirmation and does not call API", async () => {
    const res = await createAccountDeletionRequestAction({ agree: false });
    expect(res.httpStatus).toBe(400);
    expect(runServerFetch).not.toHaveBeenCalled();
  });

  it("content preflight requires hostToken (not tipper token alone)", async () => {
    cookiesGet.mockImplementation((name: string) =>
      name === "token" ? { value: "tipper-jwt" } : undefined
    );
    const res = await getContentDeletionPreflightAction({
      type: "event",
      id: "77521173-847e-4380-bdb3-5355bf278425",
    });
    expect(res.httpStatus).toBe(401);
    expect(runServerFetch).not.toHaveBeenCalled();
  });

  it("content create posts V2 content path with host auth", async () => {
    cookiesGet.mockImplementation((name: string) =>
      name === "hostToken" ? { value: "host-jwt" } : undefined
    );
    runServerFetch.mockResolvedValue({
      success: true,
      data: {
        requestId: "77521173-847e-4380-bdb3-5355bf278425",
        status: "processing",
      },
      error: null,
    });
    const res = await createContentDeletionRequestAction({
      type: "event",
      id: "77521173-847e-4380-bdb3-5355bf278425",
      agree: true,
      clientKey: "fe-content-test",
    });
    expect(res.success).toBe(true);
    const [url, init] = runServerFetch.mock.calls[0] ?? [];
    expect(String(url)).toContain("/deletion/content/requests");
    expect(String(url)).not.toContain("delete-tipper");
    expect(String(url).toLowerCase()).not.toContain("purge");
    expect(
      (init as { headers?: { Authorization?: string } }).headers?.Authorization
    ).toBe("Bearer host-jwt");
    expect(JSON.parse(String((init as { body?: string }).body))).toEqual({
      type: "event",
      id: "77521173-847e-4380-bdb3-5355bf278425",
      agree: true,
      clientKey: "fe-content-test",
    });
  });

  it("content create rejects cross-type garbage without calling API", async () => {
    cookiesGet.mockImplementation((name: string) =>
      name === "hostToken" ? { value: "host-jwt" } : undefined
    );
    const res = await createContentDeletionRequestAction({
      // @ts-expect-error intentional invalid type for guard test
      type: "message",
      id: "77521173-847e-4380-bdb3-5355bf278425",
      agree: true,
    });
    expect(res.httpStatus).toBe(400);
    expect(runServerFetch).not.toHaveBeenCalled();
  });
});