import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import {
  presentTextTipDraftModal,
  TEXT_TIP_DRAFT_PRESENT_EVENT,
} from "@/components/events/text-tip-draft-modal-layer";

describe("presentTextTipDraftModal", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {
      dispatchEvent: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("dispatches CustomEvent with stackAbovePlaybackOverlay detail", () => {
    presentTextTipDraftModal({ stackAbovePlaybackOverlay: true });
    expect(window.dispatchEvent).toHaveBeenCalledTimes(1);
    const event = (window.dispatchEvent as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as CustomEvent;
    expect(event.type).toBe(TEXT_TIP_DRAFT_PRESENT_EVENT);
    expect(event.detail).toEqual({ stackAbovePlaybackOverlay: true });
  });

  it("defaults stackAbovePlaybackOverlay to false when called with no args", () => {
    presentTextTipDraftModal();
    const event = (window.dispatchEvent as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as CustomEvent;
    expect(event.detail).toEqual({ stackAbovePlaybackOverlay: false });
  });
});
