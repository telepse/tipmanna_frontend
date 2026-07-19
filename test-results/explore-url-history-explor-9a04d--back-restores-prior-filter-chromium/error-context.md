# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: explore-url-history.spec.ts >> explore URL history >> filter change updates URL and browser back restores prior filter
- Location: e2e\explore-url-history.spec.ts:5:7

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /feedTypes=.*COMEDY/i
Received string:  "http://127.0.0.1:3000/explore"
Timeout: 10000ms

Call log:
  - Expect "toHaveURL" with timeout 10000ms
    21 × unexpected value "http://127.0.0.1:3000/explore"

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
- button "Trends"
- button "Saves"
- button "TV"
- button "Community"
- button "My Communities"
- button "Close filters" [expanded]
- iframe
- button "Unmute"
- text: Live Stream
- paragraph: 0 saves · 1 shares · 0 comments · 1 seen
- button "Save video"
- button "Share"
- button
- button "2 tips"
- img "Black Diamond"
- button "Create video"
- button "Watch TV"
- button "Engage"
- button "Comments"
- paragraph: This video couldn't be played (150).
- button "Try again"
- iframe
- text: The best burger..
- button "Open comments"
- text: Magnus Carlsen ..
- button "Open comments"
- text: How to cook a p..
- button "Open comments"
- text: Daily Dose of F..
- button "Open comments"
- text: Nicki Minaj on ..
- button "Open comments"
- text: GM Chess Lesson..
- button "Open comments"
- button "Close filters"
- dialog "Explore filters":
    - paragraph: Filters apply to Trends, Saves, and TV.
    - text: Video themes (eventVideoType)
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
    - text: Language code
    - textbox "Language code":
        - /placeholder: e.g. en-GB
    - text: Country code
    - textbox "Country code":
        - /placeholder: e.g. GB (use all for worldwide)
```

# Test source

```ts
  1   | import { test, expect } from "@playwright/test";
  2   | import { gotoExplore } from "./helpers/goto-explore";
  3   |
  4   | test.describe("explore URL history", () => {
  5   |   test("filter change updates URL and browser back restores prior filter", async ({
  6   |     page,
  7   |   }) => {
  8   |     await gotoExplore(page);
  9   |     await expect(
  10  |       page
  11  |         .getByTestId("explore-feed-scroll")
  12  |         .or(page.getByText(/no clips available|sign in to browse/i))
  13  |         .first()
  14  |     ).toBeVisible({ timeout: 45_000 });
  15  |
  16  |     const filterToggle = page
  17  |       .getByRole("button", { name: /open filters|close filters/i })
  18  |       .first();
  19  |     if (
  20  |       !(await filterToggle.isVisible({ timeout: 5_000 }).catch(() => false))
  21  |     ) {
  22  |       test.skip(true, "Filter UI not visible in this environment");
  23  |       return;
  24  |     }
  25  |     await filterToggle.click();
  26  |
  27  |     const comedyFilter = page
  28  |       .getByTestId("explore-filter-type")
  29  |       .filter({ hasText: "Comedy" });
  30  |     if (
  31  |       !(await comedyFilter.isVisible({ timeout: 5_000 }).catch(() => false))
  32  |     ) {
  33  |       test.skip(true, "Comedy filter chip not available");
  34  |       return;
  35  |     }
  36  |
  37  |     await comedyFilter.click();
> 38  |     await expect(page).toHaveURL(/feedTypes=.*COMEDY/i, { timeout: 10_000 });
      |                        ^ Error: expect(page).toHaveURL(expected) failed
  39  |     const urlAfterFilter = page.url();
  40  |
  41  |     await page.goBack();
  42  |     await expect
  43  |       .poll(() => page.url(), { timeout: 10_000 })
  44  |       .not.toBe(urlAfterFilter);
  45  |
  46  |     await page.goForward();
  47  |     await expect(page).toHaveURL(/feedTypes=.*COMEDY/i, { timeout: 10_000 });
  48  |     await expect(comedyFilter).toHaveClass(/border-primary/);
  49  |   });
  50  |
  51  |   test("saves sub-tab survives browser back and forward", async ({ page }) => {
  52  |     await gotoExplore(page);
  53  |     await expect(
  54  |       page
  55  |         .getByTestId("explore-feed-scroll")
  56  |         .or(page.getByText(/no clips available|sign in to browse/i))
  57  |         .first()
  58  |     ).toBeVisible({ timeout: 45_000 });
  59  |
  60  |     await page.getByTestId("explore-subtab-saves").click();
  61  |     await expect(page).toHaveURL(/feedTab=saves/, { timeout: 10_000 });
  62  |     const savesUrl = page.url();
  63  |
  64  |     await page.getByTestId("explore-subtab-trends").click();
  65  |     await expect(page).toHaveURL(/feedTab=trends/, { timeout: 10_000 });
  66  |
  67  |     await page.goBack();
  68  |     await expect(page).toHaveURL(/feedTab=saves/, { timeout: 10_000 });
  69  |     await expect(page.getByTestId("explore-subtab-saves")).toHaveClass(
  70  |       /bg-white/,
  71  |       { timeout: 10_000 }
  72  |     );
  73  |
  74  |     await page.goForward();
  75  |     await expect.poll(() => page.url(), { timeout: 10_000 }).not.toBe(savesUrl);
  76  |   });
  77  |
  78  |   test("feedTab deep link hydrates saves sub-tab", async ({ page }) => {
  79  |     await gotoExplore(page, "/explore?feedTab=saves");
  80  |     await expect(page.getByRole("button", { name: "Saves" })).toHaveClass(
  81  |       /bg-white/,
  82  |       { timeout: 15_000 }
  83  |     );
  84  |   });
  85  |
  86  |   test("feedTab=tv deep link shows TV surface with mounted feed shell", async ({
  87  |     page,
  88  |   }) => {
  89  |     await gotoExplore(page, "/explore?feedTab=tv");
  90  |     await expect(page.getByRole("button", { name: "TV" })).toHaveClass(
  91  |       /bg-white/,
  92  |       { timeout: 15_000 }
  93  |     );
  94  |     await expect(page.getByTestId("explore-feed-shell")).toBeAttached();
  95  |     await expect(page.getByTestId("explore-feed-shell")).toHaveClass(/hidden/);
  96  |   });
  97  |
  98  |   test("feedTab tv back forward restores sub-tab", async ({ page }) => {
  99  |     await gotoExplore(page);
  100 |     await expect(
  101 |       page
  102 |         .getByTestId("explore-feed-scroll")
  103 |         .or(page.getByText(/no clips available|sign in to browse/i))
  104 |         .first()
  105 |     ).toBeVisible({ timeout: 45_000 });
  106 |
  107 |     await page.getByTestId("explore-subtab-tv").click();
  108 |     await expect(page).toHaveURL(/feedTab=tv/, { timeout: 10_000 });
  109 |
  110 |     await page.getByTestId("explore-subtab-trends").click();
  111 |     await expect(page).toHaveURL(/feedTab=trends/, { timeout: 10_000 });
  112 |
  113 |     await page.goBack();
  114 |     await expect(page).toHaveURL(/feedTab=tv/, { timeout: 10_000 });
  115 |     await expect(page.getByTestId("explore-subtab-tv")).toHaveClass(
  116 |       /bg-white/,
  117 |       { timeout: 10_000 }
  118 |     );
  119 |
  120 |     await page.goForward();
  121 |     await expect(page).toHaveURL(/feedTab=trends/, { timeout: 10_000 });
  122 |   });
  123 | });
  124 |
```
