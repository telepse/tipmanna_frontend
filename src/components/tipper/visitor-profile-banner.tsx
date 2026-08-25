"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// Third-party imports
import {
  ArrowLeft,
  PencilLine,
  Settings,
  Share2,
  UserRound,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useDispatch, useSelector } from "react-redux";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import {
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormField,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

// Local imports
import { Paragraph } from "@/components/shared/paragraph";
import { Title } from "@/components/shared/title";
import { RootState } from "@/redux/store";
import { getTipperUsername } from "@/lib/utils";
import { loginVisitorAction, verifyCodeAction } from "@/actions/auth";
import { setCredentials } from "@/features/auth-slice";
import OTPInput from "react-otp-input";
import { useMediaQuery } from "react-responsive";

type ApiError = { error: { status: number; message: string } };
type Step = "signIn" | "verifyCode";

interface Props {
  iTipped: number;
  variant?: "page" | "drawer";
}

export const VisitorProfileBanner = ({ iTipped, variant = "page" }: Props) => {
  const isDrawer = variant === "drawer";
  const [enabled] = useState(false);
  const [openEmail, setOpenEmail] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const user = useSelector((state: RootState) => state.auth.user);
  const username = user
    ? getTipperUsername(user.email || "") || user.username
    : "";
  const userId = user ? user.id : "";
  console.log(userId);

  const token = useSelector((state: RootState) => state.auth.token);

  const router = useRouter();
  const dispatch = useDispatch();

  const form = useForm<{ email: string; code: string }>({
    defaultValues: { email: "", code: "" },
  });

  const email = form.watch("email");

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

      const { email, username } = (
        response.data as { tipper: { email: string; username: string } }
      ).tipper;
      const token = (response.data as { token: string }).token;

      dispatch(
        setCredentials({
          user: {
            ...user!,
            email,
            username,
            role: "TIPPER",
          },
          token,
        })
      );

      if (response.success) setStep("verifyCode");
    } finally {
      setIsLoading(false);
    }
  };

  const isMobile = useMediaQuery({
    query: "(max-width: 500px)",
  });

  const [code, setCode] = useState("");

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
      await verifyCodeAction(user.email, code);

      dispatch(
        setCredentials({
          user,
          token: token!,
          requiresVerification: false,
        })
      );

      toast.success("Email verified successfully!");

      // redirect to tipper profile
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

  const [, setIsVerifying] = useState(false);
  const [step, setStep] = useState<Step>("signIn");

  const searchParams = useSearchParams();
  const from = searchParams.get("from");
  const handleBack = () => {
    router.push(from || "/explore");
  };

  return (
    <div
      style={{
        backgroundImage: `linear-gradient(to bottom, #321801, #321801, #321801)`,
      }}
      className="relative w-full"
    >
      <Button
        onClick={handleBack}
        className={`open_sans absolute top-4 left-4 flex items-center gap-2 rounded-full px-4 py-2 text-sm text-white sm:text-base lg:top-8 lg:left-8 ${isDrawer ? "hidden" : ""}`}
      >
        <ArrowLeft className="size-5" /> <span>Back to event</span>
      </Button>

      <div className={`mx-auto max-w-2xl px-4 ${isDrawer ? "py-3" : "py-6"}`}>
        {/* === Mobile Layout === */}
        <div className="flex flex-col items-center gap-4 text-white sm:hidden">
          {/* Avatar */}
          <div className="relative mt-6 flex items-center justify-center">
            <div className="flex size-18 items-center justify-center rounded-full bg-white">
              <UserRound className="size-10 text-[#321801]" />
            </div>

            {/* Pencil (Edit) */}
            <div className="absolute top-1 right-[-12px] cursor-pointer bg-transparent">
              <Button
                size="icon"
                onClick={() => setOpenEmail(true)}
                className="bg-[#321801]"
              >
                <PencilLine className="size-4 text-white/90" />
              </Button>
            </div>

            {/* Settings (Inside circle like mockup) */}
            <div className="absolute right-[-12px] bottom-0 flex size-6 items-center justify-center rounded-md border border-white bg-white/20">
              {/* <Button
                size="lg"
                className="border border-white bg-[#321801]/80"
                onClick={() => setOpenEmail(true)}
              >
                Sign in
              </Button> */}
              <Settings className="text-white/80" />
            </div>
          </div>

          {/* Username */}
          <Paragraph
            weight="bold"
            color="white"
            className="text-lg"
          >
            {username}
          </Paragraph>

          {/* Anonymous toggle */}
          <div className="flex items-center justify-center gap-2 opacity-50">
            <Paragraph
              size="sm"
              color="white"
            >
              Anonymous Tipping
            </Paragraph>
            <Switch
              id="anonymous-mode"
              checked={enabled}
              // onCheckedChange={setEnabled}
              onCheckedChange={() => setOpenEmail(true)}
              className="cursor-pointer"
            />
          </div>

          {/* Total tipped */}
          <div className="flex items-center justify-center gap-4">
            <span className="rounded-md border border-white px-3 py-1 text-sm">
              Total Tipped
            </span>
            <Paragraph
              weight="bold"
              color="white"
              className="text-lg"
            >
              &pound;{iTipped}
            </Paragraph>
            <Button
              size="icon"
              className="bg-transparent hover:bg-white/10"
            >
              <Share2 className="text-white/80" />
            </Button>
          </div>

          {/* Logo bottom right */}
          <div className="mt-4 ml-auto text-sm font-semibold text-white/80 italic">
            <span className="text-secondary/80">tip</span>
            <span className="text-white">manna</span>
          </div>
        </div>

        {/* === Desktop Layout (unchanged) === */}
        <div className="hidden justify-between sm:flex">
          <div className="flex gap-4">
            <div className="flex size-10 items-center justify-center rounded-full bg-white">
              <UserRound className="text-[#321801]" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-4">
                <Paragraph
                  weight="bold"
                  color="white"
                >
                  {username}
                </Paragraph>
                <Button
                  size="icon"
                  onClick={() => setOpenEmail(true)}
                  className="bg-[#321801]"
                >
                  <PencilLine className="size-4 text-white/90" />
                </Button>
              </div>

              <div className="flex items-center gap-4">
                <Paragraph
                  size="sm"
                  color="white"
                >
                  Anonymous Tipping
                </Paragraph>
                <Switch
                  id="anonymous-mode"
                  checked={enabled}
                  // onCheckedChange={setEnabled}
                  onCheckedChange={() => setOpenEmail(true)}
                  className="cursor-pointer"
                />
              </div>

              <div className="flex items-center gap-4">
                <span className="rounded-md border border-white bg-[#321801] px-3 py-1 text-sm text-white">
                  Total Tipped
                </span>
                <Paragraph
                  weight="bold"
                  color="white"
                >
                  &pound;{iTipped}
                </Paragraph>
                <Button
                  size="icon"
                  className="bg-[#321801]"
                >
                  <Share2 className="text-white/80" />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end">
            <Button
              size="sm"
              className="border border-white bg-[#321801]/80 opacity-50"
              onClick={() => setOpenEmail(true)}
            >
              {/* Sign in */} <Settings className="text-white/80" />
            </Button>

            <Title size="sm">
              <span className="text-secondary/80">tip</span>
              <span className="text-white">manna</span>
            </Title>
          </div>
        </div>
      </div>

      <Dialog
        open={openEmail}
        onOpenChange={setOpenEmail}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader className="open_sans">
            {step === "signIn" ? (
              <>
                <DialogTitle className="mt-6 text-center text-3xl font-semibold">
                  Enter email for complete view
                </DialogTitle>

                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(handleLogin)}
                    className="mt-12 space-y-6"
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
              <div className="flex flex-col items-center justify-center py-12">
                <h2 className="open_sans text-3xl font-semibold sm:text-5xl">
                  Verify your email
                </h2>
                <Paragraph
                  align="center"
                  size="sm"
                  color="muted"
                >
                  We&apos;ve sent a 6-digit code to <strong>{email}</strong>.{" "}
                  <br />
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
                  className="h-12 w-full"
                  disabled={isLoading || code.length < 6}
                  onClick={handleVerify}
                >
                  {isLoading ? "Verifying email..." : "Verify email"}
                </Button>

                {/* Back Button */}
                <Button
                  size="lg"
                  variant="outline"
                  className="mt-6 w-32"
                  onClick={() => setIsVerifying(false)}
                >
                  Back
                </Button>
              </div>
            )}
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
};
