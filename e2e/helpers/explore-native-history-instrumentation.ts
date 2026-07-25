import type { Page } from "@playwright/test";

export type ExploreHistoryMetrics = {
  pushState: number;
  replaceState: number;
  routerPush: number;
  routerReplace: number;
  navCount: number;
  popstate: number;
};

const INSTRUMENT_SCRIPT = `
(() => {
  if (window.__exploreHistoryInstr) return;
  const w = window.__exploreHistoryInstr = {
    pushState: 0, replaceState: 0, routerPush: 0, routerReplace: 0,
    navCount: 0, popstate: 0,
  };
  const origPush = history.pushState.bind(history);
  const origReplace = history.replaceState.bind(history);
  history.pushState = (...a) => { w.pushState++; return origPush(...a); };
  history.replaceState = (...a) => { w.replaceState++; return origReplace(...a); };
  window.addEventListener("popstate", () => { w.popstate++; });
  try {
    const obs = new PerformanceObserver(list => {
      for (const e of list.getEntries()) {
        if (e.entryType === "navigation") w.navCount++;
      }
    });
    obs.observe({ type: "navigation", buffered: true });
  } catch {}
  window.__exploreHistoryResetInstr = () => {
    w.pushState = 0; w.replaceState = 0; w.routerPush = 0;
    w.routerReplace = 0; w.popstate = 0;
  };
  window.__exploreHistoryReadInstr = () => ({ ...w });
})();
`;

export async function installExploreHistoryInstrumentation(
  page: Page
): Promise<void> {
  await page.addInitScript(INSTRUMENT_SCRIPT);
}

export async function resetExploreHistoryMetrics(page: Page): Promise<void> {
  await page.evaluate(() => window.__exploreHistoryResetInstr?.());
}

export async function readExploreHistoryMetrics(
  page: Page
): Promise<ExploreHistoryMetrics> {
  return page.evaluate(() => {
    const m = window.__exploreHistoryReadInstr?.();
    return (
      m ?? {
        pushState: 0,
        replaceState: 0,
        routerPush: 0,
        routerReplace: 0,
        navCount: 0,
        popstate: 0,
      }
    );
  });
}

declare global {
  interface Window {
    __exploreHistoryInstr?: ExploreHistoryMetrics;
    __exploreHistoryResetInstr?: () => void;
    __exploreHistoryReadInstr?: () => ExploreHistoryMetrics;
  }
}
