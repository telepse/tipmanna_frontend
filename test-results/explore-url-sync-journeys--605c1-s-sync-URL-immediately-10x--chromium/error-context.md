# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: explore-url-sync-journeys.spec.ts >> explore URL sync journeys >> feed sub-tab transitions sync URL immediately (10x)
- Location: e2e\explore-url-sync-journeys.spec.ts:35:7

# Error details

```
Error: expect(received).toBeTruthy()

Received: false

Call Log:
- Timeout 60000ms exceeded while waiting on the predicate
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
          - generic [ref=e14]: "2"
          - generic [ref=e15]: "3"
        - generic [ref=e16]:
          - text: Issue
          - generic [ref=e17]: s
      - button "Collapse issues badge" [ref=e18]:
        - img [ref=e19]
  - alert [ref=e21]
  - generic [ref=e22]:
    - banner [ref=e23]:
      - heading "Tipmanna TV — Explore and discover community media" [level=1] [ref=e24]
      - generic [ref=e25]:
        - link "tipmanna" [ref=e26] [cursor=pointer]:
          - /url: /explore
        - button [ref=e27] [cursor=pointer]:
          - img [ref=e28]
      - generic [ref=e31]:
        - button "Open discover search" [ref=e32]:
          - textbox "Search videos..." [ref=e33]
          - img [ref=e34]
        - generic [ref=e39]: 0 watching live
    - generic [ref=e41]:
      - generic [ref=e42]:
        - button [ref=e43]:
          - img [ref=e44]
        - generic [ref=e45]: Create
      - button "Feed" [ref=e46]
      - button "Start Community" [ref=e47]
      - button "1 Not signed in" [ref=e48]:
        - generic [ref=e49]:
          - img [ref=e50]
          - generic [ref=e53]: "1"
        - generic [ref=e54]: Not signed in
    - generic [ref=e55]:
      - generic [ref=e57]:
        - generic [ref=e58]:
          - generic [ref=e59]:
            - button "Trends" [ref=e60]
            - button "Saves" [ref=e61]
            - button "TV" [ref=e62]
            - button "Community" [ref=e63]
          - button "My Communities" [ref=e65] [cursor=pointer]:
            - generic [ref=e66]: My Communities
        - button "Open filters" [ref=e67]:
          - img [ref=e68]
      - generic "Loading explore feed" [ref=e71]
```

# Test source

```ts
  1  | import { expect, type Page } from "@playwright/test";
  2  | 
  3  | /** Terminal feed states per Endless Feed Contract / STAB-1 boot resilience. */
  4  | export async function waitExploreFeedReady(
  5  |   page: Page,
  6  |   timeoutMs = 45_000
  7  | ): Promise<"scroll" | "empty"> {
  8  |   const scroll = page.getByTestId("explore-feed-scroll");
  9  |   const emptyCopy = page.getByText(/no clips available|sign in to browse/i);
  10 |   const skeleton = page.getByTestId("explore-feed-skeleton");
  11 | 
  12 |   await expect(async () => {
  13 |     const hasTerminal =
  14 |       (await scroll.isVisible().catch(() => false)) ||
  15 |       (await emptyCopy
  16 |         .first()
  17 |         .isVisible()
  18 |         .catch(() => false));
  19 |     expect(hasTerminal).toBeTruthy();
  20 |     await expect(skeleton).not.toBeVisible();
> 21 |   }).toPass({ timeout: timeoutMs });
     |      ^ Error: expect(received).toBeTruthy()
  22 | 
  23 |   return (await scroll.isVisible().catch(() => false)) ? "scroll" : "empty";
  24 | }
  25 | 
```