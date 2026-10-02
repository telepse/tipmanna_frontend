"use client";

import { Suspense } from "react";
import { AuthBanner } from "@/components/banners/auth-banner";
import { SigninForm } from "@/components/auth/signin-form";

export default function SignInPage() {
  return (
    <>
      <AuthBanner title="Sign In" />
      <Suspense fallback={null}>
        <section
          className="relative min-h-screen bg-cover bg-fixed bg-center bg-no-repeat"
          style={{ backgroundImage: `url(/patterns/bg_pattern.webp)` }}
        >
          <SigninForm signupSurface="sign_in_page" />
        </section>
      </Suspense>
    </>
  );
}
