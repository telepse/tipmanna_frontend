import { afterEach, describe, expect, it, vi } from "vitest";

import {
  isCurrentRoutePaymentOrigin,
  paymentOriginIntentKey,
} from "../payment-recovery-exchange";

describe("paymentOriginIntentKey", () => {
  it("matches Explore origin when feedTab is appended after mount", () => {
    const saved = "http://localhost:3000/explore?channel=ch1&eventId=ev1";
    const current =
      "http://localhost:3000/explore?channel=ch1&eventId=ev1&feedTab=trends";
    expect(paymentOriginIntentKey(saved)).toBe(paymentOriginIntentKey(current));
  });

  it("matches TV origin when community param is appended after mount", () => {
    const saved = "http://localhost:3000/tv";
    const current = "http://localhost:3000/tv?community=comm-abc";
    expect(paymentOriginIntentKey(saved)).toBe(paymentOriginIntentKey(current));
  });

  it("distinguishes different video contexts on Explore", () => {
    const a =
      "http://localhost:3000/explore?channel=ch1&eventId=ev1&feedTab=trends";
    const b =
      "http://localhost:3000/explore?channel=ch2&eventId=ev2&feedTab=trends";
    expect(paymentOriginIntentKey(a)).not.toBe(paymentOriginIntentKey(b));
  });

  it("includes videoId when present on saved origin", () => {
    const saved = "http://localhost:3000/tv?videoId=vid-1";
    const current = "http://localhost:3000/tv?videoId=vid-1&community=comm-1";
    expect(paymentOriginIntentKey(saved)).toBe(paymentOriginIntentKey(current));
  });
});

describe("isCurrentRoutePaymentOrigin", () => {
  const originalWindow = globalThis.window;

  afterEach(() => {
    if (originalWindow) {
      vi.stubGlobal("window", originalWindow);
    }
  });

  it("returns true when intent keys match despite surface query drift", () => {
    vi.stubGlobal("window", {
      location: {
        href: "http://localhost:3000/tv?community=stored-comm",
      },
    });
    expect(isCurrentRoutePaymentOrigin("http://localhost:3000/tv")).toBe(true);
  });

  it("returns false for different pathname", () => {
    vi.stubGlobal("window", {
      location: {
        href: "http://localhost:3000/explore",
      },
    });
    expect(isCurrentRoutePaymentOrigin("http://localhost:3000/tv")).toBe(false);
  });
});
