"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "react-toastify";

import {
  applyTayePartnerAction,
  claimTayeCohostAction,
  getTayeEnrollmentsAction,
  getTayeHostDashboardAction,
  listTayeOutboundPartnersAction,
  publishTayeOutboundAction,
  reportTayePrerequisitesAction,
  rotateTayePartnerApiKeyAction,
  setTayeEventActiveAction,
} from "@/actions/taye";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Props = {
  eventId: string;
  eventName: string;
};

type PrerequisiteKey =
  | "eventCreateWebhook"
  | "confirmTransactionWebhook"
  | "voucherValidateHook"
  | "emailModal"
  | "postPayRedirect";

type DashboardEventRow = {
  eventId?: string;
  id?: string;
  direction?: string;
  partnerReturnedEventId?: string | null;
  outboundLastFailureAt?: string | null;
  outboundLastFailureReason?: string | null;
  tayeActive?: boolean;
  archivedAt?: string | null;
  amountRaised?: number | string | null;
  accessMode?: string;
};

type OutboundPartnerOption = {
  id: string;
  siteOrigin: string | null;
  hostDisplayName: string;
};

const PREREQ_LABELS: Record<PrerequisiteKey, string> = {
  eventCreateWebhook: "Event create webhook wired",
  confirmTransactionWebhook: "Confirm transaction webhook wired",
  voucherValidateHook: "Voucher validate hook wired",
  emailModal: "Email capture modal live",
  postPayRedirect: "Post-payment redirect to claim URL",
};

