import { describe, expect, it } from "vitest";

import {
  isSocialInAppBrowser,
  resolveTipLinkPlayerAudioProps,
  resolveTipLinkSurfaceTapAction,
  shouldDeferTipLinkProgrammaticUnmute,
  shouldShowTipLinkOpenInBrowserBanner,
  shouldShowTipLinkTapForSound,
} from "../tiplink-audio-policy";

const IPHONE_SAFARI =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const DESKTOP_CHROME =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const DESKTOP_FIREFOX =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0";
const DESKTOP_SAFARI =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";
const ANDROID_CHROME =
  "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
const IG_IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 302.0.0.0.0";
const IG_ANDROID =
  "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 Instagram 302.0.0.0.0";
const TIKTOK_ANDROID =
  "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 musical_ly_2023409040 JsSdk/1.0 NetType/WIFI";
const TWITTER_IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Twitter for iPhone";
const TWITTER_ANDROID =
  "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 TwitterAndroid";
const TWITTERBOT =
  "Twitterbot/1.0";

describe("isSocialInAppBrowser", () => {
  it("detects Instagram iOS and Android", () => {
    expect(isSocialInAppBrowser(IG_IPHONE)).toBe(true);
    expect(isSocialInAppBrowser(IG_ANDROID)).toBe(true);
  });

  it("detects TikTok and X/Twitter app WebViews", () => {
    expect(isSocialInAppBrowser(TIKTOK_ANDROID)).toBe(true);
    expect(isSocialInAppBrowser(TWITTER_IPHONE)).toBe(true);
    expect(isSocialInAppBrowser(TWITTER_ANDROID)).toBe(true);
  });

  it("never matches Twitterbot or desktop browsers", () => {
    expect(isSocialInAppBrowser(TWITTERBOT)).toBe(false);
    expect(isSocialInAppBrowser(DESKTOP_CHROME)).toBe(false);
    expect(isSocialInAppBrowser(DESKTOP_FIREFOX)).toBe(false);
    expect(isSocialInAppBrowser(DESKTOP_SAFARI)).toBe(false);
    expect(isSocialInAppBrowser(ANDROID_CHROME)).toBe(false);
    expect(isSocialInAppBrowser(IPHONE_SAFARI)).toBe(false);
  });
});

describe("shouldDeferTipLinkProgrammaticUnmute", () => {
  it("defers on iPhone Safari and social WebViews", () => {
    expect(shouldDeferTipLinkProgrammaticUnmute(IPHONE_SAFARI)).toBe(true);
    expect(shouldDeferTipLinkProgrammaticUnmute(IG_ANDROID)).toBe(true);
  });

  it("defers on iPad desktop UA with ontouchend", () => {
    expect(
      shouldDeferTipLinkProgrammaticUnmute(DESKTOP_SAFARI, {
        ontouchendInDocument: true,
      })
    ).toBe(true);
  });

  it("does not defer on desktop Mac without touch or Android Chrome", () => {
    expect(
      shouldDeferTipLinkProgrammaticUnmute(DESKTOP_SAFARI, {
        ontouchendInDocument: false,
      })
    ).toBe(false);
    expect(shouldDeferTipLinkProgrammaticUnmute(ANDROID_CHROME)).toBe(false);
    expect(shouldDeferTipLinkProgrammaticUnmute(DESKTOP_CHROME)).toBe(false);
  });
});

describe("resolveTipLinkPlayerAudioProps", () => {
  it("non-defer + wants sound restores programmatically", () => {
    expect(
      resolveTipLinkPlayerAudioProps({ defer: false, wantsSound: true })
    ).toEqual({
      initialMuted: false,
      restoreSessionSoundOnProgrammaticPlay: true,
    });
  });

  it("defer keeps muted and disables restore", () => {
    expect(
      resolveTipLinkPlayerAudioProps({ defer: true, wantsSound: true })
    ).toEqual({
      initialMuted: true,
      restoreSessionSoundOnProgrammaticPlay: false,
    });
  });
});

describe("resolveTipLinkSurfaceTapAction", () => {
  it("docked always scrolls", () => {
    expect(
      resolveTipLinkSurfaceTapAction({ isDocked: true, playerMuted: true })
    ).toBe("scroll_to_video");
  });

  it("muted undocked unmutes; unmuted toggles pause", () => {
    expect(
      resolveTipLinkSurfaceTapAction({ isDocked: false, playerMuted: true })
    ).toBe("unmute");
    expect(
      resolveTipLinkSurfaceTapAction({ isDocked: false, playerMuted: false })
    ).toBe("toggle_pause");
  });
});

describe("shouldShowTipLinkTapForSound", () => {
  it("shows only when muted playing and not docked", () => {
    expect(
      shouldShowTipLinkTapForSound({
        playerMuted: true,
        isPlaying: true,
        isDocked: false,
      })
    ).toBe(true);
    expect(
      shouldShowTipLinkTapForSound({
        playerMuted: true,
        isPlaying: true,
        isDocked: true,
      })
    ).toBe(false);
    expect(
      shouldShowTipLinkTapForSound({
        playerMuted: false,
        isPlaying: true,
        isDocked: false,
      })
    ).toBe(false);
  });
});

describe("shouldShowTipLinkOpenInBrowserBanner", () => {
  it("shows for social WebViews only", () => {
    expect(shouldShowTipLinkOpenInBrowserBanner(IG_IPHONE)).toBe(true);
    expect(shouldShowTipLinkOpenInBrowserBanner(DESKTOP_CHROME)).toBe(false);
    expect(shouldShowTipLinkOpenInBrowserBanner(TWITTERBOT)).toBe(false);
  });
});
