# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: explore-native-history.spec.ts >> explore native history — formal matrix >> filter matrix >> Comedy filter from saves (10x)
- Location: e2e\explore-native-history.spec.ts:65:11

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
                - generic [ref=e20]: 2 watching live
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
            - generic [ref=e52]:
                - paragraph [ref=e53]: Sign in as a tipper to see your saves feed.
                - button "Sign in" [ref=e54] [cursor=pointer]
```

# Test source

```ts
  1  | import { expect, type Page } from "@playwright/test";
  2  |
  3  | export type ExploreFeedReadiness =
  4  |   | { state: "scroll" }
  5  |   | { state: "empty" };
  6  |
  7  | /** Terminal feed states per Endless Feed Contract / STAB-1 boot resilience. */
  8  | export async function waitExploreFeedReady(
  9  |   page: Page,
  10 |   timeoutMs = 45_000
  11 | ): Promise<ExploreFeedReadiness> {
  12 |   const scroll = page.getByTestId("explore-feed-scroll");
  13 |   const emptyCopy = page.getByText(/no clips available|sign in to browse/i);
  14 |   const skeleton = page.getByTestId("explore-feed-skeleton");
  15 |
  16 |   await expect(async () => {
  17 |     const hasTerminal =
  18 |       (await scroll.isVisible().catch(() => false)) ||
  19 |       (await emptyCopy
  20 |         .first()
  21 |         .isVisible()
  22 |         .catch(() => false));
  23 |     expect(hasTerminal).toBeTruthy();
  24 |     await expect(skeleton).not.toBeVisible();
> 25 |   }).toPass({ timeout: timeoutMs });
     |      ^ Error: expect(received).toBeTruthy()
  26 |
  27 |   return (await scroll.isVisible().catch(() => false))
  28 |     ? { state: "scroll" }
  29 |     : { state: "empty" };
  30 | }
  31 |
  32 | /** Wait for either valid terminal Feed state — never skip navigation tests on empty. */
  33 | export async function requireExploreNavigationReady(
  34 |   page: Page,
  35 |   timeoutMs = 60_000
  36 | ): Promise<ExploreFeedReadiness> {
  37 |   return waitExploreFeedReady(page, timeoutMs);
  38 | }
  39 |
  40 | /** Use only when the scenario genuinely requires reel clips on screen. */
  41 | export async function requirePopulatedExploreFeed(
  42 |   page: Page,
  43 |   timeoutMs = 60_000
  44 | ): Promise<void> {
  45 |   const readiness = await waitExploreFeedReady(page, timeoutMs);
  46 |   expect(
  47 |     readiness.state,
  48 |     "Scenario requires populated Feed (explore-feed-scroll)"
  49 |   ).toBe("scroll");
  50 | }
  51 |
```
