#!/usr/bin/env node
/**
 * Static audit of TV page client-side server-action surface on mount.
 * Run from frontend/: node scripts/tv-performance-audit.mjs
 */
import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";

const ROOT = join(import.meta.dirname, "..");
const WRAPPER = join(ROOT, "src/components/tv/tv-page-client-wrapper.tsx");
const PROVIDER = join(ROOT, "src/components/tv-provider.tsx");

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

  const mountActions = auditWrapperMountActions(wrapper);
  const mountActionCount = Object.values(mountActions).filter(Boolean).length;

  const providerPrefetch = provider.includes("prefetchTvEventCatalogs");
  const explorePrefetch = wrapper.includes("scheduleExploreFeedPrefetchIdle");
  const deadTipFeed = wrapper.includes("const [, setTipFeed]");
  const deadSecondary = wrapper.includes("fetchSecondaryData");
  const pusherBindings =
    countMatches(
      wrapper,
      "acquireGlobalLiveTvChannel|acquireCommunityLiveTvChannel"
    ) + countMatches(wrapper, "setTipFeed");

  const chunks = getChunkSizes();

  const report = {
    generatedAt: new Date().toISOString(),
    wrapperMountServerActionSymbols: mountActions,
    wrapperMountActionSymbolCount: mountActionCount,
    providerCatalogPrefetch: providerPrefetch,
    explorePrefetchOnTv: explorePrefetch,
    deadTipFeedState: deadTipFeed,
    deadSecondaryFetch: deadSecondary,
    wrapperPusherAcquireCount: countMatches(
      wrapper,
      "acquireGlobalLiveTvChannel|acquireCommunityLiveTvChannel"
    ),
    setTipFeedCallCount: countMatches(wrapper, "setTipFeed"),
    buildStaticJsBytes: chunks.totalJs,
    buildStaticJsFileCount: chunks.fileCount,
  };

  console.log(JSON.stringify(report, null, 2));
}

main();
