# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: explore.spec.ts >> explore >> loads feed first on default explore URL
- Location: e2e\explore.spec.ts:5:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByTestId('explore-feed-scroll').or(getByText(/no clips available|sign in to browse/i)).first()
Expected: visible
Timeout: 30000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 30000ms
  - waiting for getByTestId('explore-feed-scroll').or(getByText(/no clips available|sign in to browse/i)).first()

```

```yaml
- region "Notification messages"
- alert
- banner:
    - heading "Tipmanna TV — Explore and discover community media" [level=1]
    - link "tipmanna":
        - /url: /explore
    - button "Open discover search":
        - textbox "Search videos..."
    - text: 0 watching live
- button
- text: Create
- button "Feed"
- button "Start Community"
- button "Not signed in"
- button "Trends"
- button "Saves"
- button "TV"
- button "Community"
- button "My Communities"
- button "Open filters"
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | import { gotoExplore } from "./helpers/goto-explore";
  3  |
  4  | test.describe("explore", () => {
  5  |   test("loads feed first on default explore URL", async ({ page }) => {
  6  |     await gotoExplore(page);
  7  |     await expect(page.locator("body")).toBeVisible();
  8  |
  9  |     const scroll = page.getByTestId("explore-feed-scroll");
  10 |     const emptyCopy = page.getByText(/no clips available|sign in to browse/i);
  11 |     const discoverHeading = page.getByRole("heading", {
  12 |       name: "Discover contents",
  13 |     });
  14 |
> 15 |     await expect(scroll.or(emptyCopy).first()).toBeVisible({ timeout: 30_000 });
     |                                                ^ Error: expect(locator).toBeVisible() failed
  16 |     await expect(discoverHeading).not.toBeVisible();
  17 |   });
  18 |
  19 |   test("first paint includes SSR default feed boot or visible slide", async ({
  20 |     page,
  21 |   }) => {
  22 |     const response = await gotoExplore(page);
  23 |     expect(response?.ok()).toBeTruthy();
  24 |     const html = await page.content();
  25 |     const hadInlineBoot =
  26 |       html.includes("__EXPLORE_SSR_BOOT__") ||
  27 |       html.includes("data-explore-slide");
  28 |     expect(hadInlineBoot).toBeTruthy();
  29 |   });
  30 |
  31 |   test("feed scrolls and shows video shell or empty state", async ({
  32 |     page,
  33 |   }) => {
  34 |     await gotoExplore(page);
  35 |     await expect(page.locator("body")).toBeVisible();
  36 |
  37 |     const scroll = page.getByTestId("explore-feed-scroll");
  38 |     const emptyCopy = page.getByText(/no clips available|sign in to browse/i);
  39 |
  40 |     await expect(scroll.or(emptyCopy).first()).toBeVisible({ timeout: 30_000 });
  41 |
  42 |     if (await scroll.isVisible()) {
  43 |       await scroll.evaluate(el => {
  44 |         el.scrollTop = el.scrollHeight;
  45 |       });
  46 |       await expect(
  47 |         page
  48 |           .getByTestId("explore-video-shell")
  49 |           .or(page.locator("[data-explore-slide]"))
  50 |           .first()
  51 |       ).toBeVisible();
  52 |     } else {
  53 |       await expect(emptyCopy.first()).toBeVisible();
  54 |     }
  55 |   });
  56 |
  57 |   test("slide actions live inside active slide footer", async ({ page }) => {
  58 |     await gotoExplore(page);
  59 |     const scroll = page.getByTestId("explore-feed-scroll");
  60 |     if (!(await scroll.isVisible({ timeout: 15_000 }).catch(() => false))) {
  61 |       test.skip();
  62 |       return;
  63 |     }
  64 |     const actions = page.getByTestId("explore-slide-actions");
  65 |     await expect(actions).toBeVisible({ timeout: 15_000 });
  66 |     const slide = page.locator('[data-explore-slide][data-index="0"]');
  67 |     await expect(
  68 |       slide.locator('[data-testid="explore-slide-actions"]')
  69 |     ).toBeVisible();
  70 |     await expect(actions).toHaveClass(/bg-gradient-to-t/);
  71 |     await expect(actions).not.toHaveClass(/bg-black\/80/);
  72 |   });
  73 |
  74 |   test("profile shows Guest or Not signed in for anonymous visitors", async ({
  75 |     page,
  76 |   }) => {
  77 |     await gotoExplore(page);
  78 |     await expect(page.getByText(/Signed in|Guest|Not signed in/i)).toBeVisible({
  79 |       timeout: 15_000,
  80 |     });
  81 |   });
  82 |
  83 |   test("discover tab shows distinct category headings", async ({ page }) => {
  84 |     await gotoExplore(page, "/explore?tab=discover");
  85 |     await expect(page.getByRole("heading", { name: "Spotlight" })).toBeVisible({
  86 |       timeout: 30_000,
  87 |     });
  88 |     await expect(
  89 |       page.getByRole("heading", { name: "Recommended for you" })
  90 |     ).toBeVisible();
  91 |     await expect(page.getByRole("heading", { name: "Programs" })).toBeVisible();
  92 |   });
  93 | });
  94 |
```
