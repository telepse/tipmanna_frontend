import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { getHostCreatorPublicProfileAction } from "@/actions/host-creator";
import { HostCreatorPageClient } from "@/components/host/host-creator-page-client";
import {
  buildCreatorProfileJsonLd,
  buildCreatorProfileMetadata,
} from "@/lib/creator-profile-metadata";

type Props = {
  params: Promise<{ username: string }>;
};

async function loadCreatorProfile(username: string) {
  const res = await getHostCreatorPublicProfileAction(username);
  if (!res.success || !res.data) return null;
  return res.data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const handle = username.replace(/^@/, "");
  const profile = await loadCreatorProfile(handle);

  if (!profile) {
    return {
      title: `@${handle} · Tipmanna Creator`,
      description: `Creator profile for @${handle} on Tipmanna`,
    };
  }

  return buildCreatorProfileMetadata(profile);
}

export default async function HostCreatorPage({ params }: Props) {
  const { username } = await params;
  const handle = username.replace(/^@/, "");
  const profile = await loadCreatorProfile(handle);

  if (!profile) {
    notFound();
  }

  const profileJsonLd = buildCreatorProfileJsonLd(profile);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(profileJsonLd) }}
      />
      <HostCreatorPageClient profile={profile} />
    </>
  );
}
