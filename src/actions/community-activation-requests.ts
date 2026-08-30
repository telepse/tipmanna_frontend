"use server";

import { actionFail, runServerFetch } from "@/lib/action-fetch";
import { serverHostAuthHeaders } from "@/lib/server-auth";

function api() {
  return (process.env.NEXT_PUBLIC_BACKEND_API_URL || "").replace(/\/$/, "");
}

export async function createCommunityActivationRequestAction(body?: {
  eventId?: string;
  communityId?: string;
  kind?: "community" | "tv";
  communityName?: string | null;
  description?: string | null;
  logoUrl?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
}) {
  const eventId = body?.eventId?.trim() ?? "";
  const communityId = body?.communityId?.trim() ?? "";
  if (!eventId && !communityId) {
    return actionFail(
      "eventId or communityId required",
      "createCommunityActivationRequestAction"
    );
  }
  if (body?.kind !== "tv" && !eventId) {
    return actionFail(
      "eventId required",
      "createCommunityActivationRequestAction"
    );
  }
  return runServerFetch(
    `${api()}/communities/activation-requests`,
    {
      method: "POST",
      headers: await serverHostAuthHeaders(),
      body: JSON.stringify({
        ...(eventId ? { eventId } : {}),
        ...(communityId ? { communityId } : {}),
        ...(body?.kind === "tv" ? { kind: "tv" } : {}),
        ...(body?.communityName?.trim()
          ? { communityName: body.communityName.trim() }
          : {}),
        ...(body?.description?.trim()
          ? { description: body.description.trim() }
          : {}),
        ...(body?.logoUrl?.trim() ? { logoUrl: body.logoUrl.trim() } : {}),
        ...(body?.contactEmail?.trim()
          ? { contactEmail: body.contactEmail.trim() }
          : {}),
        ...(body?.contactPhone?.trim()
          ? { contactPhone: body.contactPhone.trim() }
          : {}),
      }),
      cache: "no-store",
    },
    "createCommunityActivationRequestAction"
  );
}

export async function listMyCommunityActivationRequestsAction() {
  return runServerFetch(
    `${api()}/communities/activation-requests/me`,
    {
      method: "GET",
      headers: await serverHostAuthHeaders(),
      cache: "no-store",
    },
    "listMyCommunityActivationRequestsAction"
  );
}
