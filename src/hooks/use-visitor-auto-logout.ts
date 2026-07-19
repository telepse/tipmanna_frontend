"use client";

import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { performAuthLogout } from "@/lib/auth-logout";
import {
  clearVisitorTimestamp,
  isVisitorClientExpired,
  touchVisitorTimestamp,
  VISITOR_SESSION_MS,
} from "@/lib/visitor-session";
import type { AppDispatch, RootState } from "@/redux/store";

export const useVisitorAutoLogout = () => {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((s: RootState) => s.auth.user);

  useEffect(() => {
    if (user?.role === "VISITOR") {
      touchVisitorTimestamp();
    }
  }, [user?.id, user?.role]);

  useEffect(() => {
    const checkVisitorExpiry = () => {
      if (user?.role !== "VISITOR") return;
      if (!isVisitorClientExpired()) return;
      clearVisitorTimestamp();
      void performAuthLogout(dispatch);
    };

    checkVisitorExpiry();

    const interval = setInterval(checkVisitorExpiry, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [dispatch, user?.role]);
};

export { VISITOR_SESSION_MS };
