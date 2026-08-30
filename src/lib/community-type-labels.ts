import type { CommunityType } from "@/schemas/community.schema";

export const COMMUNITY_TYPE_LABELS: Record<CommunityType, string> = {
  RELIGIOUS: "Religious",
  CULTURAL: "Cultural",
  BUSINESS: "Business",
  HEALTH: "Health",
  FAN_GROUP: "Fan group",
  INFLUENCER: "Influencer",
  SOCIAL: "Social",
  EDUCATION: "Education",
  SPORT: "Sport",
  CHARITY: "Charity",
};

export function formatCommunityTypeLabel(
  value: string | null | undefined
): string {
  if (!value) return "Community";
  return (
    COMMUNITY_TYPE_LABELS[value as CommunityType] ??
    value.replace(/_/g, " ").toLowerCase()
  );
}
