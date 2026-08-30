import { describe, expect, it, vi } from "vitest";

/**
 * Mirrors the guard in frontend/src/app/success/page.tsx:
 * sessionHandledRef is set synchronously at effect start so React Strict Mode
 * or auth hydration cannot trigger duplicate recovery exchanges.
 */
function simulateSuccessPageMountGuard(onExchange: () => void): {
  runEffect: () => void;
} {
  const sessionHandledRef = { current: false };

  const runEffect = () => {
    if (sessionHandledRef.current) return;
    sessionHandledRef.current = true;
    onExchange();
  };

  return { runEffect };
}

describe("success page exchange single-flight guard", () => {
  it("runs recovery exchange at most once per mount lifecycle", () => {
    const exchange = vi.fn();
    const { runEffect } = simulateSuccessPageMountGuard(exchange);

    runEffect();
    runEffect();

    expect(exchange).toHaveBeenCalledTimes(1);
  });
});
