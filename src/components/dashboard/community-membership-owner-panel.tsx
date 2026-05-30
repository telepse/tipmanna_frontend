"use client";

import { useCallback, useEffect, useState } from "react";
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

  const loadJoinForm = useCallback(async () => {
    if (!userId) return;
    const res = await getJoinFormAction(undefined, communityId);
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
    };
    setJoinOfficialDomain(d.officialEmailDomain ?? "");
    setJoinDomainRequired(d.officialEmailDomainRequired);
    setJoinCodeRequired(d.joinFormRequireAccessCode);
    setJoinQuestion(d.joinFormCustomQuestion ?? "");
    setJoinDefaultMonths(d.joinFormDefaultMonths ?? 1);
    setJoinSubscriptionFee(
      d.subscriptionFeeGbp != null && d.subscriptionFeeGbp !== ""
        ? String(d.subscriptionFeeGbp)
        : ""
    );
  }, [communityId, userId]);

  const loadMembers = useCallback(async () => {
    if (!userId) return;
    const res = await listMembersAction(undefined, communityId);
    if (!res.success || !res.data) {
      toast.error(res.message ?? "Could not load members");
      return;
    }
    const d = res.data as { members: MemberRow[] };
    setMembers(d.members ?? []);
  }, [communityId, userId]);

  const loadCodes = useCallback(async () => {
    if (!userId) return;
    const res = await listAccessCodesOwnerAction(undefined, communityId);
    if (!res.success || !res.data) {
      toast.error(res.message ?? "Could not load codes");
      return;
    }
    const d = res.data as { codes: AccessCodeRow[] };
    setCodes(d.codes ?? []);
  }, [communityId, userId]);

  const loadInvites = useCallback(async () => {
    if (!userId) return;
    const res = await listInvitesAction(undefined, communityId);
    if (!res.success || !res.data) {
      toast.error(res.message ?? "Could not load invites");
      return;
    }
    const d = res.data as { invites: InviteRow[] };
    setInvites(d.invites ?? []);
  }, [communityId, userId]);

  const loadRequests = useCallback(async () => {
    if (!userId) return;
    const res = await listRequestsAction(undefined, communityId);
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
      undefined,
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
    void loadJoinForm();
  }, [loadJoinForm]);

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
      const res = await updateJoinFormAction(undefined, communityId, {
        officialEmailDomain: joinOfficialDomain.trim() || null,
        officialEmailDomainRequired: joinDomainRequired,
        joinFormRequireAccessCode: joinCodeRequired,
        joinFormCustomQuestion: joinQuestion.trim() || null,
        joinFormDefaultMonths: joinDefaultMonths,
      });
      if (!res.success) {
        toast.error(res.message ?? "Save failed");
        return;
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
      const feeRes = await patchCommunitySubscriptionFeeAction(
        undefined,
        communityId,
        feeVal
      );
      if (!feeRes.success) {
        toast.error(feeRes.message ?? "Could not save subscription fee");
        return;
      }
      toast.success("Join form saved");
    } finally {
      setLoading(false);
    }
  };

  const onTerminate = async (membershipId: string) => {
    if (!userId) return;
    const res = await terminateMemberAction(
      undefined,
      communityId,
      membershipId
    );
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
      undefined,
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
    const res = await createAccessCodeAction(undefined, communityId, body);
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
    const res = await updateAccessCodeAction(undefined, communityId, row.id, {
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
    const res = await deleteAccessCodeAction(undefined, communityId, id);
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
    const res = await createInviteAction(undefined, communityId, body);
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
    const res = await deleteInviteAction(undefined, communityId, id);
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
    <div className="space-y-4">
      <div className="bg-muted/40 flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
        <div>
          <p className="text-sm font-medium">Public join page</p>
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
        <TabsList className="flex h-auto min-h-10 w-full flex-wrap gap-1">
          <TabsTrigger value="join">Join form</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="dedicated">Dedicated mode</TabsTrigger>
          <TabsTrigger value="invites">Invites</TabsTrigger>
          <TabsTrigger value="codes">Access codes</TabsTrigger>
          <TabsTrigger value="requests">Requests</TabsTrigger>
        </TabsList>

        <TabsContent
          value="join"
          className="mt-4 space-y-4"
        >
          <div className="grid max-w-xl gap-3">
            <div>
              <Label htmlFor="official-domain">Official email domain</Label>
              <Input
                id="official-domain"
                className="mt-1"
                placeholder="company.com"
                value={joinOfficialDomain}
                onChange={e => setJoinOfficialDomain(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="domain-req"
                checked={joinDomainRequired}
                onCheckedChange={setJoinDomainRequired}
              />
              <Label htmlFor="domain-req">
                Require OTP verification for this domain before join/request
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="code-req"
                checked={joinCodeRequired}
                onCheckedChange={setJoinCodeRequired}
              />
              <Label htmlFor="code-req">Require access code to join</Label>
            </div>
            <div>
              <Label htmlFor="default-months">
                Default membership length (months)
              </Label>
              <Input
                id="default-months"
                type="number"
                min={1}
                className="mt-1 max-w-[120px]"
                value={joinDefaultMonths}
                onChange={e =>
                  setJoinDefaultMonths(Number(e.target.value) || 1)
                }
              />
            </div>
            <div>
              <Label htmlFor="sub-fee">
                Paid membership — monthly price (£, optional)
              </Label>
              <Input
                id="sub-fee"
                type="number"
                min={0}
                step="0.01"
                className="mt-1 max-w-[180px]"
                placeholder="e.g. 4.99 — leave empty for invite/code only"
                value={joinSubscriptionFee}
                onChange={e => setJoinSubscriptionFee(e.target.value)}
              />
              <p className="text-muted-foreground mt-1 text-xs">
                When set, tippers can pay monthly via card or Tipper Wallet on
                the join page (Host Community plan required).
              </p>
            </div>
            <div>
              <Label htmlFor="custom-q">Custom question (optional)</Label>
              <Textarea
                id="custom-q"
                className="mt-1"
                rows={3}
                value={joinQuestion}
                onChange={e => setJoinQuestion(e.target.value)}
                placeholder="Why do you want to join?"
              />
            </div>
            <Button
              type="button"
              disabled={loading}
              onClick={() => void onSaveJoinForm()}
            >
              Save join settings
            </Button>
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
                          undefined,
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
                          undefined,
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
