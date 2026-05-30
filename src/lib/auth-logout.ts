import Cookies from "js-cookie";
import type { AppDispatch } from "@/redux/store";
import { clearCredentials } from "@/features/auth-slice";
import { clearAuthSession } from "@/lib/session-client";

/** Clears Redux, legacy cookies, localStorage persist, and HttpOnly session cookie. */
export async function performAuthLogout(dispatch: AppDispatch): Promise<void> {
  dispatch(clearCredentials());
  if (typeof window !== "undefined") {
    localStorage.removeItem("persist:root");
    Cookies.remove("user");
    Cookies.remove("token");
    Cookies.remove("visitorToken");
    Cookies.remove("visitorUser");
  }
  await clearAuthSession();
}
