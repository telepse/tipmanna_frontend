import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const frontendRoot = join(__dirname, "../../../..");

describe("PageLinkedV2ChunkAnchor route shells", () => {
  it("is mounted on partner and explore page shells for S2 page-linked scans", () => {
    const partner = readFileSync(
      join(frontendRoot, "src/app/partner/page.tsx"),
      "utf8"
    );
    const explore = readFileSync(
      join(frontendRoot, "src/app/explore/page.tsx"),
      "utf8"
    );
    for (const src of [partner, explore]) {
      expect(src).toContain("PageLinkedV2ChunkAnchor");
      expect(src).toContain("@/lib/analytics-sdk/page-linked-v2-chunk-anchor");
    }
  });
});
