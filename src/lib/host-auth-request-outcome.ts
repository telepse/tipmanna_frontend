/** Result of requestHostAuth — whether the caller should treat auth as handled. */
export type HostAuthRequestOutcome =
  | "ran"
  | "signin"
  | "upgrade"
  | "loading-hold"
  | "noop";

export function hostAuthOutcomeHandled(
  outcome: HostAuthRequestOutcome
): boolean {
  return outcome !== "noop";
}
