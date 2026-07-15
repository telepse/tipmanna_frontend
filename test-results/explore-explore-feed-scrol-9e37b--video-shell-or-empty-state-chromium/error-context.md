# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: explore.spec.ts >> explore >> feed scrolls and shows video shell or empty state
- Location: e2e\explore.spec.ts:31:7

# Error details

```
Test timeout of 90000ms exceeded.
```

```
Error: expect(locator).toBeVisible() failed

Locator: getByTestId('explore-feed-scroll').or(getByText(/no clips available|sign in to browse/i)).first()
Expected: visible
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 30000ms
  - waiting for getByTestId('explore-feed-scroll').or(getByText(/no clips available|sign in to browse/i)).first()

```

```yaml
- region "Notification messages"
- alert
- region "Top contents":
    - heading "Top contents" [level=2]
    - paragraph: Editorially featured
    - list:
        - listitem:
            - link "hello":
                - /url: http://localhost:3000/content/8a10de58-70c6-4623-a4e4-0af4322cda97?v=4cc03c89-9e78-487b-ac10-4f1c359667d5
        - listitem:
            - link "Live Stream":
                - /url: http://localhost:3000/content/b5b6d719-bfa4-4b8b-b781-414f342a84b0?v=22d58b67-0c8f-4dd0-bb05-d9d39bc4d5ae
        - listitem:
            - link "Tipmanna & Bseen - Product Showcase":
                - /url: http://localhost:3000/content/3d01ef9d-3993-408b-88bf-e0ea6ce0944b?v=5959dba8-9c51-4d70-9c5d-067d0bcf04c3
        - listitem:
            - link "Intro to Showcase":
                - /url: http://localhost:3000/content/3d01ef9d-3993-408b-88bf-e0ea6ce0944b?v=bb10fbef-55b3-44e0-b993-5716603a8c44
- region "Latest contents":
    - heading "Latest contents" [level=2]
    - paragraph: Newest uploads, by date added
    - list:
        - listitem:
            - link "Messi Saves Arg":
                - /url: http://localhost:3000/content/9bccd66b-387a-46bf-8789-8d8c17c7a389?v=8f04ecdc-5779-493f-b914-ba7734f7c119
        - listitem:
            - link "Daily Dose of Football":
                - /url: http://localhost:3000/content/e4c40d62-de30-456c-9543-3a06be6f70ee?v=fc25fcac-2181-44db-98ec-2d6be58fda07
        - listitem:
            - link "Norway vs Senegal":
                - /url: http://localhost:3000/content/0e92c442-648c-4423-9227-278531885a44?v=63f8d340-19d8-4fcc-a6e2-300ad938c079
        - listitem:
            - link "GM Chess Lessons":
                - /url: http://localhost:3000/content/0569fd21-08cd-4edc-bd50-2c2cb8986698?v=64c0d060-f64a-4eca-904f-ef66de0235bc
        - listitem:
            - link "2ttee remix videoo":
                - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=4adcecc8-6e0c-4722-8540-5ea5b09886c1
        - listitem:
            - link "Tipmanna Bseen Showcase":
                - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=efeebee0-c831-4ad0-afb6-abd73dc55220
        - listitem:
            - link "2ttee talks his music journey":
                - /url: http://localhost:3000/content/f39609be-4a93-4eca-9b0c-3454b3fc2663?v=9144020c-c666-47b9-801b-38ab9a571def
        - listitem:
            - link "Kobbie mannoo":
                - /url: http://localhost:3000/content/302b6dda-02ab-49ff-9bed-1e8f9378557c?v=9ff5bba1-50f4-4bc4-b92c-eb1f2e2b6e75
        - listitem:
            - link "Crazy nine goal thriller":
                - /url: http://localhost:3000/content/302b6dda-02ab-49ff-9bed-1e8f9378557c?v=5c22d5ec-34a5-443a-8c22-b27c230cd667
        - listitem:
            - link "All goals scored in the champions league":
                - /url: http://localhost:3000/content/302b6dda-02ab-49ff-9bed-1e8f9378557c?v=57558a0d-3546-42fc-b505-6bca3f41767f
        - listitem:
            - link "Saka sends arsenal to the champions league final":
                - /url: http://localhost:3000/content/302b6dda-02ab-49ff-9bed-1e8f9378557c?v=875961c7-0a46-46e8-9af5-55d124cb6a2b
        - listitem:
            - link "PSG eliminates bayern":
                - /url: http://localhost:3000/content/302b6dda-02ab-49ff-9bed-1e8f9378557c?v=7b9f8358-2eea-4be0-8c48-7ad4b73bed1d
- region "Spotlight":
    - heading "Spotlight" [level=2]
    - paragraph: Trending by views, tips, and saves (updates every ~5 min)
    - list:
        - listitem:
            - link "2ttee remix videoo":
                - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=4adcecc8-6e0c-4722-8540-5ea5b09886c1
        - listitem:
            - link "Live Stream":
                - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=85ec40a3-0a8c-47ea-829a-7a50f403a0f1
        - listitem:
            - link "Lionel Messi 50+ moments":
                - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=651e8030-d6f9-432c-8047-27dabbe359a9
        - listitem:
            - link "Tipmanna Bseen Showcase":
                - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=efeebee0-c831-4ad0-afb6-abd73dc55220
        - listitem:
            - link "Food Ready in 5 minutes":
                - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=906153c3-c272-44cf-b205-d62a14ab0b5f
        - listitem:
            - link "Food Tour":
                - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=f7e7e96a-0705-4723-b892-1aeda8f1221f
        - listitem:
            - link "3 potatoes and 2 eggs":
                - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=a6e84710-2eee-4063-bfea-39b99505cd68
        - listitem:
            - link "The best burger recipe":
                - /url: http://localhost:3000/content/688aa82e-1267-4e6c-b514-3cf874548fa4?v=11c306fc-00cb-4a9b-ba66-53dfd68c41bc
        - listitem:
            - link "How to cook a perfect steak every time":
                - /url: http://localhost:3000/content/688aa82e-1267-4e6c-b514-3cf874548fa4?v=4053b423-1ff8-4c58-aa4c-171351013cfb
        - listitem:
            - link "Live Stream":
                - /url: http://localhost:3000/content/b5b6d719-bfa4-4b8b-b781-414f342a84b0?v=22d58b67-0c8f-4dd0-bb05-d9d39bc4d5ae
        - listitem:
            - link "Magnus Carlsen vs Hikaru Nakamura":
                - /url: http://localhost:3000/content/b5b6d719-bfa4-4b8b-b781-414f342a84b0?v=7a2f0a7a-a693-4c0d-bc22-22c03f750820
        - listitem:
            - link "Final Games 3":
                - /url: http://localhost:3000/content/b5b6d719-bfa4-4b8b-b781-414f342a84b0?v=3c00d3e3-2c89-4903-ba3e-0d8e5de853b6
- region "Recommended for you":
    - heading "Recommended for you" [level=2]
    - paragraph: Popular saves and recency
    - list:
        - listitem:
            - link "2ttee remix videoo":
                - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=4adcecc8-6e0c-4722-8540-5ea5b09886c1
        - listitem:
            - link "Live Stream":
                - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=85ec40a3-0a8c-47ea-829a-7a50f403a0f1
        - listitem:
            - link "Lionel Messi 50+ moments":
                - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=651e8030-d6f9-432c-8047-27dabbe359a9
        - listitem:
            - link "3 potatoes and 2 eggs":
                - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=a6e84710-2eee-4063-bfea-39b99505cd68
        - listitem:
            - link "Tipmanna Bseen Showcase":
                - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=efeebee0-c831-4ad0-afb6-abd73dc55220
        - listitem:
            - link "Food Tour":
                - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=f7e7e96a-0705-4723-b892-1aeda8f1221f
        - listitem:
            - link "Food Ready in 5 minutes":
                - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=906153c3-c272-44cf-b205-d62a14ab0b5f
        - listitem:
            - link "The best burger recipe":
                - /url: http://localhost:3000/content/688aa82e-1267-4e6c-b514-3cf874548fa4?v=11c306fc-00cb-4a9b-ba66-53dfd68c41bc
        - listitem:
            - link "How to cook a perfect steak every time":
                - /url: http://localhost:3000/content/688aa82e-1267-4e6c-b514-3cf874548fa4?v=4053b423-1ff8-4c58-aa4c-171351013cfb
        - listitem:
            - link "Live Stream":
                - /url: http://localhost:3000/content/b5b6d719-bfa4-4b8b-b781-414f342a84b0?v=22d58b67-0c8f-4dd0-bb05-d9d39bc4d5ae
        - listitem:
            - link "Magnus Carlsen vs Hikaru Nakamura":
                - /url: http://localhost:3000/content/b5b6d719-bfa4-4b8b-b781-414f342a84b0?v=7a2f0a7a-a693-4c0d-bc22-22c03f750820
        - listitem:
            - link "Final Games 3":
                - /url: http://localhost:3000/content/b5b6d719-bfa4-4b8b-b781-414f342a84b0?v=3c00d3e3-2c89-4903-ba3e-0d8e5de853b6
- region "Most tipped":
    - heading "Most tipped" [level=2]
    - paragraph: Highest tip counts
    - list:
        - listitem:
            - link "Live Stream":
                - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=85ec40a3-0a8c-47ea-829a-7a50f403a0f1
        - listitem:
            - link "2ttee remix videoo":
                - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=4adcecc8-6e0c-4722-8540-5ea5b09886c1
        - listitem:
            - link "Tipmanna Bseen Showcase":
                - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=efeebee0-c831-4ad0-afb6-abd73dc55220
        - listitem:
            - link "Food Tour":
                - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=f7e7e96a-0705-4723-b892-1aeda8f1221f
        - listitem:
            - link "Food Ready in 5 minutes":
                - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=906153c3-c272-44cf-b205-d62a14ab0b5f
        - listitem:
            - link "Lionel Messi 50+ moments":
                - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=651e8030-d6f9-432c-8047-27dabbe359a9
        - listitem:
            - link "3 potatoes and 2 eggs":
                - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=a6e84710-2eee-4063-bfea-39b99505cd68
        - listitem:
            - link "The best burger recipe":
                - /url: http://localhost:3000/content/688aa82e-1267-4e6c-b514-3cf874548fa4?v=11c306fc-00cb-4a9b-ba66-53dfd68c41bc
        - listitem:
            - link "How to cook a perfect steak every time":
                - /url: http://localhost:3000/content/688aa82e-1267-4e6c-b514-3cf874548fa4?v=4053b423-1ff8-4c58-aa4c-171351013cfb
        - listitem:
            - link "Final Games 3":
                - /url: http://localhost:3000/content/b5b6d719-bfa4-4b8b-b781-414f342a84b0?v=3c00d3e3-2c89-4903-ba3e-0d8e5de853b6
- region "Programs":
    - heading "Programs" [level=2]
    - paragraph: Scheduled TV programs
    - list
- region "Live streams":
    - heading "Live streams" [level=2]
    - paragraph: Opens in the creator's event room
    - list:
        - listitem:
            - link "Cold play - A sky full of stars":
                - /url: /channel/f8f5c071-e10d-4b5e-811b-662038b69693
        - listitem:
            - link "Tipmanna & Bseen - Product Showcase":
                - /url: /channel/3d01ef9d-3993-408b-88bf-e0ea6ce0944b
        - listitem:
            - link "Messi magic sets up win":
                - /url: /channel/302b6dda-02ab-49ff-9bed-1e8f9378557c
        - listitem:
            - link "Tipmanna Bseen Showcase":
                - /url: /channel/95970621-c9b6-456c-8c9b-5bf19867b788
        - listitem:
            - link "Live Stream":
                - /url: /channel/f8f5c071-e10d-4b5e-811b-662038b69693
- region "Top tippers":
    - heading "Top tippers" [level=2]
    - list:
        - listitem: annetterobinson226
        - listitem: emediong5135
        - listitem: taiwo2ttee
        - listitem: Telepsecompany
        - listitem: ava
        - listitem: aishapatel1912
        - listitem: caleb.parker374
        - listitem: xavier.scott523
        - listitem: lasker1896
        - listitem: charlottequinn0897
- region "Top communities":
    - heading "Top communities" [level=2]
    - list:
        - listitem:
            - link "Tipmanna Public":
                - /url: /explore?tab=join&joinCommunity=bcc0090d-826c-444d-9689-300c354d0460
        - listitem:
            - link "Emediong Community":
                - /url: /explore?tab=join&joinCommunity=588a3682-c0c8-4284-b466-bd3e4a43b801
        - listitem:
            - link "Caleb Community":
                - /url: /explore?tab=join&joinCommunity=63898415-b24f-448d-aa55-ca073a8ba950
- banner:
    - heading "Tipmanna TV — Explore and discover community media" [level=1]
    - link "tipmanna":
        - /url: /explore
    - button "Open discover search":
        - textbox "Search videos..."
    - text: 0 watching live
- button
- text: Create
- button "Feed"
- button "Start Community"
- button "Not signed in"
- button "Trends"
- button "Saves"
- button "TV"
- button "Community"
- button "My Communities"
- button "Open filters"
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | import { gotoExplore } from "./helpers/goto-explore";
  3  |
  4  | test.describe("explore", () => {
  5  |   test("loads feed first on default explore URL", async ({ page }) => {
  6  |     await gotoExplore(page);
  7  |     await expect(page.locator("body")).toBeVisible();
  8  |
  9  |     const scroll = page.getByTestId("explore-feed-scroll");
  10 |     const emptyCopy = page.getByText(/no clips available|sign in to browse/i);
  11 |     const discoverHeading = page.getByRole("heading", {
  12 |       name: "Discover contents",
  13 |     });
  14 |
  15 |     await expect(scroll.or(emptyCopy).first()).toBeVisible({ timeout: 30_000 });
  16 |     await expect(discoverHeading).not.toBeVisible();
  17 |   });
  18 |
  19 |   test("first paint includes SSR default feed boot or visible slide", async ({
  20 |     page,
  21 |   }) => {
  22 |     const response = await gotoExplore(page);
  23 |     expect(response?.ok()).toBeTruthy();
  24 |     const html = await page.content();
  25 |     const hadInlineBoot =
  26 |       html.includes("__EXPLORE_SSR_BOOT__") ||
  27 |       html.includes("data-explore-slide");
  28 |     expect(hadInlineBoot).toBeTruthy();
  29 |   });
  30 |
  31 |   test("feed scrolls and shows video shell or empty state", async ({
  32 |     page,
  33 |   }) => {
  34 |     await gotoExplore(page);
  35 |     await expect(page.locator("body")).toBeVisible();
  36 |
  37 |     const scroll = page.getByTestId("explore-feed-scroll");
  38 |     const emptyCopy = page.getByText(/no clips available|sign in to browse/i);
  39 |
> 40 |     await expect(scroll.or(emptyCopy).first()).toBeVisible({ timeout: 30_000 });
     |                                                ^ Error: expect(locator).toBeVisible() failed
  41 |
  42 |     if (await scroll.isVisible()) {
  43 |       await scroll.evaluate(el => {
  44 |         el.scrollTop = el.scrollHeight;
  45 |       });
  46 |       await expect(
  47 |         page
  48 |           .getByTestId("explore-video-shell")
  49 |           .or(page.locator("[data-explore-slide]"))
  50 |           .first()
  51 |       ).toBeVisible();
  52 |     } else {
  53 |       await expect(emptyCopy.first()).toBeVisible();
  54 |     }
  55 |   });
  56 |
  57 |   test("slide actions live inside active slide footer", async ({ page }) => {
  58 |     await gotoExplore(page);
  59 |     const scroll = page.getByTestId("explore-feed-scroll");
  60 |     if (!(await scroll.isVisible({ timeout: 15_000 }).catch(() => false))) {
  61 |       test.skip();
  62 |       return;
  63 |     }
  64 |     const actions = page.getByTestId("explore-slide-actions");
  65 |     await expect(actions).toBeVisible({ timeout: 15_000 });
  66 |     const slide = page.locator('[data-explore-slide][data-index="0"]');
  67 |     await expect(
  68 |       slide.locator('[data-testid="explore-slide-actions"]')
  69 |     ).toBeVisible();
  70 |     await expect(actions).toHaveClass(/bg-gradient-to-t/);
  71 |     await expect(actions).not.toHaveClass(/bg-black\/80/);
  72 |   });
  73 |
  74 |   test("profile shows Guest or Not signed in for anonymous visitors", async ({
  75 |     page,
  76 |   }) => {
  77 |     await gotoExplore(page);
  78 |     await expect(page.getByText(/Signed in|Guest|Not signed in/i)).toBeVisible({
  79 |       timeout: 15_000,
  80 |     });
  81 |   });
  82 |
  83 |   test("discover tab shows distinct category headings", async ({ page }) => {
  84 |     await gotoExplore(page, "/explore?tab=discover");
  85 |     await expect(page.getByRole("heading", { name: "Spotlight" })).toBeVisible({
  86 |       timeout: 30_000,
  87 |     });
  88 |     await expect(
  89 |       page.getByRole("heading", { name: "Recommended for you" })
  90 |     ).toBeVisible();
  91 |     await expect(page.getByRole("heading", { name: "Programs" })).toBeVisible();
  92 |   });
  93 | });
  94 |
```
