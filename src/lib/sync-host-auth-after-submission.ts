import Cookies from "js-cookie";
import {
  getHostUserFromCookies,
  type HostUserCookie,
} from "@/lib/host-session-client";

export type HostAuthSnapshot = {
  numOfEvents?: number;
  lockedCustomerType?: "INDIVIDUAL" | "ORGANIZATION" | null;
  individualLegalFirstName?: string | null;
  individualLegalLastName?: string | null;
  organizationName?: string | null;
  eventSlug?: string | null;
  eventCode?: string | null;
};

function optionalString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

export function parseHostAuthSnapshot(data: unknown): HostAuthSnapshot | null {
  if (!data || typeof data !== "object") return null;

  const raw = data as Record<string, unknown>;
  const lockedCustomerType =
    raw.lockedCustomerType === "INDIVIDUAL" ||
    raw.lockedCustomerType === "ORGANIZATION"
      ? raw.lockedCustomerType
      : null;

  return {
    numOfEvents:
      typeof raw.numOfEvents === "number" ? raw.numOfEvents : undefined,
    lockedCustomerType,
    individualLegalFirstName: optionalString(raw.individualLegalFirstName),
    individualLegalLastName: optionalString(raw.individualLegalLastName),
    organizationName: optionalString(raw.organizationName),
    eventSlug: optionalString(raw.eventSlug),
    eventCode: optionalString(raw.eventCode),
  };
}

function cookieToHostUser(cookie: HostUserCookie): HostUserCookie {
  return { ...cookie };
}

/** Merge host fields from event submission into the hostUser cookie (not primary Redux). */
export async function syncHostCookieAfterSubmission(
  snapshot: HostAuthSnapshot | null | undefined
): Promise<void> {
  if (!snapshot) return;

  const existing = getHostUserFromCookies();
  if (!existing?.id) return;

  const merged: HostUserCookie = {
    ...cookieToHostUser(existing),
    ...(snapshot.numOfEvents != null
      ? { numOfEvents: String(snapshot.numOfEvents) }
      : {}),
    ...(snapshot.eventSlug != null ? { eventSlug: snapshot.eventSlug } : {}),
    ...(snapshot.eventCode != null ? { eventCode: snapshot.eventCode } : {}),
  };

  Cookies.set("hostUser", JSON.stringify(merged), {
    path: "/",
    sameSite: "lax",
  });
}

/** @deprecated Use syncHostCookieAfterSubmission — never write host fields to primary Redux. */
export function syncHostAuthFromCreateEventResponse(
  _dispatch: unknown,
  _user: unknown,
  _token: string | null | undefined,
  responseData: unknown
) {
  const body =
    responseData && typeof responseData === "object"
      ? (responseData as Record<string, unknown>)
      : null;
  const snapshot = parseHostAuthSnapshot(body?.host);
  void syncHostCookieAfterSubmission(snapshot);
}
