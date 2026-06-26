import type { Metadata } from "next";

import { getCommunityAccessStateAction } from "@/actions/communities";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const res = await getCommunityAccessStateAction(id);
  const jp =
    res.success && res.data && typeof res.data === "object"
      ? (res.data as { joinFormPublic?: { name?: string; description?: string | null } })
          .joinFormPublic
      : null;
  const name = jp?.name?.trim() || "Community";
  const description =
    jp?.description?.trim() ||
    "Join this community on Tipmanna TV to watch exclusive clips and connect with members.";

  return {
    title: `Join ${name} on Tipmanna`,
    description,
    openGraph: {
      title: `Join ${name} on Tipmanna`,
      description,
    },
  };
}

export default function CommunityJoinLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
