import { test, expect, type Page } from "@playwright/test";
import { gotoExplore } from "./helpers/goto-explore";
import { openExploreHeaderDiscoverSearch } from "./helpers/open-explore-discover-search";
import {
  E2E_JOIN_COMMUNITY_ID,
  withE2eFixtures,
} from "./helpers/explore-test-fixtures";
import { requireExploreNavigationReady } from "./helpers/wait-explore-feed-ready";

async function waitFeedReady(page: Page) {
  await requireExploreNavigationReady(page, 60_000);
}

async function expectFeedTab(page: Page, tab: string) {
  await expect
    .poll(() => new URL(page.url()).searchParams.get("feedTab"), {
      timeout: 12_000,
    })
    .toBe(tab);
}

async function expectMainTab(page: Page, tab: string) {
  await expect
    .poll(() => new URL(page.url()).searchParams.get("tab"), {
      timeout: 12_000,
    })
    .toBe(tab);
}

async function expectNoDiscoverTab(page: Page) {
  await expect
    .poll(() => new URL(page.url()).searchParams.get("tab"), { timeout: 8_000 })
    .not.toBe("discover");
}

test.describe("explore URL sync journeys", () => {
  test("feed sub-tab transitions sync URL immediately (10x)", async ({
    page,
  }) => {
    await gotoExplore(page, withE2eFixtures("/explore"));
    await waitFeedReady(page);

    for (let i = 0; i < 10; i++) {
      await page.getByTestId("explore-subtab-saves").click();
      await expectFeedTab(page, "saves");
      await expect(page.getByTestId("explore-subtab-saves")).toHaveClass(
        /bg-white/
      );

      await page.getByTestId("explore-subtab-tv").click();
      await expectFeedTab(page, "tv");

      await page.getByTestId("explore-subtab-trends").click();
      await expectFeedTab(page, "trends");
    }
  });

  test("rapid sub-tab clicks after hydration converge on final URL (10x)", async ({
    page,
  }) => {
    await gotoExplore(page, withE2eFixtures("/explore"));
    await waitFeedReady(page);

    for (let i = 0; i < 10; i++) {
      await page.getByTestId("explore-subtab-trends").click();
      await page.getByTestId("explore-subtab-saves").click();
      await page.getByTestId("explore-subtab-tv").click();
      await expectFeedTab(page, "tv");
      await page.getByTestId("explore-subtab-trends").click();
      await expectFeedTab(page, "trends");
    }
  });

  test("Trends → Start Community preserves feedTab (10x)", async ({ page }) => {
    await gotoExplore(page, withE2eFixtures("/explore"));
    await waitFeedReady(page);

    for (let i = 0; i < 10; i++) {
      await page.getByTestId("explore-subtab-saves").click();
      await expectFeedTab(page, "saves");
      await page.getByTestId("explore-chrome-start-community").click();
      await expectMainTab(page, "my-communities");
      await expectFeedTab(page, "saves");
      await page.getByTestId("explore-chrome-feed").click();
      await expectFeedTab(page, "saves");
      await expect
        .poll(() => new URL(page.url()).searchParams.get("tab"), {
          timeout: 8_000,
        })
        .toBeNull();
    }
  });

  test("Community sub-tab syncs URL when visible (10x)", async ({ page }) => {
    await gotoExplore(page, withE2eFixtures("/explore"));
    await waitFeedReady(page);
    const community = page.getByTestId("explore-subtab-community");
    await expect(community).toBeVisible({ timeout: 5_000 });

    for (let i = 0; i < 10; i++) {
      await community.click();
      await expectFeedTab(page, "community");
      await page.getByTestId("explore-subtab-trends").click();
      await expectFeedTab(page, "trends");
    }
  });

  test("Discover quick panel expand navigates client-side to tab=discover", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await gotoExplore(page, withE2eFixtures("/explore"));
    await waitFeedReady(page);
    await openExploreHeaderDiscoverSearch(page);

    await expect(page.getByRole("dialog", { name: "Discover" })).toBeVisible({
      timeout: 30_000,
    });
    await expectNoDiscoverTab(page);

    await page.getByTestId("discover-panel-expand").click();
    await expectMainTab(page, "discover");
    await expect(
      page.getByRole("heading", { name: "Spotlight" }).first()
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("explore-feed-shell")).toBeAttached();

    await page.getByTestId("explore-chrome-feed").click();
    await expect
      .poll(() => new URL(page.url()).searchParams.get("tab"), {
        timeout: 8_000,
      })
      .toBeNull();
    await requireExploreNavigationReady(page, 15_000);
  });

  test("Discover → Feed deep link restores feed shell", async ({ page }) => {
    await gotoExplore(
      page,
      withE2eFixtures("/explore?tab=discover&feedTab=tv&e2eTv=1")
    );
    await expect(
      page.getByRole("heading", { name: "Spotlight" }).first()
    ).toBeVisible({ timeout: 30_000 });
    await expectFeedTab(page, "tv");
    await page.getByTestId("explore-chrome-feed").click();
    await expectFeedTab(page, "tv");
    await expect(page.getByTestId("explore-subtab-tv")).toHaveClass(
      /bg-white/,
      { timeout: 10_000 }
    );
  });

  test("browser back and forward restore sub-tab and URL", async ({ page }) => {
    await gotoExplore(page, withE2eFixtures("/explore"));
    await waitFeedReady(page);

    await page.getByTestId("explore-subtab-saves").click();
    await expectFeedTab(page, "saves");

    await page.getByTestId("explore-subtab-tv").click();
    await expectFeedTab(page, "tv");

    await page.goBack();
    await expectFeedTab(page, "saves");
    await expect(page.getByTestId("explore-subtab-saves")).toHaveClass(
      /bg-white/,
      { timeout: 10_000 }
    );

    await page.goForward();
    await expectFeedTab(page, "tv");
  });

  test("feedTab deep link hydrates immediately after load (10x poll)", async ({
    page,
  }) => {
    for (let i = 0; i < 10; i++) {
      await gotoExplore(page, withE2eFixtures("/explore?feedTab=saves"));
      await expect(page.getByTestId("explore-subtab-saves")).toHaveClass(
        /bg-white/,
        { timeout: 15_000 }
      );
      await expectFeedTab(page, "saves");
    }
  });

  test("join community deep link preserves feedTab", async ({ page }) => {
    test.setTimeout(120_000);
    await gotoExplore(
      page,
      withE2eFixtures(
        `/explore?tab=join&joinCommunity=${E2E_JOIN_COMMUNITY_ID}&feedTab=tv&e2eTv=1`
      ),
      { waitUntil: "commit", timeout: 60_000 }
    );
    await expectMainTab(page, "join");
    await expectFeedTab(page, "tv");
    await expect(page).toHaveURL(
      new RegExp(`joinCommunity=${E2E_JOIN_COMMUNITY_ID}`)
    );
  });

  test("Discover sheet Open community closes panel and navigates to join tab", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await gotoExplore(page, withE2eFixtures("/explore"));
    await waitFeedReady(page);
    await openExploreHeaderDiscoverSearch(page, "");

    const discoverDialog = page.getByRole("dialog", { name: "Discover" });
    await expect(discoverDialog).toBeVisible({ timeout: 30_000 });

    const openCommunityBtn = discoverDialog
      .getByRole("button", { name: "Open community" })
      .first();
    await expect(openCommunityBtn).toBeVisible({ timeout: 30_000 });
    await openCommunityBtn.scrollIntoViewIfNeeded();
    await openCommunityBtn.click();

    await expect(discoverDialog).not.toBeVisible({ timeout: 15_000 });
    await expectMainTab(page, "join");
    await expect
      .poll(() => new URL(page.url()).searchParams.get("joinCommunity"), {
        timeout: 12_000,
      })
      .toBe(E2E_JOIN_COMMUNITY_ID);
    await expect(
      page.getByRole("heading", { name: /E2E Join Community/i })
    ).toBeVisible({ timeout: 15_000 });
  });
});
