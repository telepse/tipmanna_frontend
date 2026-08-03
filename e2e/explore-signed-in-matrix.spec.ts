import { test, expect, type Page } from "@playwright/test";

import {
  discoverTagRow,
  exploreFilterTypeChip,
  openExploreFilters,
  selectFeedTypeFilter,
} from "./helpers/explore-filter-helpers";
import { gotoExplore } from "./helpers/goto-explore";
import { openExploreHeaderDiscoverSearch } from "./helpers/open-explore-discover-search";
import {
  E2E_JOIN_COMMUNITY_ID,
  E2E_SELECT_COMMUNITY_ID,
  withE2eFixtures,
} from "./helpers/explore-test-fixtures";
import {
  requireExploreNavigationReady,
  requirePopulatedExploreFeed,
  waitExploreFeedReady,
} from "./helpers/wait-explore-feed-ready";

function sp(url: string) {
  return new URL(url, "http://localhost").searchParams;
}

async function gotoSignedInExplore(page: Page, path: string) {
  await gotoExplore(page, withE2eFixtures(path));
  await requireExploreNavigationReady(page, 60_000);
}

test.describe.configure({ mode: "serial", timeout: 180_000 });

test.describe("signed-in explore matrix", () => {
  test.use({ storageState: ".auth/tipper.json" });

  test.beforeEach(({ page: _page }, testInfo) => {
    testInfo.skip(
      process.env.PLAYWRIGHT_AUTH_E2E !== "1",
      "Authenticated matrix requires PLAYWRIGHT_AUTH_E2E=1 and auth setup"
    );
  });

  test("Feed navigation Trends → Saves → TV → Community → Trends", async ({
    page,
  }) => {
    await gotoSignedInExplore(page, "/explore");
    await page.getByTestId("explore-subtab-saves").click();
    await expect
      .poll(() => sp(page.url()).get("feedTab"), { timeout: 8_000 })
      .toBe("saves");
    await page.getByTestId("explore-subtab-tv").click();
    await expect
      .poll(() => sp(page.url()).get("feedTab"), { timeout: 8_000 })
      .toBe("tv");
    await page.getByTestId("explore-subtab-community").click();
    await expect
      .poll(() => sp(page.url()).get("feedTab"), { timeout: 8_000 })
      .toBe("community");
    await page.getByTestId("explore-subtab-trends").click();
    await expect
      .poll(() => sp(page.url()).get("feedTab") ?? "trends", {
        timeout: 8_000,
      })
      .toBe("trends");
  });

  test("Filters on Trends — apply, clear, Back/Forward", async ({ page }) => {
    await gotoSignedInExplore(page, "/explore?feedTab=trends");
    await selectFeedTypeFilter(page, "Comedy");
    await expect
      .poll(() => sp(page.url()).get("feedTypes") ?? "", { timeout: 8_000 })
      .toContain("COMEDY");
    const comedyUrl = page.url();
    await page.goBack();
    await expect.poll(() => page.url(), { timeout: 8_000 }).not.toBe(comedyUrl);
    await page.goForward();
    await expect(page).toHaveURL(/feedTypes=.*COMEDY/i, { timeout: 8_000 });
    await expect(page.url()).toBe(comedyUrl);
    await openExploreFilters(page);
    await expect(exploreFilterTypeChip(page, "Comedy")).toHaveClass(
      /border-primary/,
      { timeout: 8_000 }
    );
    const chip = exploreFilterTypeChip(page, "Comedy");
    if (await chip.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await chip.click();
    }
  });

  test("My Communities from Trends with Back/Forward", async ({ page }) => {
    await gotoSignedInExplore(page, "/explore");
    await page.getByTestId("explore-chrome-start-community").click();
    await requireExploreNavigationReady(page, 60_000);
    await expect
      .poll(() => sp(page.url()).get("tab"), { timeout: 8_000 })
      .toBe("my-communities");
    const mcUrl = page.url();
    await page.goBack();
    await expect
      .poll(() => sp(page.url()).get("tab"), { timeout: 8_000 })
      .not.toBe("my-communities");
    await page.goForward();
    await expect(page).toHaveURL(/tab=my-communities/, { timeout: 8_000 });
    await expect(page.url()).toBe(mcUrl);
  });

  test("Community picker updates URL and refresh restores", async ({
    page,
  }) => {
    await gotoSignedInExplore(page, "/explore?feedTab=community");
    await page
      .getByRole("button", { name: /My Communities|\d+ communit/i })
      .first()
      .click();
    const e2eCommunityRow = page.getByRole("menuitemcheckbox", {
      name: "E2E Community",
    });
    const pickerEligible = await e2eCommunityRow
      .isVisible({ timeout: 30_000 })
      .catch(() => false);
    if (!pickerEligible) {
      test.skip(
        true,
        "Eligibility: signed-in picker needs active feedActive membership for E2E_SELECT_COMMUNITY_ID (dual-gate fixture merged when ?e2e=1)"
      );
      return;
    }
    await e2eCommunityRow.click();
    await expect
      .poll(() => sp(page.url()).get("communities"), { timeout: 8_000 })
      .toContain(E2E_SELECT_COMMUNITY_ID);
    const pickedUrl = page.url();
    await page.reload({ waitUntil: "commit", timeout: 60_000 });
    await requireExploreNavigationReady(page, 60_000);
    expect(sp(page.url()).get("communities")).toContain(
      E2E_SELECT_COMMUNITY_ID
    );
    expect(page.url()).toBe(pickedUrl);
  });

  test("Join Community deep link preserves feedTab", async ({ page }) => {
    await gotoExplore(
      page,
      withE2eFixtures(
        `/explore?tab=join&joinCommunity=${E2E_JOIN_COMMUNITY_ID}&feedTab=trends`
      )
    );
    await expect
      .poll(() => sp(page.url()).get("tab"), { timeout: 30_000 })
      .toBe("join");
    expect(sp(page.url()).get("joinCommunity")).toBe(E2E_JOIN_COMMUNITY_ID);
    expect(sp(page.url()).get("feedTab") ?? "trends").toBe("trends");
  });

  test("Discover open/close and return to Feed", async ({ page }) => {
    await gotoSignedInExplore(page, "/explore");
    await requirePopulatedExploreFeed(page, 60_000);
    await openExploreHeaderDiscoverSearch(page);
    const tag = discoverTagRow(page).first();
    if (await tag.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await tag.click();
      await expect(page).toHaveURL(/channel=/, { timeout: 15_000 });
      await page.goBack();
    }
    await expect(page.getByTestId("explore-feed-scroll")).toBeVisible({
      timeout: 30_000,
    });
  });

  test("signed-in Trends pagination loads continuations", async ({ page }) => {
    test.setTimeout(180_000);
    await gotoSignedInExplore(page, "/explore");
    const ready = await waitExploreFeedReady(page, 60_000);
    if (ready.state !== "scroll") {
      test.skip(true, "Populated feed required");
      return;
    }
    const boot = await page.locator("[data-explore-slide]").count();
    const scroll = page.getByTestId("explore-feed-scroll");
    await scroll.evaluate(
      (el, target) => {
        const slide = el.querySelector("[data-explore-slide]") as HTMLElement;
        const h = slide?.getBoundingClientRect().height ?? el.clientHeight;
        el.scrollTop = Math.max(0, target) * h;
        el.dispatchEvent(new Event("scroll", { bubbles: true }));
      },
      Math.max(0, boot - 5)
    );
    await expect(async () => {
      expect(
        await page.locator("[data-explore-slide]").count()
      ).toBeGreaterThan(boot);
    }).toPass({ timeout: 45_000 });
  });

  test("Back/Forward and refresh preserve Feed tab URL", async ({ page }) => {
    await gotoSignedInExplore(page, "/explore?feedTab=saves");
    await expect
      .poll(() => sp(page.url()).get("feedTab"), { timeout: 8_000 })
      .toBe("saves");
    const savesUrl = page.url();
    await page.getByTestId("explore-subtab-trends").click();
    await expect
      .poll(() => sp(page.url()).get("feedTab") ?? "trends", {
        timeout: 8_000,
      })
      .toBe("trends");
    await page.goBack();
    await expect(page).toHaveURL(/feedTab=saves/, { timeout: 8_000 });
    await expect(page.url()).toBe(savesUrl);
    await page.goForward();
    await expect
      .poll(() => sp(page.url()).get("feedTab") ?? "trends", {
        timeout: 8_000,
      })
      .toBe("trends");
    await page.reload({ waitUntil: "commit", timeout: 60_000 });
    await requireExploreNavigationReady(page, 60_000);
    expect(sp(page.url()).get("feedTab") ?? "trends").toBe("trends");
  });

  test("Feed reel index survives My Communities round-trip", async ({
    page,
  }) => {
    await gotoSignedInExplore(page, "/explore");
    const ready = await waitExploreFeedReady(page, 60_000);
    if (ready.state !== "scroll") {
      test.skip(true, "Populated feed required");
      return;
    }
    const scroll = page.getByTestId("explore-feed-scroll");
    await scroll.evaluate(el => {
      const slide = el.querySelector("[data-explore-slide]") as HTMLElement;
      const h = slide?.getBoundingClientRect().height ?? el.clientHeight;
      el.scrollTop = h * 2;
      el.dispatchEvent(new Event("scroll", { bubbles: true }));
    });
    const idxBefore = await scroll.evaluate(el => {
      const slide = el.querySelector("[data-explore-slide]") as HTMLElement;
      const h = slide?.getBoundingClientRect().height ?? el.clientHeight;
      return h > 0 ? Math.round(el.scrollTop / h) : 0;
    });
    await page.getByTestId("explore-chrome-start-community").click();
    await requireExploreNavigationReady(page, 60_000);
    await expect
      .poll(() => sp(page.url()).get("tab"), { timeout: 8_000 })
      .toBe("my-communities");
    await page.goBack();
    await expect(page.getByTestId("explore-feed-scroll")).toBeVisible({
      timeout: 30_000,
    });
    const idxAfter = await scroll.evaluate(el => {
      const slide = el.querySelector("[data-explore-slide]") as HTMLElement;
      const h = slide?.getBoundingClientRect().height ?? el.clientHeight;
      return h > 0 ? Math.round(el.scrollTop / h) : 0;
    });
    expect(idxAfter).toBe(idxBefore);
  });

  test("signed-in Saves pagination when eligible", async ({ page }) => {
    test.setTimeout(180_000);
    await gotoSignedInExplore(page, "/explore?feedTab=saves");
    const ready = await waitExploreFeedReady(page, 60_000);
    if (ready.state !== "scroll") {
      test.skip(true, "Saves feed not populated for staging account");
      return;
    }
    const boot = await page.locator("[data-explore-slide]").count();
    const scroll = page.getByTestId("explore-feed-scroll");
    await scroll.evaluate(
      (el, target) => {
        const slide = el.querySelector("[data-explore-slide]") as HTMLElement;
        const h = slide?.getBoundingClientRect().height ?? el.clientHeight;
        el.scrollTop = Math.max(0, target) * h;
        el.dispatchEvent(new Event("scroll", { bubbles: true }));
      },
      Math.max(0, boot - 5)
    );
    await expect(async () => {
      expect(
        await page.locator("[data-explore-slide]").count()
      ).toBeGreaterThan(boot);
    }).toPass({ timeout: 45_000 });
  });
});
