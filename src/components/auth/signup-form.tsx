"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { TermsPrivacyLabel } from "@/components/auth/terms-privacy-label";

// Third-party imports
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, Info, Loader2, X } from "lucide-react";
import { toast } from "react-toastify";
import { useSelector } from "react-redux";

// Local imports
import { HostSignUpFormData, hostSignUpSchema } from "@/schemas/host.schema";
import {
  TipperSignUpFormData,
  tipperSignUpSchema,
} from "@/schemas/tipper.schema";
import { Paragraph } from "@/components/shared/paragraph";
import {
  checkCoOwnerSignupEligibilityAction,
  checkHostUsernameAvailabilityAction,
  registerHostAction,
  registerTipperAction,
} from "@/actions/auth";
import { ApiError } from "@/types/api-error.types";
import { useAppRouter } from "@/components/navigation/navigation-progress-provider";
import { parseAuthResponse } from "@/lib/auth-response";
import { buildVerifyEmailPath } from "@/lib/verify-email-path";
import { baseUsernameFromEmail } from "@/lib/base-username-from-email";
import { getVisitorIdForAuthMerge } from "@/lib/visitor-session";
import { buildSignupAttributionPayload } from "@/lib/signup-attribution";
import { resolvePostHostAuthDestination } from "@/lib/post-host-auth-destination";
import type { RootState } from "@/redux/store";

function safeInternalPath(next: string | null): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}

