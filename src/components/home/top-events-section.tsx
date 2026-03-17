import { getAllFeaturedEventsAction } from "@/actions/home";
import TopEvents from "./top-events";

export default async function TopEventsSection() {
  const { data: events } = await getAllFeaturedEventsAction();

  return <TopEvents events={events} />;
}
