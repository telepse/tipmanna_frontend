import { describe, expect, it } from "vitest";
import { resolvedEmailFromAuthPayload } from "@/lib/resolved-auth-email";

describe("resolvedEmailFromAuthPayload", () => {
  it("prefers API email over username fallback", () => {
    expect(
      resolvedEmailFromAuthPayload(
        { message: "sent", email: "host@example.com" },
        "my_username"
      )
    ).toBe("host@example.com");
  });

  it("uses email fallback when API omits email", () => {
    expect(
      resolvedEmailFromAuthPayload({ message: "sent" }, "host@example.com")
    ).toBe("host@example.com");
  });

  it("does not treat username-only fallback as resolved email", () => {
    expect(
      resolvedEmailFromAuthPayload({ message: "sent" }, "my_username")
    ).toBe("my_username");
  });
});
