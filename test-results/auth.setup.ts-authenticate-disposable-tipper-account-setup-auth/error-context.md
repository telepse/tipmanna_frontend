# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.setup.ts >> authenticate disposable tipper account
- Location: e2e\auth.setup.ts:33:6

# Error details

```
Error: helper unavailable (not found — check deployment flags/allowlist)
```

# Page snapshot

```yaml
- generic [ref=e1]:
    - region "Notification messages":
        - alert [ref=e3] [cursor=pointer]:
            - img [ref=e5]
            - text: Tipper signed in successfully
            - button "close" [ref=e7]:
                - img [ref=e8]
            - progressbar "notification timer" [ref=e12]
    - alert [ref=e13]
    - generic [ref=e14]:
        - link "Back" [ref=e15] [cursor=pointer]:
            - /url: /create-account
            - img [ref=e16]
            - text: Back
        - generic [ref=e18]:
            - heading "Verify your email" [level=1] [ref=e19]
            - paragraph [ref=e20]:
                - text: We've sent a 6-digit code to
                - strong [ref=e21]: metiyir535@applamos.com
                - text: .
                - text: Enter it below to verify your account.
            - generic [ref=e23]:
                - textbox "Please enter OTP character 1" [active] [ref=e24]
                - textbox "Please enter OTP character 2" [ref=e25]
                - textbox "Please enter OTP character 3" [ref=e26]
                - textbox "Please enter OTP character 4" [ref=e27]
                - textbox "Please enter OTP character 5" [ref=e28]
                - textbox "Please enter OTP character 6" [ref=e29]
            - button "Verify email" [disabled]:
                - generic: Verify email
            - paragraph [ref=e30]:
                - text: Didn't receive the code?
                - button "Resend code" [ref=e31] [cursor=pointer]
```

# Test source

```ts
  1  | /**
  2  |  * Staging-only authenticated Playwright setup.
  3  |  *
  4  |  * Required environment:
  5  |  * - PLAYWRIGHT_AUTH_E2E=1
  6  |  * - PLAYWRIGHT_TIPPER_EMAIL
  7  |  * - PLAYWRIGHT_BASE_URL (staging frontend)
  8  |  * - PLAYWRIGHT_BACKEND_URL (staging API root, no /api/v1 suffix)
  9  |  *
  10 |  * Verification code (one of):
  11 |  * - Protected staging helper: TIPMANNA_E2E_AUTH_CODE=1 + PLAYWRIGHT_E2E_AUTH_HELPER_SECRET
  12 |  * - Local helper: TIPMANNA_E2E_AUTH_CODE=1 on non-production backend
  13 |  * - PLAYWRIGHT_TIPPER_OTP_SECRET as a 6-digit staging code
  14 |  *
  15 |  * Never commit `.auth/tipper.json`.
  16 |  */
  17 | import { mkdirSync } from "node:fs";
  18 | import path from "node:path";
  19 | import { test as setup, expect } from "@playwright/test";
  20 |
  21 | import {
  22 |   fetchE2eVerificationCode,
  23 |   fillOtpInputs,
  24 |   reportAuthEnvPresence,
  25 | } from "./helpers/auth-tipper-setup";
  26 | import {
  27 |   hostnameFromUrl,
  28 |   resolvePlaywrightBackendRoot,
  29 | } from "./helpers/playwright-backend-config";
  30 |
  31 | const authFile = path.join(__dirname, "../.auth/tipper.json");
  32 |
  33 | setup("authenticate disposable tipper account", async ({ page }) => {
  34 |   setup.skip(
  35 |     process.env.PLAYWRIGHT_AUTH_E2E !== "1",
  36 |     "Set PLAYWRIGHT_AUTH_E2E=1 for authenticated E2E"
  37 |   );
  38 |
  39 |   const email = process.env.PLAYWRIGHT_TIPPER_EMAIL?.trim();
  40 |   setup.skip(!email, "PLAYWRIGHT_TIPPER_EMAIL is required");
  41 |
  42 |   const backendResolution = resolvePlaywrightBackendRoot();
  43 |   if (!backendResolution.ok) {
  44 |     throw new Error(backendResolution.reason);
  45 |   }
  46 |
  47 |   console.info(
  48 |     JSON.stringify({
  49 |       event: "auth_setup_env",
  50 |       env: reportAuthEnvPresence(),
  51 |       frontendHost: hostnameFromUrl(process.env.PLAYWRIGHT_BASE_URL),
  52 |       backendHost: hostnameFromUrl(backendResolution.backendRoot),
  53 |     })
  54 |   );
  55 |
  56 |   await page.goto("/sign-in");
  57 |   await page.getByTestId("signin-tab-tipper").click();
  58 |   await page.getByLabel(/^email$/i).fill(email as string);
  59 |   await page.getByTestId("signin-tipper-submit").click();
  60 |
  61 |   await expect(page).toHaveURL(/\/verify-email/, { timeout: 30_000 });
  62 |
  63 |   const codeResult = await fetchE2eVerificationCode(email as string);
  64 |   console.info(
  65 |     JSON.stringify({
  66 |       event: "auth_setup_code_fetch",
  67 |       method: codeResult.method,
  68 |       backendHost: codeResult.backendHost,
  69 |       httpStatus: codeResult.httpStatus ?? null,
  70 |       error: codeResult.error ?? null,
  71 |     })
  72 |   );
  73 |
  74 |   if (!codeResult.code) {
> 75 |     throw new Error(
     |           ^ Error: helper unavailable (not found — check deployment flags/allowlist)
  76 |       codeResult.error ??
  77 |         "Could not obtain staging verification code (helper/inbox unavailable)"
  78 |     );
  79 |   }
  80 |
  81 |   await fillOtpInputs(page, codeResult.code);
  82 |   await page.getByRole("button", { name: /verify email/i }).click();
  83 |
  84 |   await expect(page).not.toHaveURL(/\/verify-email/, { timeout: 30_000 });
  85 |
  86 |   await page.goto("/explore");
  87 |   await expect(page.getByTestId("explore-feed-scroll")).toBeVisible({
  88 |     timeout: 60_000,
  89 |   });
  90 |
  91 |   mkdirSync(path.dirname(authFile), { recursive: true });
  92 |   await page.context().storageState({ path: authFile });
  93 | });
  94 |
```
