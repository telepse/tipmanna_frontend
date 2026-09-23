"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import {
  Copy,
  Check,
  KeyRound,
  Link2,
  Plus,
  Trash2,
  UserX,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
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
import { Textarea } from "@/components/ui/textarea";
import {
  approveRequestAction,
  createAccessCodeAction,
  createInviteAction,
  deleteAccessCodeAction,
  deleteInviteAction,
  extendFreeMemberMembershipAction,
  getJoinFormAction,
  listAccessCodesOwnerAction,
  listInvitesAction,
  listMembersAction,
  listRequestsAction,
  listSideChickActivationsAction,
  patchCommunitySubscriptionFeeAction,
  rejectRequestAction,
  terminateMemberAction,
  updateAccessCodeAction,
  updateJoinFormAction,
} from "@/actions/communities";
import type { RootState } from "@/redux/store";

type MemberRow = {
  id: string;
  membershipStatus: string;
  active: boolean;
  tier?: string;
  expiresAt: string | null;
  revokedAt: string | null;
  tipper: {
    id: string;
    fullName: string | null;
    username: string;
    email: string | null;
  } | null;
};

type AccessCodeRow = {
  id: string;
  code: string;
  usesAllowed: number | null;
  usesLeft: number | null;
  monthsGranted: number;
  expiresAt: string | null;
  active: boolean;
};

type InviteRow = {
  id: string;
  kind: string;
  email: string | null;
  token: string;
  monthsGranted: number;
  expiresAt: string | null;
  acceptedAt: string | null;
};

type RequestRow = {
  id: string;
  status: string;
  customAnswer: string | null;
  createdAt: string;
  requesterTipper: {
    id: string;
    fullName: string | null;
    username: string;
    email: string | null;
  } | null;
};

