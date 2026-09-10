/** Stripe.js loads only for live checkout when a tip drawer is open. */
export function shouldLoadTipStripe({
  previewMode,
  drawerOpen,
}: {
  previewMode?: boolean;
  drawerOpen: boolean;
}): boolean {
  return !previewMode && drawerOpen;
}
