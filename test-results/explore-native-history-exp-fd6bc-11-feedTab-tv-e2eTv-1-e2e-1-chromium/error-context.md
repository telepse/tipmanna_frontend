# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: explore-native-history.spec.ts >> explore native history — formal matrix >> deep-link refresh grid >> refresh preserves /explore?tab=join&joinCommunity=11111111-1111-4111-8111-111111111111&feedTab=tv&e2eTv=1&e2e=1
- Location: e2e\explore-native-history.spec.ts:347:11

# Error details

```
Test timeout of 180000ms exceeded.
```

```
Error: page.goto: Test timeout of 180000ms exceeded.
Call log:
  - navigating to "http://localhost:3000/explore?tab=join&joinCommunity=11111111-1111-4111-8111-111111111111&feedTab=tv&e2eTv=1&e2e=1", waiting until "domcontentloaded"

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
        - generic [ref=e37]:
            - generic [ref=e38]:
                - heading "E2E Join Community" [level=1] [ref=e39]
                - paragraph [ref=e40]: Synthetic join target for E2E routing tests.
                - generic [ref=e41]:
                    - generic [ref=e42]:
                        - term [ref=e43]: Total tips
                        - definition [ref=e44]: £0
                    - generic [ref=e45]:
                        - term [ref=e46]: Members
                        - definition [ref=e47]: "1"
                    - generic [ref=e48]:
                        - term [ref=e49]: Videos
                        - definition [ref=e50]: "0"
                    - generic [ref=e51]:
                        - term [ref=e52]: Created
                        - definition [ref=e53]: —
                - paragraph [ref=e54]: "How to join: Submit a free request for approval"
            - generic [ref=e55]:
                - paragraph [ref=e56]: Sign in with your tipper email to submit a join request.
                - button "Continue with email" [ref=e57] [cursor=pointer]
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
     |               ^ Error: page.goto: Test timeout of 180000ms exceeded.
  10 |     waitUntil: "domcontentloaded",
  11 |     ...options,
  12 |   });
  13 | }
  14 |
```
