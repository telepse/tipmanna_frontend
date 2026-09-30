import { describe, expect, it } from "vitest";
import { buildCreateChannelPayload } from "@/components/events/add-video-form";

const base = {
  title: "T",
  description: "",
  url: "https://youtube.com/watch?v=abc",
  isLive: false,
  setReminder: false,
  reminders: {},
  contentLanguage: "en-GB",
  contentCountry: "all",
  eventVideoType: "OTHER",
  hostYoutubeSlot: "1" as const,
  isOnHostYoutube: false,
  coOwnerDraftKey: "",
};

describe("buildCreateChannelPayload", () => {
  it("omits YouTube claim when slot selected but not verified", () => {
    const payload = buildCreateChannelPayload(base);
    expect(payload).not.toHaveProperty("onYoutubeChannelSlot");
    expect(payload).not.toHaveProperty("isOnHostYoutube");
  });

  it("includes YouTube claim after verify", () => {
    const payload = buildCreateChannelPayload({
      ...base,
      isOnHostYoutube: true,
    });
    expect(payload.onYoutubeChannelSlot).toBe(1);
    expect(payload.isOnHostYoutube).toBe(true);
  });
});
