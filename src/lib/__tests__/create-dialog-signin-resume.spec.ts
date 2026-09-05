import { describe, expect, it } from "vitest";
import { resolveCreateDialogSignInSuccess } from "@/lib/create-dialog-signin-resume";

describe("resolveCreateDialogSignInSuccess", () => {
  it("Proceed closes create dialog and navigates without reopening picker", () => {
    expect(
      resolveCreateDialogSignInSuccess({
        intent: "type-picker-proceed",
        href: "/event-only",
        hasPendingVideo: false,
      })
    ).toEqual({
      closeCreate: true,
      navigateTo: "/event-only",
      keepCreateOpen: false,
      refreshHostLink: false,
      resumeVideoSubmit: false,
    });
  });

  it("Proceed without href does not navigate", () => {
    const result = resolveCreateDialogSignInSuccess({
      intent: "type-picker-proceed",
      href: null,
      hasPendingVideo: false,
    });
    expect(result.navigateTo).toBeNull();
    expect(result.keepCreateOpen).toBe(true);
  });

  it("return-prepared refreshes host link and keeps dialog open", () => {
    expect(
      resolveCreateDialogSignInSuccess({
        intent: "return-prepared",
        href: null,
        hasPendingVideo: false,
      })
    ).toEqual({
      closeCreate: false,
      navigateTo: null,
      keepCreateOpen: true,
      refreshHostLink: true,
      resumeVideoSubmit: false,
    });
  });

  it("add-video resumes pending submit when values were stored", () => {
    expect(
      resolveCreateDialogSignInSuccess({
        intent: "add-video",
        href: null,
        hasPendingVideo: true,
      })
    ).toEqual({
      closeCreate: false,
      navigateTo: null,
      keepCreateOpen: true,
      refreshHostLink: false,
      resumeVideoSubmit: true,
    });
  });

  it("unknown intent keeps create dialog open without navigation", () => {
    expect(
      resolveCreateDialogSignInSuccess({
        intent: null,
        href: null,
        hasPendingVideo: false,
      })
    ).toMatchObject({
      navigateTo: null,
      keepCreateOpen: true,
      closeCreate: false,
    });
  });
});
