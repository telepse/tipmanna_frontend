"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

// Third-party imports
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import { useDispatch, useSelector } from "react-redux";

// Local imports
import { HostSignUpFormData, hostSignUpSchema } from "@/schemas/host.schema";
import {
  TipperSignUpFormData,
  tipperSignUpSchema,
} from "@/schemas/tipper.schema";
import { Paragraph } from "@/components/shared/paragraph";
import { registerHostAction, registerTipperAction } from "@/actions/auth";
import { setCredentials } from "@/features/auth-slice";
import { ApiError } from "@/types/api-error.types";
import { useAppRouter } from "@/components/navigation/navigation-progress-provider";
import { parseAuthResponse } from "@/lib/auth-response";
import { persistAuthSession } from "@/lib/session-client";
import { getVisitorIdForAuthMerge } from "@/lib/visitor-session";
import type { RootState } from "@/redux/store";

function safeInternalPath(next: string | null): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}

export const SignupForm = () => {
  const [userType, setUserType] = useState<"host" | "tipper">("host");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email");
  const redirectParam = searchParams.get("redirect");

  // NEW: loading states
  const [isHostLoading, setIsHostLoading] = useState(false);
  const [isTipperLoading, setIsTipperLoading] = useState(false);

  const { push } = useAppRouter();
  const dispatch = useDispatch();
  const authUser = useSelector((s: RootState) => s.auth.user);
  const visitorIdForMerge = getVisitorIdForAuthMerge(authUser);

  const togglePasswordVisibility = () => {
    setShowPassword(prev => !prev);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(prev => !prev);
  };

  // 1. Define Host form
  const hostForm = useForm<HostSignUpFormData>({
    resolver: zodResolver(hostSignUpSchema),
    defaultValues: {
      fullName: "",
      email: emailParam || "",
      password: "",
      confirmPassword: "",
      acceptedTerms: false,
    },
  });

  // 2. Define Tipper form
  const tipperForm = useForm<TipperSignUpFormData>({
    resolver: zodResolver(tipperSignUpSchema),
    defaultValues: {
      fullName: "",
      email: "",
      acceptedTerms: false,
    },
  });

  // 3. Define host submit handler
  const onSubmitHost = async (values: HostSignUpFormData) => {
    try {
      setIsHostLoading(true);

      const res = await registerHostAction({
        ...values,
        visitorId: visitorIdForMerge,
      });
      if (!res.success) {
        toast.error(res.message);
        return;
      }

      const parsed = parseAuthResponse(res.data);
      if (!parsed) {
        toast.error("Unexpected signup response — please try again");
        return;
      }

      const { user, token, message } = parsed;
      toast.success(message);

      dispatch(
        setCredentials({
          user: {
            ...user,
            role: "HOST",
          },
          token,
          requiresVerification: true,
        })
      );

      await persistAuthSession(token, user, { expiresDays: 7 });

      const next = safeInternalPath(redirectParam);
      push(
        next
          ? `/verify-email?next=${encodeURIComponent(next)}`
          : "/verify-email"
      );
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else if (typeof err === "object" && err !== null && "error" in err) {
        const apiErr = err as ApiError;
        toast.error(apiErr.error.message);
      } else {
        toast.error("Failed to register host");
      }
    } finally {
      setIsHostLoading(false);
    }
  };

  // 4. Define tipper submit handler
  const onSubmitTipper = async (values: TipperSignUpFormData) => {
    try {
      setIsTipperLoading(true);

      const res = await registerTipperAction({
        ...values,
        visitorId: visitorIdForMerge,
      });
      if (!res.success) {
        toast.error(res.message);
        return;
      }

      const parsed = parseAuthResponse(res.data);
      if (!parsed) {
        toast.error("Unexpected signup response — please try again");
        return;
      }

      const { user, token, message } = parsed;
      toast.success(message || "Tipper account created");

      dispatch(
        setCredentials({
          user: { ...user, role: "TIPPER" },
          token,
          requiresVerification: true,
        })
      );

      await persistAuthSession(token, user, { expiresDays: 60 });

      const next = safeInternalPath(redirectParam);
      push(
        next
          ? `/verify-email?next=${encodeURIComponent(next)}`
          : "/verify-email"
      );
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else if (typeof err === "object" && err !== null && "error" in err) {
        const apiErr = err as ApiError;
        toast.error(apiErr.error.message);
      } else {
        toast.error("Failed to register tipper");
      }
    } finally {
      setIsTipperLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <Tabs
        value={userType}
        onValueChange={val => setUserType(val as "host" | "tipper")}
        className="section lg:py-12"
      >
        <TabsList className="bg-secondary/20 flex h-14! w-full">
          <TabsTrigger
            value="host"
            className="h-13! font-semibold"
          >
            Host creator
          </TabsTrigger>
          <TabsTrigger
            value="tipper"
            className="h-13! font-semibold"
          >
            Tipper
          </TabsTrigger>
        </TabsList>

        <Paragraph
          align="center"
          size="sm"
          color="muted"
        >
          {userType === "host"
            ? "Add content or event"
            : "Engage on content and join event"}
        </Paragraph>

        {/* Host form */}
        <TabsContent
          value="host"
          className="space-y-6"
        >
          <Form {...hostForm}>
            <form
              onSubmit={hostForm.handleSubmit(onSubmitHost)}
              className="space-y-6"
            >
              <FormField
                control={hostForm.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter full name"
                        autoComplete="off"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={hostForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter email address"
                        autoComplete="off"
                        {...field}
                        readOnly={!!emailParam}
                        className={
                          emailParam ? "bg-gray cursor-not-allowed" : ""
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <FormField
                  control={hostForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Set password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Create password"
                            autoComplete="off"
                            {...field}
                          />

                          <button
                            type="button"
                            onClick={togglePasswordVisibility}
                            className="absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer"
                          >
                            <Eye className="text-muted-foreground" />
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={hostForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Confirm password"
                            autoComplete="off"
                            {...field}
                          />

                          <button
                            type="button"
                            onClick={toggleConfirmPasswordVisibility}
                            className="absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer"
                          >
                            <Eye className="text-muted-foreground" />
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={hostForm.control}
                name="acceptedTerms"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center gap-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
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
                className="w-full"
                disabled={isHostLoading}
              >
                {isHostLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" /> Creating
                    account...
                  </span>
                ) : (
                  <span>Create account</span>
                )}
              </Button>

              <Paragraph
                align="center"
                size="sm"
              >
                Already have an account?{" "}
                <Link
                  href="/sign-in"
                  className="text-primary hover:underline"
                >
                  Sign in
                </Link>
              </Paragraph>
            </form>
          </Form>
        </TabsContent>

        {/* Tipper form */}
        <TabsContent
          value="tipper"
          className="space-y-6"
        >
          <Form {...tipperForm}>
            <form
              onSubmit={tipperForm.handleSubmit(onSubmitTipper)}
              className="space-y-6"
            >
              <FormField
                control={tipperForm.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter full name"
                        autoComplete="off"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={tipperForm.control}
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
                control={tipperForm.control}
                name="acceptedTerms"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center gap-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
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
                className="w-full"
                disabled={isTipperLoading}
              >
                {isTipperLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" /> Creating
                    account...
                  </span>
                ) : (
                  <span>Create account</span>
                )}
              </Button>

              <Paragraph
                align="center"
                size="sm"
              >
                Already have an account?{" "}
                <Link
                  href="/sign-in"
                  className="text-primary hover:underline"
                >
                  Sign in
                </Link>
              </Paragraph>
            </form>
          </Form>
        </TabsContent>
      </Tabs>
    </div>
  );
};
