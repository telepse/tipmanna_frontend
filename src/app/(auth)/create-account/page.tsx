"use client";

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
      <SignupForm />
    </>
  );
}
