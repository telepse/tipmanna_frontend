"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSelector } from "react-redux";

import {
  getCommunityExploreCatalogAction,
  getTopCommunitiesAction,
  getMeJoinedCommunitiesAction,
  getMyCommunitiesAction,
  leaveJoinedCommunityAction,
  patchMembershipFeedActiveAction,
  rejoinCommunityMembershipAction,
  searchCommunitiesPreviewAction,
  type CommunityExploreCatalogRow,
} from "@/actions/communities";
import { ExploreTopCommunitiesGrid } from "@/components/explore/explore-top-communities-grid";
import { CommunityJoinOpenControls } from "@/components/community/community-join-open-controls";
import { JoinCommunityModal } from "@/components/community/join-community-modal";
import { useCommunityJoinFlow } from "@/hooks/use-community-join-flow";
import { exploreCommunityJoinHref } from "@/lib/community-links";
import {
  buildStartCommunityHubReturnTo,
  shouldOpenStartCommunityFromSearch,
  START_COMMUNITY_RESUME_QUERY,
} from "@/lib/start-community-resume";
import { resolveStartCommunityAfterGuestModal } from "@/lib/start-community-guest-resume";
import { AUTH_CHANGED_EVENT } from "@/lib/auth-events";
import {
  clearCommunityExploreCatalogCache,
  isCommunityExploreCatalogStale,
  readCommunityExploreCatalogCache,
  writeCommunityExploreCatalogCache,
} from "@/lib/community-explore-catalog-cache";
import SignInDialog, {
  type SignInModalPayload,
} from "@/components/auth/sign-in-dialog";
import { StartCommunityRequestDialog } from "@/components/community/start-community-request-dialog";
import { useHostCapabilityWithAuth } from "@/hooks/use-host-capability-with-auth";
import { useHostSession } from "@/hooks/use-host-session";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { isTipmannaSystemCommunity } from "@/lib/tv-community-picker";
import { cn, trimTitle } from "@/lib/utils";
import type { RootState } from "@/redux/store";
import { toast } from "react-toastify";
import { ExternalLink } from "lucide-react";

const TIPMANNA_COMMUNITY_ID =
  process.env.NEXT_PUBLIC_TIPMANNA_COMMUNITY_ID?.trim() ?? "";

const EXPLORE_COMMUNITY_HUB_HREF = "/explore?tab=my-communities";

function manageHostCommunityHref(eventSlug: string) {
  return `/host/${encodeURIComponent(eventSlug)}/host-community`;
}

type HubMembership = {
  id: string;
  communityId: string;
  feedActive: boolean;
  membershipStatus: string;
  active: boolean;
  revokedAt: string | null;
  expiresAt: string | null;
  /** From API: paid window / rejoin hints */
  activePaidSubscriptionExpiresAt?: string | null;
  activePaidSubscriptionOpenEnded?: boolean;
  joinBackEligibleUntil?: string | null;
  joinBackOpenEnded?: boolean;
  community?: {
    id: string;
    name: string;
    logoUrl?: string | null;
    status?: string;
    isSystem?: boolean;
    tvActivatedAt?: string | null;
  };
};

type SearchRow = {
  id: string;
  name: string;
  description?: string | null;
  logoUrl?: string | null;
  createdAt?: string;
  totalTips?: number;
  memberCount?: number;
  viewer?: { joined: boolean; feedActive?: boolean };
};

type CommunityBrief = {
  id: string;
  name: string;
  event?: { id: string; eventType?: string } | null;
};

function membershipUsable(m: HubMembership): boolean {
  if (!m.active || m.revokedAt) return false;
  if (m.membershipStatus !== "active") return false;
  if (m.expiresAt && new Date(m.expiresAt) <= new Date()) return false;
  return true;
}

function isDefaultSystemCommunity(m: HubMembership): boolean {
  if (m.community?.isSystem) return true;
  if (TIPMANNA_COMMUNITY_ID && m.communityId === TIPMANNA_COMMUNITY_ID)
    return true;
  return false;
}

function syntheticTipmannaMembership(): HubMembership {
  const id = TIPMANNA_COMMUNITY_ID || "tipmanna-public";
  return {
    id: `synthetic-tipmanna-${id}`,
    communityId: id,
    feedActive: true,
    membershipStatus: "active",
    active: true,
    revokedAt: null,
    expiresAt: null,
    community: {
      id,
      name: "Tipmanna",
      isSystem: true,
      logoUrl: null,
    },
  };
}

function formatCommunityDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function canJoinBackWhileWindowOpen(m: HubMembership): boolean {
  if (isDefaultSystemCommunity(m)) return false;
  if (membershipUsable(m)) return false;
  if (m.joinBackOpenEnded) return true;
  const until = m.joinBackEligibleUntil;
  if (until && new Date(until) > new Date()) return true;
  return false;
}

function communityHistoryReason(m: HubMembership): string {
  const end = m.expiresAt ? formatCommunityDate(m.expiresAt) : null;
  if (m.membershipStatus === "revoked") {
    return "Membership disqualified or removed by the community host.";
  }
  if (m.membershipStatus === "cancelled") {
    return end
      ? `You left this community. Last day of the previous access window: ${end}.`
      : "You left this community.";
  }
  if (m.membershipStatus === "expired") {
    return end
      ? `Subscription or membership period ended. Last day: ${end}.`
      : "Subscription or membership period ended.";
  }
  if (m.expiresAt && new Date(m.expiresAt) <= new Date()) {
    return `Subscription or membership period ended (last day ${end ?? "—"}).`;
  }
  return "No longer an active member on this community.";
}

export default function CommunityHubClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    user,
    isAuthenticated,
    token: authToken,
  } = useSelector((s: RootState) => s.auth);
  const userId = user?.id;
  const startCommunityUpgradeReturnTo = useMemo(
    () => buildStartCommunityHubReturnTo(EXPLORE_COMMUNITY_HUB_HREF),
    []
  );
  const {
    canWriteAsHost,
    capability,
    sessionLoading,
    requestHostAuth,
    HostAuthModal,
  } = useHostCapabilityWithAuth({
    requireHostAccount: true,
    hostUpgradeReturnToOverride: startCommunityUpgradeReturnTo,
  });

  const hostCapabilityLoading =
    capability.status === "loading" || sessionLoading;

  const [memberships, setMemberships] = useState<HubMembership[]>([]);
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<SearchRow[]>([]);
  const [searchBusy, setSearchBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [catalogOpen, setCatalogOpen] = useState(false);
  const [catalogFilter, setCatalogFilter] = useState("");
  const [catalog, setCatalog] = useState<{
    total: number;
    alphabetical: CommunityExploreCatalogRow[];
  } | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [topCommunities, setTopCommunities] = useState<
    CommunityExploreCatalogRow[]
  >([]);
  const [topLoading, setTopLoading] = useState(true);

  const [hostSignInOpen, setHostSignInOpen] = useState(false);
  const [pendingStartCommunity, setPendingStartCommunity] = useState(false);

  const [owned, setOwned] = useState<CommunityBrief[]>([]);
  const [coCreated, setCoCreated] = useState<CommunityBrief[]>([]);

  const [startCommunityModalOpen, setStartCommunityModalOpen] = useState(false);
  const startCommunityResumeHandledRef = useRef(false);
  const [leaveConfirmTarget, setLeaveConfirmTarget] = useState<{
    communityId: string;
    name: string;
  } | null>(null);
  const [leaveInProgress, setLeaveInProgress] = useState(false);

  const loadTopCommunities = useCallback(async () => {
    setTopLoading(true);
    try {
      const r = await getTopCommunitiesAction(3);
      if (r.success && r.data?.communities) {
        setTopCommunities(r.data.communities);
      } else {
        setTopCommunities([]);
      }
    } finally {
      setTopLoading(false);
    }
  }, []);

  const loadCatalog = useCallback(
    async (options?: { background?: boolean }) => {
      const background = options?.background ?? false;
      if (!background) {
        setCatalogLoading(true);
      }
      setCatalogError(null);
      try {
        const r = await getCommunityExploreCatalogAction();
        if (r.success && r.data) {
          setCatalog({
            total: r.data.total,
            alphabetical: r.data.alphabetical,
          });
          writeCommunityExploreCatalogCache({
            total: r.data.total,
            alphabetical: r.data.alphabetical,
            topByTips: r.data.topByTips ?? [],
          });
        } else {
          setCatalog(null);
          setCatalogError(r.message ?? "Could not load communities");
        }
      } finally {
        if (!background) {
          setCatalogLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    const onAuthChanged = () => {
      clearCommunityExploreCatalogCache();
    };
    window.addEventListener(AUTH_CHANGED_EVENT, onAuthChanged);
    return () => window.removeEventListener(AUTH_CHANGED_EVENT, onAuthChanged);
  }, []);

  useEffect(() => {
    void loadTopCommunities();
  }, [loadTopCommunities]);

  useEffect(() => {
    const cached = readCommunityExploreCatalogCache();
    if (cached) {
      setCatalog({
        total: cached.total,
        alphabetical: cached.alphabetical,
      });
      setCatalogLoading(false);
      if (isCommunityExploreCatalogStale(cached)) {
        void loadCatalog({ background: true });
      }
      return;
    }
    void loadCatalog();
  }, [loadCatalog]);

  const loadMemberships = useCallback(async () => {
    if (!userId) {
      setMemberships([]);
      return;
    }
    setRefreshing(true);
    try {
      const r = await getMeJoinedCommunitiesAction(authToken);
      if (r.success && Array.isArray(r.data?.memberships)) {
        setMemberships(r.data.memberships as HubMembership[]);
      } else {
        setMemberships([]);
      }
    } finally {
      setRefreshing(false);
    }
  }, [authToken, userId]);

  useEffect(() => {
    void loadMemberships();
  }, [loadMemberships]);

  useEffect(() => {
    const q = searchQ.trim();
    if (q.length < 1) {
      setSearchResults([]);
      return;
    }
    let cancelled = false;
    const t = window.setTimeout(() => {
      void (async () => {
        setSearchBusy(true);
        try {
          const r = await searchCommunitiesPreviewAction(q);
          if (cancelled) return;
          const raw =
            r.success && Array.isArray(r.data?.communities)
              ? r.data!.communities
              : [];
          const rows: SearchRow[] = raw.map((x: unknown) => {
            const o = x as SearchRow & Record<string, unknown>;
            return {
              id: String(o?.id ?? ""),
              name: String(o?.name ?? "Community"),
              logoUrl: o?.logoUrl,
              description:
                typeof o.description === "string" ? o.description : null,
              createdAt:
                typeof o.createdAt === "string" ? o.createdAt : undefined,
              totalTips:
                typeof o.totalTips === "number" ? o.totalTips : undefined,
              memberCount:
                typeof o.memberCount === "number" ? o.memberCount : undefined,
              viewer: o?.viewer,
            };
          });
          setSearchResults(rows.filter(rw => rw.id));
        } finally {
          if (!cancelled) setSearchBusy(false);
        }
      })();
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [searchQ]);

  useEffect(() => {
    if (!isAuthenticated || !authToken) {
      setOwned([]);
      setCoCreated([]);
      return;
    }

    void (async () => {
      const commRes = await getMyCommunitiesAction(authToken);
      if (commRes.success && commRes.data) {
        const raw = commRes.data as {
          owned: CommunityBrief[];
          coCreator: CommunityBrief[];
        };
        setOwned(raw.owned ?? []);
        setCoCreated(raw.coCreator ?? []);
      } else {
        setOwned([]);
        setCoCreated([]);
      }
    })();
  }, [authToken, isAuthenticated]);

  const defaultSystemRows = useMemo(() => {
    const fromApi = memberships.filter(isDefaultSystemCommunity);
    if (fromApi.length > 0) return fromApi;
    return [syntheticTipmannaMembership()];
  }, [memberships]);

  const nonSystemMemberships = useMemo(
    () => memberships.filter(m => !isDefaultSystemCommunity(m)),
    [memberships]
  );

  const { feedOn, feedPaused, inactive } = useMemo(() => {
    const on: HubMembership[] = [];
    const paused: HubMembership[] = [];
    const rest: HubMembership[] = [];
    for (const m of nonSystemMemberships) {
      if (!membershipUsable(m)) {
        rest.push(m);
        continue;
      }
      if (m.feedActive) on.push(m);
      else paused.push(m);
    }
    return { feedOn: on, feedPaused: paused, inactive: rest };
  }, [nonSystemMemberships]);

  const joinBackRows = useMemo(
    () => inactive.filter(canJoinBackWhileWindowOpen),
    [inactive]
  );

  const inactiveNoJoinBack = useMemo(
    () => inactive.filter(m => !canJoinBackWhileWindowOpen(m)),
    [inactive]
  );

  const { isActive: hostSessionActive, eventSlug: hostSessionEventSlug } =
    useHostSession();

  const eventSlug =
    hostSessionActive && hostSessionEventSlug?.trim()
      ? hostSessionEventSlug.trim()
      : capability.status === "active" || capability.status === "stale"
        ? (capability.eventSlug?.trim() ?? "")
        : "";

  const {
    joinCommunityId,
    joinModalOpen,
    closeJoinModal,
    openJoin,
    openCommunity,
  } = useCommunityJoinFlow({
    signupSurface: "community_hub",
    signInTitle: "Sign in to join this community",
  });

  const showStartCommunityForm =
    Boolean(isAuthenticated) &&
    owned.length === 0 &&
    coCreated.length === 0 &&
    nonSystemMemberships.length === 0;

  const setFeedActive = useCallback(
    async (communityId: string, feedActive: boolean) => {
      if (!userId) return;
      setMemberships(cur =>
        cur.map(m => (m.communityId === communityId ? { ...m, feedActive } : m))
      );
      const r = await patchMembershipFeedActiveAction(
        authToken,
        communityId,
        feedActive
      );
      if (!r.success) await loadMemberships();
    },
    [authToken, loadMemberships, userId]
  );

  const requestLeaveCommunity = useCallback(
    (communityId: string, name: string) => {
      setLeaveConfirmTarget({ communityId, name });
    },
    []
  );

  const confirmLeaveCommunity = useCallback(async () => {
    if (!leaveConfirmTarget || !userId) return;
    setLeaveInProgress(true);
    try {
      const r = await leaveJoinedCommunityAction(
        authToken,
        leaveConfirmTarget.communityId
      );
      if (r.success) {
        toast.success(`Left ${leaveConfirmTarget.name}`);
        setLeaveConfirmTarget(null);
        await loadMemberships();
      } else {
        toast.error(r.message ?? "Could not leave community");
      }
    } finally {
      setLeaveInProgress(false);
    }
  }, [authToken, leaveConfirmTarget, loadMemberships, userId]);

  const rejoinCommunity = useCallback(
    async (communityId: string, name: string) => {
      if (!userId) return;
      const r = await rejoinCommunityMembershipAction(authToken, communityId);
      if (r.success) {
        toast.success(`Welcome back to ${name}`);
        await loadMemberships();
      } else {
        toast.error(r.message ?? "Could not rejoin");
      }
    },
    [authToken, loadMemberships, userId]
  );

  const filteredCatalog = useMemo(() => {
    if (!catalog?.alphabetical.length) return [];
    const base = catalog.alphabetical.filter(
      c => !isTipmannaSystemCommunity(c.id, c.name, c.isSystem)
    );
    const q = catalogFilter.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      c =>
        c.name.toLowerCase().includes(q) ||
        (c.description?.toLowerCase().includes(q) ?? false)
    );
  }, [catalog, catalogFilter]);

  const openStartCommunityForm = useCallback(() => {
    setStartCommunityModalOpen(true);
  }, []);

  const resumeStartCommunityAfterAuth = useCallback(() => {
    if (canWriteAsHost) {
      openStartCommunityForm();
      return;
    }
    const outcome = requestHostAuth(openStartCommunityForm);
    if (outcome === "noop") {
      toast.error(
        "A host account is required. Add an email to your tipper profile or create a host account."
      );
    }
  }, [canWriteAsHost, openStartCommunityForm, requestHostAuth]);

  const openStartCommunityFlow = useCallback(() => {
    if (hostCapabilityLoading) return;
    if (!isAuthenticated || !userId || !authToken) {
      setPendingStartCommunity(true);
      setHostSignInOpen(true);
      return;
    }
    if (canWriteAsHost) {
      openStartCommunityForm();
      return;
    }
    const outcome = requestHostAuth(openStartCommunityForm);
    if (outcome === "noop") {
      toast.error(
        "A host account is required. Add an email to your tipper profile or create a host account."
      );
    }
  }, [
    authToken,
    canWriteAsHost,
    hostCapabilityLoading,
    isAuthenticated,
    openStartCommunityForm,
    requestHostAuth,
    userId,
  ]);

  const handleHostSignInSuccess = useCallback(
    (payload: SignInModalPayload) => {
      setHostSignInOpen(false);
      if (pendingStartCommunity) {
        setPendingStartCommunity(false);
        if (resolveStartCommunityAfterGuestModal(payload.role) === "openForm") {
          openStartCommunityForm();
        } else {
          resumeStartCommunityAfterAuth();
        }
      }
    },
    [
      openStartCommunityForm,
      pendingStartCommunity,
      resumeStartCommunityAfterAuth,
    ]
  );

  useEffect(() => {
    if (
      !shouldOpenStartCommunityFromSearch(
        searchParams.get(START_COMMUNITY_RESUME_QUERY)
      )
    ) {
      startCommunityResumeHandledRef.current = false;
      return;
    }
    if (hostCapabilityLoading) return;
    if (startCommunityResumeHandledRef.current) return;
    startCommunityResumeHandledRef.current = true;

    const cleanParams = new URLSearchParams(searchParams.toString());
    cleanParams.delete(START_COMMUNITY_RESUME_QUERY);
    const cleanQ = cleanParams.toString();
    router.replace(
      cleanQ ? `/explore?${cleanQ}` : "/explore?tab=my-communities",
      {
        scroll: false,
      }
    );

    if (canWriteAsHost) {
      openStartCommunityForm();
    } else if (isAuthenticated && userId) {
      resumeStartCommunityAfterAuth();
    }
  }, [
    canWriteAsHost,
    hostCapabilityLoading,
    isAuthenticated,
    openStartCommunityForm,
    resumeStartCommunityAfterAuth,
    router,
    searchParams,
    userId,
  ]);

  const catalogTotalDisplay = catalogLoading
    ? "…"
    : String(catalog?.total ?? 0);

  const canCreateCommunity = owned.length === 0 && coCreated.length === 0;

  return (
    <div className="bg-background min-h-0 pb-10">
      {joinCommunityId ? (
        <JoinCommunityModal
          open={joinModalOpen}
          onOpenChange={open => {
            if (!open) closeJoinModal();
          }}
          communityId={joinCommunityId}
          signInRedirectPath={exploreCommunityJoinHref(joinCommunityId)}
        />
      ) : null}
      <SignInDialog
        open={hostSignInOpen}
        onOpenChange={open => {
          setHostSignInOpen(open);
          if (!open) setPendingStartCommunity(false);
        }}
        title="Sign in to start a community"
        defaultUserType="host"
        hostRequiredNotice
        allowInlineSignUp
        signupSurface="community_hub"
        onSuccess={handleHostSignInSuccess}
      />
      {HostAuthModal}
      <StartCommunityRequestDialog
        open={startCommunityModalOpen}
        onOpenChange={setStartCommunityModalOpen}
      />

      <AlertDialog
        open={leaveConfirmTarget != null}
        onOpenChange={open => {
          if (!open && !leaveInProgress) setLeaveConfirmTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Leave {leaveConfirmTarget?.name ?? "community"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              You will lose access to this community until you join again. Your
              membership can be restored if you still have an active
              subscription window.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={leaveInProgress}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={leaveInProgress}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={e => {
                e.preventDefault();
                void confirmLeaveCommunity();
              }}
            >
              {leaveInProgress ? "Leaving…" : "Leave community"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={catalogOpen}
        onOpenChange={setCatalogOpen}
      >
        <DialogContent className="flex max-h-[85vh] max-w-lg flex-col gap-4 overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>All communities</DialogTitle>
            <DialogDescription>
              Sorted A–Z. Filter below or scroll to browse.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={catalogFilter}
            onChange={e => setCatalogFilter(e.target.value)}
            placeholder="Filter by name or description…"
            aria-label="Filter communities"
          />
          <ScrollArea className="min-h-0 flex-1 pr-3">
            <ul className="divide-border divide-y rounded-md border">
              {filteredCatalog.map(c => (
                <li
                  key={c.id}
                  className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="truncate text-sm font-medium">
                      {trimTitle(c.name, 25)}
                    </p>
                    {c.description ? (
                      <p className="text-muted-foreground line-clamp-2 text-xs">
                        {c.description}
                      </p>
                    ) : null}
                    <p className="text-muted-foreground text-[11px]">
                      {c.totalTips} tips · {c.memberCount} members ·{" "}
                      {c.numVideos} videos · Created{" "}
                      {formatCommunityDate(c.createdAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 px-0"
                      aria-label="Open community"
                      title="Open community"
                      onClick={() => openCommunity(c.id)}
                    >
                      <ExternalLink className="size-3.5" />
                    </Button>
                    {!c.isSystem ? (
                      <CommunityJoinOpenControls
                        communityId={c.id}
                        joined={Boolean(c.viewer?.joined)}
                        isAuthenticated={isAuthenticated}
                        onJoin={openJoin}
                        onOpen={openCommunity}
                        joinLabel={c.viewer?.joined ? "Open" : undefined}
                      />
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <div className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-8 sm:gap-10 sm:py-10">
        <header className="order-1 space-y-2">
          <h1 className="text-2xl font-semibold">Communities</h1>

          <p className="text-muted-foreground max-w-lg text-sm leading-normal">
            {!isAuthenticated
              ? "Search new communities to join. Sign in to send a start community request and view your memberships."
              : "Search public communities, manage your memberships, and control which ones appear in Explore."}
          </p>
        </header>

        <section className="order-2 space-y-3 border-t pt-8">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <Label
              htmlFor="community-search"
              className="text-base font-medium"
            >
              <span className="text-muted-foreground font-normal"> Search</span>
              <span className="tabular-nums">{catalogTotalDisplay}</span>{" "}
              communities
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={catalogLoading && !catalog}
              onClick={() => {
                setCatalogFilter("");
                setCatalogOpen(true);
              }}
            >
              Browse all A–Z
            </Button>
          </div>
          <Input
            id="community-search"
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            placeholder="Type to search…"
            className="max-w-md"
          />
          {searchBusy ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full max-w-md" />
              <Skeleton className="h-10 w-full max-w-md" />
            </div>
          ) : null}
          {searchResults.length > 0 ? (
            <ul className="divide-border divide-y rounded-md border">
              {searchResults.map(c => {
                const isTipmannaPublic = isTipmannaSystemCommunity(
                  c.id,
                  c.name
                );
                return (
                  <li
                    key={c.id}
                    className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      {c.logoUrl ? (
                        <div className="relative size-10 shrink-0 overflow-hidden rounded-md">
                          <Image
                            src={c.logoUrl}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="40px"
                          />
                        </div>
                      ) : null}
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 truncate text-sm font-medium">
                          {trimTitle(c.name, 15)}{" "}
                        </div>
                        {c.description ? (
                          <p className="text-muted-foreground line-clamp-2 text-xs">
                            {c.description}
                          </p>
                        ) : null}
                        <p className="text-muted-foreground text-[11px]">
                          {typeof c.totalTips === "number"
                            ? `${c.totalTips} tips`
                            : null}
                          {typeof c.totalTips === "number" &&
                          typeof c.memberCount === "number"
                            ? " · "
                            : null}
                          {typeof c.memberCount === "number"
                            ? `${c.memberCount} members`
                            : null}
                          {(typeof c.totalTips === "number" ||
                            typeof c.memberCount === "number") &&
                          c.createdAt
                            ? " · "
                            : null}
                          {c.createdAt
                            ? `Created ${formatCommunityDate(c.createdAt)}`
                            : null}
                        </p>
                        {c.viewer?.joined ? (
                          <p className="text-muted-foreground text-xs">
                            You&apos;re a member
                            {c.viewer.feedActive === false
                              ? " · Explore feed paused"
                              : ""}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      {!isTipmannaPublic ? (
                        <CommunityJoinOpenControls
                          communityId={c.id}
                          joined={Boolean(c.viewer?.joined)}
                          isAuthenticated={isAuthenticated}
                          onJoin={openJoin}
                          onOpen={openCommunity}
                          joinLabel={c.viewer?.joined ? "Details" : undefined}
                        />
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : searchQ.trim().length >= 1 && !searchBusy ? (
            <p className="text-muted-foreground text-xs">No matches.</p>
          ) : null}
          {catalogError ? (
            <p className="text-destructive text-xs">{catalogError}</p>
          ) : null}
        </section>

        <section className="order-3 space-y-4 border-t pt-8">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Top communities</h2>
            <p className="text-muted-foreground text-xs">
              Ranked by total tips received.
            </p>
          </div>

          {topLoading ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <Skeleton className="h-28 rounded-lg" />
              <Skeleton className="h-28 rounded-lg" />
              <Skeleton className="h-28 rounded-lg" />
            </div>
          ) : topCommunities.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No active communities to rank yet.
            </p>
          ) : (
            <ExploreTopCommunitiesGrid communities={topCommunities} />
          )}
        </section>

        <section className="order-4 space-y-4 border-t pt-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Communities you own</h2>

            <div className="flex flex-wrap items-center gap-2">
              {canCreateCommunity && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={openStartCommunityFlow}
                  disabled={hostCapabilityLoading}
                  aria-busy={hostCapabilityLoading}
                >
                  {hostCapabilityLoading
                    ? "Checking host account…"
                    : "Start community"}
                </Button>
              )}
              {/* {user?.role === "HOST" && eventSlug ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  asChild
                >
                  <a
                    href={manageHostCommunityHref(eventSlug)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Manage host community
                  </a>
                </Button>
              ) : null} */}
            </div>
          </div>

          {!isAuthenticated ? (
            <div className="bg-muted/40 space-y-3 rounded-lg border p-4">
              <p className="text-muted-foreground text-sm">
                No communities detected on your account.
              </p>
              <p className="text-sm font-medium">
                Send a request to start another community
              </p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="w-full sm:w-auto"
                onClick={openStartCommunityFlow}
                disabled={hostCapabilityLoading}
                aria-busy={hostCapabilityLoading}
              >
                {hostCapabilityLoading
                  ? "Checking host account…"
                  : "Start community"}
              </Button>
            </div>
          ) : null}

          {isAuthenticated && showStartCommunityForm ? (
            <div className="bg-muted/40 space-y-3 rounded-lg border p-4">
              <p className="text-muted-foreground text-sm">
                No communities on your account yet. Use{" "}
                <span className="text-foreground font-medium">
                  Start community
                </span>{" "}
                above to send a request.
              </p>
            </div>
          ) : null}

          {owned.map(c => (
            <div
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-2"
            >
              <p className="min-w-0 truncate font-medium">{c.name}</p>
              <div className="flex shrink-0 gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => openCommunity(c.id)}
                >
                  Open
                </Button>
                {eventSlug ? (
                  canWriteAsHost ? (
                    <Button
                      asChild
                      size="sm"
                      variant="secondary"
                    >
                      <a
                        href={manageHostCommunityHref(eventSlug)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Manage
                      </a>
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      type="button"
                      onClick={() =>
                        requestHostAuth(() => {
                          window.open(
                            manageHostCommunityHref(eventSlug),
                            "_blank",
                            "noreferrer"
                          );
                        })
                      }
                    >
                      {capability.status === "stale"
                        ? "Sign in to manage"
                        : "Manage"}
                    </Button>
                  )
                ) : null}
              </div>
            </div>
          ))}

          {coCreated.length > 0 ? (
            <div className="space-y-2">
              <h3 className="text-muted-foreground text-sm font-medium">
                Co-created
              </h3>
              {coCreated.map(c => (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-2"
                >
                  <p>{c.name}</p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => openCommunity(c.id)}
                  >
                    Open
                  </Button>
                </div>
              ))}
            </div>
          ) : null}
        </section>

        <section className="order-5 space-y-4 border-t pt-8">
          <div className="flex items-center justify-between gap-2">
            <h5 className="text-lg font-semibold">Your memberships</h5>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={refreshing || !userId}
              onClick={() => void loadMemberships()}
            >
              Refresh
            </Button>
          </div>

          {!isAuthenticated ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Default system community
                </h3>

                <ul className="divide-border divide-y rounded-lg border">
                  {defaultSystemRows.map(m => (
                    <SyntheticTipmannaRow
                      key={m.id}
                      m={m}
                    />
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="space-y-2">
                <h5 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Default system community
                </h5>

                <ul className="divide-border divide-y rounded-lg border">
                  {defaultSystemRows.map(m => (
                    <MembershipRow
                      key={m.id}
                      m={m}
                      onFeedActive={setFeedActive}
                      onLeave={requestLeaveCommunity}
                      onOpenCommunity={openCommunity}
                    />
                  ))}
                </ul>
              </div>

              {feedOn.length === 0 &&
              feedPaused.length === 0 &&
              joinBackRows.length === 0 &&
              inactiveNoJoinBack.length === 0 &&
              nonSystemMemberships.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  You haven&apos;t joined any communities beyond the default
                  system hub. Use search above or an invite link.
                </p>
              ) : null}

              {feedOn.length > 0 ? (
                <div className="space-y-2">
                  <h5 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    Explore feed on
                  </h5>

                  <ul className="divide-border divide-y rounded-lg border">
                    {feedOn.map(m => (
                      <MembershipRow
                        key={m.id}
                        m={m}
                        onFeedActive={setFeedActive}
                        onLeave={requestLeaveCommunity}
                        onOpenCommunity={openCommunity}
                      />
                    ))}
                  </ul>
                </div>
              ) : null}
              {feedPaused.length > 0 ? (
                <div className="space-y-2">
                  <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    Explore feed paused
                  </h3>
                  <ul className="divide-border divide-y rounded-lg border">
                    {feedPaused.map(m => (
                      <MembershipRow
                        key={m.id}
                        m={m}
                        onFeedActive={setFeedActive}
                        onLeave={requestLeaveCommunity}
                        onOpenCommunity={openCommunity}
                      />
                    ))}
                  </ul>
                </div>
              ) : null}

              {joinBackRows.length > 0 ? (
                <div className="space-y-2">
                  <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    Left — access or subscription still active
                  </h3>
                  <ul className="divide-border divide-y rounded-lg border">
                    {joinBackRows.map(m => (
                      <li
                        key={m.id}
                        className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {m.community?.name ?? m.communityId}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {m.joinBackOpenEnded
                              ? "You still have an active paid subscription window — you can join back without paying again."
                              : `You can rejoin without a new payment until ${formatCommunityDate(
                                  m.joinBackEligibleUntil ?? m.expiresAt ?? null
                                )}.`}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            void rejoinCommunity(
                              m.communityId,
                              m.community?.name ?? m.communityId
                            )
                          }
                        >
                          Join back
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="space-y-2">
                <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Community history
                </h3>
                {inactiveNoJoinBack.length === 0 ? (
                  <p className="text-muted-foreground rounded-lg border border-dashed px-3 py-4 text-sm">
                    When a membership ends and you can&apos;t rejoin with your
                    old window, it will appear here with a short reason (for
                    example period ended, removed by host, or you left).
                  </p>
                ) : (
                  <ul className="divide-border divide-y rounded-lg border">
                    {inactiveNoJoinBack.map(m => (
                      <li
                        key={m.id}
                        className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {m.community?.name ?? m.communityId}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {communityHistoryReason(m)}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => openCommunity(m.communityId)}
                        >
                          Open community
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function SyntheticTipmannaRow({ m }: { m: HubMembership }) {
  const name = m.community?.name ?? "Tipmanna";
  return (
    <li className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{name}</p>
        <p className="text-muted-foreground text-xs">
          Public hub — everyone can explore Tipmanna content.
        </p>
      </div>
      <Link href="/partner">
        <Button
          asChild
          variant="outline"
          size="sm"
        >
          About Tipmanna
        </Button>
      </Link>
    </li>
  );
}

function MembershipRow({
  m,
  onFeedActive,
  onLeave,
  onOpenCommunity,
}: {
  m: HubMembership;
  onFeedActive: (communityId: string, feedActive: boolean) => void;
  onLeave: (communityId: string, name: string) => void;
  onOpenCommunity: (communityId: string) => void;
}) {
  const name = m.community?.name ?? m.communityId;
  const logoUrl = m.community?.logoUrl;
  const canToggle = membershipUsable(m);
  const defaultSystem = isDefaultSystemCommunity(m);

  return (
    <li className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        {logoUrl ? (
          <div className="relative size-10 shrink-0 overflow-hidden rounded-md">
            <Image
              src={logoUrl}
              alt=""
              fill
              className="object-cover"
              sizes="40px"
            />
          </div>
        ) : null}

        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{name}</p>

          {!canToggle ? (
            <p className="text-muted-foreground text-xs">
              Membership inactive or expired — renew or rejoin to use Explore
              feeds.
            </p>
          ) : null}
          {defaultSystem ? (
            <p className="text-muted-foreground text-[11px]">
              Default system community — public Explore hub.
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs">In Explore feed</span>

          <Switch
            checked={m.feedActive}
            // disabled={!canToggle || defaultSystem}
            disabled
            onCheckedChange={v => onFeedActive(m.communityId, v)}
            aria-label={`Include ${name} in Explore`}
          />
        </div>

        {!defaultSystem && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenCommunity(m.communityId)}
          >
            Details
          </Button>
        )}

        {m.community?.tvActivatedAt ? (
          <Button
            asChild
            variant="secondary"
            size="sm"
          >
            <Link href={`/tv?community=${encodeURIComponent(m.communityId)}`}>
              Community TV
            </Link>
          </Button>
        ) : null}

        {canToggle && !defaultSystem ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const url = `${typeof window !== "undefined" ? window.location.origin : ""}/community/side-chick/${m.communityId}`;
              void navigator.clipboard.writeText(url).then(
                () => toast.success("Dedicated mode link copied"),
                () => toast.error("Could not copy")
              );
            }}
          >
            Copy dedicated link
          </Button>
        ) : null}

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            "text-destructive",
            defaultSystem ? "cursor-not-allowed" : ""
          )}
          disabled={defaultSystem}
          onClick={() => onLeave(m.communityId, name)}
        >
          Leave
        </Button>
      </div>
    </li>
  );
}
