# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: explore-url-sync-journeys.spec.ts >> explore URL sync journeys >> Discover quick panel expand navigates client-side to tab=discover
- Location: e2e\explore-url-sync-journeys.spec.ts:112:7

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: "discover"
Received: null

Call Log:
- Timeout 12000ms exceeded while waiting on the predicate
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
    - region "Notification messages"
    - generic [ref=e6] [cursor=pointer]:
        - button "Open Next.js Dev Tools" [ref=e7]:
            - img [ref=e8]
        - generic [ref=e11]:
            - button "Open issues overlay" [ref=e12]:
                - generic [ref=e13]:
                    - generic [ref=e14]: "4"
                    - generic [ref=e15]: "5"
                - generic [ref=e16]:
                    - text: Issue
                    - generic [ref=e17]: s
            - button "Collapse issues badge" [ref=e18]:
                - img [ref=e19]
    - alert [ref=e21]
    - generic [ref=e22]:
        - banner [ref=e23]:
            - heading "Tipmanna TV — Explore and discover community media" [level=1] [ref=e24]
            - generic [ref=e25]:
                - link "tipmanna" [ref=e26] [cursor=pointer]:
                    - /url: /explore
                - button [ref=e27] [cursor=pointer]:
                    - img [ref=e28]
            - generic [ref=e31]:
                - button "Open discover search" [ref=e32]:
                    - textbox "Search videos..." [ref=e33]: music
                    - img [ref=e34]
                - generic [ref=e39]: 0 watching live
        - generic [ref=e41]:
            - generic [ref=e42]:
                - button [ref=e43]:
                    - img [ref=e44]
                - generic [ref=e45]: Create
            - button "Feed" [ref=e46]
            - button "Start Community" [ref=e47]
            - button "Not signed in" [ref=e48]:
                - img [ref=e50]
                - generic [ref=e53]: Not signed in
        - generic [ref=e54]:
            - generic [ref=e55]:
                - paragraph [ref=e56]: Discover is also available as a quick panel while you watch the feed.
                - button "Open discover panel" [ref=e57] [cursor=pointer]
            - generic [ref=e58]:
                - heading "Discover contents" [level=2] [ref=e59]
                - generic [ref=e61]:
                    - generic [ref=e62]:
                        - generic [ref=e63]:
                            - textbox "Search discovery catalogue" [ref=e64]:
                                - /placeholder: Search...
                                - text: music
                            - img [ref=e65]
                        - button "Open bookmarks" [ref=e68]:
                            - img [ref=e69]
                    - paragraph [ref=e71]:
                        - text: Looking for an event?
                        - link "Find Event here" [ref=e72] [cursor=pointer]:
                            - /url: /join
                - generic [ref=e73]:
                    - button "Concert" [ref=e74] [cursor=pointer]
                    - button "Drama" [ref=e75] [cursor=pointer]
                    - button "Festival" [ref=e76] [cursor=pointer]
                    - button "Food" [ref=e77] [cursor=pointer]
                    - button "Hangout" [ref=e78] [cursor=pointer]
                    - button "Islamic" [ref=e79] [cursor=pointer]
                    - button "Christian" [ref=e80] [cursor=pointer]
                    - button "Corporate" [ref=e81] [cursor=pointer]
                    - button "Comedy" [ref=e82] [cursor=pointer]
                    - button "Fashion" [ref=e83] [cursor=pointer]
                    - button "Game & sport" [ref=e84] [cursor=pointer]
                    - button "Children" [ref=e85] [cursor=pointer]
                    - button "Education" [ref=e86] [cursor=pointer]
                    - button "Other" [ref=e87] [cursor=pointer]
                - generic [ref=e88]:
                    - heading "Search results for 'music'" [level=5] [ref=e90]
                    - generic [ref=e108]:
                        - generic [ref=e109]:
                            - heading "Top contents" [level=5] [ref=e111]
                            - paragraph [ref=e112]: Editorially featured
                        - button [ref=e131] [cursor=pointer]:
                            - img [ref=e132]
                    - generic [ref=e134]:
                        - generic [ref=e135]:
                            - heading "Latest contents" [level=5] [ref=e137]
                            - paragraph [ref=e138]: Newest uploads, by date added
                        - button [ref=e159] [cursor=pointer]:
                            - img [ref=e160]
                    - generic [ref=e162]:
                        - generic [ref=e163]:
                            - heading "Spotlight" [level=5] [ref=e165]
                            - paragraph [ref=e166]: Trending by views, tips, and saves (updates every ~5 min)
                        - button [ref=e187] [cursor=pointer]:
                            - img [ref=e188]
                    - generic [ref=e190]:
                        - generic [ref=e191]:
                            - heading "Recommended for you" [level=5] [ref=e193]
                            - paragraph [ref=e194]: Popular saves and recency
                        - button [ref=e215] [cursor=pointer]:
                            - img [ref=e216]
                    - generic [ref=e219]:
                        - heading "Programs" [level=5] [ref=e221]
                        - paragraph [ref=e222]: Scheduled TV programs
                    - generic [ref=e244]:
                        - heading "Live streams" [level=5] [ref=e246]
                        - paragraph [ref=e247]: Opens in the creator's event room
                    - generic [ref=e268]:
                        - generic [ref=e269]:
                            - heading "Most tipped contents" [level=5] [ref=e271]
                            - paragraph [ref=e272]: Highest tip counts
                        - button [ref=e291]:
                            - img [ref=e292]
                    - heading "Top tippers" [level=5] [ref=e295]
