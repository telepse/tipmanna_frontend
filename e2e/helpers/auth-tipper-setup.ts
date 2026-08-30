/**
 * Staging/local Playwright tipper authentication helpers.
 * Never log returned codes, tokens, emails or secrets.
 */
import {
  assertPlaywrightBackendAligned,
  hostnameFromUrl,
} from "./playwright-backend-config";

const E2E_HELPER_HEADER = "x-tipmanna-e2e-auth-secret";

export type VerificationCodeFetchResult = {
  code: string | null;
  method: "static-otp" | "backend-helper" | "none";
  backendHost: string | null;
  httpStatus?: number;
  reason?: string;
  error?: string;
};

function backendRootForAuth(): string {
  const resolution = assertPlaywrightBackendAligned();

  if (!resolution.ok) {
    throw new Error(
      `Playwright backend configuration is invalid: ${resolution.reason}`
    );
  }

  return resolution.backendRoot;
}

export async function fetchE2eVerificationCode(
  _email: string
): Promise<VerificationCodeFetchResult> {
  const backendHost = hostnameFromUrl(backendRootForAuth());

  if (process.env.TIPMANNA_E2E_AUTH_CODE !== "1") {
    const staticCode = process.env.PLAYWRIGHT_TIPPER_OTP_SECRET?.trim();
    if (staticCode && /^\d{6}$/.test(staticCode)) {
      return {
        code: staticCode,
        method: "static-otp",
        backendHost,
      };
    }
    return {
      code: null,
      method: "none",
      backendHost,
      error: "helper disabled and no static OTP configured",
    };
  }

  const url = `${backendRootForAuth()}/api/v1/auth/e2e/verification-code?email=${encodeURIComponent(_email)}`;
  const headers: Record<string, string> = {};
  const helperSecret = process.env.PLAYWRIGHT_E2E_AUTH_HELPER_SECRET?.trim();
  if (helperSecret) {
    headers[E2E_HELPER_HEADER] = helperSecret;
  }

  let lastStatus: number | undefined;
  let lastReason: string | undefined;
  for (let i = 0; i < 15; i++) {
    try {
      const res = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(5_000),
      });
      lastStatus = res.status;
      let reason: string | undefined;
      try {
        const payload = (await res.clone().json()) as {
          error?: { reason?: string };
        };
        reason = payload.error?.reason;
      } catch {
        /* non-json */
      }
      if (reason) lastReason = reason;

      if (res.ok) {
        const data = (await res.json()) as { code?: string };
        if (typeof data.code === "string" && /^\d{6}$/.test(data.code)) {
          return {
            code: data.code,
            method: "backend-helper",
            backendHost,
            httpStatus: res.status,
          };
        }
        return {
          code: null,
          method: "backend-helper",
          backendHost,
          httpStatus: res.status,
          reason: lastReason,
          error: "verification code absent in helper response",
        };
      }
      if (res.status === 403 || res.status === 404) {
        return {
          code: null,
          method: "backend-helper",
          backendHost,
          httpStatus: res.status,
          reason: lastReason,
          error:
            res.status === 403
              ? `helper forbidden (${lastReason ?? "check staging secret alignment"})`
              : `helper not found (${lastReason ?? "check deployment flags/allowlist"})`,
        };
      }
    } catch {
      /* retry */
    }
    await new Promise(r => setTimeout(r, 1_000));
  }

  return {
    code: null,
    method: "backend-helper",
    backendHost,
    httpStatus: lastStatus,
    reason: lastReason,
    error: "verification code absent after polling helper",
  };
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

export function reportAuthEnvPresence(): Record<string, "SET" | "MISSING"> {
  const keys = [
    "PLAYWRIGHT_AUTH_E2E",
    "PLAYWRIGHT_BASE_URL",
    "PLAYWRIGHT_BACKEND_URL",
    "PLAYWRIGHT_TIPPER_EMAIL",
    "PLAYWRIGHT_TIPPER_OTP_SECRET",
    "TIPMANNA_E2E_AUTH_CODE",
    "PLAYWRIGHT_E2E_AUTH_HELPER_SECRET",
  ] as const;
  const out = {} as Record<(typeof keys)[number], "SET" | "MISSING">;
  for (const key of keys) {
    out[key] = process.env[key]?.trim() ? "SET" : "MISSING";
  }
  return out;
}
