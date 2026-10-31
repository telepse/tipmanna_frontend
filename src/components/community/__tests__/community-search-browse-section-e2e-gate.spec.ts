import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("CommunitySearchBrowseSection Explore E2E gate", () => {
  const src = fs.readFileSync(
    path.join(__dirname, "../community-search-browse-section.tsx"),
    "utf8"
  );

  it("skips catalog and search Server Actions under ActiveOnClient", () => {
    const catalog = src.slice(
      src.indexOf("const loadCatalog = useCallback"),
      src.indexOf("useEffect(() => {", src.indexOf("AUTH_CHANGED_EVENT"))
    );
    expect(catalog).toMatch(/isExploreE2eFixturesActiveOnClient\(\)/);
    expect(catalog).toMatch(/return;\s*\n\s*}\s*\n\s*if \(!background\)/);

    const searchBlock = src.slice(
      src.indexOf("const q = searchQ.trim()"),
      src.indexOf("searchCommunitiesPreviewAction(q)") + 80
    );
    expect(searchBlock).toMatch(/isExploreE2eFixturesActiveOnClient\(\)/);
    expect(searchBlock).toMatch(/searchCommunitiesPreviewAction/);
  });
});
