import { describe, expect, it, vi } from "vitest";

import { resolveCreateDialogSignInSuccess } from "../create-dialog-signin-resume";
import { startContentOnlyCreateJourney } from "../start-content-only-create-journey";

describe("startContentOnlyCreateJourney", () => {
  it("opens sign-in with type-picker-proceed when host auth is required", () => {
    const openSignIn = vi.fn();
    const navigate = vi.fn();

    startContentOnlyCreateJourney({
      needsHostAuth: true,
      openSignIn,
      navigate,
    });

    expect(openSignIn).toHaveBeenCalledWith(
      "type-picker-proceed",
      "/content-only"
    );
    expect(navigate).not.toHaveBeenCalled();
  });

  it("navigates to content-only in a new tab when already authenticated", () => {
    const openSignIn = vi.fn();
    const navigate = vi.fn();

    startContentOnlyCreateJourney({
      needsHostAuth: false,
      openSignIn,
      navigate,
      openInNewTab: true,
    });

    expect(openSignIn).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith("/content-only", { newTab: true });
  });
});

describe("resolveCreateDialogSignInSuccess", () => {
  it("still returns /content-only for type-picker-proceed", () => {
    const result = resolveCreateDialogSignInSuccess({
      intent: "type-picker-proceed",
      href: "/content-only",
      hasPendingVideo: false,
    });
    expect(result.navigateTo).toBe("/content-only");
    expect(result.closeCreate).toBe(true);
  });
});
