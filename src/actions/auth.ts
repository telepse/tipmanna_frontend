"use server";

import { runServerFetch } from "@/lib/action-fetch";
import { serverAuthHeaders, serverHostAuthHeaders } from "@/lib/server-auth";

/** Auth mutations must not retry — codes are single-use. */
const AUTH_MUTATION_RETRY = { maxAttempts: 1 } as const;

// -------- Register host -------- //
export async function registerHostAction(values: {
  fullName: string;
  email: string;
  username: string;
  password: string;
  acceptedTerms: boolean;
  visitorId?: string;
}) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/auth/register-host`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
      cache: "no-store",
    },
    "registerHostAction",
    undefined,
    AUTH_MUTATION_RETRY
  );
}

// -------- Register tipper -------- //
export async function registerTipperAction(values: {
  fullName: string;
  email: string;
  acceptedTerms: boolean;
  visitorId?: string;
}) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/auth/register-tipper`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
      cache: "no-store",
    },
    "registerTipperAction",
    undefined,
    AUTH_MUTATION_RETRY
  );
}

// -------- Login or register tipper -------- //
export async function loginOrRegisterTipperAction(values: {
  fullName: string;
  email: string;
  acceptedTerms: boolean;
  visitorId?: string;
}) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/auth/login-or-register`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
      cache: "no-store",
    },
    "loginOrRegisterTipperAction",
    undefined,
    AUTH_MUTATION_RETRY
  );
}

// -------- Login or register host -------- //
export async function loginOrRegisterHostAction(values: {
  fullName: string;
  emailOrUsername: string;
  email: string;
  username: string;
  acceptedTerms: boolean;
  password: string;
  visitorId?: string;
}) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/auth/login-or-register-host`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
      cache: "no-store",
    },
    "loginOrRegisterHostAction",
    undefined,
    AUTH_MUTATION_RETRY
  );
}

// -------- Verify code -------- //
export async function verifyCodeAction(
  email: string,
  code: string,
  accountType: "TIPPER" | "HOST" = "TIPPER"
) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/auth/verify-code`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, code, accountType }),
      cache: "no-store",
    },
    "verifyCodeAction",
    undefined,
    AUTH_MUTATION_RETRY
  );
}

// -------- Login host -------- //
export async function loginHostAction(values: {
  emailOrUsername: string;
  password: string;
  visitorId?: string;
}) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/auth/login-host`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
      cache: "no-store",
    },
    "loginHostAction",
    undefined,
    AUTH_MUTATION_RETRY
  );
}

// -------- Check host username availability -------- //
export async function checkHostUsernameAvailabilityAction(values: {
  username: string;
  email?: string;
}) {
  const params = new URLSearchParams({
    username: values.username,
  });
  if (values.email?.trim()) {
    params.set("email", values.email.trim());
  }
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/auth/hosts/check-username?${params.toString()}`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    },
    "checkHostUsernameAvailabilityAction"
  );
}

// -------- Co-owner signup eligibility (standalone email signup) -------- //
export async function checkCoOwnerSignupEligibilityAction(email: string) {
  return runServerFetch<{
    eligible: boolean;
  }>(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/public/co-owner-signup-eligibility?email=${encodeURIComponent(email.trim())}`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    },
    "checkCoOwnerSignupEligibilityAction"
  );
}

// -------- Login tipper -------- //
export async function loginTipperAction(values: {
  email: string;
  visitorId?: string;
}) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/auth/login-tipper`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
      cache: "no-store",
    },
    "loginTipperAction",
    undefined,
    AUTH_MUTATION_RETRY
  );
}

// -------- Resend code -------- //
export async function resendCodeAction(
  email: string,
  accountType: "TIPPER" | "HOST" = "TIPPER"
) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/auth/resend-code`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, accountType }),
      cache: "no-store",
    },
    "resendCodeAction",
    undefined,
    AUTH_MUTATION_RETRY
  );
}

// -------- Request login code -------- //
export async function requestLoginCodeAction(values: {
  email: string;
  accountType?: "HOST" | "TIPPER";
}) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/auth/request-login-code`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: values.email,
        accountType: values.accountType ?? "HOST",
      }),
      cache: "no-store",
    },
    "requestLoginCodeAction",
    undefined,
    AUTH_MUTATION_RETRY
  );
}

// -------- Change email -------- //
export async function changeEmailAction(values: {
  userId: string;
  newEmail: string;
}) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/auth/change-email`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
      cache: "no-store",
    },
    "changeEmailAction"
  );
}

// -------- Forgot password -------- //
export async function forgotPasswordAction(email: string) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/auth/forgot-password`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
      cache: "no-store",
    },
    "forgotPasswordAction"
  );
}

// -------- Reset password -------- //
export async function resetPasswordAction(values: {
  token: string;
  newPassword: string;
}) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/auth/reset-password`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
      cache: "no-store",
    },
    "resetPasswordAction"
  );
}

// -------- Update user -------- //
export async function updateUserAction(
  values: {
    userId: string;
    fullName: string;
    email: string;
  },
  token: string
) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/auth/update-user`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(values),
      cache: "no-store",
    },
    "updateUserAction"
  );
}

// -------- Login visitor -------- //
export async function loginVisitorAction(values: {
  visitorId: string;
  email: string;
  role: string;
}) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/visitors/login`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(values),
      cache: "no-store",
    },
    "loginVisitorAction"
  );
}

// -------- Delete tipper profile -------- //
export async function deleteTipperAction(token: string) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/auth/delete-tipper`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    },
    "deleteTipperAction"
  );
}

// -------- Update tipper profile -------- //
export async function updateTipperAction(
  values: {
    username: string;
    fullName: string;
    email: string;
    anonymous?: boolean;
  },
  token: string
) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/auth/update-tipper`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(values),
      cache: "no-store",
    },
    "updateTipperAction"
  );
}

// -------- Update host profile -------- //
export async function updateHostAction(values: {
  fullName: string;
  email: string;
  currentPassword?: string;
  newPassword?: string;
}) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/auth/update-host`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(await serverHostAuthHeaders()),
      },
      body: JSON.stringify(values),
      cache: "no-store",
    },
    "updateHostAction"
  );
}

export async function getHostProfileAction() {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/auth/host-profile`,
    {
      method: "GET",
      headers: await serverHostAuthHeaders(),
      cache: "no-store",
    },
    "getHostProfileAction"
  );
}

export async function updateHostProfileAction(values: {
  profileAccountType?: "INDIVIDUAL" | "ORGANIZATION";
  individualProfile?: Record<string, unknown>;
  organisationProfile?: Record<string, unknown>;
}) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/auth/host-profile`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(await serverHostAuthHeaders()),
      },
      body: JSON.stringify(values),
      cache: "no-store",
    },
    "updateHostProfileAction"
  );
}

export type HostLinkResponse = {
  hasHost: boolean;
  hostId: string | null;
  eventSlug: string | null;
  username: string | null;
};

export async function getHostLinkAction(token?: string | null) {
  return runServerFetch<HostLinkResponse>(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/auth/me/host-link`,
    {
      method: "GET",
      headers: await serverAuthHeaders(token),
      cache: "no-store",
    },
    "getHostLinkAction"
  );
}
