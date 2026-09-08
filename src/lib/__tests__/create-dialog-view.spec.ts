import { describe, expect, it } from "vitest";

import {
  resolveCreateDialogView,
  type ResolveCreateDialogViewInput,
} from "@/lib/create-dialog-view";

function base(
  overrides: Partial<ResolveCreateDialogViewInput> = {}
): ResolveCreateDialogViewInput {
  return {
    openPopup: true,
    communityFeatureOn: true,
    userId: undefined,
    userRole: undefined,
    capabilityStatus: "none",
    sessionLoading: false,
    pickerLoading: false,
    canReadAsHost: false,
    showNewEventRoomPicker: false,
    ...overrides,
  };
}

describe("resolveCreateDialogView", () => {
  it("returns full-picker when dialog is closed", () => {
    expect(resolveCreateDialogView(base({ openPopup: false }))).toBe(
      "full-picker"
    );
  });

  it("returns full-picker when community feature is off", () => {
    expect(
      resolveCreateDialogView(
        base({ communityFeatureOn: false, canReadAsHost: true })
      )
    ).toBe("full-picker");
  });

  it("returns full-picker for visitor", () => {
    expect(
      resolveCreateDialogView(
        base({ userId: "v1", userRole: "VISITOR", capabilityStatus: "none" })
      )
    ).toBe("full-picker");
  });

  it("returns full-picker for unlinked tipper after linkage settles", () => {
    expect(
      resolveCreateDialogView(
        base({
          userId: "t1",
          userRole: "TIPPER",
          capabilityStatus: "none",
          canReadAsHost: false,
        })
      )
    ).toBe("full-picker");
  });

  it("returns loading while host link is probing", () => {
    expect(
      resolveCreateDialogView(
        base({
          userId: "t1",
          userRole: "TIPPER",
          capabilityStatus: "loading",
        })
      )
    ).toBe("loading");
  });

  it("returns loading while session or picker fetch is in flight", () => {
    expect(
      resolveCreateDialogView(
        base({
          userId: "t1",
          userRole: "TIPPER",
          capabilityStatus: "stale",
          canReadAsHost: true,
          sessionLoading: true,
        })
      )
    ).toBe("loading");

    expect(
      resolveCreateDialogView(
        base({
          userId: "t1",
          userRole: "TIPPER",
          capabilityStatus: "stale",
          canReadAsHost: true,
          pickerLoading: true,
        })
      )
    ).toBe("loading");
  });

  it("does not block summarized-picker on room/community picker fetch", () => {
    expect(
      resolveCreateDialogView(
        base({
          userId: "t1",
          userRole: "TIPPER",
          capabilityStatus: "stale",
          canReadAsHost: true,
          pickerLoading: true,
          showNewEventRoomPicker: true,
        })
      )
    ).toBe("summarized-picker");
  });

  it("returns prepared for linked tipper with stale host session", () => {
    expect(
      resolveCreateDialogView(
        base({
          userId: "t1",
          userRole: "TIPPER",
          capabilityStatus: "stale",
          canReadAsHost: true,
        })
      )
    ).toBe("prepared");
  });

  it("returns prepared for linked tipper with active host session", () => {
    expect(
      resolveCreateDialogView(
        base({
          userId: "t1",
          userRole: "TIPPER",
          capabilityStatus: "active",
          canReadAsHost: true,
        })
      )
    ).toBe("prepared");
  });

  it("returns summarized-picker for linked tipper when creating new channel", () => {
    expect(
      resolveCreateDialogView(
        base({
          userId: "t1",
          userRole: "TIPPER",
          capabilityStatus: "stale",
          canReadAsHost: true,
          showNewEventRoomPicker: true,
        })
      )
    ).toBe("summarized-picker");
  });

  it("returns summarized-picker for event-room entry even without host link", () => {
    expect(
      resolveCreateDialogView(
        base({
          userId: "t1",
          userRole: "TIPPER",
          capabilityStatus: "none",
          canReadAsHost: false,
          showNewEventRoomPicker: true,
        })
      )
    ).toBe("summarized-picker");
  });

  it("holds loading after host-creator sign-in until host-link settles", () => {
    expect(
      resolveCreateDialogView(
        base({
          userId: "t1",
          userRole: "TIPPER",
          capabilityStatus: "none",
          canReadAsHost: false,
          holdUntilLinkSettled: true,
        })
      )
    ).toBe("loading");

    expect(
      resolveCreateDialogView(
        base({
          userId: "t1",
          userRole: "TIPPER",
          capabilityStatus: "stale",
          canReadAsHost: true,
          showNewEventRoomPicker: true,
          holdUntilLinkSettled: true,
        })
      )
    ).toBe("loading");
  });

  it("never returns full-picker for linked tipper while linkage is loading", () => {
    const view = resolveCreateDialogView(
      base({
        userId: "t1",
        userRole: "TIPPER",
        capabilityStatus: "loading",
        canReadAsHost: false,
      })
    );
    expect(view).not.toBe("full-picker");
    expect(view).toBe("loading");
  });
});
