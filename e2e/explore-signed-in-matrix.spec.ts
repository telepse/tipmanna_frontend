import { test, expect } from "@playwright/test";
import { waitExploreFeedReady } from "./helpers/wait-explore-feed-ready";

test.describe("signed-in explore matrix", () => {
  test.use({ storageState: ".auth/tipper.json" });

  test.beforeEach(({ page }, testInfo) => {
    testInfo.skip(
      process.env.PLAYWRIGHT_AUTH_E2E !== "1",
      "Authenticated matrix requires PLAYWRIGHT_AUTH_E2E=1 and auth setup"
    );
  });

  test("Trends feed ready when authenticated", async ({ page }) => {
    await page.goto("/explore");
    const ready = await waitExploreFeedReady(page, 60_000);
    expect(ready.state).toBe("scroll");
  });
});
