import type { AppDispatch } from "@/redux/store";
import { setCredentials } from "@/features/auth-slice";
import type { ParsedAuthResponse } from "@/lib/auth-response";
import { persistAuthSession, persistHostSession } from "@/lib/session-client";

/** Apply dual auth: tipper primary session + optional host session cookie. */
export async function applyPrimaryAndHostSessions(
  parsed: ParsedAuthResponse,
  dispatch: AppDispatch,
  options?: { requiresVerification?: boolean }
): Promise<void> {
  dispatch(
    setCredentials({
      user: parsed.user,
      token: parsed.token,
      requiresVerification: options?.requiresVerification,
      tag: parsed.tag ?? null,
    })
  );

  if (!options?.requiresVerification) {
    await persistAuthSession(parsed.token, parsed.user, { expiresDays: 60 });
  }

  if (parsed.hostSession) {
    await persistHostSession(
      parsed.hostSession.token,
      parsed.hostSession.user,
      {
        expiresDays: 7,
      }
    );
  }
}
