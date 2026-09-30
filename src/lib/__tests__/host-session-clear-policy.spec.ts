import { describe, expect, it } from "vitest";
import { shouldClearHostCookies } from "@/app/api/auth/host-session/verify-host-session";

describe("shouldClearHostCookies", () => {
  it("clears only on HOST_SESSION_REQUIRED", () => {
    expect(shouldClearHostCookies("HOST_SESSION_REQUIRED")).toBe(true);
  });

  it("keeps cookies for absent, email verification, and probe failure", () => {
    expect(shouldClearHostCookies("HOST_SESSION_ABSENT")).toBe(false);
    expect(shouldClearHostCookies("EMAIL_VERIFICATION_REQUIRED")).toBe(false);
    expect(shouldClearHostCookies("HOST_SESSION_PROBE_FAILED")).toBe(false);
  });
});
