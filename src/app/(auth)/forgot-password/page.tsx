"use client";

import Link from "next/link";
import { useState } from "react";

// Third-party imports
import { Loader2, MoveLeft } from "lucide-react";
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
  ForgotPasswordFormData,
  forgotPasswordSchema,
} from "@/schemas/forgot-password.schema";
import { forgotPasswordAction } from "@/actions/auth";
import { ApiError } from "@/types/api-error.types";

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);

  // 2. Define forgot password form
  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  // 4. Define submit handler
  const onSubmit = async (values: ForgotPasswordFormData) => {
    try {
      setIsLoading(true);

      const res = await forgotPasswordAction(values.email);
      if (!res.success) {
        toast.error(res.message);
        return;
      }

      toast.success(res.data.message);
      form.reset();
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else if (typeof err === "object" && err !== null && "error" in err) {
        const apiErr = err as ApiError;
        toast.error(apiErr.error.message);
      } else {
        toast.error("Failed to send reset link");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center">
      <Link
        href="/sign-in"
        className="hover:bg-secondary absolute top-4 left-4 flex w-fit gap-2 rounded-full px-4 py-2 text-base sm:top-8 sm:left-8 sm:text-lg"
      >
        <MoveLeft /> Back
      </Link>

      <div className="mx-auto flex max-w-md flex-col items-center space-y-6 p-6">
        <h1 className="racing_sans_one text-3xl sm:text-5xl">
          Forgot password?
        </h1>

        <Paragraph
          align="center"
          size="sm"
          color="muted"
        >
          Enter your email address and we&apos;ll send you a link to reset your
          password.
        </Paragraph>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="w-full space-y-6"
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
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" /> Sending reset
                  link...
                </span>
              ) : (
                "Send reset link"
              )}
            </Button>
          </form>
        </Form>

        <Paragraph
          align="center"
          size="sm"
        >
          Remember your password?{" "}
          <Link
            href="/sign-in"
            className="text-primary"
          >
            Back to login
          </Link>
        </Paragraph>
      </div>
    </div>
  );
}
