# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: explore-url-history.spec.ts >> explore URL history >> feedTab=tv deep link shows TV surface with mounted feed shell
- Location: e2e\explore-url-history.spec.ts:85:7

# Error details

```
Test timeout of 90000ms exceeded.
```

```
Error: page.goto: Test timeout of 90000ms exceeded.
Call log:
  - navigating to "http://127.0.0.1:3000/explore?feedTab=tv", waiting until "load"

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
          - generic [ref=e14]: "11"
          - generic [ref=e15]: "12"
        - generic [ref=e16]:
          - text: Issue
          - generic [ref=e17]: s
      - button "Collapse issues badge" [ref=e18]:
        - img [ref=e19]
  - alert [ref=e21]
  - generic [ref=e22]:
    - region "Top contents" [ref=e23]:
      - heading "Top contents" [level=2] [ref=e24]
      - paragraph [ref=e25]: Editorially featured
      - list [ref=e26]:
        - listitem [ref=e27]:
          - link "hello" [ref=e28] [cursor=pointer]:
            - /url: http://localhost:3000/content/8a10de58-70c6-4623-a4e4-0af4322cda97?v=4cc03c89-9e78-487b-ac10-4f1c359667d5
        - listitem [ref=e29]:
          - link "Live Stream" [ref=e30] [cursor=pointer]:
            - /url: http://localhost:3000/content/b5b6d719-bfa4-4b8b-b781-414f342a84b0?v=22d58b67-0c8f-4dd0-bb05-d9d39bc4d5ae
        - listitem [ref=e31]:
          - link "Tipmanna & Bseen - Product Showcase" [ref=e32] [cursor=pointer]:
            - /url: http://localhost:3000/content/3d01ef9d-3993-408b-88bf-e0ea6ce0944b?v=5959dba8-9c51-4d70-9c5d-067d0bcf04c3
        - listitem [ref=e33]:
          - link "Intro to Showcase" [ref=e34] [cursor=pointer]:
            - /url: http://localhost:3000/content/3d01ef9d-3993-408b-88bf-e0ea6ce0944b?v=bb10fbef-55b3-44e0-b993-5716603a8c44
    - region "Latest contents" [ref=e35]:
      - heading "Latest contents" [level=2] [ref=e36]
      - paragraph [ref=e37]: Newest uploads, by date added
      - list [ref=e38]:
        - listitem [ref=e39]:
          - link "Messi Saves Arg" [ref=e40] [cursor=pointer]:
            - /url: http://localhost:3000/content/9bccd66b-387a-46bf-8789-8d8c17c7a389?v=8f04ecdc-5779-493f-b914-ba7734f7c119
        - listitem [ref=e41]:
          - link "Daily Dose of Football" [ref=e42] [cursor=pointer]:
            - /url: http://localhost:3000/content/e4c40d62-de30-456c-9543-3a06be6f70ee?v=fc25fcac-2181-44db-98ec-2d6be58fda07
        - listitem [ref=e43]:
          - link "Norway vs Senegal" [ref=e44] [cursor=pointer]:
            - /url: http://localhost:3000/content/0e92c442-648c-4423-9227-278531885a44?v=63f8d340-19d8-4fcc-a6e2-300ad938c079
        - listitem [ref=e45]:
          - link "GM Chess Lessons" [ref=e46] [cursor=pointer]:
            - /url: http://localhost:3000/content/0569fd21-08cd-4edc-bd50-2c2cb8986698?v=64c0d060-f64a-4eca-904f-ef66de0235bc
        - listitem [ref=e47]:
          - link "2ttee remix videoo" [ref=e48] [cursor=pointer]:
            - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=4adcecc8-6e0c-4722-8540-5ea5b09886c1
        - listitem [ref=e49]:
          - link "Tipmanna Bseen Showcase" [ref=e50] [cursor=pointer]:
            - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=efeebee0-c831-4ad0-afb6-abd73dc55220
        - listitem [ref=e51]:
          - link "2ttee talks his music journey" [ref=e52] [cursor=pointer]:
            - /url: http://localhost:3000/content/f39609be-4a93-4eca-9b0c-3454b3fc2663?v=9144020c-c666-47b9-801b-38ab9a571def
        - listitem [ref=e53]:
          - link "Kobbie mannoo" [ref=e54] [cursor=pointer]:
            - /url: http://localhost:3000/content/302b6dda-02ab-49ff-9bed-1e8f9378557c?v=9ff5bba1-50f4-4bc4-b92c-eb1f2e2b6e75
        - listitem [ref=e55]:
          - link "Crazy nine goal thriller" [ref=e56] [cursor=pointer]:
            - /url: http://localhost:3000/content/302b6dda-02ab-49ff-9bed-1e8f9378557c?v=5c22d5ec-34a5-443a-8c22-b27c230cd667
        - listitem [ref=e57]:
          - link "All goals scored in the champions league" [ref=e58] [cursor=pointer]:
            - /url: http://localhost:3000/content/302b6dda-02ab-49ff-9bed-1e8f9378557c?v=57558a0d-3546-42fc-b505-6bca3f41767f
        - listitem [ref=e59]:
          - link "Saka sends arsenal to the champions league final" [ref=e60] [cursor=pointer]:
            - /url: http://localhost:3000/content/302b6dda-02ab-49ff-9bed-1e8f9378557c?v=875961c7-0a46-46e8-9af5-55d124cb6a2b
        - listitem [ref=e61]:
          - link "PSG eliminates bayern" [ref=e62] [cursor=pointer]:
            - /url: http://localhost:3000/content/302b6dda-02ab-49ff-9bed-1e8f9378557c?v=7b9f8358-2eea-4be0-8c48-7ad4b73bed1d
    - region "Spotlight" [ref=e63]:
      - heading "Spotlight" [level=2] [ref=e64]
      - paragraph [ref=e65]: Trending by views, tips, and saves (updates every ~5 min)
      - list [ref=e66]:
        - listitem [ref=e67]:
          - link "Tipmanna Bseen Showcase" [ref=e68] [cursor=pointer]:
            - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=efeebee0-c831-4ad0-afb6-abd73dc55220
        - listitem [ref=e69]:
          - link "3 potatoes and 2 eggs" [ref=e70] [cursor=pointer]:
            - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=a6e84710-2eee-4063-bfea-39b99505cd68
        - listitem [ref=e71]:
          - link "2ttee remix videoo" [ref=e72] [cursor=pointer]:
            - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=4adcecc8-6e0c-4722-8540-5ea5b09886c1
        - listitem [ref=e73]:
          - link "Lionel Messi 50+ moments" [ref=e74] [cursor=pointer]:
            - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=651e8030-d6f9-432c-8047-27dabbe359a9
        - listitem [ref=e75]:
          - link "Live Stream" [ref=e76] [cursor=pointer]:
            - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=85ec40a3-0a8c-47ea-829a-7a50f403a0f1
        - listitem [ref=e77]:
          - link "Food Tour" [ref=e78] [cursor=pointer]:
            - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=f7e7e96a-0705-4723-b892-1aeda8f1221f
        - listitem [ref=e79]:
          - link "Food Ready in 5 minutes" [ref=e80] [cursor=pointer]:
            - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=906153c3-c272-44cf-b205-d62a14ab0b5f
        - listitem [ref=e81]:
          - link "How to cook a perfect steak every time" [ref=e82] [cursor=pointer]:
            - /url: http://localhost:3000/content/688aa82e-1267-4e6c-b514-3cf874548fa4?v=4053b423-1ff8-4c58-aa4c-171351013cfb
        - listitem [ref=e83]:
          - link "The best burger recipe" [ref=e84] [cursor=pointer]:
            - /url: http://localhost:3000/content/688aa82e-1267-4e6c-b514-3cf874548fa4?v=11c306fc-00cb-4a9b-ba66-53dfd68c41bc
        - listitem [ref=e85]:
          - link "Final Games 3" [ref=e86] [cursor=pointer]:
            - /url: http://localhost:3000/content/b5b6d719-bfa4-4b8b-b781-414f342a84b0?v=3c00d3e3-2c89-4903-ba3e-0d8e5de853b6
        - listitem [ref=e87]:
          - link "Magnus Carlsen vs Hikaru Nakamura" [ref=e88] [cursor=pointer]:
            - /url: http://localhost:3000/content/b5b6d719-bfa4-4b8b-b781-414f342a84b0?v=7a2f0a7a-a693-4c0d-bc22-22c03f750820
        - listitem [ref=e89]:
          - link "Live Stream" [ref=e90] [cursor=pointer]:
            - /url: http://localhost:3000/content/b5b6d719-bfa4-4b8b-b781-414f342a84b0?v=22d58b67-0c8f-4dd0-bb05-d9d39bc4d5ae
    - region "Recommended for you" [ref=e91]:
      - heading "Recommended for you" [level=2] [ref=e92]
      - paragraph [ref=e93]: Popular saves and recency
      - list [ref=e94]:
        - listitem [ref=e95]:
          - link "3 potatoes and 2 eggs" [ref=e96] [cursor=pointer]:
            - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=a6e84710-2eee-4063-bfea-39b99505cd68
        - listitem [ref=e97]:
          - link "Lionel Messi 50+ moments" [ref=e98] [cursor=pointer]:
            - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=651e8030-d6f9-432c-8047-27dabbe359a9
        - listitem [ref=e99]:
          - link "Live Stream" [ref=e100] [cursor=pointer]:
            - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=85ec40a3-0a8c-47ea-829a-7a50f403a0f1
        - listitem [ref=e101]:
          - link "Tipmanna Bseen Showcase" [ref=e102] [cursor=pointer]:
            - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=efeebee0-c831-4ad0-afb6-abd73dc55220
        - listitem [ref=e103]:
          - link "2ttee remix videoo" [ref=e104] [cursor=pointer]:
            - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=4adcecc8-6e0c-4722-8540-5ea5b09886c1
        - listitem [ref=e105]:
          - link "Food Tour" [ref=e106] [cursor=pointer]:
            - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=f7e7e96a-0705-4723-b892-1aeda8f1221f
        - listitem [ref=e107]:
          - link "Food Ready in 5 minutes" [ref=e108] [cursor=pointer]:
            - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=906153c3-c272-44cf-b205-d62a14ab0b5f
        - listitem [ref=e109]:
          - link "How to cook a perfect steak every time" [ref=e110] [cursor=pointer]:
            - /url: http://localhost:3000/content/688aa82e-1267-4e6c-b514-3cf874548fa4?v=4053b423-1ff8-4c58-aa4c-171351013cfb
        - listitem [ref=e111]:
          - link "The best burger recipe" [ref=e112] [cursor=pointer]:
            - /url: http://localhost:3000/content/688aa82e-1267-4e6c-b514-3cf874548fa4?v=11c306fc-00cb-4a9b-ba66-53dfd68c41bc
        - listitem [ref=e113]:
          - link "Final Games 3" [ref=e114] [cursor=pointer]:
            - /url: http://localhost:3000/content/b5b6d719-bfa4-4b8b-b781-414f342a84b0?v=3c00d3e3-2c89-4903-ba3e-0d8e5de853b6
        - listitem [ref=e115]:
          - link "Live Stream" [ref=e116] [cursor=pointer]:
            - /url: http://localhost:3000/content/b5b6d719-bfa4-4b8b-b781-414f342a84b0?v=22d58b67-0c8f-4dd0-bb05-d9d39bc4d5ae
        - listitem [ref=e117]:
          - link "Magnus Carlsen vs Hikaru Nakamura" [ref=e118] [cursor=pointer]:
            - /url: http://localhost:3000/content/b5b6d719-bfa4-4b8b-b781-414f342a84b0?v=7a2f0a7a-a693-4c0d-bc22-22c03f750820
    - region "Most tipped" [ref=e119]:
      - heading "Most tipped" [level=2] [ref=e120]
      - paragraph [ref=e121]: Highest tip counts
      - list [ref=e122]:
        - listitem [ref=e123]:
          - link "Live Stream" [ref=e124] [cursor=pointer]:
            - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=85ec40a3-0a8c-47ea-829a-7a50f403a0f1
        - listitem [ref=e125]:
          - link "Lionel Messi 50+ moments" [ref=e126] [cursor=pointer]:
            - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=651e8030-d6f9-432c-8047-27dabbe359a9
        - listitem [ref=e127]:
          - link "Food Ready in 5 minutes" [ref=e128] [cursor=pointer]:
            - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=906153c3-c272-44cf-b205-d62a14ab0b5f
        - listitem [ref=e129]:
          - link "2ttee remix videoo" [ref=e130] [cursor=pointer]:
            - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=4adcecc8-6e0c-4722-8540-5ea5b09886c1
        - listitem [ref=e131]:
          - link "Tipmanna Bseen Showcase" [ref=e132] [cursor=pointer]:
            - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=efeebee0-c831-4ad0-afb6-abd73dc55220
        - listitem [ref=e133]:
          - link "3 potatoes and 2 eggs" [ref=e134] [cursor=pointer]:
            - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=a6e84710-2eee-4063-bfea-39b99505cd68
        - listitem [ref=e135]:
          - link "Food Tour" [ref=e136] [cursor=pointer]:
            - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=f7e7e96a-0705-4723-b892-1aeda8f1221f
        - listitem [ref=e137]:
          - link "The best burger recipe" [ref=e138] [cursor=pointer]:
            - /url: http://localhost:3000/content/688aa82e-1267-4e6c-b514-3cf874548fa4?v=11c306fc-00cb-4a9b-ba66-53dfd68c41bc
        - listitem [ref=e139]:
          - link "How to cook a perfect steak every time" [ref=e140] [cursor=pointer]:
            - /url: http://localhost:3000/content/688aa82e-1267-4e6c-b514-3cf874548fa4?v=4053b423-1ff8-4c58-aa4c-171351013cfb
        - listitem [ref=e141]:
          - link "Live Stream" [ref=e142] [cursor=pointer]:
            - /url: http://localhost:3000/content/b5b6d719-bfa4-4b8b-b781-414f342a84b0?v=22d58b67-0c8f-4dd0-bb05-d9d39bc4d5ae
    - region "Programs" [ref=e143]:
      - heading "Programs" [level=2] [ref=e144]
      - paragraph [ref=e145]: Scheduled TV programs
      - list
    - region "Live streams" [ref=e146]:
      - heading "Live streams" [level=2] [ref=e147]
      - paragraph [ref=e148]: Opens in the creator's event room
      - list [ref=e149]:
        - listitem [ref=e150]:
          - link "Messi magic sets up win" [ref=e151] [cursor=pointer]:
            - /url: /channel/302b6dda-02ab-49ff-9bed-1e8f9378557c
        - listitem [ref=e152]:
          - link "Cold play - A sky full of stars" [ref=e153] [cursor=pointer]:
            - /url: /channel/f8f5c071-e10d-4b5e-811b-662038b69693
        - listitem [ref=e154]:
          - link "Tipmanna Bseen Showcase" [ref=e155] [cursor=pointer]:
            - /url: /channel/95970621-c9b6-456c-8c9b-5bf19867b788
        - listitem [ref=e156]:
          - link "Tipmanna & Bseen - Product Showcase" [ref=e157] [cursor=pointer]:
            - /url: /channel/3d01ef9d-3993-408b-88bf-e0ea6ce0944b
        - listitem [ref=e158]:
          - link "Live Stream" [ref=e159] [cursor=pointer]:
            - /url: /channel/f8f5c071-e10d-4b5e-811b-662038b69693
    - region "Top tippers" [ref=e160]:
      - heading "Top tippers" [level=2] [ref=e161]
      - list [ref=e162]:
        - listitem [ref=e163]: annetterobinson226
        - listitem [ref=e164]: emediong5135
        - listitem [ref=e165]: taiwo2ttee
        - listitem [ref=e166]: Telepsecompany
        - listitem [ref=e167]: ava
        - listitem [ref=e168]: aishapatel1912
        - listitem [ref=e169]: caleb.parker374
        - listitem [ref=e170]: xavier.scott523
        - listitem [ref=e171]: lasker1896
        - listitem [ref=e172]: charlottequinn0897
    - region "Top communities" [ref=e173]:
      - heading "Top communities" [level=2] [ref=e174]
      - list [ref=e175]:
        - listitem [ref=e176]:
          - link "Tipmanna Public" [ref=e177] [cursor=pointer]:
            - /url: /explore?tab=join&joinCommunity=bcc0090d-826c-444d-9689-300c354d0460
        - listitem [ref=e178]:
          - link "Emediong Community" [ref=e179] [cursor=pointer]:
            - /url: /explore?tab=join&joinCommunity=588a3682-c0c8-4284-b466-bd3e4a43b801
        - listitem [ref=e180]:
          - link "Caleb Community" [ref=e181] [cursor=pointer]:
            - /url: /explore?tab=join&joinCommunity=63898415-b24f-448d-aa55-ca073a8ba950
  - generic [ref=e182]:
    - banner [ref=e183]:
      - heading "Tipmanna TV — Explore and discover community media" [level=1] [ref=e184]
      - link "tipmanna" [ref=e186] [cursor=pointer]:
        - /url: /explore
      - generic [ref=e188]:
        - button "Open discover search" [ref=e189]:
          - textbox "Search videos..." [ref=e190]
          - img [ref=e191]
        - generic [ref=e196]: 0 watching live
    - generic [ref=e198]:
      - generic [ref=e199]:
        - button [ref=e200]:
          - img [ref=e201]
        - generic [ref=e202]: Create
      - button "Feed" [ref=e203]
      - button "Start Community" [ref=e204]
      - button "1 Not signed in" [ref=e205]:
        - generic [ref=e206]:
          - img [ref=e207]
          - generic [ref=e210]: "1"
        - generic [ref=e211]: Not signed in
    - generic [ref=e212]:
      - generic [ref=e214]:
        - generic [ref=e215]:
          - generic [ref=e216]:
            - button "Trends" [ref=e217]
            - button "Saves" [ref=e218]
            - button "TV" [ref=e219]
            - button "Community" [ref=e220]
          - button "My Communities" [ref=e222] [cursor=pointer]:
            - generic [ref=e223]: My Communities
        - button "Open filters" [ref=e224]:
          - img [ref=e225]
      - generic [ref=e228]:
        - img [ref=e229]
        - text: Loading TV guide…
```

