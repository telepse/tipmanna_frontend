/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Metadata } from "next";
import Image from "next/image";

import {
  getEventByIdAction,
  getEventCharacterCatalogAction,
  getEventRoomAccessAction,
} from "@/actions/events";
import { PrivateEventRoomBlocked } from "@/components/events/event-room-access-gate";
import { ClientErrorBoundary } from "@/components/client-error-boundary";
import { WatchScreenTheater } from "@/components/watch/watch-screen-theater";
import { isEventRoomAccessDenied } from "@/lib/event-room-access";
import { TipUsageDisclosure } from "@/types/tipusagedisclosure.types";
import { RoomCharacter } from "@/types";
import { OVERLAY_Z_INDEX } from "@/lib/drawer-z-index";

interface Props {
  params: Promise<{ eventId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { eventId } = await params;
  const trimmedId = typeof eventId === "string" ? eventId.trim() : eventId;

  const accessRes = await getEventRoomAccessAction(trimmedId);
  const access =
    accessRes.success && accessRes.data
      ? (accessRes.data as {
          accessMode?: "public" | "invite_only";
          allowed?: boolean;
        })
      : null;
  if (isEventRoomAccessDenied(access ?? undefined)) {
    return { title: "Private event room" };
  }

  const eventRes = await getEventByIdAction(trimmedId);
  if (!eventRes.success || !eventRes.data) {
    return { title: "Screen display — Watch" };
  }
  return {
    title: `${eventRes.data.eventName} — Watch Screen`,
  };
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Opaque fundraise HUD for smart-TV browsers (tips + screen- animations). */
export default async function WatchScreenEventPage({ params }: Props) {
  const { eventId } = await params;
  const trimmedId = typeof eventId === "string" ? eventId.trim() : eventId;

  const accessRes = await getEventRoomAccessAction(trimmedId);
  const access =
    accessRes.success && accessRes.data
      ? (accessRes.data as {
          accessMode?: "public" | "invite_only";
          allowed?: boolean;
        })
      : null;

  if (isEventRoomAccessDenied(access ?? undefined)) {
    return <PrivateEventRoomBlocked />;
  }

  const [eventRes, catalogRes] = await Promise.all([
    getEventByIdAction(trimmedId),
    getEventCharacterCatalogAction(trimmedId),
  ]);

  const event = eventRes.data;
  if (!eventRes.success || !event) return <div>Event not found</div>;

  const catalog = catalogRes.success ? catalogRes.data : null;
  const eventCharacterSets = catalog?.characterSets ?? event.characterSets;

  const safeCharacterSets = Array.isArray(eventCharacterSets)
    ? eventCharacterSets
    : [];

  const allCharacters = safeCharacterSets.flatMap((set: any) =>
    Array.isArray(set?.characters)
      ? set.characters.map((char: RoomCharacter) => ({
          id: char.id,
          name: char.name,
          iconUrl: char.iconUrl,
          price: char.price,
          styleName: char.styleName,
        }))
      : []
  );

  const eventPayload = event as Record<string, unknown>;
  const approved = event.approved;

  if (!approved) {
    return (
      <ClientErrorBoundary>
        <div
          className={`${OVERLAY_Z_INDEX} flex min-h-[100vh] w-full items-center justify-center bg-black`}
        >
          <div className="flex max-w-sm flex-col items-center justify-center gap-6 rounded-md bg-white/10 p-6 text-center text-white">
            <Image
              src="/assets/lock.png"
              alt="Lock"
              width={100}
              height={100}
              className="object-cover"
            />
            <h2 className="text-2xl font-bold">Content Room Locked</h2>
            <p className="text-sm leading-loose">
              This event room is locked and pending approval.
            </p>
          </div>
        </div>
      </ClientErrorBoundary>
    );
  }

  const eventCode = typeof event.eventCode === "string" ? event.eventCode : "";
  const eventSlug = typeof event.eventSlug === "string" ? event.eventSlug : "";

  return (
    <ClientErrorBoundary>
      <WatchScreenTheater
        eventId={event.id}
        eventName={event.eventName}
        eventCode={eventCode}
        eventSlug={eventSlug}
        amountToRaise={event.amountToRaise ?? 0}
        initialAmountRaised={event.amountRaised ?? 0}
        initialLatestTipAmount={event.latestTipAmount ?? 0}
        eventBackground={event.eventBackground ?? "/default.png"}
        hideProgressBarAmount={event.hideProgressBarAmount ?? false}
        showLatestAmount={event.showLatestAmount ?? false}
        tipUsageDisclosure={
          Array.isArray(event.tipUsageDisclosure)
            ? (event.tipUsageDisclosure as TipUsageDisclosure[])
            : []
        }
        tippingCharacters={allCharacters}
        performers={
          Array.isArray(event.performers) ? (event.performers as any) : []
        }
        projects={Array.isArray(event.projects) ? (event.projects as any) : []}
        contributionType={
          typeof event.contributionType === "string"
            ? event.contributionType
            : "PERFORMER"
        }
        showPinnedOnScreen={
          typeof eventPayload.showPinnedOnScreen === "boolean"
            ? eventPayload.showPinnedOnScreen
            : true
        }
        funnelPosition={
          typeof eventPayload.funnelPosition === "string"
            ? eventPayload.funnelPosition
            : "bottom_left"
        }
      />
    </ClientErrorBoundary>
  );
}
