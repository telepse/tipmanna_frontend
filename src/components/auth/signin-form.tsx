"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { usePathname, useSearchParams } from "next/navigation";

import Link from "next/link";

import { TermsPrivacyLabel } from "@/components/auth/terms-privacy-label";

import OTPInput from "react-otp-input";

import { useMediaQuery } from "react-responsive";

/* Third-party imports */

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

import { Eye, Info, Loader2, MoveLeft } from "lucide-react";

import { toast } from "react-toastify";

import { useDispatch, useSelector } from "react-redux";

/* Local imports */

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

import { type SignInModalPayload } from "@/components/auth/sign-in-dialog";

import { AlreadySignedInNotice } from "@/components/auth/already-signed-in-notice";

import {
  checkCoOwnerSignupEligibilityAction,
  checkHostUsernameAvailabilityAction,
  forgotPasswordAction,
  loginHostAction,
  loginOrRegisterHostAction,
  loginOrRegisterTipperAction,
  loginTipperAction,
  requestLoginCodeAction,
  resendCodeAction,
  verifyCodeAction,
} from "@/actions/auth";

import { setCredentials } from "@/features/auth-slice";

import { ApiError } from "@/types/api-error.types";

import { useAppRouter } from "@/components/navigation/navigation-progress-provider";

import {
  isClaimedHostExistsMessage,
  isPendingEmailVerification,
  isUnclaimedHostClaimMessage,
  isUnverifiedHostMessage,
  parseAuthResponse,
} from "@/lib/auth-response";

import { HostAuthHandoffBanner } from "@/components/auth/host-auth-handoff-banner";

import {
  persistAuthSession,
  persistHostSession,
  clearHostSession,
} from "@/lib/session-client";

import { performAuthLogout } from "@/lib/auth-logout";

import { applyPrimaryAndHostSessions } from "@/lib/apply-auth-sessions";

import { notifyHostSessionTouched } from "@/lib/host-session-probe";

import { getVisitorIdForAuthMerge } from "@/lib/visitor-session";

import { resolvePostHostAuthDestination } from "@/lib/post-host-auth-destination";

import { parseAuthErrorFromBody } from "@/lib/host-auth-fetch";

import { buildVerifyEmailPath } from "@/lib/verify-email-path";

import { resolvedEmailFromAuthPayload } from "@/lib/resolved-auth-email";

import { store, type AppDispatch, type RootState } from "@/redux/store";

import {
  buildSignupAttributionPayload,
  type SignupSurface,
} from "@/lib/signup-attribution";

import { InputOTPSeparator } from "../ui/input-otp";
import {
  resolveInitialHostAuthView,
  type HostAuthViewKind,
} from "@/lib/signin-form-host-view";

type HostAuthView = HostAuthViewKind | "forgotPassword" | "verifyEmail";

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

  /**
   * When true, the Tipper tab remains visible but cannot be selected.
   * Used on creator profiles where authentication must remain in Host creator
   * context.
   */
  freezeTipperTab?: boolean;

  /** Called when host signs in successfully inside a modal (no navigation). */
  onModalHostSuccess?: (payload: {
    role: "HOST";
    username: string;
    eventSlug: string | null;
  }) => void;

  /** Called when tipper verifies email inside a modal (no navigation). */
  onModalTipperSuccess?: (payload: SignInModalPayload) => void;

  /**
   * Retained for compatibility with existing callers.
   *
   * Host sign-up is now the default inline view. This prop no longer controls
   * whether the default sign-up view is rendered.
   */
  allowInlineSignUp?: boolean;

  /** Analytics: UI surface that opened this sign-in flow. */
  signupSurface: SignupSurface;

  /** Modal: override initial Host sign-in vs sign-up (default sign-up). */
  defaultHostAuthView?: HostAuthViewKind;

  className?: string;
};

