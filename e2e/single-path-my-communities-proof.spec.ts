import { test, expect, type Page } from "@playwright/test";
import { gotoExplore } from "./helpers/goto-explore";
import {
  installExploreHistoryInstrumentation,
  readExploreHistoryMetrics,
  resetExploreHistoryMetrics,
} from "./helpers/explore-native-history-instrumentation";
import {
  requireExploreNavigationReady,
} from "./helpers/wait-explore-feed-ready";
import { withE2eFixtures } from "./helpers/explore-test-fixtures";

const REPEAT = 10;

const ORIGINS = [
  { key: "trends", path: "/explore" },
  { key: "saves", path: "/explore?feedTab=saves" },
  { key: "tv", path: "/explore?feedTab=tv" },
  { key: "community", path: "/explore?feedTab=community" },
] as const;

function sp(url: string): URLSearchParams {
  return new URL(url, "http://localhost").searchParams;
}

async function gotoWithInstr(page: Page, path: string): Promise<void> {
  await installExploreHistoryInstrumentation(page);
  await gotoExplore(page, withE2eFixtures(path));
  await requireExploreNavigationReady(page, 60_000);
}

test.describe("My Communities navigation proof", () => {
  for (const origin of ORIGINS) {
    test(`from ${origin.key} (10x)`, async ({ page }) => {
      test.setTimeout(180_000);
      for (let i = 0; i < REPEAT; i += 1) {
        await gotoWithInstr(page, origin.path);
        const originFeedTab = sp(origin.path).get("feedTab") ?? "trends";
        await resetExploreHistoryMetrics(page);

        await page.getByTestId("explore-chrome-start-community").click();
        await requireExploreNavigationReady(page, 60_000);
        await expect
          .poll(() => sp(page.url()).get("tab"), { timeout: 5_000 })
          .toBe("my-communities");
        await expect(page.getByTestId("explore-chrome-start-community")).toHaveClass(
          /bg-white|text-white|shadow/
        );

        const afterClick = await readExploreHistoryMetrics(page);
        expect(afterClick.pushState).toBe(1);
        expect(afterClick.routerPush).toBe(0);

        await page.getByTestId("explore-chrome-feed").click();
        await requireExploreNavigationReady(page, 60_000);
        await expect
          .poll(() => sp(page.url()).get("tab"), { timeout: 5_000 })
          .toBeNull();
        expect(sp(page.url()).get("feedTab") ?? "trends").toBe(originFeedTab);

        await page.goBack();
        await requireExploreNavigationReady(page, 60_000);
        await expect
          .poll(() => sp(page.url()).get("tab"), { timeout: 5_000 })
          .toBe("my-communities");

        await page.goForward();
        await requireExploreNavigationReady(page, 60_000);
        await expect
          .poll(() => sp(page.url()).get("tab"), { timeout: 5_000 })
          .toBeNull();

        await page.reload({ waitUntil: "commit", timeout: 60_000 });
        await requireExploreNavigationReady(page, 60_000);
        expect(sp(page.url()).get("tab")).toBeNull();
      }
    });
  }
});
