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
import { Eye, Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import { useDispatch } from "react-redux";

// Local imports
import { HostSignInFormData, hostSignInSchema } from "@/schemas/host.schema";
import {
  TipperSignInFormData,
  tipperSignInSchema,
} from "@/schemas/tipper.schema";
import { Paragraph } from "@/components/shared/paragraph";
import {
  loginHostAction,
  loginTipperAction,
  requestLoginCodeAction,
} from "@/actions/auth";
import { setCredentials } from "@/features/auth-slice";
import { ApiError } from "@/types/api-error.types";
import { useAppRouter } from "@/components/navigation/navigation-progress-provider";
import {
  isUnverifiedHostMessage,
  parseAuthResponse,
} from "@/lib/auth-response";
import { persistAuthSession } from "@/lib/session-client";

function safeInternalPath(next: string | null): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}

export type SigninFormProps = {
  mode?: "page" | "modal";
  /** Deep link after sign-in (same as ?next= / ?redirect=). */
  returnTo?: string | null;
  /** Modal flows that require a tipper (e.g. dedicated community link). */
  defaultUserType?: "host" | "tipper";
  /** Called when host signs in successfully inside a modal (no navigation). */
  onModalHostSuccess?: (payload: {
    role: "HOST";
    username: string;
    eventSlug: string | null;
  }) => void;
};

