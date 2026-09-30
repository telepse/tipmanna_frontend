import { describe, expect, it } from "vitest";
import { linksFingerprint } from "@/hooks/use-coowner-draft-submit-blocked";

describe("linksFingerprint", () => {
  it("ignores title so typing does not retrigger status refresh", () => {
    const a = linksFingerprint([
      {
        ownershipAnswer: "no",
        coOwnerDraftKey: "dk-1",
        title: "Old title",
      },
    ]);
    const b = linksFingerprint([
      {
        ownershipAnswer: "no",
        coOwnerDraftKey: "dk-1",
        title: "New title while typing",
      },
    ]);
    expect(a).toBe(b);
  });

  it("changes when draft key or ownership changes", () => {
    const base = linksFingerprint([
      { ownershipAnswer: "no", coOwnerDraftKey: "dk-1" },
    ]);
    expect(
      linksFingerprint([{ ownershipAnswer: "no", coOwnerDraftKey: "dk-2" }])
    ).not.toBe(base);
    expect(
      linksFingerprint([{ ownershipAnswer: "yes", coOwnerDraftKey: "dk-1" }])
    ).not.toBe(base);
  });
});
