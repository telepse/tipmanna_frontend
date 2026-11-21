import { describe, expect, it } from "vitest";

import {
  isTipLinkPaymentReturnPath,
  isYoutubeEmbedIdentityError,
  shouldForceTipLinkOpenInBrowserForPlayerError,
  shouldHardNavigatePaymentReturn,
  YOUTUBE_ERROR_EMBED_IDENTITY,
} from "../tiplink-payment-return";

describe("tiplink-payment-return", () => {
  it("detects YouTube embed identity error 153", () => {
    expect(isYoutubeEmbedIdentityError(153)).toBe(true);
    expect(isYoutubeEmbedIdentityError(YOUTUBE_ERROR_EMBED_IDENTITY)).toBe(
      true
    );
    expect(isYoutubeEmbedIdentityError(150)).toBe(false);
    expect(isYoutubeEmbedIdentityError(undefined)).toBe(false);
  });

  it("hard-navigates only TipLink /l paths after payment", () => {
    expect(isTipLinkPaymentReturnPath("/l/my-slug")).toBe(true);
    expect(isTipLinkPaymentReturnPath("/l/preview/abc")).toBe(true);
    expect(isTipLinkPaymentReturnPath("/explore")).toBe(false);
    expect(isTipLinkPaymentReturnPath("/tv")).toBe(false);
    expect(shouldHardNavigatePaymentReturn("/l/x")).toBe(true);
    expect(shouldHardNavigatePaymentReturn("/explore")).toBe(false);
  });

  it("forces open-in-browser on identity errors", () => {
    expect(shouldForceTipLinkOpenInBrowserForPlayerError(153)).toBe(true);
    expect(shouldForceTipLinkOpenInBrowserForPlayerError(2)).toBe(false);
  });
});
