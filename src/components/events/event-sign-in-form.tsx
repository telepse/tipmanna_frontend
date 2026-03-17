"use client";

import { useState } from "react";

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
import { Button } from "@/components/ui/button";
import OTPInput from "react-otp-input";
import { useForm } from "react-hook-form";
import Cookies from "js-cookie";
import { useMediaQuery } from "react-responsive";
import { MoveLeft } from "lucide-react";
import { toast } from "react-toastify";
import { useDispatch, useSelector } from "react-redux";

// Local imports
import { Paragraph } from "@/components/shared/paragraph";
import { loginOrRegisterHostAction, verifyCodeAction } from "@/actions/auth";
import { setCredentials } from "@/features/auth-slice";
import { ApiError } from "@/types/api-error.types";
import { RootState } from "@/redux/store";

type signIn_Step = "signIn" | "signInVerifyCode";

export const EventSignInForm = () => {
  const [signInStep, setSignInStep] = useState<signIn_Step>("signIn");
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
  }>({
    defaultValues: { fullName: "", email: "", acceptedTerms: false },
  });

  const handleLogin = async (values: { fullName: string; email: string }) => {
    try {
      setIsLoading(true);

      const res = await loginOrRegisterHostAction({
        fullName: values.fullName,
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
            role: "HOST",
          },
          token,
          requiresVerification: true,
        })
      );

      // Store in cookies (for persistence)
      Cookies.set(
        "user",
        JSON.stringify({ id, fullName, email, username, role: "HOST" }),
        {
          expires: 7,
        }
      );
      Cookies.set("token", token, { expires: 7 });

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

      await verifyCodeAction(user.email, code);

      dispatch(
        setCredentials({
          user,
          token: token!,
          requiresVerification: false,
        })
      );

      toast.success("Email verified successfully!");
      setSignInStep("signIn");
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

  return (
    <>
      {signInStep === "signIn" ? (
        <div className="mx-auto w-full max-w-md space-y-6 rounded-lg border-2 border-white bg-black/60 p-4 text-white">
          <h2 className="mt-6 text-center text-3xl font-semibold">
            Sign in / Sign up to continue
          </h2>

          <Form {...signInForm}>
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
                      className="bg-[#3b3b3b] placeholder:text-white/50"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                      className="bg-[#3b3b3b] placeholder:text-white/50"
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
              onClick={signInForm.handleSubmit(handleLogin)}
            >
              {isLoading ? "Sending code..." : "Sign in"}
            </Button>
          </Form>
        </div>
      ) : (
        <div className="relative mx-auto flex w-full max-w-md flex-col items-center justify-center gap-6 rounded-md bg-black/60 p-4 text-white">
          <h2 className="mt-12 text-center text-3xl font-semibold">
            Verify your email
          </h2>
          <Paragraph
            align="center"
            size="xs"
            color="white"
            weight="normal"
          >
            We&apos;ve sent a 6-digit code to <strong>{user?.email}</strong>.
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

          <button
            type="button"
            className="absolute top-0 left-0 cursor-pointer border-none p-4 outline-none"
            onClick={() => setSignInStep("signIn")}
          >
            <MoveLeft className="text-white" />
          </button>
        </div>
      )}
    </>
  );
};
