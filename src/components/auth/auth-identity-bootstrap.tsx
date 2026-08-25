"use client";

import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { clearCredentials } from "@/features/auth-slice";
import { clearAuthSession, clearHostSession } from "@/lib/session-client";
import type { RootState } from "@/redux/store";

/** One-time purge of legacy host-primary Redux sessions after identity model change. */
export function AuthIdentityBootstrap() {
  const dispatch = useDispatch();
  const user = useSelector((s: RootState) => s.auth.user);
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    if (user?.role?.toUpperCase() !== "HOST") return;
    ranRef.current = true;
    void (async () => {
      dispatch(clearCredentials());
      await clearAuthSession();
      await clearHostSession();
    })();
  }, [user?.role, dispatch]);

  return null;
}
