"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Metadata } from "next";
import { getJoinFormAction } from "@/actions/communities";
import { ActionResult } from "@/lib/action-fetch";

const communityFeatureOn =
  process.env.NEXT_PUBLIC_COMMUNITY_FEATURE_ENABLED === "true";

function exploreJoinHref(communityId: string) {
  return `/explore?tab=join&joinCommunity=${encodeURIComponent(communityId)}`;
}

// export async function generateMetadata({
//   params,
// }: {
//   params: Promise<{ communityId: string }>;
// }): Promise<Metadata> {
//   const { communityId } = await params;
//   const communityRes = (await getJoinFormAction(
//     null,
//     communityId
//   )) as ActionResult<{ name: string }>;

//   return {
//     title: `Join the ${communityRes.data?.name} community 🌍`,
//     description:
//       "Join our community network to watch exclusive content, participate live, connect with members, and support the experiences you enjoy.",
//   };
// }

export default function CommunityJoinPage() {
  const params = useParams();
  const router = useRouter();
  const communityId = typeof params.id === "string" ? params.id : "";

  useEffect(() => {
    if (!communityId) return;
    if (!communityFeatureOn) return;
    router.replace(exploreJoinHref(communityId));
  }, [communityId, router]);

  if (!communityFeatureOn) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <p className="text-muted-foreground text-sm">
          Community features are disabled.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Loader2 className="text-muted-foreground size-8 animate-spin" />
    </div>
  );
}
