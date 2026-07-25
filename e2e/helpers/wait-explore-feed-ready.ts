import { expect, type Page } from "@playwright/test";

export type ExploreFeedReadiness = { state: "scroll" } | { state: "empty" };

/** Terminal feed states per Endless Feed Contract / STAB-1 boot resilience. */
export async function waitExploreFeedReady(
  page: Page,
  timeoutMs = 45_000
): Promise<ExploreFeedReadiness> {
  const scroll = page.getByTestId("explore-feed-scroll");
  const emptyCopy = page.getByText(
    /no clips available|sign in to browse|sign in as a tipper|save at least three videos|choose one or more communities/i
  );
  const skeleton = page.getByTestId("explore-feed-skeleton");

  await expect(async () => {
    const url = new URL(page.url(), "http://localhost");
    const feedTab = url.searchParams.get("feedTab");
    const urlTab = url.searchParams.get("tab");
    const shellAttached =
      (await page.getByTestId("explore-feed-shell").count()) > 0;
    const tvTerminal =
      feedTab === "tv" &&
      shellAttached &&
      (await page
        .getByTestId("explore-subtab-tv")
        .evaluate(el => el.className.includes("bg-white"))
        .catch(() => false));
    const discoverTerminal = urlTab === "discover" && shellAttached;
    const myCommunitiesTerminal =
      urlTab === "my-communities" &&
      (await page
        .getByRole("heading", { name: /^Communities$/i })
        .isVisible()
        .catch(() => false));
    const joinTerminal =
      urlTab === "join" &&
      (await page
        .getByRole("heading", { name: /E2E Join Community/i })
        .isVisible()
        .catch(() => false));
    const hasTerminal =
      discoverTerminal ||
      myCommunitiesTerminal ||
      joinTerminal ||
      tvTerminal ||
      (await scroll.isVisible().catch(() => false)) ||
      (await emptyCopy
        .first()
        .isVisible()
        .catch(() => false));
    expect(hasTerminal).toBeTruthy();
    await expect(skeleton).not.toBeVisible();
  }).toPass({ timeout: timeoutMs });

  const feedTab = new URL(page.url(), "http://localhost").searchParams.get(
    "feedTab"
  );
  const urlTab = new URL(page.url(), "http://localhost").searchParams.get(
    "tab"
  );
  if (
    urlTab === "discover" ||
    urlTab === "my-communities" ||
    feedTab === "tv" ||
    urlTab === "join"
  ) {
    return { state: "empty" };
  }

  return (await scroll.isVisible().catch(() => false))
    ? { state: "scroll" }
    : { state: "empty" };
}

/** Wait for either valid terminal Feed state — never skip navigation tests on empty. */
export async function requireExploreNavigationReady(
  page: Page,
  timeoutMs = 60_000
): Promise<ExploreFeedReadiness> {
  return waitExploreFeedReady(page, timeoutMs);
}

/** Use only when the scenario genuinely requires reel clips on screen. */
export async function requirePopulatedExploreFeed(
  page: Page,
  timeoutMs = 60_000
): Promise<void> {
  const readiness = await waitExploreFeedReady(page, timeoutMs);
  expect(
    readiness.state,
    "Scenario requires populated Feed (explore-feed-scroll)"
  ).toBe("scroll");
}
