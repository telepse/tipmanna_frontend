import { describe, expect, it } from "vitest";

import { resolveTipLinkLocaleDisplay } from "@/lib/tiplink-locale-display";

describe("resolveTipLinkLocaleDisplay", () => {
  it("prefers channel country over event country", () => {
    const result = resolveTipLinkLocaleDisplay({
      channel: {
        id: "ch-1",
        title: "T",
        description: null,
        url: "https://youtube.com/watch?v=x",
        numOfTips: 0,
        contentCountry: "Nigeria",
        contentLanguage: "en-GB",
      },
      event: {
        id: "ev-1",
        eventName: "E",
        eventSlug: "e",
        communityId: null,
        showAmountRaisedOnVideos: true,
        showViewCountOnVideos: true,
        showEncounterOnVideos: true,
        amountRaised: 0,
        amountToRaise: 1000,
        numOfTips: 0,
        contentCountry: "England",
        contentLanguage: "en-GB",
      },
    });
    expect(result.flagCode).toBe("ng");
    expect(result.flagUrl).toContain("ng");
  });

  it("falls back to event country when channel is worldwide", () => {
    const result = resolveTipLinkLocaleDisplay({
      channel: {
        id: "ch-1",
        title: "T",
        description: null,
        url: "https://youtube.com/watch?v=x",
        numOfTips: 0,
        contentCountry: "all",
        contentLanguage: "en-GB",
      },
      event: {
        id: "ev-1",
        eventName: "E",
        eventSlug: "e",
        communityId: null,
        showAmountRaisedOnVideos: true,
        showViewCountOnVideos: true,
        showEncounterOnVideos: true,
        amountRaised: 0,
        amountToRaise: 1000,
        numOfTips: 0,
        contentCountry: "England",
        contentLanguage: "en-GB",
      },
    });
    expect(result.flagCode).toBe("gb");
  });

  it("returns no flag when both are worldwide", () => {
    const result = resolveTipLinkLocaleDisplay({
      channel: {
        id: "ch-1",
        title: "T",
        description: null,
        url: "https://youtube.com/watch?v=x",
        numOfTips: 0,
        contentCountry: "all",
        contentLanguage: "en-GB",
      },
      event: {
        id: "ev-1",
        eventName: "E",
        eventSlug: "e",
        communityId: null,
        showAmountRaisedOnVideos: true,
        showViewCountOnVideos: true,
        showEncounterOnVideos: true,
        amountRaised: 0,
        amountToRaise: 1000,
        numOfTips: 0,
        contentCountry: "all",
        contentLanguage: "en-GB",
      },
    });
    expect(result.flagUrl).toBeNull();
  });
});
