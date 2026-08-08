"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { User } from "lucide-react";
import { useSelector } from "react-redux";

import {
  getCommunityExploreCatalogAction,
  getMeJoinedCommunitiesAction,
  getMyCommunitiesAction,
  leaveJoinedCommunityAction,
  patchMembershipFeedActiveAction,
  rejoinCommunityMembershipAction,
  searchCommunitiesPreviewAction,
  submitCommunityStartInterestAction,
  type CommunityExploreCatalogRow,
} from "@/actions/communities";
import { ExploreTopCommunitiesGrid } from "@/components/explore/explore-top-communities-grid";
import { TipperEmailOtpSignInDialog } from "@/components/auth/tipper-email-otp-sign-in-dialog";
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
import { Textarea } from "@/components/ui/textarea";
import { useImageUpload } from "@/hooks/use-image-upload";
import { isTipmannaSystemCommunity } from "@/lib/tv-community-picker";
import { cn } from "@/lib/utils";
import { normalizeEmail } from "@/lib/normalize-email";
import type { RootState } from "@/redux/store";
import { toast } from "react-toastify";
import { uploadImage } from "@/lib/cloudinary";
import { COMMUNITY_TYPE_LABELS } from "@/lib/community-type-labels";
import {
  COMMUNITY_TYPE_OPTIONS,
  type CommunityType,
} from "@/schemas/community.schema";

const TIPMANNA_COMMUNITY_ID =
  process.env.NEXT_PUBLIC_TIPMANNA_COMMUNITY_ID?.trim() ?? "";

const EXPLORE_COMMUNITY_HUB_HREF = "/explore?tab=my-communities";

