/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { EmbeddedSupportChat } from "@/components/support/embedded-support-chat";
import { HostYoutubeChannelsSettings } from "@/components/dashboard/host-youtube-channels-settings";
import { HostProfileAddressFields } from "@/components/dashboard/host-profile-address-fields";
import { isUkCountry } from "@/lib/is-uk-country";

// THird-party imports
import {
  Eye,
  Headset,
  Loader2,
  LogOut,
  MoveLeft,
  User,
  Wallet,
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

export const SettingsClient = () => {
  const searchParams = useSearchParams();
  const initialProfileTab =
    searchParams.get("tab") === "organisation_profile"
      ? "organisation_profile"
      : searchParams.get("tab") === "individual_profile"
        ? "individual_profile"
        : "account_settings";

  const [tabType, setTabType] = useState<
    | "account_settings"
    | "payment_payouts"
    | "help_section"
    | "individual_profile"
    | "organisation_profile"
  >(initialProfileTab);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [isEditable] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [profileAccountType, setProfileAccountType] = useState<
    "INDIVIDUAL" | "ORGANIZATION" | null
  >(null);

  const user = useSelector((state: RootState) => state.auth.user);
  const token = useSelector((state: RootState) => state.auth.token);
  const userId = user ? user.id : "";
  const { eventSlug, isActive: hostSessionActive } = useHostSession();

  const dispatch = useDispatch<AppDispatch>();
  const { push, replace } = useAppRouter();

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

  // 1. Define profile form
  const profileForm = useForm<profileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      fullName: user?.fullName ?? "",
      email: user?.email ?? "",
      password: "",
      confirmPassword: "",
    },
  });

  // 2. Define payment form
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

  const showIndividualProfileTab =
    profileAccountType === null || profileAccountType === "INDIVIDUAL";
  const showOrganisationProfileTab =
    profileAccountType === null || profileAccountType === "ORGANIZATION";

  const handleTabChange = (value: string) => {
    if (value === "individual_profile" && !showIndividualProfileTab) {
      return;
    }

    if (value === "organisation_profile" && !showOrganisationProfileTab) {
      return;
    }

    setTabType(
      value as
        | "account_settings"
        | "payment_payouts"
        | "help_section"
        | "individual_profile"
        | "organisation_profile"
    );
  };

  const individualCountry = individualProfileForm.watch("country");
  const individualIsUk = isUkCountry(individualCountry);
  const organisationCountry = organisationProfileForm.watch("country");
  const organisationIsUk = isUkCountry(organisationCountry);
  const individualFirstName = individualProfileForm.watch("firstName");
  const individualLastName = individualProfileForm.watch("lastName");
  const registeredCompanyName = organisationProfileForm.watch(
    "registeredCompanyName"
  );

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

  useEffect(() => {
    if (!hostSessionActive) return;

    void getHostProfileAction().then(response => {
      if (!response.success || !response.data) return;

      const profile = response.data as {
        profileAccountType?: "INDIVIDUAL" | "ORGANIZATION" | null;
        individualProfile?: Partial<individualProfileFormData> | null;
        organisationProfile?: Partial<organisationProfileFormData> | null;
      };

      const accountType = profile.profileAccountType ?? null;
      setProfileAccountType(accountType);

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
    });
  }, [hostSessionActive]);

  useEffect(() => {
    if (
      profileAccountType === "INDIVIDUAL" &&
      tabType === "organisation_profile"
    ) {
      setTabType("individual_profile");
    } else if (
      profileAccountType === "ORGANIZATION" &&
      tabType === "individual_profile"
    ) {
      setTabType("organisation_profile");
    }
  }, [profileAccountType, tabType]);

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

      const { id, fullName, email, username } = res.data as {
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
              username,
            },
            token,
          })
        );
      }

      replace(`/host/${eventSlug ?? user?.username}/profile`);

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

  const onSubmitTax = async () => {
    console.log("clicked");
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

  return (
    <Tabs
      value={tabType}
      onValueChange={handleTabChange}
      className="grid min-w-0 grid-cols-12 items-start gap-6 overflow-x-hidden"
    >
      {/* Tabs navigation */}
      <div className="col-span-full min-w-0 self-start md:col-span-3">
        <div className="w-full min-w-0 overflow-x-auto">
          <TabsList className="mt-0 flex h-auto w-max min-w-full flex-row justify-start gap-2 rounded-none p-0 md:w-full md:min-w-0 md:flex-col md:gap-4">
            <TabsTrigger
              className="data-[state=active]:bg-primary h-13! w-auto! shrink-0 border border-gray-300 px-4 whitespace-nowrap data-[state=active]:text-white md:w-full!"
              value="account_settings"
            >
              <User />
              Account settings
            </TabsTrigger>

            {showIndividualProfileTab ? (
              <TabsTrigger
                className="data-[state=active]:bg-primary h-13! w-auto! shrink-0 border border-gray-300 px-4 whitespace-nowrap data-[state=active]:text-white md:w-full!"
                value="individual_profile"
              >
                <User />
                Individual profile
              </TabsTrigger>
            ) : null}

            {showOrganisationProfileTab ? (
              <TabsTrigger
                className="data-[state=active]:bg-primary h-13! w-auto! shrink-0 border border-gray-300 px-4 whitespace-nowrap data-[state=active]:text-white md:w-full!"
                value="organisation_profile"
              >
                <User />
                Organisation profile
              </TabsTrigger>
            ) : null}

            <TabsTrigger
              className="data-[state=active]:bg-primary h-13! w-auto! shrink-0 border border-gray-300 bg-white px-4 whitespace-nowrap data-[state=active]:text-white md:w-full!"
              value="payment_payouts"
            >
              <Wallet />
              Payment payouts
            </TabsTrigger>

            <TabsTrigger
              className="data-[state=active]:bg-primary h-13! w-auto! shrink-0 border border-gray-300 bg-white px-4 whitespace-nowrap data-[state=active]:text-white md:w-full!"
              value="help_section"
            >
              <Headset />
              Help section
            </TabsTrigger>

            <Button
              variant="outline"
              size="lg"
              className="w-auto shrink-0 whitespace-nowrap md:w-full"
              onClick={handleLogout}
            >
              <LogOut />
              Logout
            </Button>
          </TabsList>
        </div>
      </div>

      <div className="col-span-full w-full min-w-0 self-start md:col-span-9">
        <TabsContent
          value="account_settings"
          className="mt-0 w-full"
        >
          <div className="space-y-6 rounded-md border bg-white p-6">
            <div className="space-y-1">
              <h5 className="text-xl font-semibold">Profile information</h5>
              <p className="text-muted-foreground text-sm">
                Update your basic profile details
              </p>
            </div>

            <Form {...profileForm}>
              <form
                onSubmit={profileForm.handleSubmit(onSubmitProfile)}
                className="space-y-6"
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
                        <span
                          className="text-primary cursor-pointer"
                          onClick={() => {
                            setOpenEmailModal(true);
                            setStep("signIn");
                          }}
                        >
                          Change email
                        </span>
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
          </div>

          <div className="mt-6 space-y-6 rounded-md border bg-white p-6">
            <div className="space-y-1">
              <h5 className="text-xl font-semibold">Login & Security</h5>
              <p className="text-muted-foreground text-sm">
                Mange your account security settings
              </p>
            </div>

            <Form {...profileForm}>
              <form
                onSubmit={profileForm.handleSubmit(onSubmitProfile)}
                className="space-y-6"
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
                            {...field}
                          />

                          <button
                            type="button"
                            onClick={togglePasswordVisibility}
                            className="absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer"
                          >
                            <Eye className="text-muted-foreground" />
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
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Enter new password"
                            autoComplete="off"
                            {...field}
                          />

                          <button
                            type="button"
                            onClick={toggleConfirmPasswordVisibility}
                            className="absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer"
                          >
                            <Eye className="text-muted-foreground" />
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-4">
                  <Button
                    type="submit"
                    variant="outline"
                    size="lg"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="lg"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="size-4 animate-spin" /> Saving
                        changes...
                      </span>
                    ) : (
                      <span>Save changes</span>
                    )}
                  </Button>
                </div>

                {/*  */}
              </form>
            </Form>
          </div>

          <HostYoutubeChannelsSettings />
        </TabsContent>

        {showIndividualProfileTab ? (
          <TabsContent
            value="individual_profile"
            className="mt-0 w-full"
          >
            <div className="space-y-6 rounded-md border bg-white p-6">
              <div className="space-y-1">
                <h5 className="text-xl font-semibold">Individual profile</h5>
                <p className="text-muted-foreground text-sm">
                  Update your individual profile
                </p>
              </div>

              <Form {...individualProfileForm}>
                <form
                  onSubmit={individualProfileForm.handleSubmit(
                    onSubmitIndividualProfile
                  )}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-2 gap-6">
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
                              {...field}
                            />
                          </FormControl>
                          <span className="text-muted-foreground text-sm">
                            For official records and HMRC reporting
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
                              {...field}
                            />
                          </FormControl>
                          <span className="text-muted-foreground text-sm">
                            For official records and HMRC reporting
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
                    For official records, correspondence, and HMRC reporting
                  </span>

                  {individualIsUk ? (
                    <FormField
                      control={individualProfileForm.control}
                      name="niNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>National Insurance (NI) number</FormLabel>
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
                            reporting to HMRC
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
                              Additional tax identification detail for your
                              country
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
                          Required for payroll processing (format: YYYY-MM-DD)
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
                              <SelectValue placeholder="Select Gender" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="MALE">Male</SelectItem>
                              <SelectItem value="FEMALE">Female</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <span className="text-muted-foreground text-sm">
                          Required data for payroll processing
                        </span>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-3 gap-6">
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
                    disabled={isProfileLoading}
                  >
                    {isProfileLoading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="size-4 animate-spin" />{" "}
                        Submitting...
                      </span>
                    ) : (
                      <span>Submit</span>
                    )}
                  </Button>
                </form>
              </Form>
            </div>
          </TabsContent>
        ) : null}

        {showOrganisationProfileTab ? (
          <TabsContent
            value="organisation_profile"
            className="mt-0 w-full min-w-0"
          >
            <div className="w-full min-w-0 space-y-6 overflow-hidden rounded-md border bg-white p-4 sm:p-6">
              <div className="min-w-0 space-y-1">
                <h5 className="text-xl font-semibold">Organisation profile</h5>
                <p className="text-muted-foreground text-sm">
                  Update your organisation profile
                </p>
              </div>

              <Form {...organisationProfileForm}>
                <form
                  onSubmit={organisationProfileForm.handleSubmit(
                    onSubmitOrganisationProfile
                  )}
                  className="min-w-0 space-y-6"
                >
                  {/* Registered company name */}
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
                            {...field}
                          />
                        </FormControl>

                        <span className="text-muted-foreground block text-sm">
                          For official records and invoices
                        </span>

                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Company registration number */}
                  <FormField
                    control={organisationProfileForm.control}
                    name="companyRegistrationNumber"
                    render={({ field }) => (
                      <FormItem className="min-w-0">
                        <FormLabel>Company registration number (CRN)</FormLabel>

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
                          To verify your company on the Company House register
                        </span>

                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Registered address */}
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
                      For official correspondence and records
                    </span>
                  </div>

                  {/* Date of birth */}
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
                          Required for payroll processing (format: YYYY-MM-DD)
                        </span>

                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Tax payer reference */}
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
                          For tax records and verification
                        </span>

                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Additional tax identification / VAT */}
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

                  {/* Invoice */}
                  <FormField
                    control={organisationProfileForm.control}
                    name="invoice"
                    render={({ field }) => (
                      <FormItem className="min-w-0">
                        <FormLabel>Invoice</FormLabel>

                        <FormControl>
                          <Input
                            type="text"
                            placeholder="Upload invoice"
                            autoComplete="off"
                            className="w-full min-w-0"
                            {...field}
                          />
                        </FormControl>

                        <span className="text-muted-foreground block text-sm">
                          The formal document detailing your &quot;supply&quot;
                          (the tips) and any applicable VAT
                        </span>

                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Bank account details */}
                  <div className="grid min-w-0 grid-cols-1 gap-6 md:grid-cols-3">
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

                  {/* Submit */}
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
                      <span>Submit</span>
                    )}
                  </Button>
                </form>
              </Form>
            </div>
          </TabsContent>
        ) : null}

        <TabsContent
          value="payment_payouts"
          className="mt-0 w-full"
        >
          <div className="space-y-6 rounded-md border bg-white p-6">
            <div className="space-y-1">
              <h5 className="text-xl font-semibold">Bank Account Details</h5>
              <p className="text-muted-foreground text-sm">
                Configure where you receive payouts
              </p>
            </div>

            <Form {...paymentForm}>
              <form
                onSubmit={paymentForm.handleSubmit(onSubmitPayment)}
                className="space-y-6"
              >
                <FormField
                  control={paymentForm.control}
                  name="bankName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bank name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Choose bank"
                          autoComplete="off"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-6">
                  <FormField
                    control={paymentForm.control}
                    name="accountName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter account name"
                            autoComplete="off"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={paymentForm.control}
                    name="routingNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Routing number</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter routing number"
                            autoComplete="off"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={paymentForm.control}
                  name="accountHolderName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account holder name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter account holder name"
                          autoComplete="off"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </div>

          <div className="mt-6 space-y-6 rounded-md border bg-white p-6">
            <div className="space-y-1">
              <h5 className="text-xl font-semibold">Tax information</h5>
              <p className="text-muted-foreground text-sm">
                Required for tax information purposes
              </p>
            </div>

            <Form {...paymentForm}>
              <form
                onSubmit={paymentForm.handleSubmit(onSubmitTax)}
                className="space-y-6"
              >
                <FormField
                  control={paymentForm.control}
                  name="taxId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tax ID / SSN</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="XXXX"
                          autoComplete="off"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={paymentForm.control}
                  name="businessType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select business type</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="Select business type"
                          autoComplete="off"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </div>

          <div className="mt-6 space-y-6 rounded-md border bg-white p-6">
            <div className="space-y-1">
              <h5 className="text-xl font-semibold">Payout Schedule</h5>
              <p className="text-muted-foreground text-sm">
                Close when you receive your earnings
              </p>
            </div>

            <Form {...paymentForm}>
              <form
                onSubmit={paymentForm.handleSubmit(onSubmitPayment)}
                className="space-y-6"
              >
                <FormField
                  control={paymentForm.control}
                  name="payoutFrequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payout frequency</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="Select payout frequency"
                          autoComplete="off"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-4">
                  <Button
                    type="submit"
                    variant="outline"
                    size="lg"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="lg"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="size-4 animate-spin" /> Saving
                        changes...
                      </span>
                    ) : (
                      <span>Save changes</span>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </TabsContent>

        <TabsContent
          value="help_section"
          className="mt-0 w-full"
        >
          <div className="space-y-6 rounded-md border bg-white p-6">
            <div className="space-y-1">
              <h5 className="text-xl font-semibold">Help & Support</h5>
              <p className="text-muted-foreground text-sm">
                Need assistance or have questions about your dashboard or event
                setup? Our support team is here to help you.
              </p>
            </div>

            <div className="space-y-1">
              <h5 className="text-xl font-semibold">Live chat support</h5>
              <p className="text-muted-foreground text-sm">
                Instantly connect with our support team to resolve any issue in
                real time.
              </p>
            </div>

            <Button
              size="lg"
              className="w-full"
              onClick={() => setSupportOpen(true)}
            >
              Start live chat
            </Button>
            <EmbeddedSupportChat
              open={supportOpen}
              onOpenChange={setSupportOpen}
              source="host_settings"
            />
          </div>

          <div className="mt-6 space-y-6 rounded-md border bg-white p-6">
            <div className="space-y-1">
              <h5 className="text-xl font-semibold">Contact Support</h5>
              <p className="text-muted-foreground text-sm">
                Email us directly for more detailed assistance.
              </p>
            </div>

            <div className="space-y-1">
              <h5 className="text-xl font-semibold">
                Email us directly for more detailed assistance
              </h5>
              <div className="bg-secondary/20 space-y-1 p-2">
                <p>Email:</p>
                <a href="mailto:hello@tipmanna.tv">hello@tipmanna.tv</a>
              </div>
            </div>
            <Link href="mailto:hello@tipmanna.tv">
              <Button
                variant="secondary"
                size="lg"
                className="bg-secondary/30 w-full border"
              >
                Send email
              </Button>
            </Link>
          </div>

          <div className="mt-6 space-y-6 rounded-md border bg-white p-6">
            <div className="space-y-1">
              <h5 className="text-xl font-semibold">Report a Problem</h5>
              <p className="text-muted-foreground text-sm">
                Facing a technical issue? Submit a quick report and we&apos;ll
                get back to you.
              </p>
            </div>

            <Link href="mailto:hello@tipmanna.tv">
              <Button
                variant="secondary"
                size="lg"
                className="bg-secondary/30 w-full border"
              >
                Report issue
              </Button>
            </Link>
          </div>
        </TabsContent>
      </div>

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
                        if (!token) return toast.error("Invalid token");

                        setIsLoading(true);
                        // send verification code to new emai
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
                    className="mt-12 space-y-6"
                  >
                    <FormField
                      control={emailForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Email</FormLabel>
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
                      {isLoading ? "Sending code..." : "Send Code"}
                    </Button>
                  </form>
                </Form>
              </>
            ) : (
              <div className="relative flex flex-col items-center justify-center gap-4 py-12">
                <h2 className="mt-6 text-3xl font-semibold sm:text-4xl">
                  Verify your email
                </h2>
                <p className="text-muted-foreground text-center text-sm">
                  We&apos;ve sent a 6-digit code to{" "}
                  <strong>{emailForm.watch("email")}</strong> Enter it below to
                  verify your account.
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

                      // Verify the code
                      await verifyCodeAction(
                        emailForm.watch("email"),
                        emailCode
                      );

                      // Update email in redux
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
                      // window.location.reload();

                      setOpenEmailModal(false);
                    } catch (err: unknown) {
                      console.error(err);
                      toast.error("Failed to verify email");
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                >
                  {isLoading ? "Verifying..." : "Verify Email"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="absolute -top-4 left-0 mt-4 border border-gray-300 outline-none hover:bg-gray-200"
                  onClick={() => setStep("signIn")}
                >
                  <MoveLeft /> Back
                </Button>
              </div>
            )}
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
};
