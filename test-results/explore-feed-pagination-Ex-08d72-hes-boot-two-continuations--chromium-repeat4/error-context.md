# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: explore-feed-pagination.spec.ts >> Explore feed pagination >> anonymous Trends loads three batches (boot + two continuations)
- Location: e2e\explore-feed-pagination.spec.ts:38:7

# Error details

```
Error: expect(received).toBeGreaterThan(expected)

Expected: > 14
Received:   14

Call Log:
- Timeout 120000ms exceeded while waiting on the predicate
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - region "Notification messages"
  - alert [ref=e2]
  - generic [ref=e3]:
    - banner [ref=e4]:
      - heading "Tipmanna TV — Explore and discover community media" [level=1] [ref=e5]
      - generic [ref=e6]:
        - link "tipmanna" [ref=e7] [cursor=pointer]:
          - /url: /explore
        - button [ref=e8] [cursor=pointer]:
          - img [ref=e9]
      - generic [ref=e12]:
        - button "Open discover search" [ref=e13]:
          - textbox "Search videos..." [ref=e14]
          - img [ref=e15]
        - generic [ref=e20]: 0 watching live
    - generic [ref=e22]:
      - generic [ref=e23]:
        - button [ref=e24]:
          - img [ref=e25]
        - generic [ref=e26]: Create
      - button "Feed" [ref=e27]
      - button "Start Community" [ref=e28]
      - button "1 Not signed in" [ref=e29]:
        - generic [ref=e30]:
          - img [ref=e31]
          - generic [ref=e34]: "1"
        - generic [ref=e35]: Not signed in
    - generic [ref=e36]:
      - generic [ref=e38]:
        - generic [ref=e39]:
          - generic [ref=e40]:
            - button "Trends" [ref=e41]
            - button "Saves" [ref=e42]
            - button "TV" [ref=e43]
            - button "Community" [ref=e44]
          - button "My Communities" [ref=e46] [cursor=pointer]:
            - generic [ref=e47]: My Communities
        - button "Open filters" [ref=e48]:
          - img [ref=e49]
      - generic [ref=e53]:
        - generic [ref=e56]:
          - text: Surprise Birthd..
          - button "Open comments" [ref=e57]:
            - img [ref=e58]
        - generic [ref=e62]:
          - text: Painting a Brig..
          - button "Open comments" [ref=e63]:
            - img [ref=e64]
        - generic [ref=e68]:
          - text: Tipmanna Introd..
          - button "Open comments" [ref=e69]:
            - img [ref=e70]
        - generic [ref=e74]:
          - text: Flashback to th..
          - button "Open comments" [ref=e75]:
            - img [ref=e76]
        - generic [ref=e80]:
          - text: The Truth About..
          - button "Open comments" [ref=e81]:
            - img [ref=e82]
        - generic [ref=e86]:
          - text: 14-Year-Old Dan..
          - button "Open comments" [ref=e87]:
            - img [ref=e88]
        - generic [ref=e92]:
          - text: Tipmanna & Bsee..
          - button "Open comments" [ref=e93]:
            - img [ref=e94]
        - generic [ref=e98]:
          - text: The Lethal Powe..
          - button "Open comments" [ref=e99]:
            - img [ref=e100]
        - generic [ref=e104]:
          - text: Tipmanna Activa..
          - button "Open comments" [ref=e105]:
            - img [ref=e106]
        - generic [ref=e108]:
          - generic [ref=e111]:
            - 'generic "Community: African Drama TV" [ref=e112]':
              - button "C" [ref=e113]
              - link "This video (Public) is by African Drama TV":
                - /url: /explore?tab=join&joinCommunity=4fa00bb1-b4f5-4436-a66f-4fdeae86b6bd
            - iframe [ref=e117]:
              - generic [active] [ref=f7e1]:
                - generic "YouTube Video Player" [ref=f7e3]:
                  - generic [ref=f7e7]:
                    - generic [ref=f7e9]: outside you and only an um uses his left
                    - generic [ref=f7e11]: hand to describe his father's home
                - button "Show player controls" [ref=f7e13] [cursor=pointer]
          - generic [ref=e118]:
            - generic [ref=e119]:
              - button "Unmute" [ref=e120] [cursor=pointer]:
                - img [ref=e121]
              - generic [ref=e125]: What is Style? | Spoken Word P
              - text: ..
              - button "Open comments" [ref=e126] [cursor=pointer]:
                - img [ref=e127]
            - paragraph [ref=e129]:
              - text: 0 saves · 0 shares · 0 comments ·
              - generic [ref=e130]:
                - img [ref=e131]
                - text: 17 seen
          - generic [ref=e135]:
            - button "Save video" [ref=e136] [cursor=pointer]:
              - img [ref=e137]
            - button "Share" [ref=e140] [cursor=pointer]:
              - img [ref=e141]
            - button [ref=e147] [cursor=pointer]:
              - img [ref=e148]
          - generic [ref=e150]:
            - button "0 tips" [ref=e151] [cursor=pointer]
            - generic [ref=e152]:
              - img "Black Diamond"
          - generic [ref=e155]:
            - button "Create video" [ref=e156] [cursor=pointer]:
              - img
            - generic [ref=e157]:
              - button "Watch TV" [ref=e158] [cursor=pointer]
              - button "Engage" [ref=e159] [cursor=pointer]
            - button "Comments" [ref=e160] [cursor=pointer]:
              - img
        - iframe [ref=e168]:
          - generic [active] [ref=f8e1]:
            - generic "YouTube Video Player" [ref=f8e3]
            - generic [ref=f8e5]:
              - generic:
                - generic:
                  - button "Play video" [ref=f8e10] [cursor=pointer]:
                    - generic [ref=f8e13]:
                      - img
                  - button "Hide player controls" [ref=f8e14] [cursor=pointer]
                  - generic [ref=f8e16]:
                    - generic [ref=f8e21]:
                      - generic [ref=f8e22]:
                        - link "Tipmanna with the spark - Intro Video" [ref=f8e23] [cursor=pointer]:
                          - /url: https://www.youtube.com/shorts/PSM1sgqtPxA
                        - link "Tipmanna Live" [ref=f8e24] [cursor=pointer]:
                          - /url: /channel/UCQqFzfUl6jdwk9aJHydmwJg
                          - generic [ref=f8e25]: Tipmanna Live
                      - generic [ref=f8e26]:
                        - button [ref=f8e27] [cursor=pointer]
                        - generic [ref=f8e29]:
                          - generic: Tipmanna Live
                          - generic: 76 subscribers
                    - button "Copy link" [ref=f8e33] [cursor=pointer]:
                      - generic [ref=f8e37]:
                        - img
        - generic [ref=e171]:
          - text: Tipmanna Commun..
          - button "Open comments" [ref=e172]:
            - img [ref=e173]
        - generic [ref=e177]:
          - text: Laughs & Music:..
          - button "Open comments" [ref=e178]:
            - img [ref=e179]
        - generic [ref=e183]:
          - text: 2TTEE – Mama’s ..
          - button "Open comments" [ref=e184]:
            - img [ref=e185]
```

