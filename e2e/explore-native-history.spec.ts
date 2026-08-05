import { test, expect, type Page } from "@playwright/test";

import { gotoExplore } from "./helpers/goto-explore";
import {
  discoverTagRow,
  exploreFilterTypeChip,
  openExploreFilters,
  selectFeedTypeFilter,
  setCountryFilter,
  setLanguageFilter,
} from "./helpers/explore-filter-helpers";
import {
  installExploreHistoryInstrumentation,
  readExploreHistoryMetrics,
  resetExploreHistoryMetrics,
} from "./helpers/explore-native-history-instrumentation";
import {
  E2E_JOIN_COMMUNITY_ID,
  E2E_SELECT_COMMUNITY_ID,
  withE2eFixtures,
} from "./helpers/explore-test-fixtures";
import {
  requireExploreNavigationReady,
  requirePopulatedExploreFeed,
} from "./helpers/wait-explore-feed-ready";

const REPEAT = 10;

const FILTER_ORIGINS = [
  { key: "bare", path: "/explore" },
  { key: "trends", path: "/explore?feedTab=trends" },
  { key: "saves", path: "/explore?feedTab=saves" },
  { key: "tv", path: "/explore?feedTab=tv&e2eTv=1" },
  { key: "community", path: "/explore?feedTab=community" },
] as const;

const MC_ORIGINS = [
  { key: "trends", path: "/explore" },
  { key: "saves", path: "/explore?feedTab=saves" },
  { key: "tv", path: "/explore?feedTab=tv&e2eTv=1" },
  { key: "community", path: "/explore?feedTab=community" },
] as const;

function sp(url: string) {
  return new URL(url, "http://localhost").searchParams;
}

async function gotoWithInstr(page: Page, path: string) {
  await installExploreHistoryInstrumentation(page);
  await gotoExplore(page, withE2eFixtures(path));
  await requireExploreNavigationReady(page, 60_000);
}

async function expectFeedTab(page: Page, tab: string) {
  await expect
    .poll(() => sp(page.url()).get("feedTab") ?? "trends", { timeout: 8_000 })
    .toBe(tab);
}

test.describe.configure({ mode: "serial", timeout: 180_000 });

