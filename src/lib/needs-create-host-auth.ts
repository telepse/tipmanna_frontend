import type { RootState } from "@/redux/store";

type AuthUser = RootState["auth"]["user"];

/** True when create Proceed / host flows require sign-in before continuing. */
export function needsCreateHostAuth(user: AuthUser): boolean {
  if (!user) return true;
  return user.role === "VISITOR";
}
