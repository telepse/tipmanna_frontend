import { fetchPartnerFeaturedEvents } from "@/lib/partner-data";
import TopEvents from "@/components/home/top-events";

export default async function PartnerTopEventsSection() {
  const events = await fetchPartnerFeaturedEvents();
  if (events.length === 0) return null;
  return <TopEvents events={events} />;
}
