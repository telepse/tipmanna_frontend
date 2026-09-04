import type { AppDispatch } from "@/redux/store";
import { setCredentials } from "@/features/auth-slice";
import type { ParsedAuthResponse } from "@/lib/auth-response";
import { persistAuthSession, persistHostSession } from "@/lib/session-client";
import { notifyHostSessionTouched } from "@/lib/host-session-probe";

export type ApplyHostSessionResult = {
  hostSessionPersisted: boolean;
};

/** Apply dual auth: tipper primary session + optional host session cookie. */
export async function applyPrimaryAndHostSessions(
  parsed: ParsedAuthResponse,
  dispatch: AppDispatch,
  options?: { requiresVerification?: boolean }
): Promise<ApplyHostSessionResult> {
  const requiresVerification =
    options?.requiresVerification ?? parsed.requiresVerification ?? false;

  dispatch(
    setCredentials({
      user: parsed.user,
      token: parsed.token,
      requiresVerification,
      tag: parsed.tag ?? null,
    })
  );

  if (!requiresVerification && parsed.token) {
    await persistAuthSession(parsed.token, parsed.user, { expiresDays: 60 });

    let hostSessionPersisted = true;
    if (parsed.hostSession?.token && parsed.hostSession.user) {
      hostSessionPersisted = await persistHostSession(
        parsed.hostSession.token,
        parsed.hostSession.user,
        {
          expiresDays: 7,
        }
      );
      if (hostSessionPersisted) {
        notifyHostSessionTouched({
          active: true,
          hostId: parsed.hostSession.user.id,
          hostSessionExpiresAt: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000
          ).toISOString(),
        });
      }
    }
    return { hostSessionPersisted };
  }

  return { hostSessionPersisted: true };
}
