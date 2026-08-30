import { describe, expect, it } from "vitest";

import {
  isYoutubeVerifyResponseCurrent,
  mintYoutubeVerifyRequest,
  resolveYoutubeVerifyOutcome,
} from "@/lib/youtube-verify-request.util";

describe("youtube verify request correlation", () => {
  const urlA = "https://youtube.com/watch?v=on-channel";
  const urlB = "https://youtube.com/watch?v=wrong-channel";

  it("mints a trimmed request context", () => {
    expect(
      mintYoutubeVerifyRequest("  https://youtube.com/watch?v=x  ", 1, 3)
    ).toEqual({
      requestId: 3,
      url: "https://youtube.com/watch?v=x",
      slot: 1,
    });
  });

  it("ignores stale responses when the URL changed during the request", () => {
    const request = mintYoutubeVerifyRequest(urlA, 1, 1);
    const outcome = resolveYoutubeVerifyOutcome(request, 1, urlB, 1, {
      success: true,
      data: { status: "verified" },
    });
    expect(outcome).toEqual({ kind: "stale" });
  });

  it("ignores stale responses when the slot changed during the request", () => {
    const request = mintYoutubeVerifyRequest(urlA, 1, 1);
    const outcome = resolveYoutubeVerifyOutcome(request, 1, urlA, 2, {
      success: true,
      data: { status: "verified" },
    });
    expect(outcome).toEqual({ kind: "stale" });
  });

  it("ignores stale responses when a newer verify was started", () => {
    const staleRequest = mintYoutubeVerifyRequest(urlA, 1, 1);
    const outcome = resolveYoutubeVerifyOutcome(staleRequest, 2, urlA, 1, {
      success: true,
      data: { status: "verified" },
    });
    expect(outcome).toEqual({ kind: "stale" });
  });

  it("lets the latest verification request win over an older in-flight response", () => {
    const staleRequest = mintYoutubeVerifyRequest(urlA, 1, 1);
    const latestRequest = mintYoutubeVerifyRequest(urlB, 1, 2);

    expect(
      resolveYoutubeVerifyOutcome(staleRequest, 2, urlB, 1, {
        success: true,
        data: { status: "verified" },
      })
    ).toEqual({ kind: "stale" });

    expect(
      resolveYoutubeVerifyOutcome(latestRequest, 2, urlB, 1, {
        success: true,
        data: { status: "not_found", message: "Video not found" },
      })
    ).toEqual({
      kind: "not_found",
      message: "Video not found",
    });
  });

  it("still succeeds when the current form matches the request", () => {
    const request = mintYoutubeVerifyRequest(urlA, 2, 5);
    expect(
      resolveYoutubeVerifyOutcome(request, 5, urlA, 2, {
        success: true,
        data: { status: "verified" },
      })
    ).toEqual({ kind: "verified" });
  });

  it("still fails for wrong-channel verification when the request is current", () => {
    const request = mintYoutubeVerifyRequest(urlB, 1, 7);
    expect(
      resolveYoutubeVerifyOutcome(request, 7, urlB, 1, {
        success: true,
        data: {
          status: "not_found",
          message: "Video not found on the selected YouTube channel",
        },
      })
    ).toEqual({
      kind: "not_found",
      message: "Video not found on the selected YouTube channel",
    });
  });

  it("does not apply transport errors from stale requests", () => {
    const request = mintYoutubeVerifyRequest(urlA, 1, 1);
    expect(
      resolveYoutubeVerifyOutcome(request, 2, urlA, 1, {
        success: false,
        message: "Network error",
      })
    ).toEqual({ kind: "stale" });
  });

  it("isYoutubeVerifyResponseCurrent requires all three correlation fields", () => {
    const request = mintYoutubeVerifyRequest(urlA, 1, 4);
    expect(isYoutubeVerifyResponseCurrent(request, 4, urlA, 1)).toBe(true);
    expect(isYoutubeVerifyResponseCurrent(request, 3, urlA, 1)).toBe(false);
    expect(isYoutubeVerifyResponseCurrent(request, 4, urlB, 1)).toBe(false);
    expect(isYoutubeVerifyResponseCurrent(request, 4, urlA, 2)).toBe(false);
  });
});
