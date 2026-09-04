import { describe, expect, it } from "vitest";

import { isHostLinkResolutionPending } from "@/lib/host-link-resolution";

describe("isHostLinkResolutionPending", () => {
  it("is pending when enabled flips and prevFetchKey has not caught up", () => {
    expect(
      isHostLinkResolutionPending({
        shouldFetchLink: true,
        fetchKey: "u1:TIPPER",
        prevFetchKey: null,
        linkLoading: false,
      })
    ).toBe(true);
  });

  it("is pending while linkLoading is true even if keys match", () => {
    expect(
      isHostLinkResolutionPending({
        shouldFetchLink: true,
        fetchKey: "u1:TIPPER",
        prevFetchKey: "u1:TIPPER",
        linkLoading: true,
      })
    ).toBe(true);
  });

  it("is not pending for the same user after the key is observed and load finished", () => {
    expect(
      isHostLinkResolutionPending({
        shouldFetchLink: true,
        fetchKey: "u1:TIPPER",
        prevFetchKey: "u1:TIPPER",
        linkLoading: false,
      })
    ).toBe(false);
  });

  it("is not pending for visitors / when fetch is disabled", () => {
    expect(
      isHostLinkResolutionPending({
        shouldFetchLink: false,
        fetchKey: null,
        prevFetchKey: null,
        linkLoading: false,
      })
    ).toBe(false);
  });

  it("is pending when the user key changes", () => {
    expect(
      isHostLinkResolutionPending({
        shouldFetchLink: true,
        fetchKey: "u2:TIPPER",
        prevFetchKey: "u1:TIPPER",
        linkLoading: false,
      })
    ).toBe(true);
  });
});
