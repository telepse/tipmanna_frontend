/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";

// Third-party imports
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import Cookies from "js-cookie";
import OTPInput from "react-otp-input";
import { useMediaQuery } from "react-responsive";
import { MoveLeft } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

// Local impots
import { loginOrRegisterTipperAction, verifyCodeAction } from "@/actions/auth";
import { setCredentials } from "@/features/auth-slice";
import { ApiError } from "@/types/api-error.types";
import { Paragraph } from "@/components/shared/paragraph";
import { TipperProfileClient } from "../tipper/tipper-profile-client";

interface Props {
  isProfileDrawerOpen: boolean;
  setIsProfileDrawerOpen: (value: boolean) => void;
  tipperEvents: any[];
  iTipped: number;
  causes: any[];
}

type Step = "signIn" | "verifyCode" | "tipperProfile";

export const ProfileDrawer = ({
  isProfileDrawerOpen,
  setIsProfileDrawerOpen,
  tipperEvents,
  iTipped,
  causes,
}: Props) => {
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<Step>("signIn");
  const [code, setCode] = useState("");

  const user = useSelector((state: RootState) => state.auth.user);
  const token = useSelector((state: RootState) => state.auth.token);
  const dispatch = useDispatch();

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

      const { id, fullName, email, username } = res.data.user;
      const token = res.data.token;

      dispatch(
        setCredentials({
          user: {
            id,
            fullName,
            email,
            username,
            role: "TIPPER",
          },
          token,
        })
      );

      // Store in cookies (for persistence)
      Cookies.set(
        "user",
        JSON.stringify({ id, fullName, email, username, role: "TIPPER" }),
        {
          expires: 7,
        }
      );
      Cookies.set("token", token, { expires: 7 });

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

      dispatch(
        setCredentials({
          user,
          token: token!,
          requiresVerification: false,
        })
      );

      toast.success("Email verified successfully!");

      if (res.success) setStep("tipperProfile");
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
    <Drawer
      open={isProfileDrawerOpen}
      onOpenChange={setIsProfileDrawerOpen}
    >
      <DrawerContent className="fixed inset-0 z-[999999999] flex h-screen flex-col space-y-4 p-2">
        <button
          type="button"
          onClick={() => setIsProfileDrawerOpen(false)}
          className="absolute top-4 right-4 rounded-full p-2 text-black hover:bg-gray-200"
        >
          <X size={24} />
        </button>

        <div className="flex-1 overflow-y-auto">
          {!user && step === "signIn" && (
            <>
              <DrawerTitle className="mt-6 text-center">
                Enter email to view profile
              </DrawerTitle>

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
          )}

          {!user && step === "verifyCode" && (
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

          {(user || step === "tipperProfile") && (
            <div>
              <TipperProfileClient
                events={tipperEvents}
                iTipped={iTipped}
                causes={causes}
              />
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
};
