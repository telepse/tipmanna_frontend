"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import OTPInput from "react-otp-input";
import { useMediaQuery } from "react-responsive";

// Third-party imports
import { useForm } from "react-hook-form";
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
import { Eye, Loader2, MoveLeft } from "lucide-react";
import { toast } from "react-toastify";
import { useDispatch, useSelector } from "react-redux";

// Local imports
import {
  HostSignInFormData,
  hostSignInSchema,
  hostSignUpSchema,
  type HostSignUpFormData,
} from "@/schemas/host.schema";
import {
  TipperSignInFormData,
  tipperSignInSchema,
} from "@/schemas/tipper.schema";
import { Paragraph } from "@/components/shared/paragraph";
import {
  forgotPasswordAction,
  loginHostAction,
  loginOrRegisterHostAction,
  loginOrRegisterTipperAction,
  loginTipperAction,
  requestLoginCodeAction,
  verifyCodeAction,
} from "@/actions/auth";
import { setCredentials } from "@/features/auth-slice";
import { ApiError } from "@/types/api-error.types";
import { useAppRouter } from "@/components/navigation/navigation-progress-provider";
import {
  isUnverifiedHostMessage,
  parseAuthResponse,
} from "@/lib/auth-response";
import { persistAuthSession } from "@/lib/session-client";
import { getVisitorIdForAuthMerge } from "@/lib/visitor-session";
import { store, type RootState } from "@/redux/store";

type HostAuthView = "signIn" | "signUp" | "forgotPassword" | "verifyEmail";

function safeInternalPath(next: string | null): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}

export type SigninFormProps = {
  mode?: "page" | "modal";
  /** Deep link after sign-in (same as ?next= / ?redirect=). */
  returnTo?: string | null;
  /** Modal flows that require a tipper (e.g. dedicated community link). */
  defaultUserType?: "host" | "tipper";
  /** Called when host signs in successfully inside a modal (no navigation). */
  onModalHostSuccess?: (payload: {
    role: "HOST";
    username: string;
    eventSlug: string | null;
  }) => void;
  /** Called when tipper verifies email inside a modal (no navigation). */
  onModalTipperSuccess?: () => void;
  /** When true, host tab can toggle inline sign-up instead of navigating away. */
  allowInlineSignUp?: boolean;
  className?: string;
};

