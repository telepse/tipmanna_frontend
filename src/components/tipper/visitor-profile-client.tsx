"use client";

import { VisitorProfileBanner } from "./visitor-profile-banner";
import { ProfileTabs } from "./profile-tabs";
import { MoveLeft, TriangleAlert, Info } from "lucide-react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
import { ProfileSlugSync } from "./profile-slug-sync";

interface Props {
  events: Event[];
  iTipped: number;
  tippedVideos?: TippedVideoSummary[];
  viewMode?: "owner" | "public" | "drawer";
  profileSlug?: string;
  profileId?: string;
}

type ApiError = { error: { status: number; message: string } };
type Step = "signIn" | "verifyCode";

export const VisitorProfileClient = ({
  events,
  iTipped,
  tippedVideos = [],
  viewMode = "owner",
  profileSlug,
  profileId,
}: Props) => {
  const isDrawer = viewMode === "drawer";
  const isPublic = viewMode === "public";
  const isPageOwner = viewMode === "owner";
  const [openEmail, setOpenEmail] = useState(false);

  const form = useForm<{ email: string; code: string }>({
    defaultValues: { email: "", code: "" },
  });

  const email = form.watch("email");

  const [isLoading, setIsLoading] = useState(false);
  const dispatch = useDispatch();

  const user = useSelector((state: RootState) => state.auth.user);
  const userId = user ? user.id : "";

  const showClaim =
    isPageOwner ||
    (isDrawer &&
      user?.role === "VISITOR" &&
      (!profileId || user.id === profileId));

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

      const slug = profileSlug ?? user.username;
      if (isDrawer) {
        setOpenEmail(false);
        return;
      }
      router.push(`/tipper/${slug}`);
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
      const newToken = (response.data as { token: string }).token;

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
          token: newToken,
          requiresVerification: true,
        })
      );

      await persistAuthSession(
        newToken,
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

  const tabsVariant = isPublic ? "public" : isDrawer ? "drawer" : "owner";

  return (
    <div className="space-y-1">
      {isPageOwner && profileSlug ? (
        <ProfileSlugSync profileSlug={profileSlug} />
      ) : null}
      {!isDrawer ? <NavbarShell /> : null}
      <VisitorProfileBanner
        iTipped={iTipped}
        variant={viewMode}
        profileSlug={profileSlug}
        showOwnerControls={showClaim}
      />

      {showClaim ? (
        <div className={isDrawer ? "px-2" : "p-4"}>
          <p className="mx-auto flex max-w-2xl items-center justify-between gap-2 rounded-md border border-dashed border-black p-4 text-sm text-black">
            <div className="flex items-center gap-2">
              <TriangleAlert className="text-destructive" /> Stop missing out.{" "}
              {isMobile ? <br /> : ""} Sign in to claim your profile
            </div>
            <Button
              size="sm"
              className="border border-white bg-[#321801]/80"
              onClick={() => setOpenEmail(true)}
            >
              Claim profile
            </Button>
          </p>
          {isDrawer ? (
            <p className="text-muted-foreground mx-auto mt-2 max-w-2xl text-center text-xs">
              Guest account expires after 24 hours of inactivity.
            </p>
          ) : null}
        </div>
      ) : isPublic ? (
        <div className={`mx-auto max-w-2xl ${isDrawer ? "px-2" : "p-4"}`}>
          <p className="flex items-center justify-center gap-2 text-sm text-[#321801]">
            Visitor
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex"
                    aria-label="Visitor profile expiry"
                  >
                    <Info className="size-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  This tipper profile may expire in 24 hours if unclaimed by the
                  owner.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </p>
        </div>
      ) : null}

      {showClaim ? (
        <Dialog
          open={openEmail}
          onOpenChange={setOpenEmail}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader className="open_sans">
              {step === "signIn" ? (
                <>
                  <DialogTitle className="mt-6 text-center text-3xl font-semibold">
                    Enter email to claim profile
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
      ) : null}

      <section
        className={
          isDrawer
            ? "flex w-full flex-col items-center px-2 pb-6"
            : "flex w-full flex-col items-center bg-cover bg-center bg-no-repeat px-2 py-6 sm:px-4 lg:py-10"
        }
        style={
          isDrawer
            ? undefined
            : { backgroundImage: `url(/vectors/tipping_pattern_new.webp)` }
        }
      >
        <ProfileTabs
          events={events}
          causes={[]}
          tippedVideos={tippedVideos}
          variant={tabsVariant}
          totalTipped={iTipped}
        />
        {isDrawer && profileSlug ? (
          <a
            href={`/visitor/${profileSlug}`}
            className="text-primary mt-4 text-sm font-medium underline underline-offset-2"
          >
            Open full profile
          </a>
        ) : null}
      </section>
      {!isDrawer ? <Footer /> : null}
    </div>
  );
};
