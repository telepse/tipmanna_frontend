import { describe, expect, it, beforeEach, vi } from "vitest";

import {
  takeOverlayPlaySeed,
  writeOverlayPlaySeed,
} from "@/lib/playback-overlay-seed-handoff";

function installMemoryStorage() {
  const store = new Map<string, string>();
  const memory: Storage = {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
  };
  vi.stubGlobal("localStorage", memory);
  vi.stubGlobal("window", { localStorage: memory });
}

describe("playback-overlay-seed-handoff", () => {
  beforeEach(() => {
    installMemoryStorage();
  });

  it("write then take returns matching seed and clears storage", () => {
    writeOverlayPlaySeed({
      eventId: "e1",
      channelId: "c1",
      url: "https://youtu.be/abc",
      title: "Clip",
    });
    expect(takeOverlayPlaySeed("e1", "c1")).toEqual({
      eventId: "e1",
      channelId: "c1",
      url: "https://youtu.be/abc",
      title: "Clip",
    });
    expect(takeOverlayPlaySeed("e1", "c1")).toBeNull();
  });

  it("ignores mismatched event/channel", () => {
    writeOverlayPlaySeed({
      eventId: "e1",
      channelId: "c1",
      url: "https://youtu.be/abc",
    });
    expect(takeOverlayPlaySeed("e2", "c1")).toBeNull();
  });

  it("skips write without url", () => {
    writeOverlayPlaySeed({
      eventId: "e1",
      channelId: "c1",
    });
    expect(takeOverlayPlaySeed("e1", "c1")).toBeNull();
  });
});
