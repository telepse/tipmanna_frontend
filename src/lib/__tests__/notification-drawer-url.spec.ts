import { describe, expect, it } from "vitest";
import {
  buildNotificationDrawerUrl,
  parseNotificationDrawerQuery,
  stripNotificationDrawerParams,
} from "../notification-drawer-url";

describe("notification-drawer-url", () => {
  it("parses drawer=notifications and notifications=host", () => {
    const params = new URLSearchParams(
      "drawer=notifications&notifications=host&feedTab=trends"
    );
    expect(parseNotificationDrawerQuery(params)).toEqual({
      openDrawer: true,
      accountTab: "host",
    });
  });

  it("builds explore drawer URL for tipper", () => {
    expect(buildNotificationDrawerUrl("tipper")).toBe(
      "/explore?drawer=notifications&notifications=tipper"
    );
  });

  it("strips drawer params without removing feedTab", () => {
    const next = stripNotificationDrawerParams(
      new URLSearchParams(
        "drawer=notifications&notifications=tipper&feedTab=tv"
      )
    );
    expect(next.get("feedTab")).toBe("tv");
    expect(next.get("drawer")).toBeNull();
    expect(next.get("notifications")).toBeNull();
  });
});
