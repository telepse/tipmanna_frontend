"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useSelector } from "react-redux";
import type { RootState } from "@/redux/store";
import { useSideChick } from "@/components/community/side-chick-provider";
import { TipperEmailOtpSignInDialog } from "@/components/auth/tipper-email-otp-sign-in-dialog";
import { ExploreGlobalChrome } from "@/components/explore/explore-global-chrome";
import { JoinCommunityModal } from "@/components/community/join-community-modal";
import { InstallPromptSheet } from "@/components/pwa/install-prompt-sheet";
import { useInstallPrompt } from "@/hooks/use-install-prompt";
import { setPendingDedicatedEnter } from "@/lib/pending-dedicated-enter";
import { assertNotEmailVerificationRequiredFromResponse } from "@/lib/detect-email-verification-required";

const apiBase = () => process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "";

type LandingPayload = {
  community: {
    id: string;
    name: string;
    logoUrl: string | null;
    isSystem: boolean;
  };
  customization: {
    headerColor: string | null;
    tvLogoUrl: string | null;
    brandColor: string | null;
  } | null;
  requiresLogin: boolean;
  isMember: boolean;
  sideChickEligibility: { canEnter: boolean; reason?: string };
  membershipsThatWillBeHidden: {
    communityId: string;
    name: string;
    isSystem: boolean;
    feedActive: boolean;
  }[];
};

