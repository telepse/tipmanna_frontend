# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: explore-tv-session.spec.ts >> explore TV session continuity >> scroll position preserved across TV and Trends
- Location: e2e\explore-tv-session.spec.ts:20:7

# Error details

```
Test timeout of 90000ms exceeded.
```

```
Error: page.goto: Test timeout of 90000ms exceeded.
Call log:
  - navigating to "http://127.0.0.1:3000/explore", waiting until "load"

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
      - button "Not signed in" [ref=e205]:
        - img [ref=e207]
        - generic [ref=e210]: Not signed in
    - generic [ref=e211]:
      - generic [ref=e213]:
        - generic [ref=e214]:
          - generic [ref=e215]:
            - button "Trends" [ref=e216]
            - button "Saves" [ref=e217]
            - button "TV" [ref=e218]
            - button "Community" [ref=e219]
          - button "My Communities" [ref=e221] [cursor=pointer]:
            - generic [ref=e222]: My Communities
        - button "Open filters" [ref=e223]:
          - img [ref=e224]
      - generic [ref=e228]:
        - generic [ref=e229]:
          - iframe [ref=e238]:
            - generic [active] [ref=f1e1]:
              - generic "YouTube Video Player" [ref=f1e3]:
                - generic [ref=f1e7]:
                  - generic [ref=f1e9]: dogs the legs. I use them for kebabs as
                  - generic [ref=f1e11]: well myself.
                  - generic [ref=f1e13]: But
              - button "Show player controls" [ref=f1e15] [cursor=pointer]
          - generic [ref=e239]:
            - generic [ref=e240]:
              - button "Unmute" [ref=e241] [cursor=pointer]:
                - img [ref=e242]
              - generic [ref=e246]: Food Tour
            - paragraph [ref=e247]:
              - text: 0 saves · 0 shares ·
              - generic [ref=e248]:
                - img [ref=e249]
                - text: "1"
              - text: · 0 comments
          - generic [ref=e253]:
            - button "Save video" [ref=e254] [cursor=pointer]:
              - img [ref=e255]
            - button "Share" [ref=e258] [cursor=pointer]:
              - img [ref=e259]
            - button [ref=e265] [cursor=pointer]:
              - img [ref=e266]
          - generic [ref=e268]:
            - button "142 tips" [ref=e269] [cursor=pointer]
            - generic [ref=e270]:
              - img "Black Diamond"
          - generic [ref=e274]:
            - button "Create video" [ref=e275] [cursor=pointer]:
              - img
            - generic [ref=e276]:
              - button "Watch TV" [ref=e277] [cursor=pointer]
              - button "Engage" [ref=e278] [cursor=pointer]
            - button "Comments" [ref=e279] [cursor=pointer]:
              - img
        - iframe [ref=e289]:
          - generic [active] [ref=f2e1]:
            - generic "YouTube Video Player" [ref=f2e3]
            - generic [ref=f2e5]:
              - generic:
                - generic:
                  - button "Play video" [ref=f2e10] [cursor=pointer]
                  - button "Hide player controls" [ref=f2e12] [cursor=pointer]
        - generic [ref=e292]: Messi Saves Arg
        - generic [ref=e295]:
          - text: 3 potatoes and ..
          - button "Open comments" [ref=e296]:
            - img [ref=e297]
        - generic [ref=e301]:
          - text: Food Ready in 5..
          - button "Open comments" [ref=e302]:
            - img [ref=e303]
        - generic [ref=e307]: Live Stream
        - generic [ref=e310]:
          - text: All goals score..
          - button "Open comments" [ref=e311]:
            - img [ref=e312]
        - generic [ref=e316]:
          - text: Daily Dose of F..
          - button "Open comments" [ref=e317]:
            - img [ref=e318]
```

# Test source

