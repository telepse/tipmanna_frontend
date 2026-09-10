import { describe, expect, it, beforeEach, vi } from "vitest";

import {
  hasVideoTipReminderSessionShown,
  markVideoTipReminderSessionShown,
  videoTipReminderSessionKey,
} from "@/lib/video-tip-reminder-session";

describe("video-tip-reminder-session", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => store.clear(),
    });
    vi.stubGlobal("window", { sessionStorage: globalThis.sessionStorage });
  });

  it("builds stable session keys", () => {
    expect(videoTipReminderSessionKey("ch1", 120)).toBe(
      "video-tip-reminder:ch1:120"
    );
  });

  it("marks and reads session-once state", () => {
    expect(hasVideoTipReminderSessionShown("ch1", 60)).toBe(false);
    markVideoTipReminderSessionShown("ch1", 60);
    expect(hasVideoTipReminderSessionShown("ch1", 60)).toBe(true);
    expect(hasVideoTipReminderSessionShown("ch1", 120)).toBe(false);
  });
});
