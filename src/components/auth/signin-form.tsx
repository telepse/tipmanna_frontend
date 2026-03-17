"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import Cookies from "js-cookie";

// Local imports
import { HostSignInFormData, hostSignInSchema } from "@/schemas/host.schema";
import {
  TipperSignInFormData,
  tipperSignInSchema,
} from "@/schemas/tipper.schema";
import { Paragraph } from "@/components/shared/paragraph";
import { loginHostAction, loginTipperAction } from "@/actions/auth";
import { setCredentials } from "@/features/auth-slice";
import { ApiError } from "@/types/api-error.types";

export const SigninForm = () => {
  const [userType, setUserType] = useState<"host" | "tipper">("host");
  const [showPassword, setShowPassword] = useState(false);

  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email");

  // NEW: loading states
  const [isHostLoading, setIsHostLoading] = useState(false);
  const [isTipperLoading, setIsTipperLoading] = useState(false);

  const router = useRouter();
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
        toast.error(res.message);
        return;
      }

      const { id, fullName, email, username, eventCode, eventSlug } =
        res.data.host;
      const { token, message } = res.data;

      toast.success(message);

      // update redux store
      dispatch(
        setCredentials({
          user: {
            id,
            fullName,
            email,
            username,
            role: "HOST",
            eventCode,
            eventSlug,
          },
          token,
        })
      );

      // Store in cookies (for persistence)
      Cookies.set(
        "user",
        JSON.stringify({
          id,
          fullName,
          email,
          role: "HOST",
          eventCode,
          eventSlug,
        }),
        {
          expires: 7,
        }
      );
      Cookies.set("token", token, { expires: 7 });

      // redirect to host dashboard page
      router.push(`/host/${eventSlug}`);
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

      const { id, fullName, email, username, anonymous, eventCode, eventSlug } =
        res.data.user;
      const { token, message, role, tag } = res.data;

      toast.success(message);

      // update redux store
      if (role === "TIPPER") {
        dispatch(
          setCredentials({
            user: {
              id,
              fullName,
              email,
              username,
              role: "TIPPER",
              anonymous,
            },
            token,
            requiresVerification: true,
          })
        );

        // Store in cookies (for persistence)
        Cookies.set(
          "user",
          JSON.stringify({
            id,
            fullName,
            email,
            username,
            role: "TIPPER",
            anonymous,
          }),
          {
            expires: 60,
          }
        );
      } else if (role === "HOST") {
        dispatch(
          setCredentials({
            user: {
              id,
              fullName,
              email,
              username,
              role: "HOST",
              eventCode,
              eventSlug,
            },
            token,
            requiresVerification: true,
            tag: tag ?? null,
          })
        );

        // Store in cookies (for persistence)
        Cookies.set(
          "user",
          JSON.stringify({
            id,
            fullName,
            email,
            username,
            role: "HOST",
            eventCode,
            eventSlug,
          }),
          {
            expires: 7,
          }
        );
      }

      Cookies.set("token", token, { expires: 7 });

      // redirect to verify email page
      router.push("/verify-email");
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
            className="h-13! font-semibold"
          >
            Host
          </TabsTrigger>
          <TabsTrigger
            value="tipper"
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
