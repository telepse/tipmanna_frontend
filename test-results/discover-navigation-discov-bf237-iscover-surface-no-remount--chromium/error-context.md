# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: discover-navigation.spec.ts >> discover navigation >> session shell keeps the feed mounted on the Discover surface (no remount)
- Location: e2e\discover-navigation.spec.ts:65:7

# Error details

```
Error: expect(locator).toBeAttached() failed

Locator: getByTestId('explore-feed-scroll')
Expected: attached
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeAttached" with timeout 5000ms
  - waiting for getByTestId('explore-feed-scroll')

```

```yaml
- region "Notification messages"
- alert
- banner:
  - heading "Tipmanna TV — Explore and discover community media" [level=1]
  - link "tipmanna":
    - /url: /explore
  - button
  - button "Open discover search":
    - textbox "Search videos..."
  - text: 0 watching live
- button
- text: Create
- button "Feed"
- button "Start Community"
- button "Not signed in"
- paragraph: Discover is also available as a quick panel while you watch the feed.
- button "Open discover panel"
- heading "Discover contents" [level=2]
- textbox "Search discovery catalogue":
  - /placeholder: Search...
- button "Open bookmarks"
- paragraph:
  - text: Looking for an event?
  - link "Find Event here":
    - /url: /join
- text: Trending
- button "Live"
- button "Comedy"
- button "Music"
- button "Sports"
- button "Community"
- button "TV program"
- button "Concert"
- button "Drama"
- button "Festival"
- button "Food"
- button "Hangout"
- button "Islamic"
- button "Christian"
- button "Corporate"
- button "Comedy"
- button "Fashion"
- button "Game & sport"
- button "Children"
- button "Education"
- button "Other"
- heading "Top contents" [level=5]
- paragraph: Editorially featured
- button
- heading "Latest contents" [level=5]
- paragraph: Newest uploads, by date added
- button
- heading "Spotlight" [level=5]
- paragraph: Trending by views, tips, and saves (updates every ~5 min)
- button
- heading "Recommended for you" [level=5]
- paragraph: Popular saves and recency
- button
- heading "Programs" [level=5]
- paragraph: Scheduled TV programs
- heading "Live streams" [level=5]
- paragraph: Opens in the creator's event room
- heading "Most tipped contents" [level=5]
- paragraph: Highest tip counts
- button
- heading "Top tippers" [level=5]
```

# Test source

