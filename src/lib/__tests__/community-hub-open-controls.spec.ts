import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("community-hub Open controls", () => {
  it("membership Details and history Open use openCommunity not join Links", () => {
    const src = readFileSync(
      join(__dirname, "../../components/community/community-hub-client.tsx"),
      "utf8"
    );
    expect(src).toContain("onOpenCommunity={openCommunity}");
    expect(src).toContain("onClick={() => openCommunity(m.communityId)}");
    expect(src).not.toMatch(
      /<Link href=\{exploreCommunityJoinHref\(m\.communityId\)\}>Details<\/Link>/
    );
    expect(src).not.toMatch(
      /<Link href=\{exploreCommunityJoinHref\(m\.communityId\)\}>\s*Open community\s*<\/Link>/
    );
  });
});
