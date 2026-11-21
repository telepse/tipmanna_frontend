/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Third-party imports
import { useDispatch, useSelector } from "react-redux";
import { InfoIcon, MoveLeft, UserRound } from "lucide-react";
import OTPInput from "react-otp-input";
import { useMediaQuery } from "react-responsive";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TermsPrivacyLabel } from "@/components/auth/terms-privacy-label";
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
// Local imports
import { RootState } from "@/redux/store";
import { updateTipper } from "@/features/auth-slice";
import { loginOrRegisterTipperAction, verifyCodeAction } from "@/actions/auth";
import { getVisitorIdForAuthMerge } from "@/lib/visitor-session";
import { buildSignupAttributionPayload } from "@/lib/signup-attribution";
import { parseAuthResponse } from "@/lib/auth-response";
import { applyPrimaryAndHostSessions } from "@/lib/apply-auth-sessions";
import type { AppDispatch } from "@/redux/store";
import { ApiError } from "@/types/api-error.types";
import { Paragraph } from "../shared/paragraph";
import { subscribeChannel, unsubscribeChannel } from "@/lib/pusher";
import { subscribeToPayments } from "@/lib/paymentEvents";

interface Props {
  iTipped: number;
  eventId: string;
}

type Step = "signIn" | "verifyCode";

export const EventUser = ({ iTipped, eventId }: Props) => {
  const [openSignIn, setOpenSignIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<Step>("signIn");
  const [code, setCode] = useState("");
  const [pendingVerifyEmail, setPendingVerifyEmail] = useState("");

  const user = useSelector((state: RootState) => state.auth.user);
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();

  const userId = user?.id;
  const username = user?.username;

  const form = useForm<{
    fullName: string;
    email: string;
    acceptedTerms: false;
  }>({
    defaultValues: { fullName: "", email: "", acceptedTerms: false },
  });
  const email = form.watch("email");

  const isTipper = user?.role === "TIPPER";
  const isVisitor = user?.role === "VISITOR";

  const handleClick = () => {
    if (isTipper) {
      router.push(`/tipper/${username}?from=/room/${eventId}`);
    } else if (isVisitor) {
      router.push(`/visitor/${username}?from=/room/${eventId}`);
    } else {
      setOpenSignIn(true);
    }
  };

  const handleLogin = async (values: { email: string }) => {
    try {
      setIsLoading(true);

      const res = await loginOrRegisterTipperAction({
        fullName: "",
        email: values.email,
        acceptedTerms: true,
        visitorId: getVisitorIdForAuthMerge(user),
        ...buildSignupAttributionPayload("event_room"),
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

      setPendingVerifyEmail(values.email.trim());
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

      const verifyEmail =
        pendingVerifyEmail.trim() || email.trim() || user?.email?.trim() || "";
      if (!verifyEmail) return;

      const res = await verifyCodeAction(
        verifyEmail,
        code,
        "TIPPER",
        getVisitorIdForAuthMerge(user)
      );
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

      router.push(`/tipper/${username}?from=/room/${eventId}`);
      setOpenSignIn(false);
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

  const [userTipped, setUserTipped] = useState(iTipped);

  // const updateAfterPayment = (paymentAmount: number) => {
  //   return dispatch(updateTipper({ iTipped: (prev: number) => (prev || 0) + paymentAmount}));
  // }

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
    if (!userId) return;

    const channelName = `event-${eventId}`;
    const channel = subscribeChannel(channelName);
    if (!channel) return;

    const eventName = `user-${userId}-amount-updated`;

    const handler = (data: { userTipped: number }) => {
      setUserTipped(data.userTipped);
    };

    channel.bind(eventName, handler);

    return () => {
      channel.unbind(eventName, handler);
      unsubscribeChannel(channelName);
    };
  }, [eventId, userId]);

  useEffect(() => {
    const unsubscribe = subscribeToPayments(({ tipAmount: iTipped }) => {
      setUserTipped(prev => prev + iTipped);
    });
    return unsubscribe;
  }, []);

  return (
    <div>
      <button
        onClick={handleClick}
        className="relative cursor-pointer"
      >
        <div className="flex flex-col items-center justify-center bg-black p-1">
          <UserRound className="size-5 text-white sm:size-7" />
        </div>

        {isVisitor && (
          <span className="bg-destructive absolute -top-2 -right-2 rounded-full">
            <InfoIcon className="size-4 text-white" />
          </span>
        )}
      </button>
      <span className="block text-center text-[14px] font-semibold sm:text-sm">
        &pound;{userTipped || 0}
      </span>

      <Dialog
        open={openSignIn}
        onOpenChange={setOpenSignIn}
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
    </div>
  );
};