export const SigninForm = ({
  mode = "page",
  returnTo: returnToProp,
  defaultUserType = "host",
  freezeTipperTab = false,
  onModalHostSuccess,
  onModalTipperSuccess,
  allowInlineSignUp = false,
  signupSurface,
  defaultHostAuthView: defaultHostAuthViewProp,
  className,
}: SigninFormProps) => {
  const searchParams = useSearchParams();

  const pathname = usePathname();

  const emailParam = searchParams.get("email");
  const nameParam = searchParams.get("name");
  const tabParam = searchParams.get("tab");

  const returnTo = safeInternalPath(
    returnToProp ?? searchParams.get("next") ?? searchParams.get("redirect")
  );

  /*
   * Standalone authentication pages have route-specific initial Host views:
   *
   * /sign-in -> Host sign-in
   * /sign-up -> Host sign-up
   *
   * Modal authentication keeps Host sign-up as its default view.
   */
  const initialHostAuthView: HostAuthView = resolveInitialHostAuthView({
    mode,
    pathname,
    defaultHostAuthView: defaultHostAuthViewProp,
  });

  const initialHostStep: "signIn" | "signUp" =
    initialHostAuthView === "signIn" ? "signIn" : "signUp";

  /*
   * When the Tipper tab is frozen, Host creator must always remain selected.
   */
  const [userType, setUserType] = useState<"host" | "tipper">(() => {
    if (freezeTipperTab) {
      return "host";
    }

    if (tabParam === "tipper" || tabParam === "host") {
      return tabParam;
    }

    return defaultUserType;
  });

  const [hostStep, setHostStep] = useState<"signIn" | "signUp">(
    initialHostStep
  );

  const [hostAuthView, setHostAuthView] =
    useState<HostAuthView>(initialHostAuthView);

  const [hostVerifyEmail, setHostVerifyEmail] = useState("");

  const [hostVerifyCode, setHostVerifyCode] = useState("");

  const [hostResendCooldown, setHostResendCooldown] = useState(0);

  const [showPassword, setShowPassword] = useState(false);

  const [tipperStep, setTipperStep] = useState<"email" | "verify">("email");

  const [tipperCode, setTipperCode] = useState("");

  const [tipperAcceptedTerms, setTipperAcceptedTerms] = useState(false);

  const [tipperAccountTag, setTipperAccountTag] = useState<string | null>(null);

  const [tipperHasHostAccount, setTipperHasHostAccount] = useState(false);

  const [tipperHostCodeFlow, setTipperHostCodeFlow] = useState(false);

  const [tipperHostVerifyCode, setTipperHostVerifyCode] = useState("");

  const authUser = useSelector((s: RootState) => s.auth.user);

  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);

  const authToken = useSelector((s: RootState) => s.auth.token);

  const visitorIdForMerge = getVisitorIdForAuthMerge(authUser);

  const signupAttribution = buildSignupAttributionPayload(signupSurface);

  const [checkingUsername, setCheckingUsername] = useState(false);
  const [checkingCoOwnerEmail, setCheckingCoOwnerEmail] = useState(false);
  const [hostEmailStatus, setHostEmailStatus] = useState<{
    host: "none" | "unclaimed" | "claimed";
    inviteEligible: boolean;
  } | null>(null);
  const [showUnclaimedSignInBanner, setShowUnclaimedSignInBanner] =
    useState(false);

  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(
    null
  );

  const [showTipperInfo, setShowTipperInfo] = useState(false);

  const [showHostInfo, setShowHostInfo] = useState(false);

  const toggleTipperInfo = () => {
    setShowTipperInfo(prev => !prev);
  };

  const toggleHostInfo = () => {
    setShowHostInfo(prev => !prev);
  };

  const [isHostLoading, setIsHostLoading] = useState(false);

  const [isTipperLoading, setIsTipperLoading] = useState(false);

  const { push } = useAppRouter();

  const dispatch = useDispatch<AppDispatch>();

  const resendCooldownIntervalRef = useRef<number | null>(null);

  const hostVerifyInFlightRef = useRef(false);

  const tipperVerifyInFlightRef = useRef(false);

  const [modalSuccessLock, setModalSuccessLock] = useState(false);

  /*
   * If the Tipper tab is frozen, make Host the active tab even if a query
   * parameter or a previous state value attempted to select Tipper.
   */
  useEffect(() => {
    if (freezeTipperTab && userType !== "host") {
      setUserType("host");
    }
  }, [freezeTipperTab, userType]);

  useEffect(() => {
    return () => {
      if (resendCooldownIntervalRef.current) {
        window.clearInterval(resendCooldownIntervalRef.current);
      }
    };
  }, []);

  const startResendCooldown = () => {
    if (resendCooldownIntervalRef.current) {
      window.clearInterval(resendCooldownIntervalRef.current);
    }

    setHostResendCooldown(30);

    resendCooldownIntervalRef.current = window.setInterval(() => {
      setHostResendCooldown(c => {
        if (c <= 1) {
          if (resendCooldownIntervalRef.current) {
            window.clearInterval(resendCooldownIntervalRef.current);

            resendCooldownIntervalRef.current = null;
          }

          return 0;
        }

        return c - 1;
      });
    }, 1000);
  };

  const isMobile = useMediaQuery({
    query: "(max-width: 500px)",
  });

  const otpInputStyle = {
    background: "#f7c87c80",
    width: isMobile ? "36px" : "44px",
    height: isMobile ? "36px" : "50px",
    margin: isMobile ? "0 4px" : "0 8px",
    borderRadius: isMobile ? "4px" : "8px",
    outline: "none",
    fontSize: isMobile ? "16px" : "20px",
  };

  const signinHref = useMemo(() => {
    return "/sign-in";
  }, []);

  const signupHref = useMemo(() => {
    const params = new URLSearchParams();

    if (emailParam) {
      params.set("email", emailParam);
    }

    if (nameParam) {
      params.set("name", nameParam);
    }

    if (returnTo) {
      params.set("redirect", returnTo);
    }

    const query = params.toString();

    return query ? `/sign-up?${query}` : "/sign-up";
  }, [emailParam, nameParam, returnTo]);

  const togglePasswordVisibility = () => {
    setShowPassword(prev => !prev);
  };

  /*
   * Host sign-in form.
   */
  const hostForm = useForm<HostSignInFormData>({
    resolver: zodResolver(hostSignInSchema),
    defaultValues: {
      emailOrUsername: emailParam || "",
      password: "",
    },
  });

  const hostSignInEmailOrUsername = hostForm.watch("emailOrUsername");

  /*
   * Host sign-up form.
   */
  const signUpForm = useForm<HostSignUpFormData>({
    resolver: zodResolver(hostSignUpSchema),
    mode: "onChange",
    defaultValues: {
      fullName: "",
      email: emailParam || "",
      username: "",
      password: "",
      confirmPassword: "",
      acceptedTerms: false,
    },
  });

  const fullName = signUpForm.watch("fullName");

  const hostEmail = signUpForm.watch("email");

  const username = signUpForm.watch("username");

  const password = signUpForm.watch("password");

  /*
   * Progressive signup fields.
   */
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

  useEffect(() => {
    const prefix = hostEmail ? hostEmail.split("@")[0] : "";

    signUpForm.setValue("username", prefix, {
      shouldValidate: true,
    });
  }, [hostEmail, signUpForm]);

  /*
   * Tipper form.
   */
  const tipperForm = useForm<TipperSignInFormData>({
    resolver: zodResolver(tipperSignInSchema),
    defaultValues: {
      email: "",
    },
  });

  const signUpUsername = signUpForm.watch("username");

  const signUpEmail = signUpForm.watch("email");

  const finishHostAuth = async (
    parsed: NonNullable<ReturnType<typeof parseAuthResponse>>
  ) => {
    if (isPendingEmailVerification(parsed)) {
      if (mode === "modal") {
        setHostVerifyEmail(parsed.user.email);
        setHostAuthView("verifyEmail");
        toast.success(parsed.message);
        return;
      }

      await applyPrimaryAndHostSessions(parsed, dispatch, {
        requiresVerification: true,
      });

      push(
        buildVerifyEmailPath({
          email: parsed.user.email,
          accountType: "HOST",
          next: returnTo,
        })
      );

      return;
    }

    const hostUser = parsed.hostSession?.user;

    const hostSlug = hostUser?.eventSlug ?? null;

    const hostUsername = hostUser?.username ?? parsed.user.username;

    const tipperKeepsPrimarySession =
      mode === "modal" &&
      authUser?.role === "TIPPER" &&
      Boolean(onModalHostSuccess);

    if (mode === "modal" && onModalHostSuccess) {
      setModalSuccessLock(true);
    }

    if (tipperKeepsPrimarySession) {
      const tipperEmail = authUser?.email?.trim().toLowerCase();

      const hostEmail = (hostUser?.email ?? parsed.user.email)
        ?.trim()
        .toLowerCase();

      if (tipperEmail && hostEmail && tipperEmail !== hostEmail) {
        await performAuthLogout(dispatch);

        await clearHostSession();

        const { hostSessionPersisted } = await applyPrimaryAndHostSessions(
          parsed,
          dispatch
        );

        if (parsed.hostSession && !hostSessionPersisted) {
          setModalSuccessLock(false);

          toast.error("Host session could not be saved. Please sign in again.");

          return;
        }
      }

      if (parsed.hostSession?.token) {
        const ok = await persistHostSession(
          parsed.hostSession.token,
          parsed.hostSession.user,
          {
            expiresDays: 7,
          }
        );

        if (!ok) {
          setModalSuccessLock(false);

          toast.error(
            "Host session could not be saved. Please try signing in again."
          );

          return;
        }

        notifyHostSessionTouched({
          active: true,
          hostId: parsed.hostSession.user.id,
          hostSessionExpiresAt: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000
          ).toISOString(),
        });
      }

      toast.success(parsed.message);

      onModalHostSuccess?.({
        role: "HOST",
        username: hostUsername,
        eventSlug: hostSlug,
      });

      return;
    }

    const { hostSessionPersisted } = await applyPrimaryAndHostSessions(
      parsed,
      dispatch
    );

    if (parsed.hostSession && !hostSessionPersisted) {
      setModalSuccessLock(false);

      toast.error("Host session could not be saved. Please sign in again.");

      return;
    }

    toast.success(parsed.message);

    if (mode === "modal" && onModalHostSuccess) {
      onModalHostSuccess({
        role: "HOST",
        username: hostUsername,
        eventSlug: hostSlug,
      });

      return;
    }

    const dest = resolvePostHostAuthDestination({
      hostUsername,
      eventSlug: hostSlug,
      returnTo,
    });

    push(dest);
  };

  const onSubmitHostSignUp = async (values: HostSignUpFormData) => {
    try {
      setIsHostLoading(true);

      const res = await loginOrRegisterHostAction({
        fullName: values.fullName,
        emailOrUsername: values.email,
        email: values.email,
        username: values.username,
        password: values.password,
        acceptedTerms: values.acceptedTerms,
        intent: "register",
        visitorId: visitorIdForMerge,
        ...signupAttribution,
      });

      if (!res.success) {
        if (isClaimedHostExistsMessage(res.message)) {
          setHostEmailStatus(prev =>
            prev
              ? { ...prev, host: "claimed" }
              : { host: "claimed", inviteEligible: false }
          );
          return;
        }
        toast.error(res.message);
        return;
      }

      const parsed = parseAuthResponse(res.data);

      if (!parsed) {
        toast.error("Unexpected sign-up response");
        return;
      }

      if (mode === "modal") {
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

          const resolvedEmail =
            parseAuthErrorFromBody(res.validationBody).email?.trim() ||
            values.emailOrUsername.trim();

          if (mode === "modal") {
            setHostVerifyEmail(resolvedEmail);
            setHostAuthView("verifyEmail");

            return;
          }

          push(
            buildVerifyEmailPath({
              email: resolvedEmail,
              accountType: "HOST",
              next: returnTo,
            })
          );

          return;
        }

        if (isUnclaimedHostClaimMessage(res.message)) {
          setShowUnclaimedSignInBanner(true);
          return;
        }

        toast.error(res.message);

        return;
      }

      setShowUnclaimedSignInBanner(false);

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
              ...signupAttribution,
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

      setTipperAccountTag(parsed.tag ?? null);

      setTipperHasHostAccount(parsed.hasHostAccount === true);

      setTipperHostCodeFlow(false);

      toast.success(parsed.message);

      if (mode === "modal") {
        setTipperStep("verify");
        return;
      }

      await applyPrimaryAndHostSessions(parsed, dispatch, {
        requiresVerification: true,
      });

      push(
        buildVerifyEmailPath({
          email: values.email.trim(),
          accountType: "TIPPER",
          next: returnTo ?? "/explore",
        })
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

      const email = tipperForm.getValues("email")?.trim();

      if (!email) {
        toast.error("Missing email for verification");
        return;
      }

      const verifyRes = await verifyCodeAction(email, tipperCode);

      if (!verifyRes.success) {
        toast.error(verifyRes.message ?? "Verification failed");

        return;
      }

      const parsed = parseAuthResponse(verifyRes.data);

      if (!parsed) {
        toast.error("Verification succeeded but session could not be restored");

        return;
      }

      setModalSuccessLock(true);

      await applyPrimaryAndHostSessions(parsed, dispatch);

      toast.success("Email verified successfully!");

      onModalTipperSuccess?.({
        role: "TIPPER",
        username: parsed.user.username,
        eventSlug: null,
      });
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

  useEffect(() => {
    if (mode !== "modal" || tipperStep !== "verify" || tipperHostCodeFlow) {
      return;
    }

    if (tipperCode.length !== 6 || tipperVerifyInFlightRef.current) {
      return;
    }

    tipperVerifyInFlightRef.current = true;

    void handleModalTipperVerify().finally(() => {
      tipperVerifyInFlightRef.current = false;
    });
  }, [tipperCode, tipperHostCodeFlow, tipperStep, mode]);

  const handleTipperHostEmailCodeRequest = async () => {
    const email = tipperForm.getValues("email")?.trim();

    if (!email) {
      toast.error("Enter your email first");
      return;
    }

    try {
      setIsTipperLoading(true);

      const res = await requestLoginCodeAction({
        email,
        accountType: "HOST",
      });

      if (!res.success) {
        toast.error(res.message);
        return;
      }

      toast.success(
        (res.data as { message?: string })?.message ??
          "Host verification code sent — check your email"
      );

      setTipperHostVerifyCode("");

      setTipperHostCodeFlow(true);
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error("Failed to send host verification code");
      }
    } finally {
      setIsTipperLoading(false);
    }
  };

  const handleTipperHostEmailCodeVerify = async () => {
    const email = tipperForm.getValues("email")?.trim();

    if (!email || tipperHostVerifyCode.length < 6) {
      return;
    }

    try {
      setIsTipperLoading(true);

      const verifyRes = await verifyCodeAction(
        email,
        tipperHostVerifyCode,
        "HOST"
      );

      if (!verifyRes.success) {
        toast.error(verifyRes.message ?? "Verification failed");

        return;
      }

      const parsed = parseAuthResponse(verifyRes.data);

      if (!parsed) {
        toast.error("Verification succeeded but session could not be restored");

        return;
      }

      setModalSuccessLock(true);

      await applyPrimaryAndHostSessions(parsed, dispatch);

      toast.success("Host email verified successfully!");

      setTipperHostCodeFlow(false);

      onModalHostSuccess?.({
        role: "HOST",
        username: parsed.hostSession?.user.username ?? parsed.user.username,
        eventSlug: parsed.hostSession?.user.eventSlug ?? null,
      });
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error("Failed to verify host email");
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

      const res = await requestLoginCodeAction({
        email: values.email,
      });

      if (!res.success) {
        toast.error(res.message);
        return;
      }

      const resolvedEmail = resolvedEmailFromAuthPayload(
        res.data,
        values.email
      );

      toast.success(
        (res.data as { message?: string })?.message ??
          "Verification code sent — check your email"
      );

      if (mode === "modal") {
        setHostVerifyEmail(resolvedEmail);
        setHostAuthView("verifyEmail");

        return;
      }

      push(
        buildVerifyEmailPath({
          email: resolvedEmail,
          accountType: "HOST",
          next: returnTo,
        })
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

      const email = hostVerifyEmail.trim() || authUser?.email?.trim();

      if (!email) {
        toast.error("Missing email for verification");

        return;
      }

      const verifyRes = await verifyCodeAction(email, hostVerifyCode, "HOST");

      if (!verifyRes.success) {
        toast.error(verifyRes.message ?? "Verification failed");

        return;
      }

      const parsed = parseAuthResponse(verifyRes.data);

      if (!parsed) {
        toast.error("Verification succeeded but session could not be restored");

        return;
      }

      setModalSuccessLock(true);

      await applyPrimaryAndHostSessions(parsed, dispatch);

      toast.success("Email verified successfully!");

      onModalHostSuccess?.({
        role: "HOST",
        username: parsed.hostSession?.user.username ?? parsed.user.username,
        eventSlug: parsed.hostSession?.user.eventSlug ?? null,
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

  useEffect(() => {
    if (mode !== "modal" || hostAuthView !== "verifyEmail") {
      return;
    }

    if (hostVerifyCode.length !== 6 || hostVerifyInFlightRef.current) {
      return;
    }

    hostVerifyInFlightRef.current = true;

    void handleModalHostVerify().finally(() => {
      hostVerifyInFlightRef.current = false;
    });
  }, [hostVerifyCode, hostAuthView, mode]);

  const handleModalHostResend = async () => {
    const email = hostVerifyEmail.trim() || authUser?.email?.trim();

    if (!email || hostResendCooldown > 0) {
      return;
    }

    try {
      setIsHostLoading(true);

      const res = await resendCodeAction(email, "HOST");

      if (!res.success) {
        toast.error(res.message);
        return;
      }

      toast.success(
        (res.data as { message?: string })?.message ??
          "Verification code resent"
      );

      startResendCooldown();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to resend code");
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

      setHostStep("signIn");
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

  useEffect(() => {
    if (!signUpUsername) {
      setUsernameAvailable(null);
      return;
    }

    const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;

    if (!usernameRegex.test(signUpUsername)) {
      setUsernameAvailable(null);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        setCheckingUsername(true);

        const res = await checkHostUsernameAvailabilityAction({
          username: signUpUsername,
          email: signUpEmail?.trim(),
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
  }, [signUpUsername, signUpEmail]);

  useEffect(() => {
    const email = signUpEmail?.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setHostEmailStatus(null);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        setCheckingCoOwnerEmail(true);
        const res = await checkCoOwnerSignupEligibilityAction(email);
        if (res.success && res.data) {
          setHostEmailStatus({
            host: res.data.host ?? "none",
            inviteEligible:
              res.data.inviteEligible ?? res.data.eligible === true,
          });
        } else {
          setHostEmailStatus(null);
        }
      } catch {
        setHostEmailStatus(null);
      } finally {
        setCheckingCoOwnerEmail(false);
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [signUpEmail]);

  useEffect(() => {
    setShowUnclaimedSignInBanner(false);
  }, [hostSignInEmailOrUsername]);

  /*
   * Switch between Host sign-up and sign-in.
   *
   * These handlers intentionally update both pieces of Host state so that
   * the visible form and auth view remain synchronized.
   */
  const showHostSignUp = () => {
    setHostStep("signUp");
    setHostAuthView("signUp");
  };

  const showHostSignIn = () => {
    setHostStep("signIn");
    setHostAuthView("signIn");
  };

  const openSignUpWithEmailPrefill = (raw: string) => {
    const trimmed = raw.trim();
    showHostSignUp();
    if (trimmed.includes("@")) {
      signUpForm.setValue("email", trimmed, { shouldValidate: true });
    }
    setShowUnclaimedSignInBanner(false);
  };

  const openSignInWithEmailPrefill = (raw: string) => {
    const trimmed = raw.trim();
    showHostSignIn();
    if (trimmed.includes("@")) {
      hostForm.setValue("emailOrUsername", trimmed, { shouldValidate: true });
    }
  };

  const signupEmailIsClaimedHost = hostEmailStatus?.host === "claimed";

  return (
    <div className={className ? "" : "mx-auto max-w-2xl"}>
      {mode === "page" && isAuthenticated && authUser ? (
        <AlreadySignedInNotice />
      ) : null}

      {mode === "modal" && (
        <h2 className="-mb-2 text-center text-xl font-semibold">
          {hostAuthView === "signUp" ? "Sign up" : "Sign in"}
        </h2>
      )}

      <Tabs
        value={userType}
        onValueChange={val => {
          /*
           * Defense in depth:
           * even if something attempts to select the disabled Tipper tab,
           * do not allow the state to change.
           */
          if (freezeTipperTab && val === "tipper") {
            return;
          }

          if (val === "host" || val === "tipper") {
            setUserType(val);
          }
        }}
        className={`${className ? className : "section lg:py-12"}`}
      >
        <div className="space-y-1">
          <TabsList className="bg-secondary/20 flex h-10! w-full sm:h-14!">
            <TabsTrigger
              value="host"
              data-testid="signin-tab-host"
              className="h-9! font-semibold sm:h-13!"
            >
              Host creator
            </TabsTrigger>

            <TabsTrigger
              value="tipper"
              data-testid="signin-tab-tipper"
              disabled={freezeTipperTab}
              className={`h-9! font-semibold sm:h-13! ${
                freezeTipperTab ? "cursor-not-allowed opacity-50" : ""
              }`}
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

            {userType !== "host" ? null : (
              <span
                onClick={toggleHostInfo}
                className="cursor-pointer"
              >
                <Info className="size-3" />
              </span>
            )}

            {userType !== "host" && (
              <span className="absolute top-6 right-0 left-0 block w-full text-center text-[10px]">
                {showTipperInfo &&
                  "- a host creator account gets you a tipper account by default"}
              </span>
            )}

            {userType === "host" && (
              <span className="absolute top-6 right-0 left-0 block w-full text-center text-[10px]">
                {showHostInfo && "- create a channel and add to your platform"}
              </span>
            )}
          </Paragraph>
        </div>

        {/* Host form */}

        <TabsContent
          value="host"
          className="mt-6 space-y-6"
        >
          {mode === "modal" &&
          isAuthenticated &&
          authUser &&
          !modalSuccessLock &&
          hostAuthView !== "verifyEmail" ? (
            <AlreadySignedInNotice compact />
          ) : null}

          <div key={`host-${hostAuthView}-${hostStep}`}>
            {mode === "modal" && hostAuthView === "forgotPassword" ? (
              <div className="space-y-6">
                <h2 className="text-center text-xl font-semibold">
                  Reset your password
                </h2>

                <Form {...hostForm}>
                  <form
                    onSubmit={hostForm.handleSubmit(
                      values =>
                        void handleForgotPassword(values.emailOrUsername)
                    )}
                    className="-mt-2 space-y-6"
                  >
                    <FormField
                      control={hostForm.control}
                      name="emailOrUsername"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>

                          <FormControl>
                            <Input
                              className="h-10 sm:h-13"
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
                  onClick={showHostSignIn}
                >
                  <MoveLeft className="size-4" />
                  Back to sign in
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

                <Paragraph
                  align="center"
                  size="sm"
                >
                  Didn&apos;t receive the code?{" "}
                  <Button
                    type="button"
                    variant="link"
                    className="text-primary h-auto p-0"
                    disabled={hostResendCooldown > 0 || isHostLoading}
                    onClick={() => void handleModalHostResend()}
                  >
                    {hostResendCooldown > 0
                      ? `Resend in ${hostResendCooldown}s`
                      : "Resend code"}
                  </Button>
                </Paragraph>

                <Button
                  type="button"
                  variant="outline"
                  className="hover:bg-gray absolute top-0 left-0 border-none outline-none hover:text-black"
                  onClick={showHostSignIn}
                >
                  <MoveLeft />
                  Back
                </Button>
              </div>
            ) : hostStep === "signUp" ? (
              <Form {...signUpForm}>
                <form
                  onSubmit={signUpForm.handleSubmit(onSubmitHostSignUp)}
                  className="-mt-2 space-y-6"
                >
                  <FormField
                    control={signUpForm.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full name</FormLabel>

                        <FormControl>
                          <Input
                            className="h-10 sm:h-13"
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
                            className="h-10 sm:h-13"
                            type="email"
                            placeholder="Enter email address"
                            {...field}
                          />
                        </FormControl>
                        {checkingCoOwnerEmail ? (
                          <p className="text-muted-foreground text-sm">
                            Checking co-owner eligibility…
                          </p>
                        ) : null}
                        {!checkingCoOwnerEmail &&
                        signUpEmail?.trim() &&
                        signupEmailIsClaimedHost ? (
                          <HostAuthHandoffBanner
                            variant="claimed-sign-up"
                            mode={mode}
                            onSignIn={() =>
                              openSignInWithEmailPrefill(signUpEmail)
                            }
                          />
                        ) : null}
                        {!checkingCoOwnerEmail &&
                        signUpEmail?.trim() &&
                        !signupEmailIsClaimedHost &&
                        (hostEmailStatus?.inviteEligible === true ||
                          hostEmailStatus?.host === "unclaimed") ? (
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
                        control={signUpForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>

                            <FormControl>
                              <Input
                                className="h-10 sm:h-13"
                                {...field}
                                placeholder="Choose a username"
                              />
                            </FormControl>

                            <FormMessage />

                            {checkingUsername && (
                              <p className="text-muted-foreground text-sm">
                                Checking availability...
                              </p>
                            )}

                            {!checkingUsername &&
                              signUpUsername &&
                              usernameAvailable === true && (
                                <p className="text-success text-sm">
                                  Username is available ✓
                                </p>
                              )}

                            {!checkingUsername &&
                              signUpUsername &&
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

                  {/* PASSWORD FIELD */}

                  {slidePasswordFields && (
                    <FormField
                      control={signUpForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>

                          <FormControl>
                            <Input
                              className="h-10 sm:h-13"
                              type="password"
                              placeholder="Create password"
                              {...field}
                            />
                          </FormControl>

                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {/* CONFIRM PASSWORD FIELD */}

                  {slideConfirmPasswordField && (
                    <FormField
                      control={signUpForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm password</FormLabel>

                          <FormControl>
                            <Input
                              className="h-10! sm:h-13"
                              type="password"
                              placeholder="Confirm password"
                              {...field}
                            />
                          </FormControl>

                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

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

                        <FormLabel className="text-muted-foreground! text-xs leading-snug font-normal sm:text-sm">
                          <TermsPrivacyLabel />
                        </FormLabel>
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
                      usernameAvailable === false ||
                      signupEmailIsClaimedHost
                    }
                  >
                    {isHostLoading
                      ? "Creating account…"
                      : "Create host account"}
                  </Button>

                  <Paragraph
                    align="center"
                    size="sm"
                    className="-mt-4"
                  >
                    Already have an account?{" "}
                    {mode === "page" ? (
                      <Link
                        href={`/sign-in?next=${pathname}`}
                        className="text-primary hover:underline"
                      >
                        Sign in
                      </Link>
                    ) : (
                      <button
                        type="button"
                        className="text-primary hover:underline"
                        onClick={showHostSignIn}
                      >
                        Sign in
                      </button>
                    )}
                  </Paragraph>
                </form>
              </Form>
            ) : (
              <Form {...hostForm}>
                <form
                  onSubmit={hostForm.handleSubmit(onSubmitHost)}
                  className="-mt-2 space-y-6"
                >
                  <FormField
                    control={hostForm.control}
                    name="emailOrUsername"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email or username</FormLabel>

                        <FormControl>
                          <Input
                            placeholder="Enter email address or username"
                            autoComplete="off"
                            {...field}
                            readOnly={!!emailParam}
                            className={
                              emailParam
                                ? "bg-gray h-10 cursor-not-allowed sm:h-13"
                                : "h-10 sm:h-13"
                            }
                            type="text"
                          />
                        </FormControl>

                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {showUnclaimedSignInBanner ? (
                    <HostAuthHandoffBanner
                      variant="unclaimed-sign-in"
                      onCreateHostAccount={() =>
                        openSignUpWithEmailPrefill(
                          hostForm.getValues("emailOrUsername")
                        )
                      }
                    />
                  ) : null}

                  <FormField
                    control={hostForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex justify-between">
                          Password{" "}
                          <button
                            type="button"
                            data-testid="signin-request-login-code"
                            disabled={isHostLoading}
                            onClick={() =>
                              handleRequestLoginCode({
                                email: hostForm.getValues("emailOrUsername"),
                              })
                            }
                            className="text-muted-foreground cursor-pointer text-xs font-normal underline"
                          >
                            Request login code instead?
                          </button>
                        </FormLabel>

                        <FormControl>
                          <div className="relative">
                            <Input
                              className="h-10 sm:h-13"
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

                  <Paragraph
                    align="right"
                    size="sm"
                    color="muted"
                    className="-mt-6"
                  >
                    {mode === "modal" ? (
                      <button
                        type="button"
                        className="text-xs hover:underline sm:text-sm"
                        onClick={() => setHostAuthView("forgotPassword")}
                      >
                        Forgot password?
                      </button>
                    ) : (
                      <Link
                        href="/forgot-password"
                        className="text-xs hover:underline sm:text-sm"
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
                        <Loader2 className="size-4 animate-spin" />
                        Signing in...
                      </span>
                    ) : (
                      <span>Sign in</span>
                    )}
                  </Button>

                  <Paragraph
                    align="center"
                    size="sm"
                    className="-mt-4"
                  >
                    Don&apos;t have an account?{" "}
                    {mode === "page" ? (
                      <Link
                        href={signupHref}
                        className="text-primary hover:underline"
                      >
                        Sign up
                      </Link>
                    ) : (
                      <button
                        type="button"
                        className="text-primary hover:underline"
                        onClick={showHostSignUp}
                      >
                        Sign up
                      </button>
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
          {mode === "modal" &&
          isAuthenticated &&
          authUser &&
          !modalSuccessLock &&
          tipperStep !== "verify" ? (
            <AlreadySignedInNotice compact />
          ) : null}

          {mode === "modal" && tipperStep === "verify" ? (
            <div className="relative flex flex-col items-center justify-center gap-6 px-2">
              <h2 className="mt-2 text-center text-2xl font-semibold">
                {tipperHostCodeFlow ? "Verify host email" : "Verify your email"}
              </h2>

              <Paragraph
                align="center"
                size="sm"
                color="muted"
              >
                {tipperHostCodeFlow ? (
                  <>
                    We&apos;ve sent a 6-digit host code to{" "}
                    <strong>{tipperForm.getValues("email")}</strong>.
                  </>
                ) : (
                  <>
                    We&apos;ve sent a 6-digit code to{" "}
                    <strong>{tipperForm.getValues("email")}</strong>.
                    {tipperAccountTag === "NEW_TIPPER"
                      ? " We created a free tipper account for this email."
                      : tipperAccountTag === "EXISTING_HOST"
                        ? " This email belongs to a host account — verify to continue."
                        : null}
                  </>
                )}
              </Paragraph>

              <div className="react-otp-input">
                <OTPInput
                  value={tipperHostCodeFlow ? tipperHostVerifyCode : tipperCode}
                  onChange={
                    tipperHostCodeFlow ? setTipperHostVerifyCode : setTipperCode
                  }
                  numInputs={6}
                  renderInput={props => <input {...props} />}
                  inputStyle={otpInputStyle}
                  shouldAutoFocus
                />
              </div>

              {(tipperHasHostAccount || tipperAccountTag === "EXISTING_HOST") &&
              !tipperHostCodeFlow ? (
                <button
                  type="button"
                  className="text-primary text-sm hover:underline"
                  disabled={isTipperLoading}
                  onClick={() => void handleTipperHostEmailCodeRequest()}
                >
                  Email me a code
                </button>
              ) : null}

              <Button
                type="button"
                size="lg"
                className="w-full bg-black"
                disabled={
                  isTipperLoading ||
                  (tipperHostCodeFlow
                    ? tipperHostVerifyCode.length < 6
                    : tipperCode.length < 6)
                }
                onClick={() =>
                  void (tipperHostCodeFlow
                    ? handleTipperHostEmailCodeVerify()
                    : handleModalTipperVerify())
                }
              >
                {isTipperLoading ? "Verifying email..." : "Verify email"}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="hover:bg-gray absolute top-0 left-0 border-none outline-none hover:text-black"
                onClick={() => {
                  if (tipperHostCodeFlow) {
                    setTipperHostCodeFlow(false);
                    return;
                  }

                  setTipperStep("email");
                }}
              >
                <MoveLeft />
                Back
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
                          className="h-10! sm:h-13"
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
                      className="text-xs! font-normal sm:text-sm"
                    >
                      <TermsPrivacyLabel />
                    </Paragraph>
                  </div>
                ) : null}

                <Paragraph
                  align="center"
                  size="sm"
                  color="muted"
                  className="text-xs sm:text-sm"
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
                      <Loader2 className="size-4 animate-spin" />
                      Sending code...
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
