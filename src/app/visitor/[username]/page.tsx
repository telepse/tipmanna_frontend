import {
  getTippedEventsForVisitor,
  getTotalAmountTippedByVisitor,
} from "@/actions/events";
import { VisitorProfileClient } from "@/components/tipper/visitor-profile-client";
import { ProtectedRoute } from "@/components/protected-route";
import { getToken } from "@/lib/getToken";

export default async function VisitorProfile() {
  const token = await getToken();
  console.log(token);

  // Fetch all data in parallel
  const [eventsRes, iTippedRes] = await Promise.all([
    getTippedEventsForVisitor(token!),
    getTotalAmountTippedByVisitor(token!),
  ]);

  const events = eventsRes.data;
  const iTipped = iTippedRes.data;

  return (
    <ProtectedRoute>
      <VisitorProfileClient
        events={events}
        iTipped={iTipped}
      />
    </ProtectedRoute>
  );
}
