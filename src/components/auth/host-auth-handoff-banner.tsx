"use client";

import Link from "next/link";

type UnclaimedSignInProps = {
  variant: "unclaimed-sign-in";
  onCreateHostAccount: () => void;
};

type ClaimedSignUpProps = {
  variant: "claimed-sign-up";
  mode: "page" | "modal";
  signInHref?: string;
  onSignIn?: () => void;
};

export type HostAuthHandoffBannerProps =
  | UnclaimedSignInProps
  | ClaimedSignUpProps;

export function HostAuthHandoffBanner(props: HostAuthHandoffBannerProps) {
  if (props.variant === "unclaimed-sign-in") {
    return (
      <div
        role="status"
        className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
      >
        <p>
          This email has a pending creator invite. Create a host account to
          claim it.
        </p>
        <button
          type="button"
          className="text-primary mt-2 font-medium hover:underline"
          onClick={props.onCreateHostAccount}
        >
          Create host account
        </button>
      </div>
    );
  }

  return (
    <div
      role="status"
      className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-950"
    >
      <p>This email already has a host account. Sign in to continue.</p>
      {props.onSignIn ? (
        <button
          type="button"
          className="text-primary mt-2 font-medium hover:underline"
          onClick={props.onSignIn}
        >
          Sign in
        </button>
      ) : props.signInHref ? (
        <Link
          href={props.signInHref}
          className="text-primary mt-2 inline-block font-medium hover:underline"
        >
          Sign in
        </Link>
      ) : null}
    </div>
  );
}
