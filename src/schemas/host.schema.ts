import * as z from "zod";

export const hostSignInSchema = z.object({
  email: z.email("Invalid email address"),
  password: z.string().min(6, "Password is required"),
});

export type HostSignInFormData = z.infer<typeof hostSignInSchema>;

export const hostSignUpSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  email: z.email("Invalid email address"),
  password: z.string().min(6, "Password is required"),
  confirmPassword: z.string().min(6, "Confirm password is required"),
  acceptedTerms: z.boolean().refine(val => val === true, {
    message: "You must agree to the terms and privacy policy",
  }),
});

export type HostSignUpFormData = z.infer<typeof hostSignUpSchema>;
