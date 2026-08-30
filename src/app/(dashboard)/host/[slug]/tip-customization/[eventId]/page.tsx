import { ProtectedRoute } from "@/components/protected-route";
import TipCustomizationClient from "@/components/host/tip-customization-client";

export default async function HostTipCustomizationPage({
  params,
}: {
  params: Promise<{ slug: string; eventId: string }>;
}) {
  const { slug, eventId } = await params;
  return (
    <ProtectedRoute>
      <div className="px-4">
        <TipCustomizationClient
          hostSlug={slug}
          eventId={eventId}
        />
      </div>
    </ProtectedRoute>
  );
}
