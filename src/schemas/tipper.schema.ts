import * as z from "zod";

export const tipperSignInSchema = z.object({
  email: z.email("Invalid email address"),
});

export type TipperSignInFormData = z.infer<typeof tipperSignInSchema>;

export const tipperSignUpSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  email: z.email().min(2, "Email address is required"),
  acceptedTerms: z.boolean().refine(val => val === true, {
    message: "You must agree to the terms and privacy policy",
  }),
});

export type TipperSignUpFormData = z.infer<typeof tipperSignUpSchema>;
