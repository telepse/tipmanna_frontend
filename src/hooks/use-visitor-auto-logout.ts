"use client";

import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { clearCredentials } from "@/features/auth-slice";
import Cookies from "js-cookie";

const VISITOR_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours in ms

export const useVisitorAutoLogout = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    const checkVisitorExpiry = () => {
      const timestampStr = localStorage.getItem("visitorTimestamp");
      if (!timestampStr) return;

      const timestamp = parseInt(timestampStr, 10);
      const now = Date.now();

      if (now - timestamp > VISITOR_TIMEOUT) {
        // Clear visitor data
        localStorage.removeItem("persist:root");
        localStorage.removeItem("visitorTimestamp");
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        dispatch(clearCredentials());
        Cookies.remove("user");
        Cookies.remove("token");
      }
    };

    // Check immediately on mount
    checkVisitorExpiry();

    // Optional: keep checking every 5 minutes if user stays on page
    const interval = setInterval(checkVisitorExpiry, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [dispatch]);
};
