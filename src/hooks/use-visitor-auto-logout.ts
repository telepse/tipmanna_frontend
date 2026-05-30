"use client";

import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { performAuthLogout } from "@/lib/auth-logout";
import type { AppDispatch } from "@/redux/store";

const VISITOR_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours in ms

export const useVisitorAutoLogout = () => {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    const checkVisitorExpiry = () => {
      const timestampStr = localStorage.getItem("visitorTimestamp");
      if (!timestampStr) return;

      const timestamp = parseInt(timestampStr, 10);
      const now = Date.now();

      if (now - timestamp > VISITOR_TIMEOUT) {
        localStorage.removeItem("visitorTimestamp");
        void performAuthLogout(dispatch);
      }
    };

    checkVisitorExpiry();

    const interval = setInterval(checkVisitorExpiry, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [dispatch]);
};