test.describe("explore native history — formal matrix", () => {
  test.describe("filter matrix", () => {
    for (const origin of FILTER_ORIGINS) {
      test(`Comedy filter from ${origin.key} (10x)`, async ({ page }) => {
        for (let i = 0; i < REPEAT; i++) {
          await gotoWithInstr(page, origin.path);
          if (origin.key === "community") {
            // Product contract: feed filters apply to Trends, Saves, and TV only.
            await page.getByTestId("explore-subtab-trends").click();
            await expectFeedTab(page, "trends");
          }
          await resetExploreHistoryMetrics(page);
          const h0 = await page.evaluate(() => history.length);
          await selectFeedTypeFilter(page, "Comedy");
          await expect
            .poll(() => sp(page.url()).get("feedTypes") ?? "", {
              timeout: 2_000,
            })
            .toContain("COMEDY");
          const instr = await readExploreHistoryMetrics(page);
          expect(instr.pushState).toBe(1);
          expect(instr.replaceState).toBe(0);
          expect((await page.evaluate(() => history.length)) - h0).toBe(1);
          await page.goBack();
          await expect
            .poll(() => sp(page.url()).get("feedTypes"), { timeout: 2_000 })
            .toBeNull();
          await page.goForward();
          await expect(page).toHaveURL(/feedTypes=.*COMEDY/i);
        }
      });
    }

    test("language, country, combined, clear, rapid (10x each)", async ({
      page,
    }) => {
      for (let i = 0; i < REPEAT; i++) {
        await gotoWithInstr(page, "/explore");
        await setLanguageFilter(page, "en-GB");
        await expect
          .poll(() => sp(page.url()).get("feedLang"), { timeout: 2_000 })
          .toBe("en-GB");
        await gotoWithInstr(page, "/explore");
        await setCountryFilter(page, "GB");
        await expect
          .poll(() => sp(page.url()).get("feedCountry"), { timeout: 2_000 })
          .toBe("GB");
        await gotoWithInstr(page, "/explore");
        await selectFeedTypeFilter(page, "Comedy");
        await selectFeedTypeFilter(page, "Concert");
        const types = sp(page.url()).get("feedTypes") ?? "";
        expect(types).toContain("COMEDY");
        expect(types).toContain("CONCERT_MUSIC");
        await gotoWithInstr(
          page,
          withE2eFixtures("/explore?feedTypes=COMEDY&feedTab=saves")
        );
        await openExploreFilters(page);
        await exploreFilterTypeChip(page, "Comedy").click();
        await expect
          .poll(() => sp(page.url()).get("feedTypes"), { timeout: 2_000 })
          .toBeNull();
        expect(sp(page.url()).get("feedTab")).toBe("saves");
      }
    });
  });

  test.describe("My Communities matrix", () => {
    for (const origin of MC_ORIGINS) {
      test(`from ${origin.key} (10x)`, async ({ page }) => {
        test.setTimeout(180_000);
        for (let i = 0; i < REPEAT; i++) {
          await gotoWithInstr(page, origin.path);
          const originFeedTab = sp(`${origin.path}`).get("feedTab") ?? "trends";
          await resetExploreHistoryMetrics(page);
          const h0 = await page.evaluate(() => history.length);
          await page.getByTestId("explore-chrome-start-community").click();
          await expect
            .poll(() => sp(page.url()).get("tab"), { timeout: 2_000 })
            .toBe("my-communities");
          await page.getByTestId("explore-chrome-feed").click();
          await expect
            .poll(() => sp(page.url()).get("tab"), { timeout: 2_000 })
            .toBeNull();
          expect(sp(page.url()).get("feedTab") ?? "trends").toBe(originFeedTab);
          await page.goBack();
          await expect
            .poll(() => sp(page.url()).get("tab"), { timeout: 2_000 })
            .toBe("my-communities");
          await page.goForward();
          await expect
            .poll(() => sp(page.url()).get("tab"), { timeout: 2_000 })
            .toBeNull();
          expect(
            (await page.evaluate(() => history.length)) - h0
          ).toBeGreaterThanOrEqual(2);
          await page.reload({ waitUntil: "commit", timeout: 60_000 });
          await requireExploreNavigationReady(page, 60_000);
          expect(sp(page.url()).get("tab")).toBeNull();
        }
      });
    }
  });

  test.describe("sub-tab matrix", () => {
    test("normal sequence with back/forward (10x)", async ({ page }) => {
      for (let i = 0; i < REPEAT; i++) {
        await gotoWithInstr(page, "/explore?feedTab=trends");
        const sequence = ["saves", "tv", "community", "trends"] as const;
        for (const tab of sequence) {
          await page.getByTestId(`explore-subtab-${tab}`).click();
          await expectFeedTab(page, tab);
        }
        for (let j = sequence.length - 2; j >= 0; j--) {
          await page.goBack();
          await expectFeedTab(page, sequence[j]);
        }
        for (let j = 1; j < sequence.length; j++) {
          await page.goForward();
          await expectFeedTab(page, sequence[j]);
        }
      }
    });

    test("rapid sequence final state (10x)", async ({ page }) => {
      for (let i = 0; i < REPEAT; i++) {
        await gotoWithInstr(page, "/explore?feedTab=trends");
        await resetExploreHistoryMetrics(page);
        await page.getByTestId("explore-subtab-saves").click();
        await page.getByTestId("explore-subtab-tv").click();
        await page.getByTestId("explore-subtab-community").click();
        await expectFeedTab(page, "community");
        const instr = await readExploreHistoryMetrics(page);
        expect(instr.pushState).toBeGreaterThanOrEqual(3);
      }
    });
  });

  test.describe("Discover matrix", () => {
    test("panel expand back forward feed refresh (10x)", async ({ page }) => {
      for (let i = 0; i < REPEAT; i++) {
        await gotoWithInstr(page, "/explore?feedTab=saves&feedTypes=COMEDY");
        const search = page.locator(
          'input[placeholder="Search videos..."]:visible'
        );
        await search.fill("music");
        await search.press("Enter");
        await expect(
          page.getByRole("dialog", { name: "Discover" })
        ).toBeVisible({
          timeout: 15_000,
        });
        await resetExploreHistoryMetrics(page);
        await page.getByTestId("discover-panel-expand").click();
        await expect
          .poll(() => sp(page.url()).get("tab"), { timeout: 2_000 })
          .toBe("discover");
        expect(page.url()).not.toContain("/discover");
        const instr = await readExploreHistoryMetrics(page);
        expect(instr.pushState).toBe(1);
        await page.goBack();
        await expect
          .poll(() => sp(page.url()).get("tab"), { timeout: 2_000 })
          .not.toBe("discover");
        await page.goForward();
        await expect
          .poll(() => sp(page.url()).get("tab"), { timeout: 2_000 })
          .toBe("discover");
        await page.reload({ waitUntil: "commit", timeout: 60_000 });
        await requireExploreNavigationReady(page, 60_000);
        expect(sp(page.url()).get("tab")).toBe("discover");
        await page.getByTestId("explore-chrome-feed").click();
        await expect
          .poll(() => sp(page.url()).get("tab"), { timeout: 2_000 })
          .toBeNull();
        expect(sp(page.url()).get("feedTab")).toBe("saves");
      }
    });

    test("Discover reachable with empty Feed terminal (10x)", async ({
      page,
    }) => {
      for (let i = 0; i < REPEAT; i++) {
        await installExploreHistoryInstrumentation(page);
        await gotoExplore(page, "/explore");
        const readiness = await requireExploreNavigationReady(page, 60_000);
        expect(["scroll", "empty"]).toContain(readiness.state);
        await page.getByTestId("explore-chrome-start-community").click();
        await expect
          .poll(() => sp(page.url()).get("tab"), { timeout: 2_000 })
          .toBe("my-communities");
      }
    });

    test("Discover tag selection scoped (10x)", async ({ page }) => {
      for (let i = 0; i < REPEAT; i++) {
        await gotoWithInstr(page, "/explore?tab=discover");
        const row = discoverTagRow(page);
        await row.getByRole("button", { name: "Concert", exact: true }).click();
        await row.getByRole("button", { name: "Comedy", exact: true }).click();
        await expect(page.getByText("Results for 'Comedy'")).toBeVisible({
          timeout: 15_000,
        });
      }
    });
  });

  test.describe("community and join", () => {
    test("community selection via picker (10x)", async ({ page }) => {
      for (let i = 0; i < REPEAT; i++) {
        await gotoWithInstr(page, "/explore");
        await page.getByTestId("explore-subtab-community").click();
        await expectFeedTab(page, "community");
        await page
          .getByRole("button", { name: /My Communities|\d+ communit/i })
          .first()
          .click();
        await page
          .getByRole("switch", {
            name: /Include E2E Community in Explore feed/i,
          })
          .click({ timeout: 15_000 });
        await expect
          .poll(() => sp(page.url()).get("communities"), { timeout: 2_000 })
          .toContain(E2E_SELECT_COMMUNITY_ID);
        await page.goBack();
        await page.goForward();
        await expect
          .poll(() => sp(page.url()).get("communities"), { timeout: 2_000 })
          .toContain(E2E_SELECT_COMMUNITY_ID);
        await page.reload({ waitUntil: "commit", timeout: 60_000 });
        await requireExploreNavigationReady(page, 60_000);
        expect(sp(page.url()).get("communities")).toContain(
          E2E_SELECT_COMMUNITY_ID
        );
      }
    });

    for (const origin of ["trends", "saves", "tv", "community"] as const) {
      test(`join from ${origin} (10x)`, async ({ page }) => {
        const paths = {
          trends: "/explore",
          saves: "/explore?feedTab=saves",
          tv: "/explore?feedTab=tv&e2eTv=1",
          community: "/explore?feedTab=community",
        };
        for (let i = 0; i < REPEAT; i++) {
          const feedTab = sp(paths[origin]).get("feedTab") ?? "trends";
          await gotoExplore(
            page,
            withE2eFixtures(
              `/explore?tab=join&joinCommunity=${E2E_JOIN_COMMUNITY_ID}&feedTab=${feedTab}${origin === "tv" ? "&e2eTv=1" : ""}`
            )
          );
          await requireExploreNavigationReady(page, 60_000);
          expect(sp(page.url()).get("tab")).toBe("join");
          expect(sp(page.url()).get("joinCommunity")).toBe(
            E2E_JOIN_COMMUNITY_ID
          );
          await page.getByTestId("explore-chrome-feed").click();
          await expect
            .poll(() => sp(page.url()).get("tab"), { timeout: 2_000 })
            .toBeNull();
          expect(sp(page.url()).get("feedTab") ?? "trends").toBe(feedTab);
        }
      });
    }
  });

  test.describe("deep-link refresh grid", () => {
    const links = [
      "/explore",
      "/explore?feedTab=saves",
      "/explore?feedTab=tv&e2eTv=1",
      "/explore?feedTab=community",
      "/explore?tab=my-communities",
      "/explore?tab=discover",
      "/explore?feedTypes=COMEDY&feedTab=saves",
      `/explore?feedTab=community&communities=${E2E_SELECT_COMMUNITY_ID}`,
      `/explore?tab=join&joinCommunity=${E2E_JOIN_COMMUNITY_ID}&feedTab=tv&e2eTv=1`,
    ].map(withE2eFixtures);

    for (const link of links) {
      test(`refresh preserves ${link}`, async ({ page }) => {
        test.setTimeout(240_000);
        for (let i = 0; i < REPEAT; i++) {
          await gotoExplore(page, link);
          await requireExploreNavigationReady(page, 60_000);
          const before = page.url();
          await page.reload({ waitUntil: "commit", timeout: 60_000 });
          await requireExploreNavigationReady(page, 60_000);
          const u0 = new URL(before);
          const u1 = new URL(page.url());
          expect(u1.pathname).toBe("/explore");
          for (const [k, v] of u0.searchParams.entries()) {
            expect(u1.searchParams.get(k)).toBe(v);
          }
        }
      });
    }
  });

  test.describe("session shell continuity", () => {
    test("feed shell survives My Communities and Discover (10x)", async ({
      page,
    }) => {
      for (let i = 0; i < REPEAT; i++) {
        await gotoWithInstr(page, "/explore");
        await requirePopulatedExploreFeed(page);
        const shell = page.getByTestId("explore-feed-shell");
        await expect(shell).toBeAttached();
        const handle = await shell.elementHandle();
        await page.getByTestId("explore-chrome-start-community").click();
        await expect(shell).toBeAttached();
        await page.getByTestId("explore-chrome-feed").click();
        await expect(shell).toBeAttached();
        expect(
          await page.evaluate(el => el?.isConnected ?? false, handle)
        ).toBe(true);
      }
    });
  });
});
