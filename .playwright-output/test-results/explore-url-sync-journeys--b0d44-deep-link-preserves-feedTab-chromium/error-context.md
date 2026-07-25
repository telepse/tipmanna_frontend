# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: explore-url-sync-journeys.spec.ts >> explore URL sync journeys >> join community deep link preserves feedTab
- Location: e2e\explore-url-sync-journeys.spec.ts:190:7

# Error details

```
Test timeout of 90000ms exceeded.
```

```
Error: page.goto: Test timeout of 90000ms exceeded.
Call log:
  - navigating to "http://localhost:3000/explore?tab=join&joinCommunity=11111111-1111-4111-8111-111111111111&feedTab=tv&e2eTv=1", waiting until "domcontentloaded"

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
        - img [ref=e38]
```

# Test source

```ts
  1  | import type { Page } from "@playwright/test";
  2  |
  3  | /** Explore routes: do not wait for full load (Suspense streams may be slow). */
  4  | export async function gotoExplore(
  5  |   page: Page,
  6  |   path = "/explore",
  7  |   options?: Parameters<Page["goto"]>[1]
  8  | ) {
> 9  |   return page.goto(path, {
     |               ^ Error: page.goto: Test timeout of 90000ms exceeded.
  10 |     waitUntil: "domcontentloaded",
  11 |     ...options,
  12 |   });
  13 | }
  14 |
```
