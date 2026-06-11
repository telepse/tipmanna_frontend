"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSelector } from "react-redux";

import { getMeJoinedCommunitiesAction } from "@/actions/communities";
import { useSideChick } from "@/components/community/side-chick-provider";
import { RootState } from "@/redux/store";
import { useTV } from "@/components/tv-provider";

type TvSourcePickerContextValue = {
  communityFeatureOn: boolean;
  showSourceDropdown: boolean;
  tvPickerOptions: { id: string; name: string }[];
  scheduleSourceCommunityId: string | null;
  tvSideChickLocked: boolean;
  tvPickerOpen: boolean;
  setTvPickerOpen: (open: boolean) => void;
  pickTipmanna: () => void;
  pickCommunity: (id: string) => void;
  onTvSourceChange: (id: string | null) => void;
  openTvSourcePicker: () => void;
};

const TvSourcePickerContext = createContext<TvSourcePickerContextValue | null>(
  null
);

export function useTvSourcePicker() {
  const ctx = useContext(TvSourcePickerContext);
  if (!ctx) {
    throw new Error("TvSourcePickerProvider missing");
  }
  return ctx;
}

export function TvSourcePickerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const userId = useSelector((s: RootState) => s.auth.user?.id);
  const searchParams = useSearchParams();
  const router = useRouter();
  const communityFeatureOn =
    process.env.NEXT_PUBLIC_COMMUNITY_FEATURE_ENABLED === "true";

  const {
    setScheduleSourceCommunityId,
    scheduleSourceCommunityId,
    retryScheduleLoad,
  } = useTV();

  const [tvPickerOpen, setTvPickerOpen] = useState(false);
  const [tvPickerOptions, setTvPickerOptions] = useState<
    { id: string; name: string }[]
  >([]);

  const sideChick = useSideChick();
  const tvSideChickLocked =
    !sideChick.loading &&
    Boolean(sideChick.active && sideChick.activation?.communityId) &&
    communityFeatureOn;

  useEffect(() => {
    if (!tvSideChickLocked || !sideChick.activation?.communityId) return;
    const id = sideChick.activation.communityId;
    const videoId = searchParams.get("videoId");
    if (videoId) return;
    setScheduleSourceCommunityId(id);
    try {
      localStorage.setItem("tipmanna-tv-community-id", id);
    } catch {
      /* ignore */
    }
    setTvPickerOpen(false);
    router.replace(`/tv?community=${encodeURIComponent(id)}`, {
      scroll: false,
    });
  }, [
    tvSideChickLocked,
    sideChick.activation?.communityId,
    searchParams,
    setScheduleSourceCommunityId,
    router,
  ]);

  const fetchTvPickerMemberships = useCallback(async () => {
    if (!userId) {
      setTvPickerOptions([]);
      return;
    }
    const r = await getMeJoinedCommunitiesAction();
    if (!r.success || !Array.isArray(r.data?.memberships)) return;
    const rows = r.data.memberships as {
      communityId: string;
      active: boolean;
      membershipStatus: string;
      revokedAt: string | null;
      expiresAt: string | null;
      community?: {
        name?: string;
        tvActivatedAt?: string | null;
        tvHostPaused?: boolean | null;
      };
    }[];
    const opts = rows
      .filter(m => {
        if (!m.active || m.revokedAt) return false;
        if (m.membershipStatus !== "active") return false;
        if (m.expiresAt && new Date(m.expiresAt) <= new Date()) return false;
        return (
          Boolean(m.community?.tvActivatedAt) && !m.community?.tvHostPaused
        );
      })
      .map(m => ({
        id: m.communityId,
        name: m.community?.name ?? m.communityId,
      }));
    setTvPickerOptions(opts);
  }, [userId]);

  useEffect(() => {
    if (communityFeatureOn) void fetchTvPickerMemberships();
  }, [communityFeatureOn, fetchTvPickerMemberships]);

  useEffect(() => {
    const videoId = searchParams.get("videoId");
    if (videoId) {
      setScheduleSourceCommunityId(null);
      setTvPickerOpen(false);
      return;
    }
    if (tvSideChickLocked && sideChick.activation?.communityId) {
      return;
    }
    const fromQuery = searchParams.get("community")?.trim();
    if (fromQuery) {
      setScheduleSourceCommunityId(fromQuery);
      try {
        localStorage.setItem("tipmanna-tv-community-id", fromQuery);
      } catch {
        /* ignore */
      }
      setTvPickerOpen(false);
      return;
    }
    try {
      const stored = localStorage.getItem("tipmanna-tv-community-id")?.trim();
      if (stored) {
        setScheduleSourceCommunityId(stored);
        router.replace(`/tv?community=${encodeURIComponent(stored)}`, {
          scroll: false,
        });
        setTvPickerOpen(false);
        return;
      }
    } catch {
      /* ignore */
    }
    setScheduleSourceCommunityId(null);
  }, [
    communityFeatureOn,
    fetchTvPickerMemberships,
    router,
    searchParams,
    setScheduleSourceCommunityId,
    tvSideChickLocked,
    sideChick.activation?.communityId,
  ]);

  const pickTipmanna = useCallback(() => {
    try {
      localStorage.removeItem("tipmanna-tv-community-id");
    } catch {
      /* ignore */
    }
    setScheduleSourceCommunityId(null);
    router.replace("/tv", { scroll: false });
    retryScheduleLoad();
    setTvPickerOpen(false);
  }, [router, retryScheduleLoad, setScheduleSourceCommunityId]);

  const pickCommunity = useCallback(
    (id: string) => {
      try {
        localStorage.setItem("tipmanna-tv-community-id", id);
      } catch {
        /* ignore */
      }
      setScheduleSourceCommunityId(id);
      router.replace(`/tv?community=${encodeURIComponent(id)}`, {
        scroll: false,
      });
      retryScheduleLoad();
      setTvPickerOpen(false);
    },
    [router, retryScheduleLoad, setScheduleSourceCommunityId]
  );

  const onTvSourceChange = useCallback(
    (id: string | null) => {
      if (id) pickCommunity(id);
      else pickTipmanna();
    },
    [pickCommunity, pickTipmanna]
  );

  const openTvSourcePicker = useCallback(() => {
    setTvPickerOpen(true);
    void fetchTvPickerMemberships();
  }, [fetchTvPickerMemberships]);

  const showSourceDropdown = useMemo(
    () =>
      communityFeatureOn && !searchParams.get("videoId") && !tvSideChickLocked,
    [communityFeatureOn, searchParams, tvSideChickLocked]
  );

  const value = useMemo(
    () => ({
      communityFeatureOn,
      showSourceDropdown,
      tvPickerOptions,
      scheduleSourceCommunityId,
      tvSideChickLocked,
      tvPickerOpen,
      setTvPickerOpen,
      pickTipmanna,
      pickCommunity,
      onTvSourceChange,
      openTvSourcePicker,
    }),
    [
      communityFeatureOn,
      showSourceDropdown,
      tvPickerOptions,
      scheduleSourceCommunityId,
      tvSideChickLocked,
      tvPickerOpen,
      pickTipmanna,
      pickCommunity,
      onTvSourceChange,
      openTvSourcePicker,
    ]
  );

  return (
    <TvSourcePickerContext.Provider value={value}>
      {children}
    </TvSourcePickerContext.Provider>
  );
}
