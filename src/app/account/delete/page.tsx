import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AccountDeleteClient } from "@/components/account/account-delete-client";
import Footer from "@/components/shared/footer";
import { NavbarShell } from "@/components/shared/navbar-shell";

export const metadata = {
  title: "Request account deletion | Tipmanna",
  description:
    "Request soft-deletion of your Tipmanna account. This is not individual content deletion and permanent purge is not available here.",
};

export default async function AccountDeletePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Ignore any request id in the query string — never hydrate foreign ids from URL.
  const sp = searchParams ? await searchParams : {};
  if (sp.requestId || sp.id || sp.deletionRequestId) {
    redirect("/account/delete");
  }

  const store = await cookies();
  const tipperToken = store.get("token")?.value?.trim();
  const hostToken = store.get("hostToken")?.value?.trim();
  if (!tipperToken && !hostToken) {
    redirect(`/sign-in?next=${encodeURIComponent("/account/delete")}`);
  }

  const accountLabel = tipperToken ? "your tipper account" : "your host account";

  return (
    <>
      <NavbarShell />
      <main className="section mini-wrapper py-10 sm:py-14">
        <AccountDeleteClient accountLabel={accountLabel} />
      </main>
      <Footer />
    </>
  );
}
