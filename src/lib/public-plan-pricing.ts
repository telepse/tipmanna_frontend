import type { PublicPlanPricing } from "@/actions/plan-pricing";
import { PRICING, type PricingTier } from "@/constants";
import { formatGbpMinor } from "@/lib/host-plan-capabilities";

const DEFAULT_LIST_MINOR = {
  premium: 2999,
  community: 9999,
} as const;

export type MarketingPricingCard = {
  name: string;
  price: string;
  desc: string;
  btnText: string;
  tier: PricingTier;
  discountPrice?: string;
  features: string[];
};

function tierCard(tier: PricingTier) {
  const row = PRICING.find(item => item.tier === tier);
  if (!row) throw new Error(`Missing pricing tier ${tier}`);
  return row;
}

export function buildMarketingPricingCards(
  pricing: PublicPlanPricing | null
): MarketingPricingCard[] {
  const free = tierCard("free");
  const premiumBase = tierCard("premium");
  const communityBase = tierCard("community");

  const premiumList = pricing?.premium.listMinor ?? DEFAULT_LIST_MINOR.premium;
  const premiumSale = pricing?.premium.saleMinor ?? premiumList;
  const communityList =
    pricing?.community.listMinor ?? DEFAULT_LIST_MINOR.community;
  const communitySale = pricing?.community.saleMinor ?? communityList;

  const premiumOnSale =
    Boolean(pricing?.discountActive) && premiumSale < premiumList;
  const communityOnSale =
    Boolean(pricing?.discountActive) && communitySale < communityList;

  return [
    {
      ...free,
      price: "£0",
    },
    {
      ...premiumBase,
      price: formatGbpMinor(premiumOnSale ? premiumSale : premiumList),
      discountPrice: premiumOnSale
        ? formatGbpMinor(premiumList)
        : undefined,
    },
    {
      ...communityBase,
      price: formatGbpMinor(communityOnSale ? communitySale : communityList),
      discountPrice: communityOnSale
        ? formatGbpMinor(communityList)
        : undefined,
    },
  ];
}
