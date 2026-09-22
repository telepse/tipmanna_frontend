import * as z from "zod";
import { normalizeEmail } from "@/lib/normalize-email";

export const hostSignInSchema = z.object({
  emailOrUsername: z.string().min(2, "Email or username is required"),
  password: z.string().min(6, "Password is required"),
});

export type HostSignInFormData = z.infer<typeof hostSignInSchema>;

export const hostSignUpSchema = z
  .object({
    fullName: z
      .string()
      .min(2, "Full name is required")
      .refine(val => val.trim().split(/\s+/).filter(Boolean).length >= 2, {
        message: "Please enter both your first and last name",
      }),
    email: z.email("Invalid email address").transform(v => normalizeEmail(v)),
    username: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .max(30, "Username must be at most 30 characters")
      .regex(
        /^[a-zA-Z0-9_]+$/,
        "Username can only contain letters, numbers, and underscores"
      ),
    password: z.string().min(8, "Password must be at least 8 characters long"),
    confirmPassword: z.string().min(8, "Confirm password is required"),
    acceptedTerms: z.boolean().refine(val => val === true, {
      message: "You must agree to the terms and privacy policy",
    }),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type HostSignUpFormData = z.infer<typeof hostSignUpSchema>;