# Test source

```ts
  1   | import { test, expect } from "@playwright/test";
  2   | 
  3   | test.describe("explore URL history", () => {
  4   |   test("filter change updates URL and browser back restores prior filter", async ({
  5   |     page,
  6   |   }) => {
  7   |     await page.goto("/explore");
  8   |     await expect(
  9   |       page
  10  |         .getByTestId("explore-feed-scroll")
  11  |         .or(page.getByText(/no clips available|sign in to browse/i))
  12  |         .first()
  13  |     ).toBeVisible({ timeout: 45_000 });
  14  | 
  15  |     const filterToggle = page
  16  |       .getByRole("button", { name: /open filters|close filters/i })
  17  |       .first();
  18  |     if (
  19  |       !(await filterToggle.isVisible({ timeout: 5_000 }).catch(() => false))
  20  |     ) {
  21  |       test.skip(true, "Filter UI not visible in this environment");
  22  |       return;
  23  |     }
  24  |     await filterToggle.click();
  25  | 
  26  |     const comedyFilter = page
  27  |       .getByTestId("explore-filter-type")
  28  |       .filter({ hasText: "Comedy" });
  29  |     if (!(await comedyFilter.isVisible({ timeout: 5_000 }).catch(() => false))) {
  30  |       test.skip(true, "Comedy filter chip not available");
  31  |       return;
  32  |     }
  33  | 
  34  |     await comedyFilter.click();
  35  |     await expect(page).toHaveURL(/feedTypes=.*COMEDY/i, { timeout: 10_000 });
  36  |     const urlAfterFilter = page.url();
  37  | 
  38  |     await page.goBack();
  39  |     await expect
  40  |       .poll(() => page.url(), { timeout: 10_000 })
  41  |       .not.toBe(urlAfterFilter);
  42  | 
  43  |     await page.goForward();
  44  |     await expect(page).toHaveURL(/feedTypes=.*COMEDY/i, { timeout: 10_000 });
  45  |     await expect(comedyFilter).toHaveClass(/border-primary/);
  46  |   });
  47  | 
  48  |   test("saves sub-tab survives browser back and forward", async ({ page }) => {
  49  |     await page.goto("/explore");
  50  |     await expect(
  51  |       page
  52  |         .getByTestId("explore-feed-scroll")
  53  |         .or(page.getByText(/no clips available|sign in to browse/i))
  54  |         .first()
  55  |     ).toBeVisible({ timeout: 45_000 });
  56  | 
  57  |     await page.getByRole("button", { name: "Saves" }).click();
  58  |     await expect(page).toHaveURL(/feedTab=saves/, { timeout: 10_000 });
  59  |     const savesUrl = page.url();
  60  | 
  61  |     await page.getByRole("button", { name: "Trends" }).click();
  62  |     await expect(page).toHaveURL(/feedTab=trends/, { timeout: 10_000 });
  63  | 
  64  |     await page.goBack();
  65  |     await expect(page).toHaveURL(/feedTab=saves/, { timeout: 10_000 });
  66  |     await expect(page.getByRole("button", { name: "Saves" })).toHaveClass(
  67  |       /bg-white/,
  68  |       { timeout: 10_000 }
  69  |     );
  70  | 
  71  |     await page.goForward();
  72  |     await expect
  73  |       .poll(() => page.url(), { timeout: 10_000 })
  74  |       .not.toBe(savesUrl);
  75  |   });
  76  | 
  77  |   test("feedTab deep link hydrates saves sub-tab", async ({ page }) => {
  78  |     await page.goto("/explore?feedTab=saves");
  79  |     await expect(page.getByRole("button", { name: "Saves" })).toHaveClass(
  80  |       /bg-white/,
  81  |       { timeout: 15_000 }
  82  |     );
  83  |   });
  84  | 
  85  |   test("feedTab=tv deep link shows TV surface with mounted feed shell", async ({
  86  |     page,
  87  |   }) => {
> 88  |     await page.goto("/explore?feedTab=tv");
      |                ^ Error: page.goto: Test timeout of 90000ms exceeded.
  89  |     await expect(page.getByRole("button", { name: "TV" })).toHaveClass(
  90  |       /bg-white/,
  91  |       { timeout: 15_000 }
  92  |     );
  93  |     await expect(page.getByTestId("explore-feed-shell")).toBeAttached();
  94  |     await expect(page.getByTestId("explore-feed-shell")).toHaveClass(/hidden/);
  95  |   });
  96  | 
  97  |   test("feedTab tv back forward restores sub-tab", async ({ page }) => {
  98  |     await page.goto("/explore");
  99  |     await expect(
  100 |       page
  101 |         .getByTestId("explore-feed-scroll")
  102 |         .or(page.getByText(/no clips available|sign in to browse/i))
  103 |         .first()
  104 |     ).toBeVisible({ timeout: 45_000 });
  105 | 
  106 |     await page.getByRole("button", { name: "TV" }).click();
  107 |     await expect(page).toHaveURL(/feedTab=tv/, { timeout: 10_000 });
  108 | 
  109 |     await page.getByRole("button", { name: "Trends" }).click();
  110 |     await expect(page).toHaveURL(/feedTab=trends/, { timeout: 10_000 });
  111 | 
  112 |     await page.goBack();
  113 |     await expect(page).toHaveURL(/feedTab=tv/, { timeout: 10_000 });
  114 |     await expect(page.getByRole("button", { name: "TV" })).toHaveClass(
  115 |       /bg-white/,
  116 |       { timeout: 10_000 }
  117 |     );
  118 | 
  119 |     await page.goForward();
  120 |     await expect(page).toHaveURL(/feedTab=trends/, { timeout: 10_000 });
  121 |   });
  122 | });
  123 | 
```