# Test source

```ts
  1   | import { test, expect } from "@playwright/test";
  2   | import { waitExploreFeedReady } from "./helpers/wait-explore-feed-ready";
  3   | 
  4   | /** Near-end threshold matches EXPLORE_NEAR_END_SLOTS in explore-feed-client. */
  5   | const NEAR_END_SLOTS = 5;
  6   | 
  7   | async function scrollFeedToIndex(
  8   |   page: import("@playwright/test").Page,
  9   |   index: number
  10  | ): Promise<number> {
  11  |   const scroll = page.getByTestId("explore-feed-scroll");
  12  |   return scroll.evaluate(async (el, targetIndex) => {
  13  |     const slide = el.querySelector("[data-explore-slide]") as HTMLElement | null;
  14  |     const h = slide?.getBoundingClientRect().height ?? el.clientHeight;
  15  |     if (h <= 0) return -1;
  16  |     el.scrollTop = targetIndex * h;
  17  |     el.dispatchEvent(new Event("scroll", { bubbles: true }));
  18  |     el.dispatchEvent(new Event("scrollend", { bubbles: true }));
  19  |     await new Promise<void>(resolve => {
  20  |       requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  21  |     });
  22  |     return Math.round(el.scrollTop / h);
  23  |   }, index);
  24  | }
  25  | 
  26  | async function scrollFeedNearEnd(
  27  |   page: import("@playwright/test").Page,
  28  |   slideCount: number
  29  | ): Promise<void> {
  30  |   await scrollFeedToIndex(page, nearEndIndex(slideCount));
  31  | }
  32  | 
  33  | function nearEndIndex(slideCount: number): number {
  34  |   return Math.max(0, slideCount - NEAR_END_SLOTS);
  35  | }
  36  | 
  37  | test.describe("Explore feed pagination", () => {
  38  |   test("anonymous Trends loads three batches (boot + two continuations)", async ({
  39  |     page,
  40  |   }) => {
  41  |     test.setTimeout(180_000);
  42  | 
  43  |     const paginationLogs: string[] = [];
  44  | 
  45  |     page.on("console", msg => {
  46  |       const text = msg.text();
  47  |       if (text.includes("explore_pagination")) {
  48  |         paginationLogs.push(text);
  49  |       }
  50  |     });
  51  | 
  52  |     await page.goto("/explore");
  53  |     const ready = await waitExploreFeedReady(page, 60_000);
  54  |     if (ready.state !== "scroll") {
  55  |       test.skip(true, "Populated feed required for pagination");
  56  |       return;
  57  |     }
  58  | 
  59  |     const scroll = page.getByTestId("explore-feed-scroll");
  60  |     await expect(scroll).toBeVisible();
  61  | 
  62  |     const bootCount = await page.locator("[data-explore-slide]").count();
  63  |     expect(bootCount).toBeGreaterThanOrEqual(4);
  64  | 
  65  |     let slideCount = bootCount;
  66  | 
  67  |     for (let round = 0; round < 2; round += 1) {
  68  |       await scrollFeedNearEnd(page, slideCount);
  69  |       const reachedNearEnd = await page.getByTestId("explore-feed-scroll").evaluate(
  70  |         (el, target) => {
  71  |           const slide = el.querySelector("[data-explore-slide]") as HTMLElement | null;
  72  |           const h = slide?.getBoundingClientRect().height ?? el.clientHeight;
  73  |           if (h <= 0) return false;
  74  |           return Math.round(el.scrollTop / h) >= target;
  75  |         },
  76  |         nearEndIndex(slideCount)
  77  |       );
  78  |       expect(reachedNearEnd).toBe(true);
  79  |       await expect(async () => {
  80  |         const count = await page.locator("[data-explore-slide]").count();
  81  |         expect(count).toBeGreaterThan(slideCount);
> 82  |       }).toPass({ timeout: 120_000 });
      |          ^ Error: expect(received).toBeGreaterThan(expected)
  83  |       slideCount = await page.locator("[data-explore-slide]").count();
  84  |     }
  85  | 
  86  |     // Boot batch + two continuation batches.
  87  |     expect(slideCount).toBeGreaterThanOrEqual(bootCount + 4);
  88  | 
  89  |     const requestPhases = paginationLogs.filter(l => l.includes('"phase":"request"'));
  90  |     expect(requestPhases.length).toBeGreaterThanOrEqual(2);
  91  | 
  92  |     const successPhases = paginationLogs.filter(l => l.includes('"phase":"success"'));
  93  |     expect(successPhases.length).toBeGreaterThanOrEqual(2);
  94  |   });
  95  | 
  96  |   test("fourth batch loads after third near-end crossing", async ({ page }) => {
  97  |     test.setTimeout(300_000);
  98  |     test.skip(true, "Optional stress case; primary three-batch contract is canonical");
  99  | 
  100 |     await page.goto("/explore");
  101 |     const ready = await waitExploreFeedReady(page, 60_000);
  102 |     if (ready.state !== "scroll") {
  103 |       test.skip(true, "Populated feed required for pagination");
  104 |       return;
  105 |     }
  106 | 
  107 |     let slideCount = await page.locator("[data-explore-slide]").count();
  108 | 
  109 |     for (let round = 0; round < 3; round += 1) {
  110 |       await scrollFeedNearEnd(page, slideCount);
  111 |       await expect(async () => {
  112 |         const count = await page.locator("[data-explore-slide]").count();
  113 |         expect(count).toBeGreaterThan(slideCount);
  114 |       }).toPass({ timeout: 90_000 });
  115 |       slideCount = await page.locator("[data-explore-slide]").count();
  116 |     }
  117 | 
  118 |     expect(slideCount).toBeGreaterThanOrEqual(26);
  119 |   });
  120 | });
  121 | 
```