import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("useCommunityJoinFlow", () => {
  it("opens join modal for all users without router.push sign-in redirect", () => {
    const src = readFileSync(
      join(__dirname, "../../hooks/use-community-join-flow.ts"),
      "utf8"
    );
    expect(src).not.toContain("router.push");
    expect(src).not.toContain("signInOpen");
    expect(src).not.toContain("TipperEmailOtpSignInDialog");
    expect(src).toContain("setJoinCommunityId(id)");
    expect(src).not.toMatch(/if\s*\(\s*!isAuthenticated\s*\)/);
  });
});
