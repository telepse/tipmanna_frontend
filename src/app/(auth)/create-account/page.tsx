"use client";

import { SignupForm } from "@/components/auth/signup-form";
import { AuthBanner } from "@/components/banners/auth-banner";

export default function CreateAccountPage() {
  return (
    <>
      <AuthBanner title="Create an Account" />
      <SignupForm />
    </>
  );
}
