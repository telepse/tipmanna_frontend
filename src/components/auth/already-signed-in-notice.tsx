"use client";

import { useDispatch, useSelector } from "react-redux";

import { Button } from "@/components/ui/button";
import { performAuthLogout } from "@/lib/auth-logout";
import type { AppDispatch, RootState } from "@/redux/store";

function formatRole(role: string): string {
  if (role === "HOST") return "host creator";
  return role.toLowerCase();
}

export function AlreadySignedInNotice({
  compact = false,
}: {
  compact?: boolean;
}) {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((s: RootState) => s.auth.user);

  if (!user?.email) return null;

  return (
    <div
      className={
        compact
          ? "mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950"
          : "mx-auto mb-6 flex max-w-2xl flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
      }
    >
      <p>
        Signed in as {formatRole(user.role)} ({user.email})
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="border-amber-300 bg-white hover:bg-amber-100"
        onClick={() => void performAuthLogout(dispatch)}
      >
        Log out
      </Button>
    </div>
  );
}
