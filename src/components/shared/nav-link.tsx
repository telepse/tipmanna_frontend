"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavLinkProps {
  label: string;
  href: string;
}

export const NavLink = ({ label, href }: NavLinkProps) => {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={`hover:text-primary open_sans ${isActive ? "text-primary" : ""}`}
    >
      {label}
    </Link>
  );
};
