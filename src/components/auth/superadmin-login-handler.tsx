"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

// Third-party imports
import { useDispatch } from "react-redux";
import Cookies from "js-cookie";

// Local imports
import { setCredentials } from "@/features/auth-slice";

export function SuperadminLoginHandler() {
  const dispatch = useDispatch();
  const searchParams = useSearchParams();

  useEffect(() => {
    const userParam = searchParams.get("user");
    const tokenParam = searchParams.get("token");
    const isSuperadminLogin = searchParams.get("superadminLogin");

    if (isSuperadminLogin && userParam && tokenParam) {
      try {
        const userData = JSON.parse(decodeURIComponent(userParam));
        const token = decodeURIComponent(tokenParam);

        console.log("Parsed user data:", userData);
        console.log("Token:", token);

        // Validate the user data structure
        if (!userData.id || !userData.fullName || !userData.email) {
          console.error("Invalid user data structure:", userData);
          return;
        }

        // Update Redux store with proper structure
        dispatch(
          setCredentials({
            user: {
              id: userData.id,
              fullName: userData.fullName,
              email: userData.email,
              username: userData.username || "",
              role: userData.role || "HOST",
              eventCode: userData.eventCode,
              eventSlug: userData.eventSlug,
            },
            token: token,
          })
        );

        // Store in cookies with same structure
        Cookies.set(
          "user",
          JSON.stringify({
            id: userData.id,
            fullName: userData.fullName,
            email: userData.email,
            username: userData.username || "",
            role: userData.role || "HOST",
            eventCode: userData.eventCode,
            eventSlug: userData.eventSlug,
          }),
          { expires: 7 }
        );

        Cookies.set("token", token, { expires: 7 });

        // Clean up URL
        const url = new URL(window.location.href);
        url.searchParams.delete("user");
        url.searchParams.delete("token");
        url.searchParams.delete("superadminLogin");
        window.history.replaceState({}, "", url.toString());
      } catch (error) {
        console.error("Failed to process superadmin login:", error);
      }
    }
  }, [searchParams, dispatch]);

  return null;
}
