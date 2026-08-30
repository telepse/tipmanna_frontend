import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  patchExploreFeedHostUsername,
  recordCreatorUsernameChange,
  resolveCreatorUsernameAlias,
} from "@/lib/creator-username-alias";

describe("creator-username-alias", () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => {
        store.clear();
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("resolves renamed usernames from alias map", () => {
    recordCreatorUsernameChange("emediong5135", "emediongudoh");
    expect(resolveCreatorUsernameAlias("emediong5135")).toBe("emediongudoh");
    expect(resolveCreatorUsernameAlias("@emediong5135")).toBe("emediongudoh");
  });

  it("patches explore feed items with stale host usernames", () => {
    const items = [
      {
        id: "1",
        event: { id: "e1", username: "emediong5135", hostName: "Emediong" },
      },
      {
        id: "2",
        event: { id: "e2", username: "otherhost", hostName: "Other" },
      },
    ];

    const patched = patchExploreFeedHostUsername(
      items,
      "emediong5135",
      "emediongudoh"
    ) as typeof items;

    expect(patched[0]?.event.username).toBe("emediongudoh");
    expect(patched[1]?.event.username).toBe("otherhost");
  });
});