export default function SideChickMagicPage() {
  const params = useParams();
  const communityId = String(params.communityId ?? "").trim();
  const router = useRouter();
  const { user, isAuthenticated, requiresVerification } = useSelector(
    (s: RootState) => s.auth
  );
  const sideChick = useSideChick();
  const { installed } = useInstallPrompt();

  const [data, setData] = useState<LandingPayload | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [enterBusy, setEnterBusy] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const [installOpen, setInstallOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);

  const authToken = useSelector((s: RootState) => s.auth.token);

  const loadLanding = useCallback(async () => {
    if (!communityId) return;
    const r = await fetch(
      `${apiBase()}/community-magic/${encodeURIComponent(communityId)}`,
      {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      }
    );
    if (!r.ok) {
      await assertNotEmailVerificationRequiredFromResponse(r);
      setLoadErr(`Could not load community (${r.status})`);
      setData(null);
      return;
    }
    setData((await r.json()) as LandingPayload);
    setLoadErr(null);
  }, [communityId, authToken]);

  useEffect(() => {
    void loadLanding();
  }, [loadLanding]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") void loadLanding();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [loadLanding]);

  const enterDedicated = async () => {
    if (!authToken) return;
    if (!installed) {
      setPendingDedicatedEnter(communityId);
      setInstallOpen(true);
      return;
    }
    setEnterBusy(true);
    try {
      const r = await fetch(
        `${apiBase()}/communities/${encodeURIComponent(communityId)}/side-chick/enter`,
        { method: "POST", headers: { Authorization: `Bearer ${authToken}` } }
      );
      if (r.status === 200 || r.status === 409) {
        await sideChick.refresh();
        router.push("/explore");
        return;
      }
      await assertNotEmailVerificationRequiredFromResponse(r);
      const j = (await r.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      setLoadErr(j?.error?.message ?? `Enter failed (${r.status})`);
    } finally {
      setEnterBusy(false);
    }
  };

  if (!communityId) {
    return <p className="p-6 text-sm">Invalid link.</p>;
  }

  let sideInner: ReactNode;

  if (loadErr && !data) {
    sideInner = (
      <div className="mx-auto max-w-lg space-y-4 p-6">
        <p className="text-destructive text-sm">{loadErr}</p>
        <Button
          asChild
          variant="outline"
        >
          <Link href="/community">Back to communities</Link>
        </Button>
      </div>
    );
  } else if (!data) {
    sideInner = <p className="text-muted-foreground p-6 text-sm">Loading…</p>;
  } else {
    const landing = data;
    const headerTint = landing.customization?.headerColor;
    const tipperLike = user?.role === "TIPPER";

    sideInner = (
      <div
        className="min-h-[60vh]"
        style={
          headerTint
            ? {
                borderTop: `4px solid ${headerTint}`,
              }
            : undefined
        }
      >
        <div className="mx-auto max-w-lg space-y-6 p-6">
          <div>
            <h1 className="text-xl font-semibold">{landing.community.name}</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Dedicated community mode on Tipmanna — your Explore feed and TV
              focus on this community only (Tipmanna Public and other
              communities are hidden from the feed until you exit).
            </p>
          </div>

          {landing.requiresLogin || !isAuthenticated ? (
            <div className="space-y-3 rounded-lg border p-4">
              <p className="text-sm font-medium">Sign in to continue</p>
              <p className="text-muted-foreground text-xs">
                You need a tipper account and membership in this community.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  onClick={() => setSignInOpen(true)}
                >
                  Sign in
                </Button>
                <Button
                  asChild
                  variant="outline"
                >
                  <Link
                    href={`/explore?feedTab=community&communities=${encodeURIComponent(communityId)}`}
                  >
                    View on Explore
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="ghost"
                >
                  <Link
                    href={`/explore?tab=join&joinCommunity=${encodeURIComponent(communityId)}`}
                  >
                    Join page
                  </Link>
                </Button>
              </div>
              <TipperEmailOtpSignInDialog
                open={signInOpen}
                onOpenChange={setSignInOpen}
                signInTitle="Enter email to sign in"
                signupSurface="side_chick"
                onVerified={() => void loadLanding()}
              />
            </div>
          ) : !tipperLike ? (
            <p className="text-sm">
              Dedicated mode is available to tipper or host accounts (with a
              paired tipper profile).
            </p>
          ) : !landing.isMember ? (
            <div className="space-y-3 rounded-lg border p-4">
              <p className="text-sm font-medium">Join this community first</p>
              <Button
                type="button"
                onClick={() => setJoinOpen(true)}
              >
                Join community
              </Button>
              <JoinCommunityModal
                open={joinOpen}
                onOpenChange={setJoinOpen}
                communityId={communityId}
                signInRedirectPath={`/community/side-chick/${encodeURIComponent(communityId)}`}
                title={`Join ${landing.community.name}`}
                onJoined={() => {
                  void loadLanding().then(() => {
                    void enterDedicated();
                  });
                }}
              />
            </div>
          ) : !landing.sideChickEligibility.canEnter ? (
            <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
              <p className="font-medium">Cannot enter dedicated mode</p>
              <p>{landing.sideChickEligibility.reason}</p>
              <Button
                asChild
                variant="outline"
                className="mt-2"
              >
                <Link href="/community">Community hub</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4 rounded-lg border p-4">
              <p className="text-sm font-medium">Confirm dedicated mode</p>
              <p className="text-muted-foreground text-xs">
                These communities will be turned off in your Explore feed for
                now (you can restore the previous settings when you reactivate
                Tipmanna Public):
              </p>
              <ul className="list-inside list-disc text-sm">
                {landing.membershipsThatWillBeHidden.map(m => (
                  <li key={m.communityId}>
                    {m.name}
                    {m.isSystem ? " (Tipmanna Public)" : ""}
                  </li>
                ))}
              </ul>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  disabled={enterBusy}
                  onClick={() => void enterDedicated()}
                >
                  {installed
                    ? "Enter dedicated mode"
                    : "Install app to enter dedicated mode"}
                </Button>
                <Button
                  asChild
                  variant="outline"
                >
                  <Link href="/community">Cancel</Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <ExploreGlobalChrome activeSurface="side-chick">
      {sideInner}
      <InstallPromptSheet
        open={installOpen}
        onOpenChange={setInstallOpen}
      />
    </ExploreGlobalChrome>
  );
}