```ts
  1   | import { test, expect } from "@playwright/test";
  2   | import { gotoExplore } from "./helpers/goto-explore";
  3   | 
  4   | /**
  5   |  * Unified Discover navigation journeys for the long-lived Explore session.
  6   |  * Covers: search = quick-panel only (no tab nav), the sheet X closes back to
  7   |  * the feed, the session shell keeps the feed mounted on non-feed surfaces, and
  8   |  * the dedicated /discover page hands standard clips off to the Explore reel.
  9   |  */
  10  | test.describe("discover navigation", () => {
  11  |   const openHeaderSearch = async (page: import("@playwright/test").Page) => {
  12  |     await expect(
  13  |       page
  14  |         .getByTestId("explore-feed-scroll")
  15  |         .or(page.getByText(/no clips available|sign in to browse/i))
  16  |         .first()
  17  |     ).toBeVisible({ timeout: 45_000 });
  18  | 
  19  |     // Desktop viewport: mobile search wrapper is `sm:hidden`; target visible input.
  20  |     const search = page.locator(
  21  |       'input[placeholder="Search videos..."]:visible'
  22  |     );
  23  |     await expect(search).toBeVisible({ timeout: 30_000 });
  24  |     await search.click();
  25  |     await search.fill("music");
  26  |     await search.press("Enter");
  27  |   };
  28  | 
  29  |   test("search opens the quick panel over the feed without leaving /explore", async ({
  30  |     page,
  31  |   }) => {
  32  |     await gotoExplore(page);
  33  |     await openHeaderSearch(page);
  34  | 
  35  |     // Quick panel (sheet) overlays the feed.
  36  |     await expect(page.getByRole("dialog", { name: "Discover" })).toBeVisible({
  37  |       timeout: 30_000,
  38  |     });
  39  |     // Unified nav must NOT switch the user to the full Discover tab.
  40  |     await expect(page).toHaveURL(/\/explore(\?|$)/);
  41  |     expect(new URL(page.url()).searchParams.get("tab")).not.toBe("discover");
  42  |   });
  43  | 
  44  |   test("the sheet X closes the quick panel and reveals the feed", async ({
  45  |     page,
  46  |   }) => {
  47  |     await gotoExplore(page);
  48  |     await openHeaderSearch(page);
  49  | 
  50  |     const dialog = page.getByRole("dialog", { name: "Discover" });
  51  |     await expect(dialog).toBeVisible({ timeout: 30_000 });
  52  | 
  53  |     await page.getByRole("button", { name: "Close discover panel" }).click();
  54  |     await expect(dialog).not.toBeVisible();
  55  | 
  56  |     // Feed is the active surface again.
  57  |     await expect(
  58  |       page
  59  |         .getByTestId("explore-feed-scroll")
  60  |         .or(page.getByText(/no clips available|sign in to browse/i))
  61  |         .first()
  62  |     ).toBeVisible({ timeout: 30_000 });
  63  |   });
  64  | 
  65  |   test("session shell keeps the feed mounted on the Discover surface (no remount)", async ({
  66  |     page,
  67  |   }) => {
  68  |     // The Discover surface renders alongside a mounted-but-hidden feed so the
  69  |     // reel session (playback, caches, subscriptions) survives surface switches.
  70  |     await gotoExplore(page, "/explore?tab=discover");
  71  |     await expect(
  72  |       page.getByRole("heading", { name: "Spotlight" }).first()
  73  |     ).toBeVisible({
  74  |       timeout: 30_000,
  75  |     });
  76  | 
  77  |     // Feed scroll container stays in the DOM even though Discover is active.
> 78  |     await expect(page.getByTestId("explore-feed-scroll")).toBeAttached();
      |                                                           ^ Error: expect(locator).toBeAttached() failed
  79  |   });
  80  | 
  81  |   test("dedicated Discover hands standard clips to the Explore reel", async ({
  82  |     page,
  83  |   }) => {
  84  |     await page.goto("/discover");
  85  | 
  86  |     const card = page.getByTestId("discover-content-card").first();
  87  |     if (!(await card.isVisible({ timeout: 10_000 }).catch(() => false))) {
  88  |       test.skip(true, "No standard clips in catalog for this environment");
  89  |       return;
  90  |     }
  91  | 
  92  |     await card.click();
  93  |     // Handoff opens the clip in the Explore reel session, not a separate page.
  94  |     await expect(page).toHaveURL(/\/explore\?.*channel=/, { timeout: 15_000 });
  95  |   });
  96  | 
  97  |   test("rapid tag switch shows results for the last selected tag", async ({
  98  |     page,
  99  |   }) => {
  100 |     await gotoExplore(page, "/explore?tab=discover");
  101 |     await expect(page.getByRole("heading", { name: "Spotlight" })).toBeVisible({
  102 |       timeout: 30_000,
  103 |     });
  104 | 
  105 |     const concertTag = page.getByRole("button", {
  106 |       name: "Concert",
  107 |       exact: true,
  108 |     });
  109 |     const comedyTag = page.getByRole("button", { name: "Comedy", exact: true });
  110 |     if (!(await concertTag.isVisible({ timeout: 5_000 }).catch(() => false))) {
  111 |       test.skip(true, "Tag chips not visible in Discover panel");
  112 |       return;
  113 |     }
  114 | 
  115 |     await concertTag.click();
  116 |     await comedyTag.click();
  117 | 
  118 |     await expect(page.getByText("Results for 'Comedy'")).toBeVisible({
  119 |       timeout: 30_000,
  120 |     });
  121 |     await expect(page.getByText("Results for 'Concert'")).not.toBeVisible();
  122 |   });
  123 | });
  124 | 
```