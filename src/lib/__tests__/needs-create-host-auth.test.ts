import { describe, expect, it } from "vitest";
import { needsCreateHostAuth } from "../needs-create-host-auth";

describe("needsCreateHostAuth", () => {
  it("requires auth when user is null", () => {
    expect(needsCreateHostAuth(null)).toBe(true);
  });

  it("requires auth for guest VISITOR sessions", () => {
    expect(
      needsCreateHostAuth({
        id: "v1",
        role: "VISITOR",
        email: "",
        fullName: "",
        username: "guest",
      })
    ).toBe(true);
  });

  it("does not require auth for tippers or hosts", () => {
    expect(
      needsCreateHostAuth({
        id: "t1",
        role: "TIPPER",
        email: "a@b.com",
        fullName: "Tipper",
        username: "tipper",
      })
    ).toBe(false);
    expect(
      needsCreateHostAuth({
        id: "h1",
        role: "HOST",
        email: "a@b.com",
        fullName: "Host",
        username: "host",
      })
    ).toBe(false);
  });
});
