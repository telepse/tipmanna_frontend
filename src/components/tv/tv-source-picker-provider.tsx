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

import {
  getMeJoinedCommunitiesAction,
  getMyCommunitiesAction,
} from "@/actions/communities";
import { useSideChick } from "@/components/community/side-chick-provider";
import { RootState } from "@/redux/store";
import { useTV } from "@/components/tv-provider";
import {
  buildTvPickerOptionsForUser,
  type TvCommunityBrief,
  type TvMembershipRow,
} from "@/lib/tv-community-picker";
import {
  buildTvPagePath,
  navigateToTvSource,
  persistTvSourceCommunityId,
  readTvSourceCommunityIdFromLocation,
} from "@/lib/tv-source-navigation";

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
  const authUser = useSelector((s: RootState) => s.auth.user);
  const authToken = useSelector((s: RootState) => s.auth.token);
  const userId = authUser?.id;
  const searchParams = useSearchParams();
  const router = useRouter();
  const communityFeatureOn =
    process.env.NEXT_PUBLIC_COMMUNITY_FEATURE_ENABLED === "true";

  const { setScheduleSourceCommunityId, scheduleSourceCommunityId } = useTV();

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
    setTvPickerOpen(false);
    const target = buildTvPagePath(id);
    const current =
      typeof window !== "undefined"
        ? `${window.location.pathname}${window.location.search}`
        : "";
    if (current !== target) {
      navigateToTvSource(id);
      return;
    }
    setScheduleSourceCommunityId(id);
    persistTvSourceCommunityId(id);
  }, [
    tvSideChickLocked,
    sideChick.activation?.communityId,
    searchParams,
    setScheduleSourceCommunityId,
  ]);

  const fetchTvPickerMemberships = useCallback(async () => {
    if (!userId || !authToken) {
      setTvPickerOptions([]);
      return;
    }
    const joinedPromise = getMeJoinedCommunitiesAction(authToken);
    const hostCommunitiesPromise =
      authUser?.role === "HOST"
        ? getMyCommunitiesAction(authToken)
        : Promise.resolve(null);

    const [joinedRes, hostRes] = await Promise.all([
      joinedPromise,
      hostCommunitiesPromise,
    ]);

    const memberships = (
      joinedRes.success && Array.isArray(joinedRes.data?.memberships)
        ? joinedRes.data.memberships
        : []
    ) as TvMembershipRow[];

    let owned: TvCommunityBrief[] = [];
    let coCreator: TvCommunityBrief[] = [];
    if (hostRes?.success && hostRes.data) {
      const raw = hostRes.data as {
        owned?: TvCommunityBrief[];
        coCreator?: TvCommunityBrief[];
      };
      owned = raw.owned ?? [];
      coCreator = raw.coCreator ?? [];
    }

    setTvPickerOptions(
      buildTvPickerOptionsForUser({ memberships, owned, coCreator })
    );
  }, [authToken, authUser?.role, userId]);

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
      persistTvSourceCommunityId(fromQuery);
      setTvPickerOpen(false);
      return;
    }
    const stored = readTvSourceCommunityIdFromLocation();
    if (stored) {
      setScheduleSourceCommunityId(stored);
      router.replace(`/tv?community=${encodeURIComponent(stored)}`, {
        scroll: false,
      });
      setTvPickerOpen(false);
      return;
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
    setTvPickerOpen(false);
    navigateToTvSource(null);
  }, []);

  const pickCommunity = useCallback((id: string) => {
    setTvPickerOpen(false);
    navigateToTvSource(id);
  }, []);

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
