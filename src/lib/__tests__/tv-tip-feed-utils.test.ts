import { describe, expect, it } from "vitest";
import {
  mergeTipFeedDeduped,
  normalizeTipFeedList,
  prependTipFeedDeduped,
  rawToTipFeedMessage,
} from "../tv-tip-feed-utils";

describe("tv-tip-feed-utils", () => {
  it("normalizes and dedupes feed rows by id", () => {
    const list = normalizeTipFeedList([
      { id: "1", sender: "A", text: "hi", tip: 5 },
      { id: "1", sender: "B", text: "dup", tip: 5 },
      { id: "2", sender: "C", text: "yo", tip: 3 },
    ]);
    expect(list).toHaveLength(2);
    expect(list.map(r => r.id)).toEqual(["1", "2"]);
  });

  it("prepends with dedupe", () => {
    const prev = [
      {
        id: "1",
        sender: "A",
        text: "old",
        tip: 1,
        purchasedSummary: "",
      },
    ];
    const msg = rawToTipFeedMessage({
      id: "2",
      sender: "B",
      text: "new",
      tip: 2,
    });
    expect(msg).not.toBeNull();
    const next = prependTipFeedDeduped(prev, msg!);
    expect(next[0].id).toBe("2");
    expect(next).toHaveLength(2);
  });

  it("merges refetched rows without clearing on empty", () => {
    const prev = [
      {
        id: "1",
        sender: "A",
        text: "keep",
        tip: 1,
        purchasedSummary: "",
      },
    ];
    expect(mergeTipFeedDeduped(prev, [])).toEqual(prev);
    const merged = mergeTipFeedDeduped(prev, [
      { id: "2", sender: "B", text: "new", tip: 2, purchasedSummary: "" },
    ]);
    expect(merged.map(r => r.id).sort()).toEqual(["1", "2"]);
  });
});
