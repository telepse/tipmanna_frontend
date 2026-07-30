"use server";

import { runServerFetch } from "@/lib/action-fetch";
import { serverAuthHeaders } from "@/lib/server-auth";

// -------- Register host -------- //
export async function registerHostAction(values: {
  fullName: string;
  email: string;
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
    "registerHostAction"
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
    "registerTipperAction"
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
    "loginOrRegisterTipperAction"
  );
}

// -------- Login or register host -------- //
export async function loginOrRegisterHostAction(values: {
  fullName: string;
  email: string;
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
    "loginOrRegisterHostAction"
  );
}

// -------- Verify code -------- //
export async function verifyCodeAction(email: string, code: string) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/auth/verify-code`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, code }),
      cache: "no-store",
    },
    "verifyCodeAction"
  );
}

// -------- Login host -------- //
export async function loginHostAction(values: {
  email: string;
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
    "loginHostAction"
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
    "loginTipperAction"
  );
}

// -------- Resend code -------- //
export async function resendCodeAction(email: string) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/auth/resend-code`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
      cache: "no-store",
    },
    "resendCodeAction"
  );
}

// -------- Request login code -------- //
export async function requestLoginCodeAction(values: { email: string }) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/auth/request-login-code`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
      cache: "no-store",
    },
    "requestLoginCodeAction"
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
export async function updateHostAction(
  values: {
    fullName: string;
    email: string;
    currentPassword?: string;
    newPassword?: string;
  },
  token: string
) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/auth/update-host`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(values),
      cache: "no-store",
    },
    "updateHostAction"
  );
}

export async function getHostProfileAction(token?: string | null) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/auth/host-profile`,
    {
      method: "GET",
      headers: await serverAuthHeaders(token),
      cache: "no-store",
    },
    "getHostProfileAction"
  );
}

export async function updateHostProfileAction(
  values: {
    profileAccountType?: "INDIVIDUAL" | "ORGANIZATION";
    individualProfile?: Record<string, unknown>;
    organisationProfile?: Record<string, unknown>;
  },
  token?: string | null
) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/auth/host-profile`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(await serverAuthHeaders(token)),
      },
      body: JSON.stringify(values),
      cache: "no-store",
    },
    "updateHostProfileAction"
  );
}
