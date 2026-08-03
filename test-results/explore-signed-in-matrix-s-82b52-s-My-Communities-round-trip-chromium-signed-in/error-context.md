# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: explore-signed-in-matrix.spec.ts >> signed-in explore matrix >> Feed reel index survives My Communities round-trip
- Location: e2e\explore-signed-in-matrix.spec.ts:238:7

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
                - button "Open Discover panel" [ref=e8] [cursor=pointer]:
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
        - generic [ref=e37]:
            - banner [ref=e38]:
                - heading "Communities" [level=1] [ref=e39]
                - paragraph [ref=e40]: Search new communities to join. Sign in to send a start community request and view your memberships.
            - generic [ref=e41]:
                - generic [ref=e42]:
                    - generic [ref=e43]:
                        - generic [ref=e44]: Search
                        - generic [ref=e45]: "0"
                        - text: communities
                    - button "Browse all A–Z" [ref=e46] [cursor=pointer]
                - textbox "Search 0 communities" [ref=e47]:
                    - /placeholder: Type to search…
                - paragraph [ref=e48]: fetch failed
            - generic [ref=e49]:
                - generic [ref=e50]:
                    - heading "Top communities" [level=2] [ref=e51]
                    - paragraph [ref=e52]: Ranked by total tips received.
                - paragraph [ref=e53]: No active communities to rank yet.
            - generic [ref=e54]:
                - heading "Communities you own" [level=2] [ref=e56]
                - generic [ref=e57]:
                    - paragraph [ref=e58]: No communities detected on your account.
                    - paragraph [ref=e59]: Send a request to start another community
                    - button "Start community" [ref=e60] [cursor=pointer]
            - generic [ref=e61]:
                - generic [ref=e62]:
                    - heading "Your memberships" [level=5] [ref=e63]
                    - button "Refresh" [disabled]
                - generic [ref=e65]:
                    - heading "Default system community" [level=3] [ref=e66]
                    - list [ref=e67]:
                        - listitem [ref=e68]:
                            - generic [ref=e69]:
                                - paragraph [ref=e70]: Tipmanna
                                - paragraph [ref=e71]: Public hub — everyone can explore Tipmanna content.
                            - link:
                                - /url: /partner
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
