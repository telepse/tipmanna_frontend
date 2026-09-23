/**
 * @vitest-environment happy-dom
 */
import { afterEach, describe, expect, it } from "vitest";

import {
  consumeHostSubscriptionResume,
  peekHostSubscriptionResume,
  setHostSubscriptionResume,
} from "@/lib/host-subscription-resume";

describe("host-subscription-resume", () => {
  afterEach(() => {
    sessionStorage.clear();
  });

  it("write read consume once", () => {
    setHostSubscriptionResume({
      kind: "create-playlist",
      returnPath: "/u/@creator",
    });
    expect(peekHostSubscriptionResume()?.kind).toBe("create-playlist");
    const consumed = consumeHostSubscriptionResume();
    expect(consumed?.returnPath).toBe("/u/@creator");
    expect(peekHostSubscriptionResume()).toBeNull();
    expect(consumeHostSubscriptionResume()).toBeNull();
  });

  it("stores create-tiplink-draft with channelId", () => {
    setHostSubscriptionResume({
      kind: "create-tiplink-draft",
      returnPath: "/@host",
      channelId: "ch-1",
      eventId: "ev-1",
      title: "My video",
    });
    const peek = peekHostSubscriptionResume();
    expect(peek?.kind).toBe("create-tiplink-draft");
    expect(peek?.channelId).toBe("ch-1");
  });

  it("ignores create-tiplink-draft without channelId", () => {
    sessionStorage.setItem(
      "host_subscription_resume",
      JSON.stringify({
        kind: "create-tiplink-draft",
        returnPath: "/@host",
      })
    );
    expect(peekHostSubscriptionResume()).toBeNull();
  });

  it("clearStorageViaConsume removes pending resume", () => {
    setHostSubscriptionResume({
      kind: "change-photo",
      returnPath: "/u/@creator",
    });
    consumeHostSubscriptionResume();
    expect(peekHostSubscriptionResume()).toBeNull();
  });

  it("stores return-path without channelId", () => {
    setHostSubscriptionResume({
      kind: "return-path",
      returnPath: "/host/slug/host-premium?tab=playlist",
    });
    expect(peekHostSubscriptionResume()?.kind).toBe("return-path");
  });

  it("ignores invalid stored payload", () => {
    sessionStorage.setItem(
      "host_subscription_resume",
      JSON.stringify({ kind: "unknown", returnPath: "/x" })
    );
    expect(peekHostSubscriptionResume()).toBeNull();
  });
});
