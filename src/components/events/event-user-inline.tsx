"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useSelector } from "react-redux";
import { BellPlus, Contact, UserRound } from "lucide-react";

import { RootState } from "@/redux/store";
import { store } from "@/redux/store";
import { subscribeChannel, unsubscribeChannel } from "@/lib/pusher";
import { subscribeToPayments } from "@/lib/paymentEvents";
import { TipperEmailOtpSignInDialog } from "@/components/auth/tipper-email-otp-sign-in-dialog";
import { ProfileDrawer } from "../tv/profile-drawer";
import { NotificationBadge } from "../notifications/notification-badge";
import {
  awaitCommentDrawerPrefetch,
  awaitProfileDrawerPrefetch,
  awaitTipsDrawerPrefetch,
  getCachedProfileDrawerData,
  hydrateSavedContentsFromProfileCache,
  prefetchChannelDrawers,
  prefetchProfileDrawerData,
} from "@/lib/drawer-prefetch-cache";

interface Props {
  iTipped: number;
  eventId: string;
}

export const EventUserInline = ({ iTipped, eventId }: Props) => {
  const [openSignIn, setOpenSignIn] = useState(false);

  const user = useSelector((state: RootState) => state.auth.user);
  const router = useRouter();

  const userId = user?.id;
  const username = user?.username;

  const isTipper = user?.role === "TIPPER";
  const isVisitor = user?.role === "VISITOR";

  const handleClick = () => {
    if (isTipper) {
      router.push(`/tipper/${username}?from=/room/${eventId}`);
    } else if (isVisitor) {
      router.push(`/visitor/${username}?from=/room/${eventId}`);
    } else {
      setOpenSignIn(true);
    }
  };

  const [userTipped, setUserTipped] = useState(iTipped);

  useEffect(() => {
    if (!userId) return;

    const channelName = `event-${eventId}`;
    const channel = subscribeChannel(channelName);
    if (!channel) return;

    const eventName = `user-${userId}-amount-updated`;

    const handler = (data: { userTipped: number }) => {
      setUserTipped(data.userTipped);
    };

    channel.bind(eventName, handler);

    return () => {
      channel.unbind(eventName, handler);
      unsubscribeChannel(channelName);
    };
  }, [eventId, userId]);

  useEffect(() => {
    const unsubscribe = subscribeToPayments(({ tipAmount: iTipped }) => {
      setUserTipped(prev => prev + iTipped);
    });
    return unsubscribe;
  }, []);

  const [isProfileDrawerOpen, setIsProfileDrawerOpen] = useState(false);

  const userRole = useSelector((s: RootState) => s.auth.user?.role);
  const authToken = useSelector((s: RootState) => s.auth.token);
  const isSignedIn =
    useSelector((s: RootState) => s.auth.isAuthenticated) &&
    (userRole === "HOST" || userRole === "TIPPER");

  return (
    <div>
      <button
        onClick={handleClick}
        className="relative mt-1 flex cursor-pointer items-center gap-1 border-b border-black"
      >
        {/* <div className="flex flex-row items-center justify-center gap-0 px-1 pt-1 pb-0">
          <UserRound className="size-4 text-black sm:size-7" />{" "}
          <span className="block text-center text-xs font-semibold sm:text-sm">
            &pound;{userTipped || 0}
          </span>
        </div> */}

        {/* <BellPlus className="text-destructive size-4" /> */}
      </button>

      <button
        type="button"
        className="relative mt-[5px] flex cursor-pointer flex-col items-center"
        onPointerDown={() => {
          void awaitProfileDrawerPrefetch();
        }}
        onClick={() => {
          setIsProfileDrawerOpen(true);
        }}
      >
        <UserRound
          className={`size-5 ${isProfileDrawerOpen ? "text-primary" : ""}`}
          strokeWidth={isProfileDrawerOpen ? 3.75 : 2}
        />
        <NotificationBadge
          variant="dot"
          className="-top-0.5 left-6"
        />
        <span className="max-w-[4.5rem] truncate text-[8px] text-black">
          {isSignedIn
            ? "Signed in"
            : userRole === "VISITOR"
              ? "Guest"
              : "Not signed in"}
        </span>
      </button>

      {/* PROFILE DRAWER */}
      <ProfileDrawer
        isProfileDrawerOpen={isProfileDrawerOpen}
        setIsProfileDrawerOpen={setIsProfileDrawerOpen}
        tipperEvents={[]}
        iTipped={iTipped}
        causes={[]}
        savedContents={[]}
      />

      <TipperEmailOtpSignInDialog
        open={openSignIn}
        onOpenChange={setOpenSignIn}
        signInTitle="Enter email to view profile"
        getRedirectPathAfterVerify={() => {
          const u = store.getState().auth.user?.username;
          if (!u) return undefined;
          return `/tipper/${u}?from=/room/${eventId}`;
        }}
      />
    </div>
  );
};
