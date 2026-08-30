import { CoOwnerPayoutsClient } from "@/components/co-owner/co-owner-payouts-client";

export default async function CoOwnerPayoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token?.trim()) {
    return (
      <div className="mx-auto max-w-lg p-6 text-sm">
        <p className="text-destructive">
          This page needs a valid link. Open the URL from your email (token
          missing).
        </p>
      </div>
    );
  }
  return (
    <CoOwnerPayoutsClient
      mode="token"
      token={token.trim()}
    />
  );
}
