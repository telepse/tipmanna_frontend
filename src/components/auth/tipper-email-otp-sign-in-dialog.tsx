/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { MoveLeft } from "lucide-react";
import OTPInput from "react-otp-input";
import { useMediaQuery } from "react-responsive";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { persistAuthSession } from "@/lib/session-client";
import { parseAuthResponse } from "@/lib/auth-response";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormField,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Paragraph } from "@/components/shared/paragraph";
import { store } from "@/redux/store";
import { setCredentials } from "@/features/auth-slice";
import { verifyCodeAction, loginOrRegisterTipperAction } from "@/actions/auth";
import { ApiError } from "@/types/api-error.types";
import { dispatchAuthChanged } from "@/lib/auth-events";
import { getVisitorIdForAuthMerge } from "@/lib/visitor-session";
import {
  SIGN_IN_NESTED_OVERLAY_Z_INDEX,
  SIGN_IN_NESTED_Z_INDEX,
} from "@/lib/drawer-z-index";

type Step = "signIn" | "verifyCode";

export type TipperEmailOtpSignInDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  signInTitle?: string;
  initialEmail?: string;
  autoSendCode?: boolean;
  onVerified?: () => void | Promise<void>;
  getRedirectPathAfterVerify?: () => string | undefined;
  overlayClassName?: string;
  contentClassName?: string;
  signupHint?: string;
};

