import type { MutableRefObject } from "react";

/** Returns true when this call acquired the in-flight submit lock. */
export function beginExclusiveSubmit(ref: MutableRefObject<boolean>): boolean {
  if (ref.current) return false;
  ref.current = true;
  return true;
}

export function endExclusiveSubmit(ref: MutableRefObject<boolean>): void {
  ref.current = false;
}
