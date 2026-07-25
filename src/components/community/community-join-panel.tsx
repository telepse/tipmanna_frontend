"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { toast } from "react-toastify";
import { useSelector } from "react-redux";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { TipperEmailOtpSignInDialog } from "@/components/auth/tipper-email-otp-sign-in-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { RootState } from "@/redux/store";
import {
  getCommunityAccessStateAction,
  requestDomainOtpAction,
  submitJoinAction,
  validateAccessCodeTipperAction,
  verifyDomainOtpAction,
  getMyCommunitySubscriptionAction,
} from "@/actions/communities";
import {
  E2E_JOIN_COMMUNITY_ID,
  E2E_JOIN_FORM_PUBLIC,
} from "@/lib/e2e-explore-fixtures";
import { isExploreE2eFixturesEnabled } from "@/lib/explore-e2e-fixtures-gate";
import { CommunitySubscribeSection } from "@/components/community/community-subscribe-section";

const EXPLORE_COMMUNITY_HUB_HREF = "/explore?tab=my-communities";

const communityFeatureOn =
  process.env.NEXT_PUBLIC_COMMUNITY_FEATURE_ENABLED === "true";

type JoinFormPublic = {
  name: string;
  logoUrl: string | null;
  description?: string | null;
  createdAt?: string | null;
  totalTips?: number;
  memberCount?: number;
  numVideos?: number;
  joinMethod?: "request" | "subscription";
  customQuestion: string | null;
  officialEmailDomain: string | null;
  officialEmailDomainRequired: boolean;
  joinFormRequireAccessCode: boolean;
  defaultMonths: number;
  subscriptionFeeGbp?: string | null;
};

export type CommunityJoinPanelProps = {
  communityId: string;
  /** Full path + query for sign-in redirect (e.g. `/explore?tab=join&joinCommunity=…`). */
  signInRedirectPath: string;
};

