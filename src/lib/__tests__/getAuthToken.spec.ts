import { beforeEach, describe, expect, it, vi } from "vitest";

const cookieGet = vi.fn<(name: string) => string | undefined>();
const storeGetState = vi.fn();

const storage = new Map<string, string>();

vi.mock("js-cookie", () => ({
  default: {
    get: (name: string) => cookieGet(name),
  },
}));

vi.mock("@/redux/store", () => ({
  store: {
    getState: () => storeGetState(),
  },
}));

function mockPersistAuth(auth: { token?: string; user?: { role?: string } }) {
  storage.set("persist:root", JSON.stringify({ auth: JSON.stringify(auth) }));
}

describe("getAuthToken", () => {
  beforeEach(() => {
    storage.clear();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
      clear: () => storage.clear(),
    });
    vi.stubGlobal("window", { localStorage: globalThis.localStorage });
    cookieGet.mockReset();
    storeGetState.mockReset();
    storeGetState.mockReturnValue({ auth: { token: null, user: null } });
    vi.resetModules();
  });

  it("returns persist token when present", async () => {
    mockPersistAuth({ token: "persist-token", user: { role: "TIPPER" } });
    const { getAuthToken } = await import("@/lib/getAuthToken");
    expect(getAuthToken()).toBe("persist-token");
  });

  it("returns Redux token when persist has no token", async () => {
    storeGetState.mockReturnValue({
      auth: { token: "redux-token", user: { role: "TIPPER" } },
    });
    const { getAuthToken } = await import("@/lib/getAuthToken");
    expect(getAuthToken()).toBe("redux-token");
  });

  it("does not fall back to visitorToken when signed-in role exists in Redux", async () => {
    storeGetState.mockReturnValue({
      auth: { token: null, user: { role: "TIPPER" } },
    });
    cookieGet.mockReturnValue("visitor-jwt");
    const { getAuthToken } = await import("@/lib/getAuthToken");
    expect(getAuthToken()).toBeNull();
  });

  it("does not fall back to visitorToken when signed-in role exists in persist", async () => {
    mockPersistAuth({ user: { role: "HOST" } });
    cookieGet.mockReturnValue("visitor-jwt");
    const { getAuthToken } = await import("@/lib/getAuthToken");
    expect(getAuthToken()).toBeNull();
  });

  it("returns visitorToken for guest sessions", async () => {
    cookieGet.mockReturnValue("visitor-jwt");
    const { getAuthToken } = await import("@/lib/getAuthToken");
    expect(getAuthToken()).toBe("visitor-jwt");
  });
});
