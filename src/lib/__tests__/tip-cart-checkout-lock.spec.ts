import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  isTipCartLocked,
  tipCheckoutDismissBlocked,
  tipDrawerSheetOpen,
} from "@/lib/tip-cart-checkout-lock";
import { PLAYBACK_OVERLAY_NESTED_MODAL_Z } from "@/lib/drawer-z-index";

describe("tip-cart-checkout-lock", () => {
  const idle = {
    isProcessing: false,
    isRedirecting: false,
    checkoutSheetSuppressed: false,
    walletDialogOpen: false,
  };

  it("locks cart while processing, redirecting, suppressed, or wallet open", () => {
    expect(isTipCartLocked(idle)).toBe(false);
    expect(isTipCartLocked({ ...idle, isProcessing: true })).toBe(true);
    expect(isTipCartLocked({ ...idle, isRedirecting: true })).toBe(true);
    expect(isTipCartLocked({ ...idle, checkoutSheetSuppressed: true })).toBe(
      true
    );
    expect(isTipCartLocked({ ...idle, walletDialogOpen: true })).toBe(true);
  });

  it("sheet open follows parent open minus suppress redirect and wallet", () => {
    const openBase = {
      parentOpen: true,
      checkoutSheetSuppressed: false,
      isRedirecting: false,
      walletDialogOpen: false,
    };
    expect(tipDrawerSheetOpen(openBase)).toBe(true);
    expect(
      tipDrawerSheetOpen({ ...openBase, checkoutSheetSuppressed: true })
    ).toBe(false);
    expect(tipDrawerSheetOpen({ ...openBase, isRedirecting: true })).toBe(
      false
    );
    expect(tipDrawerSheetOpen({ ...openBase, walletDialogOpen: true })).toBe(
      false
    );
    expect(
      tipDrawerSheetOpen({
        parentOpen: false,
        checkoutSheetSuppressed: false,
        isRedirecting: false,
        walletDialogOpen: false,
      })
    ).toBe(false);
  });

  it("dismiss blocked matches cart lock", () => {
    expect(tipCheckoutDismissBlocked(idle)).toBe(false);
    expect(
      tipCheckoutDismissBlocked({ ...idle, checkoutSheetSuppressed: true })
    ).toBe(true);
  });
});

describe("TipDrawer checkout contract (source)", () => {
  it("portals loading overlay and uses nested modal z-index", () => {
    const src = readFileSync(
      resolve(process.cwd(), "src/components/events/tip-drawer.tsx"),
      "utf8"
    );
    expect(src).toContain("createPortal");
    expect(src).toContain("PLAYBACK_OVERLAY_NESTED_MODAL_Z");
    expect(src).toContain("checkoutSheetSuppressed");
    expect(src).toContain("tipDrawerSheetOpen");
    expect(src).toContain("isTipCartLocked");
  });

  it("does not call onOpenChange(false) at card pay commit", () => {
    const src = readFileSync(
      resolve(process.cwd(), "src/components/events/tip-drawer.tsx"),
      "utf8"
    );
    const onConfirmBlock = src.slice(
      src.indexOf("const onConfirm = async"),
      src.indexOf("// Confirm the PaymentIntent")
    );
    expect(onConfirmBlock).not.toContain("onOpenChange(false)");
  });

  it("loading overlay z-index is above nested drawer modals", () => {
    expect(PLAYBACK_OVERLAY_NESTED_MODAL_Z).toBeGreaterThanOrEqual(1_000_004);
  });

  it("resetCheckoutActivity clears checkout snapshot and freeze refs", () => {
    const src = readFileSync(
      resolve(process.cwd(), "src/components/events/tip-drawer.tsx"),
      "utf8"
    );
    const resetBlock = src.slice(
      src.indexOf("const resetCheckoutActivity = useCallback"),
      src.indexOf("const openTextDraftModalOnly")
    );
    expect(resetBlock).toContain("setWalletDebitSnapshot(null)");
    expect(resetBlock).toContain("checkoutFrozenTipsRef.current = null");
    expect(resetBlock).toContain("checkoutFrozenMetaRef.current = null");
  });
});
