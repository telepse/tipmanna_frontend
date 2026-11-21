import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  initAnalyticsSdkRuntime,
  resetAnalyticsSdkRuntimeForTests,
  setAnalyticsSdkRuntimeContext,
  shutdownAnalyticsSdkRuntime,
} from "../runtime";

describe("analytics-sdk runtime", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_ANALYTICS_SDK_V2", "true");
    vi.stubGlobal("window", {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    vi.stubGlobal("document", {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      visibilityState: "visible",
    });
  });

  afterEach(() => {
    resetAnalyticsSdkRuntimeForTests();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("binds listeners on first init", () => {
    setAnalyticsSdkRuntimeContext({
      sessionId: "s",
      surface: "channel_client",
    });
    initAnalyticsSdkRuntime();
    expect(document.addEventListener).toHaveBeenCalledWith(
      "visibilitychange",
      expect.any(Function)
    );
    expect(window.addEventListener).toHaveBeenCalledWith(
      "pagehide",
      expect.any(Function)
    );
  });

  it("ref-counts init/shutdown", () => {
    initAnalyticsSdkRuntime();
    initAnalyticsSdkRuntime();
    shutdownAnalyticsSdkRuntime();
    expect(window.removeEventListener).not.toHaveBeenCalled();
    shutdownAnalyticsSdkRuntime();
    expect(window.removeEventListener).toHaveBeenCalled();
  });
});
