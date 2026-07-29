# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: explore-native-history.spec.ts >> explore native history — formal matrix >> community and join >> community selection via picker (10x)
- Location: e2e\explore-native-history.spec.ts:270:9

# Error details

```
TimeoutError: locator.click: Timeout 15000ms exceeded.
Call log:
  - waiting for getByRole('menuitemcheckbox', { name: 'E2E Community' })

```

# Page snapshot

```yaml
- generic:
  - region "Notification messages"
  - alert
  - generic:
    - banner:
      - heading [level=1]: Tipmanna TV — Explore and discover community media
      - generic:
        - link:
          - /url: /explore
          - text: tipmanna
        - button:
          - img
      - generic:
        - button:
          - textbox:
            - /placeholder: Search videos...
          - img
        - generic:
          - generic: 0 watching live
    - generic:
      - generic:
        - generic:
          - button:
            - img
          - generic: Create
        - button: Feed
        - button: Start Community
        - button:
          - generic:
            - img
          - generic: Not signed in
    - generic:
      - generic:
        - generic:
          - generic:
            - generic:
              - button: Trends
              - button: Saves
              - button: TV
              - button: Community
            - generic:
              - button [expanded]:
                - generic: My Communities
          - button:
            - img
        - generic:
          - paragraph:
            - text: Clips come from each community's approved bank. Turn feed inclusion on or off under
            - link:
              - /url: /explore?tab=my-communities
              - text: Communities
            - text: .
      - generic:
        - generic:
          - generic:
            - paragraph: Sign in to browse community clips in Explore.
            - button: Sign in
  - menu "My Communities" [active] [ref=e1]:
    - generic [ref=e2]: Communities in Explore feed
    - separator [ref=e3]
    - generic [ref=e4]:
      - text: Join a community with an active membership .
      - text: Explore new communities on the
      - button "Communities" [ref=e5]
      - text: page.
```

# Test source

