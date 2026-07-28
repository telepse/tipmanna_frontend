import { describe, expect, it } from "vitest";

/** Pure helpers mirrored from use-coowner-draft-submit-blocked for regression tests. */
function linksFingerprint(
  links: { ownershipAnswer?: string | null; coOwnerDraftKey?: string | null }[]
): string {
  return links
    .map(l => `${l.ownershipAnswer ?? ""}:${l.coOwnerDraftKey ?? ""}`)
    .join(";;");
}

function coOwnedWatchKey(
  links: { ownershipAnswer?: string | null; coOwnerDraftKey?: string | null }[]
): string {
  return links
    .filter(link => link.ownershipAnswer === "no")
    .map(link => `${link.coOwnerDraftKey ?? ""}:${link.ownershipAnswer ?? ""}`)
    .join("|");
}

describe("co-owner submit blocked key stability (PR3)", () => {
  it("watchKey is stable when array reference changes but content is identical", () => {
    const a = [{ ownershipAnswer: "no", coOwnerDraftKey: "draft-1" }];
    const b = [{ ownershipAnswer: "no", coOwnerDraftKey: "draft-1" }];
    expect(linksFingerprint(a)).toBe(linksFingerprint(b));
    expect(coOwnedWatchKey(a)).toBe(coOwnedWatchKey(b));
  });

  it("watchKey is empty when no co-owned links", () => {
    expect(
      coOwnedWatchKey([{ ownershipAnswer: "yes", coOwnerDraftKey: "x" }])
    ).toBe("");
  });

  it("watchKey includes only co-owned links", () => {
    const key = coOwnedWatchKey([
      { ownershipAnswer: "yes", coOwnerDraftKey: "a" },
      { ownershipAnswer: "no", coOwnerDraftKey: "b" },
    ]);
    expect(key).toBe("b:no");
  });
});
