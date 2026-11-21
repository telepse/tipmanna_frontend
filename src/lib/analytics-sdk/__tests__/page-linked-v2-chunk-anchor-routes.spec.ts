import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const frontendRoot = join(__dirname, "../../../..");

describe("PageLinkedV2ChunkAnchor route shells", () => {
  it("anchor component bootstraps analytics session storage", () => {
    const anchor = readFileSync(
      join(frontendRoot, "src/lib/analytics-sdk/page-linked-v2-chunk-anchor.tsx"),
      "utf8"
    );
    expect(anchor).toContain("ensureAnalyticsSessionStorage");
    expect(anchor).toContain("useLayoutEffect");
  });

  it("is mounted on TipLink preview and public routes", () => {
    const preview = readFileSync(
      join(frontendRoot, "src/app/l/preview/[id]/page.tsx"),
      "utf8"
    );
    const publicPage = readFileSync(
      join(frontendRoot, "src/app/l/[slug]/page.tsx"),
      "utf8"
    );
    expect(preview).toContain("TipLinkPreviewPageShell");
    expect(publicPage).toContain("TipLinkPublicPageShell");
  });

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
