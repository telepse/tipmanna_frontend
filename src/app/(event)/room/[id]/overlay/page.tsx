/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Metadata } from "next";
import Image from "next/image";

import {
  getEventByIdAction,
  getEventCharacterCatalogAction,
  getEventRoomAccessAction,
} from "@/actions/events";
import { PrivateEventRoomBlocked } from "@/components/events/event-room-access-gate";
import { ScreenOverlayClient } from "@/components/events/screen-overlay-client";
import { ClientErrorBoundary } from "@/components/client-error-boundary";
import { isEventRoomAccessDenied } from "@/lib/event-room-access";
import { TipUsageDisclosure } from "@/types/tipusagedisclosure.types";
import { RoomCharacter } from "@/types";
import { OVERLAY_Z_INDEX } from "@/lib/drawer-z-index";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const trimmedId = typeof id === "string" ? id.trim() : id;

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
    return { title: "Transparent overlay" };
  }
  return {
    title: `${eventRes.data.eventName} — Overlay`,
  };
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** OBS / venue transparent browser source — progress, tips, animations only. */
export default async function EventRoomOverlayPage({ params }: Props) {
  const { id } = await params;
  const trimmedId = typeof id === "string" ? id.trim() : id;

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
          className={`${OVERLAY_Z_INDEX} flex min-h-[100vh] w-full items-center justify-center bg-black/50 backdrop-blur-md`}
        >
          <div className="flex max-w-sm flex-col items-center justify-center gap-6 rounded-md bg-white/50 p-6 text-center">
            <Image
              src="/assets/lock.png"
              alt="Lock"
              width={100}
              height={100}
              className="object-cover"
            />
            <h2 className="text-2xl font-bold">Content Room Locked</h2>
            <p className="text-sm leading-loose">
              Your content room is locked and pending approval.
            </p>
          </div>
        </div>
      </ClientErrorBoundary>
    );
  }

  return (
    <ClientErrorBoundary>
      <ScreenOverlayClient
        eventId={event.id}
        eventName={event.eventName}
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
