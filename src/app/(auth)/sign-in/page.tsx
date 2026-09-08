"use client";

import { Suspense } from "react";
import { AuthBanner } from "@/components/banners/auth-banner";
import { SigninForm } from "@/components/auth/signin-form";

export default function SignInPage() {
  return (
    <>
      <AuthBanner title="Sign In" />
      <Suspense fallback={null}>
        <SigninForm signupSurface="sign_in_page" />
      </Suspense>
    </>
  );
}
