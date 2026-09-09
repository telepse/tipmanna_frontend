import { describe, it, expect } from "vitest";

/** Mirrors sw.ts resolveNotificationDeepLink for unit testing. */
function resolveNotificationDeepLink(data: {
  deepLink?: string;
  recipientKind?: string | null;
}): string {
  const raw = data.deepLink?.trim() || "/explore?drawer=notifications";
  if (
    raw.includes("notifications=host") ||
    raw.includes("notifications=tipper")
  ) {
    return raw;
  }
  if (data.recipientKind === "host") {
    return "/explore?drawer=notifications&notifications=host";
  }
  if (data.recipientKind === "tipper") {
    return "/explore?drawer=notifications&notifications=tipper";
  }
  return raw;
}

describe("resolveNotificationDeepLink", () => {
  it("routes host push taps to host notifications subtab", () => {
    expect(resolveNotificationDeepLink({ recipientKind: "host" })).toBe(
      "/explore?drawer=notifications&notifications=host"
    );
  });

  it("routes tipper push taps to tipper notifications subtab", () => {
    expect(resolveNotificationDeepLink({ recipientKind: "tipper" })).toBe(
      "/explore?drawer=notifications&notifications=tipper"
    );
  });

  it("preserves explicit deep links", () => {
    expect(
      resolveNotificationDeepLink({
        recipientKind: "host",
        deepLink: "/host/dashboard?drawer=notifications&notifications=host",
      })
    ).toBe("/host/dashboard?drawer=notifications&notifications=host");
  });
});
