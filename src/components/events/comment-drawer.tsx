"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { EyeIcon, Heart, Wallet, X } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { setSelectedTips } from "@/features/tip-slice";
import type { RootState } from "@/redux/store";
import type { RoomCharacter } from "@/types";
import {
  ensureSingleTextInCart,
  notifyTextTipDraftSync,
  resolveCommentPreviewCharacter,
  clearTextTipDraftStorage,
  resolveTextTipUnitPrice,
  sumSelectedTipCartTotal,
} from "@/lib/tip-text-selection";
import { TextTipDraftModal } from "@/components/events/text-tip-draft-modal";
import {
  reportChannelContentAction,
  toggleCommentLikeAction,
  type CommentDrawerData,
} from "@/actions/messages";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCommentDrawerData } from "@/hooks/use-comment-drawer-data";
import { flushTvAnalytics } from "@/lib/tvAnalytics";
import { Input } from "@/components/ui/input";
import { stopPreview } from "@/lib/previewController";
import { runTextTipPreviewThenOpenDraftModal } from "@/lib/text-tip-draft-flow";
import SignInDialog from "@/components/auth/sign-in-dialog";
import {
  DRAWER_Z_INDEX,
  SIGN_IN_NESTED_OVERLAY_Z_INDEX,
  SIGN_IN_NESTED_Z_INDEX,
} from "@/lib/drawer-z-index";
import { toast } from "react-toastify";
import { useCommentDrawerRealtime } from "@/hooks/use-comment-drawer-realtime";
import { useChannelEngagementRealtime } from "@/hooks/use-channel-engagement-realtime";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SaveHostToggleButton } from "./save-host-toggle-button";

interface Props {
  isCommentDrawerOpen: boolean;
  setIsCommentDrawerOpen: (value: boolean) => void;
  eventId: string;
  channelId: string | null;
  videoTitle?: string;
  videoDescription?: string;
  numOfTips?: number;
  amountRaised?: number | null;
  showViewCount?: boolean;
  showEncounterCount?: boolean;
  /** Characters from the room (used to run comment preview when adding a draft). */
  tippingCharacters?: RoomCharacter[];
  /** After saving draft locally: close comment drawer and open tip UI (parent owns drawer open state). */
  onContinueToTip?: () => void;
  hostName?: string;
  /** Bump to refetch share/save metrics without closing the drawer. */
  metricsRefreshKey?: number;
}

