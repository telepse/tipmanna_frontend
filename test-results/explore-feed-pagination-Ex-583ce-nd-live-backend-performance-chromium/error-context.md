# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: explore-feed-pagination.spec.ts >> Explore feed pagination >> fast-scroll near-end live-backend performance
- Location: e2e\explore-feed-pagination.spec.ts:132:7

# Error details

```
Error: expect(received).toBeLessThan(expected)

Expected: < 40000
Received:   44860
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
                - button "Open Discover panel" [ref=e8] [cursor=pointer]:
                    - img [ref=e9]
            - generic [ref=e12]:
                - button "Open discover search" [ref=e13]:
                    - textbox "Search videos..." [ref=e14]
                    - img [ref=e15]
                - generic [ref=e20]: 3 watching live
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
                    - text: Vice President ..
                    - button "Open comments" [ref=e57]:
                        - img [ref=e58]
                - generic [ref=e62]:
                    - text: 2ttee talks his..
                    - button "Open comments" [ref=e63]:
                        - img [ref=e64]
                - generic [ref=e68]: USA vs Belgium
                - generic [ref=e71]:
                    - text: Columbia vs Fra..
                    - button "Open comments" [ref=e72]:
                        - img [ref=e73]
                - generic [ref=e77]:
                    - text: Vinicius - Japa..
                    - button "Open comments" [ref=e78]:
                        - img [ref=e79]
                - generic [ref=e83]: Live Stream
                - generic [ref=e86]:
                    - text: Brazil vs Argen..
                    - button "Open comments" [ref=e87]:
                        - img [ref=e88]
                - generic [ref=e90]:
                    - generic [ref=e93]:
                        - generic:
                            - img
                            - text: Live stream · Completed
                        - iframe [ref=e97]:
                            - generic [active] [ref=f3e1]:
                                - generic "YouTube Video Player" [ref=f3e3]
                                - button "Show player controls" [ref=f3e7] [cursor=pointer]
                    - generic [ref=e98]:
                        - generic [ref=e99]:
                            - button "Unmute" [ref=e100] [cursor=pointer]:
                                - img [ref=e101]
                            - generic [ref=e105]: Cold play - A sky full of star
                            - text: ..
                            - button "Open comments" [ref=e106] [cursor=pointer]:
                                - img [ref=e107]
                        - paragraph [ref=e109]:
                            - text: 0 saves · 2 shares · 0 comments ·
                            - generic [ref=e110]:
                                - img [ref=e111]
                                - text: 5 seen
                    - generic [ref=e115]:
                        - button "Save video" [ref=e116] [cursor=pointer]:
                            - img [ref=e117]
                        - button "Share" [ref=e120] [cursor=pointer]:
                            - img [ref=e121]
                        - button [ref=e127] [cursor=pointer]:
                            - img [ref=e128]
                    - generic [ref=e130]:
                        - button "0 tips" [ref=e131] [cursor=pointer]
                        - generic [ref=e132]:
                            - img "Black Diamond"
                    - generic [ref=e135]:
                        - button "Create video" [ref=e136] [cursor=pointer]:
                            - img
                        - generic [ref=e137]:
                            - button "Watch TV" [ref=e138] [cursor=pointer]
                            - button "Engage" [ref=e139] [cursor=pointer]
                        - button "Comments" [ref=e140] [cursor=pointer]:
                            - img
                - generic [ref=e144]:
                    - generic:
                        - img
                        - text: Live stream · Completed
                    - iframe [ref=e148]:
                        - generic [active] [ref=f5e1]:
                            - generic "YouTube Video Player" [ref=f5e3]
                            - generic [ref=f5e5]:
                                - generic:
                                    - generic:
                                        - button "Play video" [ref=f5e10] [cursor=pointer]
                                        - button "Hide player controls" [ref=f5e12] [cursor=pointer]
                                        - generic [ref=f5e14]:
                                            - generic [ref=f5e19]:
                                                - generic [ref=f5e20]:
                                                    - link "Pete & Jen Hegseth on Family Values, Job Transition, & Military Readiness | KMP Ep. 17" [ref=f5e21] [cursor=pointer]:
                                                        - /url: https://www.youtube.com/watch?v=An1GvFEwQ3M
                                                    - link "Katie Miller Pod" [ref=f5e22] [cursor=pointer]:
                                                        - /url: /channel/UCO6CYYvDCcggyoqNE1nDWPQ
                                                        - generic [ref=f5e23]: Katie Miller Pod
                                                - generic [ref=f5e24]:
                                                    - button [ref=f5e25] [cursor=pointer]
                                                    - generic [ref=f5e27]:
                                                        - generic: Katie Miller Pod
                                                        - generic: 60K subscribers
                                            - generic [ref=f5e28]:
                                                - button "Copy link" [ref=f5e31] [cursor=pointer]:
                                                    - generic [ref=f5e35]:
                                                        - img
                                                - link "Watch on YouTube" [ref=f5e42] [cursor=pointer]:
                                                    - /url: https://www.youtube.com/watch?v=An1GvFEwQ3M
                                                    - generic [ref=f5e45]:
                                                        - text: Watch on
                                                        - img [ref=f5e47]:
                                                            - generic [ref=f5e49]:
                                                                - img
                - generic [ref=e151]:
                    - text: GM Chess Lesson..
                    - button "Open comments" [ref=e152]:
                        - img [ref=e153]
                - generic [ref=e157]:
                    - text: Norway vs Seneg..
                    - button "Open comments" [ref=e158]:
                        - img [ref=e159]
                - generic [ref=e163]: Live Stream
                - generic [ref=e166]:
                    - text: Dynamics - Fash..
                    - button "Open comments" [ref=e167]:
                        - img [ref=e168]
                - generic [ref=e172]:
                    - text: Japan vs Brazil..
                    - button "Open comments" [ref=e173]:
                        - img [ref=e174]
```

