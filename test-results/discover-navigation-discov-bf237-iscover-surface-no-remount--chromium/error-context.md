# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: discover-navigation.spec.ts >> discover navigation >> session shell keeps the feed mounted on the Discover surface (no remount)
- Location: e2e\discover-navigation.spec.ts:64:7

# Error details

```
Test timeout of 90000ms exceeded.
```

```
Error: page.goto: Test timeout of 90000ms exceeded.
Call log:
  - navigating to "http://127.0.0.1:3000/explore?tab=discover", waiting until "load"

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
          - generic [ref=e14]: "10"
          - generic [ref=e15]: "11"
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
          - link "Daily Dose of Football" [ref=e40] [cursor=pointer]:
            - /url: http://localhost:3000/content/e4c40d62-de30-456c-9543-3a06be6f70ee?v=fc25fcac-2181-44db-98ec-2d6be58fda07
        - listitem [ref=e41]:
          - link "Norway vs Senegal" [ref=e42] [cursor=pointer]:
            - /url: http://localhost:3000/content/0e92c442-648c-4423-9227-278531885a44?v=63f8d340-19d8-4fcc-a6e2-300ad938c079
        - listitem [ref=e43]:
          - link "GM Chess Lessons" [ref=e44] [cursor=pointer]:
            - /url: http://localhost:3000/content/0569fd21-08cd-4edc-bd50-2c2cb8986698?v=64c0d060-f64a-4eca-904f-ef66de0235bc
        - listitem [ref=e45]:
          - link "2ttee remix videoo" [ref=e46] [cursor=pointer]:
            - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=4adcecc8-6e0c-4722-8540-5ea5b09886c1
        - listitem [ref=e47]:
          - link "Tipmanna Bseen Showcase" [ref=e48] [cursor=pointer]:
            - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=efeebee0-c831-4ad0-afb6-abd73dc55220
        - listitem [ref=e49]:
          - link "2ttee talks his music journey" [ref=e50] [cursor=pointer]:
            - /url: http://localhost:3000/content/f39609be-4a93-4eca-9b0c-3454b3fc2663?v=9144020c-c666-47b9-801b-38ab9a571def
        - listitem [ref=e51]:
          - link "Kobbie mannoo" [ref=e52] [cursor=pointer]:
            - /url: http://localhost:3000/content/302b6dda-02ab-49ff-9bed-1e8f9378557c?v=9ff5bba1-50f4-4bc4-b92c-eb1f2e2b6e75
        - listitem [ref=e53]:
          - link "Crazy nine goal thriller" [ref=e54] [cursor=pointer]:
            - /url: http://localhost:3000/content/302b6dda-02ab-49ff-9bed-1e8f9378557c?v=5c22d5ec-34a5-443a-8c22-b27c230cd667
        - listitem [ref=e55]:
          - link "All goals scored in the champions league" [ref=e56] [cursor=pointer]:
            - /url: http://localhost:3000/content/302b6dda-02ab-49ff-9bed-1e8f9378557c?v=57558a0d-3546-42fc-b505-6bca3f41767f
        - listitem [ref=e57]:
          - link "Saka sends arsenal to the champions league final" [ref=e58] [cursor=pointer]:
            - /url: http://localhost:3000/content/302b6dda-02ab-49ff-9bed-1e8f9378557c?v=875961c7-0a46-46e8-9af5-55d124cb6a2b
        - listitem [ref=e59]:
          - link "PSG eliminates bayern" [ref=e60] [cursor=pointer]:
            - /url: http://localhost:3000/content/302b6dda-02ab-49ff-9bed-1e8f9378557c?v=7b9f8358-2eea-4be0-8c48-7ad4b73bed1d
        - listitem [ref=e61]:
          - link "Lionel Messi 50+ moments" [ref=e62] [cursor=pointer]:
            - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=651e8030-d6f9-432c-8047-27dabbe359a9
    - region "Spotlight" [ref=e63]:
      - heading "Spotlight" [level=2] [ref=e64]
      - paragraph [ref=e65]: Trending by views, tips, and saves (updates every ~5 min)
      - list [ref=e66]:
        - listitem [ref=e67]:
          - link "3 potatoes and 2 eggs" [ref=e68] [cursor=pointer]:
            - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=a6e84710-2eee-4063-bfea-39b99505cd68
        - listitem [ref=e69]:
          - link "2ttee remix videoo" [ref=e70] [cursor=pointer]:
            - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=4adcecc8-6e0c-4722-8540-5ea5b09886c1
        - listitem [ref=e71]:
          - link "Lionel Messi 50+ moments" [ref=e72] [cursor=pointer]:
            - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=651e8030-d6f9-432c-8047-27dabbe359a9
        - listitem [ref=e73]:
          - link "Live Stream" [ref=e74] [cursor=pointer]:
            - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=85ec40a3-0a8c-47ea-829a-7a50f403a0f1
        - listitem [ref=e75]:
          - link "Food Tour" [ref=e76] [cursor=pointer]:
            - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=f7e7e96a-0705-4723-b892-1aeda8f1221f
        - listitem [ref=e77]:
          - link "Tipmanna Bseen Showcase" [ref=e78] [cursor=pointer]:
            - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=efeebee0-c831-4ad0-afb6-abd73dc55220
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
          - link "Live Stream" [ref=e86] [cursor=pointer]:
            - /url: http://localhost:3000/content/b5b6d719-bfa4-4b8b-b781-414f342a84b0?v=22d58b67-0c8f-4dd0-bb05-d9d39bc4d5ae
        - listitem [ref=e87]:
          - link "Final Games 3" [ref=e88] [cursor=pointer]:
            - /url: http://localhost:3000/content/b5b6d719-bfa4-4b8b-b781-414f342a84b0?v=3c00d3e3-2c89-4903-ba3e-0d8e5de853b6
        - listitem [ref=e89]:
          - link "Magnus Carlsen vs Hikaru Nakamura" [ref=e90] [cursor=pointer]:
            - /url: http://localhost:3000/content/b5b6d719-bfa4-4b8b-b781-414f342a84b0?v=7a2f0a7a-a693-4c0d-bc22-22c03f750820
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
          - link "2ttee remix videoo" [ref=e102] [cursor=pointer]:
            - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=4adcecc8-6e0c-4722-8540-5ea5b09886c1
        - listitem [ref=e103]:
          - link "Food Tour" [ref=e104] [cursor=pointer]:
            - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=f7e7e96a-0705-4723-b892-1aeda8f1221f
        - listitem [ref=e105]:
          - link "Tipmanna Bseen Showcase" [ref=e106] [cursor=pointer]:
            - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=efeebee0-c831-4ad0-afb6-abd73dc55220
        - listitem [ref=e107]:
          - link "Food Ready in 5 minutes" [ref=e108] [cursor=pointer]:
            - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=906153c3-c272-44cf-b205-d62a14ab0b5f
        - listitem [ref=e109]:
          - link "The best burger recipe" [ref=e110] [cursor=pointer]:
            - /url: http://localhost:3000/content/688aa82e-1267-4e6c-b514-3cf874548fa4?v=11c306fc-00cb-4a9b-ba66-53dfd68c41bc
        - listitem [ref=e111]:
          - link "How to cook a perfect steak every time" [ref=e112] [cursor=pointer]:
            - /url: http://localhost:3000/content/688aa82e-1267-4e6c-b514-3cf874548fa4?v=4053b423-1ff8-4c58-aa4c-171351013cfb
        - listitem [ref=e113]:
          - link "Live Stream" [ref=e114] [cursor=pointer]:
            - /url: http://localhost:3000/content/b5b6d719-bfa4-4b8b-b781-414f342a84b0?v=22d58b67-0c8f-4dd0-bb05-d9d39bc4d5ae
        - listitem [ref=e115]:
          - link "Magnus Carlsen vs Hikaru Nakamura" [ref=e116] [cursor=pointer]:
            - /url: http://localhost:3000/content/b5b6d719-bfa4-4b8b-b781-414f342a84b0?v=7a2f0a7a-a693-4c0d-bc22-22c03f750820
        - listitem [ref=e117]:
          - link "Final Games 3" [ref=e118] [cursor=pointer]:
            - /url: http://localhost:3000/content/b5b6d719-bfa4-4b8b-b781-414f342a84b0?v=3c00d3e3-2c89-4903-ba3e-0d8e5de853b6
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
          - link "How to cook a perfect steak every time" [ref=e138] [cursor=pointer]:
            - /url: http://localhost:3000/content/688aa82e-1267-4e6c-b514-3cf874548fa4?v=4053b423-1ff8-4c58-aa4c-171351013cfb
        - listitem [ref=e139]:
          - link "The best burger recipe" [ref=e140] [cursor=pointer]:
            - /url: http://localhost:3000/content/688aa82e-1267-4e6c-b514-3cf874548fa4?v=11c306fc-00cb-4a9b-ba66-53dfd68c41bc
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
    - region "Top communities" [ref=e160]:
      - heading "Top communities" [level=2] [ref=e161]
      - list [ref=e162]:
        - listitem [ref=e163]:
          - link "Tipmanna Public" [ref=e164] [cursor=pointer]:
            - /url: /explore?tab=join&joinCommunity=bcc0090d-826c-444d-9689-300c354d0460
        - listitem [ref=e165]:
          - link "Emediong Community" [ref=e166] [cursor=pointer]:
            - /url: /explore?tab=join&joinCommunity=588a3682-c0c8-4284-b466-bd3e4a43b801
        - listitem [ref=e167]:
          - link "Caleb Community" [ref=e168] [cursor=pointer]:
            - /url: /explore?tab=join&joinCommunity=63898415-b24f-448d-aa55-ca073a8ba950
  - generic [ref=e169]:
    - banner [ref=e170]:
      - heading "Tipmanna TV — Explore and discover community media" [level=1] [ref=e171]
      - link "tipmanna" [ref=e173] [cursor=pointer]:
        - /url: /explore
      - generic [ref=e175]:
        - button "Open discover search" [ref=e176]:
          - textbox "Search videos..." [ref=e177]
          - img [ref=e178]
        - generic [ref=e183]: 0 watching live
    - generic [ref=e185]:
      - generic [ref=e186]:
        - button [ref=e187]:
          - img [ref=e188]
        - generic [ref=e189]: Create
      - button "Feed" [ref=e190]
      - button "Start Community" [ref=e191]
      - button "Not signed in" [ref=e192]:
        - img [ref=e194]
        - generic [ref=e197]: Not signed in
    - generic [ref=e198]:
      - generic [ref=e199]:
        - paragraph [ref=e200]: Discover is also available as a quick panel while you watch the feed.
        - button "Open discover panel" [ref=e201] [cursor=pointer]
      - generic [ref=e202]:
        - heading "Discover contents" [level=2] [ref=e203]
        - generic [ref=e205]:
          - generic [ref=e206]:
            - textbox "Search discovery catalogue" [ref=e207]:
              - /placeholder: Search...
            - button "Open bookmarks" [ref=e208]:
              - img [ref=e209]
          - paragraph [ref=e211]:
            - text: Looking for an event?
            - link "Find Event here" [ref=e212] [cursor=pointer]:
              - /url: /join
          - generic [ref=e214]:
            - generic [ref=e215]: Trending
            - button "Live" [ref=e216]
            - button "Comedy" [ref=e217]
            - button "Music" [ref=e218]
            - button "Sports" [ref=e219]
            - button "Community" [ref=e220]
            - button "TV program" [ref=e221]
        - generic [ref=e223]:
          - button "Concert" [ref=e224]
          - button "Drama" [ref=e225]
          - button "Festival" [ref=e226]
          - button "Food" [ref=e227]
          - button "Hangout" [ref=e228]
          - button "Islamic" [ref=e229]
          - button "Christian" [ref=e230]
          - button "Corporate" [ref=e231]
          - button "Comedy" [ref=e232]
          - button "Fashion" [ref=e233]
          - button "Game & sport" [ref=e234]
          - button "Children" [ref=e235]
          - button "Education" [ref=e236]
          - button "Other" [ref=e237]
        - generic [ref=e238]:
          - generic [ref=e239]:
            - generic [ref=e240]:
              - heading "Top contents" [level=5] [ref=e242]
              - paragraph [ref=e243]: Editorially featured
            - button [ref=e262]:
              - img [ref=e263]
          - generic [ref=e265]:
            - generic [ref=e266]:
              - heading "Latest contents" [level=5] [ref=e268]
              - paragraph [ref=e269]: Newest uploads, by date added
            - button [ref=e290]:
              - img [ref=e291]
          - generic [ref=e293]:
            - generic [ref=e294]:
              - heading "Spotlight" [level=5] [ref=e296]
              - paragraph [ref=e297]: Trending by views, tips, and saves (updates every ~5 min)
            - button [ref=e318]:
              - img [ref=e319]
          - generic [ref=e321]:
            - generic [ref=e322]:
              - heading "Recommended for you" [level=5] [ref=e324]
              - paragraph [ref=e325]: Popular saves and recency
            - button [ref=e346]:
              - img [ref=e347]
          - generic [ref=e350]:
            - heading "Programs" [level=5] [ref=e352]
            - paragraph [ref=e353]: Scheduled TV programs
          - generic [ref=e375]:
            - heading "Live streams" [level=5] [ref=e377]
            - paragraph [ref=e378]: Opens in the creator's event room
          - generic [ref=e399]:
            - generic [ref=e400]:
              - heading "Most tipped contents" [level=5] [ref=e402]
              - paragraph [ref=e403]: Highest tip counts
            - button [ref=e422]:
              - img [ref=e423]
          - heading "Top tippers" [level=5] [ref=e426]
```

