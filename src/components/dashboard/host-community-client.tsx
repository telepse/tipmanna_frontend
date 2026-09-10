"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import {
  Plus,
  Copy,
  Check,
  Mail,
  Users,
  UserX,
  Banknote,
  User,
} from "lucide-react";
import { useSelector } from "react-redux";
import Link from "next/link";
import { useParams, usePathname, useSearchParams } from "next/navigation";

import { DashboardHeading } from "@/components/dashboard/dashboard-heading";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AddCommunityBankVideoDialog } from "@/components/community/add-community-bank-video-dialog";
import {
  acceptPayoutSettlementAction,
  getHostPayoutSummaryAction,
} from "@/actions/host-payouts";
import {
  approveCommunityBankEntryAction,
  getCommunityContentBankAction,
  getCommunitySendsAction,
  getMyCommunitiesAction,
  inviteCoCreatorAction,
  listCoCreatorsAction,
  rejectCommunityBankEntryAction,
  revokeCoCreatorAction,
  revokeCoCreatorInviteAction,
  patchCommunityBankEntryVisibilityAction,
  listCommunitySubscribersAction,
  getCommunityOwedAction,
  resumeCommunityTvAction,
} from "@/actions/communities";
import { ApiError } from "@/types/api-error.types";
import { CommunityMembershipOwnerPanel } from "@/components/dashboard/community-membership-owner-panel";
import { useHostSession } from "@/hooks/use-host-session";
import type { RootState } from "@/redux/store";
import { subscribeChannel, unsubscribeChannel } from "@/lib/pusher";
import { subscribeHostInAppNotifications } from "@/lib/host-notification-channel";
import { getHostEventsAction } from "@/actions/events";
import {
  createCommunityActivationRequestAction,
  listMyCommunityActivationRequestsAction,
} from "@/actions/community-activation-requests";
import { normalizeEmail } from "@/lib/normalize-email";
import { parseHostEventsEligibleForCommunity } from "@/lib/parse-host-events";
import { useHostPlanCapabilities } from "@/hooks/useHostPlanCapabilities";
import { useImageUpload } from "@/hooks/use-image-upload";
import { HostSubscriptionPricingPanel } from "@/components/dashboard/host-subscription-pricing-panel";
import { HostSubscriptionUpgradeTrigger } from "@/components/dashboard/host-subscription-modal";
import { useHostSubscriptionPrompt } from "@/hooks/use-host-subscription-prompt";
import { copyShareUrl } from "@/lib/copy-share-url";
import { buildContentShareUrl } from "@/lib/public-video-url";
import { uploadImage } from "@/lib/cloudinary";
import { useInstallPrompt } from "@/hooks/use-install-prompt";
import { usePushPermission } from "@/hooks/use-push-permission";
import { getPwaInstallInstructions } from "@/lib/pwa-utils";

function ReadOnlyOverlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      <div className="pointer-events-none opacity-60 select-none">
        {children}
      </div>
      <div
        className="bg-background/40 absolute inset-0 z-10"
        aria-hidden
      />
    </div>
  );
}

type CommunityBrief = {
  id: string;
  name: string;
  event?: { id: string; eventType: string } | null;
  tvActivatedAt?: string | null;
  tvHostPaused?: boolean | null;
};

type BankItem = {
  id: string;
  status: string;
  visibility?: "public" | "private";
  submittedBy: { id: string; fullName: string; username: string } | null;
  channel: {
    id: string;
    title: string;
    url: string;
    shareUrl: string;
  };
  metrics: {
    numOfTips: number;
    completes: number;
    encounters: number;
    amountRaised: number;
    durationSeconds: number;
  };
};

type Membership = {
  id: string;
  name: string;
  role: "owner" | "coCreator";
  eventType?: string;
  eventId?: string | null;
  tvActivatedAt?: string | null;
  tvHostPaused?: boolean | null;
};

type CoCreatorHostRow = {
  id: string;
  status: string;
  host: {
    id: string;
    fullName: string;
    email: string;
    username: string;
  };
};

type PendingInviteRow = {
  id: string;
  email: string;
  expiresAt: string;
  createdAt: string;
};

type PaidSubRow = {
  id: string;
  amount: string;
  status: string;
  startedAt: string;
  expiresAt: string | null;
  paymentRef: string | null;
  createdAt: string;
  tipper: {
    id: string;
    username: string;
    email: string | null;
    fullName: string | null;
  } | null;
  membership: {
    id: string;
    tier: string;
    active: boolean;
    expiresAt: string | null;
  } | null;
};

type OwedPayload = {
  payout: {
    amountOwed: string;
    amountPaid: string;
    outstanding: string;
    currency: string;
    status: string;
    settledAt: string | null;
    notes: string | null;
  } | null;
  recentSubs: Array<{
    id: string;
    amount: string;
    status: string;
    createdAt: string;
    paymentRef: string | null;
    tipper: { username: string } | null;
  }>;
};

const communityFeatureOn =
  process.env.NEXT_PUBLIC_COMMUNITY_FEATURE_ENABLED === "true";

function isCommunityApiUnavailable(message?: string | null): boolean {
  const m = (message ?? "").toLowerCase();
  return m.includes("not found") || m.includes("(404)");
}

