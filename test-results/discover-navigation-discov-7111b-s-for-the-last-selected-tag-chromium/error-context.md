# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: discover-navigation.spec.ts >> discover navigation >> rapid tag switch shows results for the last selected tag
- Location: e2e\discover-navigation.spec.ts:97:7

# Error details

```
Error: locator.click: Error: strict mode violation: getByRole('button', { name: 'Comedy', exact: true }) resolved to 2 elements:
    1) <button type="button" class="cursor-pointer rounded-md bg-gray-200 px-2 py-0.5 text-xs hover:bg-black hover:text-white">Comedy</button> aka locator('form').getByRole('button', { name: 'Comedy' })
    2) <button type="button" class="rounded-md px-2 py-1 text-xs shrink-0 cursor-pointer hover:bg-black hover:text-white bg-gray-200">Comedy</button> aka getByRole('button', { name: 'Comedy' }).nth(1)

Call log:
  - waiting for getByRole('button', { name: 'Comedy', exact: true })

```

# Page snapshot

```yaml
- generic [ref=e1]:
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
            - button "Not signed in" [ref=e29]:
                - img [ref=e31]
                - generic [ref=e34]: Not signed in
        - generic [ref=e35]:
            - generic [ref=e36]:
                - paragraph [ref=e37]: Discover is also available as a quick panel while you watch the feed.
                - button "Open discover panel" [ref=e38] [cursor=pointer]
            - generic [ref=e39]:
                - heading "Discover contents" [level=2] [ref=e40]
                - generic [ref=e42]:
                    - generic [ref=e43]:
                        - generic [ref=e44]:
                            - textbox "Search discovery catalogue" [ref=e45]:
                                - /placeholder: Search...
                            - img [ref=e46]
                        - button "Open bookmarks" [ref=e49]:
                            - img [ref=e50]
                    - paragraph [ref=e52]:
                        - text: Looking for an event?
                        - link "Find Event here" [ref=e53] [cursor=pointer]:
                            - /url: /join
                    - generic [ref=e55]:
                        - generic [ref=e56]: Trending
                        - button "Live" [ref=e57] [cursor=pointer]
                        - button "Comedy" [ref=e58] [cursor=pointer]
                        - button "Music" [ref=e59] [cursor=pointer]
                        - button "Sports" [ref=e60] [cursor=pointer]
                        - button "Community" [ref=e61] [cursor=pointer]
                        - button "TV program" [ref=e62] [cursor=pointer]
                - generic [ref=e63]:
                    - button "Concert" [active] [ref=e64] [cursor=pointer]
                    - button "Drama" [ref=e65] [cursor=pointer]
                    - button "Festival" [ref=e66] [cursor=pointer]
                    - button "Food" [ref=e67] [cursor=pointer]
                    - button "Hangout" [ref=e68] [cursor=pointer]
                    - button "Islamic" [ref=e69] [cursor=pointer]
                    - button "Christian" [ref=e70] [cursor=pointer]
                    - button "Corporate" [ref=e71] [cursor=pointer]
                    - button "Comedy" [ref=e72] [cursor=pointer]
                    - button "Fashion" [ref=e73] [cursor=pointer]
                    - button "Game & sport" [ref=e74] [cursor=pointer]
                    - button "Children" [ref=e75] [cursor=pointer]
                    - button "Education" [ref=e76] [cursor=pointer]
                    - button "Other" [ref=e77] [cursor=pointer]
                - generic [ref=e78]:
                    - generic [ref=e79]:
                        - heading "Results for 'Concert'" [level=5] [ref=e80]
                        - paragraph [ref=e81]: Loading…
                    - generic [ref=e82]:
                        - generic [ref=e83]:
                            - heading "Top contents" [level=5] [ref=e85]
                            - paragraph [ref=e86]: Editorially featured
                        - button [ref=e105] [cursor=pointer]:
                            - img [ref=e106]
                    - generic [ref=e108]:
                        - generic [ref=e109]:
                            - heading "Latest contents" [level=5] [ref=e111]
                            - paragraph [ref=e112]: Newest uploads, by date added
                        - button [ref=e133] [cursor=pointer]:
                            - img [ref=e134]
                    - generic [ref=e136]:
                        - generic [ref=e137]:
                            - heading "Spotlight" [level=5] [ref=e139]
                            - paragraph [ref=e140]: Trending by views, tips, and saves (updates every ~5 min)
                        - button [ref=e161] [cursor=pointer]:
                            - img [ref=e162]
                    - generic [ref=e164]:
                        - generic [ref=e165]:
                            - heading "Recommended for you" [level=5] [ref=e167]
                            - paragraph [ref=e168]: Popular saves and recency
                        - button [ref=e189] [cursor=pointer]:
                            - img [ref=e190]
                    - generic [ref=e193]:
                        - heading "Programs" [level=5] [ref=e195]
                        - paragraph [ref=e196]: Scheduled TV programs
                    - generic [ref=e218]:
                        - heading "Live streams" [level=5] [ref=e220]
                        - paragraph [ref=e221]: Opens in the creator's event room
                    - generic [ref=e242]:
                        - generic [ref=e243]:
                            - heading "Most tipped contents" [level=5] [ref=e245]
                            - paragraph [ref=e246]: Highest tip counts
                        - button [ref=e265]:
                            - img [ref=e266]
                    - heading "Top tippers" [level=5] [ref=e269]
```

# Test source

```ts
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
  78  |     await expect(page.getByTestId("explore-feed-scroll")).toBeAttached();
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
> 116 |     await comedyTag.click();
      |                     ^ Error: locator.click: Error: strict mode violation: getByRole('button', { name: 'Comedy', exact: true }) resolved to 2 elements:
  117 |
  118 |     await expect(page.getByText("Results for 'Comedy'")).toBeVisible({
  119 |       timeout: 30_000,
  120 |     });
  121 |     await expect(page.getByText("Results for 'Concert'")).not.toBeVisible();
  122 |   });
  123 | });
  124 |
```
