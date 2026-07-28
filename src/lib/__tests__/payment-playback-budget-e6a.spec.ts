import { describe, expect, it } from "vitest";
import { PAYMENT_WRAP } from "@/lib/animationContract";
import {
  PAYMENT_BETWEEN_CYCLES_GAP_MS,
  PAYMENT_SECOND_CYCLE_BEAT_MS,
  paymentBundleMsPerCharacter,
} from "@/lib/payment-playback-budget";

describe("payment-playback-budget parity (Phase E6A)", () => {
  it("frontend budget covers two safety-timeout cycles plus gaps", () => {
    const expected =
      2 * PAYMENT_WRAP.safetyTimeoutMs +
      PAYMENT_BETWEEN_CYCLES_GAP_MS +
      PAYMENT_SECOND_CYCLE_BEAT_MS;

    expect(paymentBundleMsPerCharacter()).toBe(expected);
    expect(paymentBundleMsPerCharacter()).toBeGreaterThan(
      2 * PAYMENT_WRAP.safetyTimeoutMs
    );
  });
});
