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
import { persistAuthSession } from "@/lib/session-client";
import { useMediaQuery } from "react-responsive";
import { ChevronLeft } from "lucide-react";
import { toast } from "react-toastify";
import { useDispatch, useSelector } from "react-redux";

// Local imports
import { Paragraph } from "@/components/shared/paragraph";
import {
  loginOrRegisterHostAction,
  requestLoginCodeAction,
  verifyCodeAction,
} from "@/actions/auth";
import { setCredentials } from "@/features/auth-slice";
import { ApiError } from "@/types/api-error.types";
import { RootState } from "@/redux/store";
import { parseAuthResponse, type AuthUserPayload } from "@/lib/auth-response";
import type { HostUser, TipperUser, VisitorUser } from "@/features/auth-slice";
import { getVisitorIdForAuthMerge } from "@/lib/visitor-session";

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

  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const token = useSelector((state: RootState) => state.auth.token);

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
    email: string;
    acceptedTerms: false;
    password: string;
  }>({
    defaultValues: { fullName: "", email: "", acceptedTerms: false },
  });

  const handleLogin = async (values: {
    fullName: string;
    email: string;
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
        email: values.email,
        acceptedTerms: values.acceptedTerms,
        visitorId: getVisitorIdForAuthMerge(user),
      });

      if (!res.success) {
        toast.error(res.message);
        return;
      }

      const {
        id,
        fullName,
        email,
        username,
        eventCode,
        eventSlug,
        numOfEvents,
        individualLegalFirstName,
        individualLegalLastName,
        organizationName,
      } = (res.data as any)?.user as any;
      const token = (res.data as unknown as { token: string })?.token;

      dispatch(
        setCredentials({
          user: {
            id,
            fullName,
            email,
            username,
            role: "HOST",
            eventCode,
            eventSlug,
            numOfEvents,
            individualLegalFirstName,
            individualLegalLastName,
            organizationName,
          },
          token,
          requiresVerification: true,
        })
      );

      await persistAuthSession(
        token,
        {
          id,
          fullName,
          email,
          username,
          role: "HOST",
          eventCode,
          eventSlug,
          numOfEvents,
        },
        { expiresDays: 7 }
      );

      if (res.success) setSignInStep("signInVerifyCode");
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

      if (!user?.email) return;

      const res = await verifyCodeAction(user.email, code);
      if (!res.success) {
        toast.error(res.message);
        return;
      }

      const parsed = parseAuthResponse(res.data);
      const sessionToken = parsed?.token ?? token;

      const sessionUser: AuthUserPayload | null =
        parsed?.user ??
        (user
          ? {
              id: user.id,
              fullName: user.fullName,
              email: user.email,
              username: user.username,
              role: user.role,
              ...(user.role === "HOST"
                ? {
                    hostSubscriptionTier: (user as HostUser)
                      .hostSubscriptionTier,
                  }
                : {}),
              ...(user.role === "TIPPER" && "anonymous" in user
                ? { anonymous: user.anonymous }
                : {}),
            }
          : null);

      if (!sessionUser || !sessionToken) {
        toast.error("Verification succeeded but session could not be restored");
        return;
      }

      dispatch(
        setCredentials({
          user: sessionUser as HostUser | TipperUser | VisitorUser,
          token: sessionToken,
          requiresVerification: false,
        })
      );
      await persistAuthSession(sessionToken, sessionUser, { expiresDays: 7 });

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
      }

      const res = await requestLoginCodeAction({ email: values.email });

      toast.success((res.data as any)?.message as string);

      const {
        id,
        fullName,
        email,
        username,
        eventCode,
        eventSlug,
        numOfEvents,
        individualLegalFirstName,
        individualLegalLastName,
        organizationName,
      } = (res.data as any)?.user as any;
      const token = (res.data as unknown as { token: string })?.token;

      dispatch(
        setCredentials({
          user: {
            id,
            fullName,
            email,
            username,
            role: "HOST",
            eventCode,
            eventSlug,
            numOfEvents,
            individualLegalFirstName,
            individualLegalLastName,
            organizationName,
          },
          token,
          requiresVerification: true,
        })
      );

      await persistAuthSession(
        token,
        {
          id,
          fullName,
          email,
          username,
          role: "HOST",
          eventCode,
          eventSlug,
          numOfEvents,
        },
        { expiresDays: 7 }
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
                      I agree to the terms and privacy policy
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
