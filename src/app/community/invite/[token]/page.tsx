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
  acceptCommunityInviteAction,
  getCommunityInviteAction,
} from "@/actions/communities";

const communityFeatureOn =
  process.env.NEXT_PUBLIC_COMMUNITY_FEATURE_ENABLED === "true";

function normEmail(e: string) {
  return e.trim().toLowerCase();
}

export default function CommunityInviteAcceptPage() {
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
  const [inviteKind, setInviteKind] = useState<string | null>(null);
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
    const res = await getCommunityInviteAction(token);
    if (!res.success || !res.data) {
      setPhase("invalid");
      setDetail(res.message ?? "This invite is not valid or has expired.");
      return;
    }
    const d = res.data as {
      email: string | null;
      communityName: string;
      kind: string;
    };
    setInviteEmail(d.email);
    setCommunityName(d.communityName);
    setInviteKind(d.kind);
    setPhase("ready");
  }, [token]);

  useEffect(() => {
    void loadValidate();
  }, [loadValidate]);

  const tryAccept = async () => {
    if (!token) return;
    setAccepting(true);
    try {
      const res = await acceptCommunityInviteAction(token);
      if (!res.success || !res.data) {
        toast.error(res.message ?? "Could not accept invite");
        return;
      }
      const data = res.data as {
        requiresAuth?: boolean;
        message?: string;
        communityId?: string;
        alreadyMember?: boolean;
      };
      if (data.requiresAuth) {
        toast.info("Sign in as a tipper to accept this invite.");
        return;
      }
      toast.success(
        data.alreadyMember
          ? "You are already a member."
          : (data.message ?? "Welcome to the community")
      );
      setPhase("accepted");
    } finally {
      setAccepting(false);
    }
  };

  if (!communityFeatureOn) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <h1 className="text-xl font-semibold">Community invite</h1>
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
          {communityName
            ? `Welcome to ${communityName}.`
            : "Membership active."}
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

  const signedInTipper = user?.role === "TIPPER";
  const signedInOtherRole = Boolean(user && user.role !== "TIPPER");
  const emailMismatch =
    signedInTipper &&
    inviteKind === "email" &&
    inviteEmail &&
    user?.email &&
    normEmail(user.email) !== normEmail(inviteEmail);

  const acceptPath = `/community/invite/${encodeURIComponent(token)}`;
  const signUpHref = `/sign-up?redirect=${encodeURIComponent(acceptPath)}`;
  const signInHref = `/sign-in?redirect=${encodeURIComponent(acceptPath)}`;

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <h1 className="text-xl font-semibold">Community invitation</h1>
      <p className="mt-2 text-sm">
        <span className="font-medium">{communityName}</span>
      </p>
      {inviteKind === "email" && inviteEmail && (
        <p className="text-muted-foreground mt-2 text-sm">
          This invite is for{" "}
          <strong className="text-foreground">{inviteEmail}</strong>. Sign in
          with a tipper account that uses this email.
        </p>
      )}
      {inviteKind === "link" && (
        <p className="text-muted-foreground mt-2 text-sm">
          Sign in with your tipper account to join this community.
        </p>
      )}

      {signedInOtherRole && (
        <p className="text-destructive mt-4 text-sm">
          You are signed in as a {user?.role?.toLowerCase() ?? "user"}. Sign out
          and sign in as a tipper to accept.
        </p>
      )}

      {emailMismatch && (
        <p className="text-destructive mt-4 text-sm">
          You are signed in as {user?.email}. Sign out and sign in as{" "}
          {inviteEmail}, or open this link in a private window after signing in
          with the correct tipper account.
        </p>
      )}

      <div className="mt-6 flex flex-col gap-3">
        {signedInTipper && !emailMismatch && (
          <Button
            type="button"
            disabled={accepting || !isAuthenticated}
            onClick={() => void tryAccept()}
          >
            {accepting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Joining…
              </>
            ) : (
              "Accept invitation"
            )}
          </Button>
        )}

        {!signedInTipper && !signedInOtherRole && (
          <>
            <Button asChild>
              <Link href={signInHref}>Sign in as tipper</Link>
            </Button>
            <Button
              asChild
              variant="outline"
            >
              <Link href={signUpHref}>Create tipper account</Link>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