export function CommunityMembershipOwnerPanel({
  communityId,
}: {
  communityId: string;
}) {
  const userId = useSelector((s: RootState) => s.auth.user?.id);
  const [subTab, setSubTab] = useState("join");
  const [loading, setLoading] = useState(false);

  const [joinOfficialDomain, setJoinOfficialDomain] = useState("");
  const [joinDomainRequired, setJoinDomainRequired] = useState(false);
  const [joinCodeRequired, setJoinCodeRequired] = useState(false);
  const [joinQuestion, setJoinQuestion] = useState("");
  const [joinDefaultMonths, setJoinDefaultMonths] = useState(1);
  const [joinSubscriptionFee, setJoinSubscriptionFee] = useState("");
  const savedSubscriptionFeeRef = useRef("");
  const [autoApproveFreeJoin, setAutoApproveFreeJoin] = useState(false);
  const [autoApprovePaidJoin, setAutoApprovePaidJoin] = useState(false);

  const [members, setMembers] = useState<MemberRow[]>([]);
  const [codes, setCodes] = useState<AccessCodeRow[]>([]);
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [sideChickScope, setSideChickScope] = useState<"active" | "all">("all");
  const [sideChickData, setSideChickData] = useState<{
    count: number;
    leaderboard: {
      tipperId: string;
      fullName: string | null;
      username: string | null;
      count: number;
      lastStartedAt: string | null;
    }[];
    activations: {
      id: string;
      tipper: { id: string; fullName: string | null; username: string } | null;
      startedAt: string;
      endedAt: string | null;
    }[];
  } | null>(null);

  const [codeDialogOpen, setCodeDialogOpen] = useState(false);
  const [newCodeUses, setNewCodeUses] = useState<string>("10");
  const [newCodeMonths, setNewCodeMonths] = useState("1");
  const [newCodeCustom, setNewCodeCustom] = useState("");

  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteKind, setInviteKind] = useState<"email" | "link">("link");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteMonths, setInviteMonths] = useState("1");
  const [inviteExpires, setInviteExpires] = useState("");

  const [copiedJoinUrl, setCopiedJoinUrl] = useState(false);
  const joinFormLoadedForRef = useRef<string | null>(null);

  const loadJoinForm = useCallback(async () => {
    if (!userId) return;
    const res = await getJoinFormAction(communityId);
    if (!res.success || !res.data) {
      toast.error(res.message ?? "Could not load join form");
      return;
    }
    const d = res.data as {
      officialEmailDomain: string | null;
      officialEmailDomainRequired: boolean;
      joinFormRequireAccessCode: boolean;
      joinFormCustomQuestion: string | null;
      joinFormDefaultMonths: number;
      subscriptionFeeGbp?: string | null;
      autoApproveFreeJoin?: boolean;
      autoApprovePaidJoin?: boolean;
    };
    setJoinOfficialDomain(d.officialEmailDomain ?? "");
    setJoinDomainRequired(d.officialEmailDomainRequired);
    setJoinCodeRequired(d.joinFormRequireAccessCode);
    setJoinQuestion(d.joinFormCustomQuestion ?? "");
    setJoinDefaultMonths(d.joinFormDefaultMonths ?? 1);
    setAutoApproveFreeJoin(Boolean(d.autoApproveFreeJoin));
    setAutoApprovePaidJoin(Boolean(d.autoApprovePaidJoin));
    const feeStr =
      d.subscriptionFeeGbp != null && d.subscriptionFeeGbp !== ""
        ? String(d.subscriptionFeeGbp)
        : "";
    setJoinSubscriptionFee(feeStr);
    savedSubscriptionFeeRef.current = feeStr;
  }, [communityId, userId]);

  const loadMembers = useCallback(async () => {
    if (!userId) return;
    const res = await listMembersAction(communityId);
    if (!res.success || !res.data) {
      toast.error(res.message ?? "Could not load members");
      return;
    }
    const d = res.data as { members: MemberRow[] };
    setMembers(d.members ?? []);
  }, [communityId, userId]);

  const loadCodes = useCallback(async () => {
    if (!userId) return;
    const res = await listAccessCodesOwnerAction(communityId);
    if (!res.success || !res.data) {
      toast.error(res.message ?? "Could not load codes");
      return;
    }
    const d = res.data as { codes: AccessCodeRow[] };
    setCodes(d.codes ?? []);
  }, [communityId, userId]);

  const loadInvites = useCallback(async () => {
    if (!userId) return;
    const res = await listInvitesAction(communityId);
    if (!res.success || !res.data) {
      toast.error(res.message ?? "Could not load invites");
      return;
    }
    const d = res.data as { invites: InviteRow[] };
    setInvites(d.invites ?? []);
  }, [communityId, userId]);

  const loadRequests = useCallback(async () => {
    if (!userId) return;
    const res = await listRequestsAction(communityId);
    if (!res.success || !res.data) {
      toast.error(res.message ?? "Could not load requests");
      return;
    }
    const d = res.data as { requests: RequestRow[] };
    setRequests(d.requests ?? []);
  }, [communityId, userId]);

  const loadDedicated = useCallback(async () => {
    if (!userId) return;
    const res = await listSideChickActivationsAction(
      communityId,
      sideChickScope
    );
    if (!res.success || !res.data) {
      toast.error(res.message ?? "Could not load dedicated-mode stats");
      setSideChickData(null);
      return;
    }
    setSideChickData(
      res.data as {
        count: number;
        leaderboard: {
          tipperId: string;
          fullName: string | null;
          username: string | null;
          count: number;
          lastStartedAt: string | null;
        }[];
        activations: {
          id: string;
          tipper: {
            id: string;
            fullName: string | null;
            username: string;
          } | null;
          startedAt: string;
          endedAt: string | null;
        }[];
      }
    );
  }, [communityId, sideChickScope, userId]);

  useEffect(() => {
    if (joinFormLoadedForRef.current === communityId) return;
    joinFormLoadedForRef.current = communityId;
    void loadJoinForm();
  }, [communityId, loadJoinForm]);

  useEffect(() => {
    if (subTab === "members") void loadMembers();
    if (subTab === "codes") void loadCodes();
    if (subTab === "invites") void loadInvites();
    if (subTab === "requests") void loadRequests();
    if (subTab === "dedicated") void loadDedicated();
  }, [
    subTab,
    loadMembers,
    loadCodes,
    loadInvites,
    loadRequests,
    loadDedicated,
  ]);

  const onSaveJoinForm = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await updateJoinFormAction(communityId, {
        officialEmailDomain: joinOfficialDomain.trim() || null,
        officialEmailDomainRequired: joinDomainRequired,
        joinFormRequireAccessCode: joinCodeRequired,
        joinFormCustomQuestion: joinQuestion.trim() || null,
        joinFormDefaultMonths: joinDefaultMonths,
        autoApproveFreeJoin,
        autoApprovePaidJoin,
      });
      if (!res.success) {
        toast.error(res.message ?? "Save failed");
        return;
      }
      const saved = res.data as {
        autoApproveFreeJoin?: boolean;
        autoApprovePaidJoin?: boolean;
      };
      if (saved.autoApproveFreeJoin !== undefined) {
        setAutoApproveFreeJoin(Boolean(saved.autoApproveFreeJoin));
      }
      if (saved.autoApprovePaidJoin !== undefined) {
        setAutoApprovePaidJoin(Boolean(saved.autoApprovePaidJoin));
      }
      const feeRaw = joinSubscriptionFee.trim();
      let feeVal: number | null;
      if (feeRaw === "") {
        feeVal = null;
      } else {
        const n = Number(feeRaw);
        if (Number.isNaN(n) || n < 0) {
          toast.error("Invalid monthly subscription fee");
          return;
        }
        feeVal = n;
      }
      const prevFeeRaw = savedSubscriptionFeeRef.current.trim();
      const prevFeeNum = prevFeeRaw === "" ? 0 : Number(prevFeeRaw);
      const nextFeeNum = feeVal ?? 0;
      if (prevFeeNum <= 0 && nextFeeNum > 0) {
        const ok = window.confirm(
          "Turn on paid membership? Current members keep access until their end date. They will be asked to subscribe to continue."
        );
        if (!ok) return;
      } else if (prevFeeNum > 0 && nextFeeNum <= 0) {
        const ok = window.confirm(
          "Turn off paid membership? New members join free. People who already paid stay until their paid end date, then receive the default free period."
        );
        if (!ok) return;
      }
      const feeRes = await patchCommunitySubscriptionFeeAction(
        communityId,
        feeVal
      );
      if (!feeRes.success) {
        toast.error(feeRes.message ?? "Could not save subscription fee");
        return;
      }
      savedSubscriptionFeeRef.current = feeRaw;
      toast.success("Join form saved");
    } finally {
      setLoading(false);
    }
  };

  const onTerminate = async (membershipId: string) => {
    if (!userId) return;
    const res = await terminateMemberAction(communityId, membershipId);
    if (!res.success) {
      toast.error(res.message ?? "Could not remove member");
      return;
    }
    toast.success("Member removed");
    await loadMembers();
  };

  const onExtendFreeMember = async (membershipId: string) => {
    const raw = window.prompt(
      "Add how many months to this free (standard) member?",
      "1"
    );
    if (raw === null) return;
    const addMonths = Math.min(36, Math.max(1, Math.floor(Number(raw) || 0)));
    if (!Number.isFinite(addMonths) || addMonths < 1) {
      toast.error("Enter a number between 1 and 36");
      return;
    }
    if (!userId) return;
    const res = await extendFreeMemberMembershipAction(
      communityId,
      membershipId,
      addMonths
    );
    if (!res.success) {
      toast.error(res.message ?? "Could not extend membership");
      return;
    }
    const d = res.data as { expiresAt?: string } | undefined;
    toast.success(
      d?.expiresAt
        ? `Extended — now expires ${new Date(d.expiresAt).toLocaleDateString()}`
        : "Membership extended"
    );
    await loadMembers();
  };

  const onCreateCode = async () => {
    if (!userId) return;
    const uses = newCodeUses.trim() ? Number(newCodeUses) : null;
    const body: Record<string, unknown> = {
      monthsGranted: Number(newCodeMonths) || 1,
      usesAllowed: uses,
      usesLeft: uses,
    };
    if (newCodeCustom.trim()) body.code = newCodeCustom.trim();
    const res = await createAccessCodeAction(communityId, body);
    if (!res.success) {
      toast.error(res.message ?? "Could not create code");
      return;
    }
    toast.success("Access code created");
    setCodeDialogOpen(false);
    setNewCodeCustom("");
    await loadCodes();
  };

  const onToggleCode = async (row: AccessCodeRow) => {
    if (!userId) return;
    const res = await updateAccessCodeAction(communityId, row.id, {
      active: !row.active,
    });
    if (!res.success) {
      toast.error(res.message ?? "Update failed");
      return;
    }
    await loadCodes();
  };

  const onDeleteCode = async (id: string) => {
    if (!userId) return;
    const res = await deleteAccessCodeAction(communityId, id);
    if (!res.success) {
      toast.error(res.message ?? "Delete failed");
      return;
    }
    await loadCodes();
  };

  const onCreateInvite = async () => {
    if (!userId) return;
    const body: Record<string, unknown> = {
      kind: inviteKind,
      monthsGranted: Number(inviteMonths) || 1,
    };
    if (inviteKind === "email") body.email = inviteEmail.trim();
    if (inviteExpires.trim())
      body.expiresAt = new Date(inviteExpires).toISOString();
    const res = await createInviteAction(communityId, body);
    if (!res.success) {
      toast.error(res.message ?? "Could not create invite");
      return;
    }
    toast.success("Invite created");
    setInviteDialogOpen(false);
    setInviteEmail("");
    await loadInvites();
  };

  const onDeleteInvite = async (id: string) => {
    if (!userId) return;
    const res = await deleteInviteAction(communityId, id);
    if (!res.success) {
      toast.error(res.message ?? "Could not delete");
      return;
    }
    await loadInvites();
  };

  const copyPublicJoinUrl = async () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const path = `/explore?tab=join&joinCommunity=${encodeURIComponent(communityId)}`;
    const url = `${origin}${path}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedJoinUrl(true);
      toast.success("Join link copied");
      setTimeout(() => setCopiedJoinUrl(false), 2000);
    } catch {
      toast.error("Could not copy");
    }
  };

  const joinUrlDisplay =
    typeof window !== "undefined"
      ? `${window.location.origin}/explore?tab=join&joinCommunity=${encodeURIComponent(communityId)}`
      : `/explore?tab=join&joinCommunity=${encodeURIComponent(communityId)}`;

  return (
    <div className="bg-card space-y-4 rounded-md border p-4 sm:p-6">
      <div className="bg-muted flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
        <div>
          <h5 className="text-sm font-medium">Public join page</h5>
          <p className="text-muted-foreground max-w-xl truncate text-xs">
            {joinUrlDisplay}
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void copyPublicJoinUrl()}
        >
          {copiedJoinUrl ? (
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

      <Tabs
        value={subTab}
        onValueChange={setSubTab}
        className="w-full"
      >
        <div className="scrollbar-none w-full min-w-0 overflow-x-auto">
          <TabsList className="bg-secondary/30 flex h-auto w-max min-w-full gap-1 rounded-lg p-1">
            <TabsTrigger
              value="join"
              className="shrink-0 rounded-md px-4 py-3 text-sm font-medium whitespace-nowrap transition-all data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-sm"
            >
              Join form
            </TabsTrigger>

            <TabsTrigger
              value="members"
              className="shrink-0 rounded-md px-4 py-3 text-sm font-medium whitespace-nowrap transition-all data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-sm"
            >
              Members
            </TabsTrigger>

            <TabsTrigger
              value="dedicated"
              className="shrink-0 rounded-md px-4 py-3 text-sm font-medium whitespace-nowrap transition-all data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-sm"
            >
              Dedicated mode
            </TabsTrigger>

            <TabsTrigger
              value="invites"
              className="shrink-0 rounded-md px-4 py-3 text-sm font-medium whitespace-nowrap transition-all data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-sm"
            >
              Invites
            </TabsTrigger>

            <TabsTrigger
              value="codes"
              className="shrink-0 rounded-md px-4 py-3 text-sm font-medium whitespace-nowrap transition-all data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-sm"
            >
              Access codes
            </TabsTrigger>

            <TabsTrigger
              value="requests"
              className="shrink-0 rounded-md px-4 py-3 text-sm font-medium whitespace-nowrap transition-all data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-sm"
            >
              Requests
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent
          value="join"
          className="mt-4 space-y-6 pt-1"
        >
          <div className="max-w-3xl space-y-6">
            {/* Join form settings */}
            <section className="rounded-lg border bg-white p-4 sm:p-6">
              <div className="border-b pb-4">
                <h3 className="text-base font-semibold sm:text-lg">
                  Join form settings
                </h3>

                <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                  Configure how people can request or join your community.
                </p>
              </div>

              <div className="mt-5 space-y-5">
                {/* Official email domain */}
                <div className="space-y-1.5">
                  <Label htmlFor="official-domain">Official email domain</Label>

                  <Input
                    id="official-domain"
                    className="h-10 w-full sm:max-w-md"
                    placeholder="company.com"
                    value={joinOfficialDomain}
                    onChange={e => setJoinOfficialDomain(e.target.value)}
                  />

                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Optionally restrict membership requests to people using an
                    approved email domain.
                  </p>
                </div>

                {/* Verification settings */}
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-medium">
                      Verification requirements
                    </h4>

                    <p className="text-muted-foreground mt-1 text-xs">
                      Choose which additional requirements applicants must
                      satisfy.
                    </p>
                  </div>

                  <div className="space-y-2">
                    {/* Domain verification */}
                    <div className="flex items-start gap-3 rounded-md border p-3">
                      <Switch
                        id="domain-req"
                        className="mt-0.5 shrink-0"
                        checked={joinDomainRequired}
                        onCheckedChange={setJoinDomainRequired}
                      />

                      <div className="min-w-0">
                        <Label
                          htmlFor="domain-req"
                          className="cursor-pointer text-sm font-medium"
                        >
                          Require email verification
                        </Label>

                        <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
                          Require OTP verification for the official domain
                          before someone can join or submit a request.
                        </p>
                      </div>
                    </div>

                    {/* Access code */}
                    <div className="flex items-start gap-3 rounded-md border p-3">
                      <Switch
                        id="code-req"
                        className="mt-0.5 shrink-0"
                        checked={joinCodeRequired}
                        onCheckedChange={setJoinCodeRequired}
                      />

                      <div className="min-w-0">
                        <Label
                          htmlFor="code-req"
                          className="cursor-pointer text-sm font-medium"
                        >
                          Require access code
                        </Label>

                        <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
                          Require applicants to provide a valid access code
                          before joining the community.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Membership settings */}
                <div className="space-y-4 border-t pt-5">
                  <div>
                    <h4 className="text-sm font-medium">Membership settings</h4>

                    <p className="text-muted-foreground mt-1 text-xs">
                      Set the default membership duration and optional monthly
                      subscription price.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-start gap-3 rounded-md border p-3">
                      <Switch
                        id="auto-approve-free"
                        className="mt-0.5 shrink-0"
                        checked={autoApproveFreeJoin}
                        onCheckedChange={setAutoApproveFreeJoin}
                      />
                      <div className="min-w-0">
                        <Label
                          htmlFor="auto-approve-free"
                          className="cursor-pointer text-sm font-medium"
                        >
                          Auto-approve free join requests
                        </Label>
                        <p className="text-muted-foreground mt-0.5 text-xs">
                          Automatically accept join requests that do not require
                          payment.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 rounded-md border p-3">
                      <Switch
                        id="auto-approve-paid"
                        className="mt-0.5 shrink-0"
                        checked={autoApprovePaidJoin}
                        onCheckedChange={setAutoApprovePaidJoin}
                      />
                      <div className="min-w-0">
                        <Label
                          htmlFor="auto-approve-paid"
                          className="cursor-pointer text-sm font-medium"
                        >
                          Auto-approve paid subscriptions
                        </Label>
                        <p className="text-muted-foreground mt-0.5 text-xs">
                          Automatically activate members after successful paid
                          subscription checkout.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    {/* Default membership */}
                    <div className="space-y-1.5">
                      <Label htmlFor="default-months">
                        Default membership length
                      </Label>

                      <div className="flex items-center gap-2">
                        <Input
                          id="default-months"
                          type="number"
                          min={1}
                          className="h-10 w-full sm:max-w-[140px]"
                          value={joinDefaultMonths}
                          onChange={e =>
                            setJoinDefaultMonths(Number(e.target.value) || 1)
                          }
                        />

                        <span className="text-muted-foreground text-sm">
                          month{joinDefaultMonths === 1 ? "" : "s"}
                        </span>
                      </div>
                    </div>

                    {/* Subscription fee */}
                    <div className="space-y-1.5">
                      <Label htmlFor="sub-fee">
                        Monthly subscription price
                      </Label>

                      <div className="relative">
                        <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">
                          £
                        </span>

                        <Input
                          id="sub-fee"
                          type="number"
                          min={0}
                          step="0.01"
                          className="h-10 w-full pl-7"
                          placeholder="4.99"
                          value={joinSubscriptionFee}
                          onChange={e => setJoinSubscriptionFee(e.target.value)}
                        />
                      </div>

                      <p className="text-muted-foreground text-xs leading-relaxed">
                        Optional. Leave empty for invite/code-only membership.
                      </p>
                    </div>
                  </div>

                  <div className="bg-muted/40 rounded-md px-3 py-2.5">
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      When a subscription price is set, tippers can pay monthly
                      via card or Tipper Wallet on the join page. Host Community
                      plan required.
                    </p>
                  </div>
                </div>

                {/* Custom question */}
                <div className="space-y-1.5 border-t pt-5">
                  <div>
                    <Label htmlFor="custom-q">Custom question</Label>

                    <p className="text-muted-foreground mt-1 text-xs">
                      Optional question applicants will answer when requesting
                      to join.
                    </p>
                  </div>

                  <Textarea
                    id="custom-q"
                    className="min-h-[100px] resize-none"
                    rows={4}
                    value={joinQuestion}
                    onChange={e => setJoinQuestion(e.target.value)}
                    placeholder="Why do you want to join?"
                  />
                </div>

                {/* Save */}
                <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-end">
                  <Button
                    type="button"
                    disabled={loading}
                    className="w-full sm:w-auto"
                    onClick={() => void onSaveJoinForm()}
                  >
                    {loading ? "Saving..." : "Save join settings"}
                  </Button>
                </div>
              </div>
            </section>
          </div>
        </TabsContent>

        <TabsContent
          value="members"
          className="mt-4"
        >
          <ul className="space-y-2">
            {members.map(m => (
              <li
                key={m.id}
                className="bg-card flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
              >
                <div>
                  <p className="text-sm font-medium">
                    {m.tipper?.fullName ?? m.tipper?.username}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    @{m.tipper?.username} · {m.tipper?.email}
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Status: {m.membershipStatus} · tier: {m.tier ?? "standard"}{" "}
                    · active: {String(m.active)}
                    {m.expiresAt
                      ? ` · expires ${new Date(m.expiresAt).toLocaleDateString()}`
                      : ""}
                  </p>
                </div>
                {m.active &&
                m.membershipStatus !== "revoked" &&
                (m.tier ?? "standard") === "standard" ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => void onExtendFreeMember(m.id)}
                  >
                    Extend free term
                  </Button>
                ) : null}
                {m.active && m.membershipStatus !== "revoked" && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void onTerminate(m.id)}
                  >
                    <UserX className="mr-1 size-4" />
                    Terminate
                  </Button>
                )}
              </li>
            ))}
          </ul>
          {!members.length && (
            <p className="text-muted-foreground text-sm">No members yet.</p>
          )}
        </TabsContent>

        <TabsContent
          value="dedicated"
          className="mt-4 space-y-4"
        >
          <div className="flex flex-wrap items-center gap-2">
            <Label className="text-xs">Scope</Label>
            <Select
              value={sideChickScope}
              onValueChange={v => setSideChickScope(v as "active" | "all")}
            >
              <SelectTrigger className="h-8 w-[160px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All-time</SelectItem>
                <SelectItem value="active">Active now</SelectItem>
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void loadDedicated()}
            >
              Refresh
            </Button>
          </div>
          {sideChickData ? (
            <>
              <p className="text-sm">
                Total activations (all time):{" "}
                <span className="font-semibold">{sideChickData.count}</span>
              </p>
              <div>
                <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
                  Leaderboard (tipper · sessions)
                </p>
                <ul className="space-y-1 text-sm">
                  {sideChickData.leaderboard.map(row => (
                    <li
                      key={row.tipperId}
                      className="bg-card flex justify-between gap-2 rounded border px-2 py-1.5"
                    >
                      <span>
                        {row.fullName ?? row.username ?? row.tipperId}
                      </span>
                      <span className="text-muted-foreground">
                        {row.count}{" "}
                        {row.lastStartedAt
                          ? `· last ${new Date(row.lastStartedAt).toLocaleString()}`
                          : ""}
                      </span>
                    </li>
                  ))}
                </ul>
                {!sideChickData.leaderboard.length ? (
                  <p className="text-muted-foreground text-xs">No data yet.</p>
                ) : null}
              </div>
              <div>
                <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
                  Recent sessions
                </p>
                <ul className="max-h-[320px] space-y-1 overflow-y-auto text-sm">
                  {sideChickData.activations.map(a => (
                    <li
                      key={a.id}
                      className="bg-muted/30 rounded border px-2 py-1.5"
                    >
                      <span className="font-medium">
                        {a.tipper?.fullName ?? a.tipper?.username ?? "—"}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {" "}
                        · started {new Date(a.startedAt).toLocaleString()}
                        {a.endedAt
                          ? ` · ended ${new Date(a.endedAt).toLocaleString()}`
                          : " · active"}
                      </span>
                    </li>
                  ))}
                </ul>
                {!sideChickData.activations.length ? (
                  <p className="text-muted-foreground text-xs">
                    No sessions in this scope.
                  </p>
                ) : null}
              </div>
            </>
          ) : (
            <p className="text-muted-foreground text-sm">Loading…</p>
          )}
        </TabsContent>

        <TabsContent
          value="invites"
          className="mt-4 space-y-3"
        >
          <Button
            type="button"
            size="sm"
            onClick={() => setInviteDialogOpen(true)}
          >
            <Plus className="mr-1 size-4" />
            New invite
          </Button>
          <ul className="space-y-2">
            {invites.map(inv => (
              <li
                key={inv.id}
                className="bg-muted/40 rounded-lg border p-3 text-sm"
              >
                <p className="font-medium">
                  {inv.kind} {inv.email ? `· ${inv.email}` : "· open link"}
                </p>
                <p className="text-muted-foreground text-xs">
                  {inv.acceptedAt
                    ? `Used ${new Date(inv.acceptedAt).toLocaleString()}`
                    : `Token …${inv.token.slice(-8)}`}
                </p>
                {!inv.acceptedAt && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const url = `${typeof window !== "undefined" ? window.location.origin : ""}/community/invite/${inv.token}`;
                        void navigator.clipboard.writeText(url);
                        toast.success("Invite link copied");
                      }}
                    >
                      <Copy className="mr-1 size-4" />
                      Copy link
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => void onDeleteInvite(inv.id)}
                    >
                      <Trash2 className="mr-1 size-4" />
                      Delete
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
          {!invites.length && (
            <p className="text-muted-foreground text-sm">No invites yet.</p>
          )}
        </TabsContent>

        <TabsContent
          value="codes"
          className="mt-4 space-y-3"
        >
          <Button
            type="button"
            size="sm"
            onClick={() => setCodeDialogOpen(true)}
          >
            <KeyRound className="mr-1 size-4" />
            New code
          </Button>
          <ul className="space-y-2">
            {codes.map(c => (
              <li
                key={c.id}
                className="bg-muted/40 flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
              >
                <div>
                  <p className="font-mono text-sm font-medium">{c.code}</p>
                  <p className="text-muted-foreground text-xs">
                    Uses: {c.usesLeft ?? "∞"} / {c.usesAllowed ?? "∞"} ·{" "}
                    {c.monthsGranted} mo
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={c.active}
                    onCheckedChange={() => void onToggleCode(c)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => void onDeleteCode(c.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          {!codes.length && (
            <p className="text-muted-foreground text-sm">No access codes.</p>
          )}
        </TabsContent>

        <TabsContent
          value="requests"
          className="mt-4"
        >
          <ul className="space-y-3">
            {requests.map(r => (
              <li
                key={r.id}
                className="bg-card rounded-lg border p-3"
              >
                <p className="text-sm font-medium">
                  {r.requesterTipper?.fullName ?? r.requesterTipper?.username}{" "}
                  <span className="text-muted-foreground font-normal">
                    ({r.status})
                  </span>
                </p>
                <p className="text-muted-foreground text-xs">
                  {r.requesterTipper?.email}
                </p>
                {r.customAnswer && (
                  <p className="mt-2 text-sm">{r.customAnswer}</p>
                )}
                {r.status === "pending" && (
                  <div className="mt-2 flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={async () => {
                        if (!userId) return;
                        const res = await approveRequestAction(
                          communityId,
                          r.id
                        );
                        if (!res.success) {
                          toast.error(res.message ?? "Approve failed");
                          return;
                        }
                        toast.success("Approved");
                        await loadRequests();
                        await loadMembers();
                      }}
                    >
                      Approve
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        if (!userId) return;
                        const res = await rejectRequestAction(
                          communityId,
                          r.id
                        );
                        if (!res.success) {
                          toast.error(res.message ?? "Reject failed");
                          return;
                        }
                        toast.success("Rejected");
                        await loadRequests();
                      }}
                    >
                      Reject
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
          {!requests.length && (
            <p className="text-muted-foreground text-sm">No requests.</p>
          )}
        </TabsContent>
      </Tabs>

      <Dialog
        open={codeDialogOpen}
        onOpenChange={setCodeDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New access code</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Uses allowed (empty = unlimited)</Label>
            <Input
              value={newCodeUses}
              onChange={e => setNewCodeUses(e.target.value)}
              placeholder="10"
            />
            <Label>Months granted</Label>
            <Input
              value={newCodeMonths}
              onChange={e => setNewCodeMonths(e.target.value)}
            />
            <Label>Custom code (optional)</Label>
            <Input
              value={newCodeCustom}
              onChange={e => setNewCodeCustom(e.target.value)}
              placeholder="Auto-generate if empty"
            />
            <Button
              type="button"
              onClick={() => void onCreateCode()}
            >
              Create
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New member invite</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Kind</Label>
              <Select
                value={inviteKind}
                onValueChange={v => setInviteKind(v as "email" | "link")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="link">Shareable link</SelectItem>
                  <SelectItem value="email">
                    Email (specific address)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            {inviteKind === "email" && (
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                />
              </div>
            )}
            <div>
              <Label>Months granted</Label>
              <Input
                value={inviteMonths}
                onChange={e => setInviteMonths(e.target.value)}
              />
            </div>
            <div>
              <Label>Expires (optional, local datetime)</Label>
              <Input
                type="datetime-local"
                value={inviteExpires}
                onChange={e => setInviteExpires(e.target.value)}
              />
            </div>
            <Button
              type="button"
              onClick={() => void onCreateInvite()}
            >
              <Link2 className="mr-1 size-4" />
              Create
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
