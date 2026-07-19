"use client";

import { VisitorProfileBanner } from "./visitor-profile-banner";
import { VisitorProfileTabs } from "./visitor-profile-tabs";
import { MoveLeft, TriangleAlert } from "lucide-react";
import { Button } from "../ui/button";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { useForm } from "react-hook-form";
import { loginVisitorAction, verifyCodeAction } from "@/actions/auth";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { toast } from "react-toastify";
import { setCredentials } from "@/features/auth-slice";
import { Input } from "../ui/input";
import { Paragraph } from "../shared/paragraph";
import OTPInput from "react-otp-input";
import { useMediaQuery } from "react-responsive";
import { useRouter } from "next/navigation";
import { NavbarShell } from "../shared/navbar-shell";
import Footer from "../shared/footer";
import { persistAuthSession } from "@/lib/session-client";

import { Event } from "@/types";

type TippedVideoSummary = {
  videoChannelId: string;
  videoTitle: string | null;
  eventName: string | null;
  tipCount: number;
  totalAmount: number;
  lastTippedAt: string;
  paymentSurfaces: string[];
};

import { touchVisitorTimestamp } from "@/lib/visitor-session";

interface Props {
  events: Event[];
  iTipped: number;
  tippedVideos?: TippedVideoSummary[];
  variant?: "page" | "drawer";
}

type ApiError = { error: { status: number; message: string } };
type Step = "signIn" | "verifyCode";

export const VisitorProfileClient = ({
  events,
  iTipped,
  tippedVideos = [],
  variant = "page",
}: Props) => {
  const isDrawer = variant === "drawer";
  const [openEmail, setOpenEmail] = useState(false);

  const form = useForm<{ email: string; code: string }>({
    defaultValues: { email: "", code: "" },
  });

  const email = form.watch("email");

  const [isLoading, setIsLoading] = useState(false);
  const dispatch = useDispatch();

  const user = useSelector((state: RootState) => state.auth.user);
  const userId = user ? user.id : "";

  const token = useSelector((state: RootState) => state.auth.token);

  const isMobile = useMediaQuery({
    query: "(max-width: 500px)",
  });

  const [code, setCode] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (user?.role === "VISITOR") {
      touchVisitorTimestamp();
    }
  }, [user?.role]);

  const inputStyle = {
    background: "#f7c87c80",
    width: isMobile ? "36px" : "54px",
    height: isMobile ? "36px" : "60px",
    margin: isMobile ? "0 4px" : "0 8px",
    borderRadius: isMobile ? "4px" : "8px",
    outline: "none",
    fontSize: isMobile ? "16px" : "20px",
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

      dispatch(
        setCredentials({
          user,
          token: token!,
          requiresVerification: false,
        })
      );

      await persistAuthSession(
        token!,
        {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          username: user.username,
          role: "TIPPER",
        },
        { expiresDays: 60 }
      );

      toast.success("Email verified successfully!");

      if (isDrawer) {
        setOpenEmail(false);
        return;
      }
      router.push(`/tipper/${user.username}`);
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

  const [step, setStep] = useState<Step>("signIn");

  const handleLogin = async (values: { email: string }) => {
    try {
      setIsLoading(true);

      const response = await loginVisitorAction({
        visitorId: userId,
        email: values.email,
        role: "TIPPER",
      });

      if (!response.success) {
        toast.error(response.message);
        return;
      }

      const { id, fullName, email, username } = (
        response.data as {
          tipper: {
            id: string;
            fullName: string;
            email: string;
            username: string;
          };
        }
      ).tipper;
      const token = (response.data as { token: string }).token;

      dispatch(
        setCredentials({
          user: {
            ...user!,
            id,
            fullName,
            email,
            username,
            role: "TIPPER",
          },
          token,
          requiresVerification: true,
        })
      );

      // Store in cookies (for persistence)
      await persistAuthSession(
        token,
        {
          id,
          fullName,
          email,
          username,
          role: "TIPPER",
        },
        { expiresDays: 60 }
      );

      if (response.success) setStep("verifyCode");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-1">
      {!isDrawer ? <NavbarShell /> : null}
      <VisitorProfileBanner
        iTipped={iTipped}
        variant={variant}
      />

      <div className={isDrawer ? "px-2" : "p-4"}>
        <p className="mx-auto flex max-w-2xl items-center justify-between gap-2 rounded-md border border-dashed border-black p-4 text-sm text-black">
          <div className="flex items-center gap-2">
            <TriangleAlert className="text-destructive" /> Stop missing out.{" "}
            {isMobile ? <br /> : ""} Sign in to use your profile
          </div>
          <Button
            size="sm"
            className="border border-white bg-[#321801]/80"
            onClick={() => setOpenEmail(true)}
          >
            Sign in
          </Button>
        </p>
        {isDrawer ? (
          <p className="text-muted-foreground mx-auto mt-2 max-w-2xl text-center text-xs">
            Guest account expires after 24 hours of inactivity.
          </p>
        ) : null}
      </div>

      <Dialog
        open={openEmail}
        onOpenChange={setOpenEmail}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="open_sans">
            {step === "signIn" ? (
              <>
                <DialogTitle className="mt-6 text-center text-3xl font-semibold">
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
                      className="h-12 w-full bg-black"
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

      <VisitorProfileTabs
        events={events}
        tippedVideos={tippedVideos}
        variant={variant}
      />
      {!isDrawer ? <Footer /> : null}
    </div>
  );
};
