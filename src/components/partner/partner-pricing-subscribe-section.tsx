"use client";

import Link from "next/link";
import { useState } from "react";
import dynamic from "next/dynamic";

import { Button } from "@/components/ui/button";
import { HostSubscriptionUpgradeTrigger } from "@/components/dashboard/host-subscription-modal";
import { useHostSession } from "@/hooks/use-host-session";
import type { SignInModalPayload } from "@/components/auth/sign-in-dialog";

const SignInDialog = dynamic(() => import("@/components/auth/sign-in-dialog"), {
  ssr: false,
});

export function PartnerPricingSubscribeSection() {
  const { isActive: hostSessionActive } = useHostSession();
  const [signInOpen, setSignInOpen] = useState(false);

  const handleSignInSuccess = (payload: SignInModalPayload) => {
    const slug = payload.eventSlug ?? payload.username;
    if (slug) {
      window.location.href = `/host/${encodeURIComponent(slug)}/host-premium`;
      return;
    }
    setSignInOpen(true);
  };

  return (
    <section className="wrapper section">
      <div className="bg-card mx-auto flex max-w-3xl flex-col items-center gap-4 rounded-2xl border p-6 text-center sm:p-8">
        <h2 className="text-2xl font-semibold">Ready to grow on Tipmanna?</h2>
        <p className="text-muted-foreground text-sm">
          Sign in as a host to subscribe, or open your dashboard plan picker if
          you already have an active host session.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {hostSessionActive ? (
            <HostSubscriptionUpgradeTrigger
              label="View host plans"
              variant="default"
              title="Choose a host plan"
              description="Subscribe to unlock Growth and Community features."
            />
          ) : (
            <>
              <Button
                type="button"
                onClick={() => setSignInOpen(true)}
              >
                Sign in as host
              </Button>
              <Button
                asChild
                variant="outline"
              >
                <Link href="/partner#pricing">Compare plans</Link>
              </Button>
            </>
          )}
        </div>
      </div>

      {signInOpen ? (
        <SignInDialog
          open={signInOpen}
          onOpenChange={setSignInOpen}
          title="Sign in as host to subscribe"
          defaultUserType="host"
          allowInlineSignUp
          signupSurface="partner"
          onSuccess={handleSignInSuccess}
        />
      ) : null}
    </section>
  );
}
