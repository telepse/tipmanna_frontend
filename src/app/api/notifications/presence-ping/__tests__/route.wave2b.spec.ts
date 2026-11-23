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

describe("POST /api/notifications/presence-ping (Wave 2B concurrency)", () => {
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

  function authOf(call: unknown[]): string {
    const init = call[1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    return headers.Authorization;
  }

  it("tipper-only: posts tipper presence with correct contract; no touch", async () => {
    cookieMap.set("token", "tipper-jwt");
    fetchMock.mockResolvedValue({ ok: true });

    const POST = await loadPost();
    const res = await POST();
    const body = await res.json();

    expect(body).toEqual({ ok: true, tipperOk: true, hostOk: false });
    expect(touchCalls()).toHaveLength(0);
    expect(presenceCalls()).toHaveLength(1);
    expect(String(presenceCalls()[0][0])).toBe(
      "https://api.test/api/v1/notifications/presence"
    );
    expect(presenceCalls()[0][1]).toMatchObject({
      method: "POST",
      cache: "no-store",
      headers: {
        Authorization: "Bearer tipper-jwt",
        "Content-Type": "application/json",
      },
    });
  });

  it("host-only: posts host presence; no touch", async () => {
    cookieMap.set("hostToken", "host-jwt");
    fetchMock.mockResolvedValue({ ok: true });

    const POST = await loadPost();
    const body = await (await POST()).json();

    expect(body).toEqual({ ok: true, tipperOk: false, hostOk: true });
    expect(touchCalls()).toHaveLength(0);
    expect(presenceCalls()).toHaveLength(1);
    expect(authOf(presenceCalls()[0])).toBe("Bearer host-jwt");
  });

  it("neither cookie: no fetch; ok false", async () => {
    const POST = await loadPost();
    const body = await (await POST()).json();
    expect(body).toEqual({ ok: false, tipperOk: false, hostOk: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("whitespace tipper + host tokens are treated as absent", async () => {
    cookieMap.set("token", "   ");
    cookieMap.set("hostToken", "\t  ");
    const POST = await loadPost();
    const body = await (await POST()).json();
    expect(body).toEqual({ ok: false, tipperOk: false, hostOk: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("both cookies: initiates both presence fetches before either settles", async () => {
    cookieMap.set("token", "tipper-jwt");
    cookieMap.set("hostToken", "host-jwt");

    const started = new Set<string>();
    let releaseBoth!: () => void;
    const bothStarted = new Promise<void>(resolve => {
      releaseBoth = resolve;
    });

    const pending = new Map<string, (value: { ok: boolean }) => void>();

    fetchMock.mockImplementation((_url: string, init?: RequestInit) => {
      const auth = String(
        (init?.headers as Record<string, string>)?.Authorization ?? ""
      );
      started.add(auth);
      if (started.has("Bearer tipper-jwt") && started.has("Bearer host-jwt")) {
        releaseBoth();
      }
      return new Promise<{ ok: boolean }>(resolve => {
        pending.set(auth, resolve);
      });
    });

    const POST = await loadPost();
    const resultPromise = POST();

    await bothStarted;
    expect(started.size).toBe(2);
    expect(pending.size).toBe(2);

    // Neither has settled yet — proves non-sequential wait
    expect(pending.has("Bearer tipper-jwt")).toBe(true);
    expect(pending.has("Bearer host-jwt")).toBe(true);

    pending.get("Bearer tipper-jwt")!({ ok: true });
    pending.get("Bearer host-jwt")!({ ok: true });

    const body = await (await resultPromise).json();
    expect(body).toEqual({ ok: true, tipperOk: true, hostOk: true });
    expect(touchCalls()).toHaveLength(0);
    expect(presenceCalls()).toHaveLength(2);
  });

  it("tipper fetch throw still attempts host and returns tipperOk false", async () => {
    cookieMap.set("token", "tipper-jwt");
    cookieMap.set("hostToken", "host-jwt");

    fetchMock.mockImplementation((_url: string, init?: RequestInit) => {
      const auth = String(
        (init?.headers as Record<string, string>)?.Authorization ?? ""
      );
      if (auth === "Bearer tipper-jwt") {
        return Promise.reject(new Error("tipper network down"));
      }
      return Promise.resolve({ ok: true });
    });

    const POST = await loadPost();
    const body = await (await POST()).json();

    expect(body).toEqual({ ok: true, tipperOk: false, hostOk: true });
    expect(presenceCalls()).toHaveLength(2);
    expect(touchCalls()).toHaveLength(0);
  });

  it("host fetch throw still attempts tipper and returns hostOk false", async () => {
    cookieMap.set("token", "tipper-jwt");
    cookieMap.set("hostToken", "host-jwt");

    fetchMock.mockImplementation((_url: string, init?: RequestInit) => {
      const auth = String(
        (init?.headers as Record<string, string>)?.Authorization ?? ""
      );
      if (auth === "Bearer host-jwt") {
        return Promise.reject(new Error("host network down"));
      }
      return Promise.resolve({ ok: true });
    });

    const POST = await loadPost();
    const body = await (await POST()).json();

    expect(body).toEqual({ ok: true, tipperOk: true, hostOk: false });
    expect(presenceCalls()).toHaveLength(2);
    expect(touchCalls()).toHaveLength(0);
  });

  it("tipper HTTP failure + host success keeps hostOk", async () => {
    cookieMap.set("token", "tipper-jwt");
    cookieMap.set("hostToken", "host-jwt");

    fetchMock.mockImplementation((_url: string, init?: RequestInit) => {
      const auth = String(
        (init?.headers as Record<string, string>)?.Authorization ?? ""
      );
      if (auth === "Bearer tipper-jwt") {
        return Promise.resolve({ ok: false, status: 401 });
      }
      return Promise.resolve({ ok: true });
    });

    const POST = await loadPost();
    const body = await (await POST()).json();
    expect(body).toEqual({ ok: true, tipperOk: false, hostOk: true });
  });

  it("host HTTP failure + tipper success keeps tipperOk", async () => {
    cookieMap.set("token", "tipper-jwt");
    cookieMap.set("hostToken", "host-jwt");

    fetchMock.mockImplementation((_url: string, init?: RequestInit) => {
      const auth = String(
        (init?.headers as Record<string, string>)?.Authorization ?? ""
      );
      if (auth === "Bearer host-jwt") {
        return Promise.resolve({ ok: false, status: 403 });
      }
      return Promise.resolve({ ok: true });
    });

    const POST = await loadPost();
    const body = await (await POST()).json();
    expect(body).toEqual({ ok: true, tipperOk: true, hostOk: false });
  });

  it("both branches throw independently: ok false, no route throw, no touch", async () => {
    cookieMap.set("token", "tipper-jwt");
    cookieMap.set("hostToken", "host-jwt");
    fetchMock.mockRejectedValue(new Error("network down"));

    const POST = await loadPost();
    const body = await (await POST()).json();

    expect(body).toEqual({ ok: false, tipperOk: false, hostOk: false });
    expect(presenceCalls()).toHaveLength(2);
    expect(touchCalls()).toHaveLength(0);
  });

  it("tipper-only throw fails open without host cookie", async () => {
    cookieMap.set("token", "tipper-jwt");
    fetchMock.mockRejectedValue(new Error("tipper down"));

    const POST = await loadPost();
    const body = await (await POST()).json();

    expect(body).toEqual({ ok: false, tipperOk: false, hostOk: false });
    expect(presenceCalls()).toHaveLength(1);
    expect(touchCalls()).toHaveLength(0);
  });

  it("response has no Set-Cookie and never calls session/touch", async () => {
    cookieMap.set("token", "tipper-jwt");
    cookieMap.set("hostToken", "host-jwt");
    fetchMock.mockResolvedValue({ ok: true });

    const POST = await loadPost();
    const res = await POST();
    expect(res.headers.get("set-cookie")).toBeNull();
    expect(touchCalls()).toHaveLength(0);
  });
});
