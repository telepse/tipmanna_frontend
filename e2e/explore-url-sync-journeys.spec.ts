import { test, expect, type Page } from "@playwright/test";
import { gotoExplore } from "./helpers/goto-explore";
import { waitExploreFeedReady } from "./helpers/wait-explore-feed-ready";

async function waitFeedReady(page: Page) {
  const state = await waitExploreFeedReady(page, 60_000);
  if (state !== "scroll") {
    test.skip(true, "Feed scroll not available");
  }
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
    await gotoExplore(page);
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
    await gotoExplore(page);
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
    await gotoExplore(page);
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
    await gotoExplore(page);
    await waitFeedReady(page);
    const community = page.getByTestId("explore-subtab-community");
    if (!(await community.isVisible({ timeout: 3_000 }).catch(() => false))) {
      test.skip(
        true,
        "Community sub-tab not visible (viewport or feature flag)"
      );
      return;
    }

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
    await gotoExplore(page);
    await waitFeedReady(page);

    const search = page.locator(
      'input[placeholder="Search videos..."]:visible'
    );
    await expect(search).toBeVisible({ timeout: 30_000 });
    await search.click();
    await search.fill("music");
    await search.press("Enter");

    await expect(page.getByRole("dialog", { name: "Discover" })).toBeVisible({
      timeout: 30_000,
    });
    await expectNoDiscoverTab(page);

    await page.getByTestId("discover-panel-expand").click();
    await expectMainTab(page, "discover");
    await expect(
      page.getByRole("heading", { name: "Spotlight" }).first()
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("explore-feed-scroll")).toBeAttached();

    await page.getByTestId("explore-chrome-feed").click();
    await expect
      .poll(() => new URL(page.url()).searchParams.get("tab"), {
        timeout: 8_000,
      })
      .toBeNull();
    await expect(page.getByTestId("explore-feed-scroll")).toBeVisible({
      timeout: 15_000,
    });
  });

  test("Discover → Feed deep link restores feed shell", async ({ page }) => {
    await gotoExplore(page, "/explore?tab=discover&feedTab=tv");
    await expect(
      page.getByRole("heading", { name: "Spotlight" }).first()
    ).toBeVisible({ timeout: 30_000 });
    await expectFeedTab(page, "tv");
    await page.getByTestId("explore-chrome-feed").click();
    await expectFeedTab(page, "tv");
    await expect(page.getByRole("button", { name: "TV" })).toHaveClass(
      /bg-white/,
      { timeout: 10_000 }
    );
  });

  test("browser back and forward restore sub-tab and URL", async ({ page }) => {
    await gotoExplore(page);
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
      await gotoExplore(page, "/explore?feedTab=saves");
      await expect(page.getByTestId("explore-subtab-saves")).toHaveClass(
        /bg-white/,
        { timeout: 15_000 }
      );
      await expectFeedTab(page, "saves");
    }
  });

  test("join community deep link preserves feedTab", async ({ page }) => {
    const communityId = "11111111-1111-4111-8111-111111111111";
    await gotoExplore(
      page,
      `/explore?tab=join&joinCommunity=${communityId}&feedTab=tv`
    );
    await expectMainTab(page, "join");
    await expectFeedTab(page, "tv");
    await expect(page).toHaveURL(new RegExp(`joinCommunity=${communityId}`));
  });
});
