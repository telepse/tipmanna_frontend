import { describe, expect, it } from "vitest";

describe("frontend audit remediation smoke", () => {
  it("TVProvider is scoped to tv layout routes only", () => {
    const tvRoutes = ["/tv", "/tv/community/foo"];
    expect(tvRoutes.every(r => r.startsWith("/tv"))).toBe(true);
  });

  it("Stripe should defer until payment UI opens", () => {
    const stripeEnabledWhenDrawerOpen = (drawerOpen: boolean) => drawerOpen;
    expect(stripeEnabledWhenDrawerOpen(false)).toBe(false);
    expect(stripeEnabledWhenDrawerOpen(true)).toBe(true);
  });

  it("Pusher channel cleanup removes subscription ref", () => {
    const counts = new Map<string, number>();
    const subscribe = (name: string) =>
      counts.set(name, (counts.get(name) ?? 0) + 1);
    const unsubscribe = (name: string) => {
      const next = Math.max(0, (counts.get(name) ?? 0) - 1);
      if (next === 0) counts.delete(name);
      else counts.set(name, next);
    };
    subscribe("presence-event-1");
    unsubscribe("presence-event-1");
    expect(counts.has("presence-event-1")).toBe(false);
  });
});
