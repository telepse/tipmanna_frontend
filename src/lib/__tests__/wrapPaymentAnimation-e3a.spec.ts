import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/payment-animation-trace", () => ({
  tracePaymentAnimation: vi.fn(),
  tracePaymentAnimationError: vi.fn(),
}));

vi.mock("@/lib/animationDebug", () => ({
  animWarn: vi.fn(),
}));

import {
  createAnimationFromStyleName,
  UnknownPaymentStyleError,
} from "@/lib/animation-style-registry";
import { wrapPaymentAnimation } from "@/lib/wrapPaymentAnimation";

describe("wrapPaymentAnimation defensive unknown style (Phase E3A)", () => {
  it("does not report payment_double_cycle_completed when payment factory throws", async () => {
    const traces: string[] = [];
    const { tracePaymentAnimation } = await import(
      "@/lib/payment-animation-trace"
    );
    vi.mocked(tracePaymentAnimation).mockImplementation(payload => {
      traces.push(payload.stage);
    });

    const run = wrapPaymentAnimation(() => {
      return createAnimationFromStyleName(
        { name: "Love", iconUrl: "/love.png", styleName: "Confe" },
        "payment"
      );
    });

    await expect(run()).resolves.toBeUndefined();
    expect(traces).not.toContain("payment_double_cycle_completed");
  });

  it("throws UnknownPaymentStyleError for unknown payment styles at factory", () => {
    expect(() =>
      createAnimationFromStyleName(
        { name: "Love", iconUrl: "/love.png", styleName: "Confe" },
        "payment"
      )
    ).toThrow(UnknownPaymentStyleError);
  });

  it("preview mode still returns noop handle for unknown styles", () => {
    const handle = createAnimationFromStyleName(
      { name: "Love", iconUrl: "/love.png", styleName: "Confe" },
      "preview"
    );
    expect(handle.finished).toBeInstanceOf(Promise);
  });
});
