#!/usr/bin/env node
/**
 * Static audit of TV page performance surface.
 * Run: npm run tv:perf-audit
 */
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

const ROOT = join(import.meta.dirname, "..");
const WRAPPER = join(ROOT, "src/components/tv/tv-page-client-wrapper.tsx");
const PROVIDER = join(ROOT, "src/components/tv-provider.tsx");
const PAGE = join(ROOT, "src/app/(tv)/tv/page.tsx");
const PLAYER = join(ROOT, "src/components/tv/tv-player.tsx");
const SHELL = join(ROOT, "src/components/tv/tv-interactive-shell.tsx");

function countMatches(text, pattern) {
  const re = new RegExp(pattern, "g");
  return (text.match(re) ?? []).length;
}

function getChunkSizes() {
  const nextDir = join(ROOT, ".next");
  let totalJs = 0;
  let fileCount = 0;
  function walk(dir) {
    let entries;
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const name of entries) {
      const p = join(dir, name);
      const st = statSync(p);
      if (st.isDirectory()) walk(p);
      else if (name.endsWith(".js") && p.includes("static")) {
        totalJs += st.size;
        fileCount += 1;
      }
    }
  }
  walk(join(nextDir, "static"));
  return { totalJs, fileCount };
}

function auditWrapperMountActions(text) {
  const actions = [
    "getAllTopTippers",
    "getTippedEventsForTipper",
    "getTotalAmountTippedByTipper",
    "getAllCausesAction",
    "getLatestContents",
    "getMostTippedContents",
    "getTipFeed",
    "getCommunityTipFeedAction",
    "scheduleExploreFeedPrefetchIdle",
    "prefetchTvEventCatalogs",
    "prefetchTvScheduleTips",
    "loadTvEventCatalog",
  ];
  const found = {};
  for (const a of actions) {
    found[a] = text.includes(a);
  }
  return found;
}

function main() {
  const wrapper = readFileSync(WRAPPER, "utf8");
  const provider = readFileSync(PROVIDER, "utf8");
  const page = readFileSync(PAGE, "utf8");
  const player = readFileSync(PLAYER, "utf8");
  const shell = readFileSync(SHELL, "utf8");

  const mountActions = auditWrapperMountActions(wrapper);
  const mountActionCount = Object.values(mountActions).filter(Boolean).length;
  const chunks = getChunkSizes();

  const report = {
    generatedAt: new Date().toISOString(),
    wrapperMountServerActionSymbols: mountActions,
    wrapperMountActionSymbolCount: mountActionCount,
    providerCatalogPrefetchDeferred: provider.includes(
      "schedulePostTtfvIdle(() => {\n      prefetchTvEventCatalogs"
    ),
    explorePrefetchOnTv: wrapper.includes("scheduleExploreFeedPrefetchIdle"),
    deadTipFeedState: wrapper.includes("const [, setTipFeed]"),
    deadSecondaryFetch: wrapper.includes("fetchSecondaryData"),
    wrapperPusherAcquireCount: countMatches(
      wrapper,
      "acquireGlobalLiveTvChannel|acquireCommunityLiveTvChannel"
    ),
    setTipFeedCallCount: countMatches(wrapper, "setTipFeed"),
    ssrGetAllCharacterSets: page.includes("getAllCharacterSets"),
    ssrGetCharactersForTipping: page.includes("getCharactersForTipping"),
    oembedOnCuedState:
      /event\.data === 5[\s\S]{0,400}notifyVideoAspect\(\)/.test(player),
    oembedDeferredToFirstPlay: player.includes("maybeNotifyVideoAspectOnce"),
    tvLoadMarkInstrumented: readFileSync(
      join(ROOT, "src/lib/tvDebugLog.ts"),
      "utf8"
    ).includes("tvLoadMark"),
    youtubePreconnectOnTv: readFileSync(
      join(ROOT, "src/app/(tv)/layout.tsx"),
      "utf8"
    ).includes("TvYoutubePreconnect"),
    dynamicPanelImports: countMatches(shell, "const \\w+Panel = dynamic"),
    dynamicDrawerImports:
      countMatches(
        readFileSync(join(ROOT, "src/components/tv/tv-looper.tsx"), "utf8"),
        "const \\w+Drawer = dynamic"
      ) +
      countMatches(
        readFileSync(join(ROOT, "src/components/tv/web-tv-looper.tsx"), "utf8"),
        "const \\w+Drawer = dynamic"
      ),
    featureFlagsModule: statSync(
      join(ROOT, "src/lib/tv-feature-flags.ts")
    ).isFile(),
    buildStaticJsBytes: chunks.totalJs,
    buildStaticJsFileCount: chunks.fileCount,
  };

  console.log(JSON.stringify(report, null, 2));
}

main();
