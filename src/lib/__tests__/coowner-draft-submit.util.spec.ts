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
      hiddenUntilCoOwnerApprove: false,
    });
  });

  it("approved wins over pending sibling invites", () => {
    expect(
      evaluateCoOwnerSubmitReadiness([
        { status: "approved" },
        { status: "pending" },
      ])
    ).toEqual({
      blocked: false,
      reason: null,
      willDropOnSubmit: false,
      hiddenUntilCoOwnerApprove: false,
    });
  });

  it("allows submit while pending (hidden until approve)", () => {
    expect(evaluateCoOwnerSubmitReadiness([{ status: "pending" }])).toEqual({
      blocked: false,
      reason: "has_pending",
      willDropOnSubmit: false,
      hiddenUntilCoOwnerApprove: true,
    });
    expect(evaluateCoOwnerSubmitReadiness([])).toEqual({
      blocked: true,
      reason: "missing_approved",
      willDropOnSubmit: false,
      hiddenUntilCoOwnerApprove: false,
    });
  });

  it("unblocks when approved and no pending invites", () => {
    expect(evaluateCoOwnerSubmitReadiness([{ status: "approved" }])).toEqual({
      blocked: false,
      reason: null,
      willDropOnSubmit: false,
      hiddenUntilCoOwnerApprove: false,
    });
  });

  it("terminal-only invites can submit (waiting on server)", () => {
    expect(evaluateCoOwnerSubmitReadiness([{ status: "expired" }])).toEqual({
      blocked: false,
      reason: null,
      willDropOnSubmit: false,
      hiddenUntilCoOwnerApprove: true,
    });
  });
});

describe("coOwnerBlockReasonMessage", () => {
  it("maps all reasons to user-facing copy", () => {
    expect(coOwnerBlockReasonMessage("has_pending")).toContain("submit");
    expect(coOwnerBlockReasonMessage("missing_draft_key")).toContain("draft");
  });
});

describe("validateCoOwnerDraftsForSubmit", () => {
  beforeEach(() => {
    mockStatus.mockReset();
  });

  it("passes default co-owned video when invite is pending", async () => {
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
    expect(err).toBeNull();
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

  it("blocks when default co-owned video has empty invites", async () => {
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
    expect(err).toBe(coOwnerBlockReasonMessage("missing_approved"));
  });

  it("passes when one of multiple co-owned links is pending", async () => {
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
    ]);
    expect(err).toBeNull();
    expect(mockStatus).toHaveBeenCalledTimes(2);
  });

  it("allows wizard when only terminal invites exist", async () => {
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

  it("allows single-video modal when only terminal invites exist", async () => {
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
    expect(err).toBeNull();
  });
});
