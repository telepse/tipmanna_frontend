import { NavbarShell } from "@/components/shared/navbar-shell";

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
