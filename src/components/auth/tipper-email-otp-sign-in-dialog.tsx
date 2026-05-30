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
import { loginOrRegisterTipperAction, verifyCodeAction } from "@/actions/auth";
import { ApiError } from "@/types/api-error.types";

type Step = "signIn" | "verifyCode";

export type TipperEmailOtpSignInDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Heading on the email step (event room uses “Enter email to view profile”). */
  signInTitle?: string;
  /** Called after OTP verification succeeds, before optional redirect. */
  onVerified?: () => void | Promise<void>;
  /** If this returns a path, navigates there after success; otherwise dialog just closes. */
  getRedirectPathAfterVerify?: () => string | undefined;
};

/**
 * Tipper-only sign-in: email → OTP, same flow as the event room inline dialog.
 */
export function TipperEmailOtpSignInDialog({
  open,
  onOpenChange,
  signInTitle = "Enter email to view profile",
  onVerified,
  getRedirectPathAfterVerify,
}: TipperEmailOtpSignInDialogProps) {
  const router = useRouter();
  const dispatch = useDispatch();

  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<Step>("signIn");
  const [code, setCode] = useState("");

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
    setStep("signIn");
    setCode("");
    form.reset({ fullName: "", email: "", acceptedTerms: false });
    // form.reset is stable from react-hook-form for a given form instance
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleLogin = async (values: { email: string }) => {
    try {
      setIsLoading(true);

      const res = await loginOrRegisterTipperAction({
        fullName: "",
        email: values.email,
        acceptedTerms: true,
      });

      if (!res.success) {
        toast.error(res.message);
        return;
      }

      const {
        id,
        fullName,
        email: em,
        username,
      } = (res.data as any).user as any;
      const newToken = (res.data as unknown as { token: string })?.token;

      dispatch(
        setCredentials({
          user: {
            id,
            fullName,
            email: em,
            username,
            role: "TIPPER",
          },
          token: newToken,
        })
      );

      await persistAuthSession(
        newToken,
        { id, fullName, email: em, username, role: "TIPPER" },
        { expiresDays: 7 }
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

      await verifyCodeAction(u.email, code);

      dispatch(
        setCredentials({
          user: u,
          token: tok!,
          requiresVerification: false,
        })
      );

      toast.success("Email verified successfully!");

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

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="open_sans">
          {step === "signIn" ? (
            <>
              <DialogTitle className="mt-6 text-center text-3xl">
                {signInTitle}
              </DialogTitle>

              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(handleLogin)}
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

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full bg-black"
                    disabled={isLoading}
                  >
                    {isLoading ? "Sending code..." : "Sign in"}
                  </Button>
                </form>
              </Form>
            </>
          ) : (
            <div className="relative flex flex-col items-center justify-center gap-6">
              <h2 className="mt-12 text-center text-3xl font-semibold">
                Verify your email
              </h2>
              <Paragraph
                align="center"
                size="sm"
                color="muted"
              >
                We&apos;ve sent a 6-digit code to <strong>{email}</strong>.
                Enter it below to verify your account.
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
                className="w-full bg-black"
                disabled={isLoading || code.length < 6}
                onClick={() => void handleVerify()}
              >
                {isLoading ? "Verifying email..." : "Verify email"}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="hover:bg-gray absolute top-0 left-0 border-none outline-none hover:text-black"
                onClick={() => setStep("signIn")}
              >
                <MoveLeft /> Back
              </Button>
            </div>
          )}
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
