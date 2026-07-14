import type { Page } from "@playwright/test";

/** Explore routes: do not wait for full load (Suspense streams may be slow). */
export async function gotoExplore(
  page: Page,
  path = "/explore",
  options?: Parameters<Page["goto"]>[1]
) {
  return page.goto(path, {
    waitUntil: "domcontentloaded",
    ...options,
  });
}
