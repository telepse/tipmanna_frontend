import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  IMMERSIVE_DRAWER_Z_INDEX,
  OVERLAY_Z_INDEX,
  PLAYBACK_OVERLAY_NESTED_MODAL_Z,
  PLAYBACK_OVERLAY_NESTED_Z,
  PLAYBACK_OVERLAY_NESTED_Z_INDEX,
  TEXT_TIP_DRAFT_MODAL_Z_INDEX,
} from "@/lib/drawer-z-index";

describe("playback overlay nested z-index ordering", () => {
  it("nests drawers and modals above the playback overlay shell", () => {
    expect(OVERLAY_Z_INDEX).toBe("z-[1000000]");
    expect(PLAYBACK_OVERLAY_NESTED_Z_INDEX).toBe("z-[1000002]");
    expect(PLAYBACK_OVERLAY_NESTED_Z).toBe(1_000_002);
    expect(PLAYBACK_OVERLAY_NESTED_MODAL_Z).toBe(1_000_004);
    expect(IMMERSIVE_DRAWER_Z_INDEX).toBe("z-[100019]");
    expect(TEXT_TIP_DRAFT_MODAL_Z_INDEX).toBe("!z-[100026]");
    expect(PLAYBACK_OVERLAY_NESTED_Z).toBeGreaterThan(100019);
    expect(PLAYBACK_OVERLAY_NESTED_Z).toBeGreaterThan(1_000_000);
    expect(PLAYBACK_OVERLAY_NESTED_MODAL_Z).toBeGreaterThan(
      PLAYBACK_OVERLAY_NESTED_Z
    );
    expect(PLAYBACK_OVERLAY_NESTED_MODAL_Z).toBeGreaterThan(100026);
  });

  it("TipDrawer presents text tip draft with overlay stack detail", () => {
    const tipDrawerSrc = readFileSync(
      resolve(process.cwd(), "src/components/events/tip-drawer.tsx"),
      "utf8"
    );
    expect(tipDrawerSrc).toContain(
      "presentTextTipDraftModal({\n      stackAbovePlaybackOverlay: Boolean(stackAbovePlaybackOverlay),\n    })"
    );
    expect(tipDrawerSrc).toContain("PLAYBACK_OVERLAY_NESTED_MODAL_Z_INDEX");
  });

  it("TipSection presents text tip draft with overlay stack detail", () => {
    const tipSectionSrc = readFileSync(
      resolve(process.cwd(), "src/components/events/tip-section.tsx"),
      "utf8"
    );
    expect(tipSectionSrc).toContain("stackAbovePlaybackOverlay?: boolean");
    expect(tipSectionSrc).toContain(
      "presentTextTipDraftModal({\n      stackAbovePlaybackOverlay: Boolean(stackAbovePlaybackOverlay),\n    })"
    );
    expect(tipSectionSrc).toContain(
      "stackAbovePlaybackOverlay={stackAbovePlaybackOverlay}"
    );
  });
});
