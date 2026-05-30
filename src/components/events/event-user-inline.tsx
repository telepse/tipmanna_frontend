"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useSelector } from "react-redux";
import { BellPlus, Contact } from "lucide-react";

import { RootState } from "@/redux/store";
import { store } from "@/redux/store";
import { getPusherClient } from "@/lib/pusher";
import { subscribeToPayments } from "@/lib/paymentEvents";
import { TipperEmailOtpSignInDialog } from "@/components/auth/tipper-email-otp-sign-in-dialog";

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

  const isTipperOrHost = user?.role === "TIPPER" || user?.role === "HOST";
  const isVisitor = user?.role === "VISITOR";

  const handleClick = () => {
    if (isTipperOrHost) {
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

    const client = getPusherClient();
    if (!client) return;

    const channel = client.subscribe(`event-${eventId}`);
    const eventName = `user-${userId}-amount-updated`;

    const handler = (data: { userTipped: number }) => {
      setUserTipped(data.userTipped);
    };

    channel.bind(eventName, handler);

    return () => {
      channel.unbind(eventName, handler);
    };
  }, [eventId, userId]);

  useEffect(() => {
    const unsubscribe = subscribeToPayments(({ tipAmount: iTipped }) => {
      setUserTipped(prev => prev + iTipped);
    });
    return unsubscribe;
  }, []);

  return (
    <div>
      <button
        onClick={handleClick}
        className="relative mt-1 flex cursor-pointer items-center gap-1 border-b border-black"
      >
        <div className="flex flex-row items-center justify-center gap-0 px-1 pt-1 pb-0">
          <Contact className="size-4 text-black sm:size-7" />{" "}
          <span className="block text-center text-xs font-semibold sm:text-sm">
            &pound;{userTipped || 0}
          </span>
        </div>

        <BellPlus className="text-destructive size-4" />
      </button>

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
