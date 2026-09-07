import { describe, expect, it } from "vitest";
import { buildSignupAttributionPayload } from "../signup-attribution";

describe("buildSignupAttributionPayload", () => {
  it("returns surface and device key shape", () => {
    const payload = buildSignupAttributionPayload("create_dialog");
    expect(payload.signupSurface).toBe("create_dialog");
    expect(typeof payload.deviceKey).toBe("string");
    expect(payload.deviceKey.length).toBeGreaterThan(0);
  });
});
