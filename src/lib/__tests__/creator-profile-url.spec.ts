import { describe, expect, it } from "vitest";

import {
  buildCreatorProfileSharePath,
  normalizeCreatorUsername,
} from "@/lib/creator-profile-url";

describe("creator-profile-url", () => {
  it("normalizes @ prefix from usernames", () => {
    expect(normalizeCreatorUsername("@emediongudoh")).toBe("emediongudoh");
    expect(normalizeCreatorUsername("emediongudoh")).toBe("emediongudoh");
  });

  it("builds public creator profile paths", () => {
    expect(buildCreatorProfileSharePath("emediongudoh")).toBe("/@emediongudoh");
    expect(buildCreatorProfileSharePath("@emediongudoh")).toBe(
      "/@emediongudoh"
    );
  });
});