```

# Test source

```ts
  1   | import { test, expect, type Page } from "@playwright/test";
  2   | import { gotoExplore } from "./helpers/goto-explore";
  3   | import { waitExploreFeedReady } from "./helpers/wait-explore-feed-ready";
  4   |
  5   | async function waitFeedReady(page: Page) {
  6   |   const state = await waitExploreFeedReady(page, 60_000);
  7   |   if (state !== "scroll") {
  8   |     test.skip(true, "Feed scroll not available");
  9   |   }
  10  | }
  11  |
  12  | async function expectFeedTab(page: Page, tab: string) {
  13  |   await expect
  14  |     .poll(() => new URL(page.url()).searchParams.get("feedTab"), {
  15  |       timeout: 12_000,
  16  |     })
  17  |     .toBe(tab);
  18  | }
  19  |
  20  | async function expectMainTab(page: Page, tab: string) {
  21  |   await expect
  22  |     .poll(() => new URL(page.url()).searchParams.get("tab"), {
  23  |       timeout: 12_000,
  24  |     })
> 25  |     .toBe(tab);
      |      ^ Error: expect(received).toBe(expected) // Object.is equality
  26  | }
  27  |
  28  | async function expectNoDiscoverTab(page: Page) {
  29  |   await expect
  30  |     .poll(() => new URL(page.url()).searchParams.get("tab"), { timeout: 8_000 })
  31  |     .not.toBe("discover");
  32  | }
  33  |
  34  | test.describe("explore URL sync journeys", () => {
  35  |   test("feed sub-tab transitions sync URL immediately (10x)", async ({
  36  |     page,
  37  |   }) => {
  38  |     await gotoExplore(page);
  39  |     await waitFeedReady(page);
  40  |
  41  |     for (let i = 0; i < 10; i++) {
  42  |       await page.getByTestId("explore-subtab-saves").click();
  43  |       await expectFeedTab(page, "saves");
  44  |       await expect(page.getByTestId("explore-subtab-saves")).toHaveClass(
  45  |         /bg-white/
  46  |       );
  47  |
  48  |       await page.getByTestId("explore-subtab-tv").click();
  49  |       await expectFeedTab(page, "tv");
  50  |
  51  |       await page.getByTestId("explore-subtab-trends").click();
  52  |       await expectFeedTab(page, "trends");
  53  |     }
  54  |   });
  55  |
  56  |   test("rapid sub-tab clicks after hydration converge on final URL (10x)", async ({
  57  |     page,
  58  |   }) => {
  59  |     await gotoExplore(page);
  60  |     await waitFeedReady(page);
  61  |
  62  |     for (let i = 0; i < 10; i++) {
  63  |       await page.getByTestId("explore-subtab-trends").click();
  64  |       await page.getByTestId("explore-subtab-saves").click();
  65  |       await page.getByTestId("explore-subtab-tv").click();
  66  |       await expectFeedTab(page, "tv");
  67  |       await page.getByTestId("explore-subtab-trends").click();
  68  |       await expectFeedTab(page, "trends");
  69  |     }
  70  |   });
  71  |
  72  |   test("Trends → Start Community preserves feedTab (10x)", async ({ page }) => {
  73  |     await gotoExplore(page);
  74  |     await waitFeedReady(page);
  75  |
  76  |     for (let i = 0; i < 10; i++) {
  77  |       await page.getByTestId("explore-subtab-saves").click();
  78  |       await expectFeedTab(page, "saves");
  79  |       await page.getByTestId("explore-chrome-start-community").click();
  80  |       await expectMainTab(page, "my-communities");
  81  |       await expectFeedTab(page, "saves");
  82  |       await page.getByTestId("explore-chrome-feed").click();
  83  |       await expectFeedTab(page, "saves");
  84  |       await expect
  85  |         .poll(() => new URL(page.url()).searchParams.get("tab"), {
  86  |           timeout: 8_000,
  87  |         })
  88  |         .toBeNull();
  89  |     }
  90  |   });
  91  |
  92  |   test("Community sub-tab syncs URL when visible (10x)", async ({ page }) => {
  93  |     await gotoExplore(page);
  94  |     await waitFeedReady(page);
  95  |     const community = page.getByTestId("explore-subtab-community");
  96  |     if (!(await community.isVisible({ timeout: 3_000 }).catch(() => false))) {
  97  |       test.skip(
  98  |         true,
  99  |         "Community sub-tab not visible (viewport or feature flag)"
  100 |       );
  101 |       return;
  102 |     }
  103 |
  104 |     for (let i = 0; i < 10; i++) {
  105 |       await community.click();
  106 |       await expectFeedTab(page, "community");
  107 |       await page.getByTestId("explore-subtab-trends").click();
  108 |       await expectFeedTab(page, "trends");
  109 |     }
  110 |   });
  111 |
  112 |   test("Discover quick panel expand navigates client-side to tab=discover", async ({
  113 |     page,
  114 |   }) => {
  115 |     await gotoExplore(page);
  116 |     await waitFeedReady(page);
  117 |
  118 |     const search = page.locator(
  119 |       'input[placeholder="Search videos..."]:visible'
  120 |     );
  121 |     await expect(search).toBeVisible({ timeout: 30_000 });
  122 |     await search.click();
  123 |     await search.fill("music");
  124 |     await search.press("Enter");
  125 |
```