```ts
  181 |           await expectFeedTab(page, sequence[j]);
  182 |         }
  183 |       }
  184 |     });
  185 | 
  186 |     test("rapid sequence final state (10x)", async ({ page }) => {
  187 |       for (let i = 0; i < REPEAT; i++) {
  188 |         await gotoWithInstr(page, "/explore?feedTab=trends");
  189 |         await resetExploreHistoryMetrics(page);
  190 |         await page.getByTestId("explore-subtab-saves").click();
  191 |         await page.getByTestId("explore-subtab-tv").click();
  192 |         await page.getByTestId("explore-subtab-community").click();
  193 |         await expectFeedTab(page, "community");
  194 |         const instr = await readExploreHistoryMetrics(page);
  195 |         expect(instr.pushState).toBeGreaterThanOrEqual(3);
  196 |       }
  197 |     });
  198 |   });
  199 | 
  200 |   test.describe("Discover matrix", () => {
  201 |     test("panel expand back forward feed refresh (10x)", async ({ page }) => {
  202 |       for (let i = 0; i < REPEAT; i++) {
  203 |         await gotoWithInstr(page, "/explore?feedTab=saves&feedTypes=COMEDY");
  204 |         const search = page.locator(
  205 |           'input[placeholder="Search videos..."]:visible'
  206 |         );
  207 |         await search.fill("music");
  208 |         await search.press("Enter");
  209 |         await expect(
  210 |           page.getByRole("dialog", { name: "Discover" })
  211 |         ).toBeVisible({
  212 |           timeout: 15_000,
  213 |         });
  214 |         await resetExploreHistoryMetrics(page);
  215 |         await page.getByTestId("discover-panel-expand").click();
  216 |         await expect
  217 |           .poll(() => sp(page.url()).get("tab"), { timeout: 2_000 })
  218 |           .toBe("discover");
  219 |         expect(page.url()).not.toContain("/discover");
  220 |         const instr = await readExploreHistoryMetrics(page);
  221 |         expect(instr.pushState).toBe(1);
  222 |         await page.goBack();
  223 |         await expect
  224 |           .poll(() => sp(page.url()).get("tab"), { timeout: 2_000 })
  225 |           .not.toBe("discover");
  226 |         await page.goForward();
  227 |         await expect
  228 |           .poll(() => sp(page.url()).get("tab"), { timeout: 2_000 })
  229 |           .toBe("discover");
  230 |         await page.reload({ waitUntil: "commit", timeout: 60_000 });
  231 |         await requireExploreNavigationReady(page, 60_000);
  232 |         expect(sp(page.url()).get("tab")).toBe("discover");
  233 |         await page.getByTestId("explore-chrome-feed").click();
  234 |         await expect
  235 |           .poll(() => sp(page.url()).get("tab"), { timeout: 2_000 })
  236 |           .toBeNull();
  237 |         expect(sp(page.url()).get("feedTab")).toBe("saves");
  238 |       }
  239 |     });
  240 | 
  241 |     test("Discover reachable with empty Feed terminal (10x)", async ({
  242 |       page,
  243 |     }) => {
  244 |       for (let i = 0; i < REPEAT; i++) {
  245 |         await installExploreHistoryInstrumentation(page);
  246 |         await gotoExplore(page, "/explore");
  247 |         const readiness = await requireExploreNavigationReady(page, 60_000);
  248 |         expect(["scroll", "empty"]).toContain(readiness.state);
  249 |         await page.getByTestId("explore-chrome-start-community").click();
  250 |         await expect
  251 |           .poll(() => sp(page.url()).get("tab"), { timeout: 2_000 })
  252 |           .toBe("my-communities");
  253 |       }
  254 |     });
  255 | 
  256 |     test("Discover tag selection scoped (10x)", async ({ page }) => {
  257 |       for (let i = 0; i < REPEAT; i++) {
  258 |         await gotoWithInstr(page, "/explore?tab=discover");
  259 |         const row = discoverTagRow(page);
  260 |         await row.getByRole("button", { name: "Concert", exact: true }).click();
  261 |         await row.getByRole("button", { name: "Comedy", exact: true }).click();
  262 |         await expect(page.getByText("Results for 'Comedy'")).toBeVisible({
  263 |           timeout: 15_000,
  264 |         });
  265 |       }
  266 |     });
  267 |   });
  268 | 
  269 |   test.describe("community and join", () => {
  270 |     test("community selection via picker (10x)", async ({ page }) => {
  271 |       for (let i = 0; i < REPEAT; i++) {
  272 |         await gotoWithInstr(page, "/explore");
  273 |         await page.getByTestId("explore-subtab-community").click();
  274 |         await expectFeedTab(page, "community");
  275 |         await page
  276 |           .getByRole("button", { name: /My Communities|\d+ communit/i })
  277 |           .first()
  278 |           .click();
  279 |         await page
  280 |           .getByRole("menuitemcheckbox", { name: "E2E Community" })
> 281 |           .click({ timeout: 15_000 });
      |            ^ TimeoutError: locator.click: Timeout 15000ms exceeded.
  282 |         await expect
  283 |           .poll(() => sp(page.url()).get("communities"), { timeout: 2_000 })
  284 |           .toContain(E2E_SELECT_COMMUNITY_ID);
  285 |         await page.goBack();
  286 |         await page.goForward();
  287 |         await expect
  288 |           .poll(() => sp(page.url()).get("communities"), { timeout: 2_000 })
  289 |           .toContain(E2E_SELECT_COMMUNITY_ID);
  290 |         await page.reload({ waitUntil: "commit", timeout: 60_000 });
  291 |         await requireExploreNavigationReady(page, 60_000);
  292 |         expect(sp(page.url()).get("communities")).toContain(
  293 |           E2E_SELECT_COMMUNITY_ID
  294 |         );
  295 |       }
  296 |     });
  297 | 
  298 |     for (const origin of ["trends", "saves", "tv", "community"] as const) {
  299 |       test(`join from ${origin} (10x)`, async ({ page }) => {
  300 |         const paths = {
  301 |           trends: "/explore",
  302 |           saves: "/explore?feedTab=saves",
  303 |           tv: "/explore?feedTab=tv&e2eTv=1",
  304 |           community: "/explore?feedTab=community",
  305 |         };
  306 |         for (let i = 0; i < REPEAT; i++) {
  307 |           const feedTab = sp(paths[origin]).get("feedTab") ?? "trends";
  308 |           await gotoExplore(
  309 |             page,
  310 |             withE2eFixtures(
  311 |               `/explore?tab=join&joinCommunity=${E2E_JOIN_COMMUNITY_ID}&feedTab=${feedTab}${origin === "tv" ? "&e2eTv=1" : ""}`
  312 |             )
  313 |           );
  314 |           await requireExploreNavigationReady(page, 60_000);
  315 |           expect(sp(page.url()).get("tab")).toBe("join");
  316 |           expect(sp(page.url()).get("joinCommunity")).toBe(
  317 |             E2E_JOIN_COMMUNITY_ID
  318 |           );
  319 |           await page.getByTestId("explore-chrome-feed").click();
  320 |           await expect
  321 |             .poll(() => sp(page.url()).get("tab"), { timeout: 2_000 })
  322 |             .toBeNull();
  323 |           expect(sp(page.url()).get("feedTab") ?? "trends").toBe(feedTab);
  324 |         }
  325 |       });
  326 |     }
  327 |   });
  328 | 
  329 |   test.describe("deep-link refresh grid", () => {
  330 |     const links = [
  331 |       "/explore",
  332 |       "/explore?feedTab=saves",
  333 |       "/explore?feedTab=tv&e2eTv=1",
  334 |       "/explore?feedTab=community",
  335 |       "/explore?tab=my-communities",
  336 |       "/explore?tab=discover",
  337 |       "/explore?feedTypes=COMEDY&feedTab=saves",
  338 |       `/explore?feedTab=community&communities=${E2E_SELECT_COMMUNITY_ID}`,
  339 |       `/explore?tab=join&joinCommunity=${E2E_JOIN_COMMUNITY_ID}&feedTab=tv&e2eTv=1`,
  340 |     ].map(withE2eFixtures);
  341 | 
  342 |     for (const link of links) {
  343 |       test(`refresh preserves ${link}`, async ({ page }) => {
  344 |         test.setTimeout(240_000);
  345 |         for (let i = 0; i < REPEAT; i++) {
  346 |           await gotoExplore(page, link);
  347 |           await requireExploreNavigationReady(page, 60_000);
  348 |           const before = page.url();
  349 |           await page.reload({ waitUntil: "commit", timeout: 60_000 });
  350 |           await requireExploreNavigationReady(page, 60_000);
  351 |           const u0 = new URL(before);
  352 |           const u1 = new URL(page.url());
  353 |           expect(u1.pathname).toBe("/explore");
  354 |           for (const [k, v] of u0.searchParams.entries()) {
  355 |             expect(u1.searchParams.get(k)).toBe(v);
  356 |           }
  357 |         }
  358 |       });
  359 |     }
  360 |   });
  361 | 
  362 |   test.describe("session shell continuity", () => {
  363 |     test("feed shell survives My Communities and Discover (10x)", async ({
  364 |       page,
  365 |     }) => {
  366 |       for (let i = 0; i < REPEAT; i++) {
  367 |         await gotoWithInstr(page, "/explore");
  368 |         await requirePopulatedExploreFeed(page);
  369 |         const shell = page.getByTestId("explore-feed-shell");
  370 |         await expect(shell).toBeAttached();
  371 |         const handle = await shell.elementHandle();
  372 |         await page.getByTestId("explore-chrome-start-community").click();
  373 |         await expect(shell).toBeAttached();
  374 |         await page.getByTestId("explore-chrome-feed").click();
  375 |         await expect(shell).toBeAttached();
  376 |         expect(
  377 |           await page.evaluate(el => el?.isConnected ?? false, handle)
  378 |         ).toBe(true);
  379 |       }
  380 |     });
  381 |   });
```