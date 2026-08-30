import { describe, expect, it } from "vitest";

import { parseAuthResponse } from "@/lib/auth-response";

describe("parseAuthResponse dual host payloads", () => {
  it("parses registerHost-style dual response with primary tipper", () => {
    const parsed = parseAuthResponse({
      message: "Host account created",
      primary: {
        token: "tipper-jwt",
        user: {
          id: "t1",
          fullName: "Jane",
          email: "jane@example.com",
          username: "tipperjane42",
          displayUsername: "tipperjane42",
          role: "TIPPER",
        },
      },
      host: {
        token: "host-jwt",
        user: {
          id: "t1",
          fullName: "Jane",
          email: "jane@example.com",
          username: "janecreator",
          role: "HOST",
        },
      },
    });

    expect(parsed).not.toBeNull();
    expect(parsed!.token).toBe("tipper-jwt");
    expect(parsed!.user.username).toBe("tipperjane42");
    expect(parsed!.user.displayUsername).toBe("tipperjane42");
    expect(parsed!.hostSession?.token).toBe("host-jwt");
    expect(parsed!.hostSession?.user.role).toBe("HOST");
  });

  it("rejects host-only token without tipper primary", () => {
    const parsed = parseAuthResponse({
      message: "Legacy",
      token: "host-only",
      host: {
        id: "h1",
        username: "host",
        role: "HOST",
      },
    });

    expect(parsed).toBeNull();
  });
});
