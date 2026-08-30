import { describe, expect, it, vi } from "vitest";
import { isPaymentAnimationTraceEnabled } from "@/lib/payment-animation-trace";

describe("payment animation observability policy (Phase E7)", () => {
  it("verbose payment trace is disabled by default outside explicit env", () => {
    vi.stubEnv("NEXT_PUBLIC_PAYMENT_ANIMATION_TRACE_ENABLED", "");
    expect(isPaymentAnimationTraceEnabled()).toBe(false);
  });

  it("verbose payment trace enables only when env is true", () => {
    vi.stubEnv("NEXT_PUBLIC_PAYMENT_ANIMATION_TRACE_ENABLED", "true");
    expect(isPaymentAnimationTraceEnabled()).toBe(true);
    vi.unstubAllEnvs();
  });
});
