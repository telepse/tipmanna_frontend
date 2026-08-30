import { describe, expect, it, vi, beforeEach } from "vitest";

import {
  coOwnerBlockReasonMessage,
  evaluateCoOwnerSubmitReadiness,
} from "@/lib/coowner-submit-readiness.util";
import { validateCoOwnerDraftsForSubmit } from "@/lib/coowner-draft-submit.util";

vi.mock("@/actions/events", () => ({
  getVideoCoOwnerInviteStatusAction: vi.fn(),
}));

import { getVideoCoOwnerInviteStatusAction } from "@/actions/events";

const mockStatus = vi.mocked(getVideoCoOwnerInviteStatusAction);

describe("evaluateCoOwnerSubmitReadiness", () => {
  it("blocks when invites are null", () => {
    expect(evaluateCoOwnerSubmitReadiness(null)).toEqual({
      blocked: true,
      reason: "status_fetch_failed",
      willDropOnSubmit: false,
    });
  });

  it("blocks when any invite is pending", () => {
    expect(
      evaluateCoOwnerSubmitReadiness([
        { status: "approved" },
        { status: "pending" },
      ])
    ).toEqual({
      blocked: true,
      reason: "has_pending",
      willDropOnSubmit: false,
    });
  });

  it("blocks when no approved invite exists and not terminal-only", () => {
    expect(evaluateCoOwnerSubmitReadiness([{ status: "pending" }])).toEqual({
      blocked: true,
      reason: "has_pending",
      willDropOnSubmit: false,
    });
    expect(evaluateCoOwnerSubmitReadiness([])).toEqual({
      blocked: true,
      reason: "missing_approved",
      willDropOnSubmit: false,
    });
  });

  it("unblocks when approved and no pending invites", () => {
    expect(evaluateCoOwnerSubmitReadiness([{ status: "approved" }])).toEqual({
      blocked: false,
      reason: null,
      willDropOnSubmit: false,
    });
  });

  it("approved wins over declined sibling invites", () => {
    expect(
      evaluateCoOwnerSubmitReadiness([
        { status: "declined" },
        { status: "approved" },
      ])
    ).toEqual({
      blocked: false,
      reason: null,
      willDropOnSubmit: false,
    });
  });

  it("terminal-only invites will drop on submit", () => {
    expect(evaluateCoOwnerSubmitReadiness([{ status: "expired" }])).toEqual({
      blocked: false,
      reason: "will_be_dropped",
      willDropOnSubmit: true,
    });
  });
});

describe("coOwnerBlockReasonMessage", () => {
  it("maps all reasons to user-facing copy", () => {
    expect(coOwnerBlockReasonMessage("has_pending")).toContain("approved");
    expect(coOwnerBlockReasonMessage("missing_draft_key")).toContain("draft");
    expect(coOwnerBlockReasonMessage("default_awaiting_approval")).toContain(
      "default video"
    );
  });
});

