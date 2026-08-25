import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  REDIRECT_WATCHDOG_MS,
  redirectAfterPaymentSuccess,
  resetPaymentSuccessRedirectForTests,
} from "../payment-success-redirect";

const PAYMENT_ORIGIN_STORAGE_KEY = "payment_origin";

describe("redirectAfterPaymentSuccess", () => {
  const replace = vi.fn();
  const router = { replace } as never;
  const storage = new Map<string, string>();

  beforeEach(() => {
    vi.useFakeTimers();
    resetPaymentSuccessRedirectForTests();
    storage.clear();
    replace.mockClear();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => storage.get(k) ?? null,
      setItem: (k: string, v: string) => storage.set(k, v),
      removeItem: (k: string) => storage.delete(k),
    });
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (k: string) => storage.get(k) ?? null,
        setItem: (k: string, v: string) => storage.set(k, v),
        removeItem: (k: string) => storage.delete(k),
      },
      location: {
        origin: "http://localhost:3000",
        pathname: "/success",
        search: "",
        hash: "",
        assign: vi.fn(),
      },
    });
    storage.set(
      PAYMENT_ORIGIN_STORAGE_KEY,
      "http://localhost:3000/explore?feedTab=trends"
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("soft-redirects to payment origin", () => {
    redirectAfterPaymentSuccess(router, null, "pi_123");
    expect(replace).toHaveBeenCalledWith("/explore?feedTab=trends");
  });

  it("does not double-redirect for the same payment intent", () => {
    redirectAfterPaymentSuccess(router, null, "pi_123");
    redirectAfterPaymentSuccess(router, null, "pi_123");
    expect(replace).toHaveBeenCalledTimes(1);
  });

  it("hard-navigates when still on /success after watchdog", () => {
    redirectAfterPaymentSuccess(router, null, "pi_456");
    vi.advanceTimersByTime(REDIRECT_WATCHDOG_MS);
    expect(window.location.assign).toHaveBeenCalledWith(
      "/explore?feedTab=trends"
    );
  });
});
