/**
 * Staging/local Playwright tipper authentication helpers.
 * Never log returned codes or tokens.
 */
const backendBase =
  process.env.PLAYWRIGHT_BACKEND_URL?.replace(/\/$/, "") ??
  "http://127.0.0.1:8000";

export async function fetchE2eVerificationCode(
  email: string
): Promise<string | null> {
  if (process.env.TIPMANNA_E2E_AUTH_CODE !== "1") {
    const staticCode = process.env.PLAYWRIGHT_TIPPER_OTP_SECRET?.trim();
    if (staticCode && /^\d{6}$/.test(staticCode)) return staticCode;
    return null;
  }

  const url = `${backendBase}/api/v1/auth/e2e/verification-code?email=${encodeURIComponent(email)}`;
  for (let i = 0; i < 15; i++) {
    const res = await fetch(url, { signal: AbortSignal.timeout(5_000) });
    if (res.ok) {
      const data = (await res.json()) as { code?: string };
      if (typeof data.code === "string" && /^\d{6}$/.test(data.code)) {
        return data.code;
      }
      return null;
    }
    await new Promise(r => setTimeout(r, 1_000));
  }
  return null;
}

export async function fillOtpInputs(
  page: import("@playwright/test").Page,
  code: string
): Promise<void> {
  const digits = code.split("");
  const inputs = page.locator(".react-otp-input input");
  const count = await inputs.count();
  if (count >= 6) {
    for (let i = 0; i < 6; i++) {
      await inputs.nth(i).fill(digits[i] ?? "");
    }
    return;
  }
  await page.locator(".react-otp-input input").first().fill(code);
}
