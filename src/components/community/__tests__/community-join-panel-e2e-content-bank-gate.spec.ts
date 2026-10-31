import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("community-join-panel E2E content-bank gate", () => {
  const src = fs.readFileSync(
    path.join(__dirname, "../community-join-panel.tsx"),
    "utf8"
  );

  it("skips getApprovedCommunityContentBankAction under E2E fixtures", () => {
    expect(src).toMatch(/isExploreE2eFixturesEnabled\(window\.location\.search\)/);
    const bankBlock = src.slice(
      src.indexOf("Dual-gate: skip content-bank Server Action"),
      src.indexOf("getApprovedCommunityContentBankAction(communityId)")
    );
    expect(bankBlock).toMatch(/return;/);
    expect(src).toMatch(/getApprovedCommunityContentBankAction/);
  });
});
