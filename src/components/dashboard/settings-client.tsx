/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import Link from "next/link";

import { EmbeddedSupportChat } from "@/components/support/embedded-support-chat";

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
  updateHostAction,
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
import { useAppRouter } from "@/components/navigation/navigation-progress-provider";

export const SettingsClient = () => {
  const [tabType, setTabType] = useState<
    | "account_settings"
    | "payment_payouts"
    | "help_section"
    | "individual_profile"
    | "organisation_profile"
  >("account_settings");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditable] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);

  const user = useSelector((state: RootState) => state.auth.user);
  const token = useSelector((state: RootState) => state.auth.token);
  const userId = user ? user.id : "";

  let eventSlug;
  if (user?.role === "HOST") {
    eventSlug = user?.eventSlug;
  }

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

  // 3. Define individual profile form
  const individualProfileForm = useForm<individualProfileFormData>({
    resolver: zodResolver(individualProfileFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      homeAddress: "",
      city: "",
      state: "",
      postalCode: "",
      niNumber: "",
      dateOfBirth: "",
      gender: "",
      accountName: "",
      accountNumber: "",
      sortCode: "",
    },
  });

  // 4. Define organisation profile form
  const organisationProfileForm = useForm<organisationProfileFormData>({
    resolver: zodResolver(organisationProfileFormSchema),
    defaultValues: {
      registeredCompanyName: "",
      companyRegistrationNumber: "",
      registeredAddress: "",
      uniqueTaxpayerReference: "",
      vatRegistrationNumber: "",
      invoice: "",
      accountName: "",
      accountNumber: "",
      sortCode: "",
      businessBankAccountDetails: "",
    },
  });

  const onSubmitProfile = async (values: profileFormData) => {
    try {
      setIsLoading(true);

      if (!token) {
        toast.error("Invalid or expired token");
        return;
      }

      const res = await updateHostAction(
        {
          fullName: values.fullName,
          email: values.email,
          currentPassword: values.password,
          newPassword: values.confirmPassword,
        },
        token
      );

      if (!res.success) {
        toast.error(res.message);
        return;
      }

      const { id, fullName, email, username, eventSlug } = res.data as any;

      // update redux store
      dispatch(
        setCredentials({
          user: {
            id,
            fullName,
            username,
            email,
            role: "HOST",
            eventSlug,
          },
          token,
        })
      );

      replace(`/host/${eventSlug!}/profile`);

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
      onValueChange={val => setTabType(val as "account_settings")}
      className="mt-12 grid grid-cols-12 gap-6"
    >
      <div className="col-span-full md:col-span-3">
        <TabsList className="mt-32 flex w-full flex-col gap-4">
          <TabsTrigger
            className="data-[state=active]:bg-primary h-13! w-full! border border-gray-300 data-[state=active]:text-white"
            value="account_settings"
          >
            <User /> Account settings
          </TabsTrigger>
          <TabsTrigger
            className="data-[state=active]:bg-primary h-13! w-full! border border-gray-300 data-[state=active]:text-white"
            value="individual_profile"
          >
            <User /> Individual profile
          </TabsTrigger>
          <TabsTrigger
            className="data-[state=active]:bg-primary h-13! w-full! border border-gray-300 data-[state=active]:text-white"
            value="organisation_profile"
          >
            <User /> Organisation profile
          </TabsTrigger>
          <TabsTrigger
            className="data-[state=active]:bg-primary h-13! w-full! border border-gray-300 bg-white data-[state=active]:text-white"
            value="payment_payouts"
          >
            <Wallet /> Payment payouts
          </TabsTrigger>
          <TabsTrigger
            className="data-[state=active]:bg-primary h-13! w-full! border border-gray-300 bg-white data-[state=active]:text-white"
            value="help_section"
          >
            <Headset /> Help section
          </TabsTrigger>
          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={handleLogout}
          >
            <LogOut /> Logout
          </Button>
        </TabsList>
      </div>

      <div className="col-span-full -mt-12 md:col-span-9">
        <TabsContent value="account_settings">
          <div className="space-y-6 rounded-md border bg-white p-6">
            <div className="space-y-1">
              <h5 className="text-xl font-semibold">Profile information</h5>
              <p className="text-muted-foreground text-sm">
                Upate your basic profile details
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
        </TabsContent>

        <TabsContent value="individual_profile">
          <div className="space-y-6 rounded-md border bg-white p-6">
            <div className="space-y-1">
              <h5 className="text-xl font-semibold">Individual profile</h5>
              <p className="text-muted-foreground text-sm">
                Update your individual profile
              </p>
            </div>

            <Form {...individualProfileForm}>
              <form
                onSubmit={individualProfileForm.handleSubmit(() => {})}
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

                <FormField
                  control={individualProfileForm.control}
                  name="homeAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Home address</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder=""
                          autoComplete="off"
                          {...field}
                        />
                      </FormControl>
                      <span className="text-muted-foreground text-sm">
                        For official records, correspondence, and HMRC reporting
                      </span>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-3 gap-6">
                  <FormField
                    control={individualProfileForm.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder=""
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
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State / County</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder=""
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
                    name="postalCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ZIP / Postal Code</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder=""
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
                        Essential for calculating NI contributions and reporting
                        to HMRC
                      </span>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                        Required data for payroll processing
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
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="size-4 animate-spin" /> Submitting...
                    </span>
                  ) : (
                    <span>Submit</span>
                  )}
                </Button>
              </form>
            </Form>
          </div>
        </TabsContent>

        <TabsContent value="organisation_profile">
          <div className="space-y-6 rounded-md border bg-white p-6">
            <div className="space-y-1">
              <h5 className="text-xl font-semibold">Organisation profile</h5>
              <p className="text-muted-foreground text-sm">
                Update your organisation profile
              </p>
            </div>

            <Form {...organisationProfileForm}>
              <form
                onSubmit={organisationProfileForm.handleSubmit(() => {})}
                className="space-y-6"
              >
                <FormField
                  control={organisationProfileForm.control}
                  name="registeredCompanyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Registered company name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter registered company name"
                          autoComplete="off"
                          {...field}
                        />
                      </FormControl>
                      <span className="text-muted-foreground text-sm">
                        For official records and invoices
                      </span>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={organisationProfileForm.control}
                  name="companyRegistrationNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company registration number</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="Enter company registration number"
                          autoComplete="off"
                          {...field}
                        />
                      </FormControl>
                      <span className="text-muted-foreground text-sm">
                        To verify your company on the Company House register
                      </span>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={organisationProfileForm.control}
                  name="registeredAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Registered address / trading address
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="Enter registered address / trading address"
                          autoComplete="off"
                          {...field}
                        />
                      </FormControl>
                      <span className="text-muted-foreground text-sm">
                        For official correspondence and records
                      </span>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={organisationProfileForm.control}
                  name="uniqueTaxpayerReference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of birth</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="Enter unique tax payer reference"
                          autoComplete="off"
                          {...field}
                        />
                      </FormControl>
                      <span className="text-muted-foreground text-sm">
                        For tax records and verification
                      </span>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={organisationProfileForm.control}
                  name="invoice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Invoice</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="Enter gender"
                          autoComplete="off"
                          {...field}
                        />
                      </FormControl>
                      <span className="text-muted-foreground text-sm">
                        The formal document detailing your &quot;supply&quot;
                        (the tips) and any applicable VAT
                      </span>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={organisationProfileForm.control}
                  name="businessBankAccountDetails"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business bank account details</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="Enter business bank account details"
                          autoComplete="off"
                          {...field}
                        />
                      </FormControl>
                      <span className="text-muted-foreground text-sm">
                        For payment of your invoice
                      </span>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </div>
        </TabsContent>

        <TabsContent value="payment_payouts">
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

        <TabsContent value="help_section">
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