function exploreCommunityJoinHref(communityId: string) {
  return `/explore?tab=join&joinCommunity=${encodeURIComponent(communityId)}`;
}

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
  const {
    user,
    isAuthenticated,
    token: authToken,
  } = useSelector((s: RootState) => s.auth);
  const userId = user?.id;

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
    topByTips: CommunityExploreCatalogRow[];
  } | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const [signInOpen, setSignInOpen] = useState(false);
  const [signInReturnTo, setSignInReturnTo] = useState<string | null>(null);
  const [signInModalTitle, setSignInModalTitle] = useState("Sign in required");

  const [owned, setOwned] = useState<CommunityBrief[]>([]);
  const [coCreated, setCoCreated] = useState<CommunityBrief[]>([]);

  const [interestName, setInterestName] = useState("");
  const [interestDesc, setInterestDesc] = useState("");
  const [interestType, setInterestType] = useState<CommunityType>(
    COMMUNITY_TYPE_OPTIONS[0]
  );
  const [interestStart, setInterestStart] = useState("");
  const [interestEmail, setInterestEmail] = useState("");
  const [interestPhone, setInterestPhone] = useState("");
  const [interestSubmitting, setInterestSubmitting] = useState(false);
  const [startCommunityModalOpen, setStartCommunityModalOpen] = useState(false);
  const {
    readableImage: interestLogoPreview,
    error: interestLogoUploadError,
    inputRef: interestLogoInputRef,
    handleImageUpload: handleInterestLogoUpload,
    handleChangeImage: handleInterestLogoChangeClick,
    handleRemoveImage: handleRemoveInterestLogo,
  } = useImageUpload({ maxSizeMB: 2 });
  const [leaveConfirmTarget, setLeaveConfirmTarget] = useState<{
    communityId: string;
    name: string;
  } | null>(null);
  const [leaveInProgress, setLeaveInProgress] = useState(false);

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    setCatalogError(null);
    try {
      const r = await getCommunityExploreCatalogAction();
      if (r.success && r.data) {
        setCatalog({
          total: r.data.total,
          alphabetical: r.data.alphabetical,
          topByTips: r.data.topByTips,
        });
      } else {
        setCatalog(null);
        setCatalogError(r.message ?? "Could not load communities");
      }
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  useEffect(() => {
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
    if (user?.role !== "HOST" || !userId) {
      if (user?.role === "TIPPER" && userId && authToken) {
        void (async () => {
          const hostRes = await getMyCommunitiesAction(authToken);
          if (hostRes.success && hostRes.data) {
            const raw = hostRes.data as {
              owned: CommunityBrief[];
              coCreator: CommunityBrief[];
            };
            if (
              (raw.owned?.length ?? 0) > 0 ||
              (raw.coCreator?.length ?? 0) > 0
            ) {
              setOwned(raw.owned ?? []);
              setCoCreated(raw.coCreator ?? []);
              return;
            }
          }
          setOwned([]);
          setCoCreated([]);
        })();
      } else {
        setOwned([]);
        setCoCreated([]);
      }
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
  }, [authToken, user?.role, userId]);

  useEffect(() => {
    const email =
      user && "email" in user && typeof user.email === "string"
        ? user.email
        : "";
    setInterestEmail(email);
  }, [user]);

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

  const eventSlug =
    user?.role === "HOST" && "eventSlug" in user
      ? (user.eventSlug?.trim() ?? "")
      : "";

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
    const q = catalogFilter.trim().toLowerCase();
    if (!q) return catalog.alphabetical;
    return catalog.alphabetical.filter(
      c =>
        c.name.toLowerCase().includes(q) ||
        (c.description?.toLowerCase().includes(q) ?? false)
    );
  }, [catalog, catalogFilter]);

  const openJoinSignIn = useCallback((communityId: string) => {
    setSignInReturnTo(exploreCommunityJoinHref(communityId));
    setSignInOpen(true);
  }, []);

  const openStartCommunityFlow = useCallback(() => {
    if (isAuthenticated && userId && authToken) {
      setStartCommunityModalOpen(true);
      return;
    }
    setSignInModalTitle("Sign in to start a community");
    setSignInOpen(true);
  }, [authToken, isAuthenticated, userId]);

  const handleInterestSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!userId || !authToken) {
        toast.error("Sign in to send this request.");
        return;
      }
      const communityName = interestName.trim();
      const description = interestDesc.trim();
      const contactEmail = normalizeEmail(interestEmail.trim());
      if (!communityName || !description || !contactEmail) {
        toast.error("Please fill in community name, description, and email.");
        return;
      }
      setInterestSubmitting(true);
      try {
        let logoUrl: string | null = null;
        if (interestLogoPreview?.startsWith("data:")) {
          const uploaded = await uploadImage(interestLogoPreview);
          logoUrl = uploaded?.secure_url ?? null;
          if (!logoUrl) {
            toast.error("Could not upload community logo. Try again.");
            return;
          }
        }

        const r = await submitCommunityStartInterestAction(authToken, {
          communityName,
          description,
          communityType: interestType,
          logoUrl,
          interestedStartDate: interestStart.trim() || null,
          contactEmail,
          contactPhone: interestPhone.trim() || null,
        });
        if (r.success) {
          toast.success("Interest sent — admins have been notified.");
          setStartCommunityModalOpen(false);
          setInterestName("");
          setInterestDesc("");
          setInterestStart("");
          setInterestPhone("");
          handleRemoveInterestLogo();
          const email =
            user && "email" in user && typeof user.email === "string"
              ? user.email
              : "";
          setInterestEmail(email);
        } else if (r.message?.includes("(401)")) {
          setSignInModalTitle("Sign in to send this request");
          setSignInOpen(true);
        } else {
          toast.error(r.message ?? "Could not send request");
        }
      } finally {
        setInterestSubmitting(false);
      }
    },
    [
      authToken,
      interestDesc,
      interestEmail,
      interestName,
      interestLogoPreview,
      interestPhone,
      interestStart,
      interestType,
      user,
      userId,
    ]
  );

  const catalogTotalDisplay = catalogLoading
    ? "…"
    : String(catalog?.total ?? 0);

  const canCreateCommunity = owned.length === 0 && coCreated.length === 0;

  return (
    <div className="bg-background min-h-0 pb-10">
      <TipperEmailOtpSignInDialog
        open={signInOpen}
        onOpenChange={open => {
          setSignInOpen(open);
          if (!open) setSignInModalTitle("Sign in required");
        }}
        signInTitle={signInModalTitle}
        onVerified={() => {
          setStartCommunityModalOpen(true);
        }}
      />
      <Dialog
        open={startCommunityModalOpen}
        onOpenChange={open => {
          setStartCommunityModalOpen(open);
          if (!open) handleRemoveInterestLogo();
        }}
      >
        <DialogContent className="flex max-h-[min(90dvh,640px)] flex-col gap-0 overflow-hidden sm:max-w-lg">
          <DialogHeader className="shrink-0 space-y-2 pr-6 pb-2">
            <DialogTitle>Tell us about your community idea</DialogTitle>
            <DialogDescription>
              Share a few details so our team knows you are interested. This
              notifies admins only — it does not activate a community or link an
              event room.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <form
              className="space-y-3 pb-1"
              onSubmit={e => void handleInterestSubmit(e)}
            >
              <div className="space-y-1">
                <Label htmlFor="sc-name">Community name</Label>
                <Input
                  id="sc-name"
                  value={interestName}
                  onChange={e => setInterestName(e.target.value)}
                  placeholder="Working title"
                  required
                  autoComplete="organization"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sc-desc">Short description</Label>
                <Textarea
                  id="sc-desc"
                  value={interestDesc}
                  onChange={e => setInterestDesc(e.target.value)}
                  placeholder="What is it about?"
                  rows={3}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>
                  Community logo{" "}
                  <span className="text-muted-foreground font-normal">
                    (optional)
                  </span>
                </Label>
                <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={handleInterestLogoChangeClick}
                    className="relative size-20 shrink-0 overflow-hidden rounded-full border bg-neutral-100"
                  >
                    {interestLogoPreview ? (
                      <img
                        src={interestLogoPreview}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center">
                        <User className="text-muted-foreground size-10" />
                      </div>
                    )}
                  </button>
                  <div className="min-w-0 flex-1 space-y-2">
                    <input
                      ref={interestLogoInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handleInterestLogoUpload}
                    />
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleInterestLogoChangeClick}
                        className="w-fit"
                      >
                        Change photo
                      </Button>
                      {interestLogoPreview ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive w-fit"
                          onClick={handleRemoveInterestLogo}
                        >
                          Remove photo
                        </Button>
                      ) : null}
                      {interestLogoUploadError ? (
                        <p className="text-destructive text-xs">
                          {interestLogoUploadError}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label id="sc-type-label">Community type</Label>
                <div
                  className="flex flex-wrap gap-2"
                  role="radiogroup"
                  aria-labelledby="sc-type-label"
                >
                  {COMMUNITY_TYPE_OPTIONS.map(opt => (
                    <Button
                      key={opt}
                      type="button"
                      role="radio"
                      aria-checked={interestType === opt}
                      variant={interestType === opt ? "default" : "outline"}
                      size="sm"
                      className="h-auto shrink-0 rounded-full px-3 py-1.5 font-normal"
                      onClick={() => setInterestType(opt)}
                    >
                      {COMMUNITY_TYPE_LABELS[opt]}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="sc-start">
                  Interested start date{" "}
                  <span className="text-muted-foreground font-normal">
                    (optional)
                  </span>
                </Label>
                <Input
                  id="sc-start"
                  type="date"
                  value={interestStart}
                  onChange={e => setInterestStart(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sc-email">How can we reach you? (email)</Label>
                <Input
                  id="sc-email"
                  type="email"
                  value={interestEmail}
                  onChange={e => setInterestEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sc-phone">
                  Phone{" "}
                  <span className="text-muted-foreground font-normal">
                    (with country code, optional)
                  </span>
                </Label>
                <Input
                  id="sc-phone"
                  value={interestPhone}
                  onChange={e => setInterestPhone(e.target.value)}
                  placeholder="+44 …"
                  autoComplete="tel"
                />
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  type="submit"
                  disabled={interestSubmitting}
                >
                  {interestSubmitting ? "Sending…" : "Send interest"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={interestSubmitting}
                  onClick={() => setStartCommunityModalOpen(false)}
                >
                  Cancel
                </Button>
              </div>
              <p className="text-muted-foreground text-[11px]">
                Your request is stored securely and every admin receives an
                in-app notification.
              </p>
            </form>
          </div>
        </DialogContent>
      </Dialog>

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
                    <p className="truncate text-sm font-medium">{c.name}</p>
                    {c.description ? (
                      <p className="text-muted-foreground line-clamp-2 text-xs">
                        {c.description}
                      </p>
                    ) : null}
                    <p className="text-muted-foreground text-[11px]">
                      {c.totalTips} tips · {c.memberCount} members · Created{" "}
                      {formatCommunityDate(c.createdAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {c.viewer?.joined ? (
                      <span className="text-muted-foreground self-center text-xs">
                        Member
                      </span>
                    ) : !c.isSystem ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          if (!isAuthenticated) openJoinSignIn(c.id);
                          else router.push(exploreCommunityJoinHref(c.id));
                        }}
                      >
                        Join
                      </Button>
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
                        <p className="truncate text-sm font-medium">{c.name}</p>
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
                      {c.viewer?.joined ? (
                        <Button
                          asChild
                          size="sm"
                          variant="outline"
                        >
                          <Link href={exploreCommunityJoinHref(c.id)}>
                            Details
                          </Link>
                        </Button>
                      ) : !isTipmannaPublic ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            if (!isAuthenticated) openJoinSignIn(c.id);
                            else router.push(exploreCommunityJoinHref(c.id));
                          }}
                        >
                          Join
                        </Button>
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

          {catalogLoading ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <Skeleton className="h-28 rounded-lg" />
              <Skeleton className="h-28 rounded-lg" />
              <Skeleton className="h-28 rounded-lg" />
            </div>
          ) : (catalog?.topByTips?.length ?? 0) === 0 ? (
            <p className="text-muted-foreground text-sm">
              No active communities to rank yet.
            </p>
          ) : (
            <ExploreTopCommunitiesGrid communities={catalog?.topByTips ?? []} />
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
                >
                  Start community
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
              >
                Start community
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
              {user?.role === "HOST" && eventSlug ? (
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
                  asChild
                  size="sm"
                  variant="secondary"
                >
                  <Link href={exploreCommunityJoinHref(c.id)}>Open</Link>
                </Button>
              )}
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
                    asChild
                    size="sm"
                    variant="outline"
                  >
                    <Link href={exploreCommunityJoinHref(c.id)}>Open</Link>
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
                          asChild
                          variant="outline"
                          size="sm"
                        >
                          <Link href={exploreCommunityJoinHref(m.communityId)}>
                            Open community
                          </Link>
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
      {/* <Button
        asChild
        variant="outline"
        size="sm"
      >
        <Link href={exploreCommunityJoinHref(m.communityId)}>Details</Link>
      </Button> */}
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
}: {
  m: HubMembership;
  onFeedActive: (communityId: string, feedActive: boolean) => void;
  onLeave: (communityId: string, name: string) => void;
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
            asChild
            variant="outline"
            size="sm"
          >
            <Link href={exploreCommunityJoinHref(m.communityId)}>Details</Link>
          </Button>
        )}

        {m.community?.tvActivatedAt ? (
          <Button
            asChild
            variant="secondary"
            size="sm"
          >
            <Link href={`/tv?community=${encodeURIComponent(m.communityId)}`}>
              Watch TV
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
