"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useSelector } from "react-redux";
import { Lock } from "lucide-react";

import { getCommunityAccessStateAction } from "@/actions/communities";
import { JoinCommunityModal } from "@/components/community/join-community-modal";
import { useTV } from "@/components/tv-provider";
import { Button } from "@/components/ui/button";
import { TvPageSuspenseFallback } from "@/components/tv/tv-page-suspense-fallback";
import type { CommunityTvAccessStateSlice } from "@/lib/community-tv-entitlement";
import {
  resolveCommunityIntentFromUrl,
  resolveCommunityTvAccessGate,
  resolveCommunityTvAuthViewerSettlement,
  resolveCommunityTvClientEntitlementProbePlan,
  resolveInitialCommunityTvGatePhase,
  ssrCommunityTvEntitlementAppliesToIntent,
  type CommunityTvAuthViewerBaseline,
} from "@/lib/tv-community-access-gate-logic";
import type { SsrCommunityTvViewerEntitlement } from "@/lib/tv-ssr-live-tip-catalog";
import {
  buildTvPagePath,
  navigateToTvSource,
  persistTvSourceCommunityId,
} from "@/lib/tv-source-navigation";
import { clearTvScheduleSessionCacheForCommunity } from "@/lib/tv-schedule-session-cache";
import { invalidateCommunityAccessState } from "@/lib/drawer-prefetch-cache";
import { RootState } from "@/redux/store";

type GatePhase = "idle" | "checking" | "allowed" | "denied";

function CommunityTvAccessDenied({
  communityId,
  onJoinClick,
}: {
  communityId: string;
  onJoinClick: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-4 px-4 text-center">
      <Lock className="text-muted-foreground size-10" />
      <h1 className="text-2xl font-semibold">Community members only</h1>
      <p className="text-muted-foreground text-sm">
        Sign in or join this community to watch Community TV.
      </p>
      <Button
        type="button"
        onClick={onJoinClick}
      >
        Sign in or join
      </Button>
      <Button
        asChild
        variant="outline"
      >
        <a href="/tv">Watch Tipmanna TV</a>
      </Button>
    </div>
  );
}

