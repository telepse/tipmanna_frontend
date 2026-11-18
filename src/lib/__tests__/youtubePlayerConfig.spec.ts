import { describe, expect, it } from "vitest";

import {
  attachYoutubeEmbedIdentity,
  getYoutubePlayerVarsChromeless,
  getYoutubePlayerVarsMinimal,
} from "../youtubePlayerConfig";

describe("youtubePlayerConfig embed identity", () => {
  it("attaches origin and widget_referrer when origin provided", () => {
    expect(
      attachYoutubeEmbedIdentity({ controls: 0 }, "https://tipmanna.com")
    ).toEqual({
      controls: 0,
      origin: "https://tipmanna.com",
      widget_referrer: "https://tipmanna.com",
    });
  });

  it("leaves vars unchanged when origin empty", () => {
    expect(attachYoutubeEmbedIdentity({ controls: 0 }, "")).toEqual({
      controls: 0,
    });
  });

  it("chromeless and minimal include identity when origin passed", () => {
    const chromeless = getYoutubePlayerVarsChromeless({
      autoplay: true,
      mute: true,
      origin: "https://example.test",
    });
    expect(chromeless.origin).toBe("https://example.test");
    expect(chromeless.widget_referrer).toBe("https://example.test");

    const minimal = getYoutubePlayerVarsMinimal({
      autoplay: false,
      mute: true,
      origin: "https://example.test",
    });
    expect(minimal.origin).toBe("https://example.test");
    expect(minimal.widget_referrer).toBe("https://example.test");
  });
});
