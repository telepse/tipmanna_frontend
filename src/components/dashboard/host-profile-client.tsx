"use client";

import { useEffect, useState } from "react";

import { toast } from "react-toastify";

import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  CircleStar,
  Crown,
  Loader2,
  Settings,
  UserRound,
  Wallet,
} from "lucide-react";

import { useMediaQuery } from "react-responsive";

import { useHostEvents } from "@/hooks/useHostEvents";
import { useHostPayoutSummary } from "@/hooks/useHostPayoutSummary";
import { useHostStats } from "@/hooks/useHostStats";
import { useHostPlanCapabilities } from "@/hooks/useHostPlanCapabilities";
import { useHostSession } from "@/hooks/use-host-session";
import { useHostAuthOptional } from "@/contexts/host-auth-context";
import { useHostSubscriptionPrompt } from "@/hooks/use-host-subscription-prompt";

import { hostSubscriptionBillingPortalAction } from "@/actions/host";
import { getHostProfileAction } from "@/actions/auth";

import { HostBanner } from "../host/host-banner";
import { HostStats } from "../host/host-stats";

import { HostSubscriptionUpgradeTrigger } from "@/components/dashboard/host-subscription-modal";
import { HostSubscriptionPricingPanel } from "@/components/dashboard/host-subscription-pricing-panel";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import Link from "next/link";

import { PayoutSummaryCard } from "../host/payout-summary-card";

import { HostPayoutRequestStatusPanel } from "@/components/dashboard/host-payout-request-status";
import { HostConnectPayoutPanel } from "@/components/dashboard/host-connect-payout-panel";

import { formatGbpMinor } from "@/lib/host-plan-capabilities";

import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";

import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";

import { SettingsClient } from "./settings-client";

function planLabel(tier?: string | null, status?: string) {
  if (tier === "HOST_COMMUNITY" && status === "active") {
    return "Host Community";
  }

  if (tier === "HOST_PREMIUM" && status === "active") {
    return "Host Growth";
  }

  if (status === "lapsed") {
    return "Plan expired";
  }

  return "Free plan";
}

function formatPeriodEnd(iso: string | null | undefined): string | null {
  if (!iso) return null;

  const d = new Date(iso);

  if (Number.isNaN(d.getTime())) {
    return null;
  }

  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Determines whether a payout summary contains meaningful data.
 *
 * Numeric zero values intentionally do not count as
 * non-empty payout history.
 */
function hasNonEmptyPayoutSummary(value: unknown): boolean {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === "number") {
    return value > 0;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some(
      hasNonEmptyPayoutSummary
    );
  }

  return false;
}

/**
 * Returns true when a profile field has a meaningful value.
 */
