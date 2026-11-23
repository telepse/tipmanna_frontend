import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const cookieMap = new Map<string, string>();

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const value = cookieMap.get(name);
      return value === undefined ? undefined : { name, value };
    },
  }),
}));

describe("POST /api/notifications/presence-ping (Wave 1B)", () => {
  const fetchMock = vi.fn();
  const originalFetch = globalThis.fetch;
  const originalBackend = process.env.NEXT_PUBLIC_BACKEND_API_URL;

  beforeEach(() => {
    cookieMap.clear();
    fetchMock.mockReset();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    process.env.NEXT_PUBLIC_BACKEND_API_URL = "https://api.test/api/v1";
    vi.resetModules();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalBackend === undefined) {
      delete process.env.NEXT_PUBLIC_BACKEND_API_URL;
    } else {
      process.env.NEXT_PUBLIC_BACKEND_API_URL = originalBackend;
    }
  });

  async function loadPost() {
    const mod = await import("../route");
    return mod.POST;
  }

  function presenceCalls() {
    return fetchMock.mock.calls.filter(([url]) =>
      String(url).includes("/notifications/presence")
    );
  }

  function touchCalls() {
    return fetchMock.mock.calls.filter(([url]) =>
      String(url).includes("/auth/session/touch")
    );
  }

  it("tipper-only: posts tipper presence and never session/touch", async () => {
    cookieMap.set("token", "tipper-jwt");
    fetchMock.mockResolvedValue({ ok: true });

    const POST = await loadPost();
    const res = await POST();
    const body = await res.json();

    expect(body).toEqual({ ok: true, tipperOk: true, hostOk: false });
    expect(touchCalls()).toHaveLength(0);
    expect(presenceCalls()).toHaveLength(1);
    expect(presenceCalls()[0][1]).toMatchObject({
      method: "POST",
      headers: {
        Authorization: "Bearer tipper-jwt",
        "Content-Type": "application/json",
      },
    });
  });

  it("host-only: posts host presence with cookie hostToken; no session/touch", async () => {
    cookieMap.set("hostToken", "host-jwt");
    fetchMock.mockResolvedValue({ ok: true });

    const POST = await loadPost();
    const body = await (await POST()).json();

    expect(body).toEqual({ ok: true, tipperOk: false, hostOk: true });
    expect(touchCalls()).toHaveLength(0);
    expect(presenceCalls()).toHaveLength(1);
    expect(presenceCalls()[0][1].headers.Authorization).toBe(
      "Bearer host-jwt"
    );
  });

  it("simultaneous tipper + host cookies: both presence calls, no touch", async () => {
    cookieMap.set("token", "tipper-jwt");
    cookieMap.set("hostToken", "host-jwt");
    fetchMock.mockResolvedValue({ ok: true });

    const POST = await loadPost();
    const body = await (await POST()).json();

    expect(body).toEqual({ ok: true, tipperOk: true, hostOk: true });
    expect(touchCalls()).toHaveLength(0);
    expect(presenceCalls()).toHaveLength(2);
    const auths = presenceCalls().map(
      ([, init]) => (init as RequestInit).headers
    );
    expect(auths).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ Authorization: "Bearer tipper-jwt" }),
        expect.objectContaining({ Authorization: "Bearer host-jwt" }),
      ])
    );
  });

  it("verified host success still returns hostOk true without touch", async () => {
    cookieMap.set("hostToken", "host-verified");
    fetchMock.mockResolvedValue({ ok: true });

    const POST = await loadPost();
    const body = await (await POST()).json();
    expect(body.hostOk).toBe(true);
    expect(touchCalls()).toHaveLength(0);
  });

  it("unverified/failed host presence yields hostOk false (gate enforced upstream)", async () => {
    cookieMap.set("hostToken", "host-unverified");
    fetchMock.mockResolvedValue({ ok: false, status: 403 });

    const POST = await loadPost();
    const body = await (await POST()).json();

    expect(body).toEqual({ ok: false, tipperOk: false, hostOk: false });
    expect(touchCalls()).toHaveLength(0);
    expect(presenceCalls()).toHaveLength(1);
  });

  it("missing host token skips host branch", async () => {
    fetchMock.mockResolvedValue({ ok: true });

    const POST = await loadPost();
    const body = await (await POST()).json();

    expect(body).toEqual({ ok: false, tipperOk: false, hostOk: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("invalid/empty host token after trim is treated as absent", async () => {
    cookieMap.set("hostToken", "   ");
    fetchMock.mockResolvedValue({ ok: true });

    const POST = await loadPost();
    const body = await (await POST()).json();

    expect(body.hostOk).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("backend presence throw fails open for host (hostOk false, no throw)", async () => {
    cookieMap.set("hostToken", "host-jwt");
    fetchMock.mockRejectedValue(new Error("network down"));

    const POST = await loadPost();
    const body = await (await POST()).json();

    expect(body).toEqual({ ok: false, tipperOk: false, hostOk: false });
    expect(touchCalls()).toHaveLength(0);
  });

  it("tipper success + host failure keeps tipperOk and overall ok", async () => {
    cookieMap.set("token", "tipper-jwt");
    cookieMap.set("hostToken", "host-jwt");
    fetchMock
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: false, status: 401 });

    const POST = await loadPost();
    const body = await (await POST()).json();

    expect(body).toEqual({ ok: true, tipperOk: true, hostOk: false });
    expect(touchCalls()).toHaveLength(0);
  });
});
