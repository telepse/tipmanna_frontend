import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const SRC_ROOT = resolve(__dirname, "../..");

function readSrc(rel: string): string {
  return readFileSync(resolve(SRC_ROOT, rel), "utf8");
}

describe("transparent screen overlay", () => {
  it("Copy Overlay Link targets /room/{id}/overlay on current origin", () => {
    const settings = readSrc("components/events/event-screen-settings.tsx");
    expect(settings).toContain("window.location.origin");
    expect(settings).toContain("/room/${eventId}/overlay");
    expect(settings).not.toContain(
      "navigator.clipboard.writeText(window.location.href)"
    );
  });

  it("overlay route exists with public-only sync hook", () => {
    expect(readSrc("app/(event)/room/[id]/overlay/page.tsx")).toContain(
      "ScreenOverlayClient"
    );
    const hook = readSrc("hooks/use-screen-overlay-public-sync.ts");
    expect(hook).toContain("screen-display-state");
    expect(hook).toContain("pinnedPerformers");
    expect(hook).not.toContain("private-event-");
  });

  it("overlay client uses overlay- playback prefix and no payer recovery", () => {
    const client = readSrc("components/events/screen-overlay-client.tsx");
    expect(client).toContain('playbackKeyPrefix: "overlay-"');
    expect(client).toContain('surface: "screen_overlay"');
    expect(client).not.toContain("usePayerOriginAnimationRecovery");
    expect(client).not.toContain("EventRoomClient");
  });

  it("PWA and push auto-prompt suppressed on overlay path", () => {
    const trigger = readSrc("lib/pwa-install-trigger.ts");
    expect(trigger).toContain("isScreenOverlayPath");
    expect(readSrc("components/pwa/pwa-install-controller.tsx")).toContain(
      "isScreenOverlayPath"
    );
    expect(readSrc("components/pwa/push-prompt-controller.tsx")).toContain(
      "isScreenOverlayPath"
    );
  });

  it("room pusher does not bind public screen-display-state", () => {
    const provider = readSrc("components/events/event-pusher-provider.tsx");
    expect(provider).not.toContain('bind("screen-display-state"');
  });

  it("overlay layout sets transparent root before paint", () => {
    const layout = readSrc("app/(event)/room/[id]/overlay/layout.tsx");
    expect(layout).toContain("beforeInteractive");
    expect(layout).toContain("screenOverlayRoot");
    expect(layout).toMatch(/style\.background\s*=\s*"transparent"/);
    expect(layout).toContain("document.body");
  });

  it("suppresses global toast and nav progress chrome on overlay path", () => {
    expect(readSrc("components/layout/app-toast-container.tsx")).toContain(
      "isScreenOverlayPath"
    );
    const nav = readSrc(
      "components/navigation/navigation-progress-provider.tsx"
    );
    expect(nav).toContain("isScreenOverlayPath");
    expect(nav).toMatch(/showProgressBar/);
  });

  it("room merges pin snapshots without replacing full roster", () => {
    const room = readSrc("components/events/event-room-client.tsx");
    expect(room).toContain("applyPinnedAmountSnapshot");
    expect(room).toMatch(/Array\.isArray\(data\.pinnedPerformers\)/);
    expect(room).not.toMatch(/setLivePerformers\(data\.pinnedPerformers\)/);
  });

  it("overlay HUD shows event name outside opaque QR branch", () => {
    const hud = readSrc("components/events/screen-display-hud.tsx");
    expect(hud).toMatch(/variant === "overlay"[\s\S]*eventName/);
  });

  it("opaque screen display keeps screen- prefix and no recovery", () => {
    const display = readSrc("components/events/screen-display.tsx");
    expect(display).toContain('playbackKeyPrefix: "screen-"');
    expect(display).not.toContain("usePayerOriginAnimationRecovery");
  });

  it("room wires funnel and pin settings into EventHeader", () => {
    const room = readSrc("components/events/event-room-client.tsx");
    expect(room).toContain(
      "showPinnedOnScreen={screenSettings.showPinnedOnScreen}"
    );
    expect(room).toContain("funnelPosition={screenSettings.funnelPosition}");
  });
});
