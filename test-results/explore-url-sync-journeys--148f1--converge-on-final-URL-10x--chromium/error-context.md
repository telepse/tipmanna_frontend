# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: explore-url-sync-journeys.spec.ts >> explore URL sync journeys >> rapid sub-tab clicks after hydration converge on final URL (10x)
- Location: e2e\explore-url-sync-journeys.spec.ts:56:7

# Error details

```
Error: expect(received).toBeTruthy()

Received: false

Call Log:
- Timeout 60000ms exceeded while waiting on the predicate
```

# Page snapshot

```yaml
- generic [ref=e2]: Internal Server Error
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