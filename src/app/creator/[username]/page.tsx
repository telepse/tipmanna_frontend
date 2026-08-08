import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { getHostCreatorPublicProfileAction } from "@/actions/host-creator";
import { HostCreatorPageClient } from "@/components/host/host-creator-page-client";

type Props = {
  params: Promise<{ username: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const handle = username.replace(/^@/, "");
  return {
    title: `@${handle} · Tipmanna Creator`,
    description: `Creator profile for @${handle} on Tipmanna`,
  };
}

export default async function HostCreatorPage({ params }: Props) {
  const { username } = await params;
  const res = await getHostCreatorPublicProfileAction(username);
  if (!res.success || !res.data) {
    notFound();
  }

  return <HostCreatorPageClient profile={res.data} />;
}
