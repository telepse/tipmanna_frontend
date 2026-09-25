import { describe, expect, it } from "vitest";

import { shouldSkipSsrTipmannaTvBootstrap } from "@/lib/tv-ssr-bootstrap-skip";

describe("shouldSkipSsrTipmannaTvBootstrap", () => {
  it("skips only when videoId and channel resolve", () => {
    expect(
      shouldSkipSsrTipmannaTvBootstrap({
        videoId: "abc",
        currentChannel: { title: "Ch" },
      })
    ).toBe(true);
  });

  it("does not skip for videoId without channel", () => {
    expect(
      shouldSkipSsrTipmannaTvBootstrap({
        videoId: "abc",
        currentChannel: null,
      })
    ).toBe(false);
  });

  it("does not skip without videoId", () => {
    expect(
      shouldSkipSsrTipmannaTvBootstrap({
        videoId: undefined,
        currentChannel: { title: "Ch" },
      })
    ).toBe(false);
  });
});
