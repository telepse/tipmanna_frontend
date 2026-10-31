import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Explore feed client warmers E2E gate", () => {
  const src = fs.readFileSync(
    path.join(__dirname, "../explore-feed-client.tsx"),
    "utf8"
  );

  it("gates drawer and TV catalog warmers under ActiveOnClient", () => {
    const drawerWarm = src.slice(
      src.indexOf("prefetchChannelDrawers({"),
      src.indexOf("prefetchChannelDrawers({") + 800
    );
    expect(drawerWarm).toMatch(/isExploreE2eFixturesActiveOnClient\(\)/);

    const uiIdx = src.indexOf("prefetchDrawerUiChunks();");
    const uiChunks = src.slice(uiIdx - 120, uiIdx + 40);
    expect(uiChunks).toMatch(/isExploreE2eFixturesActiveOnClient\(\)/);

    const catalogLoad = src.slice(
      src.indexOf("loadTvEventCatalog(activeEventId)"),
      src.indexOf("loadTvEventCatalog(activeEventId)") + 400
    );
    expect(catalogLoad).toMatch(/isExploreE2eFixturesActiveOnClient\(\)/);

    const tvPrefetchIdx = src.indexOf(
      "prefetchTvEventCatalogs(collectExploreFeedEventIds"
    );
    const catalogPrefetch = src.slice(tvPrefetchIdx - 200, tvPrefetchIdx + 60);
    expect(catalogPrefetch).toMatch(/isExploreE2eFixturesActiveOnClient\(\)/);
  });

  it("non-E2E path still invokes warmers", () => {
    expect(src).toMatch(/prefetchChannelDrawers\(/);
    expect(src).toMatch(/prefetchTvEventCatalogs\(/);
    expect(src).toMatch(/loadTvEventCatalog\(/);
  });

  it("skips saved-videos Server Action under ActiveOnClient", () => {
    const saves = src.slice(
      src.indexOf("const refreshSavedContents = useCallback"),
      src.indexOf("const refreshSavedContents = useCallback") + 500
    );
    expect(saves).toMatch(/isExploreE2eFixturesActiveOnClient\(\)/);
    expect(saves).toMatch(/getSavedVideosForTipper/);
  });
});
