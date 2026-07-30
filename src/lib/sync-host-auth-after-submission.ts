import { setCredentials, type HostUser } from "@/features/auth-slice";
import type { AppDispatch } from "@/redux/store";

export type HostAuthSnapshot = {
  numOfEvents?: number;
  lockedCustomerType?: "INDIVIDUAL" | "ORGANIZATION" | null;
  individualLegalFirstName?: string | null;
  individualLegalLastName?: string | null;
  organizationName?: string | null;
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
  };
}

/** Merge host auth fields returned after event/content submission into Redux. */
export function syncHostAuthAfterSubmission(
  dispatch: AppDispatch,
  user: HostUser,
  token: string,
  snapshot: HostAuthSnapshot | null | undefined
) {
  if (!snapshot) return;

  dispatch(
    setCredentials({
      user: {
        ...user,
        ...(snapshot.numOfEvents != null
          ? { numOfEvents: snapshot.numOfEvents }
          : {}),
        ...(snapshot.lockedCustomerType
          ? { lockedCustomerType: snapshot.lockedCustomerType }
          : {}),
        ...(snapshot.individualLegalFirstName != null
          ? { individualLegalFirstName: snapshot.individualLegalFirstName }
          : {}),
        ...(snapshot.individualLegalLastName != null
          ? { individualLegalLastName: snapshot.individualLegalLastName }
          : {}),
        ...(snapshot.organizationName != null
          ? { organizationName: snapshot.organizationName }
          : {}),
      },
      token,
    })
  );
}

export function syncHostAuthFromCreateEventResponse(
  dispatch: AppDispatch,
  user: HostUser,
  token: string | null | undefined,
  responseData: unknown
) {
  if (!token) return;

  const body =
    responseData && typeof responseData === "object"
      ? (responseData as Record<string, unknown>)
      : null;
  const snapshot = parseHostAuthSnapshot(body?.host);

  syncHostAuthAfterSubmission(dispatch, user, token, snapshot);
}
