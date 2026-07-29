# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: explore-feed-pagination.spec.ts >> Explore feed pagination >> anonymous Trends loads three batches (boot + two continuations)
- Location: e2e\explore-feed-pagination.spec.ts:31:7

# Error details

```
Error: expect(received).toBeGreaterThan(expected)

Expected: > 8
Received:   8

Call Log:
- Timeout 60000ms exceeded while waiting on the predicate
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
        - generic [ref=e56]: Live Stream
        - generic [ref=e59]:
          - text: Portugal vs Spa..
          - button "Open comments" [ref=e60]:
            - img [ref=e61]
        - generic [ref=e65]:
          - text: Daily Dose of F..
          - button "Open comments" [ref=e66]:
            - img [ref=e67]
        - generic [ref=e69]:
          - iframe [ref=e76]:
            - generic [active] [ref=f1e1]:
              - generic "YouTube Video Player" [ref=f1e3]:
                - generic [ref=f1e7]:
                  - generic [ref=f1e9]: "[Applause]"
                  - generic [ref=f1e11]: game. Lionel
              - button "Show player controls" [ref=f1e13] [cursor=pointer]
          - generic [ref=e77]:
            - generic [ref=e78]:
              - button "Unmute" [ref=e79] [cursor=pointer]:
                - img [ref=e80]
              - generic [ref=e84]: Lionel Messi Community Video
            - paragraph [ref=e85]:
              - text: 0 saves · 8 shares · 0 comments ·
              - generic [ref=e86]:
                - img [ref=e87]
                - text: 6 seen
          - generic [ref=e91]:
            - button "Save video" [ref=e92] [cursor=pointer]:
              - img [ref=e93]
            - button "Share" [ref=e96] [cursor=pointer]:
              - img [ref=e97]
            - button [ref=e103] [cursor=pointer]:
              - img [ref=e104]
          - generic [ref=e106]:
            - button "1 tips" [ref=e107] [cursor=pointer]
            - generic [ref=e108]:
              - img "Black Diamond"
          - generic [ref=e112]:
            - button "Create video" [ref=e113] [cursor=pointer]:
              - img
            - generic [ref=e114]:
              - button "Watch TV" [ref=e115] [cursor=pointer]
              - button "Engage" [ref=e116] [cursor=pointer]
            - button "Comments" [ref=e117] [cursor=pointer]:
              - img
        - generic [ref=e121]:
          - generic:
            - img
            - text: Live stream · Completed
          - iframe [ref=e125]:
            - generic [active] [ref=f2e1]:
              - generic "YouTube Video Player" [ref=f2e3]
              - generic [ref=f2e5]:
                - generic:
                  - generic:
                    - button "Play video" [ref=f2e10] [cursor=pointer]
                    - button "Hide player controls" [ref=f2e12] [cursor=pointer]
                    - generic [ref=f2e14]:
                      - generic [ref=f2e19]:
                        - generic [ref=f2e20]:
                          - link "MESSI SAVED ARGENTINA FROM BEING ELIMINATED IN THE GROUP STAGE AND ENZO SCORED AN EPIC GOAL" [ref=f2e21] [cursor=pointer]:
                            - /url: https://www.youtube.com/watch?v=uI1J4Ss204Y
                          - link "Football Flow™" [ref=f2e22] [cursor=pointer]:
                            - /url: /channel/UCZAy3DAQInSR1R2DPXChSgg
                            - generic [ref=f2e23]: Football Flow™
                        - generic [ref=f2e24]:
                          - button [ref=f2e25] [cursor=pointer]
                          - generic [ref=f2e27]:
                            - generic: Football Flow™
                            - generic: 569K subscribers
                      - generic [ref=f2e28]:
                        - button "Copy link" [ref=f2e31] [cursor=pointer]:
                          - generic [ref=f2e35]:
                            - img
                        - link "Watch on YouTube" [ref=f2e42] [cursor=pointer]:
                          - /url: https://www.youtube.com/watch?v=uI1J4Ss204Y
                          - generic [ref=f2e45]:
                            - text: Watch on
                            - img [ref=f2e47]:
                              - generic [ref=f2e49]:
                                - img
        - generic [ref=e128]: Live Stream
        - generic [ref=e131]:
          - text: Crazy nine goal..
          - button "Open comments" [ref=e132]:
            - img [ref=e133]
        - generic [ref=e137]:
          - text: Intro to Showca..
          - button "Open comments" [ref=e138]:
            - img [ref=e139]
```

# Test source

