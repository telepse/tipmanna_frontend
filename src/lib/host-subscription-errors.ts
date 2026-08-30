type ErrorBody = {
  error?: {
    code?: string;
    message?: string;
  };
};

export function readApiErrorCode(validationBody: unknown): string | null {
  if (!validationBody || typeof validationBody !== "object") return null;
  const code = (validationBody as ErrorBody).error?.code;
  return typeof code === "string" ? code : null;
}

export function isSubscriptionLapsedError(validationBody: unknown): boolean {
  return readApiErrorCode(validationBody) === "SUBSCRIPTION_LAPSED";
}

export function isSubscriptionRequiredError(validationBody: unknown): boolean {
  return readApiErrorCode(validationBody) === "SUBSCRIPTION_REQUIRED";
}

export function isHostSessionRequiredError(validationBody: unknown): boolean {
  return readApiErrorCode(validationBody) === "HOST_SESSION_REQUIRED";
}

export function subscriptionActionErrorMessage(
  validationBody: unknown,
  fallback: string
): string {
  if (isSubscriptionLapsedError(validationBody)) {
    return "Your subscription has lapsed. Renew to continue.";
  }
  if (isSubscriptionRequiredError(validationBody)) {
    return "An active Host Growth or Community plan is required.";
  }
  return fallback;
}
