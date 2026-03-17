import {
  getTippedEventsForTipper,
  getTotalAmountTippedByTipper,
} from "@/actions/events";
import { TipperProfileClient } from "@/components/tipper/tipper-profile-client";
import { ProtectedRoute } from "@/components/protected-route";
import { getToken } from "@/lib/getToken";
import { getAllCausesAction } from "@/actions/home";

export default async function TipperProfile() {
  const token = await getToken();

  // Fetch all data in parallel
  const [eventsRes, iTippedRes, causesRes] = await Promise.all([
    getTippedEventsForTipper(token!),
    getTotalAmountTippedByTipper(token!),
    getAllCausesAction(),
  ]);

  const events = eventsRes.data;
  const iTipped = iTippedRes.data;
  const causes = causesRes.data;

  return (
    <ProtectedRoute>
      <div className="overflow-y-auto">
        <TipperProfileClient
          events={events}
          iTipped={iTipped}
          causes={causes}
        />
      </div>
    </ProtectedRoute>
  );
}
