/* eslint-disable @typescript-eslint/no-explicit-any */
import { loginOrRegisterTipperAction, verifyCodeAction } from "@/actions/auth";
import { getVisitorIdForAuthMerge } from "@/lib/visitor-session";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { parseAuthResponse } from "@/lib/auth-response";
import { applyPrimaryAndHostSessions } from "@/lib/apply-auth-sessions";
import { ApiError } from "@/types/api-error.types";
import { RootState, AppDispatch } from "@/redux/store";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Paragraph } from "../shared/paragraph";
import OTPInput from "react-otp-input";
import { useForm } from "react-hook-form";
import { MoveLeft } from "lucide-react";
import { useMediaQuery } from "react-responsive";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = "signIn" | "verifyCode";

export const InviteModal = ({ open, onClose, onSuccess }: Props) => {
  const [isLoading, setIsLoading] = useState(false);
  const dispatch = useDispatch<AppDispatch>();

  const [step, setStep] = useState<Step>("signIn");
  const [code, setCode] = useState("");

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

  const form = useForm<{
    fullName: string;
    email: string;
    acceptedTerms: false;
  }>({
    defaultValues: { fullName: "", email: "", acceptedTerms: false },
  });
  const email = form.watch("email");

  const { user } = useSelector((state: RootState) => state.auth);

  const handleLogin = async (values: { email: string }) => {
    try {
      setIsLoading(true);

      const res = await loginOrRegisterTipperAction({
        fullName: "",
        email: values.email,
        acceptedTerms: true,
        visitorId: getVisitorIdForAuthMerge(user),
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

      await applyPrimaryAndHostSessions(parsed, dispatch, {
        requiresVerification: parsed.requiresVerification ?? true,
      });

      if (res.success) setStep("verifyCode");
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

      if (!user?.email) return;

      const res = await verifyCodeAction(user.email, code);
      if (!res.success) {
        toast.error(res.message ?? "Verification failed");
        return;
      }

      const parsed = parseAuthResponse(res.data);
      if (!parsed) {
        toast.error("Verification succeeded but session could not be restored");
        return;
      }

      await applyPrimaryAndHostSessions(parsed, dispatch);

      toast.success("Email verified successfully!");

      onSuccess();
      onClose();
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
      onOpenChange={next => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="open_sans">
          {step === "signIn" ? (
            <>
              <DialogTitle className="mt-6 text-center text-3xl">
                Enter email to view profile
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
                onClick={handleVerify}
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
};
