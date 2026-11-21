import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const SRC_ROOT = resolve(__dirname, "../..");

function readSrc(rel: string): string {
  return readFileSync(resolve(SRC_ROOT, rel), "utf8");
}

describe("watch portal", () => {
  it("feature flag defaults on unless NEXT_PUBLIC_WATCH_PORTAL is false", () => {
    const flag = readSrc("lib/watch-portal-flag.ts");
    expect(flag).toContain('NEXT_PUBLIC_WATCH_PORTAL !== "false"');
    expect(flag).toContain("isWatchPortalPath");
    expect(flag).toContain("isVenueChromeSuppressedPath");
  });

  it("routes live under (watch) group without (tv) layout", () => {
    expect(readSrc("app/(watch)/layout.tsx")).toContain("WatchPortalGate");
    expect(readSrc("app/(watch)/watch/tv/page.tsx")).toContain(
      "WatchTvPageClient"
    );
    expect(readSrc("app/(watch)/watch/explore/page.tsx")).toContain(
      "WatchExploreTheater"
    );
    expect(readSrc("app/(watch)/watch/screen/[eventId]/page.tsx")).toContain(
      "WatchScreenTheater"
    );
  });

  it("TV watch page uses own TVProvider subtree, not tv-looper", () => {
    const client = readSrc("components/watch/watch-tv-page-client.tsx");
    expect(client).toContain("TVProvider");
    expect(client).toContain("WatchTvTheater");
    expect(client).not.toContain("TvInteractiveShell");
    expect(client).not.toContain("tv-looper");
  });

  it("explore theater does not mount ExplorePageClient", () => {
    const explore = readSrc("components/watch/watch-explore-theater.tsx");
    expect(explore).toContain("TvPlayer");
    expect(explore).not.toContain("ExplorePageClient");
  });

  it("screen theater uses screen- prefix and screen_display surface only", () => {
    const screen = readSrc("components/watch/watch-screen-theater.tsx");
    expect(screen).toContain('playbackKeyPrefix: "screen-"');
    expect(screen).toContain('surface: "screen_display"');
    expect(screen).not.toContain("EventRoomClient");
    expect(screen).not.toContain("usePayerOriginAnimationRecovery");
  });

  it("Copy TV Screen Link targets /watch/screen/{eventId}", () => {
    const settings = readSrc("components/events/event-screen-settings.tsx");
    expect(settings).toContain("/watch/screen/${eventId}");
    expect(settings).toContain("Copy TV Screen Link");
  });

  it("suppresses global chrome on watch paths", () => {
    expect(readSrc("components/layout/app-toast-container.tsx")).toContain(
      "isVenueChromeSuppressedPath"
    );
    expect(
      readSrc("components/navigation/navigation-progress-provider.tsx")
    ).toContain("isVenueChromeSuppressedPath");
    expect(readSrc("components/pwa/pwa-install-controller.tsx")).toContain(
      "isVenueChromeSuppressedPath"
    );
    expect(readSrc("components/pwa/push-prompt-controller.tsx")).toContain(
      "isVenueChromeSuppressedPath"
    );
  });

  it("watch TV theater wires provider player without looper shell", () => {
    const tvTheater = readSrc("components/watch/watch-tv-theater.tsx");
    expect(tvTheater).toContain("useTV");
    expect(tvTheater).toContain("TvPlayer");
    expect(tvTheater).not.toContain("tv-looper");
    expect(tvTheater).not.toContain("TvInteractiveShell");
  });

  it("watch TV does not write shared /tv playback snapshot", () => {
    const tvTheater = readSrc("components/watch/watch-tv-theater.tsx");
    expect(tvTheater).not.toContain("writeTvPlaybackSnapshot");
    expect(tvTheater).not.toContain("applyTabPlaybackSnapshotRestore");
  });

  it("watch TV and explore use pause Stop, not stopPlayer", () => {
    const tvTheater = readSrc("components/watch/watch-tv-theater.tsx");
    const explore = readSrc("components/watch/watch-explore-theater.tsx");
    expect(tvTheater).toContain("handleStop");
    expect(tvTheater).toContain("pauseProgrammatic");
    expect(tvTheater).not.toMatch(/onStop=\{stopPlayer\}/);
    expect(explore).toContain("handleStop");
    expect(explore).not.toMatch(/onStop=\{stopPlayer\}/);
  });

  it("TV and explore theaters have no tip stream", () => {
    const tvTheater = readSrc("components/watch/watch-tv-theater.tsx");
    const explore = readSrc("components/watch/watch-explore-theater.tsx");
    for (const src of [tvTheater, explore]) {
      expect(src).not.toContain("GlobalTipStreamProvider");
      expect(src).not.toContain("usePaymentAnimationPlayer");
    }
  });

  it("resume controllers respect venue chrome suppression", () => {
    expect(readSrc("components/pwa/push-opt-in-resume-banner.tsx")).toContain(
      "isVenueChromeSuppressedPath"
    );
    expect(
      readSrc("components/community/dedicated-enter-resume-controller.tsx")
    ).toContain("isVenueChromeSuppressedPath");
  });

  it("shell wires focus manager and remote keys", () => {
    expect(readSrc("components/watch/watch-portal-shell.tsx")).toContain(
      "WatchFocusManager"
    );
    expect(readSrc("components/watch/watch-focus-manager.tsx")).toContain(
      "mapWatchRemoteKey"
    );
    expect(readSrc("components/watch/watch-remote-keys.ts")).toContain(
      "WATCH_FOCUSABLE_SELECTOR"
    );
  });

  it("Escape is not mapped from Backspace", () => {
    const keys = readSrc("components/watch/watch-remote-keys.ts");
    expect(keys).toMatch(/key === "Escape"/);
    expect(keys).not.toMatch(/Backspace/);
  });

  it("Escape navigation returns screen live to picker", () => {
    const nav = readSrc("components/watch/watch-escape-navigation.ts");
    expect(nav).toContain("/watch/screen");
    expect(readSrc("components/watch/watch-focus-manager.tsx")).toContain(
      "resolveWatchEscapeHref"
    );
  });
});
