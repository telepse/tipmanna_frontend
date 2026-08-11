"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  getCommunityExploreCatalogAction,
  searchCommunitiesPreviewAction,
  type CommunityExploreCatalogRow,
} from "@/actions/communities";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { exploreCommunityJoinHref } from "@/lib/community-links";
import { isTipmannaSystemCommunity } from "@/lib/tv-community-picker";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "react-responsive";

type SearchRow = {
  id: string;
  name: string;
  description?: string | null;
  logoUrl?: string | null;
  createdAt?: string;
  totalTips?: number;
  memberCount?: number;
  viewer?: { joined: boolean; feedActive?: boolean };
  numVideos?: number;
};

function formatCommunityDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

type Props = {
  isAuthenticated: boolean;
  onJoinSignInRequired: (communityId: string) => void;
  className?: string;
  /** Hide the intro line under the search label (compact join panel). */
  compact?: boolean;
};

export function CommunitySearchBrowseSection({
  isAuthenticated,
  onJoinSignInRequired,
  className,
  compact = false,
}: Props) {
  const router = useRouter();
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<SearchRow[]>([]);
  const [searchBusy, setSearchBusy] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [catalogFilter, setCatalogFilter] = useState("");
  const [catalog, setCatalog] = useState<{
    total: number;
    alphabetical: CommunityExploreCatalogRow[];
  } | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    setCatalogError(null);
    try {
      const r = await getCommunityExploreCatalogAction();
      if (r.success && r.data) {
        setCatalog({
          total: r.data.total,
          alphabetical: r.data.alphabetical,
        });
      } else {
        setCatalog(null);
        setCatalogError(r.message ?? "Could not load communities");
      }
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    const q = searchQ.trim();
    if (q.length < 1) {
      setSearchResults([]);
      return;
    }
    let cancelled = false;
    const t = window.setTimeout(() => {
      void (async () => {
        setSearchBusy(true);
        try {
          const r = await searchCommunitiesPreviewAction(q);
          if (cancelled) return;
          const raw =
            r.success && Array.isArray(r.data?.communities)
              ? r.data!.communities
              : [];
          const rows: SearchRow[] = raw.map((x: unknown) => {
            const o = x as SearchRow & Record<string, unknown>;
            return {
              id: String(o?.id ?? ""),
              name: String(o?.name ?? "Community"),
              logoUrl: o?.logoUrl,
              description:
                typeof o.description === "string" ? o.description : null,
              createdAt:
                typeof o.createdAt === "string" ? o.createdAt : undefined,
              totalTips:
                typeof o.totalTips === "number" ? o.totalTips : undefined,
              memberCount:
                typeof o.memberCount === "number" ? o.memberCount : undefined,
              viewer: o?.viewer,
              numVideos:
                typeof o.numVideos === "number" ? o.numVideos : undefined,
            };
          });
          setSearchResults(rows.filter(rw => rw.id));
        } finally {
          if (!cancelled) setSearchBusy(false);
        }
      })();
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [searchQ]);

  const browseableCatalog = useMemo(() => {
    if (!catalog?.alphabetical.length) return [];
    return catalog.alphabetical.filter(
      c => !isTipmannaSystemCommunity(c.id, c.name, c.isSystem)
    );
  }, [catalog?.alphabetical]);

  const filteredCatalog = useMemo(() => {
    if (!browseableCatalog.length) return [];
    const q = catalogFilter.trim().toLowerCase();
    if (!q) return browseableCatalog;
    return browseableCatalog.filter(
      c =>
        c.name.toLowerCase().includes(q) ||
        (c.description?.toLowerCase().includes(q) ?? false)
    );
  }, [browseableCatalog, catalogFilter]);

  const catalogTotalDisplay = catalogLoading
    ? "…"
    : String(catalog?.total ?? 0);

  const handleJoinClick = useCallback(
    (communityId: string) => {
      if (!isAuthenticated) {
        onJoinSignInRequired(communityId);
        return;
      }
      router.push(exploreCommunityJoinHref(communityId));
    },
    [isAuthenticated, onJoinSignInRequired, router]
  );

  const isMobile = useMediaQuery({ query: "(max-width: 768px)" });

  return (
    <>
      <section className={cn("space-y-3", className)}>
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-semibold">Communities</h1>

          <span className="text-xs tabular-nums">
            {catalogTotalDisplay} communities
          </span>
        </div>

        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-2">
          <div className="-mt-2 -ml-4 flex items-center justify-between gap-4 sm:gap-2">
            <Label
              htmlFor="community-join-search"
              className={
                compact ? "text-sm font-medium" : "text-base font-medium"
              }
            >
              <span className="text-muted-foreground hidden font-normal">
                Search
              </span>{" "}
              <span className="hidden text-xs tabular-nums sm:text-base">
                {catalogTotalDisplay}
              </span>{" "}
              <span className="text-muted-foreground hidden font-normal">
                communities
              </span>
            </Label>

            <Input
              id="community-join-search"
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              placeholder="Type to search…"
              className="h-6 w-[200px] max-w-md lg:h-fit lg:w-[400px]"
            />

            {isMobile ? (
              <button
                type="button"
                disabled={catalogLoading && !catalog}
                onClick={() => {
                  setCatalogFilter("");
                  setCatalogOpen(true);
                }}
                className="text-xs underline underline-offset-2"
              >
                Browse all A - Z
              </button>
            ) : null}
          </div>

          {!isMobile ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={catalogLoading && !catalog}
              onClick={() => {
                setCatalogFilter("");
                setCatalogOpen(true);
              }}
            >
              Browse all A–Z
            </Button>
          ) : null}
        </div>

        {searchBusy ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full max-w-md" />
            <Skeleton className="h-10 w-full max-w-md" />
          </div>
        ) : null}
        {searchResults.length > 0 ? (
          <ul className="divide-border bg-background divide-y rounded-md border">
            {searchResults.map(c => {
              const isTipmannaPublic = isTipmannaSystemCommunity(c.id, c.name);
              return (
                <li
                  key={c.id}
                  className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    {c.logoUrl ? (
                      <div className="relative size-10 shrink-0 overflow-hidden rounded-md">
                        <Image
                          src={c.logoUrl}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="40px"
                        />
                      </div>
                    ) : null}
                    <div className="min-w-0 space-y-1">
                      <p className="truncate text-sm font-medium">{c.name}</p>
                      {c.description ? (
                        <p className="text-muted-foreground line-clamp-2 text-xs">
                          {c.description}
                        </p>
                      ) : null}
                      <p className="text-muted-foreground text-[11px]">
                        {typeof c.totalTips === "number"
                          ? `${c.totalTips} tips`
                          : null}
                        {typeof c.totalTips === "number" &&
                        typeof c.memberCount === "number"
                          ? " · "
                          : null}
                        {typeof c.memberCount === "number"
                          ? `${c.memberCount} members`
                          : null}

                        {typeof c.numVideos === "number"
                          ? ` · ${c.numVideos} videos`
                          : null}
                      </p>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-muted-foreground text-[11px]">
                          {c.createdAt
                            ? `Created ${formatCommunityDate(c.createdAt)}`
                            : null}
                        </p>

                        <div className="flex shrink-0 gap-2">
                          {c.viewer?.joined ? (
                            <Button
                              asChild
                              size="sm"
                              variant="outline"
                            >
                              <Link href={exploreCommunityJoinHref(c.id)}>
                                Details
                              </Link>
                            </Button>
                          ) : !isTipmannaPublic ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={() => handleJoinClick(c.id)}
                            >
                              Join
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : searchQ.trim().length >= 1 && !searchBusy ? (
          <p className="text-muted-foreground text-xs">No matches.</p>
        ) : null}
        {catalogError ? (
          <p className="text-destructive text-xs">{catalogError}</p>
        ) : null}
      </section>

      <Dialog
        open={catalogOpen}
        onOpenChange={setCatalogOpen}
      >
        <DialogContent className="flex max-h-[85vh] max-w-lg flex-col gap-4 overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>All communities</DialogTitle>
            <DialogDescription>
              Sorted A–Z. Filter below or scroll to browse.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={catalogFilter}
            onChange={e => setCatalogFilter(e.target.value)}
            placeholder="Filter by name or description…"
            aria-label="Filter communities"
          />
          <ScrollArea className="min-h-0 flex-1 pr-3">
            <ul className="divide-border divide-y rounded-md border">
              {filteredCatalog.map(c => (
                <li
                  key={c.id}
                  className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="truncate text-sm font-medium">{c.name}</p>
                    {c.description ? (
                      <p className="text-muted-foreground line-clamp-2 text-xs">
                        {c.description}
                      </p>
                    ) : null}
                    <p className="text-muted-foreground text-[11px]">
                      {c.totalTips} tips · {c.memberCount} members · Created{" "}
                      {formatCommunityDate(c.createdAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {c.viewer?.joined ? (
                      <span className="text-muted-foreground self-center text-xs">
                        Member
                      </span>
                    ) : !isTipmannaSystemCommunity(c.id, c.name, c.isSystem) ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setCatalogOpen(false);
                          handleJoinClick(c.id);
                        }}
                      >
                        Join
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