export function CommunityJoinPanel({
  communityId,
  signInRedirectPath,
}: CommunityJoinPanelProps) {
  const router = useRouter();
  const { user, isAuthenticated, requiresVerification } = useSelector(
    (s: RootState) => s.auth
  );

  const [gateOk, setGateOk] = useState(false);
  const [loadingForm, setLoadingForm] = useState(true);
  const [form, setForm] = useState<JoinFormPublic | null>(null);

  const [prefix, setPrefix] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [verifiedDomainEmail, setVerifiedDomainEmail] = useState<string | null>(
    null
  );
  const [accessCode, setAccessCode] = useState("");
  const [codeHint, setCodeHint] = useState<string | null>(null);
  const [customAnswer, setCustomAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [doneMessage, setDoneMessage] = useState<string | null>(null);
  const [paidSubExpiresAt, setPaidSubExpiresAt] = useState<string | null>(null);
  const [signInOpen, setSignInOpen] = useState(false);

  useEffect(() => {
    setDoneMessage(null);
    setForm(null);
    setCodeHint(null);
    setVerifiedDomainEmail(null);
    setAccessCode("");
    setPrefix("");
    setOtpCode("");
    setCustomAnswer("");
    setGateOk(false);
    setLoadingForm(true);
  }, [communityId]);

  useEffect(() => {
    if (!communityFeatureOn) return;
    setGateOk(true);
  }, []);

  const loadForm = useCallback(async () => {
    if (!communityId) return;
    setLoadingForm(true);
    if (
      typeof window !== "undefined" &&
      isExploreE2eFixturesEnabled(window.location.search) &&
      communityId === E2E_JOIN_COMMUNITY_ID
    ) {
      setForm(E2E_JOIN_FORM_PUBLIC);
      setLoadingForm(false);
      return;
    }
    const res = await getCommunityAccessStateAction(communityId);
    if (!res.success || !res.data) {
      toast.error(res.message ?? "Could not load community");
      setForm(null);
      setLoadingForm(false);
      return;
    }

    type AccessPayload = {
      joinFormPublic: {
        name: string;
        logoUrl: string | null;
        description?: string | null;
        createdAt?: string | null;
        totalTips?: number;
        memberCount?: number;
        numVideos?: number;
        joinMethod?: "request" | "subscription";
        customQuestion: string | null;
        officialEmailDomain: string | null;
        officialEmailDomainRequired: boolean;
        joinFormRequireAccessCode: boolean;
        defaultMonths: number;
        subscriptionFeeGbp?: string | null;
      };
      subscriptionExpiresAt: string | null;
      isMember: boolean;
      viewerHostsCommunity: boolean;
    };

    const d = res.data as AccessPayload;
    if (d.isMember && !d.viewerHostsCommunity) {
      toast.success("You already belong to this community.");
      setDoneMessage(
        "You're already a member — browse the community hub or renew from account settings."
      );
      const jp = d.joinFormPublic;
      setForm({
        name: jp.name,
        logoUrl: jp.logoUrl,
        description: jp.description ?? null,
        createdAt: jp.createdAt ?? null,
        totalTips: jp.totalTips,
        memberCount: jp.memberCount,
        numVideos: jp.numVideos,
        joinMethod: jp.joinMethod,
        customQuestion: jp.customQuestion,
        officialEmailDomain: jp.officialEmailDomain,
        officialEmailDomainRequired: jp.officialEmailDomainRequired,
        joinFormRequireAccessCode: jp.joinFormRequireAccessCode,
        defaultMonths: jp.defaultMonths,
        subscriptionFeeGbp: jp.subscriptionFeeGbp ?? null,
      });
      setPaidSubExpiresAt(d.subscriptionExpiresAt ?? null);
      setLoadingForm(false);
      return;
    }

    const jp = d.joinFormPublic;
    const nextForm: JoinFormPublic = {
      name: jp.name,
      logoUrl: jp.logoUrl,
      description: jp.description ?? null,
      createdAt: jp.createdAt ?? null,
      totalTips: jp.totalTips,
      memberCount: jp.memberCount,
      numVideos: jp.numVideos,
      joinMethod: jp.joinMethod,
      customQuestion: jp.customQuestion,
      officialEmailDomain: jp.officialEmailDomain,
      officialEmailDomainRequired: jp.officialEmailDomainRequired,
      joinFormRequireAccessCode: jp.joinFormRequireAccessCode,
      defaultMonths: jp.defaultMonths,
      subscriptionFeeGbp: jp.subscriptionFeeGbp ?? null,
    };
    setForm(nextForm);
    setPaidSubExpiresAt(d.subscriptionExpiresAt ?? null);
    if (d.viewerHostsCommunity) {
      toast.info(
        "You operate this community as host — manage it from Host tools rather than joining as a tipper."
      );
    }

    setLoadingForm(false);
  }, [communityId]);

  useEffect(() => {
    void loadForm();
  }, [loadForm]);

  const onSendOtp = async () => {
    if (!user?.id) return;
    const res = await requestDomainOtpAction(undefined, communityId, prefix);
    if (!res.success) {
      toast.error(res.message ?? "Could not send code");
      return;
    }
    toast.success("Check your inbox for the code");
  };

  const onVerifyOtp = async () => {
    if (!user?.id) return;
    const res = await verifyDomainOtpAction(
      undefined,
      communityId,
      prefix,
      otpCode
    );
    if (!res.success || !res.data) {
      toast.error(res.message ?? "Invalid code");
      return;
    }
    const d = res.data as { verifiedDomainEmail: string };
    setVerifiedDomainEmail(d.verifiedDomainEmail);
    toast.success("Email verified");
  };

  const onBlurValidateCode = async () => {
    const c = accessCode.trim();
    if (!c) {
      setCodeHint(null);
      return;
    }
    if (!user?.id) return;
    const res = await validateAccessCodeTipperAction(undefined, communityId, c);
    if (!res.success || !res.data) {
      setCodeHint(null);
      return;
    }
    const d = res.data as { valid: boolean; monthsGranted: number | null };
    setCodeHint(
      d.valid && d.monthsGranted != null
        ? `Valid code — ${d.monthsGranted} month(s) membership`
        : d.valid
          ? "Valid code"
          : "Invalid or exhausted code"
    );
  };

  const onSubmit = async () => {
    if (!user?.id) return;
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {};
      if (accessCode.trim()) body.accessCode = accessCode.trim();
      if (verifiedDomainEmail) body.verifiedDomainEmail = verifiedDomainEmail;
      if (customAnswer.trim()) body.customAnswer = customAnswer.trim();

      const res = await submitJoinAction(undefined, communityId, body);
      if (!res.success || !res.data) {
        toast.error(res.message ?? "Join failed");
        return;
      }
      const d = res.data as {
        path?: string;
        requestId?: string;
        message?: string;
      };
      if (d.path === "request") {
        setDoneMessage(
          "Your request was submitted. The community owner will review it."
        );
        toast.success("Request submitted");
      } else {
        setDoneMessage("You are now a member of this community.");
        toast.success("Welcome!");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!communityFeatureOn) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <p className="text-muted-foreground text-sm">
          Community features are disabled.
        </p>
      </div>
    );
  }

  let joinBody: ReactNode;

  if (!communityId) {
    joinBody = (
      <p className="text-muted-foreground p-6 text-sm">Missing community.</p>
    );
  } else if (!gateOk) {
    joinBody = (
      <div className="flex min-h-[30vh] items-center justify-center">
        <Loader2 className="text-muted-foreground size-8 animate-spin" />
      </div>
    );
  } else if (loadingForm || !form) {
    joinBody = (
      <div className="flex min-h-[30vh] items-center justify-center">
        <Loader2 className="text-muted-foreground size-8 animate-spin" />
      </div>
    );
  } else if (doneMessage) {
    joinBody = (
      <div className="mx-auto max-w-lg px-4 py-16">
        <h1 className="text-xl font-semibold">{form.name}</h1>
        <p className="text-muted-foreground mt-4 text-sm">{doneMessage}</p>
        <Button
          asChild
          className="mt-6"
          variant="outline"
        >
          <Link href={EXPLORE_COMMUNITY_HUB_HREF}>Back to communities</Link>
        </Button>
      </div>
    );
  } else {
    const domainNorm = form.officialEmailDomain?.replace(/^@/, "") ?? "";
    const paidFee = form.subscriptionFeeGbp?.trim();
    const showPaidSubscribe =
      paidFee != null && paidFee !== "" && Number(paidFee) > 0;

    joinBody = (
      <div className="mx-auto max-w-lg px-4 py-16">
        <div className="mb-8 space-y-4">
          {form.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={form.logoUrl}
              alt=""
              className="size-16 rounded-xl object-cover"
            />
          ) : null}
          <h1 className="text-2xl font-semibold">{form.name}</h1>
          {form.description ? (
            <p className="text-muted-foreground text-sm leading-relaxed">
              {form.description}
            </p>
          ) : null}
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-muted-foreground text-xs">Total tips</dt>
              <dd className="font-medium">£{form.totalTips ?? 0}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Members</dt>
              <dd className="font-medium">{form.memberCount ?? 0}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Videos</dt>
              <dd className="font-medium">{form.numVideos ?? 0}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Created</dt>
              <dd className="font-medium">
                {form.createdAt
                  ? new Date(form.createdAt).toLocaleDateString()
                  : "—"}
              </dd>
            </div>
          </dl>
          <p className="text-muted-foreground text-xs">
            How to join:{" "}
            {form.joinMethod === "subscription"
              ? "Paid subscription"
              : "Submit a free request for approval"}
          </p>
        </div>

        {!isAuthenticated || requiresVerification ? (
          <div className="bg-muted/40 space-y-3 rounded-lg border p-4">
            <p className="text-sm">
              Sign in with your tipper email to submit a join request.
            </p>
            <Button
              type="button"
              onClick={() => setSignInOpen(true)}
            >
              Continue with email
            </Button>
          </div>
        ) : (
          <>
            <h2 className="text-lg font-semibold">Join {form.name}</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              Signed in as {user?.email}. Default membership length when using
              domain or approval: {form.defaultMonths} month(s).
            </p>

            {showPaidSubscribe && (
              <div className="mt-6">
                <CommunitySubscribeSection
                  communityId={communityId}
                  feeGbp={Number(paidFee).toFixed(2)}
                  activeUntil={paidSubExpiresAt}
                  onSubscriptionChange={async () => {
                    if (!user?.id) return;
                    const subRes = await getMyCommunitySubscriptionAction(
                      undefined,
                      communityId
                    );
                    if (subRes.success && subRes.data) {
                      const d = subRes.data as {
                        subscription: { expiresAt: string | null } | null;
                      };
                      setPaidSubExpiresAt(d.subscription?.expiresAt ?? null);
                    }
                  }}
                />
                <p className="text-muted-foreground mt-4 text-xs">
                  Or use a join request, invite link, or access code below.
                </p>
              </div>
            )}

            {form.joinFormRequireAccessCode && (
              <div className="mt-6 space-y-2">
                <Label htmlFor="acc">Access code</Label>
                <Input
                  id="acc"
                  value={accessCode}
                  onChange={e => setAccessCode(e.target.value)}
                  onBlur={() => void onBlurValidateCode()}
                />
                {codeHint && (
                  <p className="text-muted-foreground text-xs">{codeHint}</p>
                )}
              </div>
            )}

            {!form.joinFormRequireAccessCode && (
              <div className="mt-6 space-y-2">
                <Label htmlFor="acc-opt">Access code (optional)</Label>
                <Input
                  id="acc-opt"
                  value={accessCode}
                  onChange={e => setAccessCode(e.target.value)}
                  onBlur={() => void onBlurValidateCode()}
                  placeholder="Skip if you are requesting access"
                />
                {codeHint && (
                  <p className="text-muted-foreground text-xs">{codeHint}</p>
                )}
              </div>
            )}

            {form.officialEmailDomain &&
              form.officialEmailDomainRequired &&
              domainNorm && (
                <div className="mt-6 space-y-3 rounded-lg border p-4">
                  <p className="text-sm font-medium">Verify work email</p>
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="min-w-[120px] flex-1">
                      <Label htmlFor="prefix">Prefix</Label>
                      <Input
                        id="prefix"
                        value={prefix}
                        onChange={e => setPrefix(e.target.value)}
                        placeholder="you"
                      />
                    </div>
                    <p className="text-muted-foreground pb-2 text-sm">
                      @{domainNorm}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void onSendOtp()}
                  >
                    Send verification code
                  </Button>
                  <div>
                    <Label htmlFor="otp">Code from email</Label>
                    <Input
                      id="otp"
                      value={otpCode}
                      onChange={e => setOtpCode(e.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void onVerifyOtp()}
                  >
                    Verify
                  </Button>
                  {verifiedDomainEmail && (
                    <p className="text-xs text-green-700">
                      Verified: {verifiedDomainEmail}
                    </p>
                  )}
                </div>
              )}

            {form.customQuestion && (
              <div className="mt-6 space-y-2">
                <Label>{form.customQuestion}</Label>
                <Textarea
                  value={customAnswer}
                  onChange={e => setCustomAnswer(e.target.value)}
                  rows={4}
                />
              </div>
            )}

            <div className="mt-8 flex flex-col gap-2">
              <Button
                type="button"
                disabled={submitting}
                onClick={() => void onSubmit()}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  "Submit"
                )}
              </Button>
              <Button
                asChild
                variant="ghost"
              >
                <Link href={EXPLORE_COMMUNITY_HUB_HREF}>Cancel</Link>
              </Button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <>
      {joinBody}
      <TipperEmailOtpSignInDialog
        open={signInOpen}
        onOpenChange={setSignInOpen}
        signInTitle="Sign in to join this community"
        onVerified={() => void loadForm()}
      />
    </>
  );
}
