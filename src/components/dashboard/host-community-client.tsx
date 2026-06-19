"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { toast } from "react-toastify";
import { Plus, Copy, Check, Mail, Users, UserX, Banknote } from "lucide-react";
import { useSelector } from "react-redux";
import Link from "next/link";
import { useParams } from "next/navigation";

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
import {
  AddVideoForm,
  buildCreateChannelPayload,
  type AddVideoFormValues,
} from "@/components/events/add-video-form";
import { clearModalFormDraft } from "@/hooks/use-modal-form-draft-restore";
import { applyServerFormErrors } from "@/lib/form-error-mapper";
import {
  acceptPayoutSettlementAction,
  getHostPayoutSummaryAction,
} from "@/actions/host-payouts";
import {
  addCommunityVideoAction,
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
import { RootState } from "@/redux/store";
import { subscribeChannel, unsubscribeChannel } from "@/lib/pusher";
import { subscribeHostInAppNotifications } from "@/lib/host-notification-channel";
import { getHostEventsAction } from "@/actions/events";
import {
  createCommunityActivationRequestAction,
  listMyCommunityActivationRequestsAction,
} from "@/actions/community-activation-requests";
import { normalizeEmail } from "@/lib/normalize-email";
import { parseHostEventsEligibleForCommunity } from "@/lib/parse-host-events";

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
  onUpdated,
}: {
  item: BankItem;
  communityId: string;
  onUpdated: () => void;
}) {
  const authUser = useSelector((s: RootState) => s.auth.user);
  const authToken = useSelector((s: RootState) => s.auth.token);
  const [busy, setBusy] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const run = async (
    fn: () => Promise<{ success: boolean; message?: string }>
  ) => {
    setBusy(true);
    try {
      const res = await fn();
      if (!res.success) {
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

  return (
    <>
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
                    authToken,
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

      <div className="bg-card rounded-lg border p-4 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium">{item.channel.title}</p>
            <p className="text-muted-foreground mt-1 truncate text-xs">
              {item.channel.url}
            </p>
            {item.submittedBy && (
              <p className="text-muted-foreground mt-1 text-xs">
                From {item.submittedBy.fullName} (@{item.submittedBy.username})
              </p>
            )}
          </div>
          <Badge variant={item.status === "pending" ? "secondary" : "default"}>
            {item.status}
          </Badge>
        </div>
        <div className="text-muted-foreground mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          <span>Tips: {item.metrics.numOfTips}</span>
          <span>Raised: £{Number(item.metrics.amountRaised).toFixed(2)}</span>
          <span>Completes: {item.metrics.completes}</span>
          <span>Views: {item.metrics.encounters}</span>
        </div>

        {item.status === "pending" && (
          <div className="mt-3 flex flex-wrap gap-2">
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
                    authToken,
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
          <div className="mt-3 flex flex-wrap items-center gap-2">
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
                    authToken,
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
              <SelectTrigger className="h-8 w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="private">Private</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </>
  );
}

function SendCard({ item }: { item: BankItem }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(item.channel.shareUrl);
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
            <Copy className="mr-1 size-4" /> Copy share link
          </>
        )}
      </Button>
    </div>
  );
}

export function HostCommunityClient() {
  const params = useParams();
  const hostSlug = typeof params?.slug === "string" ? params.slug : "";
  const authUser = useSelector((s: RootState) => s.auth.user);
  const authToken = useSelector((s: RootState) => s.auth.token);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mainTab, setMainTab] = useState("bank");
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [bank, setBank] = useState<{
    approved: BankItem[];
    pending: BankItem[];
  } | null>(null);
  const [sends, setSends] = useState<BankItem[]>([]);
  const [loadingBank, setLoadingBank] = useState(false);
  const [loadingSends, setLoadingSends] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addVideoForm, setAddVideoForm] =
    useState<UseFormReturn<AddVideoFormValues> | null>(null);
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
  const [activationLogoUrl, setActivationLogoUrl] = useState("");
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
    if (!authUser || authUser.role !== "HOST") return;
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
  }, [authUser]);

  useEffect(() => {
    void loadPayoutSummary();
  }, [loadPayoutSummary]);

  // const [hostAlreadyHasCommunity, setHostAlreadyHasCommunity] = useState(false);

  const selected = useMemo(
    () => memberships.find(m => m.id === selectedId) ?? null,
    [memberships, selectedId]
  );

  const loadMemberships = useCallback(async () => {
    if (!authUser || !authToken) {
      setLoadingMeta(false);
      return;
    }
    setLoadingMeta(true);
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
    // let hostAlreadyHasCommunity = false;
    // let hostCommunityId: string | null = null;
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
      // if (c.name === hostSlug) {
      //   hostAlreadyHasCommunity = true;
      //   hostCommunityId = c.id;
      // }
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
    setLoadingMeta(false);
  }, [authUser, authToken]);

  useEffect(() => {
    if (!communityFeatureOn) return;
    void loadMemberships();
  }, [loadMemberships]);

  const loadActivationRequests = useCallback(async () => {
    if (!authUser || !authToken) return;
    setActivationListLoading(true);
    const res = await listMyCommunityActivationRequestsAction(authToken);
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
      setActivationLogoUrl("");
      const defaultEmail =
        authUser && "email" in authUser && typeof authUser.email === "string"
          ? authUser.email
          : "";
      setActivationContactEmail(defaultEmail);
      if (!authUser || !authToken) {
        toast.error("Sign in to submit an activation request.");
        return;
      }
      setActivationOpen(true);
      setActivationEventsLoading(true);
      try {
        const evRes = await getHostEventsAction(authToken);
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
    [authUser, authToken]
  );

  const submitActivationRequest = useCallback(async () => {
    if (!authUser || !authToken || !pickEventId) {
      toast.error("Pick an event");
      return;
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
      const res = await createCommunityActivationRequestAction(authToken, {
        eventId: pickEventId,
        kind: activationKind === "tv" ? "tv" : "community",
        communityName: communityName || null,
        description: description || null,
        logoUrl: activationLogoUrl.trim() || null,
        contactEmail: contactEmail || null,
        contactPhone: activationContactPhone.trim() || null,
      });
      if (!res.success) {
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
    activationLogoUrl,
    loadActivationRequests,
  ]);

  const resumeCommunityTv = useCallback(async () => {
    if (!selected?.id) return;
    const res = await resumeCommunityTvAction(selected.id, authToken);
    if (!res.success) {
      toast.error(res.message ?? "Resume failed");
      return;
    }
    toast.success("Community TV resumed");
    await loadMemberships();
  }, [authToken, selected?.id, loadMemberships]);

  const loadBank = useCallback(async () => {
    if (!selected || selected.role !== "owner") return;
    if (!authUser) return;
    setLoadingBank(true);
    const res = await getCommunityContentBankAction(authToken, selected.id);
    if (!res.success || !res.data) {
      toast.error(res.message ?? "Could not load content bank");
      setLoadingBank(false);
      return;
    }
    const d = res.data as { approved: BankItem[]; pending: BankItem[] };
    setBank({ approved: d.approved ?? [], pending: d.pending ?? [] });
    setLoadingBank(false);
  }, [authToken, authUser, selected]);

  const loadSends = useCallback(async () => {
    if (!selected || selected.role !== "coCreator") return;
    if (!authUser) return;
    setLoadingSends(true);
    const res = await getCommunitySendsAction(authToken, selected.id);
    if (!res.success || !res.data) {
      toast.error(res.message ?? "Could not load sends");
      setLoadingSends(false);
      return;
    }
    const d = res.data as { sends: BankItem[] };
    setSends(d.sends ?? []);
    setLoadingSends(false);
  }, [authToken, authUser, selected]);

  const loadCoCreators = useCallback(async () => {
    if (!selected || selected.role !== "owner") return;
    if (!authUser) return;
    setLoadingCo(true);
    const res = await listCoCreatorsAction(authToken, selected.id);
    if (!res.success || !res.data) {
      toast.error(res.message ?? "Could not load co-creators");
      setLoadingCo(false);
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
    setLoadingCo(false);
  }, [authToken, authUser, selected]);

  const loadOwed = useCallback(async () => {
    if (!selected || selected.role !== "owner") return;
    if (!authUser) return;
    setLoadingOwed(true);
    try {
      const res = await getCommunityOwedAction(authToken, selected.id);
      if (res.success && res.data) {
        setOwed(res.data as OwedPayload);
      } else {
        setOwed(null);
      }
    } finally {
      setLoadingOwed(false);
    }
  }, [authToken, authUser, selected]);

  const loadSubscribers = useCallback(async () => {
    if (!selected || selected.role !== "owner") return;
    if (!authUser) return;
    setLoadingSubs(true);
    try {
      const res = await listCommunitySubscribersAction(authToken, selected.id);
      if (res.success && res.data) {
        const d = res.data as { subscribers: PaidSubRow[] };
        setSubscribers(d.subscribers ?? []);
      } else {
        setSubscribers([]);
      }
    } finally {
      setLoadingSubs(false);
    }
  }, [authToken, authUser, selected]);

  useEffect(() => {
    if (!selected) return;
    setMainTab(selected.role === "owner" ? "bank" : "sends");
  }, [selected]);

  useEffect(() => {
    if (mainTab === "subscribers" && selected?.role === "owner") {
      void loadSubscribers();
    }
  }, [mainTab, loadSubscribers, selected?.role]);

  useEffect(() => {
    if (mainTab === "activation" || memberships.length === 0) {
      void loadActivationRequests();
    }
  }, [mainTab, memberships.length, loadActivationRequests]);

  useEffect(() => {
    if (
      !authUser ||
      authUser.role !== "HOST" ||
      !("id" in authUser) ||
      !authUser.id
    ) {
      return;
    }
    const hostId = authUser.id;
    const hostChannelName = `community-host-${hostId}`;
    const hostChannel = subscribeChannel(hostChannelName);

    const onPayoutSettled = () => {
      toast.info("Community payout updated");
      if (selected?.role === "owner") void loadOwed();
    };
    if (hostChannel) {
      hostChannel.bind("community-payout-settled", onPayoutSettled);
    }

    const unsubInApp = subscribeHostInAppNotifications(hostId, () => {
      toast.info("New notification");
    });

    const communityIdForPusher =
      selected?.role === "owner" ? selected.id : null;
    let communityChannel: ReturnType<typeof subscribeChannel> | null = null;
    const onBankUpdated = () => {
      void loadBank();
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
  }, [authUser, selected, loadOwed, loadBank]);

  useEffect(() => {
    if (!communityFeatureOn || !selected) return;
    if (selected.role === "owner") {
      void loadBank();
      void loadCoCreators();
      void loadOwed();
    }
    if (selected.role === "coCreator") void loadSends();
  }, [selected, loadBank, loadSends, loadCoCreators, loadOwed]);

  const onAddVideo = async (values: AddVideoFormValues) => {
    if (!selected) return;
    if (!authUser) {
      toast.error("Not signed in");
      return;
    }
    setAddLoading(true);
    try {
      const payload = buildCreateChannelPayload(values);
      const res = await addCommunityVideoAction(
        authToken,
        selected.id,
        payload
      );
      if (!res.success) {
        if (addVideoForm) {
          applyServerFormErrors(
            addVideoForm,
            res.validationBody ?? { message: res.message }
          );
        } else {
          toast.error(res.message ?? "Failed to add video");
        }
        return;
      }
      toast.success(
        (res.data as { message?: string })?.message ?? "Video saved"
      );
      await clearModalFormDraft("community_video", selected.id, modalDraftId);
      setModalDraftId(null);
      setAddOpen(false);
      await loadBank();
      await loadSends();
      await loadCoCreators();
    } catch (e) {
      if (e instanceof Error) toast.error(e.message);
      else if (typeof e === "object" && e !== null && "error" in e) {
        toast.error((e as ApiError).error.message);
      } else toast.error("Failed to add video");
    } finally {
      setAddLoading(false);
    }
  };

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
      const res = await inviteCoCreatorAction(authToken, selected.id, email);
      if (!res.success) {
        toast.error(res.message ?? "Invite failed");
        return;
      }
      toast.success("Invitation sent");
      setInviteOpen(false);
      setInviteEmail("");
      await loadCoCreators();
    } finally {
      setInviteLoading(false);
    }
  };

  const onRevokeCoCreatorMember = async (hostId: string) => {
    if (!selected || selected.role !== "owner") return;
    if (!authUser) return;
    const res = await revokeCoCreatorAction(authToken, selected.id, hostId);
    if (!res.success) {
      toast.error(res.message ?? "Could not revoke");
      return;
    }
    toast.success("Co-creator revoked");
    await loadCoCreators();
    await loadBank();
  };

  const onRevokePendingInvite = async (inviteId: string) => {
    if (!selected || selected.role !== "owner") return;
    if (!authUser) return;
    const res = await revokeCoCreatorInviteAction(
      authToken,
      selected.id,
      inviteId
    );
    if (!res.success) {
      toast.error(res.message ?? "Could not revoke invite");
      return;
    }
    toast.success("Invite revoked");
    await loadCoCreators();
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

  if (loadingMeta) {
    return <p className="text-muted-foreground text-sm">Loading…</p>;
  }

  if (communityApiError) {
    return <p className="text-destructive text-sm">{communityApiError}</p>;
  }

  const tvUnpaused =
    Boolean(selected?.tvActivatedAt) && !selected?.tvHostPaused;

  return (
    <>
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
                  onValueChange={setSelectedId}
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
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap gap-2">
                  {tvUnpaused ? (
                    <>
                      <Button
                        asChild
                        variant="secondary"
                        size="sm"
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
                        >
                          <Link
                            href={`/host/${hostSlug}/community-tv?communityId=${encodeURIComponent(selected.id)}`}
                          >
                            TV schedule (reorder)
                          </Link>
                        </Button>
                      ) : null}
                    </>
                  ) : selected.tvActivatedAt && selected.tvHostPaused ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => void resumeCommunityTv()}
                    >
                      Resume community TV
                    </Button>
                  ) : selected.eventId ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => void openActivationDialog("tv")}
                    >
                      Request TV activation
                    </Button>
                  ) : null}
                </div>
                {hostSlug ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
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
                    >
                      <Link
                        href={`/host/${hostSlug}/community-customization?communityId=${encodeURIComponent(selected.id)}`}
                      >
                        Branding (dedicated mode)
                      </Link>
                    </Button>
                  </div>
                ) : null}
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
              className="w-full"
            >
              <TabsList className="flex w-full max-w-md flex-wrap gap-1">
                {selected?.role === "owner" && (
                  <TabsTrigger value="bank">Content Bank</TabsTrigger>
                )}
                {selected?.role === "owner" && (
                  <TabsTrigger value="cocreators">Co-creators</TabsTrigger>
                )}
                {selected?.role === "owner" && (
                  <TabsTrigger value="membership">Membership</TabsTrigger>
                )}
                {selected?.role === "owner" && (
                  <TabsTrigger value="subscribers">
                    <Users className="mr-1 inline size-4" />
                    Subscribers
                  </TabsTrigger>
                )}
                {selected?.role === "owner" && (
                  <TabsTrigger value="activation">Activations</TabsTrigger>
                )}
                {selected?.role === "coCreator" && (
                  <TabsTrigger value="sends">Community Sends</TabsTrigger>
                )}
              </TabsList>

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

                  {loadingBank ? (
                    <p className="text-muted-foreground text-sm">
                      Loading bank…
                    </p>
                  ) : (
                    <>
                      <section>
                        <h3 className="mb-2 text-sm font-medium">Approved</h3>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {(bank?.approved ?? []).map(item => (
                            <OwnerBankCard
                              key={item.id}
                              item={item}
                              communityId={selected.id}
                              onUpdated={() => void loadBank()}
                            />
                          ))}
                        </div>
                        {!bank?.approved?.length && (
                          <p className="text-muted-foreground text-sm">
                            No approved videos yet.
                          </p>
                        )}
                      </section>
                      <section>
                        <h3 className="mb-2 text-sm font-medium">Pending</h3>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {(bank?.pending ?? []).map(item => (
                            <OwnerBankCard
                              key={item.id}
                              item={item}
                              communityId={selected.id}
                              onUpdated={() => void loadBank()}
                            />
                          ))}
                        </div>
                        {!bank?.pending?.length && (
                          <p className="text-muted-foreground text-sm">
                            No pending submissions.
                          </p>
                        )}
                      </section>
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

                  {loadingCo || !coCreators ? (
                    <p className="text-muted-foreground text-sm">Loading…</p>
                  ) : (
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
                  )}
                </TabsContent>
              )}

              {selected?.role === "owner" && (
                <TabsContent
                  value="membership"
                  className="mt-4 space-y-4"
                >
                  {selected && (
                    <CommunityMembershipOwnerPanel communityId={selected.id} />
                  )}
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
                                ? `Expires ${new Date(s.expiresAt).toLocaleString()}`
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
                      // disabled={hostAlreadyHasCommunity}exploore
                    >
                      New community request
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void openActivationDialog("tv")}
                      // disabled={hostAlreadyHasCommunity}
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
                      Your submissions. Copy link to share the room frame (no
                      preview card).
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
                  {loadingSends ? (
                    <p className="text-muted-foreground text-sm">Loading…</p>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {sends.map(item => (
                        <SendCard
                          key={item.id}
                          item={item}
                        />
                      ))}
                    </div>
                  )}
                  {!loadingSends && sends.length === 0 && (
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
                : "Link TV activation to an event. Optional community details help admins review your request."}
            </DialogDescription>
          </DialogHeader>
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
            <div className="space-y-1">
              <Label htmlFor="act-logo">
                Logo URL{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <Input
                id="act-logo"
                type="url"
                value={activationLogoUrl}
                onChange={e => setActivationLogoUrl(e.target.value)}
                placeholder="https://…"
              />
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
        </DialogContent>
      </Dialog>
      {memberships.length > 0 ? (
        <>
          <Dialog
            open={addOpen}
            onOpenChange={setAddOpen}
          >
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Add video to community bank</DialogTitle>
              </DialogHeader>
              {selected && (
                <AddVideoForm
                  onSubmit={onAddVideo}
                  loading={addLoading}
                  eventEventType={selected.eventType}
                  showHostYoutubeSlot
                  requirePolicyFields
                  onFormReady={setAddVideoForm}
                  onDraftIdChange={setModalDraftId}
                  draftAutosave={{
                    kind: "community_video",
                    targetId: selected.id,
                    enabled: true,
                  }}
                />
              )}
            </DialogContent>
          </Dialog>
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
}
