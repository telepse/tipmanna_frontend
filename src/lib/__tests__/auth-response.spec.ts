import { describe, expect, it } from "vitest";

import {
  isPendingEmailVerification,
  parseAuthResponse,
} from "@/lib/auth-response";

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

  it("parses tokenless pending verification (Option C)", () => {
    const parsed = parseAuthResponse({
      message: "Tipper account created",
      requiresVerification: true,
      user: {
        id: "t1",
        fullName: "Jane",
        email: "jane@example.com",
        username: "jane42",
        role: "TIPPER",
      },
    });

    expect(parsed).not.toBeNull();
    expect(parsed!.token).toBeNull();
    expect(parsed!.requiresVerification).toBe(true);
    expect(isPendingEmailVerification(parsed!)).toBe(true);
  });

  it("parses tokenless dual host pending verification", () => {
    const parsed = parseAuthResponse({
      message: "Host account created",
      requiresVerification: true,
      primary: {
        user: {
          id: "t1",
          fullName: "Jane",
          email: "jane@example.com",
          username: "tipperjane42",
          role: "TIPPER",
        },
      },
      host: {
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
    expect(parsed!.token).toBeNull();
    expect(parsed!.hostSession?.user.username).toBe("janecreator");
    expect(parsed!.hostSession?.token).toBeNull();
  });

  it("fails closed when requiresVerification absent and token missing", () => {
    const parsed = parseAuthResponse({
      message: "Broken",
      user: {
        id: "t1",
        email: "jane@example.com",
        username: "jane",
        role: "TIPPER",
      },
    });

    expect(parsed).toBeNull();
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
