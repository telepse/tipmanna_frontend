import { TopTippersClient } from "@/components/dashboard/top-tippers-client";
import { ProtectedRoute } from "@/components/protected-route";

export default function TopTippers() {
  return (
    <ProtectedRoute>
      <TopTippersClient />
    </ProtectedRoute>
  );
}
