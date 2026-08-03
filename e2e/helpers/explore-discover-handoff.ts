import { expect, type Locator, type Page } from "@playwright/test";

import { E2E_DISCOVER_CONTENTS } from "./explore-test-fixtures";
import { openExploreHeaderDiscoverSearch } from "./open-explore-discover-search";

export type ExploreFixtureDeployState = {
  runtimeActive: boolean;
  buildFlagEnabled: boolean;
  deployCommit: string | null;
};

/** Read safe dual-gate deploy markers from the Explore shell (no secrets). */
export async function readExploreFixtureDeployState(
  page: Page
): Promise<ExploreFixtureDeployState> {
  const root = page.locator("[data-explore-e2e-fixtures]").first();
  if ((await root.count()) === 0) {
    return {
      runtimeActive: false,
      buildFlagEnabled: false,
      deployCommit: null,
    };
  }
  const runtime = await root.getAttribute("data-explore-e2e-fixtures");
  const build = await root.getAttribute("data-explore-e2e-fixtures-build");
  const commit = await root.getAttribute("data-explore-deploy-commit");
  return {
    runtimeActive: runtime === "1",
    buildFlagEnabled: build === "1",
    deployCommit: commit,
  };
}

/** Open the Discover quick panel from chrome search or the header panel control. */
export async function openExploreDiscoverPanel(page: Page): Promise<Locator> {
  const byTestId = page.getByTestId("explore-open-discover-panel");
  if (await byTestId.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await byTestId.click();
  } else {
    const byLabel = page.getByRole("button", { name: "Open Discover panel" });
    if (await byLabel.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await byLabel.click();
    } else {
      await openExploreHeaderDiscoverSearch(page, "music");
    }
  }
  const dialog = page.getByRole("dialog", { name: "Discover" });
  await expect(dialog).toBeVisible({ timeout: 30_000 });
  return dialog;
}

/**
 * Click a Discover content card that hands off to the Explore reel (`channel=` + `eventId=`).
 * Prefers dual-gate fixture catalog when active; otherwise tag-filter then first navigable card.
 */
export async function clickDiscoverExploreHandoffCard(
  page: Page,
  dialog: Locator
): Promise<void> {
  const deploy = await readExploreFixtureDeployState(page);
  expect(
    deploy.buildFlagEnabled,
    "Discover handoff requires NEXT_PUBLIC_ENABLE_EXPLORE_E2E_FIXTURES=1 at build time"
  ).toBe(true);
  expect(
    deploy.runtimeActive,
    "Discover handoff requires ?e2e=1 on the Explore URL"
  ).toBe(true);

  const fixtureTitle = E2E_DISCOVER_CONTENTS[0]?.title ?? "E2E Discover clip";
  const card = dialog
    .getByTestId("discover-content-card")
    .filter({ hasText: fixtureTitle })
    .first();

  await expect(card).toBeVisible({ timeout: 30_000 });
  await expect(card).toHaveAttribute("data-event-id", /.+/);
  await card.click();
}