describe("validateCoOwnerDraftsForSubmit", () => {
  beforeEach(() => {
    mockStatus.mockReset();
  });

  it("passes default co-owned video when invite is approved", async () => {
    mockStatus.mockResolvedValueOnce({
      success: true,
      data: { invites: [{ status: "approved" }] },
    } as never);
    const err = await validateCoOwnerDraftsForSubmit([
      {
        ownershipAnswer: "no",
        coOwnerDraftKey: "draft-1",
        isDefault: true,
      },
    ]);
    expect(err).toBeNull();
  });

  it("returns default message when default co-owned video is pending", async () => {
    mockStatus.mockResolvedValueOnce({
      success: true,
      data: { invites: [{ status: "pending" }] },
    } as never);
    const err = await validateCoOwnerDraftsForSubmit([
      {
        ownershipAnswer: "no",
        coOwnerDraftKey: "draft-1",
        isDefault: true,
      },
    ]);
    expect(err).toBe(coOwnerBlockReasonMessage("default_awaiting_approval"));
  });

  it("returns default message when default co-owned video lacks approval", async () => {
    mockStatus.mockResolvedValueOnce({
      success: true,
      data: { invites: [] },
    } as never);
    const err = await validateCoOwnerDraftsForSubmit([
      {
        ownershipAnswer: "no",
        coOwnerDraftKey: "draft-1",
        isDefault: true,
      },
    ]);
    expect(err).toBe(coOwnerBlockReasonMessage("default_awaiting_approval"));
  });

  it("blocks submit when one of multiple co-owned links is pending", async () => {
    mockStatus
      .mockResolvedValueOnce({
        success: true,
        data: { invites: [{ status: "approved" }] },
      } as never)
      .mockResolvedValueOnce({
        success: true,
        data: { invites: [{ status: "pending" }] },
      } as never);

    const err = await validateCoOwnerDraftsForSubmit([
      {
        ownershipAnswer: "no",
        coOwnerDraftKey: "draft-a",
        isDefault: false,
      },
      {
        ownershipAnswer: "no",
        coOwnerDraftKey: "draft-b",
        isDefault: false,
      },
      { ownershipAnswer: "yes" },
      {
        ownershipAnswer: "no",
        coOwnerDraftKey: "draft-d",
        isDefault: true,
      },
    ]);
    expect(err).toBe(coOwnerBlockReasonMessage("has_pending"));
    expect(mockStatus).toHaveBeenCalledTimes(2);
  });

  it("passes mixed links when co-owned are approved and fully-owned skips checks", async () => {
    mockStatus
      .mockResolvedValueOnce({
        success: true,
        data: { invites: [{ status: "approved" }] },
      } as never)
      .mockResolvedValueOnce({
        success: true,
        data: { invites: [{ status: "approved" }] },
      } as never)
      .mockResolvedValueOnce({
        success: true,
        data: { invites: [{ status: "approved" }] },
      } as never);

    const err = await validateCoOwnerDraftsForSubmit([
      {
        ownershipAnswer: "no",
        coOwnerDraftKey: "draft-a",
        isDefault: false,
      },
      {
        ownershipAnswer: "no",
        coOwnerDraftKey: "draft-c",
        isDefault: false,
      },
      { ownershipAnswer: "yes" },
      {
        ownershipAnswer: "no",
        coOwnerDraftKey: "draft-d",
        isDefault: true,
      },
    ]);
    expect(err).toBeNull();
    expect(mockStatus).toHaveBeenCalledTimes(3);
  });

  it("returns default-specific message when default co-owned link is pending among mixed links", async () => {
    mockStatus
      .mockResolvedValueOnce({
        success: true,
        data: { invites: [{ status: "approved" }] },
      } as never)
      .mockResolvedValueOnce({
        success: true,
        data: { invites: [{ status: "pending" }] },
      } as never);

    const err = await validateCoOwnerDraftsForSubmit([
      {
        ownershipAnswer: "no",
        coOwnerDraftKey: "draft-a",
        isDefault: false,
      },
      {
        ownershipAnswer: "no",
        coOwnerDraftKey: "draft-b",
        isDefault: true,
      },
      { ownershipAnswer: "yes" },
    ]);
    expect(err).toBe(coOwnerBlockReasonMessage("default_awaiting_approval"));
  });

  it("allows wizard drop when only terminal invites exist", async () => {
    mockStatus.mockResolvedValueOnce({
      success: true,
      data: { invites: [{ status: "declined" }] },
    } as never);
    const err = await validateCoOwnerDraftsForSubmit([
      {
        ownershipAnswer: "no",
        coOwnerDraftKey: "draft-1",
      },
    ]);
    expect(err).toBeNull();
  });

  it("blocks single-video modal when only terminal invites exist", async () => {
    mockStatus.mockResolvedValueOnce({
      success: true,
      data: { invites: [{ status: "declined" }] },
    } as never);
    const err = await validateCoOwnerDraftsForSubmit(
      [
        {
          ownershipAnswer: "no",
          coOwnerDraftKey: "draft-1",
        },
      ],
      { singleVideo: true }
    );
    expect(err).toContain("not be included");
  });
});
