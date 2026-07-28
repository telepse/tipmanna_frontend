# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: single-path-my-communities-proof.spec.ts >> single-path My Communities proof >> Feed → My Communities ×10 fresh contexts
- Location: e2e\single-path-my-communities-proof.spec.ts:202:7

# Error details

```
Error: Expected 10/10, got 0/10

expect(received).toBe(expected) // Object.is equality

Expected: 10
Received: 0
```

# Test source

```ts
  131 |       run: runIndex,
  132 |       pass,
  133 |       firstDivergence,
  134 |       finalUrl,
  135 |       tabParam,
  136 |       uiMyCommunities,
  137 |       proofLogs,
  138 |       rscEvents,
  139 |       backForwardOk,
  140 |     };
  141 |   } catch (e) {
  142 |     return {
  143 |       run: runIndex,
  144 |       pass: false,
  145 |       firstDivergence:
  146 |         firstDivergence ?? (e instanceof Error ? e.message : String(e)),
  147 |       finalUrl: page.url(),
  148 |       tabParam: new URL(page.url()).searchParams.get("tab"),
  149 |       uiMyCommunities: false,
  150 |       proofLogs,
  151 |       rscEvents,
  152 |       backForwardOk: false,
  153 |     };
  154 |   } finally {
  155 |     await page.close();
  156 |   }
  157 | }
  158 |
  159 | function classifyFailure(
  160 |   proofLogs: string[],
  161 |   rscEvents: RscEvent[],
  162 |   tabParam: string | null,
  163 |   uiMyCommunities: boolean
  164 | ): string {
  165 |   const failedRsc = rscEvents.find(
  166 |     e => e.failed || (e.status && e.status >= 400)
  167 |   );
  168 |   if (failedRsc) {
  169 |     return failedRsc.failed
  170 |       ? `router-push-rsc-aborted:${failedRsc.error ?? "unknown"}`
  171 |       : `rsc-http-${failedRsc.status}`;
  172 |   }
  173 |
  174 |   const clickLog = proofLogs.find(l => l.includes("click-my-communities"));
  175 |   if (!clickLog) return "click-handler-did-not-run";
  176 |
  177 |   const pushLog = proofLogs.find(l => l.includes("router.push"));
  178 |   if (!pushLog) {
  179 |     const equalGuard = proofLogs.find(
  180 |       l => l.includes("commitExploreUrl") && l.includes("hrefsEqual")
  181 |     );
  182 |     if (equalGuard?.includes("true")) return "equality-guard-suppressed-push";
  183 |     return "router-push-not-called";
  184 |   }
  185 |
  186 |   if (uiMyCommunities && tabParam !== "my-communities") {
  187 |     const passive = proofLogs.some(
  188 |       l => l.includes("router.replace") && l.includes("passive-sync")
  189 |     );
  190 |     if (passive) return "passive-replace-overwrote-url";
  191 |     const mount = proofLogs.some(l => l.includes("mount-canonical-replace"));
  192 |     if (mount) return "mount-canonical-replace-race";
  193 |     const restore = proofLogs.some(l => l.includes("url-restore-apply"));
  194 |     if (restore) return "url-restore-overwrote-state";
  195 |     return "browser-url-never-committed";
  196 |   }
  197 |
  198 |   return "tab-param-missing";
  199 | }
  200 |
  201 | test.describe("single-path My Communities proof", () => {
  202 |   test("Feed → My Communities ×10 fresh contexts", async ({ browser }) => {
  203 |     test.setTimeout(20 * 60_000);
  204 |
  205 |     const results: RunResult[] = [];
  206 |     for (let i = 1; i <= 10; i++) {
  207 |       const context = await browser.newContext();
  208 |       results.push(await runSinglePath(context, i));
  209 |       await context.close();
  210 |     }
  211 |
  212 |     console.info(
  213 |       "[single-path-proof] SUMMARY",
  214 |       JSON.stringify(
  215 |         results.map(r => ({
  216 |           run: r.run,
  217 |           pass: r.pass,
  218 |           firstDivergence: r.firstDivergence,
  219 |           finalUrl: r.finalUrl,
  220 |           tabParam: r.tabParam,
  221 |           uiMyCommunities: r.uiMyCommunities,
  222 |           rscFailed: r.rscEvents.filter(e => e.failed).length,
  223 |           backForwardOk: r.backForwardOk,
  224 |         })),
  225 |         null,
  226 |         2
  227 |       )
  228 |     );
  229 |
  230 |     const passCount = results.filter(r => r.pass).length;
> 231 |     expect(passCount, `Expected 10/10, got ${passCount}/10`).toBe(10);
      |                                                              ^ Error: Expected 10/10, got 0/10
  232 |   });
  233 | });
  234 |
```
