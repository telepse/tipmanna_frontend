// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";

import {
  ensureAnalyticsSessionStorage,
  getAnalyticsSessionId,
} from "../../analytics-session";

describe("analytics session storage bootstrap", () => {
  afterEach(() => {
    sessionStorage.clear();
  });

  it("ensureAnalyticsSessionStorage creates a persistent session id", () => {
    expect(sessionStorage.getItem("tipmanna-analytics-session")).toBeNull();
    const id = ensureAnalyticsSessionStorage();
    expect(id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(getAnalyticsSessionId()).toBe(id);
  });
});