export function TvCommunityAccessGate({
  children,
  urlCommunityIntent = null,
  ssrCommunityTvViewerEntitlement = "unknown",
}: {
  children: React.ReactNode;
  /** Server page `searchParams.community` — avoids `useSearchParams` Suspense on hard reload. */
  urlCommunityIntent?: string | null;
  /** Entitlement from SSR access-state for this navigation (see loadSsrTvBootstrap). */
  ssrCommunityTvViewerEntitlement?: SsrCommunityTvViewerEntitlement;
}) {
  const communityIntent = resolveCommunityIntentFromUrl(urlCommunityIntent);
  const authToken = useSelector((s: RootState) => s.auth.token);
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  const authUserId = useSelector((s: RootState) => s.auth.user?.id ?? null);
  const authUserRole = useSelector((s: RootState) => s.auth.user?.role ?? null);
  const requiresVerification = useSelector(
    (s: RootState) => s.auth.requiresVerification
  );
  const persistAuthHydrationComplete = useSelector(
    (s: RootState) => s.auth.persistAuthHydrationComplete
  );
  const persistRehydrated = useSelector(
    (s: RootState & { _persist?: { rehydrated?: boolean } }) =>
      Boolean(s._persist?.rehydrated)
  );

  const { setScheduleSourceCommunityId } = useTV();
  const [phase, setPhase] = useState<GatePhase>(() =>
    resolveInitialCommunityTvGatePhase(
      resolveCommunityIntentFromUrl(urlCommunityIntent),
      urlCommunityIntent,
      ssrCommunityTvViewerEntitlement
    )
  );
  const [joinOpen, setJoinOpen] = useState(false);

  const ssrAuthBaselineRef = useRef<CommunityTvAuthViewerBaseline | null>(null);

  useLayoutEffect(() => {
    ssrAuthBaselineRef.current = null;
  }, [communityIntent, urlCommunityIntent, ssrCommunityTvViewerEntitlement]);

  const applyAllowed = useCallback(
    (communityId: string) => {
      setScheduleSourceCommunityId(communityId);
      persistTvSourceCommunityId(communityId);
      setPhase("allowed");
    },
    [setScheduleSourceCommunityId]
  );

  const applyDenied = useCallback(
    (communityId: string) => {
      clearTvScheduleSessionCacheForCommunity(communityId);
      setScheduleSourceCommunityId(null);
      persistTvSourceCommunityId(null);
      setPhase("denied");
    },
    [setScheduleSourceCommunityId]
  );

  useLayoutEffect(() => {
    if (!communityIntent) return;
    if (
      !ssrCommunityTvEntitlementAppliesToIntent(
        communityIntent,
        urlCommunityIntent,
        ssrCommunityTvViewerEntitlement
      )
    ) {
      return;
    }
    if (ssrCommunityTvViewerEntitlement === "entitled") {
      applyAllowed(communityIntent);
    } else {
      applyDenied(communityIntent);
    }
  }, [
    communityIntent,
    urlCommunityIntent,
    ssrCommunityTvViewerEntitlement,
    applyAllowed,
    applyDenied,
  ]);

  useEffect(() => {
    if (!communityIntent) {
      setPhase("idle");
      return;
    }

    const ssrApplies = ssrCommunityTvEntitlementAppliesToIntent(
      communityIntent,
      urlCommunityIntent,
      ssrCommunityTvViewerEntitlement
    );

    const settlement = resolveCommunityTvAuthViewerSettlement({
      persistRehydrated,
      persistAuthHydrationComplete,
      isAuthenticated,
      requiresVerification,
      userId: authUserId,
      userRole: authUserRole,
      token: authToken,
    });
    const baseline = ssrAuthBaselineRef.current;
    const probePlan = resolveCommunityTvClientEntitlementProbePlan({
      ssrApplies,
      ssrEntitlement: ssrCommunityTvViewerEntitlement,
      settlement,
      authBaselineEstablished: baseline !== null,
      baselineViewerKey: baseline?.viewerKey ?? null,
    });

    if (probePlan === "defer_until_persist_rehydrated") {
      return;
    }
    if (probePlan === "establish_baseline") {
      if (settlement.status === "settled") {
        ssrAuthBaselineRef.current = { viewerKey: settlement.viewerKey };
      }
      return;
    }
    if (probePlan === "skip_ssr_authoritative") {
      return;
    }

    if (settlement.status === "settled") {
      ssrAuthBaselineRef.current = { viewerKey: settlement.viewerKey };
    }

    let cancelled = false;

    setScheduleSourceCommunityId(null);
    setPhase("checking");

    void (async () => {
      try {
        const res = await getCommunityAccessStateAction(communityIntent);
        if (cancelled) return;

        const resolution = resolveCommunityTvAccessGate(
          communityIntent,
          res.success,
          res.success
            ? (res.data as CommunityTvAccessStateSlice | null | undefined)
            : null
        );

        if (resolution.outcome === "allowed") {
          applyAllowed(resolution.communityId);
          return;
        }
        if (resolution.outcome === "denied") {
          applyDenied(resolution.communityId);
        }
      } catch {
        if (cancelled) return;
        applyDenied(communityIntent);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    communityIntent,
    urlCommunityIntent,
    ssrCommunityTvViewerEntitlement,
    authToken,
    isAuthenticated,
    authUserId,
    authUserRole,
    requiresVerification,
    persistRehydrated,
    persistAuthHydrationComplete,
    setScheduleSourceCommunityId,
    applyAllowed,
    applyDenied,
  ]);

  const handleJoined = useCallback(() => {
    if (!communityIntent) return;
    setJoinOpen(false);
    invalidateCommunityAccessState(communityIntent);
    navigateToTvSource(communityIntent);
  }, [communityIntent]);

  if (!communityIntent) {
    return <>{children}</>;
  }

  if (phase === "checking" || phase === "idle") {
    return <TvPageSuspenseFallback />;
  }

  if (phase === "denied") {
    return (
      <>
        <CommunityTvAccessDenied
          communityId={communityIntent}
          onJoinClick={() => setJoinOpen(true)}
        />
        <JoinCommunityModal
          open={joinOpen}
          onOpenChange={setJoinOpen}
          communityId={communityIntent}
          signInRedirectPath={buildTvPagePath(communityIntent)}
          title="Join community to watch TV"
          onJoined={handleJoined}
        />
      </>
    );
  }

  return <>{children}</>;
}
