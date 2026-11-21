export type ProtectedRouteAuthInput = {
  persistAuthHydrationComplete: boolean;
};

/** Gate timing only — access requires server-verified session (see ProtectedRoute). */
export function isProtectedRouteHydrationPending(
  input: ProtectedRouteAuthInput
): boolean {
  return !input.persistAuthHydrationComplete;
}
