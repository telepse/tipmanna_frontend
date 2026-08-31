import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { getHostCreatorPublicProfileAction } from "@/actions/host-creator";
import { CreatorProfileLoadError } from "@/components/host/creator-profile-load-error";
import { HostCreatorPageClient } from "@/components/host/host-creator-page-client";
import {
  buildCreatorProfileJsonLd,
  buildCreatorProfileMetadata,
} from "@/lib/creator-profile-metadata";

type Props = {
  params: Promise<{ username: string }>;
};

type CreatorProfileLoadResult =
  | {
      kind: "ok";
      profile: NonNullable<
        Awaited<ReturnType<typeof getHostCreatorPublicProfileAction>>["data"]
      >;
    }
  | { kind: "not_found" }
  | { kind: "transient" };

async function loadCreatorProfile(
  username: string
): Promise<CreatorProfileLoadResult> {
  const res = await getHostCreatorPublicProfileAction(username);
  if (res.success && res.data) {
    return { kind: "ok", profile: res.data };
  }
  if (res.httpStatus === 404) {
    return { kind: "not_found" };
  }
  return { kind: "transient" };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const handle = username.replace(/^@/, "");
  const result = await loadCreatorProfile(handle);

  if (result.kind !== "ok") {
    return {
      title: `@${handle} · Tipmanna Creator`,
      description: `Creator profile for @${handle} on Tipmanna`,
    };
  }

  return buildCreatorProfileMetadata(result.profile);
}

export default async function HostCreatorPage({ params }: Props) {
  const { username } = await params;
  const handle = username.replace(/^@/, "");
  const result = await loadCreatorProfile(handle);

  if (result.kind === "not_found") {
    notFound();
  }

  if (result.kind === "transient") {
    return <CreatorProfileLoadError username={handle} />;
  }

  const profileJsonLd = buildCreatorProfileJsonLd(result.profile);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(profileJsonLd) }}
      />
      <HostCreatorPageClient profile={result.profile} />
    </>
  );
}
