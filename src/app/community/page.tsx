import { notFound, redirect } from "next/navigation";

export default function CommunityHubPage() {
  if (process.env.NEXT_PUBLIC_COMMUNITY_FEATURE_ENABLED !== "true") {
    notFound();
  }
  redirect("/explore?tab=my-communities");
}
