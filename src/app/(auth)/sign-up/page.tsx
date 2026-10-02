"use client";

import { Suspense } from "react";
import { useSelector } from "react-redux";

import { SignupForm } from "@/components/auth/signup-form";
import { AuthBanner } from "@/components/banners/auth-banner";
import { AlreadySignedInNotice } from "@/components/auth/already-signed-in-notice";
import type { RootState } from "@/redux/store";

export default function CreateAccountPage() {
  const { user, isAuthenticated } = useSelector((s: RootState) => s.auth);

  return (
    <>
      <AuthBanner title="Create an Account" />
      {isAuthenticated && user ? <AlreadySignedInNotice /> : null}
      <Suspense fallback={null}>
        <section
          className="relative min-h-screen bg-cover bg-fixed bg-center bg-no-repeat"
          style={{ backgroundImage: `url(/patterns/bg_pattern.webp)` }}
        >
          <SignupForm />
        </section>
      </Suspense>
    </>
  );
}
