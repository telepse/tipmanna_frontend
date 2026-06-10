import { describe, expect, it, vi } from "vitest";
import { validatePrivacyVideoLinks } from "../validate-privacy-video-links";

vi.mock("react-toastify", () => ({
  toast: { error: vi.fn() },
}));

describe("validatePrivacyVideoLinks", () => {
  it("blocks when ownership is not explicitly answered", () => {
    const ok = validatePrivacyVideoLinks({
      links: [
        {
          url: "https://youtube.com/watch?v=abc",
          isDefault: true,
        } as never,
      ],
    });
    expect(ok).toBe(false);
  });

  it("passes when ownership is explicitly yes", () => {
    const ok = validatePrivacyVideoLinks({
      links: [
        {
          url: "https://youtube.com/watch?v=abc",
          isDefault: true,
          ownershipAnswer: "yes",
        } as never,
      ],
    });
    expect(ok).toBe(true);
  });

  it("skips empty url rows", () => {
    const ok = validatePrivacyVideoLinks({
      links: [{ url: "", isDefault: false } as never],
    });
    expect(ok).toBe(true);
  });

  it("blocks live stream without ownership attestation", () => {
    const ok = validatePrivacyVideoLinks({
      links: [
        {
          url: "https://youtube.com/watch?v=abc",
          isDefault: true,
          ownershipAnswer: "yes",
        } as never,
      ],
      liveVideoLink: "https://youtube.com/live/xyz",
    });
    expect(ok).toBe(false);
  });

  it("passes live stream when matching video link has ownership", () => {
    const url = "https://youtube.com/live/xyz";
    const ok = validatePrivacyVideoLinks({
      links: [
        {
          url,
          isDefault: true,
          ownershipAnswer: "yes",
        } as never,
      ],
      liveVideoLink: url,
    });
    expect(ok).toBe(true);
  });

  it("blocks when slot is selected but YouTube verification not completed", () => {
    const ok = validatePrivacyVideoLinks({
      links: [
        {
          url: "https://youtube.com/watch?v=abc",
          isDefault: true,
          ownershipAnswer: "yes",
          onYoutubeChannelSlot: 1,
          isOnHostYoutube: false,
        } as never,
      ],
    });
    expect(ok).toBe(false);
  });

  it("passes when slot is selected and YouTube verification completed", () => {
    const ok = validatePrivacyVideoLinks({
      links: [
        {
          url: "https://youtube.com/watch?v=abc",
          isDefault: true,
          ownershipAnswer: "yes",
          onYoutubeChannelSlot: 1,
          isOnHostYoutube: true,
        } as never,
      ],
    });
    expect(ok).toBe(true);
  });
});
