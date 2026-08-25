"use client";

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Ellipsis, Loader2 } from "lucide-react";
import { toast } from "react-toastify";

import {
  deleteHostEventMessageAction,
  getHostEventMessagesAction,
  postHostEventMessageAction,
} from "@/actions/host";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { useHostCapabilityWithAuth } from "@/hooks/use-host-capability-with-auth";
import { subscribeChannel, unsubscribeChannel } from "@/lib/pusher";
import type { RootState } from "@/redux/store";

interface HostMessage {
  id: string;
  sender: string;
  text: string;
  senderType: "HOST";
  createdAt: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  eventId: string;
  /** Event owner's host id — required for host message API paths. */
  eventHostId: string;
}

export function EventRoomDropMessageModal({
  open,
  onClose,
  eventId,
  eventHostId,
}: Props) {
  const user = useSelector((state: RootState) => state.auth.user);
  const tag = useSelector((state: RootState) => state.auth.tag);

  const { canWriteAsHost, handleAuthRequiredError, HostAuthModal } =
    useHostCapabilityWithAuth({ cohostEventId: eventId });

  const canManage = tag === "COHOST" || user?.role === "HOST" || canWriteAsHost;

  const [messageText, setMessageText] = useState("");
  const [hostMessages, setHostMessages] = useState<HostMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isPostingMessage, setIsPostingMessage] = useState(false);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (!open || !eventHostId || !canManage) return;

    let cancelled = false;

    const loadMessages = async () => {
      setIsLoadingMessages(true);
      try {
        const response = await getHostEventMessagesAction(eventHostId, eventId);
        if (cancelled) return;

        if (!response.success) {
          if (handleAuthRequiredError(response, () => void loadMessages())) {
            return;
          }
          toast.error(response.message ?? "Failed to load event messages.");
          return;
        }

        const data = response.data;
        setHostMessages(Array.isArray(data) ? (data as HostMessage[]) : []);
      } catch (error) {
        if (!cancelled) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Failed to load event messages."
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingMessages(false);
        }
      }
    };

    void loadMessages();

    return () => {
      cancelled = true;
    };
  }, [open, eventHostId, eventId, canManage, handleAuthRequiredError]);

  useEffect(() => {
    if (!open || !eventId) return;

    const channelName = `event-${eventId}`;
    const channel = subscribeChannel(channelName);
    if (!channel) return;

    const handleHostMessage = (message: HostMessage) => {
      setHostMessages(prev => {
        if (prev.some(item => item.id === message.id)) {
          return prev;
        }
        return [message, ...prev];
      });
    };

    const handleDeletedMessage = ({ id }: { id: string }) => {
      setHostMessages(prev => prev.filter(message => message.id !== id));
    };

    channel.bind("host-message", handleHostMessage);
    channel.bind("host-message-deleted", handleDeletedMessage);

    return () => {
      channel.unbind("host-message", handleHostMessage);
      channel.unbind("host-message-deleted", handleDeletedMessage);
      unsubscribeChannel(channelName);
    };
  }, [open, eventId]);

  const handlePostMessage = async () => {
    const text = messageText.trim();

    if (!text) {
      toast.error("Please enter a message.");
      return;
    }

    if (!eventHostId || !canManage) {
      toast.error("Only the host or cohost can post messages.");
      return;
    }

    setIsPostingMessage(true);

    try {
      const createdMessage = await postHostEventMessageAction({
        hostId: eventHostId,
        eventId,
        payload: { text },
      });

      if (!createdMessage.success) {
        if (
          handleAuthRequiredError(
            createdMessage,
            () => void handlePostMessage()
          )
        ) {
          return;
        }
        toast.error(createdMessage.message ?? "Failed to send message.");
        return;
      }

      if (createdMessage.data) {
        setHostMessages(prev => [createdMessage.data as HostMessage, ...prev]);
      }

      setMessageText("");
      toast.success("Message sent to event room.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to send message."
      );
    } finally {
      setIsPostingMessage(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!eventHostId || !canManage) return;

    try {
      setDeletingMessageId(messageId);

      const res = await deleteHostEventMessageAction({
        hostId: eventHostId,
        eventId,
        messageId,
      });

      if (!res.success) {
        if (
          handleAuthRequiredError(
            res,
            () => void handleDeleteMessage(messageId)
          )
        ) {
          return;
        }
        toast.error(res.message ?? "Failed to delete message.");
        return;
      }

      setHostMessages(prev => prev.filter(message => message.id !== messageId));
      toast.success("Message deleted.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete message."
      );
    } finally {
      setDeletingMessageId(null);
    }
  };

  return (
    <>
      {HostAuthModal}
      <Dialog
        open={open}
        onOpenChange={value => {
          if (!value) onClose();
        }}
      >
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Drop message in event room</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Textarea
              placeholder="Send a message to attendees..."
              className="min-h-32 resize-none bg-gray-100"
              value={messageText}
              onChange={event => setMessageText(event.target.value)}
              disabled={!canManage}
            />

            <div className="flex justify-end">
              <Button
                type="button"
                onClick={handlePostMessage}
                disabled={isPostingMessage || !messageText.trim() || !canManage}
              >
                {isPostingMessage ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send message"
                )}
              </Button>
            </div>

            {isLoadingMessages ? (
              <p className="text-muted-foreground text-sm">Loading messages…</p>
            ) : hostMessages.length > 0 ? (
              <div className="space-y-3">
                <h5 className="font-semibold">Messages</h5>
                {hostMessages.map(message => (
                  <div
                    key={message.id}
                    className="bg-secondary/30 flex items-center justify-between rounded-md p-4"
                  >
                    <p className="pr-4">{message.text}</p>

                    {canManage ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="cursor-pointer"
                          >
                            <Ellipsis />
                          </button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="text-destructive cursor-pointer"
                            onClick={() => handleDeleteMessage(message.id)}
                            disabled={deletingMessageId === message.id}
                          >
                            Delete message
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
