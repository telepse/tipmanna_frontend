/* eslint-disable @typescript-eslint/no-explicit-any */
import { getPublicHostEventsAction } from "@/actions/events";
import { EventsClient } from "@/components/join-host/events-client";

interface Props {
  params: Promise<{ hostName: string }>;
  searchParams: Promise<{ eventCode: string }>;
}

export default async function JoinHostPage({ params, searchParams }: Props) {
  const [resolvedParams, resolvedSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);

  const hostName = resolvedParams.hostName;
  const eventCode = resolvedSearchParams.eventCode;

  const { data: events } = await getPublicHostEventsAction(hostName, eventCode);

  return (
    <section
      className="flex min-h-screen flex-col items-center justify-center space-y-6 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(/vectors/tipping_pattern_new.webp)` }}
    >
      <div className="flex flex-col items-center justify-center gap-2 p-2 sm:max-w-md">
        <EventsClient events={events as any[] as any[]} />
      </div>
    </section>
  );
}
