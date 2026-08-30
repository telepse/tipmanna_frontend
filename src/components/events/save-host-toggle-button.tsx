"use client";

import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { UserRoundPlus } from "lucide-react";
import { toast } from "react-toastify";

import {
  fetchSavedHostStatus,
  getHostIdForChannel,
  saveHostRequest,
  unsaveHostRequest,
} from "@/lib/save-host-client";
import type { RootState } from "@/redux/store";
import { cn } from "@/lib/utils";

type Props = {
  channelId?: string | null;
  hostId?: string | null;
  className?: string;
  iconClassName?: string;
  onRequireSignIn?: () => void;
  /** Bump after sign-in to retry save when user was unsigned. */
  signInCompletedToken?: number;
};

export function SaveHostToggleButton({
  channelId,
  hostId: hostIdProp,
  className,
  iconClassName,
  onRequireSignIn,
  signInCompletedToken = 0,
}: Props) {
  const user = useSelector((s: RootState) => s.auth.user);
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  const [hostId, setHostId] = useState<string | null>(hostIdProp ?? null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (hostIdProp) {
      setHostId(hostIdProp);
      return;
    }
    if (!channelId) {
      setHostId(null);
      return;
    }
    void getHostIdForChannel(channelId).then(setHostId);
  }, [channelId, hostIdProp]);

  useEffect(() => {
    if (!hostId || !user?.id) {
      setSaved(false);
      return;
    }
    void fetchSavedHostStatus(hostId).then(setSaved);
  }, [hostId, user?.id]);

  const toggle = useCallback(async () => {
    if (!hostId) {
      toast.error("Host not available for this video");
      return;
    }
    if (!isAuthenticated || !user?.id || user.role === "VISITOR") {
      if (onRequireSignIn) {
        onRequireSignIn();
        return;
      }
      toast.error("Sign in as a tipper to save hosts");
      return;
    }
    setBusy(true);
    try {
      const ok = saved
        ? await unsaveHostRequest(hostId)
        : await saveHostRequest(hostId);
      if (ok) {
        setSaved(!saved);
        toast.success(saved ? "Host removed from saves" : "Host saved");
      } else {
        toast.error("Could not update saved host");
      }
    } finally {
      setBusy(false);
    }
  }, [hostId, saved, isAuthenticated, user?.id, user?.role, onRequireSignIn]);

  useEffect(() => {
    if (!signInCompletedToken || !hostId) return;
    if (!isAuthenticated || !user?.id || user.role === "VISITOR") return;
    if (saved || busy) return;
    let cancelled = false;
    void (async () => {
      setBusy(true);
      try {
        const ok = await saveHostRequest(hostId);
        if (cancelled) return;
        if (ok) {
          setSaved(true);
          toast.success("Host saved");
        } else {
          toast.error("Could not save host");
        }
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    signInCompletedToken,
    hostId,
    isAuthenticated,
    user?.id,
    user?.role,
    saved,
    busy,
  ]);

  if (!channelId && !hostId) return null;

  return (
    <button
      type="button"
      title={saved ? "Remove host from saves" : "Save host"}
      onClick={() => void toggle()}
      disabled={busy || !hostId}
      className={cn(
        "pointer-events-auto rounded bg-black/50 p-1 text-white disabled:opacity-50",
        className
      )}
    >
      <UserRoundPlus
        className={cn(
          "size-5",
          saved ? "fill-moonstone-blue" : "",
          iconClassName
        )}
      />
    </button>
  );
}
