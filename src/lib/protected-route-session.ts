import { getAuthUserFromCookies } from "@/lib/getAuthToken";

export type ProtectedRouteAuthInput = {
  persistAuthHydrationComplete: boolean;
  isAuthenticated: boolean;
  requiresVerification: boolean;
  userId: string | null | undefined;
  token: string | null | undefined;
};

/**
 * Dashboard gate after redux-persist rehydrate. Primary JWT lives in HttpOnly
 * `token` cookie (not in persist); full-page returns (e.g. Stripe Checkout)
 * rehydrate user/isAuthenticated without Redux token.
 */
export function isProtectedRouteSessionReady(
  input: ProtectedRouteAuthInput
): "pending" | "allowed" | "denied" {
  if (!input.persistAuthHydrationComplete) {
    return "pending";
  }

  if (input.requiresVerification) {
    return "denied";
  }

  const userId = input.userId?.trim();
  if (!userId) {
    return "denied";
  }

  if (input.token?.trim()) {
    return "allowed";
  }

  if (input.isAuthenticated) {
    return "allowed";
  }

  const cookieUser = getAuthUserFromCookies();
  if (cookieUser?.id?.trim() === userId) {
    return "allowed";
  }

  return "denied";
}