export function TipperEmailOtpSignInDialog({
  open,
  onOpenChange,
  signInTitle = "Enter email to view profile",
  initialEmail,
  autoSendCode = false,
  onVerified,
  getRedirectPathAfterVerify,
  overlayClassName = SIGN_IN_NESTED_OVERLAY_Z_INDEX,
  contentClassName = SIGN_IN_NESTED_Z_INDEX,
  signupHint = "No account yet? Continue and we will create a free tipper account when you verify.",
}: TipperEmailOtpSignInDialogProps) {
  const router = useRouter();
  const dispatch = useDispatch();

  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<Step>("signIn");
  const [code, setCode] = useState("");
  const [accountTag, setAccountTag] = useState<string | null>(null);
  const [pendingSignup, setPendingSignup] = useState(false);

  const form = useForm<{
    fullName: string;
    email: string;
    acceptedTerms: boolean;
  }>({
    defaultValues: { fullName: "", email: "", acceptedTerms: false },
  });
  const email = form.watch("email");

  const isMobile = useMediaQuery({ query: "(max-width: 500px)" });
  const inputStyle = {
    background: "#f7c87c80",
    width: isMobile ? "36px" : "44px",
    height: isMobile ? "36px" : "50px",
    margin: isMobile ? "0 4px" : "0 8px",
    borderRadius: isMobile ? "4px" : "8px",
    outline: "none",
    fontSize: isMobile ? "16px" : "20px",
  };

  useEffect(() => {
    if (!open) return;
    setStep(autoSendCode && initialEmail?.trim() ? "verifyCode" : "signIn");
    setCode("");
    setAccountTag(null);
    setPendingSignup(false);
    form.reset({
      fullName: "",
      email: initialEmail ?? "",
      acceptedTerms: Boolean(autoSendCode),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialEmail, autoSendCode]);

  const handleLogin = async (values: {
    email: string;
    acceptedTerms?: boolean;
  }) => {
    try {
      setIsLoading(true);

      const visitorId = getVisitorIdForAuthMerge(store.getState().auth.user);

      const res = await loginOrRegisterTipperAction({
        fullName: "",
        email: values.email,
        acceptedTerms: values.acceptedTerms ?? true,
        visitorId,
      });

      if (!res.success) {
        toast.error(res.message);
        return;
      }

      const parsed = parseAuthResponse(res.data);
      if (!parsed) {
        toast.error("Could not start sign-in");
        return;
      }

      setAccountTag(parsed.tag ?? null);
      setPendingSignup(parsed.tag === "NEW_TIPPER");

      dispatch(
        setCredentials({
          user: { ...parsed.user, role: parsed.role },
          token: parsed.token,
          requiresVerification: true,
          tag: parsed.tag ?? null,
        })
      );

      setStep("verifyCode");
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
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    try {
      setIsLoading(true);

      const { user: u, token: tok } = store.getState().auth;
      if (!u?.email) return;

      const verifyRes = await verifyCodeAction(u.email, code);
      if (!verifyRes.success) {
        toast.error(verifyRes.message ?? "Verification failed");
        return;
      }

      dispatch(
        setCredentials({
          user: u,
          token: tok!,
          requiresVerification: false,
        })
      );

      await persistAuthSession(
        tok!,
        {
          id: u.id,
          fullName: u.fullName,
          email: u.email,
          username: u.username,
          role: u.role,
        },
        { expiresDays: u.role === "HOST" ? 7 : 60 }
      );

      toast.success("Email verified successfully!");

      dispatchAuthChanged();

      await onVerified?.();

      const path = getRedirectPathAfterVerify?.();
      if (path) {
        router.push(path);
      }
      onOpenChange(false);
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
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!open || !autoSendCode || !initialEmail?.trim()) return;
    void handleLogin({ email: initialEmail.trim(), acceptedTerms: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, autoSendCode, initialEmail]);

  const verifyHint =
    accountTag === "NEW_TIPPER" || pendingSignup
      ? "We created a Tipmanna tipper account for this email. Enter the code to verify and enable push reminders."
      : accountTag === "EXISTING_HOST"
        ? "This email belongs to a host account. Verify to continue with your linked tipper profile."
        : accountTag === "EXISTING_TIPPER"
          ? "Enter the code to sign in and enable push reminders for this program."
          : "Enter the code we sent to verify your Tipmanna account and enable push reminders.";

  const signInHint =
    accountTag === "NEW_TIPPER"
      ? "No Tipmanna account found — we'll create a free tipper account with this email after you verify."
      : null;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent
        overlayClassName={overlayClassName}
        className={`sm:max-w-md ${contentClassName}`}
      >
        <DialogHeader className="open_sans">
          {step === "signIn" ? (
            <>
              <DialogTitle className="mt-6 text-center text-3xl">
                {signInTitle}
              </DialogTitle>

              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(values =>
                    handleLogin({
                      email: values.email,
                      acceptedTerms: values.acceptedTerms,
                    })
                  )}
                  className="mt-6 space-y-6"
                >
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter email address"
                            autoComplete="off"
                            readOnly={Boolean(initialEmail?.trim())}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="acceptedTerms"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center gap-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              className="data-[state=checked]:border-black! data-[state=checked]:bg-black!"
                            />
                          </FormControl>
                          <FormLabel className="text-sm font-normal">
                            I agree to the Terms and Privacy Policy
                          </FormLabel>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Paragraph
                    align="center"
                    size="sm"
                    color="muted"
                  >
                    {signupHint}
                  </Paragraph>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full bg-black"
                    disabled={isLoading}
                  >
                    {isLoading ? "Sending code..." : "Continue"}
                  </Button>
                </form>
              </Form>
            </>
          ) : (
            <div className="relative flex flex-col items-center justify-center gap-6">
              <h2 className="mt-12 text-center text-3xl font-semibold">
                Verify your email
              </h2>
              {isLoading && code.length === 0 ? (
                <Paragraph
                  align="center"
                  size="sm"
                  color="muted"
                >
                  Sending verification code to <strong>{email}</strong>…
                </Paragraph>
              ) : (
                <Paragraph
                  align="center"
                  size="sm"
                  color="muted"
                >
                  We&apos;ve sent a 6-digit code to <strong>{email}</strong>.{" "}
                  {verifyHint}
                  {signInHint ? <> {signInHint}</> : null}
                </Paragraph>
              )}

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
                className="w-full bg-black"
                disabled={isLoading || code.length < 6}
                onClick={() => void handleVerify()}
              >
                {isLoading ? "Verifying email..." : "Verify email"}
              </Button>

              {!autoSendCode ? (
                <Button
                  type="button"
                  variant="outline"
                  className="hover:bg-gray absolute top-0 left-0 border-none outline-none hover:text-black"
                  onClick={() => setStep("signIn")}
                >
                  <MoveLeft /> Back
                </Button>
              ) : null}
            </div>
          )}
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
