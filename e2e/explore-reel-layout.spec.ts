import { test, expect } from "@playwright/test";

const REEL_LAYOUT_VIEWPORTS = [
  {
    name: "mobile-portrait",
    width: 390,
    height: 844,
    mode: "mobilePortrait",
  },
  {
    name: "mobile-landscape",
    width: 844,
    height: 390,
    mode: "mobileLandscape",
  },
  {
    name: "desktop-portrait",
    width: 1280,
    height: 720,
    mode: "desktopPortrait",
  },
  {
    name: "desktop-landscape",
    width: 1280,
    height: 720,
    mode: "desktopLandscape",
  },
] as const;

async function expectExploreReelLayoutShell(
  page: import("@playwright/test").Page,
  expectedMode: string
) {
  const scroll = page.getByTestId("explore-feed-scroll");
  await expect(scroll).toBeVisible({ timeout: 15_000 });

  const slide = page.locator('[data-explore-slide][data-index="0"]');
  await expect(slide).toBeVisible();
  await expect(slide).toHaveClass(/h-full/);
  await expect(slide).toHaveAttribute("data-explore-layout-mode", expectedMode);

  const dockHeight = await slide.evaluate(el =>
    getComputedStyle(el).getPropertyValue("--explore-reel-dock-h").trim()
  );
  expect(dockHeight.length).toBeGreaterThan(0);

  const actions = slide.getByTestId("explore-slide-actions");
  await expect(actions).toBeVisible();
  await expect(actions).toHaveClass(/bg-gradient-to-t/);
  await expect(actions).not.toHaveClass(/bg-black\/80/);

  await expect(page.getByTestId("explore-video-shell")).toBeVisible();
}

for (const viewport of REEL_LAYOUT_VIEWPORTS) {
  test(`explore reel layout shell at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });
    await page.goto(
      `/e2e/explore-reel-layout?mode=${encodeURIComponent(viewport.mode)}`
    );
    await expect(page.locator("body")).toBeVisible();
    await expectExploreReelLayoutShell(page, viewport.mode);
  });
}

test("mobile landscape fixture places title below video band", async ({
  page,
}) => {
  await page.setViewportSize({ width: 480, height: 320 });
  await page.goto("/e2e/explore-reel-layout?mode=mobileLandscape");

  await expect(page.getByTestId("explore-reel-title-below-band")).toBeVisible();
  await expect(
    page.getByTestId("explore-reel-title-on-video")
  ).not.toBeVisible();
});

test("desktop portrait fixture uses on-video title placement", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/e2e/explore-reel-layout?mode=desktopPortrait");

  await expect(page.getByTestId("explore-reel-title-on-video")).toBeVisible();
  await expect(
    page.getByTestId("explore-reel-title-below-band")
  ).not.toBeVisible();
  await expect(
    page.locator('[class*="max-w-[min(420px,100%)]"]').first()
  ).toBeVisible();
});
