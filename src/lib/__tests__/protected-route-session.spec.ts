import { describe, expect, it } from "vitest";

import { isProtectedRouteHydrationPending } from "@/lib/protected-route-session";

describe("isProtectedRouteHydrationPending", () => {
  it("pending until persist hydration completes", () => {
    expect(
      isProtectedRouteHydrationPending({ persistAuthHydrationComplete: false })
    ).toBe(true);
    expect(
      isProtectedRouteHydrationPending({ persistAuthHydrationComplete: true })
    ).toBe(false);
  });
});
