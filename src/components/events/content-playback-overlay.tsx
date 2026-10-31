"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

import {
  getAllCharacterSets,
  getCharactersForTipping,
} from "@/actions/characters";
import { getEventByIdAction } from "@/actions/events";
import { getContentChannelAction } from "@/actions/contents";
import {
  buildOverlayPayloadFromChannelData,
  mergeOverlayCatalogOntoPayload,
  overlayPayloadFromSeed,
  overlayCommunityMetaFromChannelData,
  resolveOverlayTipCatalog,
  shouldSurfaceOverlayLoadError,
  type OverlayContentSeed,
  type OverlayPlaybackPayload,
} from "@/lib/content-playback-overlay-seed";
import { takeOverlayPlaySeed } from "@/lib/playback-overlay-seed-handoff";
import { OVERLAY_Z_INDEX } from "@/lib/drawer-z-index";
import { isExploreE2eFixturesActiveOnClient } from "@/lib/explore-e2e-fixtures-gate";
import { cn } from "@/lib/utils";
import type { PaymentSurface } from "@/lib/analytics-types";

const ContentClient = dynamic(
  () =>
    import("@/components/events/content-client").then(m => ({
      default: m.ContentClient,
    })),
  { ssr: false }
);

type Props = {
  eventId: string;
  channelId: string;
  onDismiss: () => void;
  paymentSurface?: PaymentSurface;
  seed?: OverlayContentSeed | null;
};

function resolvePropSeed(
  eventId: string,
  channelId: string,
  seed?: OverlayContentSeed | null
): OverlayContentSeed | null {
  if (!seed) return null;
  if (seed.eventId !== eventId || seed.channelId !== channelId) return null;
  if (!seed.url?.trim()) return null;
  return seed;
}

export function ContentPlaybackOverlay({
  eventId,
  channelId,
  onDismiss,
  paymentSurface = "content_client",
  seed,
}: Props) {
  const phaseAReadyRef = useRef(false);
  const [payload, setPayload] = useState<OverlayPlaybackPayload | null>(() => {
    const fromProp = resolvePropSeed(eventId, channelId, seed);
    if (fromProp) {
      phaseAReadyRef.current = true;
      return overlayPayloadFromSeed(fromProp);
    }
    const fromHandoff = takeOverlayPlaySeed(eventId, channelId);
    if (fromHandoff) {
      phaseAReadyRef.current = true;
      return overlayPayloadFromSeed(fromHandoff);
    }
    return null;
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);

    const propSeed = resolvePropSeed(eventId, channelId, seed);
    const seedPayload = propSeed ? overlayPayloadFromSeed(propSeed) : null;
    if (seedPayload) {
      phaseAReadyRef.current = true;
      setPayload(seedPayload);
    }
    // When prop has no url, keep any Phase-A payload from sessionStorage handoff
    // (already applied in useState). Do not wipe to null.

    void (async () => {
      const hadPhaseA = Boolean(seedPayload) || phaseAReadyRef.current;
      let playbackMounted = hadPhaseA;

      // Dual-gate: keep Phase-A seed only; skip channel/character/event Server Actions (S7).
      if (isExploreE2eFixturesActiveOnClient()) {
        if (!hadPhaseA && !seedPayload) {
          setError("Could not load video");
        }
        return;
      }

      try {
        const contentsRes = await getContentChannelAction(eventId);
        if (cancelled) return;

        let communityPatch = overlayCommunityMetaFromChannelData(null);
        let mountedFromContent = false;

        if (contentsRes.success) {
          communityPatch = overlayCommunityMetaFromChannelData(
            contentsRes.data
          );
          const fromChannel = buildOverlayPayloadFromChannelData(
            contentsRes.data
          );

          if (fromChannel) {
            mountedFromContent = true;
            playbackMounted = true;
            phaseAReadyRef.current = true;
            if (hadPhaseA) {
              setPayload(prev =>
                prev
                  ? {
                      ...prev,
                      ...communityPatch,
                    }
                  : fromChannel
              );
            } else {
              setPayload(fromChannel);
            }
          } else if (!playbackMounted) {
            setError(contentsRes.error ?? "Could not load video");
            return;
          }
        } else if (!playbackMounted) {
          setError(contentsRes.error ?? "Could not load video");
          return;
        }

        try {
          const [
            { data: characters },
            { data: globalCharacterSets },
            eventRes,
          ] = await Promise.all([
            getCharactersForTipping(),
            getAllCharacterSets(),
            getEventByIdAction(eventId),
          ]);

          if (cancelled) return;

          const catalog = resolveOverlayTipCatalog({
            tippingCharacters: characters,
            globalCharacterSets,
            eventCharacterSets: eventRes.success
              ? eventRes.data?.characterSets
              : [],
          });

          setPayload(prev => {
            if (!prev) {
              if (mountedFromContent && contentsRes.success) {
                const fromChannel = buildOverlayPayloadFromChannelData(
                  contentsRes.data
                );
                if (fromChannel) {
                  return mergeOverlayCatalogOntoPayload(
                    fromChannel,
                    catalog,
                    communityPatch
                  );
                }
              }
              return prev;
            }
            return mergeOverlayCatalogOntoPayload(
              prev,
              catalog,
              communityPatch
            );
          });
        } catch {
          /* Phase B: keep player; tips may stay empty */
        }
      } catch {
        if (shouldSurfaceOverlayLoadError({ cancelled, playbackMounted })) {
          setError("Could not load video");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    eventId,
    channelId,
    seed?.eventId,
    seed?.channelId,
    seed?.url,
    seed?.title,
  ]);

  return (
    <div
      className={cn(
        OVERLAY_Z_INDEX,
        "fixed inset-0 flex h-[100dvh] w-screen flex-col bg-black"
      )}
      role="dialog"
      aria-modal="true"
    >
      {error ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center text-white">
          <p className="text-sm">{error}</p>
          <button
            type="button"
            className="rounded-md bg-white/10 px-4 py-2 text-sm font-medium"
            onClick={onDismiss}
          >
            Close
          </button>
        </div>
      ) : payload && isExploreE2eFixturesActiveOnClient() ? (
        // E2E: open overlay shell without ContentClient (no Pusher / player / SAs).
        <div
          className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center text-white"
          data-e2e-overlay-shell="1"
        >
          <p className="text-lg font-medium">
            {(payload.contents[0] as { title?: string } | undefined)?.title ??
              seed?.title ??
              "E2E Featured overlay clip"}
          </p>
          <p className="text-sm text-white/70">E2E overlay fixture (no network player)</p>
          <button
            type="button"
            className="rounded-md bg-white/10 px-4 py-2 text-sm font-medium text-white"
            onClick={onDismiss}
          >
            Close
          </button>
        </div>
      ) : payload ? (
        <ContentClient
          contents={payload.contents}
          characters={payload.characters}
          characterSets={payload.characterSets}
          eventId={eventId}
          initialChannelId={channelId}
          isCommunity={payload.isCommunity}
          communityId={payload.communityId}
          communityName={payload.communityName}
          presentation="overlay"
          startInFullView
          onDismiss={onDismiss}
          paymentSurface={paymentSurface}
        />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-sm text-white/80">
          <span>Loading…</span>
          <button
            type="button"
            className="rounded-md bg-white/10 px-4 py-2 text-sm font-medium text-white"
            onClick={onDismiss}
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
