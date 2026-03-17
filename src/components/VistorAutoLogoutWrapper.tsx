"use client";

import { ReactNode } from "react";
import { useVisitorAutoLogout } from "@/hooks/use-visitor-auto-logout";

export const VisitorAutoLogoutWrapper = ({
  children,
}: {
  children: ReactNode;
}) => {
  useVisitorAutoLogout();

  return <>{children}</>;
};
