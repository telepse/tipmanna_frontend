/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { EmbeddedSupportChat } from "@/components/support/embedded-support-chat";
import { HostYoutubeChannelsSettings } from "@/components/dashboard/host-youtube-channels-settings";
import { HostProfileAddressFields } from "@/components/dashboard/host-profile-address-fields";
import { isUkCountry } from "@/lib/is-uk-country";
import { useHostPayoutSummary } from "@/hooks/useHostPayoutSummary";
import { formatGbpMinor } from "@/lib/host-plan-capabilities";

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

// Third-party imports
import {
  ArrowUpRight,
  Crown,
  Eye,
  Headset,
  Loader2,
  LogOut,
  MoveLeft,
  User,
  Wallet,
  Building2,
  Settings2,
  Globe,
  GlobeCheck,
  ArrowRight,
  CircleCheck,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useDispatch, useSelector } from "react-redux";
import { RootState, type AppDispatch } from "@/redux/store";
import { toast } from "react-toastify";
import OTPInput from "react-otp-input";
import { useMediaQuery } from "react-responsive";

// Local imports
import {
  changeEmailAction,
  getHostProfileAction,
  updateHostAction,
  updateHostProfileAction,
  verifyCodeAction,
} from "@/actions/auth";
import { setCredentials } from "@/features/auth-slice";
import { performAuthLogout } from "@/lib/auth-logout";
import { ApiError } from "@/types";
import {
  paymentFormData,
  paymentFormSchema,
  profileFormData,
  profileFormSchema,
  individualProfileFormData,
  organisationProfileFormData,
  individualProfileFormSchema,
  organisationProfileFormSchema,
} from "@/schemas";
import { useHostSession } from "@/hooks/use-host-session";
import { useAppRouter } from "@/components/navigation/navigation-progress-provider";
import { useHostPlanCapabilities } from "@/hooks/useHostPlanCapabilities";
import { Badge } from "@/components/ui/badge";

function branchLabel(branch: string) {
  if (branch === "event_tip") return "Event tips";
  if (branch === "community_subscription") return "Community subscription";
  if (branch === "host_subscription") return "Host subscription";
  return branch;
}

type HostUser = {
  id: string;
  fullName: string;
  email: string;
  username: string;
  role: "HOST";
  eventCode?: string;
  eventSlug?: string;
  numOfEvents?: number;
  individualLegalFirstName?: string;
  individualLegalLastName?: string;
  organizationName?: string;
};

type SettingsTab =
  | "account_settings"
  | "payment_payouts"
  | "help_section"
  | "individual_profile"
  | "organisation_profile";

type SubscriptionPageBlockProps = {
  status: string;
  tier?: string | null;
  isLoading: boolean;
  onOpenSubscriptions: () => void;
};

function SubscriptionPageBlock({
  status,
  tier,
  isLoading,
  onOpenSubscriptions,
}: SubscriptionPageBlockProps) {
  if (isLoading) return null;

  const isCommunity = status === "active" && tier === "HOST_COMMUNITY";

  const isGrowth = status === "active" && tier === "HOST_PREMIUM";

  const isFree = status === "none";

  const isLapsed = status === "lapsed";

  if (!isFree && !isGrowth && !isCommunity && !isLapsed) {
    return null;
  }

  const title = isCommunity
    ? "You are on Host Community"
    : isGrowth
      ? "Ready to launch your community?"
      : isLapsed
        ? "Bring your host plan back"
        : "Ready for creator growth?";

  const description = isCommunity
    ? "You’re on Host Community. Manage your plan and explore everything included with your subscription."
    : isGrowth
      ? "Unlock Community tools and TV. Take your growth experience further."
      : isLapsed
        ? "Your previous host subscription has ended. Review the available plans and renew when you’re ready."
        : "Unlock growth tools. Transform your events and contents to a wider audience.";

  const buttonLabel = isCommunity
    ? "View subscription"
    : isGrowth
      ? "Launch Community TV"
      : isLapsed
        ? "Renew plan"
        : "Upgrade to Growth";

  const badgeLabel = isCommunity
    ? "Host Community"
    : isGrowth
      ? "Host Growth"
      : isLapsed
        ? "Plan expired"
        : "Free";

  /*
   * One shared visual treatment for every subscription state.
   *
   * Keeping the same gradient across all plans makes the settings page feel
   * consistent while the badge, copy and CTA communicate the current plan.
   */
  const sharedGradient =
    "linear-gradient(135deg, rgba(245,125,17,0.10) 0%, rgba(247,200,124,0.16) 48%, rgba(122,173,204,0.10) 100%)";

  const sharedGlow =
    "radial-gradient(circle, rgba(245,125,17,0.16) 0%, rgba(245,125,17,0) 70%)";

  const sharedSecondaryGlow =
    "radial-gradient(circle, rgba(122,173,204,0.14) 0%, rgba(122,173,204,0) 70%)";

  return (
    <section
      className="border-primary/15 relative isolate overflow-hidden rounded-2xl border p-5 shadow-sm sm:p-6"
      style={{
        background: sharedGradient,
      }}
    >
      {/* Decorative gradient glows */}
      <div
        className="pointer-events-none absolute -top-24 -right-20 size-56 rounded-full blur-3xl"
        style={{
          background: sharedGlow,
        }}
      />

      <div
        className="pointer-events-none absolute -bottom-28 left-1/3 size-52 rounded-full blur-3xl"
        style={{
          background: sharedSecondaryGlow,
        }}
      />

      {/* Subtle top accent */}
      <div className="from-primary/0 via-primary/50 to-primary/0 absolute inset-x-0 top-0 h-px bg-gradient-to-r" />

      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="border-primary/15 bg-background/75 text-primary flex size-11 shrink-0 items-center justify-center rounded-xl border shadow-sm backdrop-blur-sm">
            {isCommunity ? (
              <GlobeCheck className="size-5" />
            ) : (
              <Crown className="size-5" />
            )}
          </div>

          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {" "}
              <span className="text-xs font-medium sm:text-sm">
                Your current plan is
              </span>
              <span className="border-primary/15 bg-primary/10 text-primary rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase">
                {badgeLabel}
              </span>
            </div>

            <h3 className="text-base font-semibold sm:text-lg">{title}</h3>

            <p className="text-muted-foreground mt-1 max-w-2xl text-sm leading-6">
              {description}
            </p>
          </div>
        </div>

        <Button
          type="button"
          size="lg"
          className="bg-primary hover:bg-primary/90 w-full shrink-0 border-0 text-white shadow-sm transition-all sm:w-auto"
          onClick={onOpenSubscriptions}
        >
          {buttonLabel}
          <ArrowUpRight className="ml-1 size-4" />
        </Button>
      </div>
    </section>
  );
}

