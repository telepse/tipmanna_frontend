# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: explore-url-sync-journeys.spec.ts >> explore URL sync journeys >> Community sub-tab syncs URL when visible (10x)
- Location: e2e\explore-url-sync-journeys.spec.ts:92:7

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: "trends"
Received: "community"

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
                        - button "Trends" [active] [ref=e60]
                        - button "Saves" [ref=e61]
                        - button "TV" [ref=e62]
                        - button "Community" [ref=e63]
                    - button "My Communities" [ref=e65] [cursor=pointer]:
                        - generic [ref=e66]: My Communities
                - button "Open filters" [ref=e67]:
                    - img [ref=e68]
            - generic [ref=e72]:
                - generic [ref=e73]:
                    - iframe [ref=e80]:
                        - generic [active] [ref=f29e1]:
                            - generic "YouTube Video Player" [ref=f29e3]
                            - generic [ref=f29e6]:
                                - generic:
                                    - generic:
                                        - button "Hide player controls" [ref=f29e7] [cursor=pointer]
                                        - generic [ref=f29e9]:
                                            - generic:
                                                - generic [ref=f29e14]:
                                                    - generic [ref=f29e15]:
                                                        - 'link "Colombia vs. France Reaction: The B side is one of the best in the world! – Frank Leboeuf | ESPN FC" [ref=f29e16] [cursor=pointer]':
                                                            - /url: https://www.youtube.com/watch?v=e8HPoJf42gA
                                                        - link "ESPN FC" [ref=f29e17] [cursor=pointer]:
                                                            - /url: /channel/UC6c1z7bA__85CIWZ_jpCK-Q
                                                            - generic [ref=f29e18]: ESPN FC
                                                    - generic [ref=f29e19]:
                                                        - button [ref=f29e20] [cursor=pointer]
                                                        - generic [ref=f29e22]:
                                                            - generic: ESPN FC
                                                            - generic: 5.27M subscribers
                                                - generic [ref=f29e23]:
                                                    - generic:
                                                        - button "Rewind 10 seconds"
                                                        - generic:
                                                            - button "Play video":
                                                                - generic:
                                                                    - generic:
                                                                        - generic:
                                                                            - img
                                                        - button "Fast forward 10 seconds"
                                            - generic:
                                                - generic [ref=f29e26]:
                                                    - button "Copy link" [ref=f29e30] [cursor=pointer]:
                                                        - generic [ref=f29e34]:
                                                            - img
                                                    - generic [ref=f29e38]:
                                                        - button "More videos" [ref=f29e41] [cursor=pointer]:
                                                            - generic [ref=f29e42]: More videos
                                                        - link "Watch on YouTube" [ref=f29e49] [cursor=pointer]:
                                                            - /url: https://www.youtube.com/watch?v=e8HPoJf42gA
                                                            - img [ref=f29e53]:
                                                                - generic [ref=f29e55]:
                                                                    - img
                                                - generic:
                                                    - generic:
                                                        - generic:
                                                            - generic:
                                                                - generic:
                                                                    - generic:
                                                                        - link:
                                                                            - /url: https://www.youtube.com/watch?v=68dBCIlFblw&feature=endscreen
                                                                            - generic:
                                                                                - generic:
                                                                                    - generic:
                                                                                        - generic: 19:43
                                                                        - generic:
                                                                            - generic:
                                                                                - generic:
                                                                                    - link "Saka's hat trick & Mbappé's World Cup record 🔥 FULL REACTION to France vs. England | ESPN FC 5 hours ago":
                                                                                        - /url: https://www.youtube.com/watch?v=68dBCIlFblw&feature=endscreen
                                                                                        - heading "Saka's hat trick & Mbappé's World Cup record 🔥 FULL REACTION to France vs. England | ESPN FC" [level=3]
                                                                                        - generic:
                                                                                            - generic:
                                                                                                - generic: 5 hours ago
                                                        - generic:
                                                            - generic:
                                                                - generic:
                                                                    - generic:
                                                                        - link:
                                                                            - /url: https://www.youtube.com/watch?v=fhw8U9df7VI&feature=endscreen
                                                                            - generic:
                                                                                - generic:
                                                                                    - generic:
                                                                                        - generic: 55:54
                                                                        - generic:
                                                                            - generic:
                                                                                - generic:
                                                                                    - link "Saka & Mbappe highlight high-scoring World Cup 3rd-place match 🍿 + WC final PREVIEW | ESPN FC 4 hours ago":
                                                                                        - /url: https://www.youtube.com/watch?v=fhw8U9df7VI&feature=endscreen
                                                                                        - heading "Saka & Mbappe highlight high-scoring World Cup 3rd-place match 🍿 + WC final PREVIEW | ESPN FC" [level=3]
                                                                                        - generic:
                                                                                            - generic:
                                                                                                - generic: 4 hours ago
                                                        - generic:
                                                            - generic:
                                                                - generic:
                                                                    - generic:
                                                                        - link:
                                                                            - /url: https://www.youtube.com/watch?v=lyuBo3S0zZQ&feature=endscreen
                                                                            - generic:
                                                                                - generic:
                                                                                    - generic:
                                                                                        - generic: 21:51
                                                                        - generic:
                                                                            - generic:
                                                                                - generic:
                                                                                    - link "Morocco vs. Norway | Full Game Highlights | ESPN FC 1 month ago":
                                                                                        - /url: https://www.youtube.com/watch?v=lyuBo3S0zZQ&feature=endscreen
                                                                                        - heading "Morocco vs. Norway | Full Game Highlights | ESPN FC" [level=3]
                                                                                        - generic:
                                                                                            - generic:
                                                                                                - generic: 1 month ago
                                                        - generic:
                                                            - generic:
                                                                - generic:
                                                                    - generic:
                                                                        - link:
                                                                            - /url: https://www.youtube.com/watch?v=nV2DuCXk-ys&feature=endscreen
                                                                            - generic:
                                                                                - generic:
                                                                                    - generic:
                                                                                        - generic: 11:42
                                                                        - generic:
                                                                            - generic:
                                                                                - generic:
                                                                                    - link "‘A scary proposition!’ - Nedum Onuoha on Argentina’s underdog status in World Cup Final | ESPN FC 13 hours ago":
                                                                                        - /url: https://www.youtube.com/watch?v=nV2DuCXk-ys&feature=endscreen
                                                                                        - heading "‘A scary proposition!’ - Nedum Onuoha on Argentina’s underdog status in World Cup Final | ESPN FC" [level=3]
                                                                                        - generic:
                                                                                            - generic:
                                                                                                - generic: 13 hours ago
                                                        - generic:
                                                            - generic:
                                                                - generic:
                                                                    - generic:
                                                                        - link:
                                                                            - /url: https://www.youtube.com/watch?v=INyQIDe2K4k&feature=endscreen
                                                                            - generic:
                                                                                - generic:
                                                                                    - generic:
                                                                                        - generic: 12:03
                                                                        - generic:
                                                                            - generic:
                                                                                - generic:
                                                                                    - link "How will France set up under Zinedine Zidane? 🤔 + World Cup final predictions | ESPN FC 4 hours ago":
                                                                                        - /url: https://www.youtube.com/watch?v=INyQIDe2K4k&feature=endscreen
                                                                                        - heading "How will France set up under Zinedine Zidane? 🤔 + World Cup final predictions | ESPN FC" [level=3]
                                                                                        - generic:
                                                                                            - generic:
                                                                                                - generic: 4 hours ago
                                                        - generic:
                                                            - generic:
                                                                - generic:
                                                                    - generic:
                                                                        - link:
                                                                            - /url: https://www.youtube.com/watch?v=abInVH3NJSM&feature=endscreen
                                                                            - generic:
                                                                                - generic:
                                                                                    - generic:
                                                                                        - generic: 12:40
                                                                        - generic:
                                                                            - generic:
                                                                                - generic:
                                                                                    - link "Aftermath of Thomas Tuchel's 'NO REGRETS' comments 😮 Should he be SACKED!? | ESPN FC 13 hours ago":
                                                                                        - /url: https://www.youtube.com/watch?v=abInVH3NJSM&feature=endscreen
                                                                                        - heading "Aftermath of Thomas Tuchel's 'NO REGRETS' comments 😮 Should he be SACKED!? | ESPN FC" [level=3]
                                                                                        - generic:
                                                                                            - generic:
                                                                                                - generic: 13 hours ago
                                                        - generic:
                                                            - generic:
                                                                - generic:
                                                                    - generic:
                                                                        - link:
                                                                            - /url: https://www.youtube.com/watch?v=9-UAc-Aaua8&feature=endscreen
                                                                            - generic:
                                                                                - generic:
                                                                                    - generic:
                                                                                        - generic: 44:23
                                                                        - generic:
                                                                            - generic:
                                                                                - generic:
                                                                                    - link "BOLD PREDICTIONS for Argentina vs. Spain!? 👀 + England vs. France & Tuchel's controversy | ESPN FC 12 hours ago":
                                                                                        - /url: https://www.youtube.com/watch?v=9-UAc-Aaua8&feature=endscreen
                                                                                        - heading "BOLD PREDICTIONS for Argentina vs. Spain!? 👀 + England vs. France & Tuchel's controversy | ESPN FC" [level=3]
                                                                                        - generic:
                                                                                            - generic:
                                                                                                - generic: 12 hours ago
                                                        - generic:
                                                            - generic:
                                                                - generic:
                                                                    - generic:
                                                                        - link:
                                                                            - /url: https://www.youtube.com/watch?v=pAXZixWL2hE&feature=endscreen
                                                                            - generic:
                                                                                - generic:
                                                                                    - generic:
                                                                                        - generic: 19:52
                                                                        - generic:
                                                                            - generic:
                                                                                - generic:
                                                                                    - link "Colombia vs. France | Full Game Highlights | ESPN FC 3 months ago":
                                                                                        - /url: https://www.youtube.com/watch?v=pAXZixWL2hE&feature=endscreen
                                                                                        - heading "Colombia vs. France | Full Game Highlights | ESPN FC" [level=3]
                                                                                        - generic:
                                                                                            - generic:
                                                                                                - generic: 3 months ago
                                                        - generic:
                                                            - generic:
                                                                - generic:
                                                                    - generic:
                                                                        - link:
                                                                            - /url: https://www.youtube.com/watch?v=RYDVPc8MoXk&feature=endscreen
                                                                            - generic:
                                                                                - generic:
                                                                                    - generic:
                                                                                        - generic: 19:19
                                                                        - generic:
                                                                            - generic:
                                                                                - generic:
                                                                                    - link "Argentina's determination fueling World Cup run 🙌 PREVIEW of WC final vs. Spain | ESPN FC 4 hours ago":
                                                                                        - /url: https://www.youtube.com/watch?v=RYDVPc8MoXk&feature=endscreen
                                                                                        - heading "Argentina's determination fueling World Cup run 🙌 PREVIEW of WC final vs. Spain | ESPN FC" [level=3]
                                                                                        - generic:
                                                                                            - generic:
                                                                                                - generic: 4 hours ago
                                                        - generic:
                                                            - generic:
                                                                - generic:
                                                                    - generic:
                                                                        - link:
                                                                            - /url: https://www.youtube.com/watch?v=wweiM65LrEs&feature=endscreen
                                                                            - generic:
                                                                                - generic:
                                                                                    - generic:
                                                                                        - generic: 32:38
                                                                        - generic:
                                                                            - generic:
                                                                                - generic:
                                                                                    - link "Brazil vs. Croatia EXTENDED HIGHLIGHTS [March 31, 2026] | Full Game Highlights | ESPN FC 3 months ago":
                                                                                        - /url: https://www.youtube.com/watch?v=wweiM65LrEs&feature=endscreen
                                                                                        - heading "Brazil vs. Croatia EXTENDED HIGHLIGHTS [March 31, 2026] | Full Game Highlights | ESPN FC" [level=3]
                                                                                        - generic:
                                                                                            - generic:
                                                                                                - generic: 3 months ago
                                                        - generic:
                                                            - generic:
                                                                - generic:
                                                                    - generic:
                                                                        - link:
                                                                            - /url: https://www.youtube.com/watch?v=2pmiVweXV0g&feature=endscreen
                                                                            - generic:
                                                                                - generic:
                                                                                    - generic:
                                                                                        - generic: 25:24
                                                                        - generic:
                                                                            - generic:
                                                                                - generic:
                                                                                    - 'link "France vs. England FULL REACTION: 10 GOAL THRILLER! | ESPN FC Streamed 5 hours ago"':
                                                                                        - /url: https://www.youtube.com/watch?v=2pmiVweXV0g&feature=endscreen
                                                                                        - 'heading "France vs. England FULL REACTION: 10 GOAL THRILLER! | ESPN FC" [level=3]'
                                                                                        - generic:
                                                                                            - generic:
                                                                                                - generic: Streamed 5 hours ago
                                                        - generic:
                                                            - generic:
                                                                - generic:
                                                                    - generic:
                                                                        - link:
                                                                            - /url: https://www.youtube.com/watch?v=tgB0AhKPY8Q&feature=endscreen
                                                                            - generic:
                                                                                - generic:
                                                                                    - generic:
                                                                                        - generic: 19:22
                                                                        - generic:
                                                                            - generic:
                                                                                - generic:
                                                                                    - link "France vs. Spain FULL REACTION 🔥 Spain were EXCELLENT & France were a FAILURE! - Leboeuf | ESPN FC 4 days ago":
                                                                                        - /url: https://www.youtube.com/watch?v=tgB0AhKPY8Q&feature=endscreen
                                                                                        - heading "France vs. Spain FULL REACTION 🔥 Spain were EXCELLENT & France were a FAILURE! - Leboeuf | ESPN FC" [level=3]
                                                                                        - generic:
                                                                                            - generic:
                                                                                                - generic: 4 days ago
                    - generic [ref=e81]:
                        - generic [ref=e82]:
                            - button "Unmute" [ref=e83] [cursor=pointer]:
                                - img [ref=e84]
                            - generic [ref=e88]: Live Stream
                        - paragraph [ref=e89]:
                            - text: 0 saves · 1 shares · 0 comments ·
                            - generic [ref=e90]:
                                - img [ref=e91]
                                - text: 1 seen
                    - generic [ref=e95]:
                        - button "Save video" [ref=e96] [cursor=pointer]:
                            - img [ref=e97]
                        - button "Share" [ref=e100] [cursor=pointer]:
                            - img [ref=e101]
                        - button [ref=e107] [cursor=pointer]:
                            - img [ref=e108]
                    - generic [ref=e110]:
                        - button "2 tips" [ref=e111] [cursor=pointer]
                        - generic [ref=e112]:
                            - img "Black Diamond"
                    - generic [ref=e116]:
                        - button "Create video" [ref=e117] [cursor=pointer]:
                            - img
                        - generic [ref=e118]:
                            - button "Watch TV" [ref=e119] [cursor=pointer]
                            - button "Engage" [ref=e120] [cursor=pointer]
                        - button "Comments" [ref=e121] [cursor=pointer]:
                            - img
                - iframe [ref=e129]:
                    - generic "YouTube Video Player" [ref=f30e3]:
                        - alert [ref=f30e4]:
                            - generic [ref=f30e5]:
                                - generic [ref=f30e6]:
                                    - img
                                - generic [ref=f30e7]:
                                    - generic [ref=f30e8]: Video unavailable
                                    - generic [ref=f30e9]: This video is unavailable
                            - link "Visit YouTube to search for more videos" [ref=f30e10] [cursor=pointer]:
                                - /url: https://www.youtube.com
                                - img
                - generic [ref=e132]:
                    - text: The best burger..
                    - button "Open comments" [ref=e133]:
                        - img [ref=e134]
                - generic [ref=e138]:
                    - text: Magnus Carlsen ..
                    - button "Open comments" [ref=e139]:
                        - img [ref=e140]
                - generic [ref=e144]:
                    - text: How to cook a p..
                    - button "Open comments" [ref=e145]:
                        - img [ref=e146]
                - generic [ref=e150]:
                    - text: Daily Dose of F..
                    - button "Open comments" [ref=e151]:
                        - img [ref=e152]
                - generic [ref=e156]:
                    - text: Nicki Minaj on ..
                    - button "Open comments" [ref=e157]:
                        - img [ref=e158]
                - generic [ref=e162]:
                    - text: GM Chess Lesson..
                    - button "Open comments" [ref=e163]:
                        - img [ref=e164]
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
