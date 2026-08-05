/**
 * P0 combined integration gate — verification-only tests.
 * Test artefact; does not modify application behaviour.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const SRC_ROOT = resolve(__dirname, "../..");

function readSrc(rel: string): string {
  return readFileSync(resolve(SRC_ROOT, rel), "utf8");
}

function expectHookInvokedInComponent(
  componentPath: string,
  hookName = "usePayerOriginAnimationRecovery"
): void {
  const src = readSrc(componentPath);
  expect(src).toContain(hookName);
  expect(src).toMatch(new RegExp(`${hookName}\\s*\\(`));
}

describe("P0 gate — React mount integration (component source)", () => {
  it("mounts recovery on payer-origin player components", () => {
    expectHookInvokedInComponent("components/events/content-client.tsx");
    expectHookInvokedInComponent("components/events/channel-client.tsx");
    expectHookInvokedInComponent("components/events/room-messages.tsx");
    expectHookInvokedInComponent("components/explore/explore-feed-client.tsx");
    expectHookInvokedInComponent(
      "components/explore/explore-tv-schedule-feed.tsx"
    );
    expectHookInvokedInComponent("components/tv/tv-looper.tsx");
    expectHookInvokedInComponent("components/tv/web-tv-looper.tsx");
  });

  it("does not mount recovery on Screen Display", () => {
    const src = readSrc("components/events/screen-display.tsx");
    expect(src).not.toContain("usePayerOriginAnimationRecovery");
    expect(src).toContain('playbackKeyPrefix: "screen-"');
  });
});

describe("P0 gate — lease timer lifecycle (hook source contract)", () => {
  it("renews every 30s after claim and clears interval on unmount", () => {
    const hook = readSrc("hooks/use-payer-origin-animation-recovery.ts");
    expect(hook).toContain("LEASE_RENEW_INTERVAL_MS = 30_000");
    expect(hook).toContain("setInterval");
    expect(hook).toContain("clearInterval");
    expect(hook).toContain("renewRecoveryClaimRequest");
    expect(hook).toMatch(/return \(\) => \{[\s\S]*clearInterval/);
  });
});

describe("P0 gate — TV programme isolation (source)", () => {
  it("recovery enqueue module does not touch YouTube or schedule state", () => {
    const recovery = readSrc("lib/enqueue-payer-origin-recovery.ts");
    expect(recovery).not.toMatch(/loadVideoById|seekTo|playVideo|currentIndex/);
    const tvLooper = readSrc("components/tv/tv-looper.tsx");
    expect(tvLooper).toContain("usePayerOriginAnimationRecovery");
  });
});

describe("P0 gate — monotonic isolation (source)", () => {
  it("recovery path does not call monotonic guard or validated-tip dispatch", () => {
    const recovery = readSrc("lib/enqueue-payer-origin-recovery.ts");
    expect(recovery).not.toContain("getSharedTipGuard");
    expect(recovery).not.toContain("shouldAccept");
    expect(recovery).not.toContain("validated-tip");
    expect(recovery).not.toContain("dispatchEvent");
  });
});

describe("P0 gate — API path alignment", () => {
  it("frontend client uses /payments/animation-recovery/* with credentials include", () => {
    const client = readSrc("lib/payment-recovery-client.ts");
    expect(client).toContain("/payments${path}");
    expect(client).toContain('credentials: "include"');
    expect(client).toContain("/animation-recovery/exchange");
    expect(client).toContain("/animation-recovery/claim");
    expect(client).toContain("/animation-recovery/renew");
    expect(client).toContain("/animation-recovery/progress");
  });
});
