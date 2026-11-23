import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const redirect = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});
const cookiesGet = vi.fn();

vi.mock("next/navigation", () => ({
  redirect: (url: string) => redirect(url),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => cookiesGet(name),
  }),
}));

vi.mock("@/components/account/account-delete-client", () => ({
  AccountDeleteClient: () => null,
}));

vi.mock("@/components/shared/footer", () => ({
  default: () => null,
}));

vi.mock("@/components/shared/navbar-shell", () => ({
  NavbarShell: () => null,
}));

import AccountDeletePage, { metadata } from "../page";

describe("/account/delete page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cookiesGet.mockReturnValue(undefined);
  });

  it("redirects unauthenticated users to sign-in with next=/account/delete", async () => {
    await expect(AccountDeletePage({})).rejects.toThrow(
      "REDIRECT:/sign-in?next=%2Faccount%2Fdelete"
    );
    expect(redirect).toHaveBeenCalledWith(
      "/sign-in?next=%2Faccount%2Fdelete"
    );
  });

  it("strips requestId query params before rendering (no URL disclosure)", async () => {
    cookiesGet.mockImplementation((name: string) =>
      name === "token" ? { value: "tipper-jwt" } : undefined
    );
    await expect(
      AccountDeletePage({
        searchParams: Promise.resolve({ requestId: "foreign-id" }),
      })
    ).rejects.toThrow("REDIRECT:/account/delete");
    expect(redirect).toHaveBeenCalledWith("/account/delete");
  });

  it("route owns soft-delete metadata and session-only account ownership (no visitorToken)", async () => {
    // Query-id strip runs before cookie auth (no request-id disclosure via URL).
    await expect(
      AccountDeletePage({
        searchParams: Promise.resolve({ deletionRequestId: "x" }),
      })
    ).rejects.toThrow("REDIRECT:/account/delete");
    expect(metadata.title).toMatch(/account deletion/i);
    expect(String(metadata.description).toLowerCase()).toContain(
      "soft-deletion"
    );
    expect(String(metadata.description).toLowerCase()).not.toContain(
      "enable permanent purge"
    );
    const pageSource = readFileSync(
      resolve(process.cwd(), "src/app/account/delete/page.tsx"),
      "utf8"
    );
    expect(pageSource).toContain("AccountDeleteClient");
    expect(pageSource).toContain('store.get("token")');
    expect(pageSource).toContain('store.get("hostToken")');
    expect(pageSource).not.toContain("delete-tipper");
    expect(pageSource).not.toContain("visitorToken");
  });
});
