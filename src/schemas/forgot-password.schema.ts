import * as z from "zod";

export const forgotPasswordSchema = z.object({
  email: z.email("Invalid email address"),
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
