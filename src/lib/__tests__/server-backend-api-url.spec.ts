import { describe, expect, it, vi } from "vitest";

import {
  BACKEND_API_URL_NOT_CONFIGURED,
  isMalformedBackendActionUrl,
  resolveServerBackendApiBase,
} from "../server-backend-api-url";

describe("resolveServerBackendApiBase", () => {
  it("prefers runtime BACKEND_API_URL", () => {
    vi.stubEnv("BACKEND_API_URL", "http://127.0.0.1:8015/api/v1/");
    vi.stubEnv("NEXT_PUBLIC_BACKEND_API_URL", "http://other/api/v1");
    expect(resolveServerBackendApiBase()).toBe("http://127.0.0.1:8015/api/v1");
  });

  it("returns null when unset", () => {
    vi.stubEnv("BACKEND_API_URL", "");
    vi.stubEnv("NEXT_PUBLIC_BACKEND_API_URL", "");
    expect(resolveServerBackendApiBase()).toBeNull();
    expect(BACKEND_API_URL_NOT_CONFIGURED).toContain("not configured");
  });

  it("detects malformed action URLs", () => {
    expect(isMalformedBackendActionUrl("/undefined/auth/login-host")).toBe(true);
    expect(
      isMalformedBackendActionUrl("http://127.0.0.1:8015/api/v1/auth/login-host")
    ).toBe(false);
  });
});
