/**
 * TV post-payment live axis (PPLA): arm only after confirmed payment when the
 * tip session originated from GLOBAL/Live. Cancel/dismiss must not arm.
 */

export function shouldArmPostPaymentAxis(opts: {
  originMode: "GLOBAL" | "LOCAL" | null | undefined;
  paymentSucceeded: boolean;
}): boolean {
  return opts.paymentSucceeded === true && opts.originMode === "GLOBAL";
}
