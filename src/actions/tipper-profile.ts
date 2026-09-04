"use server";

import type { TippedVideoSummary } from "@/components/tipper/tipper-profile-client";
import type { Event } from "@/types";

export type PublicTipperProfile = {
  kind: "tipper" | "visitor";
  profileId: string;
  profileSlug: string;
  displayUsername: string | null;
  publicLabel: string;
  isVisitor: boolean;
  isAnonymous: boolean;
  showClaimCta: boolean;
  totalTipped: number;
  events: Event[];
  videos: TippedVideoSummary[];
  tipperEventCount: number;
};

export type PublicTipperProfileResult = {
  profile: PublicTipperProfile;
  redirectSlug?: string;
};

export async function getPublicTipperProfileAction(slug: string) {
  const handle = slug.trim();
  if (!handle) {
    return {
      success: false as const,
      data: null,
      redirectSlug: undefined,
      message: "Slug is required",
    };
  }

  const url = `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/tippers/public/${encodeURIComponent(handle)}`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    const text = await res.text();
    let body: unknown = null;
    if (text) {
      try {
        body = JSON.parse(text) as unknown;
      } catch {
        return {
          success: false as const,
          data: null,
          redirectSlug: undefined,
          message: "Invalid response from profile API",
        };
      }
    }

    if (res.status === 404) {
      return {
        success: false as const,
        data: null,
        redirectSlug: undefined,
        message: "Profile not found",
      };
    }

    if (res.status === 301 && body && typeof body === "object") {
      const redirectSlug = (body as { redirectSlug?: string }).redirectSlug;
      const profile = (body as { profile?: PublicTipperProfile }).profile;
      if (redirectSlug && profile) {
        return {
          success: true as const,
          data: profile,
          redirectSlug,
        };
      }
    }

    if (!res.ok) {
      const message =
        body &&
        typeof body === "object" &&
        "message" in body &&
        typeof (body as { message?: string }).message === "string"
          ? (body as { message: string }).message
          : `Request failed (${res.status})`;
      return {
        success: false as const,
        data: null,
        redirectSlug: undefined,
        message,
        httpStatus: res.status,
        validationBody: body,
      };
    }

    return {
      success: true as const,
      data: body as PublicTipperProfile,
      redirectSlug: undefined,
    };
  } catch (error) {
    return {
      success: false as const,
      data: null,
      redirectSlug: undefined,
      message: error instanceof Error ? error.message : "Network error",
    };
  }
}