export const SigninForm = ({
  mode = "page",
  returnTo: returnToProp,
  defaultUserType = "host",
  onModalHostSuccess,
  onModalTipperSuccess,
  allowInlineSignUp = false,
  className,
}: SigninFormProps = {}) => {
  const [userType, setUserType] = useState<"host" | "tipper">(
    () => defaultUserType
  );
  const [hostStep, setHostStep] = useState<"signIn" | "signUp">("signIn");
  const [hostAuthView, setHostAuthView] = useState<HostAuthView>("signIn");
  const [hostVerifyEmail, setHostVerifyEmail] = useState("");
  const [hostVerifyCode, setHostVerifyCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [tipperStep, setTipperStep] = useState<"email" | "verify">("email");
  const [tipperCode, setTipperCode] = useState("");
  const [tipperAcceptedTerms, setTipperAcceptedTerms] = useState(false);
  const [tipperAccountTag, setTipperAccountTag] = useState<string | null>(null);

  const authUser = useSelector((s: RootState) => s.auth.user);
  const authToken = useSelector((s: RootState) => s.auth.token);
  const visitorIdForMerge = getVisitorIdForAuthMerge(authUser);

  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email");
  const returnTo = safeInternalPath(
    returnToProp ?? searchParams.get("next") ?? searchParams.get("redirect")
  );

  // NEW: loading states
  const [isHostLoading, setIsHostLoading] = useState(false);
  const [isTipperLoading, setIsTipperLoading] = useState(false);

  const { push } = useAppRouter();
  const dispatch = useDispatch();
  const isMobile = useMediaQuery({ query: "(max-width: 500px)" });
  const otpInputStyle = {
    background: "#f7c87c80",
    width: isMobile ? "36px" : "44px",
    height: isMobile ? "36px" : "50px",
    margin: isMobile ? "0 4px" : "0 8px",
    borderRadius: isMobile ? "4px" : "8px",
    outline: "none",
    fontSize: isMobile ? "16px" : "20px",
  };

  const signupHref = returnTo
    ? `/create-account?redirect=${encodeURIComponent(returnTo)}`
    : "/create-account";

  const togglePasswordVisibility = () => {
    setShowPassword(prev => !prev);
  };

  // 1. Define Host form
  const hostForm = useForm<HostSignInFormData>({
    resolver: zodResolver(hostSignInSchema),
    defaultValues: {
      email: emailParam || "",
      password: "",
    },
  });

  const signUpForm = useForm<HostSignUpFormData>({
    resolver: zodResolver(hostSignUpSchema),
    defaultValues: {
      fullName: "",
      email: emailParam || "",
      password: "",
      confirmPassword: "",
      acceptedTerms: false,
    },
  });

  // 2. Define Tipper form
  const tipperForm = useForm<TipperSignInFormData>({
    resolver: zodResolver(tipperSignInSchema),
    defaultValues: {
      email: "",
    },
  });

  const finishHostAuth = async (
    parsed: NonNullable<ReturnType<typeof parseAuthResponse>>
  ) => {
    const { user, token, message } = parsed;
    toast.success(message);
    dispatch(
      setCredentials({
        user: { ...user, role: "HOST" },
        token,
      })
    );
    await persistAuthSession(token, user, { expiresDays: 7 });
    if (mode === "modal" && onModalHostSuccess) {
      onModalHostSuccess({
        role: "HOST",
        username: user.username,
        eventSlug: user.eventSlug ?? null,
      });
      return;
    }
    const dest = returnTo;
    push(dest ?? `/host/${user.eventSlug ?? user.username}`);
  };

  const onSubmitHostSignUp = async (values: HostSignUpFormData) => {
    if (values.password !== values.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    try {
      setIsHostLoading(true);
      const res = await loginOrRegisterHostAction({
        fullName: values.fullName,
        email: values.email,
        password: values.password,
        acceptedTerms: values.acceptedTerms,
        visitorId: visitorIdForMerge,
      });
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      const parsed = parseAuthResponse(res.data);
      if (!parsed) {
        toast.error("Unexpected sign-up response");
        return;
      }
      if (mode === "modal") {
        dispatch(
          setCredentials({
            user: { ...parsed.user, role: "HOST" },
            token: parsed.token,
            requiresVerification: true,
          })
        );
        setHostVerifyEmail(values.email);
        setHostAuthView("verifyEmail");
        toast.success(parsed.message);
        return;
      }
      await finishHostAuth(parsed);
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error("Failed to create host account");
      }
    } finally {
      setIsHostLoading(false);
    }
  };

  // 3. Define host submit handler
  const onSubmitHost = async (values: HostSignInFormData) => {
    try {
      setIsHostLoading(true);

      const res = await loginHostAction({
        ...values,
        visitorId: visitorIdForMerge,
      });
      if (!res.success) {
        if (isUnverifiedHostMessage(res.message)) {
          toast.info("Verify your email to continue — we sent you a code.");
          if (mode === "modal") {
            setHostVerifyEmail(values.email);
            setHostAuthView("verifyEmail");
            return;
          }
          const emailQ = encodeURIComponent(values.email);
          push(
            returnTo
              ? `/verify-email?email=${emailQ}&next=${encodeURIComponent(returnTo)}`
              : `/verify-email?email=${emailQ}`
          );
          return;
        }
        toast.error(res.message);
        return;
      }

      const parsed = parseAuthResponse(res.data);
      if (!parsed) {
        toast.error("Unexpected sign-in response");
        return;
      }

      await finishHostAuth(parsed);
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else if (typeof err === "object" && err !== null && "error" in err) {
        const apiErr = err as ApiError;
        toast.error(apiErr.error.message);
      } else {
        toast.error("Failed to sign in host");
      }
    } finally {
      setIsHostLoading(false);
    }
  };

  // 4. Define tipper submit handler
  const onSubmitTipper = async (values: TipperSignInFormData) => {
    try {
      setIsTipperLoading(true);

      const res =
        mode === "modal"
          ? await loginOrRegisterTipperAction({
              fullName: "",
              email: values.email,
              acceptedTerms: tipperAcceptedTerms,
              visitorId: visitorIdForMerge,
            })
          : await loginTipperAction({
              ...values,
              visitorId: visitorIdForMerge,
            });

      if (!res.success) {
        toast.error(res.message);
        return;
      }

      const parsed = parseAuthResponse(res.data);
      if (!parsed) {
        toast.error("Unexpected sign-in response");
        return;
      }

      const { user, token, message, role, tag } = parsed;
      toast.success(message);
      setTipperAccountTag(tag ?? null);

      dispatch(
        setCredentials({
          user: { ...user, role },
          token,
          requiresVerification: true,
          tag: tag ?? null,
        })
      );

      if (mode === "modal") {
        setTipperStep("verify");
        return;
      }

      if (role === "TIPPER") {
        await persistAuthSession(token, user, { expiresDays: 60 });
      } else {
        await persistAuthSession(token, user, { expiresDays: 7 });
      }

      push(
        returnTo
          ? `/verify-email?next=${encodeURIComponent(returnTo)}`
          : "/verify-email"
      );
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else if (typeof err === "object" && err !== null && "error" in err) {
        const apiErr = err as ApiError;
        toast.error(apiErr.error.message);
      } else {
        toast.error("Failed to sign in tipper");
      }
    } finally {
      setIsTipperLoading(false);
    }
  };

  const handleModalTipperVerify = async () => {
    try {
      setIsTipperLoading(true);
      const user = authUser ?? store.getState().auth.user;
      const token = authToken ?? store.getState().auth.token;
      if (!user?.email || !token) return;

      const verifyRes = await verifyCodeAction(user.email, tipperCode);
      if (!verifyRes.success) {
        toast.error(verifyRes.message ?? "Verification failed");
        return;
      }

      dispatch(
        setCredentials({
          user,
          token,
          requiresVerification: false,
        })
      );

      await persistAuthSession(
        token,
        {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          username: user.username,
          role: user.role,
        },
        { expiresDays: user.role === "HOST" ? 7 : 60 }
      );

      toast.success("Email verified successfully!");
      onModalTipperSuccess?.();
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else if (typeof err === "object" && err !== null && "error" in err) {
        const apiErr = err as ApiError;
        toast.error(apiErr.error.message);
      } else {
        toast.error("Failed to verify tipper");
      }
    } finally {
      setIsTipperLoading(false);
    }
  };

  const handleRequestLoginCode = async (values: { email: string }) => {
    try {
      setIsHostLoading(true);

      if (!values.email) {
        toast.error("Put in your email address first");
        return;
      }

      const res = await requestLoginCodeAction({ email: values.email });
      if (!res.success) {
        toast.error(res.message);
        return;
      }

      toast.success(
        (res.data as { message?: string })?.message ??
          "Verification code sent — check your email"
      );

      if (mode === "modal") {
        setHostVerifyEmail(values.email);
        setHostAuthView("verifyEmail");
        return;
      }

      const emailQ = encodeURIComponent(values.email);
      push(
        returnTo
          ? `/verify-email?email=${emailQ}&next=${encodeURIComponent(returnTo)}`
          : `/verify-email?email=${emailQ}`
      );
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else if (typeof err === "object" && err !== null && "error" in err) {
        const apiErr = err as ApiError;
        toast.error(apiErr.error.message);
      } else {
        toast.error("Failed to request verification code");
      }
    } finally {
      setIsHostLoading(false);
    }
  };

  const handleModalHostVerify = async () => {
    try {
      setIsHostLoading(true);
      const user = authUser ?? store.getState().auth.user;
      const token = authToken ?? store.getState().auth.token;
      const email = hostVerifyEmail || user?.email;
      if (!email || !token) return;

      const verifyRes = await verifyCodeAction(email, hostVerifyCode);
      if (!verifyRes.success) {
        toast.error(verifyRes.message ?? "Verification failed");
        return;
      }

      const parsed = parseAuthResponse(verifyRes.data);
      const sessionUser = parsed?.user ?? user;
      const sessionToken = parsed?.token ?? token;
      if (!sessionUser || !sessionToken) {
        toast.error("Verification succeeded but session could not be restored");
        return;
      }

      dispatch(
        setCredentials({
          user: { ...sessionUser, role: "HOST" },
          token: sessionToken,
          requiresVerification: false,
        })
      );

      await persistAuthSession(sessionToken, sessionUser, { expiresDays: 7 });
      toast.success("Email verified successfully!");
      setHostAuthView("signIn");
      setHostStep("signIn");
      onModalHostSuccess?.({
        role: "HOST",
        username: sessionUser.username,
        eventSlug:
          "eventSlug" in sessionUser ? (sessionUser.eventSlug ?? null) : null,
      });
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error("Failed to verify email");
      }
    } finally {
      setIsHostLoading(false);
    }
  };

  const handleForgotPassword = async (email: string) => {
    try {
      setIsHostLoading(true);
      const res = await forgotPasswordAction(email);
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      toast.success(
        (res.data as { message?: string })?.message ??
          "If an account exists, a reset link was sent."
      );
      setHostAuthView("signIn");
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error("Failed to send reset link");
      }
    } finally {
      setIsHostLoading(false);
    }
  };

  return (
    <div className={className ? "" : "mx-auto max-w-2xl"}>
      <Tabs
        value={userType}
        onValueChange={val => setUserType(val as "host" | "tipper")}
        className={`${className ? className : "section lg:py-12"}`}
      >
        <TabsList className="bg-secondary/20 flex h-14! w-full">
          <TabsTrigger
            value="host"
            data-testid="signin-tab-host"
            className="h-13! font-semibold"
          >
            Host creator
          </TabsTrigger>
          <TabsTrigger
            value="tipper"
            data-testid="signin-tab-tipper"
            className="h-13! font-semibold"
          >
            Tipper
          </TabsTrigger>
        </TabsList>

        <Paragraph
          align="center"
          size="sm"
          color="muted"
        >
          {userType === "host"
            ? "Add content or event"
            : "Engage on content and join event"}
        </Paragraph>

        {/* Host form */}
        <TabsContent
          value="host"
          className="mt-6 space-y-6"
        >
          <div key={`host-${hostAuthView}-${hostStep}`}>
            {mode === "modal" && hostAuthView === "forgotPassword" ? (
              <div className="space-y-6">
                <h2 className="text-center text-xl font-semibold">
                  Reset your password
                </h2>
                <Form {...hostForm}>
                  <form
                    onSubmit={hostForm.handleSubmit(
                      values => void handleForgotPassword(values.email)
                    )}
                    className="space-y-6"
                  >
                    <FormField
                      control={hostForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="Enter email address"
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
                      className="w-full"
                      disabled={isHostLoading}
                    >
                      {isHostLoading ? "Sending…" : "Send reset link"}
                    </Button>
                  </form>
                </Form>
                <button
                  type="button"
                  className="text-primary flex items-center gap-1 text-sm hover:underline"
                  onClick={() => setHostAuthView("signIn")}
                >
                  <MoveLeft className="size-4" /> Back to sign in
                </button>
              </div>
            ) : mode === "modal" && hostAuthView === "verifyEmail" ? (
              <div className="relative flex flex-col items-center justify-center gap-6 px-2">
                <h2 className="mt-2 text-center text-2xl font-semibold">
                  Verify your email
                </h2>
                <Paragraph
                  align="center"
                  size="sm"
                  color="muted"
                >
                  We&apos;ve sent a 6-digit code to{" "}
                  <strong>{hostVerifyEmail}</strong>.
                </Paragraph>
                <div className="react-otp-input">
                  <OTPInput
                    value={hostVerifyCode}
                    onChange={setHostVerifyCode}
                    numInputs={6}
                    renderInput={props => <input {...props} />}
                    inputStyle={otpInputStyle}
                    shouldAutoFocus
                  />
                </div>
                <Button
                  type="button"
                  size="lg"
                  className="w-full bg-black"
                  disabled={isHostLoading || hostVerifyCode.length < 6}
                  onClick={() => void handleModalHostVerify()}
                >
                  {isHostLoading ? "Verifying email..." : "Verify email"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="hover:bg-gray absolute top-0 left-0 border-none outline-none hover:text-black"
                  onClick={() => setHostAuthView("signIn")}
                >
                  <MoveLeft /> Back
                </Button>
              </div>
            ) : allowInlineSignUp && hostStep === "signUp" ? (
              <Form {...signUpForm}>
                <form
                  onSubmit={signUpForm.handleSubmit(onSubmitHostSignUp)}
                  className="space-y-6"
                >
                  <FormField
                    control={signUpForm.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Your name"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={signUpForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="Enter email address"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={signUpForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Create password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={signUpForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Confirm password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={signUpForm.control}
                    name="acceptedTerms"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start gap-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="leading-snug font-normal">
                          I agree to the terms and privacy policy
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full"
                    disabled={isHostLoading}
                  >
                    {isHostLoading
                      ? "Creating account…"
                      : "Create host account"}
                  </Button>
                  <Paragraph
                    align="center"
                    size="sm"
                  >
                    Already have an account?{" "}
                    <button
                      type="button"
                      className="text-primary hover:underline"
                      onClick={() => setHostStep("signIn")}
                    >
                      Sign in
                    </button>
                  </Paragraph>
                </form>
              </Form>
            ) : (
              <Form {...hostForm}>
                <form
                  onSubmit={hostForm.handleSubmit(onSubmitHost)}
                  className="space-y-6"
                >
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
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={hostForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder="Enter password"
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

                  <button
                    type="button"
                    data-testid="signin-request-login-code"
                    onClick={() =>
                      handleRequestLoginCode({
                        email: hostForm.getValues("email"),
                      })
                    }
                    className="text-muted-foreground cursor-pointer text-sm underline"
                  >
                    Request login code instead?
                  </button>

                  <Paragraph
                    align="right"
                    size="sm"
                    color="muted"
                  >
                    {mode === "modal" ? (
                      <button
                        type="button"
                        className="hover:underline"
                        onClick={() => setHostAuthView("forgotPassword")}
                      >
                        Forgot password?
                      </button>
                    ) : (
                      <Link
                        href="/forgot-password"
                        className="hover:underline"
                      >
                        Forgot password?
                      </Link>
                    )}
                  </Paragraph>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full"
                    data-testid="signin-host-submit"
                    disabled={isHostLoading}
                  >
                    {isHostLoading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="size-4 animate-spin" /> Signing
                        in...
                      </span>
                    ) : (
                      <span>Sign in</span>
                    )}
                  </Button>

                  <Paragraph
                    align="center"
                    size="sm"
                  >
                    Don&apos;t have an account?{" "}
                    {allowInlineSignUp ? (
                      <button
                        type="button"
                        className="text-primary hover:underline"
                        onClick={() => setHostStep("signUp")}
                      >
                        Sign up
                      </button>
                    ) : (
                      <Link
                        href={signupHref}
                        className="text-primary hover:underline"
                      >
                        Sign up
                      </Link>
                    )}
                  </Paragraph>
                </form>
              </Form>
            )}
          </div>
        </TabsContent>

        {/* Tipper form */}
        <TabsContent
          value="tipper"
          className="space-y-6"
        >
          {mode === "modal" && tipperStep === "verify" ? (
            <div className="relative flex flex-col items-center justify-center gap-6 px-2">
              <h2 className="mt-2 text-center text-2xl font-semibold">
                Verify your email
              </h2>
              <Paragraph
                align="center"
                size="sm"
                color="muted"
              >
                We&apos;ve sent a 6-digit code to{" "}
                <strong>{tipperForm.getValues("email")}</strong>.
                {tipperAccountTag === "NEW_TIPPER"
                  ? " We created a free tipper account for this email."
                  : tipperAccountTag === "EXISTING_HOST"
                    ? " This email belongs to a host account — verify to continue."
                    : null}
              </Paragraph>
              <div className="react-otp-input">
                <OTPInput
                  value={tipperCode}
                  onChange={setTipperCode}
                  numInputs={6}
                  renderInput={props => <input {...props} />}
                  inputStyle={otpInputStyle}
                  shouldAutoFocus
                />
              </div>
              <Button
                type="button"
                size="lg"
                className="w-full bg-black"
                disabled={isTipperLoading || tipperCode.length < 6}
                onClick={() => void handleModalTipperVerify()}
              >
                {isTipperLoading ? "Verifying email..." : "Verify email"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="hover:bg-gray absolute top-0 left-0 border-none outline-none hover:text-black"
                onClick={() => setTipperStep("email")}
              >
                <MoveLeft /> Back
              </Button>
            </div>
          ) : (
            <Form {...tipperForm}>
              <form
                onSubmit={tipperForm.handleSubmit(onSubmitTipper)}
                className="mt-6 space-y-6"
              >
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

                {mode === "modal" ? (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={tipperAcceptedTerms}
                      onCheckedChange={v => setTipperAcceptedTerms(v === true)}
                      className="data-[state=checked]:border-black! data-[state=checked]:bg-black!"
                    />
                    <Paragraph
                      size="sm"
                      className="text-sm font-normal"
                    >
                      I agree to the Terms and Privacy Policy
                    </Paragraph>
                  </div>
                ) : null}

                <Paragraph
                  align="center"
                  size="sm"
                  color="muted"
                >
                  {mode === "modal"
                    ? "No account yet? Continue and we will create a free tipper account when you verify."
                    : "Use your Tipmanna tipper email — we'll send a verification code."}
                </Paragraph>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  data-testid="signin-tipper-submit"
                  disabled={
                    isTipperLoading ||
                    (mode === "modal" && !tipperAcceptedTerms)
                  }
                >
                  {isTipperLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="size-4 animate-spin" /> Sending
                      code...
                    </span>
                  ) : (
                    <span>{mode === "modal" ? "Continue" : "Sign in"}</span>
                  )}
                </Button>

                {mode === "page" ? (
                  <Paragraph
                    align="center"
                    size="sm"
                  >
                    Don&apos;t have an account?{" "}
                    <Link
                      href={signupHref}
                      className="text-primary hover:underline"
                    >
                      Sign up
                    </Link>
                  </Paragraph>
                ) : null}
              </form>
            </Form>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
