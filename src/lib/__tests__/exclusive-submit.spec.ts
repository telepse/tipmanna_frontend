import { describe, expect, it } from "vitest";
import {
  beginExclusiveSubmit,
  endExclusiveSubmit,
} from "@/lib/exclusive-submit";

describe("exclusive-submit", () => {
  it("allows only one in-flight submit", () => {
    const ref = { current: false };
    expect(beginExclusiveSubmit(ref)).toBe(true);
    expect(beginExclusiveSubmit(ref)).toBe(false);
    endExclusiveSubmit(ref);
    expect(beginExclusiveSubmit(ref)).toBe(true);
  });
});