export const CommentDrawer = ({
  isCommentDrawerOpen,
  setIsCommentDrawerOpen,
  eventId,
  channelId,
  videoTitle,
  videoDescription,
  numOfTips,
  amountRaised,
  showViewCount = false,
  showEncounterCount = false,
  tippingCharacters,
  onContinueToTip,
  hostName,
  metricsRefreshKey,
}: Props) => {
  const dispatch = useDispatch();
  const authUser = useSelector((s: RootState) => s.auth.user);
  const selectedTips = useSelector((s: RootState) => s.tip.selectedTips);
  const tipsForTotals = useMemo(
    () => ensureSingleTextInCart(selectedTips),
    [selectedTips]
  );

  const [drawerData, setDrawerData] = useState<CommentDrawerData | null>(null);
  const [descOpen, setDescOpen] = useState(false);
  const {
    drawerData: fetchedDrawerData,
    loading,
    revalidate,
  } = useCommentDrawerData(
    eventId,
    channelId,
    isCommentDrawerOpen,
    metricsRefreshKey
  );
  const [pendingDraft, setPendingDraft] = useState("");
  const [draftModalOpen, setDraftModalOpen] = useState(false);
  const [modalDraft, setModalDraft] = useState("");
  const [signInOpen, setSignInOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("deceptive");
  const [reportOther, setReportOther] = useState("");
  const [likeBusyId, setLikeBusyId] = useState<string | null>(null);
  const cancelTextPreviewRef = useRef<(() => void) | null>(null);
  const drawerShellRef = useRef<HTMLDivElement | null>(null);

  const tipPriceCatalog = useMemo(
    () => tippingCharacters ?? [],
    [tippingCharacters]
  );

  const textTipUnitPrice = useMemo(
    () => resolveTextTipUnitPrice(tipPriceCatalog),
    [tipPriceCatalog]
  );

  const commentPreviewTotal = useMemo(() => {
    const cartForTotal =
      pendingDraft.trim() && !tipsForTotals.includes("Comment")
        ? ensureSingleTextInCart([...tipsForTotals, "Comment"])
        : tipsForTotals;

    return sumSelectedTipCartTotal(
      cartForTotal,
      tipPriceCatalog,
      textTipUnitPrice
    );
  }, [tipsForTotals, tipPriceCatalog, textTipUnitPrice, pendingDraft]);

  useEffect(() => {
    if (commentPreviewTotal > 0) {
      localStorage.setItem("amount", String(commentPreviewTotal));
    }
  }, [commentPreviewTotal]);

  const items = drawerData?.comments ?? [];
  const metrics = drawerData?.metrics;
  const channelMeta = drawerData?.channel;
  const hostMeta = drawerData?.host;

  const engagementInitial = useMemo(() => {
    if (!metrics) return null;
    return {
      views: metrics.viewCount ?? 0,
      encounters: metrics.encounterCount ?? 0,
      completes: 0,
      saves: metrics.saveCount ?? 0,
      shares: metrics.shareCount ?? 0,
      comments: metrics.commentCount ?? 0,
    };
  }, [metrics]);

  const engagementLive = useChannelEngagementRealtime({
    channelId:
      isCommentDrawerOpen && channelId != null ? String(channelId) : null,
    initial: engagementInitial,
    enabled: isCommentDrawerOpen && Boolean(channelId),
  });

  useEffect(() => {
    setPendingDraft("");
  }, [channelId]);

  useEffect(() => {
    if (!isCommentDrawerOpen) return;
    try {
      const fromStorage = localStorage.getItem("textTipValue") ?? "";
      if (fromStorage.trim()) {
        setPendingDraft(prev => (prev.trim() ? prev : fromStorage));
      }
    } catch {
      /* quota / private mode */
    }
  }, [isCommentDrawerOpen]);

  useEffect(() => {
    if (fetchedDrawerData) setDrawerData(fetchedDrawerData);
  }, [fetchedDrawerData]);

  useEffect(() => {
    if (!isCommentDrawerOpen) return;
    void flushTvAnalytics();
  }, [isCommentDrawerOpen, metricsRefreshKey]);

  useEffect(() => {
    if (!isCommentDrawerOpen) return;
    const onFocus = () => {
      if (document.visibilityState === "visible") void revalidate();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [isCommentDrawerOpen, revalidate]);

  const handleLiveComment = useCallback(
    (comment: {
      id: string;
      username: string;
      text: string;
      createdAt: string;
    }) => {
      setDrawerData(prev => {
        if (!prev) return prev;
        if (prev.comments.some(c => c.id === comment.id)) return prev;
        return {
          ...prev,
          comments: [
            {
              id: comment.id,
              username: comment.username,
              message: comment.text,
              createdAt: comment.createdAt,
              likeCount: 0,
              likedByMe: false,
            },
            ...prev.comments,
          ],
          metrics: {
            ...prev.metrics,
            commentCount: (prev.metrics?.commentCount ?? 0) + 1,
          },
        };
      });
    },
    []
  );

  useCommentDrawerRealtime({
    eventId,
    channelId,
    enabled: isCommentDrawerOpen,
    onNewComment: handleLiveComment,
  });

  const handleLike = async (messageId: string) => {
    if (!authUser) {
      setSignInOpen(true);
      return;
    }
    setLikeBusyId(messageId);
    const res = await toggleCommentLikeAction(messageId);
    setLikeBusyId(null);
    if (!res.success || !res.data) {
      toast.error(res.message ?? "Could not update like");
      return;
    }
    setDrawerData(prev => {
      if (!prev) return prev;
      const comments = prev.comments.map(c =>
        c.id === messageId
          ? {
              ...c,
              likedByMe: res.data!.liked,
              likeCount: res.data!.likeCount,
            }
          : c
      );
      return {
        ...prev,
        comments,
        metrics: {
          ...prev.metrics,
          commentLikeCount: comments.reduce((n, c) => n + c.likeCount, 0),
        },
      };
    });
  };

  const submitReport = async () => {
    if (!channelId?.trim()) return;
    if (reportReason === "other" && !reportOther.trim()) {
      toast.error("Please describe the issue");
      return;
    }
    const res = await reportChannelContentAction(channelId.trim(), {
      reason: reportReason,
      otherText: reportReason === "other" ? reportOther : undefined,
    });
    if (!res.success) {
      const msg = res.message ?? "Could not submit report";
      if (
        msg.includes("429") ||
        msg.toLowerCase().includes("24 hours") ||
        msg.toLowerCase().includes("too many")
      ) {
        toast.error("You already reported this video in the last 24 hours");
      } else {
        toast.error(msg);
      }
      return;
    }
    toast.success("Report submitted — thank you");
    setReportOpen(false);
  };

  const openDraftModalOnly = () => {
    cancelTextPreviewRef.current?.();
    cancelTextPreviewRef.current = null;
    stopPreview();
    setModalDraft(pendingDraft);
    setDraftModalOpen(true);
  };

  const openDraftModal = () => {
    if (pendingDraft.trim()) {
      openDraftModalOnly();
      return;
    }

    const character = resolveCommentPreviewCharacter(tippingCharacters);
    if (!character) {
      openDraftModalOnly();
      return;
    }

    cancelTextPreviewRef.current?.();
    cancelTextPreviewRef.current = runTextTipPreviewThenOpenDraftModal({
      character,
      tippingCharacters: tippingCharacters ?? [],
      tipsForTotals,
      openDraftModal: openDraftModalOnly,
      drawerTintRoot: drawerShellRef.current,
    });
  };

  useEffect(
    () => () => {
      cancelTextPreviewRef.current?.();
    },
    []
  );

  const saveDraftModal = () => {
    const text = modalDraft.trim();
    if (!text) return;

    setPendingDraft(text);
    try {
      localStorage.setItem("textTipValue", text);
    } catch {
      /* quota / private mode */
    }
    notifyTextTipDraftSync();
    dispatch(
      setSelectedTips(ensureSingleTextInCart([...tipsForTotals, "Comment"]))
    );
    setDraftModalOpen(false);
  };

  const removeTextTip = () => {
    stopPreview();
    clearTextTipDraftStorage();
    setPendingDraft("");
    setModalDraft("");
    dispatch(setSelectedTips(selectedTips.filter(name => name !== "Comment")));
  };

  const handlePay = () => {
    const text = pendingDraft.trim();
    if (typeof window !== "undefined") {
      localStorage.setItem("textTipValue", text);
      notifyTextTipDraftSync();
    }
    dispatch(
      setSelectedTips(ensureSingleTextInCart([...tipsForTotals, "Comment"]))
    );
    setIsCommentDrawerOpen(false);
    onContinueToTip?.();
  };

  const draftActionLabel = pendingDraft.trim() ? "Edit Comment" : "Add Comment";

  const sendCommentLabel = pendingDraft.trim()
    ? `Send comment £${commentPreviewTotal}`
    : "Add a comment to send";

  const amountRaisedLabel =
    typeof amountRaised === "number" && Number.isFinite(amountRaised)
      ? amountRaised.toLocaleString(undefined, {
          style: "currency",
          currency: "GBP",
        })
      : null;

  const resolvedTitle = videoTitle?.trim() || channelMeta?.title?.trim() || "";
  const resolvedDescription =
    videoDescription?.trim() || channelMeta?.description?.trim() || "";
  const resolvedViewCount = engagementLive?.views ?? metrics?.viewCount ?? 0;
  const resolvedEncounterCount =
    engagementLive?.encounters ?? metrics?.encounterCount ?? 0;

  const resolvedSaveCount = engagementLive?.saves ?? metrics?.saveCount ?? 0;
  const resolvedShareCount = engagementLive?.shares ?? metrics?.shareCount ?? 0;
  const showMetricsSkeleton = loading && !metrics;
  const commentCountLabel = showMetricsSkeleton
    ? "—"
    : String(metrics?.commentCount ?? items.length);
  const likeCountLabel = showMetricsSkeleton
    ? "—"
    : String(metrics?.commentLikeCount ?? 0);
  const coOwnerNames = useMemo(() => {
    const fromApi = channelMeta?.coOwnerNames?.filter(Boolean) ?? [];
    if (fromApi.length) return fromApi;
    if (channelMeta?.coOwnerName?.trim())
      return [channelMeta.coOwnerName.trim()];
    return [];
  }, [channelMeta?.coOwnerNames, channelMeta?.coOwnerName]);

  return (
    <>
      <Drawer
        open={isCommentDrawerOpen}
        onOpenChange={setIsCommentDrawerOpen}
      >
        <DrawerContent
          ref={drawerShellRef}
          className={`${DRAWER_Z_INDEX} flex h-[72vh] flex-col overflow-hidden rounded-t-[32px] bg-white p-0`}
        >
          <div className="sticky top-0 z-10 shrink-0 bg-white">
            {/* Top Bar */}
            <div className="relative border-b">
              <div className="flex items-end justify-between p-4">
                {/* Left side metrics */}
                <div className="space-y-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold text-black">
                      Comments {commentCountLabel}
                    </span> <span className="text-[10px] text-muted-foreground/50 font-semibold">
                    Comment likes {likeCountLabel}
                  </span>
                  </div>

                  <div className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
                   
                  <span>Saves {resolvedSaveCount}</span>
                    &middot;
                    <span>Shares {resolvedShareCount}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => setReportOpen(v => !v)} className="outline outline-primary text-xs px-2 py-1 rounded-md">
Report
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCommentDrawerOpen(false)}
                    className="rounded-full p-1 hover:bg-gray-100"
                  >
                    <X className="text-muted-foreground size-6" />
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-2 p-4">
              <h4 className="text-sm font-semibold">
                {hostMeta?.firstName ?? hostName} ·{" "}
                {hostMeta?.username ? `@${hostMeta.username}` : null}{" "}
                <span className="text-primary">Creator</span>
                <SaveHostToggleButton
                  channelId={channelId != null ? String(channelId) : null}
                  className="rounded bg-black/50 p-1 text-white"
                  iconClassName="size-4 text-white"
                />
              </h4>
              {coOwnerNames.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-700/10 px-2 py-0.5 text-xs font-medium text-emerald-800">
                    Co-owner{coOwnerNames.length > 1 ? "s" : ""}:{" "}
                    {coOwnerNames.join(", ")}
                  </span>
                </div>
              ) : null}
              {(resolvedTitle || loading) && (
                <p className="text-sm font-medium">
                  {resolvedTitle || (loading ? "Loading…" : "")}
                </p>
              )}
              {resolvedDescription ? (
                <div>
                  <p className="text-muted-foreground line-clamp-2 text-xs whitespace-pre-wrap">
                    {resolvedDescription}
                  </p>
                  {resolvedDescription.length > 120 ? (
                    <button
                      type="button"
                      className="text-primary mt-1 text-xs font-medium"
                      onClick={() => setDescOpen(true)}
                    >
                      See more
                    </button>
                  ) : null}
                </div>
              ) : null}
              <p className="flex flex-wrap items-center gap-2 text-xs text-black">
                {showMetricsSkeleton ? (
                  <span className="flex flex-wrap gap-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <span
                        key={i}
                        className="inline-block h-3 w-16 animate-pulse rounded bg-gray-100"
                      />
                    ))}
                  </span>
                ) : (
                  <>
                    <span>
                      Channel tips:{" "}
                      {metrics?.eventRoomTipCount ?? numOfTips ?? 0}
                    </span>
                    <span>·</span>
                    <span>Video tips: {metrics?.videoTipCount ?? 0}</span>
                  </>
                )}
              </p>
              {channelMeta ? (
                <div className="flex flex-col gap-1">
                <p className="text-muted-foreground text-[11px]">
                   · {channelMeta.contentLanguage} ·{" "}
                  {channelMeta.contentCountry}
                  
                  
                </p>

                <p className="text-muted-foreground text-[11px]">
                  Created:  {new Date(channelMeta.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric"})}
                </p>

                <p className="text-muted-foreground text-[11px]">
                Community: {channelMeta.communityName
                    ? ` · ${channelMeta.communityName}`
                    : ""}
                </p>
                
                <p className="w-fit bg-gray-200">{channelMeta.eventVideoType}</p>
                </div>
              ) : null}
            </div>

            {(showViewCount || showEncounterCount || amountRaisedLabel) && (
              <div className="ml-4 flex w-fit flex-wrap items-center gap-2 rounded-sm border p-2 text-xs">
                {showViewCount ? (
                  <>
                    <span>
                      Views {resolvedViewCount.toLocaleString()} (10s+)
                    </span>
                    {(showEncounterCount || amountRaisedLabel) && (
                      <span>&middot;</span>
                    )}
                  </>
                ) : null}
                {showEncounterCount ? (
                  <>
                    <span>
                      Encounters {resolvedEncounterCount.toLocaleString()}
                    </span>
                    {amountRaisedLabel ? <span>&middot;</span> : null}
                  </>
                ) : null}

                {amountRaisedLabel ? (
                  <span>{amountRaisedLabel} raised</span>
                ) : null}
                {resolvedEncounterCount > 0 ? (
                  <span>
                    <EyeIcon className="size-3" /> {resolvedEncounterCount} seen
                  </span>
                ) : null}
              </div>
            )}

            {reportOpen ? (
              <div className="space-y-2 border-b px-4 pb-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Report video</p>
                  <button
                    type="button"
                    onClick={() => setReportOpen(false)}
                    className="rounded-full p-1 hover:bg-gray-100"
                    aria-label="Close report"
                  >
                    <X className="text-muted-foreground size-5" />
                  </button>
                </div>
                <Select
                  value={reportReason}
                  onValueChange={setReportReason}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="verbally_abusive">
                      Verbally abusive
                    </SelectItem>
                    <SelectItem value="sexual_harassment">
                      Sexual harassment
                    </SelectItem>
                    <SelectItem value="promotes_violence">
                      Promotes violence
                    </SelectItem>
                    <SelectItem value="deceptive">Deceptive</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {reportReason === "other" ? (
                  <Input
                    value={reportOther}
                    onChange={e => setReportOther(e.target.value)}
                    placeholder="Describe the issue"
                  />
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void submitReport()}
                >
                  Submit report
                </Button>
              </div>
            ) : null}

            {/* Existing Draft + Pay Area */}
            <div className="border-b px-4 pt-4 pb-3">
              <div className="flex gap-2">
                <Input
                  readOnly
                  disabled
                  value={pendingDraft}
                  placeholder="Your comment draft appears here after you add it."
                  className="text-muted-foreground h-9 min-h-[12px] resize-none border border-gray-200 sm:flex-1"
                />

                <Button
                  type="button"
                  variant="outline"
                  onClick={openDraftModal}
                  className="h-9 border-none bg-black text-white hover:bg-black/80"
                >
                  {draftActionLabel}
                </Button>
              </div>

              <div className="relative mt-3 w-full">
                <Button
                  type="button"
                  className="h-9 w-full bg-black pr-10 text-white hover:bg-black/90"
                  onClick={handlePay}
                  disabled={!pendingDraft.trim()}
                >
                  {sendCommentLabel}
                </Button>

                <button
                  type="button"
                  className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-white p-1.5 shadow disabled:opacity-50"
                  disabled={!pendingDraft.trim()}
                  onClick={e => {
                    e.stopPropagation();
                    handlePay();
                  }}
                >
                  <Wallet className="text-primary size-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Comments List */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-5 pb-8">
            {!channelId?.trim() ? (
              <p className="text-muted-foreground text-center text-sm">
                Select a video to see comments.
              </p>
            ) : loading && items.length === 0 ? (
              <ul
                className="space-y-3"
                aria-busy="true"
              >
                {Array.from({ length: 3 }).map((_, i) => (
                  <li
                    key={i}
                    className="animate-pulse rounded-lg border bg-gray-50 px-4 py-6"
                  />
                ))}
              </ul>
            ) : items.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
                <p className="text-lg text-gray-600">
                  Be the first to drop a comment on this video
                </p>
                <p className="text-sm text-gray-500">
                  Purchase a comment below to share your message.
                </p>
              </div>
            ) : (
              <ul className="space-y-4">
                {items.map(row => (
                  <li
                    key={row.id}
                    className="rounded-lg border px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold">{row.username}</p>
                      <span className="text-muted-foreground text-[10px]">
                        {new Date(row.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-1 text-sm whitespace-pre-wrap">
                      {row.message}
                    </p>
                    <button
                      type="button"
                      disabled={likeBusyId === row.id}
                      onClick={() => void handleLike(row.id)}
                      className={`mt-2 inline-flex items-center gap-1 text-xs ${row.likedByMe ? "text-primary" : "text-gray-600"}`}
                    >
                      <Heart
                        className="size-3.5"
                        fill={row.likedByMe ? "currentColor" : "none"}
                      />
                      {row.likeCount}
                    </button>
                  </li>
                ))}
                <p className="text-center text-xs text-gray-500">
                  Add your comment or like one above.
                </p>
              </ul>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      <Dialog
        open={descOpen}
        onOpenChange={setDescOpen}
      >
        <DialogContent className="max-h-[80vh] overflow-y-auto z-[99999999]">
          <DialogHeader>
            <DialogTitle>{resolvedTitle || "Video description"}</DialogTitle>
          </DialogHeader>
          <p className="text-sm whitespace-pre-wrap">{resolvedDescription}</p>
        </DialogContent>
      </Dialog>

      <TextTipDraftModal
        open={draftModalOpen}
        onOpenChange={setDraftModalOpen}
        value={modalDraft}
        onChange={setModalDraft}
        onSave={saveDraftModal}
        onRemove={
          pendingDraft.trim() || selectedTips.includes("Comment")
            ? removeTextTip
            : undefined
        }
        stackOnTop
      />

      <SignInDialog
        open={signInOpen}
        onOpenChange={setSignInOpen}
        title="Sign in to like comments"
        defaultUserType="tipper"
        overlayClassName={SIGN_IN_NESTED_OVERLAY_Z_INDEX}
        contentClassName={SIGN_IN_NESTED_Z_INDEX}
      />
    </>
  );
};