# Test source

```ts
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
  95  |       }).toPass({ timeout: 120_000 });
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
  115 |   test("fast-scroll near-end fixture trigger and append (deterministic)", async ({
  116 |     page,
  117 |   }) => {
  118 |     test.setTimeout(60_000);
  119 |     await page.goto("/explore?e2e=1");
  120 |     const ready = await waitExploreFeedReady(page, 60_000);
  121 |     expect(ready.state).toBe("scroll");
  122 |
  123 |     const bootCount = await page.locator("[data-explore-slide]").count();
  124 |     expect(bootCount).toBeGreaterThanOrEqual(4);
  125 |     await scrollFeedNearEnd(page, bootCount);
  126 |     await expect(async () => {
  127 |       const count = await page.locator("[data-explore-slide]").count();
  128 |       expect(count).toBeGreaterThan(bootCount);
  129 |     }).toPass({ timeout: 10_000 });
  130 |   });
  131 |
  132 |   test("fast-scroll near-end live-backend performance", async ({ page }) => {
  133 |     test.setTimeout(180_000);
  134 |     const marks: { label: string; t: number }[] = [];
  135 |     const mark = (label: string) => marks.push({ label, t: Date.now() });
  136 |
  137 |     page.on("console", msg => {
  138 |       if (msg.text().includes('"phase":"request"')) mark("request");
  139 |       if (msg.text().includes('"phase":"success"')) mark("success");
  140 |     });
  141 |
  142 |     await page.goto("/explore");
  143 |     const ready = await waitExploreFeedReady(page, 60_000);
  144 |     expect(ready.state).toBe("scroll");
  145 |
  146 |     const bootCount = await page.locator("[data-explore-slide]").count();
  147 |     mark("threshold");
  148 |     await scrollFeedNearEnd(page, bootCount);
  149 |     await expect(async () => {
  150 |       expect(marks.some(m => m.label === "request")).toBeTruthy();
  151 |     }).toPass({ timeout: 5_000 });
  152 |
  153 |     const finalOldIndex = bootCount - 1;
  154 |     await scrollFeedToIndex(page, finalOldIndex);
  155 |     mark("reached_final_old");
  156 |
  157 |     await expect(async () => {
  158 |       const count = await page.locator("[data-explore-slide]").count();
  159 |       expect(count).toBeGreaterThan(bootCount);
  160 |     }).toPass({ timeout: 120_000 });
  161 |     mark("append");
  162 |
  163 |     const t0 = marks.find(m => m.label === "threshold")!.t;
  164 |     const tReq = marks.find(m => m.label === "request")!.t;
  165 |     const tEnd = marks.find(m => m.label === "reached_final_old")!.t;
  166 |     const tAppend = marks.find(m => m.label === "append")!.t;
  167 |     expect(tReq - t0).toBeLessThan(2_000);
  168 |     // Bounded pagination deadline — must not approach legacy ~60s stack.
> 169 |     expect(tAppend - tReq).toBeLessThan(40_000);
      |                            ^ Error: expect(received).toBeLessThan(expected)
  170 |     // Recoverable wait is acceptable; silent dead end is not.
  171 |     expect(tAppend).toBeGreaterThan(tReq);
  172 |     console.info(
  173 |       JSON.stringify({
  174 |         event: "pag_fast_scroll",
  175 |         thresholdToRequestMs: tReq - t0,
  176 |         thresholdToFinalOldMs: tEnd - t0,
  177 |         requestToAppendMs: tAppend - tReq,
  178 |         classification:
  179 |           tAppend - tReq < 3_000 ? "seamless" : "recoverable_visible_wait",
  180 |       })
  181 |     );
  182 |   });
  183 |
  184 |   test("stale continuation is not appended after filter change", async ({
  185 |     page,
  186 |   }) => {
  187 |     test.setTimeout(180_000);
  188 |     await page.goto("/explore");
  189 |     const ready = await waitExploreFeedReady(page, 60_000);
  190 |     if (ready.state !== "scroll") {
  191 |       test.skip(true, "Populated feed required for pagination");
  192 |       return;
  193 |     }
  194 |
  195 |     const bootCount = await page.locator("[data-explore-slide]").count();
  196 |     await scrollFeedNearEnd(page, bootCount);
  197 |
  198 |     // Change filter while continuation may be in flight.
  199 |     await page
  200 |       .getByTestId("explore-filters-open")
  201 |       .click({ timeout: 10_000 })
  202 |       .catch(async () => {
  203 |         await page.getByRole("button", { name: /Open filters/i }).click();
  204 |       });
  205 |     const comedy = page.getByRole("button", { name: /^Comedy$/i }).first();
  206 |     if (await comedy.isVisible({ timeout: 5_000 }).catch(() => false)) {
  207 |       await comedy.click();
  208 |     }
  209 |
  210 |     await waitExploreFeedReady(page, 60_000);
  211 |     // After filter change, feed may reload; ensure no permanent spinner.
  212 |     await expect(page.getByTestId("explore-feed-skeleton")).not.toBeVisible({
  213 |       timeout: 30_000,
  214 |     });
  215 |     await expect(
  216 |       page
  217 |         .getByTestId("explore-feed-scroll")
  218 |         .or(page.getByText(/no clips available|sign in to browse/i))
  219 |         .first()
  220 |     ).toBeVisible({ timeout: 30_000 });
  221 |   });
  222 |
  223 |   test("stale continuation is not appended after sub-tab change", async ({
  224 |     page,
  225 |   }) => {
  226 |     test.setTimeout(180_000);
  227 |     await page.goto("/explore");
  228 |     const ready = await waitExploreFeedReady(page, 60_000);
  229 |     if (ready.state !== "scroll") {
  230 |       test.skip(true, "Populated feed required for pagination");
  231 |       return;
  232 |     }
  233 |
  234 |     const bootCount = await page.locator("[data-explore-slide]").count();
  235 |     await scrollFeedNearEnd(page, bootCount);
  236 |     await page.getByTestId("explore-subtab-saves").click();
  237 |     await expect
  238 |       .poll(
  239 |         () =>
  240 |           new URL(page.url(), "http://localhost").searchParams.get("feedTab"),
  241 |         { timeout: 8_000 }
  242 |       )
  243 |       .toBe("saves");
  244 |     await waitExploreFeedReady(page, 60_000);
  245 |     await expect(page.getByTestId("explore-feed-skeleton")).not.toBeVisible({
  246 |       timeout: 30_000,
  247 |     });
  248 |   });
  249 |
  250 |   test("visibility restore does not leave permanent spinner", async ({
  251 |     page,
  252 |   }) => {
  253 |     test.setTimeout(120_000);
  254 |     await page.goto("/explore");
  255 |     const ready = await waitExploreFeedReady(page, 60_000);
  256 |     if (ready.state !== "scroll") {
  257 |       test.skip(true, "Populated feed required for pagination");
  258 |       return;
  259 |     }
  260 |     const bootCount = await page.locator("[data-explore-slide]").count();
  261 |     await scrollFeedNearEnd(page, bootCount);
  262 |     await page.evaluate(() => {
  263 |       Object.defineProperty(document, "visibilityState", {
  264 |         configurable: true,
  265 |         get: () => "hidden",
  266 |       });
  267 |       document.dispatchEvent(new Event("visibilitychange"));
  268 |     });
  269 |     await page.waitForTimeout(500);
```
