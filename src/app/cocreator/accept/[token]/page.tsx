"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "react-toastify";
import { useSelector } from "react-redux";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { RootState } from "@/redux/store";
import {
  acceptCoCreatorInviteAction,
  validateCoCreatorInviteAction,
} from "@/actions/communities";

const communityFeatureOn =
  process.env.NEXT_PUBLIC_COMMUNITY_FEATURE_ENABLED === "true";

function normEmail(e: string) {
  return e.trim().toLowerCase();
}

export default function CoCreatorAcceptPage() {
  const params = useParams();
  const token = typeof params.token === "string" ? params.token : "";
  const user = useSelector((s: RootState) => s.auth.user);
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);

  const [phase, setPhase] = useState<
    "loading" | "invalid" | "ready" | "accepted"
  >("loading");
  const [detail, setDetail] = useState("");
  const [inviteEmail, setInviteEmail] = useState<string | null>(null);
  const [communityName, setCommunityName] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);

  const loadValidate = useCallback(async () => {
    if (!communityFeatureOn) {
      setPhase("invalid");
      setDetail("Community features are not enabled.");
      return;
    }
    if (!token) {
      setPhase("invalid");
      setDetail("Invalid invite link.");
      return;
    }
    setPhase("loading");
    const res = await validateCoCreatorInviteAction(token);
    if (!res.success || !res.data) {
      setPhase("invalid");
      setDetail(res.message ?? "This invite is not valid or has expired.");
      return;
    }
    const d = res.data as {
      email: string;
      communityName: string;
    };
    setInviteEmail(d.email);
    setCommunityName(d.communityName);
    setPhase("ready");
  }, [token]);

  useEffect(() => {
    void loadValidate();
  }, [loadValidate]);

  const tryAccept = async () => {
    if (!token) return;
    setAccepting(true);
    try {
      const res = await acceptCoCreatorInviteAction(token);
      if (!res.success || !res.data) {
        toast.error(res.message ?? "Could not accept invite");
        return;
      }
      const data = res.data as {
        requiresAuth?: boolean;
        message?: string;
        communityId?: string;
      };
      if (data.requiresAuth) {
        toast.info("Sign in or create an account to accept this invite.");
        return;
      }
      toast.success(data.message ?? "You are now a co-creator");
      setPhase("accepted");
    } finally {
      setAccepting(false);
    }
  };

  if (!communityFeatureOn) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <h1 className="text-xl font-semibold">Co-creator invite</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Community features are disabled on this environment.
        </p>
      </div>
    );
  }

  if (phase === "loading") {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2">
        <Loader2 className="text-muted-foreground size-8 animate-spin" />
        <p className="text-muted-foreground text-sm">Checking invitation…</p>
      </div>
    );
  }

  if (phase === "invalid") {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <h1 className="text-xl font-semibold">Invitation unavailable</h1>
        <p className="text-muted-foreground mt-2 text-sm">{detail}</p>
        <Button
          asChild
          className="mt-6"
          variant="outline"
        >
          <Link href="/explore">Back to home</Link>
        </Button>
      </div>
    );
  }

  if (phase === "accepted") {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <h1 className="text-xl font-semibold">You&apos;re in</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          You are now a co-creator for {communityName ?? "this community"}. Open{" "}
          <strong>Host Community</strong> in your dashboard to submit videos.
        </p>
        <Button
          asChild
          className="mt-6"
        >
          <Link href="/explore">Back to home</Link>
        </Button>
      </div>
    );
  }

  const signedInHost = user?.role === "HOST";
  const signedInOtherRole = Boolean(user && user.role !== "HOST");
  const emailMismatch =
    signedInHost &&
    inviteEmail &&
    normEmail(user.email ?? "") !== normEmail(inviteEmail);

  const acceptPath = `/cocreator/accept/${encodeURIComponent(token)}`;
  const signUpHref = `/create-account?email=${encodeURIComponent(inviteEmail ?? "")}&redirect=${encodeURIComponent(acceptPath)}`;
  const signInHref = `/sign-in?email=${encodeURIComponent(inviteEmail ?? "")}&redirect=${encodeURIComponent(acceptPath)}`;

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <h1 className="text-xl font-semibold">Co-creator invitation</h1>
      <p className="mt-2 text-sm">
        <span className="font-medium">{communityName}</span>
      </p>
      <p className="text-muted-foreground mt-2 text-sm">
        This invite is for{" "}
        <strong className="text-foreground">{inviteEmail}</strong>. Use a host
        account with that email to accept.
      </p>

      {signedInOtherRole && (
        <p className="text-destructive mt-4 text-sm">
          You are signed in as {user?.role?.toLowerCase() ?? "a user"}. Open
          this link in a private window or sign out, then sign in (or register)
          as a <strong>host</strong> with {inviteEmail} to accept.
        </p>
      )}

      {emailMismatch && (
        <p className="text-destructive mt-4 text-sm">
          You are signed in as {user?.email}. Sign out and sign in as{" "}
          {inviteEmail}, or add this invite link in a private window after
          signing in with the correct host account.
        </p>
      )}

      <div className="mt-6 flex flex-col gap-3">
        {signedInHost && !emailMismatch && (
          <Button
            type="button"
            disabled={accepting || !isAuthenticated}
            onClick={() => void tryAccept()}
          >
            {accepting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Accepting…
              </>
            ) : (
              "Accept invitation"
            )}
          </Button>
        )}

        {!signedInHost && !signedInOtherRole && (
          <>
            <Button asChild>
              <Link href={signInHref}>Sign in as host</Link>
            </Button>
            <Button
              asChild
              variant="outline"
            >
              <Link href={signUpHref}>Create host account</Link>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
