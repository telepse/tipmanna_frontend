# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: explore-feed-pagination.spec.ts >> Explore feed pagination >> anonymous Trends loads three batches (boot + two continuations)
- Location: e2e\explore-feed-pagination.spec.ts:40:7

# Error details

```
Error: expect(received).toBeGreaterThan(expected)

Expected: > 8
Received:   8

Call Log:
- Timeout 120000ms exceeded while waiting on the predicate
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - region "Notification messages":
    - alert [ref=e3] [cursor=pointer]:
      - img [ref=e5]
      - text: "PrismaClientKnownRequestError: Invalid `prisma.eventChannel.findMany()` invocation in C:\\Users\\Elite\\Documents\\Tipmanna\\TIPMANNA - LOCAL\\backend\\src\\controllers\\content.controller.ts:1381:47 1378 communityBankAccessWhereForLists(batchViewer), 1379 ], 1380 }; → 1381 const ordered = await prisma.eventChannel.findMany( Can't reach database server at `aws-1-eu-west-1.pooler.supabase.com:6543` Please make sure your database server is running at `aws-1-eu-west-1.pooler.supabase.com:6543`. at ei.handleRequestError (C:\\Users\\Elite\\Documents\\Tipmanna\\TIPMANNA - LOCAL\\backend\\node_modules\\@prisma\\client\\src\\runtime\\RequestHandler.ts:228:13) at ei.handleAndLogRequestError (C:\\Users\\Elite\\Documents\\Tipmanna\\TIPMANNA - LOCAL\\backend\\node_modules\\@prisma\\client\\src\\runtime\\RequestHandler.ts:174:12) at ei.request (C:\\Users\\Elite\\Documents\\Tipmanna\\TIPMANNA - LOCAL\\backend\\node_modules\\@prisma\\client\\src\\runtime\\RequestHandler.ts:143:12) at async a (C:\\Users\\Elite\\Documents\\Tipmanna\\TIPMANNA - LOCAL\\backend\\node_modules\\@prisma\\client\\src\\runtime\\getPrismaClient.ts:833:24) at async postExploreFeedBatchImpl (C:\\Users\\Elite\\Documents\\Tipmanna\\TIPMANNA - LOCAL\\backend\\src\\controllers\\content.controller.ts:1381:21)"
      - button "close" [ref=e7]:
        - img [ref=e8]
      - progressbar "notification timer" [ref=e12]
  - alert [ref=e13]
  - generic [ref=e14]:
    - banner [ref=e15]:
      - heading "Tipmanna TV — Explore and discover community media" [level=1] [ref=e16]
      - generic [ref=e17]:
        - link "tipmanna" [ref=e18] [cursor=pointer]:
          - /url: /explore
        - button [ref=e19] [cursor=pointer]:
          - img [ref=e20]
      - generic [ref=e23]:
        - button "Open discover search" [ref=e24]:
          - textbox "Search videos..." [ref=e25]
          - img [ref=e26]
        - generic [ref=e31]: 0 watching live
    - generic [ref=e33]:
      - generic [ref=e34]:
        - button [ref=e35]:
          - img [ref=e36]
        - generic [ref=e37]: Create
      - button "Feed" [ref=e38]
      - button "Start Community" [ref=e39]
      - button "1 Not signed in" [ref=e40]:
        - generic [ref=e41]:
          - img [ref=e42]
          - generic [ref=e45]: "1"
        - generic [ref=e46]: Not signed in
    - generic [ref=e47]:
      - generic [ref=e49]:
        - generic [ref=e50]:
          - generic [ref=e51]:
            - button "Trends" [ref=e52]
            - button "Saves" [ref=e53]
            - button "TV" [ref=e54]
            - button "Community" [ref=e55]
          - button "My Communities" [ref=e57] [cursor=pointer]:
            - generic [ref=e58]: My Communities
        - button "Open filters" [ref=e59]:
          - img [ref=e60]
      - generic [ref=e64]:
        - generic [ref=e67]:
          - text: Dan Scavino & E..
          - button "Open comments" [ref=e68]:
            - img [ref=e69]
        - generic [ref=e73]:
          - text: Nicki Minaj on ..
          - button "Open comments" [ref=e74]:
            - img [ref=e75]
        - generic [ref=e79]:
          - text: NON-STOP MSN MA..
          - button "Open comments" [ref=e80]:
            - img [ref=e81]
        - generic [ref=e83]:
          - iframe [ref=e90]:
            - generic [ref=f15e3]:
              - strong [ref=f15e4]: www.youtube-nocookie.com
              - text: unexpectedly closed the connection.
          - generic [ref=e91]:
            - generic [ref=e92]:
              - button "Unmute" [ref=e93] [cursor=pointer]:
                - img [ref=e94]
              - generic [ref=e98]: Vinicius - Japan vs Brazil Par
              - text: ..
              - button "Open comments" [ref=e99] [cursor=pointer]:
                - img [ref=e100]
            - paragraph [ref=e102]:
              - text: 0 saves · 1 shares · 0 comments ·
              - generic [ref=e103]:
                - img [ref=e104]
                - text: 0 seen
          - generic [ref=e108]:
            - button "Save video" [ref=e109] [cursor=pointer]:
              - img [ref=e110]
            - button "Share" [ref=e113] [cursor=pointer]:
              - img [ref=e114]
            - button [ref=e120] [cursor=pointer]:
              - img [ref=e121]
          - generic [ref=e123]:
            - button "0 tips" [ref=e124] [cursor=pointer]
            - generic [ref=e125]:
              - img "Black Diamond"
          - generic [ref=e128]:
            - button "Create video" [ref=e129] [cursor=pointer]:
              - img
            - generic [ref=e130]:
              - button "Watch TV" [ref=e131] [cursor=pointer]
              - button "Engage" [ref=e132] [cursor=pointer]
            - button "Comments" [ref=e133] [cursor=pointer]:
              - img
        - iframe [ref=e141]:
          - generic [ref=f16e3]:
            - strong [ref=f16e4]: www.youtube-nocookie.com
            - text: unexpectedly closed the connection.
        - generic [ref=e144]:
          - text: Chamath & Natha..
          - button "Open comments" [ref=e145]:
            - img [ref=e146]
        - generic [ref=e150]:
          - text: FBI Director Ka..
          - button "Open comments" [ref=e151]:
            - img [ref=e152]
        - generic [ref=e156]:
          - text: Columbia vs Fra..
          - button "Open comments" [ref=e157]:
            - img [ref=e158]
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
  13  |     const slide = el.querySelector(
  14  |       "[data-explore-slide]"
  15  |     ) as HTMLElement | null;
  16  |     const h = slide?.getBoundingClientRect().height ?? el.clientHeight;
  17  |     if (h <= 0) return -1;
  18  |     el.scrollTop = targetIndex * h;
  19  |     el.dispatchEvent(new Event("scroll", { bubbles: true }));
  20  |     el.dispatchEvent(new Event("scrollend", { bubbles: true }));
  21  |     await new Promise<void>(resolve => {
  22  |       requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  23  |     });
  24  |     return Math.round(el.scrollTop / h);
  25  |   }, index);
  26  | }
  27  | 
  28  | function nearEndIndex(slideCount: number): number {
  29  |   return Math.max(0, slideCount - NEAR_END_SLOTS);
  30  | }
  31  | 
  32  | async function scrollFeedNearEnd(
  33  |   page: import("@playwright/test").Page,
  34  |   slideCount: number
  35  | ): Promise<void> {
  36  |   await scrollFeedToIndex(page, nearEndIndex(slideCount));
  37  | }
  38  | 
  39  | test.describe("Explore feed pagination", () => {
  40  |   test("anonymous Trends loads three batches (boot + two continuations)", async ({
  41  |     page,
  42  |   }) => {
  43  |     test.setTimeout(180_000);
  44  | 
  45  |     const paginationLogs: string[] = [];
  46  |     const batchStatuses: number[] = [];
  47  | 
  48  |     page.on("console", msg => {
  49  |       const text = msg.text();
  50  |       if (text.includes("explore_pagination")) {
  51  |         paginationLogs.push(text);
  52  |       }
  53  |     });
  54  | 
  55  |     page.on("response", res => {
  56  |       if (
  57  |         res.url().includes("/contents/feed/batch") &&
  58  |         res.request().method() === "POST"
  59  |       ) {
  60  |         batchStatuses.push(res.status());
  61  |       }
  62  |     });
  63  | 
  64  |     await page.goto("/explore");
  65  |     const ready = await waitExploreFeedReady(page, 60_000);
  66  |     if (ready.state !== "scroll") {
  67  |       test.skip(true, "Populated feed required for pagination");
  68  |       return;
  69  |     }
  70  | 
  71  |     const scroll = page.getByTestId("explore-feed-scroll");
  72  |     await expect(scroll).toBeVisible();
  73  | 
  74  |     const bootCount = await page.locator("[data-explore-slide]").count();
  75  |     expect(bootCount).toBeGreaterThanOrEqual(4);
  76  | 
  77  |     let slideCount = bootCount;
  78  | 
  79  |     for (let round = 0; round < 2; round += 1) {
  80  |       await scrollFeedNearEnd(page, slideCount);
  81  |       const reachedNearEnd = await page
  82  |         .getByTestId("explore-feed-scroll")
  83  |         .evaluate((el, target) => {
  84  |           const slide = el.querySelector(
  85  |             "[data-explore-slide]"
  86  |           ) as HTMLElement | null;
  87  |           const h = slide?.getBoundingClientRect().height ?? el.clientHeight;
  88  |           if (h <= 0) return false;
  89  |           return Math.round(el.scrollTop / h) >= target;
  90  |         }, nearEndIndex(slideCount));
  91  |       expect(reachedNearEnd).toBe(true);
  92  |       await expect(async () => {
  93  |         const count = await page.locator("[data-explore-slide]").count();
  94  |         expect(count).toBeGreaterThan(slideCount);
> 95  |       }).toPass({ timeout: 120_000 });
      |          ^ Error: expect(received).toBeGreaterThan(expected)
  96  |       slideCount = await page.locator("[data-explore-slide]").count();
  97  |     }
  98  | 
  99  |     expect(slideCount).toBeGreaterThanOrEqual(bootCount + 4);
  100 | 
  101 |     const requestPhases = paginationLogs.filter(l =>
  102 |       l.includes('"phase":"request"')
  103 |     );
  104 |     expect(requestPhases.length).toBeGreaterThanOrEqual(2);
  105 | 
  106 |     const successPhases = paginationLogs.filter(l =>
  107 |       l.includes('"phase":"success"')
  108 |     );
  109 |     expect(successPhases.length).toBeGreaterThanOrEqual(2);
  110 | 
  111 |     expect(batchStatuses.every(s => s !== 429 && s < 500)).toBeTruthy();
  112 |     await expect(page.getByTestId("explore-feed-skeleton")).not.toBeVisible();
  113 |   });
  114 | 
  115 |   test("fast-scroll near-end starts request before final old slide", async ({
  116 |     page,
  117 |   }) => {
  118 |     test.setTimeout(180_000);
  119 |     const marks: { label: string; t: number }[] = [];
  120 |     const mark = (label: string) => marks.push({ label, t: Date.now() });
  121 | 
  122 |     page.on("console", msg => {
  123 |       if (msg.text().includes('"phase":"request"')) mark("request");
  124 |       if (msg.text().includes('"phase":"success"')) mark("success");
  125 |     });
  126 | 
  127 |     await page.goto("/explore");
  128 |     const ready = await waitExploreFeedReady(page, 60_000);
  129 |     if (ready.state !== "scroll") {
  130 |       test.skip(true, "Populated feed required for pagination");
  131 |       return;
  132 |     }
  133 | 
  134 |     const bootCount = await page.locator("[data-explore-slide]").count();
  135 |     mark("threshold");
  136 |     await scrollFeedNearEnd(page, bootCount);
  137 |     await expect(async () => {
  138 |       expect(marks.some(m => m.label === "request")).toBeTruthy();
  139 |     }).toPass({ timeout: 5_000 });
  140 | 
  141 |     const finalOldIndex = bootCount - 1;
  142 |     await scrollFeedToIndex(page, finalOldIndex);
  143 |     mark("reached_final_old");
  144 | 
  145 |     await expect(async () => {
  146 |       const count = await page.locator("[data-explore-slide]").count();
  147 |       expect(count).toBeGreaterThan(bootCount);
  148 |     }).toPass({ timeout: 120_000 });
  149 |     mark("append");
  150 | 
  151 |     const t0 = marks.find(m => m.label === "threshold")!.t;
  152 |     const tReq = marks.find(m => m.label === "request")!.t;
  153 |     const tEnd = marks.find(m => m.label === "reached_final_old")!.t;
  154 |     const tAppend = marks.find(m => m.label === "append")!.t;
  155 |     expect(tReq - t0).toBeLessThan(2_000);
  156 |     // Bounded pagination deadline — must not approach legacy ~60s stack.
  157 |     expect(tAppend - tReq).toBeLessThan(40_000);
  158 |     // Recoverable wait is acceptable; silent dead end is not.
  159 |     expect(tAppend).toBeGreaterThan(tReq);
  160 |     console.info(
  161 |       JSON.stringify({
  162 |         event: "pag_fast_scroll",
  163 |         thresholdToRequestMs: tReq - t0,
  164 |         thresholdToFinalOldMs: tEnd - t0,
  165 |         requestToAppendMs: tAppend - tReq,
  166 |         classification:
  167 |           tAppend - tReq < 3_000 ? "seamless" : "recoverable_visible_wait",
  168 |       })
  169 |     );
  170 |   });
  171 | 
  172 |   test("stale continuation is not appended after filter change", async ({
  173 |     page,
  174 |   }) => {
  175 |     test.setTimeout(180_000);
  176 |     await page.goto("/explore");
  177 |     const ready = await waitExploreFeedReady(page, 60_000);
  178 |     if (ready.state !== "scroll") {
  179 |       test.skip(true, "Populated feed required for pagination");
  180 |       return;
  181 |     }
  182 | 
  183 |     const bootCount = await page.locator("[data-explore-slide]").count();
  184 |     await scrollFeedNearEnd(page, bootCount);
  185 | 
  186 |     // Change filter while continuation may be in flight.
  187 |     await page
  188 |       .getByTestId("explore-filters-open")
  189 |       .click({ timeout: 10_000 })
  190 |       .catch(async () => {
  191 |         await page.getByRole("button", { name: /Open filters/i }).click();
  192 |       });
  193 |     const comedy = page.getByRole("button", { name: /^Comedy$/i }).first();
  194 |     if (await comedy.isVisible({ timeout: 5_000 }).catch(() => false)) {
  195 |       await comedy.click();
```