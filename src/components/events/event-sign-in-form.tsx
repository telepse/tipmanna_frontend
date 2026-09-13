/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";

// Third-party imports
import {
  Form,
  FormMessage,
  FormControl,
  FormLabel,
  FormField,
  FormItem,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import OTPInput from "react-otp-input";
import { useForm } from "react-hook-form";
import { ChevronLeft } from "lucide-react";
import { toast } from "react-toastify";
import { useDispatch, useSelector } from "react-redux";

// Local imports
import { TermsPrivacyLabel } from "@/components/auth/terms-privacy-label";
import { Paragraph } from "@/components/shared/paragraph";
import {
  checkHostUsernameAvailabilityAction,
  loginOrRegisterHostAction,
  requestLoginCodeAction,
  verifyCodeAction,
} from "@/actions/auth";
import { ApiError } from "@/types/api-error.types";
import { RootState, type AppDispatch } from "@/redux/store";
import { parseAuthResponse } from "@/lib/auth-response";
import { applyPrimaryAndHostSessions } from "@/lib/apply-auth-sessions";
import { resolvedEmailFromAuthPayload } from "@/lib/resolved-auth-email";
import { getVisitorIdForAuthMerge } from "@/lib/visitor-session";
import { buildSignupAttributionPayload } from "@/lib/signup-attribution";
import { useMediaQuery } from "react-responsive";

type signIn_Step = "signIn" | "signInVerifyCode" | "signUp";

interface Props {
  role: "HOST" | "TIPPER" | "VISITOR";
  tag: string;
  onNext?: () => void;
}

export const EventSignInForm = ({ role, tag, onNext }: Props) => {
  const [signInStep, setSignInStep] = useState<signIn_Step>("signUp");
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hostVerifyEmail, setHostVerifyEmail] = useState("");

  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);

  const isMobile = useMediaQuery({ query: "(max-width: 500px)" });
  const inputStyle = {
    background: "#3b3b3b",
    width: isMobile ? "36px" : "44px",
    height: isMobile ? "36px" : "50px",
    margin: isMobile ? "0 4px" : "0 8px",
    borderRadius: isMobile ? "4px" : "8px",
    outline: "none",
    fontSize: isMobile ? "16px" : "20px",
  };

  const signInForm = useForm<{
    fullName: string;
    emailOrUsername: string;
    email: string;
    username: string;
    acceptedTerms: false;
    password: string;
  }>({
    defaultValues: {
      fullName: "",
      emailOrUsername: "",
      email: "",
      username: "",
      acceptedTerms: false,
    },
  });

  const handleLogin = async (values: {
    fullName: string;
    emailOrUsername: string;
    email: string;
    username: string;
    password: string;
    acceptedTerms: boolean;
  }) => {
    if (authState === "signUp" && !values.acceptedTerms) {
      toast.error("You must agree to the terms and privacy policy");
      return;
    }
    try {
      setIsLoading(true);

      const res = await loginOrRegisterHostAction({
        fullName: values.fullName,
        password: values.password,
        emailOrUsername: values.emailOrUsername || values.email,
        email: values.email,
        username: values.username,
        acceptedTerms: values.acceptedTerms,
        visitorId: getVisitorIdForAuthMerge(user),
        ...buildSignupAttributionPayload("wizard_bridge"),
      });

      if (!res.success) {
        toast.error(res.message);
        return;
      }

      const parsed = parseAuthResponse(res.data);
      if (!parsed) {
        toast.error("Unexpected sign-in response — please try again");
        return;
      }

      setHostVerifyEmail(values.email.trim());
      setSignInStep("signInVerifyCode");
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
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    try {
      setIsLoading(true);

      const verifyEmail =
        hostVerifyEmail.trim() ||
        signInForm.getValues("email")?.trim() ||
        user?.email?.trim() ||
        "";
      if (!verifyEmail) return;

      const res = await verifyCodeAction(verifyEmail, code, "HOST");
      if (!res.success) {
        toast.error(res.message);
        return;
      }

      const parsed = parseAuthResponse(res.data);
      if (!parsed) {
        toast.error("Verification succeeded but session could not be restored");
        return;
      }

      await applyPrimaryAndHostSessions(parsed, dispatch);

      toast.success("Email verified successfully!");
      onNext?.();
      setSignInStep("signUp");
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else if (typeof err === "object" && err !== null && "error" in err) {
        const apiErr = err as ApiError;
        toast.error(apiErr.error.message);
      } else {
        toast.error("Failed to verify host");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const [authState, setAuthState] = useState<"signIn" | "signUp">("signUp");

  const switchToSignup = () => {
    setAuthState("signUp");
  };

  const switchToSignin = () => {
    setAuthState("signIn");
  };

  const handleRequestLoginCode = async (values: { email: string }) => {
    try {
      setIsLoading(true);

      if (!values.email) {
        toast.error("Put in your email address first");
        return;
      }

      const res = await requestLoginCodeAction({
        email: values.email,
        accountType: "HOST",
      });
      if (!res.success) {
        toast.error(res.message);
        return;
      }

      const resolvedEmail = resolvedEmailFromAuthPayload(
        res.data,
        values.email
      );
      setHostVerifyEmail(resolvedEmail);

      toast.success(
        (res.data as { message?: string })?.message ??
          "Verification code sent — check your email"
      );

      setCode("");
      setSignInStep("signInVerifyCode");
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else if (typeof err === "object" && err !== null && "error" in err) {
        const apiErr = err as ApiError;
        toast.error(apiErr.error.message);
      } else {
        toast.error("Failed to request verification code");
      }

      setCode("");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      // Dynamically update form fields when user state changes (login/register)

      signInForm.setValue("email", user.email);
      signInForm.setValue("fullName", user.fullName);

      // Clear validation errors for these fields once they are populated
      signInForm.clearErrors(["email"]);
    }
  }, [user, signInForm]);

  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(
    null
  );

  const username = signInForm.watch("username");

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

        const res = await checkHostUsernameAvailabilityAction({ username });

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
  }, [username]);

  // --- NEW: RENDER FOR EXISTING HOST TAG ---
  if (role === "HOST" && tag === "EXISTING_HOST") {
    return (
      <div className="mx-auto w-full max-w-md space-y-6 rounded-lg border-2 border-white bg-black/50 p-6 text-center text-white">
        <h2 className="text-xl font-semibold">
          Sign in to your host account to continue
        </h2>
        <p className="text-sm leading-loose text-white/80">
          You are logged in to your tipper account. <br /> You must verify your
          host creator account to continue.
        </p>

        {authState === "signIn" ? (
          <>
            <div className="relative mx-auto flex w-full max-w-md flex-col items-center justify-center gap-6 rounded-md bg-black/50 p-4 text-white">
              <h2 className="mt-12 text-center text-3xl font-semibold">
                Verify your email
              </h2>
              <Paragraph
                align="center"
                size="xs"
                color="white"
                weight="normal"
              >
                We&apos;ve sent a 6-digit code to{" "}
                <strong className="text-white/80">{user?.email}</strong>. Enter
                it below to verify your account.
              </Paragraph>

              <div className="react-otp-input">
                <OTPInput
                  value={code}
                  onChange={setCode}
                  numInputs={6}
                  renderInput={props => <input {...props} />}
                  inputStyle={inputStyle}
                  shouldAutoFocus
                />
              </div>

              <Button
                type="button"
                size="lg"
                className="w-full bg-white text-black hover:bg-white/80"
                disabled={isLoading || code.length < 6}
                // onClick={handleVerify}
                onClick={() => {
                  console.log("verify email");
                  handleVerify();
                }}
              >
                {isLoading ? "Verifying email..." : "Verify email"}
              </Button>

              <button
                type="button"
                className="absolute top-4 left-4 cursor-pointer rounded-md border-none p-2 outline-none hover:bg-black/15"
                onClick={() => setSignInStep("signIn")}
              >
                <ChevronLeft className="text-white" />
              </button>
            </div>
          </>
        ) : null}

        <Button
          type="button"
          size="lg"
          className="w-full bg-white text-black hover:bg-white/80"
          onClick={() => {
            // 1. Dispatch action to clear the tag in Redux
            // dispatch(
            //   setCredentials({
            //     user: user!, // Keep current user
            //     token: token!, // Keep current token
            //     requiresVerification: false,
            //     tag: undefined, // CLEAR THE TAG HERE
            //   })
            // );

            handleRequestLoginCode({ email: user?.email || "" });
            setSignInStep("signInVerifyCode");
          }}
        >
          Get host verification code
        </Button>
      </div>
    );
  }

  return (
    <>
      {signInStep === "signUp" ? (
        <div className="mx-auto w-full max-w-md space-y-6 rounded-lg border-2 border-white bg-black/50 p-4 text-white">
          <h2 className="mt-6 text-center text-xl font-semibold">
            {authState === "signIn"
              ? "Sign in as creator to continue"
              : "Sign up as creator to continue"}
          </h2>

          {role === "TIPPER" && (
            <p className="text-white/ text-center text-sm leading-relaxed">
              No host account detected. <br /> You must sign up as a creator
              host to continue.
            </p>
          )}

          {role === "HOST" && tag === "EXISTING_HOST" && (
            <p className="text-sm text-white/80">
              You are signed in as a tipper. You must verify your host to
              continue.
            </p>
          )}

          <Form {...signInForm}>
            {authState === "signUp" ? (
              <FormField
                control={signInForm.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fullname</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter fullname"
                        autoComplete="off"
                        className="bg-black/25"
                        disabled={Boolean(user?.fullName?.trim())}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}

            {authState === "signUp" ? (
              <FormField
                control={signInForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter email address"
                        autoComplete="off"
                        className="bg-black/25"
                        disabled={Boolean(user?.email?.trim())}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}

            {authState === "signUp" ? (
              <div className="space-y-1">
                <FormField
                  control={signInForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>

                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Choose a username"
                          className="bg-black/25"
                          disabled={Boolean(user?.username?.trim())}
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
                          <p className="bg-success w-fit rounded px-1 py-0.5 text-sm text-white">
                            Username is available ✓
                          </p>
                        )}

                      {!checkingUsername &&
                        username &&
                        usernameAvailable === false && (
                          <p className="bg-destructive w-fit rounded px-1 py-0.5 text-sm text-white">
                            Username is already taken
                          </p>
                        )}
                    </FormItem>
                  )}
                />

                <span className="text-xs text-white/80">
                  This will be your unique creator username
                </span>
              </div>
            ) : null}

            {authState === "signIn" ? (
              <FormField
                control={signInForm.control}
                name="emailOrUsername"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email or username</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="Enter email or username"
                        autoComplete="off"
                        className="bg-black/25"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}

            <FormField
              control={signInForm.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Set password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Enter password"
                      autoComplete="off"
                      className="bg-black/25"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {authState === "signIn" ? (
              <button
                type="button"
                onClick={() =>
                  handleRequestLoginCode({
                    email: signInForm.getValues("email"),
                  })
                }
                className="cursor-pointer text-sm text-white/80 underline"
              >
                Request login code?
              </button>
            ) : null}

            {authState === "signUp" ? (
              <FormField
                control={signInForm.control}
                name="acceptedTerms"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start gap-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={v => field.onChange(v === true)}
                      />
                    </FormControl>
                    <FormLabel className="leading-snug font-normal">
                      <TermsPrivacyLabel />
                    </FormLabel>
                  </FormItem>
                )}
              />
            ) : null}

            <Button
              type="submit"
              size="lg"
              className="w-full bg-white text-black hover:bg-white/80"
              disabled={isLoading}
              onClick={signInForm.handleSubmit(handleLogin)}
            >
              {isLoading ? (
                "Sending code..."
              ) : (
                <>{authState === "signIn" ? "Sign in" : "Sign up"}</>
              )}
            </Button>

            <p className="text-center text-sm text-white/80">
              {authState === "signIn" ? (
                <>
                  Don&apos;t have an account?{" "}
                  <button
                    type="button"
                    onClick={switchToSignup}
                    className="text-primary cursor-pointer"
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={switchToSignin}
                    className="text-primary cursor-pointer"
                  >
                    Sign in
                  </button>
                </>
              )}
            </p>
          </Form>
        </div>
      ) : (
        <div className="relative mx-auto flex w-full max-w-md flex-col items-center justify-center gap-6 rounded-md bg-black/50 p-4 text-white">
          <h2 className="mt-12 text-center text-3xl font-semibold">
            Verify your email
          </h2>
          <Paragraph
            align="center"
            size="xs"
            color="white"
            weight="normal"
          >
            We&apos;ve sent a 6-digit code to{" "}
            <strong className="text-white/80">{user?.email}</strong>. Enter it
            below to verify your account.
          </Paragraph>

          <div className="react-otp-input">
            <OTPInput
              value={code}
              onChange={setCode}
              numInputs={6}
              renderInput={props => <input {...props} />}
              inputStyle={inputStyle}
              shouldAutoFocus
            />
          </div>

          <Button
            type="button"
            size="lg"
            className="w-full bg-white text-black hover:bg-white/80"
            disabled={isLoading || code.length < 6}
            // onClick={handleVerify}
            onClick={() => {
              console.log("verify email");
              handleVerify();
            }}
          >
            {isLoading ? "Verifying email..." : "Verify email"}
          </Button>

          <button
            type="button"
            className="absolute top-4 left-4 cursor-pointer rounded-md border-none p-2 outline-none hover:bg-black/15"
            onClick={() => setSignInStep("signIn")}
          >
            <ChevronLeft className="text-white" />
          </button>
        </div>
      )}
    </>
  );
};
