"use client";

import { useEffect, useRef } from "react";
import Cookies from "js-cookie";
import { useDispatch, useSelector } from "react-redux";

import { updateTipper } from "@/features/auth-slice";
import type { RootState } from "@/redux/store";

/**
 * After slug migration or alias redirect, session cookies may still hold the old
 * username slug. Sync to the canonical profile slug so nav/share stay correct.
 */
export function ProfileSlugSync({ profileSlug }: { profileSlug: string }) {
  const user = useSelector((s: RootState) => s.auth.user);
  const dispatch = useDispatch();
  const syncedRef = useRef<string | null>(null);

  useEffect(() => {
    const slug = profileSlug.trim();
    if (!slug || !user?.id) return;
    if (user.username === slug) return;
    if (syncedRef.current === slug) return;

    syncedRef.current = slug;
    dispatch(updateTipper({ username: slug }));

    const raw = Cookies.get("user") ?? Cookies.get("visitorUser");
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        const key = Cookies.get("user") ? "user" : "visitorUser";
        Cookies.set(
          key,
          JSON.stringify({ ...parsed, username: slug }),
          { expires: 7 }
        );
      } catch {
        /* noop */
      }
    }
  }, [profileSlug, user?.id, user?.username, dispatch]);

  return null;
}
