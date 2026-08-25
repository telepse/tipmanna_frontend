/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { getJoinFormPublicAction } from "@/actions/communities";

type Props = {
  params: Promise<{ communityId: string }>;
  searchParams: Promise<{ next?: string }>;
};

export default async function RestrictedCommunityPage({
  params,
  searchParams,
}: Props) {
  const { communityId } = await params;
  const { next: nextPath } = await searchParams;
  const safeNext =
    nextPath?.startsWith("/") && !nextPath.startsWith("//")
      ? nextPath
      : `/channel`;

  const { data } = await getJoinFormPublicAction(communityId, null as any);
  const name =
    data &&
    typeof data === "object" &&
    "name" in data &&
    typeof (data as { name?: string }).name === "string"
      ? (data as { name: string }).name
      : "This community";

  const signInHref = `/sign-in?next=${encodeURIComponent(safeNext)}`;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-6 text-zinc-100">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900/80 p-8 shadow-2xl backdrop-blur">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 text-xl font-black text-white">
            C
          </div>
          <div>
            <p className="text-xs font-medium tracking-wide text-zinc-400 uppercase">
              Community content
            </p>
            <p className="text-lg font-semibold text-white">{name}</p>
          </div>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Restricted</h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          Log in to find out if you are eligible to watch this video.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href={signInHref}
            className="inline-flex flex-1 items-center justify-center rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-100"
          >
            Log in
          </Link>
          <Link
            href={`/explore?tab=join&joinCommunity=${encodeURIComponent(communityId)}`}
            className="inline-flex flex-1 items-center justify-center rounded-lg border border-white/20 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/5"
          >
            About this community
          </Link>
        </div>
      </div>
    </div>
  );
}
