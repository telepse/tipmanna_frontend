# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: feed-boot-stability-proof.spec.ts >> Feed boot stability (backend path proof) >> 20 fresh contexts reach Feed readiness
- Location: e2e\feed-boot-stability-proof.spec.ts:8:7

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  -   1
+ Received  + 192

- Array []
+ Array [
+   Object {
+     "bootMs": 90767,
+     "error": "expect(received).toBeTruthy()
+
+ Received: false
+
+ Call Log:
+ - Timeout 90000ms exceeded while waiting on the predicate",
+     "run": 1,
+     "state": "fail",
+   },
+   Object {
+     "bootMs": 89928,
+     "error": "expect(received).toBeTruthy()
+
+ Received: false
+
+ Call Log:
+ - Timeout 90000ms exceeded while waiting on the predicate",
+     "run": 2,
+     "state": "fail",
+   },
+   Object {
+     "bootMs": 89605,
+     "error": "expect(received).toBeTruthy()
+
+ Received: false
+
+ Call Log:
+ - Timeout 90000ms exceeded while waiting on the predicate",
+     "run": 3,
+     "state": "fail",
+   },
+   Object {
+     "bootMs": 89999,
+     "error": "expect(received).toBeTruthy()
+
+ Received: false
+
+ Call Log:
+ - Timeout 90000ms exceeded while waiting on the predicate",
+     "run": 4,
+     "state": "fail",
+   },
+   Object {
+     "bootMs": 89393,
+     "error": "expect(received).toBeTruthy()
+
+ Received: false
+
+ Call Log:
+ - Timeout 90000ms exceeded while waiting on the predicate",
+     "run": 5,
+     "state": "fail",
+   },
+   Object {
+     "bootMs": 89335,
+     "error": "expect(received).toBeTruthy()
+
+ Received: false
+
+ Call Log:
+ - Timeout 90000ms exceeded while waiting on the predicate",
+     "run": 6,
+     "state": "fail",
+   },
+   Object {
+     "bootMs": 90031,
+     "error": "expect(received).toBeTruthy()
+
+ Received: false
+
+ Call Log:
+ - Timeout 90000ms exceeded while waiting on the predicate",
+     "run": 7,
+     "state": "fail",
+   },
+   Object {
+     "bootMs": 89828,
+     "error": "expect(received).toBeTruthy()
+
+ Received: false
+
+ Call Log:
+ - Timeout 90000ms exceeded while waiting on the predicate",
+     "run": 8,
+     "state": "fail",
+   },
+   Object {
+     "bootMs": 89559,
+     "error": "expect(received).toBeTruthy()
+
+ Received: false
+
+ Call Log:
+ - Timeout 90000ms exceeded while waiting on the predicate",
+     "run": 9,
+     "state": "fail",
+   },
+   Object {
+     "bootMs": 89690,
+     "error": "expect(received).toBeTruthy()
+
+ Received: false
+
+ Call Log:
+ - Timeout 90000ms exceeded while waiting on the predicate",
+     "run": 10,
+     "state": "fail",
+   },
+   Object {
+     "bootMs": 89648,
+     "error": "expect(received).toBeTruthy()
+
+ Received: false
+
+ Call Log:
+ - Timeout 90000ms exceeded while waiting on the predicate",
+     "run": 11,
+     "state": "fail",
+   },
+   Object {
+     "bootMs": 89381,
+     "error": "expect(received).toBeTruthy()
+
+ Received: false
+
+ Call Log:
+ - Timeout 90000ms exceeded while waiting on the predicate",
+     "run": 12,
+     "state": "fail",
+   },
+   Object {
+     "bootMs": 90096,
+     "error": "expect(received).toBeTruthy()
+
+ Received: false
+
+ Call Log:
+ - Timeout 90000ms exceeded while waiting on the predicate",
+     "run": 13,
+     "state": "fail",
+   },
+   Object {
+     "bootMs": 89181,
+     "error": "expect(received).toBeTruthy()
+
+ Received: false
+
+ Call Log:
+ - Timeout 90000ms exceeded while waiting on the predicate",
+     "run": 14,
+     "state": "fail",
+   },
+   Object {
+     "bootMs": 37914,
+     "error": "aborted RSC: net::ERR_ABORTED; net::ERR_ABORTED",
+     "run": 15,
+     "state": "fail",
+   },
+   Object {
+     "bootMs": 15736,
+     "error": "aborted RSC: net::ERR_ABORTED; net::ERR_ABORTED",
+     "run": 16,
+     "state": "fail",
+   },
+   Object {
+     "bootMs": 83513,
+     "error": "aborted RSC: net::ERR_ABORTED; net::ERR_ABORTED; net::ERR_ABORTED; net::ERR_ABORTED; net::ERR_ABORTED; net::ERR_ABORTED; net::ERR_ABORTED",
+     "run": 17,
+     "state": "fail",
+   },
+   Object {
+     "bootMs": 19992,
+     "error": "aborted RSC: net::ERR_ABORTED; net::ERR_ABORTED",
+     "run": 18,
+     "state": "fail",
+   },
+   Object {
+     "bootMs": 19928,
+     "error": "aborted RSC: net::ERR_ABORTED; net::ERR_ABORTED",
+     "run": 19,
+     "state": "fail",
+   },
+   Object {
+     "bootMs": 18725,
+     "error": "aborted RSC: net::ERR_ABORTED",
+     "run": 20,
+     "state": "fail",
+   },
+ ]
```

# Test source

```ts
  1  | import { test, expect, chromium } from "@playwright/test";
  2  | import { waitExploreFeedReady } from "./helpers/wait-explore-feed-ready";
  3  |
  4  | const BOOT_RUNS = 20;
  5  | const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
  6  |
  7  | test.describe("Feed boot stability (backend path proof)", () => {
  8  |   test("20 fresh contexts reach Feed readiness", async () => {
  9  |     test.setTimeout(BOOT_RUNS * 120_000);
  10 |
  11 |     const results: Array<{
  12 |       run: number;
  13 |       state: "scroll" | "empty" | "fail";
  14 |       bootMs: number;
  15 |       error?: string;
  16 |     }> = [];
  17 |
  18 |     for (let run = 1; run <= BOOT_RUNS; run++) {
  19 |       const browser = await chromium.launch();
  20 |       const context = await browser.newContext();
  21 |       const page = await context.newPage();
  22 |
  23 |       const rscAborts: string[] = [];
  24 |       page.on("requestfailed", req => {
  25 |         const u = req.url();
  26 |         if (u.includes("/explore") && req.method() === "POST") {
  27 |           rscAborts.push(req.failure()?.errorText ?? "unknown");
  28 |         }
  29 |       });
  30 |
  31 |       const started = Date.now();
  32 |       let state: "scroll" | "empty" | "fail" = "fail";
  33 |       let error: string | undefined;
  34 |
  35 |       try {
  36 |         await page.goto(`${baseURL}/explore`, { waitUntil: "domcontentloaded" });
  37 |         state = await waitExploreFeedReady(page, 90_000);
  38 |         const skeletonVisible = await page
  39 |           .getByTestId("explore-feed-skeleton")
  40 |           .isVisible()
  41 |           .catch(() => false);
  42 |         expect(skeletonVisible).toBe(false);
  43 |         if (rscAborts.length > 0) {
  44 |           throw new Error(`aborted RSC: ${rscAborts.join("; ")}`);
  45 |         }
  46 |       } catch (e) {
  47 |         error = e instanceof Error ? e.message : String(e);
  48 |         state = "fail";
  49 |       }
  50 |
  51 |       results.push({
  52 |         run,
  53 |         state,
  54 |         bootMs: Date.now() - started,
  55 |         error,
  56 |       });
  57 |
  58 |       await context.close();
  59 |       await browser.close();
  60 |     }
  61 |
  62 |     const ok = results.filter(r => r.state !== "fail");
  63 |     const bootMs = ok.map(r => r.bootMs).sort((a, b) => a - b);
  64 |     const median =
  65 |       bootMs.length === 0
  66 |         ? 0
  67 |         : bootMs.length % 2 === 0
  68 |           ? Math.round(
  69 |               (bootMs[bootMs.length / 2 - 1] + bootMs[bootMs.length / 2]) / 2
  70 |             )
  71 |           : bootMs[Math.floor(bootMs.length / 2)];
  72 |
  73 |     console.info(
  74 |       "[feed-boot-stability-proof] SUMMARY",
  75 |       JSON.stringify({
  76 |         pass: ok.length,
  77 |         fail: results.length - ok.length,
  78 |         minMs: bootMs[0] ?? null,
  79 |         medianMs: median,
  80 |         maxMs: bootMs[bootMs.length - 1] ?? null,
  81 |         failures: results.filter(r => r.state === "fail"),
  82 |       })
  83 |     );
  84 |
> 85 |     expect(results.filter(r => r.state === "fail")).toEqual([]);
     |                                                     ^ Error: expect(received).toEqual(expected) // deep equality
  86 |   });
  87 | });
  88 |
```
