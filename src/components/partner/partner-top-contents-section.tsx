import { fetchPartnerFeaturedContents } from "@/lib/partner-data";
import TopContents from "@/components/home/top-contents";

export default async function PartnerTopContentsSection() {
  const contents = await fetchPartnerFeaturedContents();
  if (contents.length === 0) return null;
  return <TopContents contents={contents} />;
}