export const SignupForm = () => {
  const [userType, setUserType] = useState<"host" | "tipper">("host");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email");
  const nameParam = searchParams.get("name");
  const redirectParam = searchParams.get("redirect");

  const [isHostLoading, setIsHostLoading] = useState(false);
  const [isTipperLoading, setIsTipperLoading] = useState(false);
  const [checkingCoOwnerEmail, setCheckingCoOwnerEmail] = useState(false);
  const [coOwnerEligible, setCoOwnerEligible] = useState<boolean | null>(null);

  const { push } = useAppRouter();
  const authUser = useSelector((s: RootState) => s.auth.user);
  const visitorIdForMerge = getVisitorIdForAuthMerge(authUser);

  const [showTipperInfo, setShowTipperInfo] = useState(false);
  const [showHostInfo, setShowHostInfo] = useState(false);

  const toggleTipperInfo = () => {
    setShowTipperInfo(prev => !prev);
  };

  const toggleHostInfo = () => {
    setShowHostInfo(prev => !prev);
  };

  const togglePasswordVisibility = () => {
    setShowPassword(prev => !prev);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(prev => !prev);
  };

  const hostVerifyRedirectPath = (username: string, email: string) => {
    const profilePath = resolvePostHostAuthDestination({
      hostUsername: username,
    });
    const next = safeInternalPath(redirectParam) ?? profilePath;
    return buildVerifyEmailPath({
      email: email.trim(),
      accountType: "HOST",
      next,
    });
  };

  const hostForm = useForm<HostSignUpFormData>({
    resolver: zodResolver(hostSignUpSchema),
    defaultValues: {
      fullName: nameParam?.trim() || "",
      email: emailParam || "",
      username: "",
      password: "",
      confirmPassword: "",
      acceptedTerms: false,
    },
  });

  const fullName = hostForm.watch("fullName");
  const username = hostForm.watch("username");
  const hostEmail = hostForm.watch("email");
  const password = hostForm.watch("password");

  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(
    null
  );

  // Progressive signup fields
  const slideUsernameField =
    fullName.trim() !== "" && hostEmail?.trim().includes("@");
  const slidePasswordFields =
    fullName.trim() !== "" &&
    hostEmail?.trim().includes("@") &&
    username.trim() !== "";
  const slideConfirmPasswordField =
    fullName.trim() !== "" &&
    hostEmail?.trim().includes("@") &&
    username.trim() !== "" &&
    password.trim() !== "";

  const isUsernameTouched = useRef(false);

  const email = hostForm.watch("email");

  useEffect(() => {
    if (isUsernameTouched.current || !email?.includes("@")) return;
    const derived = baseUsernameFromEmail(email);
    if (derived) {
      hostForm.setValue("username", derived, { shouldValidate: true });
    }
  }, [email, hostForm]);

  useEffect(() => {
    if (!username) {
      setUsernameAvailable(null);
      return;
    }

    const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;

    if (!usernameRegex.test(username)) {
      setUsernameAvailable(null);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        setCheckingUsername(true);

        const res = await checkHostUsernameAvailabilityAction({
          username,
          email: hostEmail?.trim(),
        });

        if (res.success) {
          setUsernameAvailable(true);
        } else {
          setUsernameAvailable(false);
        }
      } catch {
        setUsernameAvailable(null);
      } finally {
        setCheckingUsername(false);
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [username, hostEmail]);

  useEffect(() => {
    const email = hostEmail?.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setCoOwnerEligible(null);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        setCheckingCoOwnerEmail(true);
        const res = await checkCoOwnerSignupEligibilityAction(email);
        setCoOwnerEligible(res.success && res.data?.eligible === true);
      } catch {
        setCoOwnerEligible(null);
      } finally {
        setCheckingCoOwnerEmail(false);
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [hostEmail]);

  const tipperForm = useForm<TipperSignUpFormData>({
    resolver: zodResolver(tipperSignUpSchema),
    defaultValues: {
      fullName: "",
      email: "",
      acceptedTerms: false,
    },
  });

  const onSubmitHost = async (values: HostSignUpFormData) => {
    try {
      setIsHostLoading(true);

      const res = await registerHostAction({
        ...values,
        visitorId: visitorIdForMerge,
        ...buildSignupAttributionPayload("sign_up_page"),
      });
      if (!res.success) {
        toast.error(res.message);
        return;
      }

      const parsed = parseAuthResponse(res.data);
      if (!parsed) {
        toast.error("Unexpected signup response — please try again");
        return;
      }

      const { message } = parsed;
      toast.success(message);

      push(hostVerifyRedirectPath(values.username, values.email));
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else if (typeof err === "object" && err !== null && "error" in err) {
        const apiErr = err as ApiError;
        toast.error(apiErr.error.message);
      } else {
        toast.error("Failed to register host");
      }
    } finally {
      setIsHostLoading(false);
    }
  };

  const onSubmitTipper = async (values: TipperSignUpFormData) => {
    try {
      setIsTipperLoading(true);

      const res = await registerTipperAction({
        ...values,
        visitorId: visitorIdForMerge,
        ...buildSignupAttributionPayload("sign_up_page"),
      });
      if (!res.success) {
        toast.error(res.message);
        return;
      }

      const parsed = parseAuthResponse(res.data);
      if (!parsed) {
        toast.error("Unexpected signup response — please try again");
        return;
      }

      const { message } = parsed;
      toast.success(message || "Tipper account created");

      const next = safeInternalPath(redirectParam) ?? "/explore";
      push(
        buildVerifyEmailPath({
          email: values.email.trim(),
          accountType: "TIPPER",
          next,
        })
      );
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else if (typeof err === "object" && err !== null && "error" in err) {
        const apiErr = err as ApiError;
        toast.error(apiErr.error.message);
      } else {
        toast.error("Failed to register tipper");
      }
    } finally {
      setIsTipperLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <Tabs
        value={userType}
        onValueChange={val => setUserType(val as "host" | "tipper")}
        className="section lg:py-12"
      >
        <TabsList className="bg-secondary/20 flex h-14! w-full">
          <TabsTrigger
            value="host"
            className="h-13! font-semibold"
          >
            Host creator
          </TabsTrigger>
          <TabsTrigger
            value="tipper"
            className="h-13! font-semibold"
          >
            Tipper
          </TabsTrigger>
        </TabsList>

        <Paragraph
          align="center"
          size="sm"
          color="muted"
          className="relative flex items-center justify-center gap-1"
        >
          {userType === "host"
            ? "Add content / event / community"
            : "Send tips and join communities"}

          {userType === "host" ? null : (
            <span
              onClick={toggleTipperInfo}
              className="cursor-pointer"
            >
              <Info className="size-3" />
            </span>
          )}

          {userType === "host" && (
            <span
              onClick={toggleHostInfo}
              className="cursor-pointer"
            >
              <Info className="size-3" />
            </span>
          )}

          {userType !== "host" && (
            <span className="absolute top-4 right-0 left-0 block w-full text-center text-[10px]">
              {showTipperInfo &&
                "- a host creator account gets you a tipper account by default"}
            </span>
          )}

          {userType === "host" && (
            <span className="absolute top-4 right-0 left-0 block w-full text-center text-[10px]">
              {showHostInfo && "- create a channel and add to your platform"}
            </span>
          )}
        </Paragraph>

        {/* Host form */}
        <TabsContent
          value="host"
          className="space-y-6"
        >
          <Form {...hostForm}>
            <form
              onSubmit={hostForm.handleSubmit(onSubmitHost)}
              className="space-y-6"
            >
              <FormField
                control={hostForm.control}
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

              {/* EMAIL FIELD */}
              <FormField
                control={hostForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter email address"
                        autoComplete="off"
                        {...field}
                        readOnly={!!emailParam}
                        className={
                          emailParam ? "bg-gray cursor-not-allowed" : ""
                        }
                      />
                    </FormControl>
                    {checkingCoOwnerEmail ? (
                      <p className="text-muted-foreground text-sm">
                        Checking co-owner eligibility…
                      </p>
                    ) : null}
                    {!checkingCoOwnerEmail &&
                    hostEmail?.trim() &&
                    coOwnerEligible === true ? (
                      <p className="text-success text-sm">
                        Email linked to a co-owner invite ✓
                      </p>
                    ) : null}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* USERNAME FIELD */}
              {slideUsernameField && (
                <div className="space-y-1">
                  <FormField
                    control={hostForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>

                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Choose a username"
                            onChange={e => {
                              isUsernameTouched.current = true;
                              field.onChange(e);
                            }}
                          />
                        </FormControl>

                        <FormMessage />

                        {checkingUsername && (
                          <p className="text-muted-foreground text-sm">
                            Checking availability...
                          </p>
                        )}

                        {!checkingUsername &&
                          username &&
                          usernameAvailable === true && (
                            <p className="text-success text-sm">
                              Username is available ✓
                            </p>
                          )}

                        {!checkingUsername &&
                          username &&
                          usernameAvailable === false && (
                            <p className="text-destructive text-sm">
                              Username is already taken
                            </p>
                          )}
                      </FormItem>
                    )}
                  />

                  <span className="text-muted-foreground text-xs">
                    This will be your unique creator username
                  </span>
                </div>
              )}

              {/* PASSWORD AND CONFIRM PASSWORD FIELDS */}
              {slidePasswordFields && (
                <FormField
                  control={hostForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Set password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Create password"
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
              )}

              {slideConfirmPasswordField && (
                <FormField
                  control={hostForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Confirm password"
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
              )}

              {/* ACCEPTED TERMS AND PRIVACY POLICY */}
              <FormField
                control={hostForm.control}
                name="acceptedTerms"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center gap-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="text-sm font-normal">
                        <TermsPrivacyLabel />
                      </FormLabel>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={
                  isHostLoading ||
                  checkingUsername ||
                  usernameAvailable === false
                }
              >
                {isHostLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" /> Creating
                    account...
                  </span>
                ) : (
                  <span>Create account</span>
                )}
              </Button>

              <Paragraph
                align="center"
                size="sm"
              >
                Already have an account?{" "}
                <Link
                  href="/sign-in"
                  className="text-primary hover:underline"
                >
                  Sign in
                </Link>
              </Paragraph>
            </form>
          </Form>
        </TabsContent>

        {/* Tipper form */}
        <TabsContent
          value="tipper"
          className="space-y-6"
        >
          <Form {...tipperForm}>
            <form
              onSubmit={tipperForm.handleSubmit(onSubmitTipper)}
              className="space-y-6"
            >
              <FormField
                control={tipperForm.control}
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
                control={tipperForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter email address"
                        autoComplete="off"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={tipperForm.control}
                name="acceptedTerms"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center gap-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="text-sm font-normal">
                        <TermsPrivacyLabel />
                      </FormLabel>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={isTipperLoading}
              >
                {isTipperLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" /> Creating
                    account...
                  </span>
                ) : (
                  <span>Create account</span>
                )}
              </Button>

              <Paragraph
                align="center"
                size="sm"
              >
                Already have an account?{" "}
                <Link
                  href="/sign-in"
                  className="text-primary hover:underline"
                >
                  Sign in
                </Link>
              </Paragraph>
            </form>
          </Form>
        </TabsContent>
      </Tabs>
    </div>
  );
};
