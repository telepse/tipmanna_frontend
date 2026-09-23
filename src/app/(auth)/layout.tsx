import type { Metadata } from "next";
import { NavbarShell } from "@/components/shared/navbar-shell";

export const metadata: Metadata = {
  title: "Sign in · Tipmanna",
  description: "Sign in or create your Tipmanna account.",
  robots: { index: false, follow: false },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <NavbarShell />
      {children}
    </>
  );
}
