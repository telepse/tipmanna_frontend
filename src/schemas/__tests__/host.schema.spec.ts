import { describe, expect, it } from "vitest";

import { hostSignInSchema } from "../host.schema";

describe("hostSignInSchema", () => {
  it("rejects Phase 0 passwords shorter than 6 characters (misleading legacy message fixed)", () => {
    const result = hostSignInSchema.safeParse({
      emailOrUsername: "b1e2e_cbdc5ed6@example.test",
      password: "test",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "Password must be at least 6 characters"
      );
    }
  });

  it("accepts Phase 0 disposable host password", () => {
    const result = hostSignInSchema.safeParse({
      emailOrUsername: "b1e2e_cbdc5ed6@example.test",
      password: "testpass",
    });
    expect(result.success).toBe(true);
  });
});
