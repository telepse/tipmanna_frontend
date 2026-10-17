import { describe, expect, it, vi } from "vitest";

import { isProtectedRouteSessionReady } from "@/lib/protected-route-session";

vi.mock("@/lib/getAuthToken", () => ({
  getAuthUserFromCookies: () => ({ id: "host-1", role: "TIPPER" }),
}));

describe("isProtectedRouteSessionReady", () => {
  it("pending until persist hydration completes", () => {
    expect(
      isProtectedRouteSessionReady({
        persistAuthHydrationComplete: false,
        isAuthenticated: true,
        requiresVerification: false,
        userId: "u1",
        token: "t",
      })
    ).toBe("pending");
  });

  it("allows rehydrated session without Redux token (Stripe return)", () => {
    expect(
      isProtectedRouteSessionReady({
        persistAuthHydrationComplete: true,
        isAuthenticated: true,
        requiresVerification: false,
        userId: "u1",
        token: null,
      })
    ).toBe("allowed");
  });

  it("allows matching readable user cookie when token absent", () => {
    expect(
      isProtectedRouteSessionReady({
        persistAuthHydrationComplete: true,
        isAuthenticated: false,
        requiresVerification: false,
        userId: "host-1",
        token: null,
      })
    ).toBe("allowed");
  });

  it("denies when hydration done and no session signals", () => {
    expect(
      isProtectedRouteSessionReady({
        persistAuthHydrationComplete: true,
        isAuthenticated: false,
        requiresVerification: false,
        userId: "other",
        token: null,
      })
    ).toBe("denied");
  });
});
