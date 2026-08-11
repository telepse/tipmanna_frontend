/** Immersive reel overlays (title row, scrubber, feature cards). */
export const IMMERSIVE_CHROME_Z_INDEX = "z-[130]";
/** TV control rail — below tip drawer, above video chrome. */
export const TV_RAIL_Z_INDEX = "z-[140]";
/** Shared z-index tiers for drawers and auth modals. */
export const DRAWER_OVERLAY_Z_INDEX = "z-[99989]";
export const DRAWER_Z_INDEX = "z-[99990]";
/** Above explore reel chrome (~13100), below explore create/sign-in modals (100020+). */
export const IMMERSIVE_DRAWER_OVERLAY_Z_INDEX = "z-[100018]";
export const IMMERSIVE_DRAWER_Z_INDEX = "z-[100019]";
export const DRAWER_NESTED_Z_INDEX = "z-[99995]";
export const AUTH_MODAL_OVERLAY_Z_INDEX = "z-[99998]";
export const AUTH_MODAL_Z_INDEX = "z-[99999]";
/** Sign-in modal stacked above create dialog / comment drawer. */
export const SIGN_IN_NESTED_OVERLAY_Z_INDEX = "z-[100002]";
export const SIGN_IN_NESTED_Z_INDEX = "z-[100003]";
export const SIGN_IN_EXPLORE_OVERLAY_Z_INDEX = "z-[100021]";
export const SIGN_IN_EXPLORE_Z_INDEX = "z-[100022]";
/** Explore filter panel + create dialog above explore chrome. */
export const EXPLORE_MODAL_Z_INDEX = "z-[100020]";
/**
 * Radix select/popover portals inside modals (must sit above dialog content).
 * Keep above EXPLORE_MODAL (100020) and AUTH_MODAL (99999), below SIGN_IN_EXPLORE (100022).
 */
export const MODAL_DROPDOWN_Z_INDEX = "z-[100021]";
/** PWA install prompt — above immersive video chrome, below tip drawer. */
export const PWA_INSTALL_SHEET_OVERLAY_Z_INDEX = "z-[100023]";
export const PWA_INSTALL_SHEET_Z_INDEX = "z-[100024]";
/** Text tip draft dialog — above immersive drawers and explore modals. */
export const TEXT_TIP_DRAFT_MODAL_OVERLAY_Z_INDEX = "!z-[100025]";
export const TEXT_TIP_DRAFT_MODAL_Z_INDEX = "!z-[100026]";
/** Dialog opened from creator drawer / explore must sit above drawer chrome. */
export const CREATOR_PROFILE_DIALOG_OVERLAY_Z_INDEX = "z-[100010]";
export const CREATOR_PROFILE_DIALOG_Z_INDEX = "z-[100011]";
export const OVERLAY_Z_INDEX = "z-[1000000]";
