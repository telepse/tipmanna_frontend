/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// Third-party imports
import { Eye, Loader2, MoveLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  FormField,
  FormLabel,
  FormItem,
  FormMessage,
  FormControl,
  Form,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "react-toastify";

// Local imports
import { Paragraph } from "@/components/shared/paragraph";
import {
  ResetPasswordFormData,
  resetPasswordSchema,
} from "@/schemas/reset-password.schema";
import { resetPasswordAction } from "@/actions/auth";
import { ApiError } from "@/types/api-error.types";

export default function ResetPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword(prev => !prev);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(prev => !prev);
  };

  // 2. Define reset password form
  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  // 4. Define submit handler
  const onSubmit = async (values: ResetPasswordFormData) => {
    setIsLoading(true);

    try {
      if (!token) throw new Error("Invalid or missing reset token");

      const res = await resetPasswordAction({
        token,
        newPassword: values.password,
      });
      if (!res.success) {
        toast.error(res.message);
        return;
      }

      toast.success((res.data as any).message);

      // redirect user to reset-password successful page
      router.push("/password-reset-successful");
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else if (typeof err === "object" && err !== null && "error" in err) {
        const apiErr = err as ApiError;
        toast.error(apiErr.error.message);
      } else {
        toast.error("Failed to reset password");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center">
      <Link
        href="/forgot-password"
        className="hover:bg-secondary absolute top-4 left-4 flex w-fit gap-2 rounded-full px-4 py-2 text-base sm:top-8 sm:left-8 sm:text-lg"
      >
        <MoveLeft /> Back
      </Link>

      <div className="mx-auto flex w-full max-w-md flex-col items-center space-y-6 p-6">
        <h1 className="racing_sans_one text-3xl sm:text-5xl">Reset password</h1>

        <Paragraph
          align="center"
          size="sm"
          color="muted"
        >
          Enter new password.
        </Paragraph>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="w-full space-y-6"
          >
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter new password"
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
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm new password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm new password"
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

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" /> Resetting
                  password...
                </span>
              ) : (
                "Reset password"
              )}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
