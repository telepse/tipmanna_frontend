import { describe, expect, it } from "vitest";

import { hasUpcomingProgramAlert } from "@/lib/tv-program-alert";
import { toProgramDrawerTarget } from "@/lib/tv-program-drawer-target";
import {
  resolveSessionDrawerOrchestrationAction,
  shouldPrepareWithSelectedTips,
} from "@/lib/tv-session-drawer-orchestration";

describe("hasUpcomingProgramAlert", () => {
  it("shows alert when a program has not started", () => {
    expect(
      hasUpcomingProgramAlert([
        { programStatus: "Completed" },
        { programStatus: "Not started" },
      ])
    ).toBe(true);
  });

  it("hides alert when no not-started programs", () => {
    expect(
      hasUpcomingProgramAlert([
        { programStatus: "Ongoing" },
        { programStatus: "Completed" },
      ])
    ).toBe(false);
  });

  it("hides alert for empty list", () => {
    expect(hasUpcomingProgramAlert([])).toBe(false);
  });
});

describe("toProgramDrawerTarget", () => {
  it("maps global program id", () => {
    expect(toProgramDrawerTarget({ id: "enf-1" })).toEqual({
      enforcementId: "enf-1",
      communityId: null,
    });
  });

  it("preserves community id", () => {
    expect(
      toProgramDrawerTarget({ id: "enf-2", communityId: "comm-a" })
    ).toEqual({
      enforcementId: "enf-2",
      communityId: "comm-a",
    });
  });
});

describe("session drawer orchestration", () => {
  it("prepares once when program drawer opens", () => {
    expect(
      resolveSessionDrawerOrchestrationAction({
        sessionDrawerOpen: true,
        prevSessionDrawerOpen: false,
        isTipDrawerOpen: false,
        prevTipDrawerOpen: false,
        tipCount: 0,
        prevTipCount: 0,
      })
    ).toBe("prepareOnOpen");
    expect(shouldPrepareWithSelectedTips("prepareOnOpen", 0)).toBe(false);
  });

  it("resumes once when last session drawer closes", () => {
    expect(
      resolveSessionDrawerOrchestrationAction({
        sessionDrawerOpen: false,
        prevSessionDrawerOpen: true,
        isTipDrawerOpen: false,
        prevTipDrawerOpen: true,
        tipCount: 0,
        prevTipCount: 0,
      })
    ).toBe("resumeOnClose");
  });

  it("does not resume when switching tip to program while one stays open", () => {
    expect(
      resolveSessionDrawerOrchestrationAction({
        sessionDrawerOpen: true,
        prevSessionDrawerOpen: true,
        isTipDrawerOpen: false,
        prevTipDrawerOpen: true,
        tipCount: 0,
        prevTipCount: 0,
      })
    ).toBeNull();
  });

  it("does not resume when program closes but tip remains open", () => {
    expect(
      resolveSessionDrawerOrchestrationAction({
        sessionDrawerOpen: true,
        prevSessionDrawerOpen: true,
        isTipDrawerOpen: true,
        prevTipDrawerOpen: true,
        tipCount: 1,
        prevTipCount: 1,
      })
    ).toBeNull();
  });

  it("prepares when tip selection appears while tip drawer open", () => {
    expect(
      resolveSessionDrawerOrchestrationAction({
        sessionDrawerOpen: true,
        prevSessionDrawerOpen: true,
        isTipDrawerOpen: true,
        prevTipDrawerOpen: true,
        tipCount: 2,
        prevTipCount: 0,
      })
    ).toBe("prepareTipSelection");
    expect(shouldPrepareWithSelectedTips("prepareTipSelection", 2)).toBe(true);
  });
});
