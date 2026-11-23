import { describe, expect, it } from "vitest";
import { accountDeletedMessageFromAuthFailure } from "../account-deleted-auth-message";

describe("accountDeletedMessageFromAuthFailure", () => {
  it("maps ACCOUNT_DELETED code from API envelope", () => {
    expect(
      accountDeletedMessageFromAuthFailure({
        message: "This account has been deleted and cannot be signed in.",
        httpStatus: 401,
        validationBody: {
          error: {
            status: 401,
            message: "This account has been deleted and cannot be signed in.",
            code: "ACCOUNT_DELETED",
          },
        },
      })
    ).toMatch(/deleted/i);
  });

  it("ignores ordinary 404 not-found login failures", () => {
    expect(
      accountDeletedMessageFromAuthFailure({
        message: "No Tipper account found with this email",
        httpStatus: 404,
        validationBody: {
          error: { status: 404, message: "No Tipper account found with this email" },
        },
      })
    ).toBeNull();
  });
});
