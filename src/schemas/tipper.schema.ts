import * as z from "zod";
import { normalizeEmail } from "@/lib/normalize-email";

export const tipperSignInSchema = z.object({
  email: z.email("Invalid email address").transform(v => normalizeEmail(v)),
});

export type TipperSignInFormData = z.infer<typeof tipperSignInSchema>;

export const tipperSignUpSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  email: z
    .email()
    .min(2, "Email address is required")
    .transform(v => normalizeEmail(v)),
  acceptedTerms: z.boolean().refine(val => val === true, {
    message: "You must agree to the terms and privacy policy",
  }),
});

export type TipperSignUpFormData = z.infer<typeof tipperSignUpSchema>;
