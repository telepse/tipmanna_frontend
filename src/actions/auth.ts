"use server";

// -------- Register host -------- //
export async function registerHostAction(values: {
  fullName: string;
  email: string;
  password: string;
  acceptedTerms: boolean;
}) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/auth/register-host`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
      cache: "no-store",
    }
  );

  const data = await res.json();

  if (!res.ok) {
    return {
      success: false,
      message: data?.error?.message || "Failed to register host",
    };
  }

  return { success: true, data };
}

// -------- Register tipper -------- //
export async function registerTipperAction(values: {
  fullName: string;
  email: string;
  acceptedTerms: boolean;
}) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/auth/register-tipper`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
      cache: "no-store",
    }
  );

  const data = await res.json();

  if (!res.ok) {
    return {
      success: false,
      message: data?.error?.message || "Failed to register tipper",
    };
  }

  return { success: true, data };
}

// -------- Login or register tipper -------- //
export async function loginOrRegisterTipperAction(values: {
  fullName: string;
  email: string;
  acceptedTerms: boolean;
}) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/auth/login-or-register`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
      cache: "no-store",
    }
  );

  const data = await res.json();

  if (!res.ok) {
    return {
      success: false,
      message: data?.error?.message || "Failed to login or register tipper",
    };
  }

  return { success: true, data };
}

// -------- Login or register host -------- //
export async function loginOrRegisterHostAction(values: {
  fullName: string;
  email: string;
  acceptedTerms: boolean;
}) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/auth/login-or-register-host`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
      cache: "no-store",
    }
  );

  const data = await res.json();
  console.log(data);

  if (!res.ok) {
    return {
      success: false,
      message: data?.error?.message || "Failed to login or register host",
    };
  }

  return { success: true, data };
}

// -------- Verify code -------- //
export async function verifyCodeAction(email: string, code: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/auth/verify-code`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, code }),
      cache: "no-store",
    }
  );

  const data = await res.json();
  console.log(data);

  if (!res.ok) {
    return {
      success: false,
      message: data?.error?.message || "Failed to verify email",
    };
  }

  return { success: true, data };
}

// -------- Login host -------- //
export async function loginHostAction(values: {
  email: string;
  password: string;
}) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/auth/login-host`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
      cache: "no-store",
    }
  );

  const data = await res.json();

  if (!res.ok) {
    return {
      success: false,
      message: data?.error?.message || "Failed to login host",
    };
  }

  return { success: true, data };
}

// -------- Login tipper -------- //
export async function loginTipperAction(values: { email: string }) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/auth/login-tipper`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
      cache: "no-store",
    }
  );

  const data = await res.json();

  if (!res.ok) {
    return {
      success: false,
      message: data?.error?.message || "Failed to login tipper",
    };
  }

  return { success: true, data };
}

// -------- Resend code -------- //
export async function resendCodeAction(email: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/auth/resend-code`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
      cache: "no-store",
    }
  );

  const data = await res.json();

  if (!res.ok) {
    return {
      success: false,
      message: data?.error?.message || "Failed to resend code",
    };
  }

  return { success: true, data };
}

// -------- Change email -------- //
export async function changeEmailAction(values: {
  userId: string;
  newEmail: string;
}) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/auth/change-email`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
      cache: "no-store",
    }
  );

  const data = await res.json();

  if (!res.ok) {
    return {
      success: false,
      message: data?.error?.message || "Failed to change email",
    };
  }

  return { success: true, data };
}

// -------- Forgot password -------- //
export async function forgotPasswordAction(email: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/auth/forgot-password`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
      cache: "no-store",
    }
  );

  const data = await res.json();

  if (!res.ok) {
    return {
      success: false,
      message: data?.error?.message || "Failed to send reset link",
    };
  }

  return { success: true, data };
}

// -------- Reset password -------- //
export async function resetPasswordAction(values: {
  token: string;
  newPassword: string;
}) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/auth/reset-password`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
      cache: "no-store",
    }
  );

  const data = await res.json();

  if (!res.ok) {
    return {
      success: false,
      message: data?.error?.message || "Failed to reset password",
    };
  }

  return { success: true, data };
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
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/auth/update-user`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(values),
      cache: "no-store",
    }
  );

  const data = await res.json();

  if (!res.ok) {
    return {
      success: false,
      message: data?.error?.message || "Failed to update user",
    };
  }

  return { success: true, data };
}

// -------- Login visitor -------- //
export async function loginVisitorAction(values: {
  visitorId: string;
  email: string;
  role: string;
}) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/visitors/login`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(values),
      cache: "no-store",
    }
  );

  const data = await res.json();
  console.log(data);

  if (!res.ok) {
    return {
      success: false,
      message: data?.error?.message || "Failed to login visitor",
    };
  }

  return { success: true, data };
}

// -------- Delete tipper profile -------- //
export async function deleteTipperAction(token: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/auth/delete-tipper`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    }
  );

  const data = await res.json();

  if (!res.ok) {
    return {
      success: false,
      message: data?.error?.message || "Failed to delete tipper",
    };
  }

  return { success: true, data };
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
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/auth/update-tipper`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(values),
      cache: "no-store",
    }
  );

  const data = await res.json();

  if (!res.ok) {
    return {
      success: false,
      message: data?.error?.message || "Failed to update tipper",
    };
  }

  return { success: true, data };
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
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/auth/update-host`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(values),
      cache: "no-store",
    }
  );

  const data = await res.json();

  if (!res.ok) {
    return {
      success: false,
      message: data?.error?.message || "Failed to update host",
    };
  }

  return { success: true, data };
}