export const SigninForm = ({
  mode = "page",
  returnTo: returnToProp,
  defaultUserType = "host",
  onModalHostSuccess,
}: SigninFormProps = {}) => {
  const [userType, setUserType] = useState<"host" | "tipper">(
    () => defaultUserType
  );
  const [showPassword, setShowPassword] = useState(false);

  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email");
  const returnTo = safeInternalPath(
    returnToProp ?? searchParams.get("next") ?? searchParams.get("redirect")
  );

  // NEW: loading states
  const [isHostLoading, setIsHostLoading] = useState(false);
  const [isTipperLoading, setIsTipperLoading] = useState(false);

  const { push } = useAppRouter();
  const dispatch = useDispatch();

  const togglePasswordVisibility = () => {
    setShowPassword(prev => !prev);
  };

  // 1. Define Host form
  const hostForm = useForm<HostSignInFormData>({
    resolver: zodResolver(hostSignInSchema),
    defaultValues: {
      email: emailParam || "",
      password: "",
    },
  });

  // 2. Define Tipper form
  const tipperForm = useForm<TipperSignInFormData>({
    resolver: zodResolver(tipperSignInSchema),
    defaultValues: {
      email: "",
    },
  });

  // 3. Define host submit handler
  const onSubmitHost = async (values: HostSignInFormData) => {
    try {
      setIsHostLoading(true);

      const res = await loginHostAction(values);
      if (!res.success) {
        if (isUnverifiedHostMessage(res.message)) {
          toast.info("Verify your email to continue — we sent you a code.");
          const emailQ = encodeURIComponent(values.email);
          push(
            returnTo
              ? `/verify-email?email=${emailQ}&next=${encodeURIComponent(returnTo)}`
              : `/verify-email?email=${emailQ}`
          );
          return;
        }
        toast.error(res.message);
        return;
      }

      const parsed = parseAuthResponse(res.data);
      if (!parsed) {
        toast.error("Unexpected sign-in response");
        return;
      }

      const { user, token, message } = parsed;
      toast.success(message);

      dispatch(
        setCredentials({
          user: { ...user, role: "HOST" },
          token,
        })
      );

      await persistAuthSession(token, user, { expiresDays: 7 });

      if (mode === "modal" && onModalHostSuccess) {
        onModalHostSuccess({
          role: "HOST",
          username: user.username,
          eventSlug: user.eventSlug ?? null,
        });
        return;
      }

      const dest = returnTo;
      push(dest ?? `/host/${user.eventSlug ?? user.username}`);
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
      setIsHostLoading(false);
    }
  };

  // 4. Define tipper submit handler
  const onSubmitTipper = async (values: TipperSignInFormData) => {
    try {
      setIsTipperLoading(true);

      const res = await loginTipperAction(values);
      if (!res.success) {
        toast.error(res.message);
        return;
      }

      const parsed = parseAuthResponse(res.data);
      if (!parsed) {
        toast.error("Unexpected sign-in response");
        return;
      }

      const { user, token, message, role, tag } = parsed;
      toast.success(message);

      if (role === "TIPPER") {
        dispatch(
          setCredentials({
            user: { ...user, role: "TIPPER" },
            token,
            requiresVerification: true,
          })
        );
        await persistAuthSession(token, user, { expiresDays: 60 });
      } else {
        dispatch(
          setCredentials({
            user: { ...user, role: "HOST" },
            token,
            requiresVerification: true,
            tag: tag ?? null,
          })
        );
        await persistAuthSession(token, user, { expiresDays: 7 });
      }

      push(
        returnTo
          ? `/verify-email?next=${encodeURIComponent(returnTo)}`
          : "/verify-email"
      );
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
      setIsTipperLoading(false);
    }
  };

  const handleRequestLoginCode = async (values: { email: string }) => {
    try {
      setIsHostLoading(true);

      if (!values.email) {
        toast.error("Put in your email address first");
        return;
      }

      const res = await requestLoginCodeAction({ email: values.email });
      if (!res.success) {
        toast.error(res.message);
        return;
      }

      toast.success(
        (res.data as { message?: string })?.message ??
          "Verification code sent — check your email"
      );

      const emailQ = encodeURIComponent(values.email);
      push(
        returnTo
          ? `/verify-email?email=${emailQ}&next=${encodeURIComponent(returnTo)}`
          : `/verify-email?email=${emailQ}`
      );
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else if (typeof err === "object" && err !== null && "error" in err) {
        const apiErr = err as ApiError;
        toast.error(apiErr.error.message);
      } else {
        toast.error("Failed to request verification code");
      }
    } finally {
      setIsHostLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl">
      <Tabs
        value={userType}
        onValueChange={val => setUserType(val as "host" | "tipper")}
        className="section lg:py-12"
      >
        <TabsList className="bg-secondary/20 flex h-14! w-full">
          <TabsTrigger
            value="host"
            data-testid="signin-tab-host"
            className="h-13! font-semibold"
          >
            Host
          </TabsTrigger>
          <TabsTrigger
            value="tipper"
            data-testid="signin-tab-tipper"
            className="h-13! font-semibold"
          >
            Tipper
          </TabsTrigger>
        </TabsList>

        {/* Host form */}
        <TabsContent
          value="host"
          className="mt-6 space-y-6"
        >
          <Form {...hostForm}>
            <form
              onSubmit={hostForm.handleSubmit(onSubmitHost)}
              className="space-y-6"
            >
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

              <FormField
                control={hostForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter password"
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

              <button
                type="button"
                data-testid="signin-request-login-code"
                onClick={() =>
                  handleRequestLoginCode({ email: hostForm.getValues("email") })
                }
                className="text-muted-foreground cursor-pointer text-sm underline"
              >
                Request login code instead?
              </button>

              <Paragraph
                align="right"
                size="sm"
                color="muted"
              >
                <Link
                  href="/forgot-password"
                  className="hover:underline"
                >
                  Forgot password?
                </Link>
              </Paragraph>

              <Button
                type="submit"
                size="lg"
                className="w-full"
                data-testid="signin-host-submit"
                disabled={isHostLoading}
              >
                {isHostLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" /> Signing in...
                  </span>
                ) : (
                  <span>Sign in</span>
                )}
              </Button>

              <Paragraph
                align="center"
                size="sm"
              >
                Don&apos;t have an account?{" "}
                <Link
                  href="/create-account"
                  className="text-primary hover:underline"
                >
                  Sign up
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
              className="mt-6 space-y-6"
            >
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

              <Button
                type="submit"
                size="lg"
                className="w-full"
                data-testid="signin-tipper-submit"
                disabled={isTipperLoading}
              >
                {isTipperLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" /> Signing in...
                  </span>
                ) : (
                  <span>Sign in</span>
                )}
              </Button>

              <Paragraph
                align="center"
                size="sm"
              >
                Don&apos;t have an account?{" "}
                <Link
                  href="/create-account"
                  className="text-primary hover:underline"
                >
                  Sign up
                </Link>
              </Paragraph>
            </form>
          </Form>
        </TabsContent>
      </Tabs>
    </div>
  );
};