export const SettingsClient = () => {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialProfileTab =
    searchParams.get("settingsTab") === "organisation_profile"
      ? "organisation_profile"
      : searchParams.get("settingsTab") === "individual_profile"
        ? "individual_profile"
        : searchParams.get("settingsTab") === "payment_payouts"
          ? "payment_payouts"
          : searchParams.get("settingsTab") === "help_section"
            ? "help_section"
            : "account_settings";

  const {
    host,
    communities,
    creatorPayoutVerifiedAt,
    isLoading: payoutsLoading,
  } = useHostPayoutSummary();

  const isCreatorProfileVerified = Boolean(creatorPayoutVerifiedAt);

  const allObligations = [...host, ...communities];

  const settlementHistory = allObligations.flatMap(obligation =>
    (obligation.settlements ?? []).map(settlement => ({
      ...settlement,
      branch: obligation.branch,
    }))
  );

  const [tabType, setTabType] = useState<SettingsTab>(initialProfileTab);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [isEditable] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [profileAccountType, setProfileAccountType] = useState<
    "INDIVIDUAL" | "ORGANIZATION" | null
  >(null);
  const [connectLegalNameLocked, setConnectLegalNameLocked] = useState(false);

  const user = useSelector((state: RootState) => state.auth.user);
  const token = useSelector((state: RootState) => state.auth.token);
  const userId = user ? user.id : "";

  const { eventSlug, isActive: hostSessionActive } = useHostSession();

  const dispatch = useDispatch<AppDispatch>();
  const { push, replace } = useAppRouter();

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

  const loading = planLoading;

  const openSubscriptions = () => {
    if (!eventSlug) {
      toast.error("Host event session not available");
      return;
    }

    router.push(`/host/${eventSlug}/profile?tab=subscriptions`);
  };

  const handleLogout = async () => {
    await performAuthLogout(dispatch);
    toast.success("Account logged out");
    push("/sign-in");
  };

  const [openEmailModal, setOpenEmailModal] = useState(false);
  const [step, setStep] = useState<"signIn" | "verifyCode">("signIn");
  const [emailCode, setEmailCode] = useState("");

  const emailForm = useForm<{ email: string }>({
    defaultValues: { email: "" },
  });

  const togglePasswordVisibility = () => {
    setShowPassword(prev => !prev);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(prev => !prev);
  };

  const profileForm = useForm<profileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      fullName: user?.fullName ?? "",
      email: user?.email ?? "",
      password: "",
      confirmPassword: "",
    },
  });

  const paymentForm = useForm<paymentFormData>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      bankName: "",
      accountName: "",
      routingNumber: "",
      accountHolderName: "",
      taxId: "",
      businessType: "",
      payoutFrequency: "",
    },
  });

  const individualProfileForm = useForm<individualProfileFormData>({
    resolver: zodResolver(individualProfileFormSchema),
    defaultValues: {
      firstName: (user as HostUser)?.individualLegalFirstName ?? "",
      lastName: (user as HostUser)?.individualLegalLastName ?? "",
      homeAddress: "",
      city: "",
      state: "",
      postalCode: "",
      country: "United Kingdom",
      niNumber: "",
      passportNumber: "",
      additionalTaxIdentification: "",
      dateOfBirth: "",
      gender: "",
      accountName: "",
      accountNumber: "",
      sortCode: "",
    },
  });

  const organisationProfileForm = useForm<organisationProfileFormData>({
    resolver: zodResolver(organisationProfileFormSchema),
    defaultValues: {
      registeredCompanyName: "",
      companyRegistrationNumber: "",
      registeredAddress: "",
      city: "",
      state: "",
      postalCode: "",
      country: "United Kingdom",
      dateOfBirth: "",
      uniqueTaxpayerReference: "",
      additionalTaxIdentification: "",
      vatRegistrationNumber: "",
      invoice: "",
      accountName: "",
      accountNumber: "",
      sortCode: "",
    },
  });

  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    onChange: (url: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "tipmanna");

    try {
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/tipmanna/image/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await res.json();

      if (data.secure_url) {
        onChange(data.secure_url);
      }
    } catch (error) {
      console.error("Cloudinary upload error", error);
      toast.error("Failed to upload file");
    } finally {
      setIsUploading(false);
    }
  };

  /**
   * Both profile tabs are always accessible.
   *
   * - Individual accounts can still view/edit the Organisation profile tab.
   *   A notice explains that the account is currently operating as an individual.
   *
   * - Organisation accounts can still view/edit the Individual profile tab.
   *   A notice explains that the account is currently operating as an organisation.
   *
   * The profileAccountType determines which profile is used for the account's
   * active payout/tax configuration; it does not prevent access to either
   * profile section.
   */
  const showIndividualProfileTab = true;
  const showOrganisationProfileTab = true;

  const isSettingsTab = (value: string | null): value is SettingsTab =>
    value === "account_settings" ||
    value === "payment_payouts" ||
    value === "help_section" ||
    value === "individual_profile" ||
    value === "organisation_profile";

  const pathname = usePathname();

  const handleTabChange = (value: string) => {
    if (!isSettingsTab(value)) {
      return;
    }

    if (value === "individual_profile" && !showIndividualProfileTab) {
      return;
    }

    if (value === "organisation_profile" && !showOrganisationProfileTab) {
      return;
    }

    setTabType(value);

    const params = new URLSearchParams(searchParams.toString());

    // SettingsClient is nested inside the HostProfileClient's
    // account_settings tab, so keep the parent tab intact.
    params.set("tab", "account_settings");

    if (value === "account_settings") {
      params.delete("settingsTab");
    } else {
      params.set("settingsTab", value);
    }

    const queryString = params.toString();

    router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
      scroll: false,
    });
  };

  useEffect(() => {
    const requestedTab = searchParams.get("settingsTab");

    if (!requestedTab) {
      setTabType("account_settings");
      return;
    }

    if (!isSettingsTab(requestedTab)) {
      setTabType("account_settings");
      return;
    }

    if (requestedTab === "individual_profile" && !showIndividualProfileTab) {
      setTabType("account_settings");

      const params = new URLSearchParams(searchParams.toString());
      params.delete("settingsTab");
      params.set("tab", "account_settings");

      const queryString = params.toString();

      router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
        scroll: false,
      });

      return;
    }

    if (
      requestedTab === "organisation_profile" &&
      !showOrganisationProfileTab
    ) {
      setTabType("account_settings");

      const params = new URLSearchParams(searchParams.toString());
      params.delete("settingsTab");
      params.set("tab", "account_settings");

      const queryString = params.toString();

      router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
        scroll: false,
      });

      return;
    }

    setTabType(requestedTab);
  }, [
    searchParams,
    pathname,
    router,
    showIndividualProfileTab,
    showOrganisationProfileTab,
  ]);

  const individualCountry = individualProfileForm.watch("country");
  const individualIsUk = isUkCountry(individualCountry);

  const organisationCountry = organisationProfileForm.watch("country");
  const organisationIsUk = isUkCountry(organisationCountry);

  const individualFirstName = individualProfileForm.watch("firstName");
  const individualLastName = individualProfileForm.watch("lastName");

  const registeredCompanyName = organisationProfileForm.watch(
    "registeredCompanyName"
  );

  const individualAccountName = individualProfileForm.watch("accountName");
  const individualAccountNumber = individualProfileForm.watch("accountNumber");
  const individualSortCode = individualProfileForm.watch("sortCode");

  const organisationAccountName = organisationProfileForm.watch("accountName");
  const organisationAccountNumber =
    organisationProfileForm.watch("accountNumber");
  const organisationSortCode = organisationProfileForm.watch("sortCode");

  const payoutAccountName =
    profileAccountType === "ORGANIZATION"
      ? organisationAccountName
      : individualAccountName;

  const payoutRoutingNumber =
    profileAccountType === "ORGANIZATION"
      ? organisationSortCode
      : individualSortCode;

  const payoutAccountHolderName =
    profileAccountType === "ORGANIZATION"
      ? registeredCompanyName
      : [individualFirstName, individualLastName]
          .filter(Boolean)
          .join(" ")
          .trim();

  const payoutAccountNumber =
    profileAccountType === "ORGANIZATION"
      ? organisationAccountNumber
      : individualAccountNumber;

  useEffect(() => {
    const accountName = [individualFirstName, individualLastName]
      .filter(Boolean)
      .join(" ")
      .trim();

    if (accountName) {
      individualProfileForm.setValue("accountName", accountName);
    }
  }, [individualFirstName, individualLastName, individualProfileForm]);

  useEffect(() => {
    if (registeredCompanyName) {
      organisationProfileForm.setValue("accountName", registeredCompanyName);
    }
  }, [registeredCompanyName, organisationProfileForm]);

  const [profileData, setProfileData] = useState<Record<
    string,
    unknown
  > | null>(null);

  const profileCompleteness = getProfileCompleteness(
    profileAccountType ?? null,
    profileData ?? null
  );

  useEffect(() => {
    if (!hostSessionActive) return;

    void getHostProfileAction().then(response => {
      if (!response.success || !response.data) return;

      const profile = response.data as {
        profileAccountType?: "INDIVIDUAL" | "ORGANIZATION" | null;
        individualProfile?: Partial<individualProfileFormData> | null;
        organisationProfile?: Partial<organisationProfileFormData> | null;
        connectLegalNameLocked?: boolean;
      };

      const accountType = profile.profileAccountType ?? null;

      setProfileAccountType(accountType);
      setConnectLegalNameLocked(Boolean(profile.connectLegalNameLocked));

      if (profile.individualProfile) {
        individualProfileForm.reset({
          ...individualProfileForm.getValues(),
          ...profile.individualProfile,
        });
      }

      if (profile.organisationProfile) {
        organisationProfileForm.reset({
          ...organisationProfileForm.getValues(),
          ...profile.organisationProfile,
        });
      }

      const selectedProfile =
        accountType === "ORGANIZATION"
          ? profile.organisationProfile
          : accountType === "INDIVIDUAL"
            ? profile.individualProfile
            : null;

      setProfileData(selectedProfile ?? null);
    });
  }, [hostSessionActive]);

  const onSubmitIndividualProfile = async (
    values: individualProfileFormData
  ) => {
    if (!hostSessionActive) {
      toast.error("Host session required");
      return;
    }

    try {
      setIsProfileLoading(true);

      const response = await updateHostProfileAction({
        profileAccountType: "INDIVIDUAL",
        individualProfile: values,
      });

      if (!response.success) {
        throw new Error(response.message ?? "Failed to update profile");
      }

      toast.success("Individual profile updated");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update profile"
      );
    } finally {
      setIsProfileLoading(false);
    }
  };

  const onSubmitOrganisationProfile = async (
    values: organisationProfileFormData
  ) => {
    if (!hostSessionActive) {
      toast.error("Host session required");
      return;
    }

    try {
      setIsProfileLoading(true);

      const response = await updateHostProfileAction({
        profileAccountType: "ORGANIZATION",
        organisationProfile: values,
      });

      if (!response.success) {
        throw new Error(response.message ?? "Failed to update profile");
      }

      toast.success("Organisation profile updated");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update profile"
      );
    } finally {
      setIsProfileLoading(false);
    }
  };

  const onSubmitProfile = async (values: profileFormData) => {
    try {
      setIsLoading(true);

      if (!hostSessionActive) {
        toast.error("Host session required");
        return;
      }

      const res = await updateHostAction({
        fullName: values.fullName,
        email: values.email,
        currentPassword: values.password,
        newPassword: values.confirmPassword,
      });

      if (!res.success) {
        toast.error(res.message);
        return;
      }

      const { id, fullName, email } = res.data as {
        id: string;
        fullName: string;
        email: string;
        username: string;
        eventSlug?: string | null;
      };

      if (user && token) {
        dispatch(
          setCredentials({
            user: {
              ...user,
              id,
              fullName,
              email,
            },
            token,
          })
        );
      }

      if (eventSlug) {
        replace(`/host/${eventSlug}/profile`);
      }

      toast.success("Profile updated successfully");
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else if (typeof err === "object" && err !== null && "error" in err) {
        const apiErr = err as ApiError;
        toast.error(apiErr.error.message);
      } else {
        toast.error("Failed to update user");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmitPayment = async (values: paymentFormData) => {
    console.log(values);
  };

  const isMobile = useMediaQuery({
    query: "(max-width: 500px)",
  });

  const inputStyle = {
    background: "#f7c87c80",
    width: isMobile ? "36px" : "44px",
    height: isMobile ? "36px" : "50px",
    margin: isMobile ? "0 4px" : "0 8px",
    borderRadius: isMobile ? "4px" : "8px",
    outline: "none",
    fontSize: isMobile ? "16px" : "20px",
  };

  const settingsNavigation: Array<{
    value: SettingsTab;
    label: string;
    icon: typeof User;
  }> = [
    {
      value: "account_settings",
      label: "Account settings",
      icon: Settings2,
    },
    ...(showIndividualProfileTab
      ? [
          {
            value: "individual_profile" as SettingsTab,
            label: "Individual profile",
            icon: User,
          },
        ]
      : []),
    ...(showOrganisationProfileTab
      ? [
          {
            value: "organisation_profile" as SettingsTab,
            label: "Organisation profile",
            icon: Building2,
          },
        ]
      : []),
    {
      value: "payment_payouts",
      label: "Payment payouts",
      icon: Wallet,
    },
    {
      value: "help_section",
      label: "Help & support",
      icon: Headset,
    },
  ];

  return (
    <div className="w-full min-w-0">
      {/* Settings header */}
      <div className="mb-4 space-y-4 rounded-xl border bg-white p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-lg">
            <Settings2 className="text-muted-foreground size-5" />
          </div>

          <div className="min-w-0">
            <h2 className="text-lg font-semibold sm:text-xl">
              Account settings
            </h2>

            <p className="text-muted-foreground mt-1 text-sm">
              Manage your account, profile, payout details and support options.
            </p>
          </div>
        </div>
      </div>

      <Tabs
        value={tabType}
        onValueChange={handleTabChange}
        className="w-full min-w-0"
      >
        <div className="flex w-full min-w-0 flex-col gap-4 md:flex-row md:items-start md:gap-6">
          {/* Secondary settings navigation */}
          <aside className="w-full shrink-0 md:w-60">
            <div className="rounded-xl border bg-white p-2">
              <div className="px-3 pt-2 pb-2">
                <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                  Settings
                </p>
              </div>

              <TabsList className="flex h-auto w-full flex-row justify-start gap-1 overflow-x-auto bg-transparent p-0 md:flex-col md:overflow-visible">
                {settingsNavigation.map(item => {
                  const Icon = item.icon;

                  return (
                    <TabsTrigger
                      key={item.value}
                      value={item.value}
                      className="text-muted-foreground hover:bg-muted/60 hover:text-foreground data-[state=active]:border-border data-[state=active]:bg-muted data-[state=active]:text-foreground h-11 shrink-0 justify-start gap-3 rounded-lg border border-transparent bg-transparent px-3 text-sm font-medium whitespace-nowrap md:w-full"
                    >
                      <Icon className="size-4 shrink-0" />
                      <span>{item.label}</span>
                    </TabsTrigger>
                  );
                })}

                <div className="bg-border hidden h-px w-full md:block" />

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground h-11 shrink-0 justify-start gap-3 rounded-lg px-3 text-sm font-medium hover:bg-red-50 hover:text-red-600 md:w-full"
                  onClick={handleLogout}
                >
                  <LogOut className="size-4 shrink-0" />
                  <span>Logout</span>
                </Button>
              </TabsList>
            </div>
          </aside>

          {/* Settings content */}
          <main className="min-w-0 flex-1">
            {/* Account settings */}
            <TabsContent
              value="account_settings"
              className="mt-0 w-full"
            >
              <div className="space-y-5">
                {/* Profile information */}
                <section className="rounded-xl border bg-white p-4 sm:p-6">
                  <div className="mb-5 space-y-1">
                    <h3 className="text-lg font-semibold">
                      Profile information
                    </h3>

                    <p className="text-muted-foreground text-sm">
                      Update your basic profile details.
                    </p>
                  </div>

                  <Form {...profileForm}>
                    <form
                      onSubmit={profileForm.handleSubmit(onSubmitProfile)}
                      className="space-y-5"
                    >
                      <FormField
                        control={profileForm.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full name</FormLabel>

                            <FormControl>
                              <Input
                                placeholder="Enter full name"
                                autoComplete="off"
                                {...field}
                              />
                            </FormControl>

                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={profileForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Email{" "}
                              <button
                                type="button"
                                className="text-primary ml-1 cursor-pointer font-medium"
                                onClick={() => {
                                  setOpenEmailModal(true);
                                  setStep("signIn");
                                }}
                              >
                                Change email
                              </button>
                            </FormLabel>

                            <FormControl>
                              <Input
                                type="email"
                                placeholder="Enter email address"
                                autoComplete="off"
                                disabled={!isEditable}
                                {...field}
                              />
                            </FormControl>

                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </form>
                  </Form>
                </section>

                {/* Login & Security */}
                <section className="rounded-xl border bg-white p-4 sm:p-6">
                  <div className="mb-5 space-y-1">
                    <h3 className="text-lg font-semibold">Login & security</h3>

                    <p className="text-muted-foreground text-sm">
                      Manage your account security settings.
                    </p>
                  </div>

                  <Form {...profileForm}>
                    <form
                      onSubmit={profileForm.handleSubmit(onSubmitProfile)}
                      className="space-y-5"
                    >
                      <FormField
                        control={profileForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Current password</FormLabel>

                            <FormControl>
                              <div className="relative">
                                <Input
                                  type={showPassword ? "text" : "password"}
                                  placeholder="Enter current password"
                                  autoComplete="off"
                                  className="pr-11"
                                  {...field}
                                />

                                <button
                                  type="button"
                                  onClick={togglePasswordVisibility}
                                  className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
                                  aria-label={
                                    showPassword
                                      ? "Hide current password"
                                      : "Show current password"
                                  }
                                >
                                  <Eye className="size-4" />
                                </button>
                              </div>
                            </FormControl>

                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={profileForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>New password</FormLabel>

                            <FormControl>
                              <div className="relative">
                                <Input
                                  type={
                                    showConfirmPassword ? "text" : "password"
                                  }
                                  placeholder="Enter new password"
                                  autoComplete="off"
                                  className="pr-11"
                                  {...field}
                                />

                                <button
                                  type="button"
                                  onClick={toggleConfirmPasswordVisibility}
                                  className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
                                  aria-label={
                                    showConfirmPassword
                                      ? "Hide new password"
                                      : "Show new password"
                                  }
                                >
                                  <Eye className="size-4" />
                                </button>
                              </div>
                            </FormControl>

                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="lg"
                          className="h-9 w-full sm:w-auto"
                          onClick={() => {
                            profileForm.reset({
                              ...profileForm.getValues(),
                              password: "",
                              confirmPassword: "",
                            });
                          }}
                        >
                          Cancel
                        </Button>

                        <Button
                          type="submit"
                          size="sm"
                          className="h-9 w-full bg-black hover:bg-black/90 sm:w-auto"
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <span className="flex items-center gap-2">
                              <Loader2 className="size-4 animate-spin" />
                              Saving changes...
                            </span>
                          ) : (
                            "Save changes"
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </section>

                <HostYoutubeChannelsSettings />

                <SubscriptionPageBlock
                  status={status}
                  tier={info?.tier}
                  isLoading={loading}
                  onOpenSubscriptions={openSubscriptions}
                />
              </div>
            </TabsContent>

            {/* Individual profile */}
            {showIndividualProfileTab ? (
              <TabsContent
                value="individual_profile"
                className="mt-0 w-full"
                id="individual_profile"
              >
                <div className="space-y-5">
                  <div className="space-y-5 rounded-xl border bg-white p-4 sm:p-6">
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold">
                        Individual profile
                      </h3>

                      <div className="rounded-xl border bg-gray-200 p-4 shadow-sm">
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
                                stroke="black"
                                strokeWidth="7"
                                className="text-muted/30"
                              />

                              <circle
                                cx="50"
                                cy="50"
                                r="42"
                                fill="none"
                                stroke="black"
                                strokeWidth="7"
                                strokeLinecap="round"
                                className="text-primary transition-all duration-700 ease-out"
                                strokeDasharray={2 * Math.PI * 42}
                                strokeDashoffset={
                                  2 *
                                  Math.PI *
                                  42 *
                                  (1 - (profileCompleteness ?? 0) / 100)
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
                              <p className="text-sm font-semibold">
                                Profile{" "}
                                {profileCompleteness === 100
                                  ? "complete"
                                  : "incomplete"}
                              </p>

                              {profileCompleteness === 100 ? (
                                <Badge className="gap-1 bg-black text-[10px] text-white">
                                  Complete
                                </Badge>
                              ) : null}
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

                      <p className="text-muted-foreground text-sm">
                        Update your individual profile and payout information.
                      </p>
                    </div>

                    {/* Organisation account notice */}
                    {profileAccountType === "ORGANIZATION" ? (
                      <div className="border-primary/20 from-primary/10 via-primary/5 to-background relative overflow-hidden rounded-xl border bg-gradient-to-br p-4 sm:p-5">
                        <div className="bg-primary/10 absolute -top-10 -right-10 size-24 rounded-full blur-2xl" />

                        <div className="relative flex items-start gap-3 sm:gap-4">
                          <div className="border-primary/20 bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl border sm:size-11">
                            <Building2 className="size-5 sm:size-5" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold sm:text-base">
                                You&apos;re operating this account as an
                                organisation
                              </p>

                              <span className="border-primary/20 bg-primary/10 text-primary rounded-full border px-2.5 py-0.5 text-[11px] font-medium">
                                Organisation account
                              </span>
                            </div>

                            <p className="text-muted-foreground mt-1.5 text-sm leading-6">
                              This account is configured as an organisation
                              account.
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    <Form {...individualProfileForm}>
                      <form
                        onSubmit={individualProfileForm.handleSubmit(
                          onSubmitIndividualProfile
                        )}
                        className="space-y-6"
                      >
                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                          <FormField
                            control={individualProfileForm.control}
                            name="firstName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>First name</FormLabel>

                                <FormControl>
                                  <Input
                                    placeholder="Enter first name"
                                    autoComplete="off"
                                    disabled={connectLegalNameLocked}
                                    {...field}
                                  />
                                </FormControl>

                                <span className="text-muted-foreground text-sm">
                                  {connectLegalNameLocked
                                    ? "Locked to match your Stripe payout identity."
                                    : "For official records and HMRC reporting"}
                                </span>

                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={individualProfileForm.control}
                            name="lastName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Last name</FormLabel>

                                <FormControl>
                                  <Input
                                    placeholder="Enter last name"
                                    autoComplete="off"
                                    disabled={connectLegalNameLocked}
                                    {...field}
                                  />
                                </FormControl>

                                <span className="text-muted-foreground text-sm">
                                  {connectLegalNameLocked
                                    ? "Locked to match your Stripe payout identity."
                                    : "For official records and HMRC reporting"}
                                </span>

                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <HostProfileAddressFields
                          control={individualProfileForm.control}
                          setValue={individualProfileForm.setValue}
                          watch={individualProfileForm.watch}
                          fields={{
                            address: "homeAddress",
                            city: "city",
                            state: "state",
                            postalCode: "postalCode",
                            country: "country",
                          }}
                          addressLabel="Home address"
                        />

                        <span className="text-muted-foreground -mt-4 block text-sm">
                          For official records, correspondence, and HMRC
                          reporting.
                        </span>

                        {individualIsUk ? (
                          <FormField
                            control={individualProfileForm.control}
                            name="niNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>
                                  National Insurance (NI) number
                                </FormLabel>

                                <FormControl>
                                  <Input
                                    type="text"
                                    placeholder="Enter national insurance (NI) number"
                                    autoComplete="off"
                                    {...field}
                                  />
                                </FormControl>

                                <span className="text-muted-foreground text-sm">
                                  Essential for calculating NI contributions and
                                  reporting to HMRC.
                                </span>

                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        ) : (
                          <>
                            <FormField
                              control={individualProfileForm.control}
                              name="passportNumber"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Passport number</FormLabel>

                                  <FormControl>
                                    <Input
                                      type="text"
                                      placeholder="Enter passport number"
                                      autoComplete="off"
                                      {...field}
                                    />
                                  </FormControl>

                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={individualProfileForm.control}
                              name="additionalTaxIdentification"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>
                                    Additional tax identification detail for
                                    your country
                                  </FormLabel>

                                  <FormControl>
                                    <Input
                                      type="text"
                                      placeholder="Enter your country's tax identification"
                                      autoComplete="off"
                                      {...field}
                                    />
                                  </FormControl>

                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </>
                        )}

                        <FormField
                          control={individualProfileForm.control}
                          name="dateOfBirth"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Date of birth</FormLabel>

                              <FormControl>
                                <Input
                                  type="date"
                                  {...field}
                                />
                              </FormControl>

                              <span className="text-muted-foreground text-sm">
                                Required for payroll processing (format:
                                YYYY-MM-DD).
                              </span>

                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={individualProfileForm.control}
                          name="gender"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Gender</FormLabel>

                              <FormControl>
                                <Select
                                  onValueChange={field.onChange}
                                  defaultValue={field.value}
                                >
                                  <SelectTrigger className="h-12 !w-full">
                                    <SelectValue placeholder="Select gender" />
                                  </SelectTrigger>

                                  <SelectContent>
                                    <SelectItem value="MALE">Male</SelectItem>

                                    <SelectItem value="FEMALE">
                                      Female
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormControl>

                              <span className="text-muted-foreground text-sm">
                                Required data for payroll processing.
                              </span>

                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                          <FormField
                            control={individualProfileForm.control}
                            name="accountName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Account name</FormLabel>

                                <FormControl>
                                  <Input
                                    type="text"
                                    placeholder="Same as your legal name"
                                    autoComplete="off"
                                    readOnly
                                    {...field}
                                  />
                                </FormControl>

                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={individualProfileForm.control}
                            name="accountNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Account number</FormLabel>

                                <FormControl>
                                  <Input
                                    type="text"
                                    placeholder="Enter account number"
                                    autoComplete="off"
                                    {...field}
                                  />
                                </FormControl>

                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={individualProfileForm.control}
                            name="sortCode"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Sort code</FormLabel>

                                <FormControl>
                                  <Input
                                    type="text"
                                    placeholder="Enter sort code"
                                    autoComplete="off"
                                    {...field}
                                  />
                                </FormControl>

                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <Button
                          type="submit"
                          size="lg"
                          className="w-full sm:w-auto"
                          disabled={isProfileLoading}
                        >
                          {isProfileLoading ? (
                            <span className="flex items-center gap-2">
                              <Loader2 className="size-4 animate-spin" />
                              Submitting...
                            </span>
                          ) : (
                            "Submit"
                          )}
                        </Button>
                      </form>
                    </Form>
                  </div>

                  <SubscriptionPageBlock
                    status={status}
                    tier={info?.tier}
                    isLoading={loading}
                    onOpenSubscriptions={openSubscriptions}
                  />
                </div>
              </TabsContent>
            ) : null}

            {/* Organisation profile */}
            {showOrganisationProfileTab ? (
              <TabsContent
                value="organisation_profile"
                className="mt-0 w-full"
                id="organisation_profile"
              >
                <div className="space-y-5">
                  <div className="w-full min-w-0 space-y-5 overflow-hidden rounded-xl border bg-white p-4 sm:p-6">
                    <div className="space-y-1">
                      <h3 className="text-lg font-semibold">
                        Organisation profile
                      </h3>

                      {/* Individual account notice */}
                      {profileAccountType === "INDIVIDUAL" ? (
                        <div className="border-primary/20 from-primary/10 via-primary/5 to-background relative overflow-hidden rounded-xl border bg-gradient-to-br p-4 sm:p-5">
                          <div className="bg-primary/10 absolute -top-10 -right-10 size-24 rounded-full blur-2xl" />

                          <div className="relative flex items-start gap-3 sm:gap-4">
                            <div className="border-primary/20 bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl border sm:size-11">
                              <User className="size-5 sm:size-5" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold sm:text-base">
                                  You&apos;re operating this account as an
                                  individual
                                </p>

                                <span className="border-primary/20 bg-primary/10 text-primary rounded-full border px-2.5 py-0.5 text-[11px] font-medium">
                                  Individual account
                                </span>
                              </div>

                              <p className="text-muted-foreground mt-1.5 text-sm leading-6">
                                This account is currently configured as an
                                individual account.
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : null}

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
                                  2 *
                                  Math.PI *
                                  42 *
                                  (1 - (profileCompleteness ?? 0) / 100)
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
                              <p className="text-sm font-semibold">
                                Profile completion
                              </p>

                              {profileCompleteness === 100 ? (
                                <Badge className="gap-1 bg-black text-[10px] text-white">
                                  Complete
                                </Badge>
                              ) : null}
                            </div>

                            <p className="text-muted-foreground mt-1 text-xs leading-5">
                              {profileCompleteness === 100
                                ? `Your ${
                                    profileAccountType === "ORGANIZATION"
                                      ? "Organisation"
                                      : "Individual"
                                  } profile is fully complete. Ready for payout processing.`
                                : `Your ${profileAccountType === "ORGANIZATION" ? "Organisation" : "Individual"} profile is incomplete and not ready for payout processing.`}
                            </p>
                          </div>
                        </div>
                      </div>

                      <p className="text-muted-foreground text-sm">
                        Update your organisation details and payout information.
                      </p>
                    </div>

                    <Form {...organisationProfileForm}>
                      <form
                        onSubmit={organisationProfileForm.handleSubmit(
                          onSubmitOrganisationProfile
                        )}
                        className="min-w-0 space-y-6"
                      >
                        <FormField
                          control={organisationProfileForm.control}
                          name="registeredCompanyName"
                          render={({ field }) => (
                            <FormItem className="min-w-0">
                              <FormLabel>Registered company name</FormLabel>

                              <FormControl>
                                <Input
                                  placeholder="Enter registered company name"
                                  autoComplete="off"
                                  className="w-full min-w-0"
                                  disabled={connectLegalNameLocked}
                                  {...field}
                                />
                              </FormControl>

                              <span className="text-muted-foreground block text-sm">
                                {connectLegalNameLocked
                                  ? "Locked to match your Stripe payout identity."
                                  : "For official records and invoices."}
                              </span>

                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={organisationProfileForm.control}
                          name="companyRegistrationNumber"
                          render={({ field }) => (
                            <FormItem className="min-w-0">
                              <FormLabel>
                                Company registration number (CRN)
                              </FormLabel>

                              <FormControl>
                                <Input
                                  type="text"
                                  placeholder="Enter company registration number"
                                  autoComplete="off"
                                  className="w-full min-w-0"
                                  {...field}
                                />
                              </FormControl>

                              <span className="text-muted-foreground block text-sm">
                                To verify your company on the Companies House
                                register.
                              </span>

                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="min-w-0">
                          <HostProfileAddressFields
                            control={organisationProfileForm.control}
                            setValue={organisationProfileForm.setValue}
                            watch={organisationProfileForm.watch}
                            fields={{
                              address: "registeredAddress",
                              city: "city",
                              state: "state",
                              postalCode: "postalCode",
                              country: "country",
                            }}
                            addressLabel="Registered address / trading address"
                          />

                          <span className="text-muted-foreground -mt-4 block text-sm">
                            For official correspondence and records.
                          </span>
                        </div>

                        <FormField
                          control={organisationProfileForm.control}
                          name="dateOfBirth"
                          render={({ field }) => (
                            <FormItem className="min-w-0">
                              <FormLabel>
                                Date of birth (authorised signatory)
                              </FormLabel>

                              <FormControl>
                                <Input
                                  type="date"
                                  className="w-full min-w-0"
                                  {...field}
                                />
                              </FormControl>

                              <span className="text-muted-foreground block text-sm">
                                Required for payroll processing (format:
                                YYYY-MM-DD).
                              </span>

                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={organisationProfileForm.control}
                          name="uniqueTaxpayerReference"
                          render={({ field }) => (
                            <FormItem className="min-w-0">
                              <FormLabel>
                                {organisationIsUk
                                  ? "Tax payer reference (UTR)"
                                  : "Tax identification for your country"}
                              </FormLabel>

                              <FormControl>
                                <Input
                                  type="text"
                                  placeholder={
                                    organisationIsUk
                                      ? "Enter unique tax payer reference"
                                      : "Enter tax identification for your country"
                                  }
                                  autoComplete="off"
                                  className="w-full min-w-0"
                                  {...field}
                                />
                              </FormControl>

                              <span className="text-muted-foreground block text-sm">
                                For tax records and verification.
                              </span>

                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {!organisationIsUk ? (
                          <FormField
                            control={organisationProfileForm.control}
                            name="additionalTaxIdentification"
                            render={({ field }) => (
                              <FormItem className="min-w-0">
                                <FormLabel>
                                  Additional tax identification detail for your
                                  country
                                </FormLabel>

                                <FormControl>
                                  <Input
                                    type="text"
                                    placeholder="Enter additional tax information"
                                    autoComplete="off"
                                    className="w-full min-w-0"
                                    {...field}
                                  />
                                </FormControl>

                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        ) : (
                          <FormField
                            control={organisationProfileForm.control}
                            name="vatRegistrationNumber"
                            render={({ field }) => (
                              <FormItem className="min-w-0">
                                <FormLabel>
                                  VAT registration number (if you have one)
                                </FormLabel>

                                <FormControl>
                                  <Input
                                    type="text"
                                    placeholder="Enter VAT registration number"
                                    autoComplete="off"
                                    className="w-full min-w-0"
                                    {...field}
                                  />
                                </FormControl>

                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}

                        <FormField
                          control={organisationProfileForm.control}
                          name="invoice"
                          render={({ field }) => (
                            <FormItem className="min-w-0">
                              <FormLabel>Upload</FormLabel>

                              <FormControl>
                                <>
                                  <Input
                                    type="file"
                                    accept="image/*"
                                    disabled={isUploading}
                                    onChange={e =>
                                      void handleFileUpload(e, field.onChange)
                                    }
                                    placeholder="Upload invoice"
                                    autoComplete="off"
                                    className="w-full min-w-0"
                                  />

                                  {isUploading && (
                                    <div className="text-muted-foreground flex items-center gap-1 text-xs">
                                      <Loader2 className="size-3 animate-spin" />
                                      Uploading to Cloudinary...
                                    </div>
                                  )}
                                </>
                              </FormControl>

                              <span className="text-muted-foreground block text-sm">
                                The formal document detailing your
                                &quot;supply&quot; (the tips) and any applicable
                                VAT.
                              </span>

                              <FormMessage />

                              {organisationProfileForm.watch("invoice") && (
                                <div className="text-muted-foreground text-xs break-all">
                                  Uploaded:{" "}
                                  {organisationProfileForm.watch("invoice")}
                                </div>
                              )}
                            </FormItem>
                          )}
                        />

                        <div className="grid min-w-0 grid-cols-1 gap-5 sm:grid-cols-3">
                          <FormField
                            control={organisationProfileForm.control}
                            name="accountName"
                            render={({ field }) => (
                              <FormItem className="min-w-0">
                                <FormLabel>Account name</FormLabel>

                                <FormControl>
                                  <Input
                                    type="text"
                                    placeholder="Same as registered company name"
                                    autoComplete="off"
                                    readOnly
                                    className="w-full min-w-0"
                                    {...field}
                                  />
                                </FormControl>

                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={organisationProfileForm.control}
                            name="accountNumber"
                            render={({ field }) => (
                              <FormItem className="min-w-0">
                                <FormLabel>Account number</FormLabel>

                                <FormControl>
                                  <Input
                                    type="text"
                                    placeholder="Enter account number"
                                    autoComplete="off"
                                    className="w-full min-w-0"
                                    {...field}
                                  />
                                </FormControl>

                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={organisationProfileForm.control}
                            name="sortCode"
                            render={({ field }) => (
                              <FormItem className="min-w-0">
                                <FormLabel>Sort code</FormLabel>

                                <FormControl>
                                  <Input
                                    type="text"
                                    placeholder="Enter sort code"
                                    autoComplete="off"
                                    className="w-full min-w-0"
                                    {...field}
                                  />
                                </FormControl>

                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <Button
                          type="submit"
                          size="lg"
                          className="w-full sm:w-auto"
                          disabled={isProfileLoading}
                        >
                          {isProfileLoading ? (
                            <span className="flex items-center gap-2">
                              <Loader2 className="size-4 animate-spin" />
                              Submitting...
                            </span>
                          ) : (
                            "Submit"
                          )}
                        </Button>
                      </form>
                    </Form>
                  </div>

                  <SubscriptionPageBlock
                    status={status}
                    tier={info?.tier}
                    isLoading={loading}
                    onOpenSubscriptions={openSubscriptions}
                  />
                </div>
              </TabsContent>
            ) : null}

            {/* Payment & Payouts */}
            <TabsContent
              value="payment_payouts"
              className="mt-0 w-full"
            >
              {!isCreatorProfileVerified ? (
                <section className="border-primary/15 from-primary/[0.08] to-primary/[0.03] relative overflow-hidden rounded-2xl border bg-gradient-to-br via-white p-6 shadow-sm sm:p-8">
                  {/* Decorative background glow */}
                  <div className="bg-primary/10 pointer-events-none absolute -top-16 -right-16 size-40 rounded-full blur-3xl" />
                  <div className="bg-primary/[0.06] pointer-events-none absolute -bottom-20 -left-16 size-44 rounded-full blur-3xl" />

                  <div className="relative mx-auto flex max-w-lg flex-col items-center text-center">
                    {/* Icon */}
                    <div className="relative mb-5">
                      <div className="bg-primary/10 absolute inset-0 scale-125 rounded-2xl blur-md" />

                      <div className="border-primary/20 bg-background text-primary relative flex size-14 items-center justify-center rounded-2xl border shadow-sm">
                        <Wallet
                          className="size-6"
                          strokeWidth={1.8}
                        />
                      </div>
                    </div>

                    {/* Content */}
                    <div>
                      <h3 className="text-base font-semibold sm:text-lg">
                        Your payout details will appear here
                      </h3>

                      <p className="text-muted-foreground mt-2 max-w-md text-sm leading-6">
                        Once you receive your first successful payout,
                        we&apos;ll unlock your payment and payout information
                        here.
                      </p>
                    </div>

                    {/* Subtle status indicator */}
                    <div className="border-primary/15 bg-background/80 mt-6 flex items-center gap-2 rounded-full border px-3.5 py-2 shadow-sm backdrop-blur-sm">
                      <span className="relative flex size-2">
                        <span className="bg-primary/30 absolute inline-flex size-full animate-ping rounded-full" />
                        <span className="bg-primary relative inline-flex size-2 rounded-full" />
                      </span>

                      <span className="text-muted-foreground text-xs font-medium">
                        Your first payout unlocks this section
                      </span>
                    </div>
                  </div>
                </section>
              ) : (
                <div className="space-y-5">
                  {/* Bank account information */}
                  <section className="space-y-5 rounded-xl border bg-white p-4 sm:p-6">
                    <div className="space-y-1">
                      <h3 className="text-lg font-semibold">
                        Bank account information
                      </h3>

                      <p className="text-muted-foreground text-sm">
                        Your payout bank details are taken from your{" "}
                        {profileAccountType === "ORGANIZATION"
                          ? "organisation"
                          : "individual"}{" "}
                        profile.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label
                          htmlFor="payout-bank-name"
                          className="text-sm leading-none font-medium"
                        >
                          Bank name
                        </label>

                        <Input
                          id="payout-bank-name"
                          value=""
                          placeholder="Bank name not provided"
                          readOnly
                          disabled
                        />

                        <p className="text-muted-foreground text-xs">
                          Bank name is not currently stored in your profile.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <label
                          htmlFor="payout-account-name"
                          className="text-sm leading-none font-medium"
                        >
                          Account name
                        </label>

                        <Input
                          id="payout-account-name"
                          value={payoutAccountName ?? ""}
                          placeholder="Account name"
                          readOnly
                        />
                      </div>

                      <div className="space-y-2">
                        <label
                          htmlFor="payout-routing-number"
                          className="text-sm leading-none font-medium"
                        >
                          Sort code
                        </label>

                        <Input
                          id="payout-routing-number"
                          value={payoutRoutingNumber ?? ""}
                          placeholder="Routing number"
                          readOnly
                        />

                        <p className="text-muted-foreground text-xs">
                          This uses the sort code saved in your profile.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <label
                          htmlFor="payout-account-holder-name"
                          className="text-sm leading-none font-medium"
                        >
                          Account holder name
                        </label>

                        <Input
                          id="payout-account-holder-name"
                          value={payoutAccountHolderName ?? ""}
                          placeholder="Account holder name"
                          readOnly
                        />
                      </div>
                    </div>

                    {payoutAccountNumber ? (
                      <div className="bg-muted/30 rounded-lg border p-3">
                        <p className="text-muted-foreground text-xs">
                          Account number
                        </p>

                        <p className="mt-1 text-sm font-medium">
                          {payoutAccountNumber}
                        </p>
                      </div>
                    ) : null}
                  </section>

                  {/* Account type banner */}
                  <section className="rounded-xl border bg-white p-4 shadow-sm sm:p-5">
                    <div className="flex items-center gap-4">
                      <div className="bg-muted flex size-11 shrink-0 items-center justify-center rounded-xl border">
                        {profileAccountType === "ORGANIZATION" ? (
                          <Building2 className="text-foreground size-5" />
                        ) : (
                          <User className="text-foreground size-5" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                          Profile type
                        </p>

                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold sm:text-base">
                            {profileAccountType === "ORGANIZATION"
                              ? "Organisation"
                              : "Individual"}
                          </p>
                        </div>

                        <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
                          Your payout and tax information is managed using this
                          profile.
                        </p>
                      </div>
                    </div>
                  </section>

                  {/* Payout schedule */}
                  <section className="bg-card space-y-4 rounded-lg border p-4 sm:p-5">
                    <div>
                      <h2 className="text-lg font-semibold">
                        Payout settlement history
                      </h2>

                      <p className="text-muted-foreground mt-1 text-sm">
                        Recent payouts that have been settled for your host
                        account.
                      </p>
                    </div>

                    {payoutsLoading ? (
                      <p className="text-muted-foreground text-sm">
                        Loading settlement history…
                      </p>
                    ) : settlementHistory.length === 0 ? (
                      <div className="rounded-lg border border-dashed p-6 text-center">
                        <p className="text-sm font-medium">
                          No settlements recorded yet.
                        </p>

                        <p className="text-muted-foreground mt-1 text-xs">
                          Your payout settlement history will appear here once a
                          payout has been settled.
                        </p>
                      </div>
                    ) : (
                      <ul className="space-y-3">
                        {settlementHistory.map(settlement => (
                          <li
                            key={settlement.id}
                            className="flex flex-wrap items-center justify-between gap-3 border-b pb-3 last:border-b-0 last:pb-0"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-medium">
                                {branchLabel(settlement.branch)}
                              </p>

                              <p className="text-muted-foreground mt-1 text-xs">
                                {settlement.status} ·{" "}
                                {new Date(
                                  settlement.createdAt
                                ).toLocaleString()}
                              </p>
                            </div>

                            <p className="text-sm font-semibold">
                              {formatGbpMinor(settlement.amountMinor)}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>

                  <SubscriptionPageBlock
                    status={status}
                    tier={info?.tier}
                    isLoading={loading}
                    onOpenSubscriptions={openSubscriptions}
                  />
                </div>
              )}
            </TabsContent>

            {/* Help & Support */}
            <TabsContent
              value="help_section"
              className="mt-0 w-full"
            >
              <div className="space-y-5">
                <section className="space-y-5 rounded-xl border bg-white p-4 sm:p-6">
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold">Help & support</h3>

                    <p className="text-muted-foreground text-sm">
                      Need assistance or have questions about your dashboard or
                      event setup? Our support team is here to help.
                    </p>
                  </div>

                  <div className="bg-muted/30 rounded-lg border p-4">
                    <div className="flex items-start gap-3">
                      <div className="bg-background flex size-9 shrink-0 items-center justify-center rounded-lg border">
                        <Headset className="size-4" />
                      </div>

                      <div className="min-w-0">
                        <h4 className="font-medium">Live chat support</h4>

                        <p className="text-muted-foreground mt-1 text-sm">
                          Instantly connect with our support team to resolve any
                          issue in real time.
                        </p>
                      </div>
                    </div>

                    <Button
                      size="lg"
                      className="mt-4 w-full"
                      onClick={() => setSupportOpen(true)}
                    >
                      Start live chat
                    </Button>
                  </div>

                  <EmbeddedSupportChat
                    open={supportOpen}
                    onOpenChange={setSupportOpen}
                    source="host_settings"
                  />
                </section>

                <section className="space-y-5 rounded-xl border bg-white p-4 sm:p-6">
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold">Contact support</h3>

                    <p className="text-muted-foreground text-sm">
                      Email us directly for more detailed assistance.
                    </p>
                  </div>

                  <div className="bg-muted/30 rounded-lg border p-4">
                    <p className="text-sm font-medium">Email</p>

                    <a
                      href="mailto:hello@tipmanna.tv"
                      className="text-primary mt-1 block text-sm hover:underline"
                    >
                      hello@tipmanna.tv
                    </a>
                  </div>

                  <Link
                    href="mailto:hello@tipmanna.tv"
                    className="block"
                  >
                    <Button
                      variant="secondary"
                      size="lg"
                      className="w-full border"
                    >
                      Send email
                    </Button>
                  </Link>
                </section>

                <section className="space-y-5 rounded-xl border bg-white p-4 sm:p-6">
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold">Report a problem</h3>

                    <p className="text-muted-foreground text-sm">
                      Facing a technical issue? Submit a quick report and
                      we&apos;ll get back to you.
                    </p>
                  </div>

                  <Link
                    href="mailto:hello@tipmanna.tv"
                    className="block"
                  >
                    <Button
                      variant="secondary"
                      size="lg"
                      className="w-full border"
                    >
                      Report issue
                    </Button>
                  </Link>
                </section>

                <SubscriptionPageBlock
                  status={status}
                  tier={info?.tier}
                  isLoading={loading}
                  onOpenSubscriptions={openSubscriptions}
                />
              </div>
            </TabsContent>
          </main>
        </div>

        {/* Change email dialog */}
        <Dialog
          open={openEmailModal}
          onOpenChange={setOpenEmailModal}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader className="open_sans">
              {step === "signIn" ? (
                <>
                  <h2 className="text-center text-3xl font-semibold sm:text-4xl">
                    Enter your email
                  </h2>

                  <Form {...emailForm}>
                    <form
                      onSubmit={emailForm.handleSubmit(async values => {
                        try {
                          if (!token) {
                            return toast.error("Invalid token");
                          }

                          setIsLoading(true);

                          const res = await changeEmailAction({
                            userId,
                            newEmail: values.email,
                          });

                          if (!res.success) {
                            toast.error(res.message);
                            return;
                          }

                          setStep("verifyCode");

                          toast.success("Verification code sent to your email");
                        } catch (err: unknown) {
                          if (err instanceof Error) {
                            toast.error(err.message);
                          } else if (
                            typeof err === "object" &&
                            err !== null &&
                            "error" in err
                          ) {
                            const apiErr = err as ApiError;
                            toast.error(apiErr.error.message);
                          } else {
                            toast.error("Failed to send verification code");
                          }
                        } finally {
                          setIsLoading(false);
                        }
                      })}
                      className="mt-8 space-y-6"
                    >
                      <FormField
                        control={emailForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>New email</FormLabel>

                            <FormControl>
                              <Input
                                placeholder="Enter email"
                                {...field}
                              />
                            </FormControl>

                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button
                        type="submit"
                        size="lg"
                        className="w-full bg-black"
                        disabled={isLoading}
                      >
                        {isLoading ? "Sending code..." : "Send code"}
                      </Button>
                    </form>
                  </Form>
                </>
              ) : (
                <div className="relative flex flex-col items-center justify-center gap-4 py-8">
                  <h2 className="mt-6 text-3xl font-semibold sm:text-4xl">
                    Verify your email
                  </h2>

                  <p className="text-muted-foreground text-center text-sm">
                    We&apos;ve sent a 6-digit code to{" "}
                    <strong>{emailForm.watch("email")}</strong>. Enter it below
                    to verify your account.
                  </p>

                  <div className="react-otp-input">
                    <OTPInput
                      value={emailCode}
                      onChange={setEmailCode}
                      numInputs={6}
                      renderInput={props => <input {...props} />}
                      inputStyle={inputStyle}
                      shouldAutoFocus
                    />
                  </div>

                  <Button
                    type="button"
                    size="lg"
                    className="mt-4 w-full"
                    disabled={emailCode.length < 6 || isLoading}
                    onClick={async () => {
                      try {
                        setIsLoading(true);

                        await verifyCodeAction(
                          emailForm.watch("email"),
                          emailCode
                        );

                        dispatch(
                          setCredentials({
                            user: {
                              ...user!,
                              email: emailForm.watch("email"),
                            },
                            token: token!,
                          })
                        );

                        toast.success("Email verified successfully!");

                        replace(`/host/${eventSlug!}/profile`);

                        setOpenEmailModal(false);
                      } catch (err: unknown) {
                        console.error(err);
                        toast.error("Failed to verify email");
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                  >
                    {isLoading ? "Verifying..." : "Verify email"}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="absolute -top-2 left-0 border border-gray-300 outline-none hover:bg-gray-200"
                    onClick={() => setStep("signIn")}
                  >
                    <MoveLeft />
                    Back
                  </Button>
                </div>
              )}
            </DialogHeader>
          </DialogContent>
        </Dialog>
      </Tabs>
    </div>
  );
};
