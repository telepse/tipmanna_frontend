import { expect, type Page } from "@playwright/test";

/** Terminal feed states per Endless Feed Contract / STAB-1 boot resilience. */
export async function waitExploreFeedReady(
  page: Page,
  timeoutMs = 45_000
): Promise<"scroll" | "empty"> {
  const scroll = page.getByTestId("explore-feed-scroll");
  const emptyCopy = page.getByText(/no clips available|sign in to browse/i);
  const skeleton = page.getByTestId("explore-feed-skeleton");

  await expect(async () => {
    const hasTerminal =
      (await scroll.isVisible().catch(() => false)) ||
      (await emptyCopy
        .first()
        .isVisible()
        .catch(() => false));
    expect(hasTerminal).toBeTruthy();
    await expect(skeleton).not.toBeVisible();
  }).toPass({ timeout: timeoutMs });

  return (await scroll.isVisible().catch(() => false)) ? "scroll" : "empty";
}