function OwnerBankCard({
  item,
  communityId,
  eventId,
  onUpdated,
}: {
  item: BankItem;
  communityId: string;
  eventId?: string | null;
  onUpdated: () => void;
}) {
  const authUser = useSelector((s: RootState) => s.auth.user);
  const authToken = useSelector((s: RootState) => s.auth.token);
  const { handleSubscriptionActionError, SubscriptionPromptModal } =
    useHostSubscriptionPrompt({ focusTier: "community" });
  const [busy, setBusy] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [copied, setCopied] = useState(false);

  const run = async (
    fn: () => Promise<{
      success: boolean;
      message?: string;
      validationBody?: unknown;
    }>
  ) => {
    setBusy(true);
    try {
      const res = await fn();
      if (!res.success) {
        if (
          handleSubscriptionActionError(res, {
            focusTier: "community",
            toastFallback: false,
          })
        ) {
          return;
        }
        toast.error(res.message ?? "Request failed");
        return;
      }
      toast.success("Updated");
      onUpdated();
    } finally {
      setBusy(false);
      setRejectOpen(false);
      setRejectReason("");
    }
  };

  const visibility = item.visibility ?? "public";

  const getShareUrl = () => {
    if (!eventId?.trim() || !item.channel.id?.trim()) return null;
    return buildContentShareUrl({
      eventId: eventId.trim(),
      channelId: item.channel.id,
    });
  };

  const copyLink = async () => {
    const shareUrl = getShareUrl();
    if (!shareUrl) {
      toast.error("Could not build video link");
      return;
    }
    try {
      await copyShareUrl(shareUrl);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy link");
    }
  };

  return (
    <>
      {SubscriptionPromptModal}
      <Dialog
        open={rejectOpen}
        onOpenChange={o => !busy && setRejectOpen(o)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject submission</DialogTitle>
          </DialogHeader>
          <Label htmlFor="reject-reason">Reason (optional)</Label>
          <Textarea
            id="reject-reason"
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            rows={3}
            placeholder="Optional note for the submitter"
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setRejectOpen(false)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={busy}
              onClick={() => {
                if (!authUser || !authToken) {
                  toast.error("Not signed in");
                  return;
                }
                void run(async () => {
                  const res = await rejectCommunityBankEntryAction(
                    communityId,
                    item.id,
                    { reason: rejectReason || undefined }
                  );
                  return {
                    success: res.success,
                    message: res.message ?? res.error ?? undefined,
                  };
                });
              }}
            >
              Reject
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="bg-card relative space-y-2 rounded-md border p-4">
        <h5 className="font-semibold">{item.channel.title}</h5>
        <p className="text-muted-foreground mt-1 truncate text-xs">
          {item.channel.url}
        </p>
        {item.submittedBy && (
          <p className="text-muted-foreground mt-1 text-xs">
            From {item.submittedBy.fullName} (@{item.submittedBy.username})
          </p>
        )}
        <span
          className={`absolute top-4 right-4 rounded ${item.status === "pending" ? "bg-secondary" : "bg-green-100 text-green-900"} px-2 py-0.5 text-[11px] font-medium`}
        >
          {item.status}
        </span>

        <div className="text-muted-foreground flex items-center gap-2 text-xs">
          <span>Tips: {item.metrics.numOfTips}</span>
          <span>Raised: £{Number(item.metrics.amountRaised).toFixed(2)}</span>
          <span>Completes: {item.metrics.completes}</span>
          <span>Views: {item.metrics.encounters}</span>
        </div>

        {item.status === "pending" && (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              disabled={busy}
              onClick={() => {
                if (!authUser || !authToken) {
                  toast.error("Not signed in");
                  return;
                }
                void run(async () => {
                  const res = await approveCommunityBankEntryAction(
                    communityId,
                    item.id
                  );
                  return {
                    success: res.success,
                    message: res.message ?? res.error ?? undefined,
                  };
                });
              }}
            >
              Approve
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => setRejectOpen(true)}
            >
              Reject
            </Button>
          </div>
        )}

        {item.status === "approved" && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground text-xs">Visibility</span>
            <Select
              value={visibility}
              disabled={busy}
              onValueChange={(v: "public" | "private") => {
                if (!authUser || !authToken) {
                  toast.error("Not signed in");
                  return;
                }
                void run(async () => {
                  const res = await patchCommunityBankEntryVisibilityAction(
                    communityId,
                    item.id,
                    v
                  );
                  return {
                    success: res.success,
                    message: res.message ?? res.error ?? undefined,
                  };
                });
              }}
            >
              <SelectTrigger className="h-7 w-fit px-2 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="private">Private</SelectItem>
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              disabled={!getShareUrl()}
              onClick={() => void copyLink()}
            >
              {copied ? (
                <>
                  <Check className="mr-1 size-3.5" /> Copied
                </>
              ) : (
                <>
                  <Copy className="mr-1 size-3.5" /> Copy link
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </>
  );
}

function SendCard({
  item,
  eventId,
}: {
  item: BankItem;
  eventId?: string | null;
}) {
  const [copied, setCopied] = useState(false);

  const getShareUrl = () => {
    if (eventId?.trim() && item.channel.id?.trim()) {
      return buildContentShareUrl({
        eventId: eventId.trim(),
        channelId: item.channel.id,
      });
    }
    return item.channel.shareUrl;
  };

  const copy = async () => {
    const shareUrl = getShareUrl();
    if (!shareUrl) {
      toast.error("Could not build video link");
      return;
    }
    try {
      await copyShareUrl(shareUrl);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy");
    }
  };

  return (
    <div className="bg-muted/40 rounded-lg border p-4">
      <p className="font-medium">{item.channel.title}</p>
      <p className="text-muted-foreground mt-1 text-xs">{item.channel.url}</p>
      <div className="text-muted-foreground mt-3 grid grid-cols-2 gap-2 text-xs">
        <span>Tips: {item.metrics.numOfTips}</span>
        <span>Raised: £{Number(item.metrics.amountRaised).toFixed(2)}</span>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-3"
        onClick={copy}
      >
        {copied ? (
          <>
            <Check className="mr-1 size-4" /> Copied
          </>
        ) : (
          <>
            <Copy className="mr-1 size-4" /> Copy link
          </>
        )}
      </Button>
    </div>
  );
}

export function HostCommunityClient() {
  const params = useParams();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hostSlug = typeof params?.slug === "string" ? params.slug : "";
  const authUser = useSelector((s: RootState) => s.auth.user);
  const authUserId = authUser?.id;
  const hostSession = useHostSession();
  const authToken = useSelector((s: RootState) => s.auth.token);
  const {
    status: planStatus,
    capabilities: planCapabilities,
    info: planInfo,
    isLoading: planLoading,
  } = useHostPlanCapabilities();
  const { handleSubscriptionActionError, SubscriptionPromptModal } =
    useHostSubscriptionPrompt({ focusTier: "community" });
  const {
    installed: pwaInstalled,
    promptInstall,
    canInstall,
  } = useInstallPrompt();
  const {
    state: pushState,
    subscribe: subscribePush,
    loading: pushLoading,
    error: pushError,
  } = usePushPermission();
  const pwaInstall = getPwaInstallInstructions({ forPush: true });
  const communityActive =
    planInfo?.tier === "HOST_COMMUNITY" && planStatus === "active";
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mainTab, setMainTab] = useState("bank");
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [bank, setBank] = useState<{
    approved: BankItem[];
    pending: BankItem[];
  } | null>(null);
  const [sends, setSends] = useState<BankItem[] | null>(null);
  const [loadingBank, setLoadingBank] = useState(false);
  const [loadingSends, setLoadingSends] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [modalDraftId, setModalDraftId] = useState<string | null>(null);
  const [coCreators, setCoCreators] = useState<{
    active: CoCreatorHostRow[];
    pendingMemberships: CoCreatorHostRow[];
    revoked: CoCreatorHostRow[];
    pendingInvites: PendingInviteRow[];
  } | null>(null);
  const [loadingCo, setLoadingCo] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);

  const [activationOpen, setActivationOpen] = useState(false);
  const [activationGateOpen, setActivationGateOpen] = useState(false);
  const [activationKind, setActivationKind] = useState<"community" | "tv">(
    "community"
  );
  const [hostEventsPick, setHostEventsPick] = useState<
    { id: string; eventName?: string }[]
  >([]);
  const [pickEventId, setPickEventId] = useState("");
  const [activationBusy, setActivationBusy] = useState(false);
  const [activationCommunityName, setActivationCommunityName] = useState("");
  const [activationDescription, setActivationDescription] = useState("");
  const [activationContactEmail, setActivationContactEmail] = useState("");
  const [activationContactPhone, setActivationContactPhone] = useState("");
  const {
    readableImage: activationLogoPreview,
    error: activationLogoUploadError,
    inputRef: activationLogoInputRef,
    handleImageUpload: handleActivationLogoUpload,
    handleChangeImage: handleActivationLogoChangeClick,
    handleRemoveImage: handleRemoveActivationLogo,
  } = useImageUpload({ maxSizeMB: 2 });
  const [activationRows, setActivationRows] = useState<
    Record<string, unknown>[]
  >([]);
  const [activationListLoading, setActivationListLoading] = useState(false);
  const [activationEventsLoading, setActivationEventsLoading] = useState(false);
  const [communityApiError, setCommunityApiError] = useState<string | null>(
    null
  );

  const [subscribers, setSubscribers] = useState<PaidSubRow[]>([]);
  const [owed, setOwed] = useState<OwedPayload | null>(null);
  const [loadingOwed, setLoadingOwed] = useState(false);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [payoutSummary, setPayoutSummary] = useState<{
    host: Array<{
      settlements?: Array<{
        id: string;
        status: string;
        amountMinor: number;
        receiptUrl?: string | null;
      }>;
    }>;
    communities: Array<{
      communityName?: string;
      settlements?: Array<{
        id: string;
        status: string;
        amountMinor: number;
        receiptUrl?: string | null;
      }>;
    }>;
  } | null>(null);

  const membershipsLoadedRef = useRef(false);
  const mainTabInitializedForRef = useRef<string | null>(null);
  const appliedSearchParamsRef = useRef("");
  const bankLoadedForRef = useRef<string | null>(null);
  const sendsLoadedForRef = useRef<string | null>(null);
  const coCreatorsLoadedForRef = useRef<string | null>(null);
  const owedLoadedForRef = useRef<string | null>(null);

  const pendingPayoutSettlements = useMemo(() => {
    if (!payoutSummary) return [];
    const rows: Array<{
      id: string;
      amountMinor: number;
      receiptUrl?: string | null;
      label: string;
    }> = [];
    for (const h of payoutSummary.host ?? []) {
      for (const s of h.settlements ?? []) {
        if (s.status === "pending_host_ack") {
          rows.push({
            id: s.id,
            amountMinor: s.amountMinor,
            receiptUrl: s.receiptUrl,
            label: "Host payout",
          });
        }
      }
    }
    for (const c of payoutSummary.communities ?? []) {
      for (const s of c.settlements ?? []) {
        if (s.status === "pending_host_ack") {
          rows.push({
            id: s.id,
            amountMinor: s.amountMinor,
            receiptUrl: s.receiptUrl,
            label: c.communityName ?? "Community payout",
          });
        }
      }
    }
    return rows;
  }, [payoutSummary]);

  const loadPayoutSummary = useCallback(async () => {
    if (!hostSession.isActive) return;
    const res = await getHostPayoutSummaryAction();
    if (res.success && res.data) {
      setPayoutSummary(
        res.data as {
          host: Array<{
            settlements?: Array<{
              id: string;
              status: string;
              amountMinor: number;
              receiptUrl?: string | null;
            }>;
          }>;
          communities: Array<{
            communityName?: string;
            settlements?: Array<{
              id: string;
              status: string;
              amountMinor: number;
              receiptUrl?: string | null;
            }>;
          }>;
        }
      );
    }
  }, [hostSession.isActive]);

  useEffect(() => {
    void loadPayoutSummary();
  }, [loadPayoutSummary]);

  // const [hostAlreadyHasCommunity, setHostAlreadyHasCommunity] = useState(false);

  const selected = useMemo(
    () => memberships.find(m => m.id === selectedId) ?? null,
    [memberships, selectedId]
  );

  const selectedRole = selected?.role ?? null;

  const loadMemberships = useCallback(
    async (options?: { background?: boolean }) => {
      if (!authUserId || !authToken) {
        setLoadingMeta(false);
        return;
      }
      if (!options?.background) {
        setLoadingMeta(true);
      }
      setCommunityApiError(null);
      const res = await getMyCommunitiesAction(authToken);
      if (!res.success || !res.data) {
        if (isCommunityApiUnavailable(res.message)) {
          setCommunityApiError(
            "Community API is unavailable. Ensure the backend has COMMUNITY_FEATURE_ENABLED=true and is running."
          );
        } else {
          toast.error(res.message ?? "Could not load communities");
        }
        setLoadingMeta(false);
        return;
      }
      const raw = res.data as {
        owned: CommunityBrief[];
        coCreator: CommunityBrief[];
      };
      const byId = new Map<string, Membership>();
      for (const c of raw.owned ?? []) {
        byId.set(c.id, {
          id: c.id,
          name: c.name,
          role: "owner",
          eventType: c.event?.eventType,
          eventId: c.event?.id ?? null,
          tvActivatedAt: c.tvActivatedAt ?? null,
          tvHostPaused: Boolean(c.tvHostPaused),
        });
      }
      for (const c of raw.coCreator ?? []) {
        if (!byId.has(c.id)) {
          byId.set(c.id, {
            id: c.id,
            name: c.name,
            role: "coCreator",
            eventType: c.event?.eventType,
            eventId: c.event?.id ?? null,
            tvActivatedAt: c.tvActivatedAt ?? null,
            tvHostPaused: Boolean(c.tvHostPaused),
          });
        }
      }
      const list = Array.from(byId.values());
      setMemberships(list);
      setSelectedId(prev => prev ?? list[0]?.id ?? null);
      membershipsLoadedRef.current = true;
      setLoadingMeta(false);
    },
    [authUserId, authToken]
  );

  useEffect(() => {
    if (!communityFeatureOn) return;
    void loadMemberships({
      background: membershipsLoadedRef.current,
    });
  }, [loadMemberships]);

  useEffect(() => {
    const communityId = searchParams.get("communityId");
    const draftId = searchParams.get("modalDraftId");
    const addVideo = searchParams.get("addVideo");
    const nextKey = `${communityId ?? ""}|${draftId ?? ""}|${addVideo ?? ""}`;
    if (appliedSearchParamsRef.current === nextKey) return;
    appliedSearchParamsRef.current = nextKey;

    if (communityId) {
      setSelectedId(communityId);
      mainTabInitializedForRef.current = null;
    }
    if (draftId) {
      setModalDraftId(draftId);
      setAddOpen(true);
    }
    if (addVideo === "1") {
      setAddOpen(true);
    }
  }, [searchParams]);

  const loadActivationRequests = useCallback(async () => {
    if (!authUser || !authToken) return;
    setActivationListLoading(true);
    const res = await listMyCommunityActivationRequestsAction();
    setActivationListLoading(false);
    if (!res.success || !res.data) {
      if (!isCommunityApiUnavailable(res.message)) {
        toast.error(res.message ?? "Could not load requests");
      }
      return;
    }
    const rows = (res.data as { requests?: unknown[] }).requests;
    setActivationRows(
      Array.isArray(rows) ? (rows as Record<string, unknown>[]) : []
    );
  }, [authUser, authToken]);

  const openActivationDialog = useCallback(
    async (kind: "community" | "tv") => {
      setActivationKind(kind);
      setPickEventId("");
      setHostEventsPick([]);
      setActivationCommunityName("");
      setActivationDescription("");
      setActivationContactPhone("");
      handleRemoveActivationLogo();
      const defaultEmail =
        authUser && "email" in authUser && typeof authUser.email === "string"
          ? authUser.email
          : "";
      setActivationContactEmail(defaultEmail);
      if (!authUser || !authToken) {
        toast.error("Sign in to submit an activation request.");
        return;
      }
      if (kind === "tv") {
        if (!selected?.id) {
          toast.error("Select a community first.");
          return;
        }
        setPickEventId(selected.eventId ?? "");
        setActivationOpen(true);
        return;
      }
      setActivationOpen(true);
      setActivationEventsLoading(true);
      try {
        const evRes = await getHostEventsAction({ limit: 100 });
        if (!evRes.success || evRes.data == null) {
          toast.error(evRes.message ?? "Could not load your events");
          setHostEventsPick([]);
          return;
        }
        const eligible = parseHostEventsEligibleForCommunity(evRes.data);
        setHostEventsPick(eligible);
        setPickEventId(eligible.length === 1 ? eligible[0].id : "");
      } catch {
        toast.error("Could not load your events");
        setHostEventsPick([]);
      } finally {
        setActivationEventsLoading(false);
      }
    },
    [authUser, authToken, selected?.eventId, selected?.id]
  );

  const submitActivationRequest = useCallback(async () => {
    if (!authUser || !authToken || !pickEventId) {
      toast.error("Pick an event");
      return;
    }
    if (activationKind === "community") {
      const pushReady = pushState === "subscribed";
      if (!pwaInstalled || !pushReady) {
        setActivationGateOpen(true);
        return;
      }
    }
    const communityName = activationCommunityName.trim();
    const description = activationDescription.trim();
    const contactEmail = normalizeEmail(activationContactEmail.trim());
    if (
      activationKind === "community" &&
      (!communityName || !description || !contactEmail)
    ) {
      toast.error(
        "Community name, description, and contact email are required."
      );
      return;
    }
    setActivationBusy(true);
    try {
      let logoUrl: string | null = null;
      if (activationLogoPreview?.startsWith("data:")) {
        const uploaded = await uploadImage(activationLogoPreview);
        logoUrl = uploaded?.secure_url ?? null;
        if (!logoUrl) {
          toast.error("Could not upload community logo.");
          return;
        }
      }

      const res = await createCommunityActivationRequestAction({
        eventId: pickEventId,
        kind: activationKind === "tv" ? "tv" : "community",
        communityName: communityName || null,
        description: description || null,
        logoUrl,
        contactEmail: contactEmail || null,
        contactPhone: activationContactPhone.trim() || null,
      });
      if (!res.success) {
        if (handleSubscriptionActionError(res, { focusTier: "community" })) {
          return;
        }
        toast.error(res.message ?? "Request failed");
        return;
      }
      toast.success("Request submitted");
      setActivationOpen(false);
      await loadActivationRequests();
    } finally {
      setActivationBusy(false);
    }
  }, [
    authUser,
    authToken,
    pickEventId,
    activationKind,
    activationCommunityName,
    activationDescription,
    activationContactEmail,
    activationContactPhone,
    activationLogoPreview,
    loadActivationRequests,
    handleSubscriptionActionError,
    pwaInstalled,
    pushState,
  ]);

  const canRequestTV = bank?.approved?.length && bank.approved.length >= 5;

  const submitTVActivationRequest = useCallback(async () => {
    if (!authUser || !authToken || !canRequestTV) {
      toast.error(
        "You must have at least 5 contents on your community bank to request a TV activation."
      );
      return;
    }
    if (!selected?.id) {
      toast.error("Select a community first.");
      return;
    }

    setActivationBusy(true);
    try {
      const res = await createCommunityActivationRequestAction({
        ...(pickEventId.trim() || selected.eventId?.trim()
          ? { eventId: pickEventId.trim() || selected.eventId!.trim() }
          : {}),
        communityId: selected.id,
        kind: "tv",
      });
      if (!res.success) {
        if (handleSubscriptionActionError(res, { focusTier: "community" })) {
          return;
        }
        toast.error(res.message ?? "Request failed");
        return;
      }
      toast.success("Request submitted");
      setActivationOpen(false);
      await loadActivationRequests();
    } finally {
      setActivationBusy(false);
    }
  }, [
    authUser,
    authToken,
    pickEventId,
    selected?.eventId,
    selected?.id,
    canRequestTV,
    loadActivationRequests,
    handleSubscriptionActionError,
  ]);

  const resumeCommunityTv = useCallback(async () => {
    if (!selected?.id) return;
    const res = await resumeCommunityTvAction(selected.id);
    if (!res.success) {
      if (handleSubscriptionActionError(res, { focusTier: "community" })) {
        return;
      }
      toast.error(res.message ?? "Resume failed");
      return;
    }
    toast.success("Community TV resumed");
    await loadMemberships({ background: true });
  }, [authToken, selected?.id, loadMemberships, handleSubscriptionActionError]);

  const loadBank = useCallback(
    async (options?: { background?: boolean }) => {
      if (!selectedId || selectedRole !== "owner") return;
      if (!authUserId) return;
      const background =
        options?.background ?? bankLoadedForRef.current === selectedId;
      if (!background) setLoadingBank(true);
      try {
        const res = await getCommunityContentBankAction(authToken, selectedId);
        if (!res.success || !res.data) {
          toast.error(res.message ?? "Could not load content bank");
          return;
        }
        const d = res.data as { approved: BankItem[]; pending: BankItem[] };
        setBank({ approved: d.approved ?? [], pending: d.pending ?? [] });
        bankLoadedForRef.current = selectedId;
      } finally {
        setLoadingBank(false);
      }
    },
    [authToken, authUserId, selectedId, selectedRole]
  );

  const loadSends = useCallback(
    async (options?: { background?: boolean }) => {
      if (!selectedId || selectedRole !== "coCreator") return;
      if (!authUserId) return;
      const background =
        options?.background ?? sendsLoadedForRef.current === selectedId;
      if (!background) setLoadingSends(true);
      try {
        const res = await getCommunitySendsAction(authToken, selectedId);
        if (!res.success || !res.data) {
          toast.error(res.message ?? "Could not load sends");
          return;
        }
        const d = res.data as { sends: BankItem[] };
        setSends(d.sends ?? []);
        sendsLoadedForRef.current = selectedId;
      } finally {
        setLoadingSends(false);
      }
    },
    [authToken, authUserId, selectedId, selectedRole]
  );

  const loadCoCreators = useCallback(
    async (options?: { background?: boolean }) => {
      if (!selectedId || selectedRole !== "owner") return;
      if (!authUserId) return;
      const background =
        options?.background ?? coCreatorsLoadedForRef.current === selectedId;
      if (!background) setLoadingCo(true);
      try {
        const res = await listCoCreatorsAction(selectedId);
        if (!res.success || !res.data) {
          toast.error(res.message ?? "Could not load co-creators");
          return;
        }
        const d = res.data as {
          active: CoCreatorHostRow[];
          pendingMemberships: CoCreatorHostRow[];
          revoked: CoCreatorHostRow[];
          pendingInvites: PendingInviteRow[];
        };
        setCoCreators({
          active: d.active ?? [],
          pendingMemberships: d.pendingMemberships ?? [],
          revoked: d.revoked ?? [],
          pendingInvites: d.pendingInvites ?? [],
        });
        coCreatorsLoadedForRef.current = selectedId;
      } finally {
        setLoadingCo(false);
      }
    },
    [authToken, authUserId, selectedId, selectedRole]
  );

  const loadOwed = useCallback(
    async (options?: { background?: boolean }) => {
      if (!selectedId || selectedRole !== "owner") return;
      if (!authUserId) return;
      const background =
        options?.background ?? owedLoadedForRef.current === selectedId;
      if (!background) setLoadingOwed(true);
      try {
        const res = await getCommunityOwedAction(authToken, selectedId);
        if (res.success && res.data) {
          setOwed(res.data as OwedPayload);
          owedLoadedForRef.current = selectedId;
        } else {
          setOwed(null);
          owedLoadedForRef.current = null;
        }
      } finally {
        setLoadingOwed(false);
      }
    },
    [authToken, authUserId, selectedId, selectedRole]
  );

  const loadSubscribers = useCallback(async () => {
    if (!selectedId || selectedRole !== "owner") return;
    if (!authUserId) return;
    setLoadingSubs(true);
    try {
      const res = await listCommunitySubscribersAction(authToken, selectedId);
      if (res.success && res.data) {
        const d = res.data as { subscribers: PaidSubRow[] };
        setSubscribers(d.subscribers ?? []);
      } else {
        setSubscribers([]);
      }
    } finally {
      setLoadingSubs(false);
    }
  }, [authToken, authUserId, selectedId, selectedRole]);

  useEffect(() => {
    if (!selectedId || !selectedRole) return;
    if (mainTabInitializedForRef.current === selectedId) return;
    mainTabInitializedForRef.current = selectedId;
    setMainTab(selectedRole === "owner" ? "bank" : "sends");
  }, [selectedId, selectedRole]);

  useEffect(() => {
    bankLoadedForRef.current = null;
    sendsLoadedForRef.current = null;
    coCreatorsLoadedForRef.current = null;
    owedLoadedForRef.current = null;
    setBank(null);
    setSends(null);
    setCoCreators(null);
    setOwed(null);
  }, [selectedId]);

  useEffect(() => {
    if (mainTab === "subscribers" && selectedRole === "owner") {
      void loadSubscribers();
    }
  }, [mainTab, loadSubscribers, selectedRole]);

  useEffect(() => {
    if (mainTab === "activation" || memberships.length === 0) {
      void loadActivationRequests();
    }
  }, [mainTab, memberships.length, loadActivationRequests]);

  useEffect(() => {
    const hostId = hostSession.hostId;
    if (!hostId) {
      return;
    }
    const hostChannelName = `community-host-${hostId}`;
    const hostChannel = subscribeChannel(hostChannelName);

    const onPayoutSettled = () => {
      toast.info("Community payout updated");
      if (selectedRole === "owner") void loadOwed({ background: true });
    };
    if (hostChannel) {
      hostChannel.bind("community-payout-settled", onPayoutSettled);
    }

    const unsubInApp = subscribeHostInAppNotifications(hostId, () => {
      toast.info("New notification");
    });

    const communityIdForPusher =
      selectedRole === "owner" && selectedId ? selectedId : null;
    let communityChannel: ReturnType<typeof subscribeChannel> | null = null;
    const onBankUpdated = () => {
      void loadBank({ background: true });
    };
    if (communityIdForPusher) {
      const cname = `community-${communityIdForPusher}`;
      communityChannel = subscribeChannel(cname);
      communityChannel?.bind("content-bank-updated", onBankUpdated);
    }

    return () => {
      unsubInApp();
      if (hostChannel) {
        hostChannel.unbind("community-payout-settled", onPayoutSettled);
        unsubscribeChannel(hostChannelName);
      }
      if (communityChannel && communityIdForPusher) {
        communityChannel.unbind("content-bank-updated", onBankUpdated);
        unsubscribeChannel(`community-${communityIdForPusher}`);
      }
    };
  }, [hostSession.hostId, selectedId, selectedRole, loadOwed, loadBank]);

  useEffect(() => {
    if (!communityFeatureOn || !selectedId || !selectedRole) return;
    if (selectedRole === "owner") {
      void loadBank({
        background: bankLoadedForRef.current === selectedId,
      });
      void loadCoCreators({
        background: coCreatorsLoadedForRef.current === selectedId,
      });
      void loadOwed({
        background: owedLoadedForRef.current === selectedId,
      });
    }
    if (selectedRole === "coCreator") {
      void loadSends({
        background: sendsLoadedForRef.current === selectedId,
      });
    }
  }, [selectedId, selectedRole, loadBank, loadSends, loadCoCreators, loadOwed]);

  const onAddVideoSuccess = useCallback(async () => {
    await loadBank({ background: true });
    await loadSends({ background: true });
    await loadCoCreators({ background: true });
  }, [loadBank, loadCoCreators, loadSends]);

  const onInviteCoCreator = async () => {
    if (!selected || selected.role !== "owner") return;
    const email = inviteEmail.trim();
    if (!email) {
      toast.error("Enter an email");
      return;
    }
    if (!authUser) return;
    setInviteLoading(true);
    try {
      const res = await inviteCoCreatorAction(selected.id, email);
      if (!res.success) {
        if (handleSubscriptionActionError(res, { focusTier: "community" })) {
          return;
        }
        toast.error(res.message ?? "Invite failed");
        return;
      }
      toast.success("Invitation sent");
      setInviteOpen(false);
      setInviteEmail("");
      await loadCoCreators({ background: true });
    } finally {
      setInviteLoading(false);
    }
  };

  const onRevokeCoCreatorMember = async (hostId: string) => {
    if (!selected || selected.role !== "owner") return;
    if (!authUser) return;
    const res = await revokeCoCreatorAction(selected.id, hostId);
    if (!res.success) {
      if (handleSubscriptionActionError(res, { focusTier: "community" })) {
        return;
      }
      toast.error(res.message ?? "Could not revoke");
      return;
    }
    toast.success("Co-creator revoked");
    await loadCoCreators({ background: true });
    await loadBank({ background: true });
  };

  const onRevokePendingInvite = async (inviteId: string) => {
    if (!selected || selected.role !== "owner") return;
    if (!authUser) return;
    const res = await revokeCoCreatorInviteAction(selected.id, inviteId);
    if (!res.success) {
      if (handleSubscriptionActionError(res, { focusTier: "community" })) {
        return;
      }
      toast.error(res.message ?? "Could not revoke invite");
      return;
    }
    toast.success("Invite revoked");
    await loadCoCreators({ background: true });
  };

  if (!communityFeatureOn) {
    return (
      <p className="text-muted-foreground text-sm">
        Community features are disabled. Set{" "}
        <code className="text-xs">
          NEXT_PUBLIC_COMMUNITY_FEATURE_ENABLED=true
        </code>{" "}
        to enable this page.
      </p>
    );
  }

  if (planLoading) {
    return <p className="text-muted-foreground text-sm">Loading plan…</p>;
  }

  const readOnlyCommunity =
    planStatus === "lapsed" &&
    !communityActive &&
    planCapabilities.viewPremiumFeatureUi;

  if (!communityActive && planStatus === "none") {
    return (
      <section className="space-y-6">
        <DashboardHeading
          title="Host Community"
          subtitle="Subscribe to manage communities, content bank, TV, sends, and subscription payouts."
        />
        <HostSubscriptionPricingPanel
          focusTier="community"
          renewLabel="Renew Community"
        />
      </section>
    );
  }

  if (!communityActive && !readOnlyCommunity) {
    return (
      <section className="space-y-6">
        <DashboardHeading
          title="Host Community"
          subtitle="Subscribe to manage communities, content bank, TV, sends, and subscription payouts."
        />
        <HostSubscriptionPricingPanel
          focusTier="community"
          renewLabel="Renew Community"
        />
      </section>
    );
  }

  if (loadingMeta && !membershipsLoadedRef.current) {
    return <p className="text-muted-foreground text-sm">Loading…</p>;
  }

  if (communityApiError) {
    return <p className="text-destructive text-sm">{communityApiError}</p>;
  }

  const tvUnpaused =
    Boolean(selected?.tvActivatedAt) && !selected?.tvHostPaused;

  const communityBody = (
    <>
      {SubscriptionPromptModal}
      {memberships.length === 0 ? (
        <>
          <DashboardHeading
            title="Community management"
            subtitle="Link a community to an event (superadmin approves activation requests)."
          />
          <p className="text-muted-foreground text-sm">
            You are not linked to any active communities as owner or co-creator.
          </p>
          <Button
            type="button"
            className="mt-4"
            variant="secondary"
            onClick={() => void openActivationDialog("community")}
          >
            Request community activation
          </Button>
        </>
      ) : (
        <>
          <DashboardHeading
            title="Community management"
            subtitle="Content bank and co-creator submissions for your community room."
          />

          <div className="mt-6 space-y-4">
            {memberships.length > 1 && (
              <div className="flex max-w-md flex-col gap-2">
                <span className="text-sm font-medium">Community</span>
                <Select
                  value={selectedId ?? undefined}
                  onValueChange={value => {
                    setSelectedId(value);
                    mainTabInitializedForRef.current = null;
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select community" />
                  </SelectTrigger>
                  <SelectContent>
                    {memberships.map(m => (
                      <SelectItem
                        key={m.id}
                        value={m.id}
                      >
                        {m.name}{" "}
                        <span className="text-muted-foreground text-xs">
                          ({m.role})
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selected?.role === "owner" && communityFeatureOn ? (
              <div className="scrollbar-none w-full min-w-0 overflow-x-auto">
                <div className="flex w-max min-w-full flex-nowrap gap-2">
                  {tvUnpaused ? (
                    <>
                      <Button
                        asChild
                        variant="secondary"
                        size="sm"
                        className="w-auto shrink-0 whitespace-nowrap"
                      >
                        <Link
                          href={`/tv?community=${encodeURIComponent(selected.id)}`}
                        >
                          Watch community TV
                        </Link>
                      </Button>

                      {hostSlug ? (
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="w-auto shrink-0 whitespace-nowrap"
                        >
                          <Link
                            href={`/host/${hostSlug}/community-tv?communityId=${encodeURIComponent(selected.id)}`}
                          >
                            TV schedule reorder
                          </Link>
                        </Button>
                      ) : null}
                    </>
                  ) : selected.tvActivatedAt && selected.tvHostPaused ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="w-auto shrink-0 whitespace-nowrap"
                      onClick={() => void resumeCommunityTv()}
                    >
                      Resume community TV
                    </Button>
                  ) : selected.eventId ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="w-auto shrink-0 whitespace-nowrap"
                      onClick={() => void openActivationDialog("tv")}
                    >
                      Request TV activation
                    </Button>
                  ) : null}

                  {hostSlug ? (
                    <>
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="w-auto shrink-0 whitespace-nowrap"
                      >
                        <Link
                          href={`/host/${hostSlug}/community-analytics?communityId=${encodeURIComponent(selected.id)}`}
                        >
                          Community analytics
                        </Link>
                      </Button>

                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="w-auto shrink-0 whitespace-nowrap"
                      >
                        <Link
                          href={`/host/${hostSlug}/community-display?communityId=${encodeURIComponent(selected.id)}`}
                        >
                          Room display
                        </Link>
                      </Button>

                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="w-auto shrink-0 whitespace-nowrap"
                      >
                        <Link
                          href={`/host/${hostSlug}/community-customization?communityId=${encodeURIComponent(selected.id)}`}
                        >
                          Branding (dedicated mode)
                        </Link>
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
            ) : null}

            {selected?.role === "owner" && (
              <div className="bg-card flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <Banknote className="text-muted-foreground size-5" />
                  <div>
                    <p className="text-sm font-medium">
                      Owed from paid memberships
                    </p>
                    {loadingOwed ? (
                      <p className="text-muted-foreground text-xs">Loading…</p>
                    ) : owed?.payout ? (
                      <p className="text-lg font-semibold">
                        £{owed.payout.outstanding}
                        <Badge
                          variant="secondary"
                          className="ml-2 align-middle text-xs"
                        >
                          {owed.payout.status}
                        </Badge>
                      </p>
                    ) : (
                      <p className="text-muted-foreground text-xs">
                        No balance until a tipper subscribes
                      </p>
                    )}
                  </div>
                </div>
                {owed?.payout && Number(owed.payout.outstanding) <= 0 && (
                  <span className="text-sm text-green-700">Fully settled</span>
                )}
              </div>
            )}

            {pendingPayoutSettlements.length > 0 ? (
              <div className="bg-card space-y-3 rounded-lg border p-4">
                <p className="text-sm font-medium">
                  Payouts awaiting your confirmation
                </p>
                {pendingPayoutSettlements.map(row => (
                  <div
                    key={row.id}
                    className="flex flex-wrap items-center justify-between gap-2 border-t pt-2 first:border-t-0 first:pt-0"
                  >
                    <div>
                      <p className="text-sm">{row.label}</p>
                      <p className="text-lg font-semibold">
                        £{(row.amountMinor / 100).toFixed(2)}
                      </p>
                      {row.receiptUrl ? (
                        <a
                          href={row.receiptUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary text-xs underline"
                        >
                          View receipt
                        </a>
                      ) : null}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        void acceptPayoutSettlementAction(
                          authToken,
                          row.id
                        ).then(r => {
                          if (r.success) {
                            toast.success("Payout acknowledged");
                            void loadPayoutSummary();
                          } else {
                            toast.error(r.message ?? "Could not accept");
                          }
                        });
                      }}
                    >
                      Accept payout
                    </Button>
                  </div>
                ))}
              </div>
            ) : null}

            <Tabs
              value={mainTab}
              onValueChange={setMainTab}
              key={selected?.id ?? "x"}
              className="w-full max-w-full min-w-0"
            >
              {/* Scrollable tab navigation on mobile */}
              <div className="w-full max-w-full overflow-x-auto overflow-y-hidden">
                <TabsList className="flex h-14! w-max min-w-full flex-nowrap gap-1">
                  {selected?.role === "owner" && (
                    <TabsTrigger
                      value="bank"
                      className="data-[state=active]:border-b-primary h-13! shrink-0 rounded-none bg-white px-4 font-semibold whitespace-nowrap data-[state=active]:border-b-2"
                    >
                      Content Bank
                    </TabsTrigger>
                  )}

                  {selected?.role === "owner" && (
                    <TabsTrigger
                      value="cocreators"
                      className="data-[state=active]:border-b-primary h-13! shrink-0 rounded-none bg-white px-4 font-semibold whitespace-nowrap data-[state=active]:border-b-2"
                    >
                      Co-creators
                    </TabsTrigger>
                  )}

                  {selected?.role === "owner" && (
                    <TabsTrigger
                      value="membership"
                      className="data-[state=active]:border-b-primary h-13! shrink-0 rounded-none bg-white px-4 font-semibold whitespace-nowrap data-[state=active]:border-b-2"
                    >
                      Membership
                    </TabsTrigger>
                  )}

                  {selected?.role === "owner" && (
                    <TabsTrigger
                      value="subscribers"
                      className="data-[state=active]:border-b-primary h-13! shrink-0 rounded-none bg-white px-4 font-semibold whitespace-nowrap data-[state=active]:border-b-2"
                    >
                      <Users className="mr-1 inline size-4" />
                      Subscribers
                    </TabsTrigger>
                  )}

                  {selected?.role === "owner" && (
                    <TabsTrigger
                      value="activation"
                      className="data-[state=active]:border-b-primary h-13! shrink-0 rounded-none bg-white px-4 font-semibold whitespace-nowrap data-[state=active]:border-b-2"
                    >
                      Activations
                    </TabsTrigger>
                  )}

                  {selected?.role === "coCreator" && (
                    <TabsTrigger
                      value="sends"
                      className="data-[state=active]:border-b-primary h-13! shrink-0 rounded-none bg-white px-4 font-semibold whitespace-nowrap data-[state=active]:border-b-2"
                    >
                      Community Sends
                    </TabsTrigger>
                  )}
                </TabsList>
              </div>

              {selected?.role === "owner" && (
                <TabsContent
                  value="bank"
                  className="mt-4 space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-lg font-semibold">Videos</h2>

                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setAddOpen(true)}
                    >
                      <Plus className="mr-1 size-4" />
                      Add video
                    </Button>
                  </div>

                  {loadingBank && bank === null ? (
                    <p className="text-muted-foreground text-sm">
                      Loading bank…
                    </p>
                  ) : (
                    <>
                      <>
                        <h5 className="text-sm font-semibold">
                          Approved videos
                        </h5>

                        <div className="grid gap-4 sm:grid-cols-2">
                          {(bank?.approved ?? []).map(item => (
                            <OwnerBankCard
                              key={item.id}
                              item={item}
                              communityId={selected.id}
                              eventId={selected.eventId}
                              onUpdated={() =>
                                void loadBank({ background: true })
                              }
                            />
                          ))}
                        </div>

                        {!bank?.approved?.length && (
                          <p className="text-muted-foreground text-sm">
                            No approved videos yet.
                          </p>
                        )}
                      </>

                      <>
                        <h5 className="text-sm font-semibold">
                          Pending videos
                        </h5>

                        <div className="grid gap-4 sm:grid-cols-2">
                          {(bank?.pending ?? []).map(item => (
                            <OwnerBankCard
                              key={item.id}
                              item={item}
                              communityId={selected.id}
                              eventId={selected.eventId}
                              onUpdated={() =>
                                void loadBank({ background: true })
                              }
                            />
                          ))}
                        </div>

                        {!bank?.pending?.length && (
                          <p className="text-muted-foreground text-sm">
                            No pending submissions.
                          </p>
                        )}
                      </>
                    </>
                  )}
                </TabsContent>
              )}

              {selected?.role === "owner" && (
                <TabsContent
                  value="cocreators"
                  className="mt-4 space-y-6"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-muted-foreground text-sm">
                      Invite hosts by work email. They must sign in with the
                      same address to accept.
                    </p>

                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setInviteOpen(true)}
                    >
                      <Mail className="mr-1 size-4" />
                      Invite by email
                    </Button>
                  </div>

                  {loadingCo && coCreators === null ? (
                    <p className="text-muted-foreground text-sm">Loading…</p>
                  ) : coCreators ? (
                    <>
                      <section>
                        <h3 className="mb-2 text-sm font-medium">Active</h3>

                        <ul className="space-y-2">
                          {coCreators.active.map(row => (
                            <li
                              key={row.id}
                              className="bg-card flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
                            >
                              <div>
                                <p className="text-sm font-medium">
                                  {row.host.fullName}
                                </p>

                                <p className="text-muted-foreground text-xs">
                                  @{row.host.username} · {row.host.email}
                                </p>
                              </div>

                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  void onRevokeCoCreatorMember(row.host.id)
                                }
                              >
                                <UserX className="mr-1 size-4" />
                                Revoke
                              </Button>
                            </li>
                          ))}
                        </ul>

                        {!coCreators.active.length && (
                          <p className="text-muted-foreground text-sm">
                            No active co-creators yet.
                          </p>
                        )}
                      </section>

                      <section>
                        <h3 className="mb-2 text-sm font-medium">
                          Pending invites
                        </h3>

                        <ul className="space-y-2">
                          {coCreators.pendingInvites.map(inv => (
                            <li
                              key={inv.id}
                              className="bg-muted/40 flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
                            >
                              <div>
                                <p className="text-sm font-medium">
                                  {inv.email}
                                </p>

                                <p className="text-muted-foreground text-xs">
                                  Expires{" "}
                                  {new Date(inv.expiresAt).toLocaleString()}
                                </p>
                              </div>

                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  void onRevokePendingInvite(inv.id)
                                }
                              >
                                Revoke invite
                              </Button>
                            </li>
                          ))}
                        </ul>

                        {!coCreators.pendingInvites.length && (
                          <p className="text-muted-foreground text-sm">
                            No pending email invites.
                          </p>
                        )}
                      </section>

                      {(coCreators.pendingMemberships.length > 0 ||
                        coCreators.revoked.length > 0) && (
                        <section>
                          <h3 className="mb-2 text-sm font-medium">Other</h3>

                          {coCreators.pendingMemberships.length > 0 && (
                            <p className="text-muted-foreground mb-2 text-xs">
                              Pending memberships:{" "}
                              {coCreators.pendingMemberships
                                .map(r => r.host.email)
                                .join(", ")}
                            </p>
                          )}

                          {coCreators.revoked.length > 0 && (
                            <p className="text-muted-foreground text-xs">
                              Revoked:{" "}
                              {coCreators.revoked
                                .map(r => r.host?.email ?? r.host?.username)
                                .join(", ")}
                            </p>
                          )}
                        </section>
                      )}
                    </>
                  ) : null}
                </TabsContent>
              )}

              {selected?.role === "owner" && selectedId != null && (
                <TabsContent
                  value="membership"
                  forceMount
                  className="mt-4 space-y-4 data-[state=inactive]:hidden"
                >
                  <CommunityMembershipOwnerPanel communityId={selectedId} />
                </TabsContent>
              )}

              {selected?.role === "owner" && (
                <TabsContent
                  value="subscribers"
                  className="mt-4 space-y-4"
                >
                  <p className="text-muted-foreground text-sm">
                    Paid subscriptions (Stripe or Tipper Wallet). History
                    includes expired rows.
                  </p>

                  {loadingSubs ? (
                    <p className="text-muted-foreground text-sm">Loading…</p>
                  ) : subscribers.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      No paid subscribers yet.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {subscribers.map(s => (
                        <li
                          key={s.id}
                          className="bg-card rounded-lg border p-3 text-sm"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="font-medium">
                                {s.tipper?.fullName ||
                                  s.tipper?.username ||
                                  "Tipper"}
                              </p>

                              <p className="text-muted-foreground text-xs">
                                @{s.tipper?.username}
                                {s.tipper?.email ? ` · ${s.tipper.email}` : ""}
                              </p>
                            </div>

                            <Badge variant="secondary">{s.status}</Badge>
                          </div>

                          <div className="text-muted-foreground mt-2 grid gap-1 text-xs">
                            <span>£{s.amount}</span>

                            <span>
                              {s.expiresAt
                                ? `Expires ${new Date(
                                    s.expiresAt
                                  ).toLocaleString()}`
                                : "No expiry"}
                            </span>

                            {s.paymentRef && (
                              <span className="break-all">
                                Ref: {s.paymentRef}
                              </span>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}

                  {owed && owed.recentSubs.length > 0 && (
                    <div className="mt-6">
                      <h3 className="mb-2 text-sm font-medium">
                        Recent payment activity
                      </h3>

                      <ul className="text-muted-foreground space-y-1 text-xs">
                        {owed.recentSubs.map(r => (
                          <li key={r.id}>
                            £{r.amount} · {r.tipper?.username ?? "—"} ·{" "}
                            {r.status} ·{" "}
                            {new Date(r.createdAt).toLocaleString()}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </TabsContent>
              )}

              {selected?.role === "owner" && (
                <TabsContent
                  value="activation"
                  className="mt-4 space-y-3"
                >
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void openActivationDialog("community")}
                    >
                      New community request
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void openActivationDialog("tv")}
                    >
                      New TV request
                    </Button>
                  </div>

                  {activationListLoading ? (
                    <p className="text-muted-foreground text-sm">Loading…</p>
                  ) : activationRows.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      No activation requests yet.
                    </p>
                  ) : (
                    <ul className="space-y-2 text-sm">
                      {activationRows.map((row: Record<string, unknown>) => (
                        <li
                          key={String(row.id ?? "")}
                          className="rounded-md border p-3"
                        >
                          <p className="font-medium">
                            {String(row.kind ?? "")} ·{" "}
                            {String((row.status as string) ?? "")}
                          </p>

                          <p className="text-muted-foreground text-xs">
                            {new Date(
                              String(row.createdAt ?? "")
                            ).toLocaleString()}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </TabsContent>
              )}

              {selected?.role === "coCreator" && (
                <TabsContent
                  value="sends"
                  className="mt-4 space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-muted-foreground text-sm">
                      Your submissions. Copy link to share a specific video.
                    </p>

                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setAddOpen(true)}
                    >
                      <Plus className="mr-1 size-4" />
                      Add video
                    </Button>
                  </div>

                  {loadingSends && sends === null ? (
                    <p className="text-muted-foreground text-sm">Loading…</p>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {(sends ?? []).map(item => (
                        <SendCard
                          key={item.id}
                          item={item}
                          eventId={selected.eventId}
                        />
                      ))}
                    </div>
                  )}

                  {sends !== null && sends.length === 0 && (
                    <p className="text-muted-foreground text-sm">
                      You have not submitted any videos yet.
                    </p>
                  )}
                </TabsContent>
              )}
            </Tabs>
          </div>
        </>
      )}

      <Dialog
        open={activationOpen}
        onOpenChange={setActivationOpen}
      >
        <DialogContent className="flex max-h-[min(90dvh,640px)] flex-col gap-0 overflow-hidden sm:max-w-lg">
          <DialogHeader className="shrink-0 space-y-2 pr-6 pb-2">
            <DialogTitle>
              {activationKind === "tv"
                ? "Request community TV activation"
                : "Request community activation"}
            </DialogTitle>
            <DialogDescription>
              {activationKind === "community"
                ? "Tell admins about your community. Contact email defaults to your signed-in account."
                : "Send a request to create a TV for your community."}
            </DialogDescription>
          </DialogHeader>

          {activationKind === "community" && (
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pb-1">
              <div className="space-y-2">
                <Label>Event</Label>
                {activationEventsLoading ? (
                  <p className="text-muted-foreground text-sm">
                    Loading your events…
                  </p>
                ) : hostEventsPick.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    You need an event that is not linked to a community yet.{" "}
                    <Link
                      href="/event-only"
                      className="text-primary font-medium underline underline-offset-2"
                    >
                      Create an event
                    </Link>{" "}
                    first, then submit a community activation request for it.
                  </p>
                ) : (
                  <Select
                    value={pickEventId || undefined}
                    onValueChange={setPickEventId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an event you own" />
                    </SelectTrigger>
                    <SelectContent>
                      {hostEventsPick.map(e => (
                        <SelectItem
                          key={e.id}
                          value={e.id}
                        >
                          {e.eventName?.trim() ? e.eventName : e.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="act-community-name">
                  Community name{" "}
                  {activationKind === "community" ? null : (
                    <span className="text-muted-foreground font-normal">
                      (optional)
                    </span>
                  )}
                </Label>
                <Input
                  id="act-community-name"
                  value={activationCommunityName}
                  onChange={e => setActivationCommunityName(e.target.value)}
                  placeholder="Working title"
                  autoComplete="organization"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="act-desc">
                  Short description{" "}
                  {activationKind === "community" ? null : (
                    <span className="text-muted-foreground font-normal">
                      (optional)
                    </span>
                  )}
                </Label>
                <Textarea
                  id="act-desc"
                  value={activationDescription}
                  onChange={e => setActivationDescription(e.target.value)}
                  placeholder="What is it about?"
                  rows={3}
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
                    onClick={handleActivationLogoChangeClick}
                    className="relative size-20 shrink-0 overflow-hidden rounded-full border bg-neutral-100"
                  >
                    {activationLogoPreview ? (
                      <img
                        src={activationLogoPreview}
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
                      ref={activationLogoInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handleActivationLogoUpload}
                    />
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleActivationLogoChangeClick}
                        className="w-fit"
                      >
                        Change photo
                      </Button>
                      {activationLogoPreview ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive w-fit"
                          onClick={handleRemoveActivationLogo}
                        >
                          Remove photo
                        </Button>
                      ) : null}
                      {activationLogoUploadError ? (
                        <p className="text-destructive text-xs">
                          {activationLogoUploadError}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="act-email">Contact email</Label>
                <Input
                  id="act-email"
                  type="email"
                  value={activationContactEmail}
                  onChange={e => setActivationContactEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="act-phone">
                  Phone{" "}
                  <span className="text-muted-foreground font-normal">
                    (with country code, optional)
                  </span>
                </Label>
                <Input
                  id="act-phone"
                  value={activationContactPhone}
                  onChange={e => setActivationContactPhone(e.target.value)}
                  placeholder="+44 …"
                  autoComplete="tel"
                />
              </div>
            </div>
          )}

          {activationKind === "community" && (
            <div className="flex shrink-0 justify-end gap-2 border-t pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setActivationOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={
                  activationBusy ||
                  activationEventsLoading ||
                  !pickEventId ||
                  hostEventsPick.length === 0 ||
                  (activationKind === "community" &&
                    (!activationCommunityName.trim() ||
                      !activationDescription.trim() ||
                      !normalizeEmail(activationContactEmail.trim())))
                }
                onClick={() => void submitActivationRequest()}
              >
                {activationBusy ? "Sending…" : "Submit request"}
              </Button>
            </div>
          )}

          {activationKind === "tv" && (
            <div className="flex shrink-0 justify-end gap-2 border-t pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setActivationOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                // disabled={true}
                onClick={() => void submitTVActivationRequest()}
              >
                {activationBusy ? "Sending…" : "Submit TV request"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={activationGateOpen}
        onOpenChange={setActivationGateOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Install app & enable push</DialogTitle>
            <DialogDescription>
              Community activation requires the Tipmanna PWA installed and push
              notifications enabled on this device.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            {!pwaInstalled ? (
              <div className="space-y-2">
                <p className="font-medium">{pwaInstall.title}</p>
                <ol className="text-muted-foreground list-decimal space-y-1 pl-5">
                  {pwaInstall.steps.map(step => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
                {canInstall ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void promptInstall()}
                  >
                    Install app
                  </Button>
                ) : null}
              </div>
            ) : (
              <p className="text-primary font-medium">PWA installed</p>
            )}
            {pushState !== "subscribed" ? (
              <div className="space-y-2">
                <p className="font-medium">Turn on push notifications</p>
                <Button
                  type="button"
                  disabled={pushLoading}
                  onClick={() => void subscribePush()}
                >
                  {pushLoading ? "Enabling…" : "Enable notifications"}
                </Button>
                {pushError ? (
                  <p className="text-destructive text-xs">{pushError}</p>
                ) : null}
              </div>
            ) : (
              <p className="text-primary font-medium">Push notifications on</p>
            )}
          </div>
          <div className="flex justify-end">
            <Button
              type="button"
              disabled={
                !pwaInstalled || pushState !== "subscribed" || pushLoading
              }
              onClick={() => {
                setActivationGateOpen(false);
                void submitActivationRequest();
              }}
            >
              Continue submission
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {memberships.length > 0 && selected ? (
        <>
          <AddCommunityBankVideoDialog
            open={addOpen}
            onOpenChange={setAddOpen}
            communityId={selected.id}
            eventEventType={selected.eventType}
            hostSlug={hostSlug}
            pathname={pathname ?? undefined}
            seedDraftId={modalDraftId}
            onSuccess={() => {
              setModalDraftId(null);
              void onAddVideoSuccess();
            }}
          />
          <Dialog
            open={inviteOpen}
            onOpenChange={setInviteOpen}
          >
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Invite co-creator</DialogTitle>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="co-invite-email">Host email</Label>
                <Input
                  id="co-invite-email"
                  type="email"
                  autoComplete="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="name@work-email.com"
                />
                <p className="text-muted-foreground text-xs">
                  They will receive a link to accept. The account email must
                  match.
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setInviteOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={inviteLoading}
                  onClick={() => void onInviteCoCreator()}
                >
                  {inviteLoading ? "Sending…" : "Send invite"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </>
      ) : null}
    </>
  );

  if (readOnlyCommunity) {
    return (
      <section className="space-y-6">
        <DashboardHeading
          title="Host Community"
          subtitle="Renew to manage communities, content bank, TV, sends, and subscription payouts."
        />
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-950">
          <p className="text-sm">
            Your community plan has expired. Management tools below are
            read-only until you renew.
          </p>
          <HostSubscriptionUpgradeTrigger
            focusTier="community"
            renewLabel="Renew Community"
            label="Renew plan"
          />
        </div>
        <ReadOnlyOverlay>{communityBody}</ReadOnlyOverlay>
      </section>
    );
  }

  return communityBody;
}
