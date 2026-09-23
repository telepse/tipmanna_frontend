"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  getMyCommunitySubscriptionAction,
  requestDomainOtpAction,
  submitJoinAction,
  validateAccessCodeTipperAction,
  verifyDomainOtpAction,
} from "@/actions/communities";
import {
  E2E_JOIN_COMMUNITY_ID,
  E2E_JOIN_FORM_PUBLIC,
} from "@/lib/e2e-explore-fixtures";
import { isExploreE2eFixturesEnabled } from "@/lib/explore-e2e-fixtures-gate";
import { CommunitySubscribeSection } from "@/components/community/community-subscribe-section";
import { CommunityMemberInfo } from "@/components/community/community-member-info";
import { DedicatedExitConfirmDialog } from "@/components/community/dedicated-exit-confirm-dialog";
import { useSideChick } from "@/components/community/side-chick-provider";
import { useDedicatedExitGate } from "@/hooks/use-dedicated-exit-gate";
import { isCommunityAlreadyIn } from "@/lib/community-already-in";
import {
  fetchCommunityAccessStateCached,
  invalidateCommunityAccessState,
} from "@/lib/drawer-prefetch-cache";
import { cn } from "@/lib/utils";

const EXPLORE_COMMUNITY_HUB_HREF = "/explore?tab=my-communities";

type JoinFormPublic = {
  name: string;
  joinMethod?: "request" | "subscription";
  customQuestion: string | null;
  officialEmailDomain: string | null;
  officialEmailDomainRequired: boolean;
  joinFormRequireAccessCode: boolean;
  defaultMonths: number;
  subscriptionFeeGbp?: string | null;
};

export type CommunityHowToJoinSectionProps = {
  communityId: string;
  /** Full path + query for sign-in redirect. */
  signInRedirectPath: string;
  className?: string;
  showCancelLink?: boolean;
  /** When false, member UI is omitted (e.g. parent shows it elsewhere). */
  showMemberInfo?: boolean;
  /** Hide join form when community is locked; still shows member info if applicable. */
  joinDisabled?: boolean;
  /** Called when a join request completes so parents can surface success elsewhere. */
  onDoneMessageChange?: (message: string | null) => void;
  /** Called when the user becomes a member (instant join path). */
  onJoined?: () => void;
  signInOverlayClassName?: string;
  signInContentClassName?: string;
};

