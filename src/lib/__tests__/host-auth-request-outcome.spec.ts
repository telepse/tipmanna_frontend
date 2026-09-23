import { describe, expect, it } from "vitest";
import { hostAuthOutcomeHandled } from "../host-auth-request-outcome";

describe("hostAuthOutcomeHandled", () => {
  it("noop is not handled", () => {
    expect(hostAuthOutcomeHandled("noop")).toBe(false);
  });

  it("signin upgrade loading-hold and ran are handled", () => {
    expect(hostAuthOutcomeHandled("signin")).toBe(true);
    expect(hostAuthOutcomeHandled("upgrade")).toBe(true);
    expect(hostAuthOutcomeHandled("loading-hold")).toBe(true);
    expect(hostAuthOutcomeHandled("ran")).toBe(true);
  });
});