export function EventTayeApiTab({ eventId, eventName }: Props) {
  const [loading, setLoading] = useState(true);
  const [partner, setPartner] = useState<Record<string, unknown> | null>(null);
  const [enrollments, setEnrollments] = useState<
    Array<{
      emailTruncated: string;
      status: string;
      origin: string;
      tippedAt?: string | null;
      nudgeSentAt?: string | null;
    }>
  >([]);
  const [tayeActive, setTayeActive] = useState(true);
  const [secretsOnce, setSecretsOnce] = useState<{
    apiKey: string;
    webhookSecret: string;
  } | null>(null);
  const [rotating, setRotating] = useState(false);
  const [eventMeta, setEventMeta] = useState<DashboardEventRow | null>(null);
  const [inviteToken, setInviteToken] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [prerequisites, setPrerequisites] = useState<
    Record<PrerequisiteKey, boolean>
  >({
    eventCreateWebhook: false,
    confirmTransactionWebhook: false,
    voucherValidateHook: false,
    emailModal: false,
    postPayRedirect: false,
  });
  const [savingPrereq, setSavingPrereq] = useState<PrerequisiteKey | null>(
    null
  );
  const [outboundPartners, setOutboundPartners] = useState<
    OutboundPartnerOption[]
  >([]);
  const [selectedOutboundPartnerId, setSelectedOutboundPartnerId] =
    useState("");
  const [publishingOutbound, setPublishingOutbound] = useState(false);
  const [publishedPartnerEventId, setPublishedPartnerEventId] = useState<
    string | null
  >(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const dash = await getTayeHostDashboardAction();
    if (dash.success && dash.data) {
      const data = dash.data as {
        partner?: Record<string, unknown> | null;
        events?: DashboardEventRow[];
      };
      setPartner(data.partner ?? null);
      const p = data.partner?.prerequisitesJson as
        | Record<PrerequisiteKey, boolean>
        | undefined;
      if (p) {
        setPrerequisites(prev => ({ ...prev, ...p }));
      }
      const row = data.events?.find(e => (e.eventId ?? e.id) === eventId);
      if (row) {
        setEventMeta(row);
        if (typeof row.tayeActive === "boolean") {
          setTayeActive(row.tayeActive);
        }
        if (row.partnerReturnedEventId?.trim()) {
          setPublishedPartnerEventId(row.partnerReturnedEventId.trim());
        }
      } else {
        setEventMeta(null);
      }
    }
    const catalog = await listTayeOutboundPartnersAction();
    if (catalog.success && catalog.data?.partners) {
      setOutboundPartners(catalog.data.partners);
      if (catalog.data.partners.length === 1) {
        setSelectedOutboundPartnerId(catalog.data.partners[0]!.id);
      }
    }
    const enr = await getTayeEnrollmentsAction(eventId);
    if (enr.success && enr.data) {
      const data = enr.data as { enrollments?: typeof enrollments };
      setEnrollments(data.enrollments ?? []);
    }
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const applyPartner = async () => {
    const res = await applyTayePartnerAction();
    if (!res.success) {
      toast.error(res.error ?? "Could not register partner");
      return;
    }
    const data = res.data as {
      apiKey?: string;
      webhookSecret?: string;
      alreadyRegistered?: boolean;
    };
    if (data.apiKey && data.webhookSecret) {
      setSecretsOnce({
        apiKey: data.apiKey,
        webhookSecret: data.webhookSecret,
      });
      toast.success("TAYE partner registered — save your secrets now");
    } else if (data.alreadyRegistered) {
      toast.info(
        "You are already registered as a TAYE partner. Use Rotate API key to issue new secrets."
      );
    } else {
      toast.success("TAYE partner registered");
    }
    void refresh();
  };

  const rotatePartnerKey = async () => {
    if (
      !window.confirm(
        "Rotate API key and webhook secret? The previous key and secret stop working immediately."
      )
    ) {
      return;
    }
    setRotating(true);
    const res = await rotateTayePartnerApiKeyAction();
    setRotating(false);
    if (!res.success) {
      toast.error(res.error ?? "Could not rotate API key");
      return;
    }
    const data = res.data as { apiKey?: string; webhookSecret?: string };
    if (data.apiKey && data.webhookSecret) {
      setSecretsOnce({
        apiKey: data.apiKey,
        webhookSecret: data.webhookSecret,
      });
    }
    toast.success("New API key and webhook secret issued — save them now");
  };

  const claimCohost = async () => {
    const token = inviteToken.trim();
    if (!token) {
      toast.error("Enter the cohost invite token from your email");
      return;
    }
    setClaiming(true);
    const res = await claimTayeCohostAction(token);
    setClaiming(false);
    if (!res.success) {
      toast.error(res.error ?? "Could not confirm API tab visibility");
      return;
    }
    toast.success("Visibility confirmed for this account");
    setInviteToken("");
    void refresh();
  };

  const togglePrerequisite = async (key: PrerequisiteKey, next: boolean) => {
    setSavingPrereq(key);
    const res = await reportTayePrerequisitesAction({ [key]: next });
    setSavingPrereq(null);
    if (!res.success) {
      toast.error(res.error ?? "Could not save prerequisite");
      return;
    }
    setPrerequisites(prev => ({ ...prev, [key]: next }));
    toast.success("Prerequisite saved");
    void refresh();
  };

  const toggleActive = async (next: boolean) => {
    const isOutboundCeremony =
      eventMeta?.direction === "tipmanna_outbound" &&
      publishedPartnerEventId &&
      !tayeActive &&
      next;
    if (
      isOutboundCeremony &&
      !window.confirm(
        "Turn TAYE on? Existing guests will start seeing enrollment gating for this room."
      )
    ) {
      return;
    }
    const res = await setTayeEventActiveAction(eventId, next);
    if (!res.success) {
      toast.error(res.error ?? "Could not update TAYE");
      return;
    }
    setTayeActive(next);
    if (next && isOutboundCeremony) {
      toast.success("TAYE enrollment gating is now active for this room");
    }
  };

  const publishOutbound = async () => {
    const partnerId = selectedOutboundPartnerId.trim();
    if (!partnerId) {
      toast.error("Select a partner to publish to");
      return;
    }
    setPublishingOutbound(true);
    const res = await publishTayeOutboundAction(eventId, partnerId);
    setPublishingOutbound(false);
    if (!res.success) {
      toast.error(res.error ?? "Outbound publish failed");
      void refresh();
      return;
    }
    const data = res.data;
    if (data?.partnerReturnedEventId) {
      setPublishedPartnerEventId(data.partnerReturnedEventId);
      toast.success(
        data.alreadyPublished
          ? "Already published to partner"
          : "Published to partner — turn TAYE on when ready"
      );
    }
    void refresh();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="size-8 animate-spin" />
      </div>
    );
  }

  const integrationStatus =
    (partner?.integrationStatus as string | undefined) ?? "none";

  const amountRaised =
    eventMeta?.amountRaised != null ? Number(eventMeta.amountRaised) : null;
  const isArchived = Boolean(eventMeta?.archivedAt);
  const accessMode = eventMeta?.accessMode ?? null;
  const isOutboundPublished = Boolean(
    publishedPartnerEventId || eventMeta?.partnerReturnedEventId?.trim()
  );
  const showOutboundCeremony =
    eventMeta?.direction === "tipmanna_outbound" &&
    isOutboundPublished &&
    !tayeActive;
  const outboundFailed = Boolean(eventMeta?.outboundLastFailureReason);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">TAYE Discount API</h2>
        <p className="text-muted-foreground text-sm">
          {eventName} — monitor opt-ins and partner integration.
        </p>
      </div>

      {accessMode === "public" ? (
        <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4 text-sm">
          This room is set to <strong>public</strong> access. TAYE enrollment
          gating is bypassed for visitors. Partner-created rooms should stay
          restricted (e.g. host code). Change access mode in event settings if
          this is a TAYE partner room.
        </div>
      ) : null}

      <div className="flex flex-wrap gap-4 rounded-lg border p-4 text-sm">
        {amountRaised != null && !Number.isNaN(amountRaised) ? (
          <p>
            Tips raised:{" "}
            <span className="font-medium">£{amountRaised.toFixed(2)}</span>
          </p>
        ) : null}
        {isArchived ? (
          <p className="text-muted-foreground font-medium">
            Archived TAYE event
          </p>
        ) : null}
      </div>

      <div className="space-y-3 rounded-lg border p-4">
        <h3 className="font-medium">Confirm API tab visibility</h3>
        <p className="text-muted-foreground text-sm">
          After you accept the organiser cohost invite as a tipper, paste the
          invite token here while signed in as the organiser host to confirm
          this event appears on your TAYE dashboard (no separate claim record is
          stored).
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1">
            <Label htmlFor="taye-invite-token">Invite token</Label>
            <Input
              id="taye-invite-token"
              value={inviteToken}
              onChange={e => setInviteToken(e.target.value)}
              placeholder="Token from cohost invite email"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={claiming}
            onClick={() => void claimCohost()}
          >
            {claiming ? "Confirming…" : "Confirm visibility"}
          </Button>
        </div>
      </div>

      {!partner ? (
        <div className="space-y-3 rounded-lg border p-4">
          <p className="text-sm">
            Register as an API partner to auto-create event rooms from your
            ticketing site. Requires an active Growth plan.
          </p>
          <Button
            type="button"
            onClick={() => void applyPartner()}
          >
            Register API partner
          </Button>
        </div>
      ) : (
        <div className="space-y-4 rounded-lg border p-4 text-sm">
          <p>
            Integration status:{" "}
            <span className="font-medium">{integrationStatus}</span>
          </p>
          {integrationStatus !== "green" ? (
            <p className="text-muted-foreground">
              Tipmanna ops will set status to <strong>green</strong> after
              reviewing your integration. Saving prerequisites here does not go
              live on its own.
            </p>
          ) : null}
          {secretsOnce ? (
            <div className="bg-muted space-y-2 rounded p-2 font-mono text-xs">
              <p className="font-sans text-sm font-medium">
                Save these now (shown once; refresh clears this panel)
              </p>
              <p className="break-all">apiKey: {secretsOnce.apiKey}</p>
              <p className="break-all">
                webhookSecret: {secretsOnce.webhookSecret}
              </p>
            </div>
          ) : null}
          <p className="text-muted-foreground">
            Partner endpoints: <code>/api/v1/taye/partner/*</code>. Mutating
            calls need Bearer API key, <code>X-Taye-Timestamp</code>,{" "}
            <code>X-Taye-Signature</code> (HMAC of{" "}
            <code>timestamp.JSON.stringify(body)</code> with webhookSecret).
            Create, confirm-transaction, and redeem also need{" "}
            <code>Idempotency-Key</code>.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={rotating}
            onClick={() => void rotatePartnerKey()}
          >
            {rotating ? "Rotating…" : "Rotate API key"}
          </Button>
          <div className="space-y-2">
            <p className="font-medium">Integration checklist</p>
            {(Object.keys(PREREQ_LABELS) as PrerequisiteKey[]).map(key => (
              <div
                key={key}
                className="flex items-center justify-between gap-4 rounded border px-3 py-2"
              >
                <span>{PREREQ_LABELS[key]}</span>
                <Switch
                  checked={prerequisites[key]}
                  disabled={savingPrereq === key}
                  onCheckedChange={v => void togglePrerequisite(key, v)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3 rounded-lg border p-4">
        <h3 className="font-medium">Publish to ticketing partner</h3>
        <p className="text-muted-foreground text-sm">
          Send this Tipmanna event to a green partner that supports outbound
          publish. Publishing does not turn on enrollment gating until you
          enable TAYE below.
        </p>
        {isOutboundPublished ? (
          <p className="text-sm">
            Partner event id:{" "}
            <code className="text-xs">
              {publishedPartnerEventId ??
                eventMeta?.partnerReturnedEventId ??
                "—"}
            </code>
          </p>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-[200px] flex-1 space-y-1">
              <Label htmlFor="taye-outbound-partner">Partner</Label>
              <Select
                value={selectedOutboundPartnerId}
                onValueChange={setSelectedOutboundPartnerId}
              >
                <SelectTrigger id="taye-outbound-partner">
                  <SelectValue placeholder="Select partner" />
                </SelectTrigger>
                <SelectContent>
                  {outboundPartners.map(p => (
                    <SelectItem
                      key={p.id}
                      value={p.id}
                    >
                      {p.hostDisplayName}
                      {p.siteOrigin ? ` (${p.siteOrigin})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              disabled={publishingOutbound || outboundPartners.length === 0}
              onClick={() => void publishOutbound()}
            >
              {publishingOutbound ? "Publishing…" : "Publish"}
            </Button>
          </div>
        )}
        {outboundFailed ? (
          <div className="border-destructive/40 bg-destructive/5 rounded-md border p-3 text-sm">
            <p className="font-medium">Last publish attempt failed</p>
            <p className="text-muted-foreground mt-1">
              {eventMeta?.outboundLastFailureReason}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              disabled={publishingOutbound}
              onClick={() => void publishOutbound()}
            >
              Retry publish
            </Button>
          </div>
        ) : null}
      </div>

      {showOutboundCeremony ? (
        <div className="border-primary/30 bg-primary/5 rounded-lg border p-4 text-sm">
          <p className="font-medium">
            Published — TAYE is off until you enable it
          </p>
          <p className="text-muted-foreground mt-1">
            Room guests are not enrollment-gated yet. Use the switch below to
            turn TAYE on when you are ready to start the discount/access flow.
          </p>
        </div>
      ) : null}

      <div className="flex items-center justify-between rounded-lg border p-4">
        <div>
          <p className="font-medium">TAYE active for this event</p>
          <p className="text-muted-foreground text-sm">
            When off, enrollment gating is disabled for this room (outbound
            publish starts off). When on for partner rooms, codes can issue;
            turn off to stop new codes.
          </p>
        </div>
        <Switch
          checked={tayeActive}
          onCheckedChange={v => void toggleActive(v)}
        />
      </div>

      <div>
        <h3 className="mb-2 font-medium">Enrollments</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Origin</TableHead>
              <TableHead>Watcher</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {enrollments.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-muted-foreground"
                >
                  No enrollments yet.
                </TableCell>
              </TableRow>
            ) : (
              enrollments.map(row => (
                <TableRow key={`${row.emailTruncated}-${row.status}`}>
                  <TableCell>{row.emailTruncated}</TableCell>
                  <TableCell>{row.status}</TableCell>
                  <TableCell>{row.origin}</TableCell>
                  <TableCell>
                    {row.tippedAt
                      ? "Tipped"
                      : row.nudgeSentAt
                        ? "Nudge sent"
                        : "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
