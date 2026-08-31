"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { useHostCapabilityWithAuth } from "@/hooks/use-host-capability-with-auth";

export type HostAuthContextValue = ReturnType<typeof useHostCapabilityWithAuth>;

const HostAuthContext = createContext<HostAuthContextValue | null>(null);

export function HostAuthProvider({
  value,
  children,
}: {
  value: HostAuthContextValue;
  children: ReactNode;
}) {
  return (
    <HostAuthContext.Provider value={value}>
      {children}
    </HostAuthContext.Provider>
  );
}

/** Dashboard-scoped host auth (single modal owner). Falls back to null outside provider. */
export function useHostAuthOptional(): HostAuthContextValue | null {
  return useContext(HostAuthContext);
}