export function CommunityHowToJoinSection({
  communityId,
  signInRedirectPath,
  className,
  showCancelLink = true,
  showMemberInfo = true,
  joinDisabled = false,
  onDoneMessageChange,
  onJoined,
  signInOverlayClassName,
  signInContentClassName,
}: CommunityHowToJoinSectionProps) {
  const router = useRouter();
  const { user, isAuthenticated, requiresVerification } = useSelector(
    (s: RootState) => s.auth
  );
  const sideChick = useSideChick();
  const communityFeatureOn =
    process.env.NEXT_PUBLIC_COMMUNITY_FEATURE_ENABLED === "true";
  const sideChickLocked =
    !sideChick.loading &&
    Boolean(sideChick.active && sideChick.activation?.communityId) &&
    communityFeatureOn;
  const dedicatedCommunityId = sideChick.activation?.communityId ?? null;
  const dedicatedCommunityName =
    sideChick.activation?.community.name ?? "Community";
  const dedicatedExit = useDedicatedExitGate({
    sideChickLocked,
    dedicatedCommunityName,
    exitDedicatedMode: sideChick.exitDedicatedMode,
    reloadAfterExit: false,
  });

  const [form, setForm] = useState<JoinFormPublic | null>(null);
  const [loading, setLoading] = useState(true);
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
  const [isMember, setIsMember] = useState(false);
  const [membershipStatus, setMembershipStatus] = useState<string | null>(null);
  const [membershipExpiresAt, setMembershipExpiresAt] = useState<string | null>(
    null
  );
  const [viewerHostsCommunity, setViewerHostsCommunity] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const [signInReturnTo, setSignInReturnTo] = useState(signInRedirectPath);
  const formLoadedForRef = useRef<string | null>(null);
  const activeCommunityIdRef = useRef(communityId);
  activeCommunityIdRef.current = communityId;

  const accessCodeId = `acc-${communityId}`;
  const accessCodeOptionalId = `acc-opt-${communityId}`;
  const prefixId = `prefix-${communityId}`;
  const otpId = `otp-${communityId}`;

  useEffect(() => {
    formLoadedForRef.current = null;
    setDoneMessage(null);
    setForm(null);
    setCodeHint(null);
    setVerifiedDomainEmail(null);
    setAccessCode("");
    setPrefix("");
    setOtpCode("");
    setCustomAnswer("");
    setIsMember(false);
    setMembershipStatus(null);
    setMembershipExpiresAt(null);
    setViewerHostsCommunity(false);
    setLoading(true);
    onDoneMessageChange?.(null);
  }, [communityId, onDoneMessageChange]);

  const loadForm = useCallback(
    async (options?: {
      background?: boolean;
      force?: boolean;
    }): Promise<{
      isMember: boolean;
      viewerHostsCommunity: boolean;
    } | null> => {
      if (!communityId) return null;
      const requestCommunityId = communityId;
      const background =
        options?.background ?? formLoadedForRef.current === communityId;

      if (!background) {
        setLoading(true);
      }

      if (
        typeof window !== "undefined" &&
        isExploreE2eFixturesEnabled(window.location.search) &&
        communityId === E2E_JOIN_COMMUNITY_ID
      ) {
        setForm(E2E_JOIN_FORM_PUBLIC);
        formLoadedForRef.current = communityId;
        setLoading(false);
        return { isMember: false, viewerHostsCommunity: false };
      }

      type AccessPayload = {
        joinFormPublic: {
          name: string;
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
        membershipStatus: string | null;
        membershipExpiresAt: string | null;
        viewerHostsCommunity: boolean;
      };

      const data = await fetchCommunityAccessStateCached(communityId, {
        force: options?.force,
      });
      if (activeCommunityIdRef.current !== requestCommunityId) return null;

      if (!data) {
        if (!background) {
          toast.error("Could not load community");
        }
        setForm(null);
        formLoadedForRef.current = null;
        setLoading(false);
        return null;
      }

      const d = data as AccessPayload;
      const jp = d.joinFormPublic;
      setForm({
        name: jp.name,
        joinMethod: jp.joinMethod,
        customQuestion: jp.customQuestion,
        officialEmailDomain: jp.officialEmailDomain,
        officialEmailDomainRequired: jp.officialEmailDomainRequired,
        joinFormRequireAccessCode: jp.joinFormRequireAccessCode,
        defaultMonths: jp.defaultMonths,
        subscriptionFeeGbp: jp.subscriptionFeeGbp ?? null,
      });
      setPaidSubExpiresAt(d.subscriptionExpiresAt ?? null);
      setIsMember(d.isMember);
      setMembershipStatus(d.membershipStatus ?? null);
      setMembershipExpiresAt(d.membershipExpiresAt ?? null);
      setViewerHostsCommunity(d.viewerHostsCommunity);
      formLoadedForRef.current = communityId;
      setLoading(false);

      if (!background) {
        if (
          isCommunityAlreadyIn({
            isMember: d.isMember,
            viewerHostsCommunity: d.viewerHostsCommunity,
          })
        ) {
          toast.success("You already belong to this community.");
        }
      }

      return {
        isMember: d.isMember,
        viewerHostsCommunity: d.viewerHostsCommunity,
      };
    },
    [communityId]
  );

  const handleSubscriptionChange = useCallback(async () => {
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
    const access = await loadForm({ background: true, force: true });
    if (!access) return;
    if (
      isCommunityAlreadyIn({
        isMember: access.isMember,
        viewerHostsCommunity: access.viewerHostsCommunity,
      })
    ) {
      invalidateCommunityAccessState(communityId);
      toast.success("Welcome!");
      onJoined?.();
      void loadForm({ background: true, force: true });
      return;
    }
    toast.info(
      "Payment received. The community host will approve your membership."
    );
  }, [communityId, loadForm, onJoined, user?.id]);

  useEffect(() => {
    void loadForm({
      background: formLoadedForRef.current === communityId,
    });
  }, [loadForm, communityId]);

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

  const withDedicatedExitGate = useCallback(
    (action: () => void | Promise<void>) => {
      if (
        sideChickLocked &&
        dedicatedCommunityId &&
        communityId !== dedicatedCommunityId
      ) {
        dedicatedExit.requestExitThen(() => void action());
        return;
      }
      void action();
    },
    [
      communityId,
      dedicatedCommunityId,
      dedicatedExit.requestExitThen,
      sideChickLocked,
    ]
  );

  const onSubmit = async () => {
    if (!user?.id) return;
    withDedicatedExitGate(async () => {
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
          const message =
            "Your request was submitted. The community owner will review it.";
          setDoneMessage(message);
          onDoneMessageChange?.(message);
          toast.success("Request submitted");
        } else {
          invalidateCommunityAccessState(communityId);
          toast.success("Welcome!");
          onJoined?.();
          void loadForm({ background: true, force: true });
        }
      } finally {
        setSubmitting(false);
      }
    });
  };

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center py-6", className)}>
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </div>
    );
  }

  if (!form) {
    return null;
  }

  const alreadyIn = isCommunityAlreadyIn({
    isMember,
    viewerHostsCommunity,
  });

  if (alreadyIn && !showMemberInfo) {
    return null;
  }

  if (joinDisabled && !alreadyIn) {
    return null;
  }

  const domainNorm = form.officialEmailDomain?.replace(/^@/, "") ?? "";
  const paidFee = form.subscriptionFeeGbp?.trim();
  const showPaidSubscribe =
    paidFee != null && paidFee !== "" && Number(paidFee) > 0;

  return (
    <>
      <div className={cn("space-y-4", className)}>
        {doneMessage ? (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-900">
            {doneMessage}
          </div>
        ) : null}

        {alreadyIn ? (
          <CommunityMemberInfo
            communityName={form.name}
            membershipStatus={membershipStatus}
            membershipExpiresAt={membershipExpiresAt}
            subscriptionExpiresAt={paidSubExpiresAt}
          />
        ) : (
          <>
            <h5 className="text-xl">
              How to join:{" "}
              <span className="text-sm">
                {form.joinMethod === "subscription"
                  ? "Paid subscription"
                  : "Submit a free request for approval"}
              </span>
            </h5>

            {!isAuthenticated || requiresVerification ? (
              <div className="bg-muted/40 space-y-3 rounded-lg p-4">
                <p className="text-sm">
                  Sign in with your tipper email to submit a join request.
                </p>
                <Button
                  type="button"
                  onClick={() => {
                    setSignInReturnTo(signInRedirectPath);
                    setSignInOpen(true);
                  }}
                >
                  Continue with email
                </Button>
              </div>
            ) : (
              <div className="max-w-lg space-y-4">
                <h2 className="text-lg font-semibold">Join {form.name}</h2>
                <p className="text-muted-foreground mt-2 text-sm">
                  Signed in as {user?.email}. Default membership length when
                  using domain or approval: {form.defaultMonths} month(s).
                </p>

                {showPaidSubscribe && (
                  <div className="mt-6">
                    <CommunitySubscribeSection
                      communityId={communityId}
                      feeGbp={Number(paidFee).toFixed(2)}
                      activeUntil={paidSubExpiresAt}
                      onBeforePay={proceed => withDedicatedExitGate(proceed)}
                      onSubscriptionChange={() =>
                        void handleSubscriptionChange()
                      }
                    />
                    <p className="text-muted-foreground mt-4 text-xs">
                      Or use a join request, invite link, or access code below.
                    </p>
                  </div>
                )}

                {form.joinFormRequireAccessCode && (
                  <div className="mt-6 space-y-2">
                    <Label htmlFor={accessCodeId}>Access code</Label>
                    <Input
                      id={accessCodeId}
                      value={accessCode}
                      onChange={e => setAccessCode(e.target.value)}
                      onBlur={() => void onBlurValidateCode()}
                    />
                    {codeHint && (
                      <p className="text-muted-foreground text-xs">
                        {codeHint}
                      </p>
                    )}
                  </div>
                )}

                {!form.joinFormRequireAccessCode && (
                  <div className="mt-6 space-y-2">
                    <Label htmlFor={accessCodeOptionalId}>
                      Access code (optional)
                    </Label>
                    <Input
                      id={accessCodeOptionalId}
                      value={accessCode}
                      onChange={e => setAccessCode(e.target.value)}
                      onBlur={() => void onBlurValidateCode()}
                      placeholder="Skip if you are requesting access"
                    />
                    {codeHint && (
                      <p className="text-muted-foreground text-xs">
                        {codeHint}
                      </p>
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
                          <Label htmlFor={prefixId}>Prefix</Label>
                          <Input
                            id={prefixId}
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
                        <Label htmlFor={otpId}>Code from email</Label>
                        <Input
                          id={otpId}
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
                  {showCancelLink ? (
                    <Button
                      asChild
                      variant="ghost"
                    >
                      <Link href={EXPLORE_COMMUNITY_HUB_HREF}>Cancel</Link>
                    </Button>
                  ) : null}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <TipperEmailOtpSignInDialog
        open={signInOpen}
        onOpenChange={setSignInOpen}
        signInTitle="Sign in to join this community"
        signupSurface="community_join"
        overlayClassName={signInOverlayClassName}
        contentClassName={signInContentClassName}
        getRedirectPathAfterVerify={() => signInReturnTo}
        onVerified={() => {
          if (signInReturnTo === signInRedirectPath) {
            void loadForm({ background: true, force: true });
          } else {
            router.push(signInReturnTo);
          }
        }}
      />

      <DedicatedExitConfirmDialog
        open={dedicatedExit.confirmOpen}
        onOpenChange={open => {
          if (!open) dedicatedExit.cancelExit();
        }}
        communityName={dedicatedCommunityName}
        busy={dedicatedExit.busy}
        actionLabel="Leave and join community"
        onConfirm={() => void dedicatedExit.confirmExit()}
      />
    </>
  );
}
