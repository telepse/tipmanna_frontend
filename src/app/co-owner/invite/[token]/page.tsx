import { CoOwnerInviteClient } from "@/components/co-owner/co-owner-invite-client";

export default async function CoOwnerInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <CoOwnerInviteClient token={token} />;
}
