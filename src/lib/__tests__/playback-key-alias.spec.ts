import { beforeEach, describe, expect, it } from "vitest";

import {
  clearPlaybackKeyState,
  getPlaybackKeyState,
  reservePlaybackKeyWithAlias,
} from "../playback-key-lifecycle";
import { buildTransactionAliasPlaybackKey } from "../payment-playback-key";

describe("playback key alias dedupe", () => {
  beforeEach(() => {
    clearPlaybackKeyState();
  });

  it("blocks fallback primary when realtime alias was reserved first", () => {
    const primary = "bundle-abc-0-Burger";
    const alias = buildTransactionAliasPlaybackKey({
      transactionId: "tx-1",
      characterName: "Burger",
      occurrenceIndex: 0,
    });

    expect(reservePlaybackKeyWithAlias(primary, alias)).toBe(true);
    expect(getPlaybackKeyState(alias)).toBe("reserved");
    expect(getPlaybackKeyState("tx:tx-1-0-Burger")).toBe("reserved");
  });

  it("blocks second primary when alias is already linked", () => {
    const alias = buildTransactionAliasPlaybackKey({
      transactionId: "tx-2",
      characterName: "Chicken",
      occurrenceIndex: 0,
    });
    const primary = "server-bundle-0-Chicken";

    expect(reservePlaybackKeyWithAlias(primary, alias)).toBe(true);
    expect(getPlaybackKeyState(primary)).toBe("reserved");
    expect(getPlaybackKeyState(alias)).toBe("reserved");
  });
});