# Test source

```ts
  1   | import { test, expect } from "@playwright/test";
  2   | 
  3   | /**
  4   |  * Unified Discover navigation journeys for the long-lived Explore session.
  5   |  * Covers: search = quick-panel only (no tab nav), the sheet X closes back to
  6   |  * the feed, the session shell keeps the feed mounted on non-feed surfaces, and
  7   |  * the dedicated /discover page hands standard clips off to the Explore reel.
  8   |  */
  9   | test.describe("discover navigation", () => {
  10  |   const openHeaderSearch = async (page: import("@playwright/test").Page) => {
  11  |     await expect(
  12  |       page
  13  |         .getByTestId("explore-feed-scroll")
  14  |         .or(page.getByText(/no clips available|sign in to browse/i))
  15  |         .first()
  16  |     ).toBeVisible({ timeout: 45_000 });
  17  | 
  18  |     // Desktop viewport: mobile search wrapper is `sm:hidden`; target visible input.
  19  |     const search = page.locator(
  20  |       'input[placeholder="Search videos..."]:visible'
  21  |     );
  22  |     await expect(search).toBeVisible({ timeout: 30_000 });
  23  |     await search.click();
  24  |     await search.fill("music");
  25  |     await search.press("Enter");
  26  |   };
  27  | 
  28  |   test("search opens the quick panel over the feed without leaving /explore", async ({
  29  |     page,
  30  |   }) => {
  31  |     await page.goto("/explore");
  32  |     await openHeaderSearch(page);
  33  | 
  34  |     // Quick panel (sheet) overlays the feed.
  35  |     await expect(page.getByRole("dialog", { name: "Discover" })).toBeVisible({
  36  |       timeout: 30_000,
  37  |     });
  38  |     // Unified nav must NOT switch the user to the full Discover tab.
  39  |     await expect(page).toHaveURL(/\/explore(\?|$)/);
  40  |     expect(new URL(page.url()).searchParams.get("tab")).not.toBe("discover");
  41  |   });
  42  | 
  43  |   test("the sheet X closes the quick panel and reveals the feed", async ({
  44  |     page,
  45  |   }) => {
  46  |     await page.goto("/explore");
  47  |     await openHeaderSearch(page);
  48  | 
  49  |     const dialog = page.getByRole("dialog", { name: "Discover" });
  50  |     await expect(dialog).toBeVisible({ timeout: 30_000 });
  51  | 
  52  |     await page.getByRole("button", { name: "Close discover panel" }).click();
  53  |     await expect(dialog).not.toBeVisible();
  54  | 
  55  |     // Feed is the active surface again.
  56  |     await expect(
  57  |       page
  58  |         .getByTestId("explore-feed-scroll")
  59  |         .or(page.getByText(/no clips available|sign in to browse/i))
  60  |         .first()
  61  |     ).toBeVisible({ timeout: 30_000 });
  62  |   });
  63  | 
  64  |   test("session shell keeps the feed mounted on the Discover surface (no remount)", async ({
  65  |     page,
  66  |   }) => {
  67  |     // The Discover surface renders alongside a mounted-but-hidden feed so the
  68  |     // reel session (playback, caches, subscriptions) survives surface switches.
> 69  |     await page.goto("/explore?tab=discover");
      |                ^ Error: page.goto: Test timeout of 90000ms exceeded.
  70  |     await expect(
  71  |       page.getByRole("heading", { name: "Spotlight" }).first()
  72  |     ).toBeVisible({
  73  |       timeout: 30_000,
  74  |     });
  75  | 
  76  |     // Feed scroll container stays in the DOM even though Discover is active.
  77  |     await expect(page.getByTestId("explore-feed-scroll")).toBeAttached();
  78  |   });
  79  | 
  80  |   test("dedicated Discover hands standard clips to the Explore reel", async ({
  81  |     page,
  82  |   }) => {
  83  |     await page.goto("/discover");
  84  | 
  85  |     const card = page.getByTestId("discover-content-card").first();
  86  |     if (!(await card.isVisible({ timeout: 10_000 }).catch(() => false))) {
  87  |       test.skip(true, "No standard clips in catalog for this environment");
  88  |       return;
  89  |     }
  90  | 
  91  |     await card.click();
  92  |     // Handoff opens the clip in the Explore reel session, not a separate page.
  93  |     await expect(page).toHaveURL(/\/explore\?.*channel=/, { timeout: 15_000 });
  94  |   });
  95  | 
  96  |   test("rapid tag switch shows results for the last selected tag", async ({
  97  |     page,
  98  |   }) => {
  99  |     await page.goto("/explore?tab=discover");
  100 |     await expect(page.getByRole("heading", { name: "Spotlight" })).toBeVisible({
  101 |       timeout: 30_000,
  102 |     });
  103 | 
  104 |     const concertTag = page.getByRole("button", {
  105 |       name: "Concert",
  106 |       exact: true,
  107 |     });
  108 |     const comedyTag = page.getByRole("button", { name: "Comedy", exact: true });
  109 |     if (!(await concertTag.isVisible({ timeout: 5_000 }).catch(() => false))) {
  110 |       test.skip(true, "Tag chips not visible in Discover panel");
  111 |       return;
  112 |     }
  113 | 
  114 |     await concertTag.click();
  115 |     await comedyTag.click();
  116 | 
  117 |     await expect(page.getByText("Results for 'Comedy'")).toBeVisible({
  118 |       timeout: 30_000,
  119 |     });
  120 |     await expect(page.getByText("Results for 'Concert'")).not.toBeVisible();
  121 |   });
  122 | });
  123 | 
```