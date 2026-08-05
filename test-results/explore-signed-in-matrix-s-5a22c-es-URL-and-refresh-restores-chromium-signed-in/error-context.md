# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: explore-signed-in-matrix.spec.ts >> signed-in explore matrix >> Community picker updates URL and refresh restores
- Location: e2e\explore-signed-in-matrix.spec.ts:109:7

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
        - heading "Explore ran into a problem" [level=1] [ref=e4]
        - paragraph [ref=e5]: Failed to load chunk /_next/static/chunks/e000f71118a274a1.js from module 701587
        - generic [ref=e6]:
            - button "Try again" [ref=e7]
            - link "Go home" [ref=e8] [cursor=pointer]:
                - /url: /explore
```

# Test source

```ts
  1  | import { expect, type Page } from "@playwright/test";
  2  |
  3  | export type ExploreFeedReadiness = { state: "scroll" } | { state: "empty" };
  4  |
  5  | /** Terminal feed states per Endless Feed Contract / STAB-1 boot resilience. */
  6  | export async function waitExploreFeedReady(
  7  |   page: Page,
  8  |   timeoutMs = 45_000
  9  | ): Promise<ExploreFeedReadiness> {
  10 |   const scroll = page.getByTestId("explore-feed-scroll");
  11 |   const emptyCopy = page.getByText(
  12 |     /no clips available|sign in to browse|sign in as a tipper|save at least three videos|choose one or more communities/i
  13 |   );
  14 |   const skeleton = page.getByTestId("explore-feed-skeleton");
  15 |
  16 |   await expect(async () => {
  17 |     const url = new URL(page.url(), "http://localhost");
  18 |     const feedTab = url.searchParams.get("feedTab");
  19 |     const urlTab = url.searchParams.get("tab");
  20 |     const shellAttached =
  21 |       (await page.getByTestId("explore-feed-shell").count()) > 0;
  22 |     const tvTerminal =
  23 |       feedTab === "tv" &&
  24 |       shellAttached &&
  25 |       (await page
  26 |         .getByTestId("explore-subtab-tv")
  27 |         .evaluate(el => el.className.includes("bg-white"))
  28 |         .catch(() => false));
  29 |     const discoverTerminal = urlTab === "discover" && shellAttached;
  30 |     const myCommunitiesTerminal =
  31 |       urlTab === "my-communities" &&
  32 |       (await page
  33 |         .getByRole("heading", { name: /^Communities$/i })
  34 |         .isVisible()
  35 |         .catch(() => false));
  36 |     const joinTerminal =
  37 |       urlTab === "join" &&
  38 |       (await page
  39 |         .getByRole("heading", { name: /E2E Join Community/i })
  40 |         .isVisible()
  41 |         .catch(() => false));
  42 |     const hasTerminal =
  43 |       discoverTerminal ||
  44 |       myCommunitiesTerminal ||
  45 |       joinTerminal ||
  46 |       tvTerminal ||
  47 |       (await scroll.isVisible().catch(() => false)) ||
  48 |       (await emptyCopy
  49 |         .first()
  50 |         .isVisible()
  51 |         .catch(() => false));
  52 |     expect(hasTerminal).toBeTruthy();
  53 |     await expect(skeleton).not.toBeVisible();
> 54 |   }).toPass({ timeout: timeoutMs });
     |      ^ Error: expect(received).toBeTruthy()
  55 |
  56 |   const feedTab = new URL(page.url(), "http://localhost").searchParams.get(
  57 |     "feedTab"
  58 |   );
  59 |   const urlTab = new URL(page.url(), "http://localhost").searchParams.get(
  60 |     "tab"
  61 |   );
  62 |   if (
  63 |     urlTab === "discover" ||
  64 |     urlTab === "my-communities" ||
  65 |     feedTab === "tv" ||
  66 |     urlTab === "join"
  67 |   ) {
  68 |     return { state: "empty" };
  69 |   }
  70 |
  71 |   return (await scroll.isVisible().catch(() => false))
  72 |     ? { state: "scroll" }
  73 |     : { state: "empty" };
  74 | }
  75 |
  76 | /** Wait for either valid terminal Feed state — never skip navigation tests on empty. */
  77 | export async function requireExploreNavigationReady(
  78 |   page: Page,
  79 |   timeoutMs = 60_000
  80 | ): Promise<ExploreFeedReadiness> {
  81 |   return waitExploreFeedReady(page, timeoutMs);
  82 | }
  83 |
  84 | /** Use only when the scenario genuinely requires reel clips on screen. */
  85 | export async function requirePopulatedExploreFeed(
  86 |   page: Page,
  87 |   timeoutMs = 60_000
  88 | ): Promise<void> {
  89 |   const scroll = page.getByTestId("explore-feed-scroll");
  90 |   await expect(async () => {
  91 |     await waitExploreFeedReady(page, 15_000);
  92 |     await expect(scroll).toBeVisible();
  93 |   }).toPass({ timeout: timeoutMs });
  94 | }
  95 |
```