```ts
  1   | import { test, expect } from "@playwright/test";
  2   | 
  3   | test.describe("explore TV session continuity", () => {
  4   |   test("feed stays mounted while TV sub-tab is active", async ({ page }) => {
  5   |     await page.goto("/explore");
  6   |     await expect(
  7   |       page
  8   |         .getByTestId("explore-feed-scroll")
  9   |         .or(page.getByText(/no clips available|sign in to browse/i))
  10  |         .first()
  11  |     ).toBeVisible({ timeout: 45_000 });
  12  | 
  13  |     await page.getByRole("button", { name: "TV" }).click();
  14  |     await expect(page.getByTestId("explore-feed-shell")).toBeAttached();
  15  |     await expect(page.getByTestId("explore-feed-scroll")).toBeAttached();
  16  |     await expect(page.getByTestId("explore-feed-shell")).toHaveClass(/hidden/);
  17  |     await expect(page.getByTestId("explore-feed-scroll")).not.toBeVisible();
  18  |   });
  19  | 
  20  |   test("scroll position preserved across TV and Trends", async ({ page }) => {
> 21  |     await page.goto("/explore");
      |                ^ Error: page.goto: Test timeout of 90000ms exceeded.
  22  |     const scroll = page.getByTestId("explore-feed-scroll");
  23  |     if (!(await scroll.isVisible({ timeout: 15_000 }).catch(() => false))) {
  24  |       test.skip(true, "Feed scroll not available");
  25  |       return;
  26  |     }
  27  | 
  28  |     const slideCount = await page.locator("[data-explore-slide]").count();
  29  |     if (slideCount < 2) {
  30  |       test.skip(true, "Need at least 2 slides to test scroll preserve");
  31  |       return;
  32  |     }
  33  | 
  34  |     await scroll.evaluate(el => {
  35  |       const slide = el.querySelector(
  36  |         "[data-explore-slide]"
  37  |       ) as HTMLElement | null;
  38  |       const h = slide?.getBoundingClientRect().height ?? 0;
  39  |       el.scrollTop = h;
  40  |     });
  41  |     await page.waitForTimeout(300);
  42  | 
  43  |     const indexBefore = await scroll.evaluate(el => {
  44  |       const slide = el.querySelector(
  45  |         "[data-explore-slide]"
  46  |       ) as HTMLElement | null;
  47  |       const h = slide?.getBoundingClientRect().height ?? 1;
  48  |       return Math.round(el.scrollTop / h);
  49  |     });
  50  | 
  51  |     await page.getByRole("button", { name: "TV" }).click();
  52  |     await page.waitForTimeout(200);
  53  |     await page.getByRole("button", { name: "Trends" }).click();
  54  |     await expect(scroll).toBeVisible({ timeout: 15_000 });
  55  | 
  56  |     const indexAfter = await scroll.evaluate(el => {
  57  |       const slide = el.querySelector(
  58  |         "[data-explore-slide]"
  59  |       ) as HTMLElement | null;
  60  |       const h = slide?.getBoundingClientRect().height ?? 1;
  61  |       return Math.round(el.scrollTop / h);
  62  |     });
  63  | 
  64  |     expect(indexAfter).toBe(indexBefore);
  65  |   });
  66  | 
  67  |   test("TV programme handoff opens reel without remount hang", async ({
  68  |     page,
  69  |   }) => {
  70  |     await page.goto("/explore?feedTab=tv&e2eTv=1");
  71  |     await expect(page.getByRole("button", { name: "TV" })).toHaveClass(
  72  |       /bg-white/,
  73  |       { timeout: 15_000 }
  74  |     );
  75  | 
  76  |     const watch = page.getByTestId("explore-tv-watch").first();
  77  |     await expect(watch).toBeVisible({ timeout: 15_000 });
  78  |     await watch.click();
  79  | 
  80  |     await expect(page.getByRole("button", { name: "Trends" })).toHaveClass(
  81  |       /bg-white/,
  82  |       { timeout: 15_000 }
  83  |     );
  84  |     await expect(page.getByTestId("explore-feed-scroll")).toBeVisible({
  85  |       timeout: 45_000,
  86  |     });
  87  |     await expect(
  88  |       page.getByText("Explore ran into a problem")
  89  |     ).not.toBeVisible();
  90  |     await expect(page.getByTestId("explore-feed-shell")).not.toHaveClass(
  91  |       /hidden/
  92  |     );
  93  |   });
  94  | 
  95  |   test("visible reel shell returns after leaving TV tab", async ({ page }) => {
  96  |     await page.goto("/explore");
  97  |     const scroll = page.getByTestId("explore-feed-scroll");
  98  |     if (!(await scroll.isVisible({ timeout: 15_000 }).catch(() => false))) {
  99  |       test.skip(true, "Feed scroll not available");
  100 |       return;
  101 |     }
  102 | 
  103 |     await page.getByRole("button", { name: "TV" }).click();
  104 |     await page.getByRole("button", { name: "Trends" }).click();
  105 |     await expect(scroll).toBeVisible({ timeout: 15_000 });
  106 |     await expect(
  107 |       page.getByTestId("explore-video-shell").first()
  108 |     ).toBeVisible();
  109 |   });
  110 | });
  111 | 
```