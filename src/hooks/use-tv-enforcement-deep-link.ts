"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

/**
 * When /tv is opened with `?enforcement=` (and optional `?community=`),
 * play the enforced program or video after the schedule is ready.
 */
export function useTvEnforcementDeepLink(params: {
  tvReady: boolean;
  itemsLength: number;
  scheduleSourceCommunityId: string | null;
  playEnforcementProgram: (
    enforcementId: string,
    communityId?: string | null
  ) => Promise<void>;
}) {
  const searchParams = useSearchParams();
  const enforcementId = searchParams.get("enforcement")?.trim() ?? null;
  const communityId = searchParams.get("community")?.trim() ?? null;
  const playedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enforcementId || !params.tvReady || params.itemsLength === 0) return;

    const expectedSource = communityId ?? null;
    if (params.scheduleSourceCommunityId !== expectedSource) return;

    const key = `${expectedSource ?? ""}|${enforcementId}`;
    if (playedKeyRef.current === key) return;
    playedKeyRef.current = key;

    void params.playEnforcementProgram(enforcementId, communityId);
  }, [
    enforcementId,
    communityId,
    params.tvReady,
    params.itemsLength,
    params.scheduleSourceCommunityId,
    params.playEnforcementProgram,
  ]);
}
