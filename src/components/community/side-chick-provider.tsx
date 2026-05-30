"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useSelector } from "react-redux";

import { getPusherClient } from "@/lib/pusher";
import type { RootState } from "@/redux/store";

const apiBase = () => process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "";

export type SideChickCustomization = {
  headerColor: string | null;
  tvLogoUrl: string | null;
  brandColor: string | null;
} | null;

export type SideChickActivationPayload = {
  communityId: string;
  startedAt: string;
  community: { id: string; name: string; logoUrl: string | null };
  customization: SideChickCustomization;
};

type SideChickCtx = {
  loading: boolean;
  active: boolean;
  activation: SideChickActivationPayload | null;
  refresh: () => void;
  exitDedicatedMode: () => Promise<boolean>;
};

const defaultCtx: SideChickCtx = {
  loading: false,
  active: false,
  activation: null,
  refresh: () => {},
  exitDedicatedMode: async () => false,
};

const SideChickContext = createContext<SideChickCtx>(defaultCtx);

export function useSideChick() {
  return useContext(SideChickContext);
}

export function SideChickProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, token } = useSelector(
    (s: RootState) => s.auth
  );
  const [loading, setLoading] = useState(true);
  const [activation, setActivation] =
    useState<SideChickActivationPayload | null>(null);

  const canHydrateSideChick = Boolean(
    isAuthenticated &&
      token &&
      (user?.role === "TIPPER" || user?.role === "HOST")
  );

  const load = useCallback(async () => {
    const t = token;
    if (!canHydrateSideChick || !t) {
      setActivation(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const r = await fetch(`${apiBase()}/me/side-chick`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (!r.ok) {
        setActivation(null);
        return;
      }
      const data = (await r.json()) as {
        active?: boolean;
        activation?: SideChickActivationPayload | null;
      };
      if (data.active && data.activation) {
        setActivation(data.activation);
      } else {
        setActivation(null);
      }
    } catch {
      setActivation(null);
    } finally {
      setLoading(false);
    }
  }, [canHydrateSideChick, token]);

  useEffect(() => {
    if (!canHydrateSideChick || !token) return;
    if (typeof window === "undefined") return;
    let shouldExit = false;
    try {
      shouldExit =
        window.sessionStorage.getItem(
          "tipmanna_exit_sidechick_after_logout"
        ) === "1";
    } catch {
      return;
    }
    if (!shouldExit) return;
    try {
      window.sessionStorage.removeItem("tipmanna_exit_sidechick_after_logout");
    } catch {
      /* ignore */
    }
    void (async () => {
      try {
        const r = await fetch(`${apiBase()}/me/side-chick/exit`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (r.ok) await load();
      } catch {
        await load();
      }
    })();
  }, [canHydrateSideChick, token, load]);

  useEffect(() => {
    void load();
  }, [load]);

  const exitDedicatedMode = useCallback(async () => {
    if (!token) return false;
    const r = await fetch(`${apiBase()}/me/side-chick/exit`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return false;
    await load();
    return true;
  }, [token, load]);

  useEffect(() => {
    if (!canHydrateSideChick || !user?.id) return;
    const p = getPusherClient();
    if (!p) return;
    const name = `user-tipper-${user.id}`;
    const ch = p.subscribe(name);
    const onChange = () => void load();
    ch.bind("side-chick-state-changed", onChange);
    return () => {
      ch.unbind("side-chick-state-changed", onChange);
      try {
        p.unsubscribe(name);
      } catch {
        /* noop */
      }
    };
  }, [canHydrateSideChick, user?.id, load]);

  useEffect(() => {
    const id = activation?.communityId;
    if (!id || !canHydrateSideChick) return;
    const p = getPusherClient();
    if (!p) return;
    const name = `community-${id}`;
    const ch = p.subscribe(name);
    const onCust = () => void load();
    ch.bind("customization-updated", onCust);
    return () => {
      ch.unbind("customization-updated", onCust);
      try {
        p.unsubscribe(name);
      } catch {
        /* noop */
      }
    };
  }, [activation?.communityId, canHydrateSideChick, load]);

  const value = useMemo(
    () => ({
      loading,
      active: Boolean(activation),
      activation,
      refresh: load,
      exitDedicatedMode,
    }),
    [loading, activation, load, exitDedicatedMode]
  );

  return (
    <SideChickContext.Provider value={value}>
      {children}
    </SideChickContext.Provider>
  );
}