function hasProfileValue(value: unknown): boolean {
  if (typeof value === "number") {
    return Number.isFinite(value);
  }

  if (typeof value === "boolean") {
    return true;
  }

  if (value instanceof Date) {
    return !Number.isNaN(value.getTime());
  }

  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Calculates profile completeness using only the
 * profile belonging to the selected profile account type.
 *
 * Completion levels:
 *
 * 50%  -> less than 70% complete
 * 70%  -> 70% - 89% complete
 * 90%  -> 90% - 99% complete
 * 100% -> all required fields complete
 */
function getProfileCompleteness(
  accountType: "INDIVIDUAL" | "ORGANIZATION" | null,
  profile: Record<string, unknown> | null | undefined
): number | null {
  if (!accountType || !profile) {
    return null;
  }

  const country = String(profile.country ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

  const isUk =
    country === "united kingdom" ||
    country === "uk" ||
    country === "gb" ||
    country === "great britain";

  const requiredFields: unknown[] =
    accountType === "INDIVIDUAL"
      ? [
          profile.firstName,
          profile.lastName,
          profile.homeAddress,
          profile.city,
          profile.state,
          profile.postalCode,
          profile.country,

          // UK hosts provide NI number.
          // Non-UK hosts provide passport number
          // and additional tax identification.
          isUk ? profile.niNumber : profile.passportNumber,

          ...(isUk ? [] : [profile.additionalTaxIdentification]),

          profile.dateOfBirth,
          profile.gender,
          profile.accountNumber,
          profile.sortCode,
        ]
      : [
          profile.registeredCompanyName,
          profile.companyRegistrationNumber,
          profile.registeredAddress,
          profile.city,
          profile.state,
          profile.postalCode,
          profile.country,
          profile.dateOfBirth,
          profile.uniqueTaxpayerReference,
          profile.accountNumber,
          profile.sortCode,
        ];

  const completedFields = requiredFields.filter(hasProfileValue).length;

  const completionRatio =
    requiredFields.length > 0 ? completedFields / requiredFields.length : 0;

  if (completionRatio >= 1) {
    return 100;
  }

  if (completionRatio >= 0.9) {
    return 90;
  }

  if (completionRatio >= 0.7) {
    return 70;
  }

  return 50;
}

export const HostProfileClient = () => {
  const { events } = useHostEvents();

  const { stats } = useHostStats();

  const {
    creatorPayoutVerifiedAt,
    summary,
    requestPayout,
    connectPayouts,
    refresh,
  } = useHostPayoutSummary();

  const hostSession = useHostSession();

  const { isLoading: hostSessionLoading, isActive: hostSessionActive } =
    hostSession;

  const [profileAccountType, setProfileAccountType] = useState<
    "INDIVIDUAL" | "ORGANIZATION" | null
  >(null);

  const [profileData, setProfileData] = useState<Record<
    string,
    unknown
  > | null>(null);

  const dashboardAuth = useHostAuthOptional();

  const { handleAuthRequiredError, HostAuthModal } = dashboardAuth ?? {
    handleAuthRequiredError: () => false,
    HostAuthModal: null,
  };

  const {
    info,
    status,
    capabilities,
    isLoading: planLoading,
    fetchError: planFetchError,
    refresh: refreshPlan,
  } = useHostPlanCapabilities();

  const subscriptionState = {
    info,
    status,
    capabilities,
    isLoading: planLoading,
    fetchError: planFetchError,
    refresh: refreshPlan,
  };

  const { SubscriptionPromptModal } = useHostSubscriptionPrompt();

  const [billingBusy, setBillingBusy] = useState(false);

  const [showCommunityFeatures, setShowCommunityFeatures] = useState(false);

  const loading = hostSessionLoading || planLoading;

  const periodEndLabel = formatPeriodEnd(info?.subscriptionPeriodEnd);

  const creatorPayoutVerifiedDate = formatPeriodEnd(creatorPayoutVerifiedAt);

  const hasPayoutSummary = hasNonEmptyPayoutSummary(summary);

  const isCreatorVerified = Boolean(creatorPayoutVerifiedAt);

  const showVerifiedBadge = isCreatorVerified && hasPayoutSummary;

  const [showProfileCompletionCard, setShowProfileCompletionCard] =
    useState(false);
  const [showVerificationStatusCard, setShowVerificationStatusCard] =
    useState(false);

  /**
   * Load the host profile used by the
   * profile completeness indicator.
   */
  useEffect(() => {
    if (!hostSessionActive) {
      return;
    }

    let cancelled = false;

    void getHostProfileAction().then(response => {
      if (cancelled || !response.success || !response.data) {
        return;
      }

      const profile = response.data as {
        profileAccountType?: "INDIVIDUAL" | "ORGANIZATION" | null;

        individualProfile?: Record<string, unknown> | null;

        organisationProfile?: Record<string, unknown> | null;
      };

      const accountType = profile.profileAccountType ?? null;

      const selectedProfile =
        accountType === "ORGANIZATION"
          ? profile.organisationProfile
          : accountType === "INDIVIDUAL"
            ? profile.individualProfile
            : null;

      setProfileAccountType(accountType);

      setProfileData(selectedProfile ?? null);
    });

    return () => {
      cancelled = true;
    };
  }, [hostSessionActive]);

  const profileCompleteness = getProfileCompleteness(
    profileAccountType,
    profileData
  );

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  type HostProfileTab =
    | "account_info"
    | "payout"
    | "subscriptions"
    | "account_settings"
    | "individual_profile"
    | "organisation_profile";

  const isHostProfileTab = (value: string | null): value is HostProfileTab =>
    value === "account_info" ||
    value === "payout" ||
    value === "subscriptions" ||
    value === "account_settings" ||
    value === "individual_profile" ||
    value === "organisation_profile";

  const requestedTab = searchParams.get("tab");

  const [tabType, setTabType] = useState<HostProfileTab>(() =>
    isHostProfileTab(requestedTab) ? requestedTab : "payout"
  );

  useEffect(() => {
    if (isHostProfileTab(requestedTab)) {
      setTabType(requestedTab);
    } else {
      setTabType("payout");
    }
  }, [requestedTab]);

  const isMobile = useMediaQuery({
    query: "(max-width: 640px)",
  });

  const openBillingPortal = () => {
    setBillingBusy(true);

    void (async () => {
      try {
        const res = await hostSubscriptionBillingPortalAction();

        if (!res.success) {
          if (
            handleAuthRequiredError(res, () => {
              void openBillingPortal();
            })
          ) {
            return;
          }

          toast.error(res.message ?? "Billing portal unavailable.");

          return;
        }

        const url = (
          res.data as {
            url?: string;
          }
        )?.url;

        if (url) {
          window.location.href = url;
        } else {
          toast.error("Billing portal unavailable.");
        }
      } catch {
        toast.error("Network error.");
      } finally {
        setBillingBusy(false);
      }
    })();
  };

  const user = useSelector((state: RootState) => state.auth.user);

  const params = useParams();

  if (!user) {
    return null;
  }

  const eventSlug =
    typeof params?.slug === "string"
      ? params.slug
      : (hostSession.eventSlug ?? ("eventSlug" in user ? user.eventSlug : ""));

  return (
    <section className="flex w-full min-w-0 flex-col gap-4 overflow-x-hidden">
      {HostAuthModal}

      {SubscriptionPromptModal}

      {/* Current plan summary */}
      <div className="bg-card space-y-4 rounded-xl border p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Crown className="text-primary size-4" />

              <span className="text-muted-foreground text-sm">
                Your current plan:
              </span>

              {loading ? (
                <Loader2 className="text-muted-foreground size-4 animate-spin" />
              ) : (
                <Badge className="bg-primary/10 border-primary text-primary border font-normal">
                  {planLabel(info?.tier, status)}
                </Badge>
              )}
            </div>

            {!loading && periodEndLabel && status === "active" ? (
              <p className="text-muted-foreground text-xs sm:text-sm">
                Renews on {periodEndLabel}
              </p>
            ) : null}

            {!loading && status === "lapsed" ? (
              <p className="text-xs text-amber-800 sm:text-sm">
                Your paid plan has expired. Renew to restore Growth and
                Community features.
              </p>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs sm:text-sm">
                Profile completeness:{" "}
                {profileCompleteness === 100 ? (
                  <Badge className="gap-1 border border-black bg-white text-[10px] text-black">
                    {profileCompleteness ?? 0}% Complete
                  </Badge>
                ) : (
                  "incomplete"
                )}
              </p>

              {showProfileCompletionCard ? (
                <ChevronUp
                  className="size-4"
                  onClick={() => {
                    setShowProfileCompletionCard(prev => !prev);
                    setShowVerificationStatusCard(false);
                  }}
                />
              ) : (
                <ChevronDown
                  className="size-4"
                  onClick={() => {
                    setShowProfileCompletionCard(prev => !prev);
                    setShowVerificationStatusCard(false);
                  }}
                />
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 text-xs sm:text-sm">
                {showVerifiedBadge ? (
                  <span
                    className="bg-moonstone-blue/10 border-moonstone-blue inline-flex items-center gap-1 rounded-md border px-2 py-0.5"
                    title="Verified creator"
                  >
                    <CircleStar className="size-3.5 text-black" />

                    <span className="text-[10px] font-medium text-black sm:text-xs">
                      Verified
                    </span>
                  </span>
                ) : (
                  <span
                    className="inline-flex items-center gap-1 rounded-md bg-gray-200 px-2 py-0.5"
                    title="Verified creator"
                  >
                    <CircleStar className="size-3.5 text-black" />

                    <span className="text-[10px] font-medium text-black sm:text-xs">
                      Not Verified
                    </span>
                  </span>
                )}
                <span className="text-[10px] sm:text-xs">
                  {creatorPayoutVerifiedDate
                    ? ` since ${creatorPayoutVerifiedDate}`
                    : null}
                </span>
              </div>

              {showVerificationStatusCard ? (
                <ChevronUp
                  className="size-4"
                  onClick={() => {
                    setShowVerificationStatusCard(prev => !prev);
                    setShowProfileCompletionCard(false);
                  }}
                />
              ) : (
                <ChevronDown
                  className="size-4"
                  onClick={() => {
                    setShowVerificationStatusCard(prev => !prev);
                    setShowProfileCompletionCard(false);
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Profile completeness */}
      {showProfileCompletionCard && (
        <div className="bg-card rounded-xl border p-4 shadow-sm">
          <div className="flex items-center gap-4">
            {/* Circular completeness indicator */}
            <div className="relative flex size-16 shrink-0 items-center justify-center">
              <svg
                className="size-full -rotate-90"
                viewBox="0 0 100 100"
                aria-hidden="true"
              >
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="7"
                  className="text-muted/30"
                />

                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="7"
                  strokeLinecap="round"
                  className="text-primary transition-all duration-700 ease-out"
                  strokeDasharray={2 * Math.PI * 42}
                  strokeDashoffset={
                    2 * Math.PI * 42 * (1 - (profileCompleteness ?? 0) / 100)
                  }
                />
              </svg>

              <span className="absolute text-xs font-semibold">
                {`${profileCompleteness ?? 0}%`}
              </span>
            </div>

            {/* Profile information */}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold">Profile completion</p>

                {profileCompleteness === 100 ? (
                  <Badge className="gap-1 bg-black text-[10px] text-white">
                    Complete
                  </Badge>
                ) : null}

                {profileCompleteness !== 100 && (
                  <Link
                    href={
                      eventSlug
                        ? `/host/${eventSlug}/profile?tab=account_settings&settingsTab=${
                            profileAccountType === "ORGANIZATION"
                              ? "organisation_profile"
                              : "individual_profile"
                          }`
                        : "/host"
                    }
                    className="flex items-center gap-1"
                  >
                    <span className="text-primary text-[10px] underline underline-offset-2 sm:text-sm">
                      Complete here
                    </span>
                    <ArrowRight className="text-primary size-4" />
                  </Link>
                )}
              </div>

              <p className="text-muted-foreground mt-1 text-xs leading-5">
                {profileCompleteness === 100
                  ? `Your ${
                      profileAccountType === "ORGANIZATION"
                        ? "Organisation"
                        : "Individual"
                    } profile is fully complete and ready for payout processing.`
                  : `Your ${profileAccountType === "ORGANIZATION" ? "Organisation" : "Individual"} profile is incomplete and not ready for payout processing.`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* CREATOR VERIFICATION */}
      {!loading && showVerificationStatusCard ? (
        isCreatorVerified ? (
          <div className="overflow-hidden rounded-xl border border-[#AFC7D8] bg-gradient-to-br from-[#F4FAFD] via-white to-[#EAF5FA]">
            <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-[#AFC7D8] bg-white shadow-sm">
                  <CircleStar className="size-5 text-[#111111]" />
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">Verified creator</h3>

                    {showVerifiedBadge ? (
                      <span
                        className="bg-moonstone-blue inline-flex items-center gap-1 rounded-md px-2 py-0.5"
                        title="Verified creator"
                      >
                        <CircleStar className="size-3.5 text-black" />

                        <span className="text-[10px] font-medium text-black sm:text-xs">
                          Verified
                        </span>
                      </span>
                    ) : null}
                  </div>

                  <p className="text-muted-foreground mt-1 text-sm">
                    Your creator profile is verified.
                  </p>

                  {creatorPayoutVerifiedDate ? (
                    <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-muted-foreground text-xs">
                        Creator payout verified since:
                      </span>

                      <span className="text-sm font-medium">
                        {creatorPayoutVerifiedDate}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-[#D8DEE3] bg-gradient-to-br from-[#F8FAFB] via-white to-[#F1F4F6]">
            <div className="flex flex-col gap-4 p-4 sm:p-5">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-[#D8DEE3] bg-white shadow-sm">
                  <CircleStar className="size-5 text-[#66717A]" />
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">
                      Creator profile not yet verified
                    </h3>

                    <span className="inline-flex items-center rounded-md border border-[#D8DEE3] bg-white px-2 py-0.5 text-[10px] font-medium text-[#66717A] sm:text-xs">
                      Not verified
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-[#D8DEE3]/80 bg-white/70 px-3 py-2.5">
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Once you receive your first fulfilled payout, your creator
                  payout history can be verified and the verified creator badge
                  will appear here.
                </p>
              </div>
            </div>
          </div>
        )
      ) : null}

      <HostBanner />

      <Tabs
        value={tabType}
        onValueChange={val => {
          if (!isHostProfileTab(val)) {
            return;
          }

          setTabType(val);

          const params = new URLSearchParams(searchParams.toString());

          params.set("tab", val);

          router.replace(`${pathname}?${params.toString()}`, {
            scroll: false,
          });
        }}
        className="flex flex-col gap-4"
      >
        <TabsList className="scrollbar-hide flex h-14! w-full max-w-full touch-pan-x justify-start gap-1 overflow-x-auto overflow-y-hidden overscroll-x-contain sm:justify-center">
          <TabsTrigger
            value="payout"
            className="data-[state=active]:border-b-primary h-13! shrink-0 rounded-none bg-white px-4 font-semibold data-[state=active]:border-b-2"
          >
            {isMobile ? <Wallet /> : "Payouts"}
          </TabsTrigger>

          <TabsTrigger
            value="account_info"
            className="data-[state=active]:border-b-primary h-13! shrink-0 rounded-none bg-white px-4 font-semibold data-[state=active]:border-b-2"
          >
            {isMobile ? <UserRound /> : "Account info"}
          </TabsTrigger>

          <TabsTrigger
            value="subscriptions"
            className="data-[state=active]:border-b-primary h-13! shrink-0 rounded-none bg-white px-4 font-semibold data-[state=active]:border-b-2"
          >
            {isMobile ? <Crown /> : "Subscriptions"}
          </TabsTrigger>

          <TabsTrigger
            value="account_settings"
            className="data-[state=active]:border-b-primary h-13! shrink-0 rounded-none bg-white px-4 font-semibold data-[state=active]:border-b-2"
          >
            {isMobile ? <Settings /> : "Account settings"}
          </TabsTrigger>
        </TabsList>

        {/* ACCOUNT INFO */}
        <TabsContent value="account_info">
          <HostStats
            events={events}
            stats={stats}
            payoutSummary={summary}
          />
        </TabsContent>

        {/* PAYOUT */}
        <TabsContent value="payout">
          <div className="bg-card min-w-0 space-y-6 overflow-hidden rounded-xl border p-4 shadow-sm sm:p-6">
            <h2 className="text-2xl font-semibold">Payout summary</h2>

            <div className="space-y-6">
              <PayoutSummaryCard
                label="Pending Payouts"
                value={(summary?.pendingMinor ?? 0) / 100}
                bgColor="#FFF3E7"
                txtColor="#CB6305"
                isMoney
                subLabel={`Event tips: ${formatGbpMinor(
                  summary?.pendingByBranch.eventTipsMinor ?? 0
                )} · Community: ${formatGbpMinor(
                  summary?.pendingByBranch.communitySubscriptionMinor ?? 0
                )}`}
              />

              <PayoutSummaryCard
                label="Total Received"
                value={(summary?.receivedMinor ?? 0) / 100}
                bgColor="#E5FFE3"
                txtColor="#04802E"
                isMoney
                subLabel={`Event tips: ${formatGbpMinor(
                  summary?.receivedByBranch.eventTipsMinor ?? 0
                )} · Community: ${formatGbpMinor(
                  summary?.receivedByBranch.communitySubscriptionMinor ?? 0
                )}`}
              />

              <HostConnectPayoutPanel
                connectPayouts={connectPayouts}
                slug={eventSlug as string}
                onRefresh={refresh}
              />

              <HostPayoutRequestStatusPanel
                requestPayout={requestPayout}
                slug={eventSlug as string}
                settingsProfileTab={
                  requestPayout?.profileAccountType === "ORGANIZATION"
                    ? "organisation_profile"
                    : "individual_profile"
                }
                compact
              />

              <div className="flex flex-col gap-4">
                <Link href={`/host/${eventSlug}/revenue`}>
                  <Button
                    size="lg"
                    className="w-full"
                  >
                    Revenue & payouts →
                  </Button>
                </Link>

                <Link href={`/host/${eventSlug}/reports`}>
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full"
                  >
                    Reports & insights →
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* SUBSCRIPTIONS */}
        <TabsContent
          value="subscriptions"
          forceMount
        >
          <div className="bg-card space-y-5 rounded-xl border p-4 shadow-sm sm:p-6">
            {/* Current subscription */}
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Crown className="text-primary size-5" />

                  {loading ? (
                    <Loader2 className="text-muted-foreground size-4 animate-spin" />
                  ) : (
                    <>
                      <span className="text-muted-foreground text-sm">
                        Current plan:
                      </span>

                      <Badge
                        variant={status === "active" ? "default" : "secondary"}
                      >
                        {planLabel(info?.tier, status)}
                      </Badge>
                    </>
                  )}
                </div>

                {!loading && periodEndLabel && status === "active" ? (
                  <p className="text-muted-foreground text-sm">
                    Renews on {periodEndLabel}
                  </p>
                ) : null}

                {!loading && status === "lapsed" ? (
                  <p className="text-sm text-amber-800">
                    Your paid plan has expired. Renew to restore Growth and
                    Community features.
                  </p>
                ) : null}
              </div>

              {/* Existing quick actions */}
              {!loading ? (
                <div className="flex flex-wrap gap-2">
                  {status !== "active" || info?.tier === "NONE" ? (
                    <HostSubscriptionUpgradeTrigger
                      focusTier={
                        info?.tier === "HOST_COMMUNITY"
                          ? "community"
                          : "premium"
                      }
                      renewLabel={
                        status === "lapsed" ? "Renew plan" : undefined
                      }
                      label={status === "lapsed" ? "Renew plan" : "Subscribe"}
                    />
                  ) : info?.tier === "HOST_PREMIUM" ? (
                    <HostSubscriptionUpgradeTrigger
                      focusTier="community"
                      label="Upgrade to Community"
                      variant="outline"
                    />
                  ) : null}

                  {capabilities.manageBilling && info?.hasStripeSubscription ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={billingBusy}
                      onClick={() => void openBillingPortal()}
                    >
                      {billingBusy ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        "Manage billing"
                      )}
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>

            {/* FREE HOST */}
            {!loading && status === "none" ? (
              <div className="space-y-4">
                <div className="border-muted bg-muted/30 rounded-lg border p-4">
                  <h3 className="font-semibold">Choose a host plan</h3>

                  <p className="text-muted-foreground mt-1 text-sm">
                    Unlock more tools for growing your events, audience, and
                    community.
                  </p>
                </div>

                <HostSubscriptionPricingPanel
                  focusTier={undefined}
                  embeddedInHostProfile
                  subscription={subscriptionState}
                />
              </div>
            ) : null}

            {/* GROWTH HOST */}
            {!loading &&
            status === "active" &&
            info?.tier === "HOST_PREMIUM" ? (
              <div className="space-y-4">
                <div className="border-primary/20 bg-primary/5 rounded-lg border p-4">
                  <h3 className="font-semibold">Upgrade to Host Community</h3>

                  <p className="text-muted-foreground mt-1 text-sm">
                    You currently have Host Growth. Explore the additional
                    Community features available to you.
                  </p>
                </div>

                <HostSubscriptionPricingPanel
                  focusTier="community"
                  embeddedInHostProfile
                  subscription={subscriptionState}
                />
              </div>
            ) : null}

            {/* COMMUNITY HOST */}
            {!loading &&
            status === "active" &&
            info?.tier === "HOST_COMMUNITY" ? (
              <div className="border-primary/20 bg-primary/5 rounded-lg border p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Crown className="text-primary size-5" />

                      <h3 className="font-semibold">
                        You’re on Host Community
                      </h3>

                      <Badge variant="default">Active</Badge>
                    </div>

                    <p className="text-muted-foreground mt-1 text-sm">
                      Your Host Community subscription includes all Premium
                      features plus the additional Community features below.
                    </p>

                    <button
                      type="button"
                      onClick={() => setShowCommunityFeatures(prev => !prev)}
                    >
                      {showCommunityFeatures ? (
                        <ChevronUp className="size-4" />
                      ) : (
                        <ChevronDown className="size-4" />
                      )}
                    </button>
                  </div>

                  {capabilities.manageBilling && info?.hasStripeSubscription ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={billingBusy}
                      onClick={() => void openBillingPortal()}
                    >
                      {billingBusy ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        "Manage billing"
                      )}
                    </Button>
                  ) : null}
                </div>

                {showCommunityFeatures ? (
                  <div className="mt-5">
                    <h4 className="font-semibold">Community features</h4>

                    <p className="text-muted-foreground mt-1 text-sm">
                      Everything included with your Host Community plan.
                    </p>

                    <ul className="mt-4 w-full space-y-3">
                      <li className="flex items-center gap-2 text-sm">
                        <Check className="text-primary size-4 shrink-0" />
                        Community TV system
                      </li>

                      <li className="flex items-center gap-2 text-sm">
                        <Check className="text-primary size-4 shrink-0" />
                        Community memberships
                      </li>

                      <li className="flex items-center gap-2 text-sm">
                        <Check className="text-primary size-4 shrink-0" />
                        Whitelabel community mode
                      </li>

                      <li className="flex items-center gap-2 text-sm">
                        <Check className="text-primary size-4 shrink-0" />
                        TV program scheduling
                      </li>

                      <li className="flex items-center gap-2 text-sm">
                        <Check className="text-primary size-4 shrink-0" />
                        Community branding
                      </li>

                      <li className="flex items-center gap-2 text-sm">
                        <Check className="text-primary size-4 shrink-0" />
                        Broadcast messaging
                      </li>

                      <li className="flex items-center gap-2 text-sm">
                        <Check className="text-primary size-4 shrink-0" />
                        Community analytics
                      </li>

                      <li className="flex items-center gap-2 text-sm">
                        <Check className="text-primary size-4 shrink-0" />
                        Co-creator management
                      </li>

                      <li className="flex items-center gap-2 text-sm">
                        <Check className="text-primary size-4 shrink-0" />
                        Everything in Premium
                      </li>
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* LAPSED HOST */}
            {!loading && status === "lapsed" ? (
              <div className="space-y-4">
                <HostSubscriptionPricingPanel
                  focusTier={
                    info?.tier === "HOST_COMMUNITY" ? "community" : "premium"
                  }
                  renewLabel="Renew plan"
                  embeddedInHostProfile
                  subscription={subscriptionState}
                />
              </div>
            ) : null}
          </div>
        </TabsContent>

        {/* ACCOUNT SETTINGS */}
        <TabsContent value="account_settings">
          <SettingsClient />
        </TabsContent>
      </Tabs>
    </section>
  );
};
