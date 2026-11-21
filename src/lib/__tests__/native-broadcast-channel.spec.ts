import { describe, expect, it } from "vitest";

import { pickNativeBroadcastEventChannelId } from "../native-broadcast-channel";
import type { EventRoomVideoChannel } from "@/types/event-room-channel.types";

describe("pickNativeBroadcastEventChannelId", () => {
  it("prefers native provenance channel for repeat sessions", () => {
    const channels: EventRoomVideoChannel[] = [
      { id: "linked-default", url: "u1", isDefault: true, mediaSource: "linked" },
      { id: "native-ch", url: "u2", mediaSource: "native" },
    ];
    expect(pickNativeBroadcastEventChannelId(channels)).toBe("native-ch");
  });

  it("uses default linked channel when no native channel exists", () => {
    const channels: EventRoomVideoChannel[] = [
      { id: "second", url: "u2" },
      { id: "default", url: "u1", isDefault: true, mediaSource: "linked" },
    ];
    expect(pickNativeBroadcastEventChannelId(channels)).toBe("default");
  });

  it("falls back to first channel when no default or native", () => {
    const channels: EventRoomVideoChannel[] = [
      { id: "only", url: "u1", mediaSource: "linked" },
    ];
    expect(pickNativeBroadcastEventChannelId(channels)).toBe("only");
  });
});
