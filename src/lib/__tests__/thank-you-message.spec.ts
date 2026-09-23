import { describe, expect, it } from "vitest";
import {
  DEFAULT_THANK_YOU_PREFIX,
  reassembleThankYouForSubmit,
  splitThankYouMessage,
} from "@/lib/thank-you-message";

describe("thank-you-message (frontend)", () => {
  it("splitThankYouMessage extracts prefix from legacy baked-in URL template", () => {
    const legacy =
      "Thank you for your engagement and support from Emediong http://localhost:3000/@tipper {amount} {character} {tippedAt}";
    const { prefix, suffix, unmatchedTail } = splitThankYouMessage(legacy);
    expect(prefix).toBe(DEFAULT_THANK_YOU_PREFIX);
    expect(suffix).toContain("Emediong");
    expect(unmatchedTail).toBeNull();
  });

  it("splitThankYouMessage splits long custom {amount} template", () => {
    const custom = `${"B".repeat(95)} thanks for {amount} on {character} and more text here`;
    const { prefix, unmatchedTail } = splitThankYouMessage(custom);
    expect(prefix).toHaveLength(100);
    expect(unmatchedTail).toBeTruthy();
    expect(`${prefix}${unmatchedTail}`).toBe(custom);
  });

  it("reassembleThankYouForSubmit joins prefix and unmatched tail", () => {
    const custom = `${"C".repeat(95)} thanks for {amount} on {character} and more text here`;
    const { prefix, unmatchedTail } = splitThankYouMessage(custom);
    expect(reassembleThankYouForSubmit(prefix, unmatchedTail)).toBe(custom);
  });

  it("reassembleThankYouForSubmit returns prefix when no tail", () => {
    expect(reassembleThankYouForSubmit(DEFAULT_THANK_YOU_PREFIX, null)).toBe(
      DEFAULT_THANK_YOU_PREFIX
    );
  });
});
