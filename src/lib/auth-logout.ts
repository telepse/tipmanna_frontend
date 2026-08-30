import Cookies from "js-cookie";
import type { AppDispatch } from "@/redux/store";
import { clearCredentials } from "@/features/auth-slice";
import { clearAuthSession, clearHostSession } from "@/lib/session-client";

/** Clears Redux, legacy cookies, localStorage persist, HttpOnly session and host session cookies. */
export async function performAuthLogout(dispatch: AppDispatch): Promise<void> {
  dispatch(clearCredentials());
  if (typeof window !== "undefined") {
    localStorage.removeItem("persist:root");
    Cookies.remove("user");
    Cookies.remove("token");
    Cookies.remove("visitorToken");
    Cookies.remove("visitorUser");
    Cookies.remove("hostUser");
  }
  await Promise.all([clearAuthSession(), clearHostSession()]);
}
