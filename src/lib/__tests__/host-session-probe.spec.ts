import { describe, expect, it } from "vitest";

import type { HostSessionProbeResult } from "@/lib/host-session-probe";

/** Mirrors client interpretation of verify API responses. */
function interpretProbeResponse(input: {
  ok: boolean;
  status: number;
  body: {
    active?: boolean;
    hostId?: string | null;
    hostSessionExpiresAt?: string | null;
    code?: string;
  };
}): Pick<
  HostSessionProbeResult,
  "status" | "active" | "transientFailure" | "hostId"
> {
  if (input.status === 503 || input.status >= 500) {
    return {
      status: "unknown",
      active: false,
      transientFailure: true,
      hostId: null,
    };
  }
  const active = input.body.active === true;
  return {
    status: active ? "active" : "inactive",
    active,
    transientFailure: false,
    hostId: active ? (input.body.hostId ?? null) : null,
  };
}

describe("host session probe interpretation", () => {
  it("treats verified active response as active with hostId from body", () => {
    const result = interpretProbeResponse({
      ok: true,
      status: 200,
      body: {
        active: true,
        hostId: "host-123",
        hostSessionExpiresAt: "2099-01-01T00:00:00.000Z",
      },
    });
    expect(result.status).toBe("active");
    expect(result.active).toBe(true);
    expect(result.hostId).toBe("host-123");
    expect(result.transientFailure).toBe(false);
  });

  it("treats 403 inactive without transient failure", () => {
    const result = interpretProbeResponse({
      ok: false,
      status: 403,
      body: { active: false, code: "HOST_SESSION_REQUIRED" },
    });
    expect(result.status).toBe("inactive");
    expect(result.transientFailure).toBe(false);
  });

  it("treats 503 as transient unknown", () => {
    const result = interpretProbeResponse({
      ok: false,
      status: 503,
      body: { code: "HOST_SESSION_PROBE_FAILED" },
    });
    expect(result.status).toBe("unknown");
    expect(result.transientFailure).toBe(true);
  });
});
