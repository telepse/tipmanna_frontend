import { describe, it, expect, vi } from "vitest";
import { buildVerifyEmailPath } from "../verify-email-path";
import { AUTH_ERROR_CODES } from "../authorization-policy";

vi.mock("../email-verification-events", () => ({
  notifyEmailVerificationRequired: vi.fn(),
}));

import { detectEmailVerificationRequired } from "../detect-email-verification-required";
import { notifyEmailVerificationRequired } from "../email-verification-events";

describe("buildVerifyEmailPath", () => {
  it("builds path with email and accountType", () => {
    const path = buildVerifyEmailPath({
      email: "a@b.com",
      accountType: "HOST",
      next: "/host/slug",
    });
    expect(path).toContain("email=a%40b.com");
    expect(path).toContain("accountType=HOST");
    expect(path).toContain("next=%2Fhost%2Fslug");
  });

  it("rejects unsafe next paths", () => {
    const path = buildVerifyEmailPath({
      email: "a@b.com",
      next: "//evil.com",
    });
    expect(path).not.toContain("next=");
  });
});

describe("detectEmailVerificationRequired", () => {
  it("returns true and notifies for EMAIL_VERIFICATION_REQUIRED", () => {
    const handled = detectEmailVerificationRequired({
      validationBody: {
        error: {
          code: AUTH_ERROR_CODES.EMAIL_VERIFICATION_REQUIRED,
          details: { email: "test@example.com" },
        },
      },
    });

    expect(handled).toBe(true);
    expect(notifyEmailVerificationRequired).toHaveBeenCalledWith({
      email: "test@example.com",
    });
  });

  it("returns false for other errors", () => {
    expect(
      detectEmailVerificationRequired({
        validationBody: { error: { code: "HOST_SESSION_REQUIRED" } },
      })
    ).toBe(false);
  });
});
