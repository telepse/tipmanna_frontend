import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ensureOpenActivation,
  getOrCreateActivationId,
  markActivationEnded,
  resetActivationStateForTests,
} from "../activation";

describe("activation map", () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    vi.stubGlobal("sessionStorage", {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
      clear: () => store.clear(),
    });
  });

  afterEach(() => {
    resetActivationStateForTests();
    store.clear();
    vi.unstubAllGlobals();
  });

  it("reuses activation for same session+surface+channel", () => {
    const mint = () => "aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee";
    const a = getOrCreateActivationId("s", "channel_client", "v1", mint);
    const b = getOrCreateActivationId(
      "s",
      "channel_client",
      "v1",
      () => "other"
    );
    expect(a).toBe(b);
  });

  it("does not mint when not ready and active", () => {
    const id = ensureOpenActivation(
      "s",
      "channel_client",
      "v1",
      { ready: false, active: true },
      () => "aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee"
    );
    expect(id).toBeNull();
  });

  it("mints new activation after end", () => {
    let n = 0;
    const mint = () =>
      n++ === 0
        ? "aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee"
        : "bbbbbbbb-bbbb-4ccc-dddd-eeeeeeeeeeee";
    const a = getOrCreateActivationId("s", "channel_client", "v1", mint);
    markActivationEnded("s", "channel_client", "v1");
    const b = getOrCreateActivationId("s", "channel_client", "v1", mint);
    expect(a).not.toBe(b);
  });
});
