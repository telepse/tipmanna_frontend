import { buildCreatorProfileSharePath } from "@/lib/creator-profile-url";

export function safeInternalPath(
  next: string | null | undefined
): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}

type PostHostAuthDestinationInput = {
  hostUsername?: string | null;
  eventSlug?: string | null;
  returnTo?: string | null;
};

/**
 * Default destination after host password/code sign-in or host verify-email.
 * Prefers explicit returnTo, then creator profile — never dashboard by default.
 */
export function resolvePostHostAuthDestination(
  input: PostHostAuthDestinationInput
): string {
  const returnTo = safeInternalPath(input.returnTo ?? null);
  if (returnTo) return returnTo;

  const hostUsername = input.hostUsername?.trim();
  if (hostUsername) {
    const profile = buildCreatorProfileSharePath(hostUsername);
    if (profile !== "/") return profile;
  }

  if (input.eventSlug?.trim()) {
    return `/host/${input.eventSlug.trim()}`;
  }

  return "/explore";
}

/** Creator profile path for linked hosts in nav chrome (not post-auth default). */
export function resolveLinkedHostCreatorProfilePath(
  hostUsername?: string | null
): string | null {
  const handle = hostUsername?.trim();
  if (!handle) return null;
  const path = buildCreatorProfileSharePath(handle);
  return path === "/" ? null : path;
}

function hostFieldFromCreateResponse(
  data: unknown,
  field: "username" | "eventSlug"
): string | null {
  if (!data || typeof data !== "object") return null;
  const host = (data as Record<string, unknown>).host;
  if (!host || typeof host !== "object") return null;
  const value = (host as Record<string, unknown>)[field];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/**
 * After create-event wizards: never use Redux tipper slug.
 * Prefer host session handle, then host snapshot from the create response.
 */
export function resolveWizardPostSubmitDestination(input: {
  hostSessionUsername?: string | null;
  createEventResponse?: unknown;
}): string {
  const hostUsername =
    input.hostSessionUsername?.trim() ||
    hostFieldFromCreateResponse(input.createEventResponse, "username");

  const eventSlug = hostFieldFromCreateResponse(
    input.createEventResponse,
    "eventSlug"
  );

  return resolvePostHostAuthDestination({
    hostUsername,
    eventSlug,
  });
}
