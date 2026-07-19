# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: explore-url-sync-journeys.spec.ts >> explore URL sync journeys >> feed sub-tab transitions sync URL immediately (10x)
- Location: e2e\explore-url-sync-journeys.spec.ts:35:7

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: "saves"
Received: "trends"

Call Log:
- Test timeout of 90000ms exceeded
```

# Page snapshot

```yaml
- generic [ref=e1]:
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
                    - textbox "Search videos..." [ref=e33]
                    - img [ref=e34]
                - generic [ref=e39]: 0 watching live
        - generic [ref=e41]:
            - generic [ref=e42]:
                - button [ref=e43]:
                    - img [ref=e44]
                - generic [ref=e45]: Create
            - button "Feed" [ref=e46]
            - button "Start Community" [ref=e47]
            - button "1 Not signed in" [ref=e48]:
                - generic [ref=e49]:
                    - img [ref=e50]
                    - generic [ref=e53]: "1"
                - generic [ref=e54]: Not signed in
        - generic [ref=e55]:
            - generic [ref=e57]:
                - generic [ref=e58]:
                    - generic [ref=e59]:
                        - button "Trends" [ref=e60]
                        - button "Saves" [active] [ref=e61]
                        - button "TV" [ref=e62]
                        - button "Community" [ref=e63]
                    - button "My Communities" [ref=e65] [cursor=pointer]:
                        - generic [ref=e66]: My Communities
                - button "Open filters" [ref=e67]:
                    - img [ref=e68]
            - generic "Loading explore feed" [ref=e71]
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
> 17  |     .toBe(tab);
      |      ^ Error: expect(received).toBe(expected) // Object.is equality
  18  | }
  19  |
  20  | async function expectMainTab(page: Page, tab: string) {
  21  |   await expect
  22  |     .poll(() => new URL(page.url()).searchParams.get("tab"), {
  23  |       timeout: 12_000,
  24  |     })
  25  |     .toBe(tab);
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
```