```ts
  1   | import { test, expect } from "@playwright/test";
  2   | import { waitExploreFeedReady } from "./helpers/wait-explore-feed-ready";
  3   | 
  4   | /** Near-end threshold matches EXPLORE_NEAR_END_SLOTS in explore-feed-client. */
  5   | const NEAR_END_SLOTS = 5;
  6   | 
  7   | /** Scroll feed to a zero-based slide index and wait for snap settle. */
  8   | async function scrollFeedToIndex(
  9   |   page: import("@playwright/test").Page,
  10  |   index: number
  11  | ): Promise<number> {
  12  |   const scroll = page.getByTestId("explore-feed-scroll");
  13  |   return scroll.evaluate(async (el, targetIndex) => {
  14  |     const slide = el.querySelector("[data-explore-slide]") as HTMLElement | null;
  15  |     const h = slide?.getBoundingClientRect().height ?? el.clientHeight;
  16  |     if (h <= 0) return -1;
  17  |     el.scrollTop = targetIndex * h;
  18  |     el.dispatchEvent(new Event("scroll", { bubbles: true }));
  19  |     await new Promise<void>(resolve => {
  20  |       requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  21  |     });
  22  |     return Math.round(el.scrollTop / h);
  23  |   }, index);
  24  | }
  25  | 
  26  | function nearEndIndex(slideCount: number): number {
  27  |   return Math.max(0, slideCount - NEAR_END_SLOTS);
  28  | }
  29  | 
  30  | test.describe("Explore feed pagination", () => {
  31  |   test("anonymous Trends loads three batches (boot + two continuations)", async ({
  32  |     page,
  33  |   }) => {
  34  |     test.setTimeout(180_000);
  35  | 
  36  |     const paginationLogs: string[] = [];
  37  | 
  38  |     page.on("console", msg => {
  39  |       const text = msg.text();
  40  |       if (text.includes("explore_pagination")) {
  41  |         paginationLogs.push(text);
  42  |       }
  43  |     });
  44  | 
  45  |     await page.goto("/explore");
  46  |     const ready = await waitExploreFeedReady(page, 60_000);
  47  |     if (ready.state !== "scroll") {
  48  |       test.skip(true, "Populated feed required for pagination");
  49  |       return;
  50  |     }
  51  | 
  52  |     const scroll = page.getByTestId("explore-feed-scroll");
  53  |     await expect(scroll).toBeVisible();
  54  | 
  55  |     const bootCount = await page.locator("[data-explore-slide]").count();
  56  |     expect(bootCount).toBeGreaterThanOrEqual(4);
  57  | 
  58  |     let slideCount = bootCount;
  59  | 
  60  |     for (let round = 0; round < 2; round += 1) {
  61  |       await scrollFeedToIndex(page, nearEndIndex(slideCount));
  62  |       await expect(async () => {
  63  |         const count = await page.locator("[data-explore-slide]").count();
  64  |         expect(count).toBeGreaterThan(slideCount);
> 65  |       }).toPass({ timeout: 60_000 });
      |          ^ Error: expect(received).toBeGreaterThan(expected)
  66  |       slideCount = await page.locator("[data-explore-slide]").count();
  67  |     }
  68  | 
  69  |     // Boot batch + two continuation batches.
  70  |     expect(slideCount).toBeGreaterThanOrEqual(bootCount + 4);
  71  | 
  72  |     const requestPhases = paginationLogs.filter(l => l.includes('"phase":"request"'));
  73  |     expect(requestPhases.length).toBeGreaterThanOrEqual(2);
  74  | 
  75  |     const successPhases = paginationLogs.filter(l => l.includes('"phase":"success"'));
  76  |     expect(successPhases.length).toBeGreaterThanOrEqual(2);
  77  |   });
  78  | 
  79  |   test("fourth batch loads after third near-end crossing", async ({ page }) => {
  80  |     test.setTimeout(240_000);
  81  | 
  82  |     await page.goto("/explore");
  83  |     const ready = await waitExploreFeedReady(page, 60_000);
  84  |     if (ready.state !== "scroll") {
  85  |       test.skip(true, "Populated feed required for pagination");
  86  |       return;
  87  |     }
  88  | 
  89  |     let slideCount = await page.locator("[data-explore-slide]").count();
  90  | 
  91  |     for (let round = 0; round < 3; round += 1) {
  92  |       await scrollFeedToIndex(page, nearEndIndex(slideCount));
  93  |       await expect(async () => {
  94  |         const count = await page.locator("[data-explore-slide]").count();
  95  |         expect(count).toBeGreaterThan(slideCount);
  96  |       }).toPass({ timeout: 90_000 });
  97  |       slideCount = await page.locator("[data-explore-slide]").count();
  98  |     }
  99  | 
  100 |     expect(slideCount).toBeGreaterThanOrEqual(26);
  101 |   });
  102 | });
  103 | 
```