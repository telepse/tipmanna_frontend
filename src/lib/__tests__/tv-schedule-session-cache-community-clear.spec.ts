import { beforeEach, describe, expect, it, vi } from "vitest";

import { tvScheduleSessionCacheKey } from "@/lib/tv-single-startup-schedule";
import {
  clearTvScheduleSessionCacheForCommunity,
  persistTvScheduleSessionCache,
} from "@/lib/tv-schedule-session-cache";

describe("clearTvScheduleSessionCacheForCommunity", () => {
  const storage = new Map<string, string>();

  beforeEach(() => {
    storage.clear();
    const sessionStorage = {
      removeItem: (key: string) => {
        storage.delete(key);
      },
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      getItem: (key: string) => storage.get(key) ?? null,
    };
    vi.stubGlobal("window", { sessionStorage });
    vi.stubGlobal("sessionStorage", sessionStorage);
  });

  it("clears only the denied community cache, not global", () => {
    persistTvScheduleSessionCache({ items: [] }, null, "comm-a");
    persistTvScheduleSessionCache({ items: [{ id: 1 }] }, null, null);

    clearTvScheduleSessionCacheForCommunity("comm-a");

    expect(
      sessionStorage.getItem(tvScheduleSessionCacheKey("comm-a"))
    ).toBeNull();
    expect(
      sessionStorage.getItem(tvScheduleSessionCacheKey(null))
    ).not.toBeNull();
  });
});
