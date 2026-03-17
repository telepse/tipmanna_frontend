import * as z from "zod";

export const resetPasswordSchema = z.object({
  password: z.string().min(6, "Password is required"),
  confirmPassword: z.string().min(6, "Confirm password is required"),
});

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
